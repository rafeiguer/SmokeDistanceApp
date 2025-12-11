// 🧭 MAGNETIC SERVICE - World Magnetic Model (WMM) e Calibração

import { WMM_API_URL, COMPASS_CONFIG, rad2deg } from '../constants';

/**
 * Busca declinação magnética via WMM Online (NOAA)
 * @param {number} latitude - Latitude
 * @param {number} longitude - Longitude
 * @returns {Promise<number|null>} Declinação em graus ou null
 */
export async function fetchWMMDeclination(latitude, longitude) {
  try {
    if (!latitude || !longitude) {
      console.warn('⚠️ Coordenadas não disponíveis');
      return null;
    }
    
    console.log(`🧭 Buscando WMM online para calibração...`);
    
    const response = await fetch(
      `${WMM_API_URL}?lat=${latitude}&lon=${longitude}&key=zVQnD7M4KjV7H&resultFormat=json`,
      { timeout: 10000 }
    );
    
    if (!response.ok) {
      console.warn(`⚠️ WMM retornou ${response.status}`);
      return null;
    }
    
    const text = await response.text();
    
    // Validar se é JSON (não HTML)
    if (text.includes('<') || text.includes('html')) {
      console.warn('⚠️ Resposta é HTML, não JSON');
      return null;
    }
    
    const data = JSON.parse(text);
    
    if (data.result && data.result.declination !== undefined) {
      const declination = data.result.declination;
      console.log(`✅ WMM Online: Declinação = ${declination.toFixed(2)}°`);
      return declination;
    }
    
    return null;
  } catch (err) {
    console.warn('⚠️ Erro ao buscar WMM online:', err.message);
    return null;
  }
}

/**
 * Calcula declinação magnética offline (aproximado)
 * Usa modelo WMM simplificado
 * @param {number} latitude - Latitude
 * @param {number} longitude - Longitude
 * @returns {number} Declinação estimada em graus
 */
export function calculateWMMOffline(latitude, longitude) {
  // Modelo WMM aproximado baseado em latitude/longitude
  // Fórmula simplificada: declination ≈ 0.2 * (lon - 100) - 0.02 * lat
  
  const declination = 0.2 * (longitude - 100) - 0.02 * latitude;
  console.log(`🔋 WMM Offline: Declinação ≈ ${declination.toFixed(2)}° (aproximado)`);
  
  return declination;
}

/**
 * Obtém declinação magnética (online com fallback offline)
 * @param {number} latitude - Latitude
 * @param {number} longitude - Longitude
 * @param {boolean} forceOnline - Forçar modo online
 * @returns {Promise<number>}
 */
export async function getMagneticDeclination(latitude, longitude, forceOnline = false) {
  try {
    // Tentar online se solicitado ou se não for fallback
    if (forceOnline) {
      const online = await fetchWMMDeclination(latitude, longitude);
      if (online !== null) return online;
    }
    
    // Fallback offline
    return calculateWMMOffline(latitude, longitude);
  } catch (err) {
    console.warn('⚠️ Erro ao obter declinação:', err);
    return calculateWMMOffline(latitude, longitude);
  }
}

/**
 * Calcula heading (True North) a partir de magnetômetro e declinação
 * @param {number} x - Componente X do magnetômetro
 * @param {number} y - Componente Y do magnetômetro
 * @param {number} declination - Declinação magnética
 * @returns {number} Heading em graus (0-359)
 */
export function calculateHeadingFromMagnetometer(x, y, declination) {
  // Calcular heading do vetor magnético
  let magneticHeading = Math.atan2(x, y) * rad2deg;
  
  // Normalizar para 0-359
  magneticHeading = magneticHeading < 0 ? magneticHeading + 360 : magneticHeading;
  
  // Inverter para que rotação seja no sentido correto
  magneticHeading = 360 - magneticHeading;
  if (magneticHeading >= 360) magneticHeading -= 360;
  
  // Aplicar declinação: True = Magnetic - Declination
  let trueHeading = magneticHeading - declination;
  
  // Offset de calibração manual (iPhone = -52°)
  trueHeading = trueHeading - COMPASS_CONFIG.manualCalibrationOffset;
  
  // Normalizar
  trueHeading = trueHeading % 360;
  if (trueHeading < 0) trueHeading += 360;
  
  return trueHeading;
}

