// ✅ VALIDAÇÕES - SafeOps, Conversões Seguras

/**
 * Parse seguro de números com fallback
 * @param {*} value - Valor a converter
 * @param {number} fallback - Valor padrão se inválido
 * @returns {number} Número válido ou fallback
 */
export function parseNumber(value, fallback = 0) {
  const num = parseFloat(value);
  return isNaN(num) || !isFinite(num) ? fallback : num;
}

/**
 * Valida coordenadas GPS
 * @param {object} coords - { latitude, longitude, altitude? }
 * @returns {boolean}
 */
export function isValidCoordinate(coords) {
  if (!coords) return false;
  const { latitude, longitude } = coords;
  
  if (typeof latitude !== 'number' || typeof longitude !== 'number') return false;
  if (!isFinite(latitude) || !isFinite(longitude)) return false;
  
  // Validar ranges
  if (latitude < -90 || latitude > 90) return false;
  if (longitude < -180 || longitude > 180) return false;
  
  return true;
}

/**
 * Valida se um foco tem dados mínimos válidos
 * @param {object} foco - Foco a validar
 * @returns {boolean}
 */
export function isValidFoco(foco) {
  if (!foco) return false;
  
  const hasLocation = isValidCoordinate({ latitude: foco.latitude, longitude: foco.longitude });
  const hasDistance = typeof foco.distancia === 'number' && isFinite(foco.distancia) && foco.distancia > 0;
  
  return hasLocation && hasDistance;
}

/**
 * Valida dados de satélite
 * @param {object} satellite - Dados do satélite
 * @returns {boolean}
 */
export function isValidSatelliteData(satellite) {
  if (!satellite) return false;
  
  const hasCoords = isValidCoordinate({ latitude: satellite.latitude, longitude: satellite.longitude });
  const hasOrigin = typeof satellite.origem === 'string' && satellite.origem.length > 0;
  
  return hasCoords && hasOrigin;
}

/**
 * Valida dados meteorológicos
 * @param {object} meteo - Dados meteorológicos
 * @returns {boolean}
 */
export function isValidMeteoData(meteo) {
  if (!meteo) return false;
  
  return (
    'temp' in meteo &&
    'humidity' in meteo &&
    'windSpeed' in meteo &&
    'windDirection' in meteo &&
    'descricao' in meteo
  );
}

/**
 * Valida se uma string é um JSON válido
 * @param {string} str - String a validar
 * @returns {boolean}
 */
export function isValidJSON(str) {
  try {
    JSON.parse(str);
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Valida se uma URL é válida
 * @param {string} url - URL a validar
 * @returns {boolean}
 */
export function isValidURL(url) {
  try {
    new URL(url);
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Sanitiza string removendo caracteres perigosos
 * @param {string} str - String a sanitizar
 * @returns {string}
 */
export function sanitizeString(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/[<>]/g, '') // Remove < >
    .replace(/javascript:/gi, '') // Remove javascript:
    .trim();
}

/**
 * Valida um objeto de entrada manual de foco
 * @param {object} inputs - Inputs do formulário
 * @returns {object} { valid: boolean, errors: array }
 */
export function validateFocoInputs(inputs) {
  const errors = [];
  
  if (!inputs) {
    return { valid: false, errors: ['Inputs vazios'] };
  }
  
  const lat = parseNumber(inputs.latitude);
  const lon = parseNumber(inputs.longitude);
  const dist = parseNumber(inputs.distancia);
  
  if (lat === 0 || lon === 0) {
    errors.push('Latitude e longitude são obrigatórias');
  }
  
  if (!isFinite(lat) || !isFinite(lon)) {
    errors.push('Coordenadas inválidas');
  }
  
  if (lat < -90 || lat > 90) {
    errors.push('Latitude deve estar entre -90 e 90');
  }
  
  if (lon < -180 || lon > 180) {
    errors.push('Longitude deve estar entre -180 e 180');
  }
  
  if (dist <= 0) {
    errors.push('Distância deve ser maior que 0');
  }
  
  if (!isFinite(dist)) {
    errors.push('Distância inválida');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Valida resposta de API
 * @param {Response} response - Response do fetch
 * @param {string} expectedType - 'json' | 'text'
 * @returns {object} { valid: boolean, error?: string }
 */
export function validateAPIResponse(response, expectedType = 'json') {
  if (!response || typeof response !== 'object') {
    return { valid: false, error: 'Resposta inválida' };
  }
  
  if (!response.ok && response.status) {
    return { valid: false, error: `HTTP ${response.status}` };
  }
  
  if (expectedType === 'json') {
    const contentType = response.headers?.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      return { valid: false, error: 'Content-Type não é JSON' };
    }
  }
  
  return { valid: true };
}

/**
 * Normaliza e valida um foco antes de salvar
 * @param {object} foco - Foco a normalizar
 * @returns {object} Foco normalizado ou null
 */
export function normalizeFoco(foco) {
  if (!isValidFoco(foco)) return null;
  
  return {
    id: foco.id || Date.now(),
    latitude: parseNumber(foco.latitude, 0),
    longitude: parseNumber(foco.longitude, 0),
    altitude: parseNumber(foco.altitude, 0),
    heading: parseNumber(foco.heading, 0),
    pitch: parseNumber(foco.pitch, 0),
    distancia: parseNumber(foco.distancia, 0),
    timestamp: foco.timestamp || new Date().toLocaleTimeString('pt-BR'),
    observadorId: sanitizeString(foco.observadorId) || 'Observador',
  };
}

/**
 * Valida se um array de focos é válido
 * @param {array} focos - Array de focos
 * @returns {boolean}
 */
export function isValidFocoArray(focos) {
  if (!Array.isArray(focos)) return false;
  if (focos.length === 0) return true; // Array vazio é válido
  return focos.every(f => isValidFoco(f));
}

/**
 * SafeOps - Objeto com funções seguras (compatibilidade com original)
 */
export const SafeOps = {
  parseNumber,
  isValidCoordinate,
  isValidFoco,
  isValidJSON,
  isValidURL,
  sanitizeString,
  validateFocoInputs,
};

export default {
  parseNumber,
  isValidCoordinate,
  isValidFoco,
  isValidSatelliteData,
  isValidMeteoData,
  isValidJSON,
  isValidURL,
  sanitizeString,
  validateFocoInputs,
  validateAPIResponse,
  normalizeFoco,
  isValidFocoArray,
  SafeOps,
};