/**
 * Suaviza heading com alpha smoothing
 * @param {number} current - Heading atual
 * @param {number} target - Heading alvo
 * @param {number} alpha - Fator de suavização
 * @returns {number}
 */
export function smoothHeading(current, target, alpha = COMPASS_CONFIG.magnetometerSmoothingAlpha) {
  let diff = target - current;
  
  // Evitar saltos (ex: 359° -> 1°)
  if (diff > 180) diff -= 360;
  if (diff < -180) diff += 360;
  
  // Calcular novo heading
  let newHeading = current + diff * alpha;
  
  // Normalizar
  newHeading = ((newHeading % 360) + 360) % 360;
  
  return newHeading;
}

/**
 * Normaliza leituras de magnetômetro (hard iron correction)
 * @param {array} readings - Array de leituras { x, y, z }
 * @returns {object} { offsetX, offsetY, offsetZ }
 */
export function calibrateCompass(readings) {
  if (!Array.isArray(readings) || readings.length < COMPASS_CONFIG.calibrationMinReadings) {
    console.warn(`⚠️ Calibração requer ${COMPASS_CONFIG.calibrationMinReadings} leituras`);
    return null;
  }
  
  // Encontrar min/max de cada eixo
  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;
  let minZ = Infinity, maxZ = -Infinity;
  
  readings.forEach(r => {
    minX = Math.min(minX, r.x);
    maxX = Math.max(maxX, r.x);
    minY = Math.min(minY, r.y);
    maxY = Math.max(maxY, r.y);
    minZ = Math.min(minZ, r.z);
    maxZ = Math.max(maxZ, r.z);
  });
  
  // Calcular offsets (hard iron correction)
  const offsetX = (maxX + minX) / 2;
  const offsetY = (maxY + minY) / 2;
  const offsetZ = (maxZ + minZ) / 2;
  
  console.log(`✅ Calibração Concluída!`);
  console.log(`📊 ${readings.length} pontos válidos coletados`);
  console.log(`🔧 Offsets: X=${offsetX.toFixed(1)}, Y=${offsetY.toFixed(1)}, Z=${offsetZ.toFixed(1)}`);
  
  return { offsetX, offsetY, offsetZ, timestamp: Date.now() };
}

/**
 * Valida se uma leitura de magnetômetro é boa
 * @param {object} reading - Leitura { x, y, z }
 * @returns {boolean}
 */
export function isValidMagnetometerReading(reading) {
  if (!reading || typeof reading !== 'object') return false;
  
  const magnitude = Math.sqrt(reading.x * reading.x + reading.y * reading.y + reading.z * reading.z);
  
  // Aceitar apenas dados com magnitude entre min e max microTesla
  return (
    magnitude >= COMPASS_CONFIG.magnetometerMinMagnitude &&
    magnitude <= COMPASS_CONFIG.magnetometerMaxMagnitude
  );
}

/**
 * Converte heading para direção cardinal (N, NE, E, etc)
 * @param {number} heading - Heading em graus
 * @returns {string}
 */
export function headingToCardinal(heading) {
  const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE',
                      'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  
  const index = Math.round(heading / 22.5) % 16;
  return directions[index];
}

export default {
  fetchWMMDeclination,
  calculateWMMOffline,
  getMagneticDeclination,
  calculateHeadingFromMagnetometer,
  smoothHeading,
  calibrateCompass,
  isValidMagnetometerReading,
  headingToCardinal,
};