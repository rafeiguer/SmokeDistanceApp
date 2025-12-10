// 📐 CÁLCULOS MATEMÁTICOS - Distâncias, Triangulação, Conversões

import { R, deg2rad, rad2deg } from '../constants';

/**
 * Calcula distância entre dois pontos usando Haversine
 * @param {number} lat1 - Latitude ponto 1
 * @param {number} lon1 - Longitude ponto 1
 * @param {number} lat2 - Latitude ponto 2
 * @param {number} lon2 - Longitude ponto 2
 * @returns {number} Distância em metros
 */
export function calculateDistanceHaversine(lat1, lon1, lat2, lon2) {
  const dLat = (lat2 - lat1) * deg2rad;
  const dLon = (lon2 - lon1) * deg2rad;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * deg2rad) * Math.cos(lat2 * deg2rad) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Converte lat/lon/alt para coordenadas cartesianas 3D
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 * @param {number} alt - Altitude
 * @param {number} originLat - Latitude de origem
 * @param {number} originLon - Longitude de origem
 * @param {number} originAlt - Altitude de origem
 * @returns {object} { x, y, z } em metros
 */
export function geoToCartesian(lat, lon, alt, originLat, originLon, originAlt) {
  const dLat = (lat - originLat) * deg2rad;
  const dLon = (lon - originLon) * deg2rad;
  
  const x = R * dLon * Math.cos(originLat * deg2rad);
  const y = R * dLat;
  const z = alt - originAlt;
  
  return { x, y, z };
}

/**
 * Converte coordenadas cartesianas para lat/lon/alt
 * @param {number} x - Coordenada X em metros
 * @param {number} y - Coordenada Y em metros
 * @param {number} z - Coordenada Z em metros
 * @param {number} originLat - Latitude de origem
 * @param {number} originLon - Longitude de origem
 * @param {number} originAlt - Altitude de origem
 * @returns {object} { latitude, longitude, altitude }
 */
export function cartesianToGeo(x, y, z, originLat, originLon, originAlt) {
  const latitude = originLat + (y / R) / deg2rad;
  const longitude = originLon + (x / (R * Math.cos(originLat * deg2rad))) / deg2rad;
  const altitude = originAlt + z;
  
  return { latitude, longitude, altitude };
}

/**
 * Calcula triangulação 3D de múltiplas observações de um foco
 * Usa método de mínimos quadrados
 * @param {array} focos - Array de observações com { latitude, longitude, altitude, heading, pitch, distancia }
 * @returns {object} { latitude, longitude, altitude, erro, observadores } ou null
 */
export function calcularTriangulacao(focos) {
  if (focos.length < 2) return null;

  // Usar o primeiro foco como origem
  const origem = focos[0];
  const originLat = origem.latitude;
  const originLon = origem.longitude;
  const originAlt = origem.altitude || 0;

  // Converter todos os focos para coordenadas cartesianas
  const observadores = focos.map((foco, idx) => {
    const cart = geoToCartesian(
      foco.latitude,
      foco.longitude,
      foco.altitude || 0,
      originLat,
      originLon,
      originAlt
    );

    // Calcular direção da visada (heading + pitch)
    const headingRad = foco.heading * deg2rad;
    const pitchRad = foco.pitch * deg2rad;

    // Vetor de direção (normal para a câmera)
    const dirX = Math.sin(headingRad) * Math.cos(pitchRad);
    const dirY = Math.cos(headingRad) * Math.cos(pitchRad);
    const dirZ = Math.sin(pitchRad);

    return {
      posicao: cart,
      direcao: { x: dirX, y: dirY, z: dirZ },
      distancia: foco.distancia || 0,
      nome: `Obs ${idx + 1}`
    };
  });

  // Usar o método de mínimos quadrados para encontrar o ponto mais próximo
  // que satisfaz todas as linhas de visada
  const distMedia = focos.reduce((sum, f) => sum + (f.distancia || 0), 0) / focos.length;

  // Usar o primeiro observador como referência
  const obsRef = observadores[0];
  const pX = obsRef.posicao.x + obsRef.direcao.x * distMedia;
  const pY = obsRef.posicao.y + obsRef.direcao.y * distMedia;
  const pZ = obsRef.posicao.z + obsRef.direcao.z * distMedia;

  // Calcular erro da triangulação (quão bem todos os observadores "veem" este ponto)
  let erroTotal = 0;
  observadores.forEach((obs) => {
    // Vetor do observador ao ponto
    const vx = pX - obs.posicao.x;
    const vy = pY - obs.posicao.y;
    const vz = pZ - obs.posicao.z;

    const distObs = Math.sqrt(vx * vx + vy * vy + vz * vz);

    // Produto escalar (deve ser ~1 se o ponto está na linha de visada)
    const dot = (vx * obs.direcao.x + vy * obs.direcao.y + vz * obs.direcao.z) / distObs;
    const erro = Math.abs(1 - dot); // Erro de alinhamento

    erroTotal += erro;
  });

  // Converter ponto cartesiano de volta para lat/lon/alt
  const { latitude: latFogo, longitude: lonFogo, altitude: altFogo } = cartesianToGeo(
    pX, pY, pZ,
    originLat, originLon, originAlt
  );

  return {
    latitude: latFogo,
    longitude: lonFogo,
    altitude: altFogo,
    erro: erroTotal / observadores.length,
    observadores: observadores.length
  };
}

/**
 * Calcula distância 3D entre câmera e objeto
 * @param {number} horizontalDistance - Distância horizontal em metros
 * @param {number} verticalDistance - Altura do objeto em metros
 * @returns {number} Distância 3D em metros
 */
export function calculate3DDistance(horizontalDistance, verticalDistance) {
  return Math.sqrt(horizontalDistance * horizontalDistance + verticalDistance * verticalDistance);
}

/**
 * Calcula altura do objeto baseado em ângulo e distância
 * @param {number} angleRad - Ângulo em radianos
 * @param {number} horizontalDistance - Distância horizontal em metros
 * @returns {number} Altura em metros
 */
export function calculateObjectHeight(angleRad, horizontalDistance) {
  return Math.abs(horizontalDistance * Math.tan(angleRad));
}

/**
 * Normaliza ângulo para 0-359 graus
 * @param {number} angle - Ângulo em graus
 * @returns {number} Ângulo normalizado 0-359
 */
export function normalizeAngle(angle) {
  let normalized = angle % 360;
  if (normalized < 0) normalized += 360;
  return normalized === 360 ? 0 : normalized;
}

/**
 * Calcula a diferença mais curta entre dois ângulos
 * @param {number} angle1 - Primeiro ângulo em graus
 * @param {number} angle2 - Segundo ângulo em graus
 * @returns {number} Diferença em graus (-180 a 180)
 */
export function angleDifference(angle1, angle2) {
  let diff = angle2 - angle1;
  if (diff > 180) diff -= 360;
  if (diff < -180) diff += 360;
  return diff;
}

/**
 * Suaviza um valor com alpha smoothing
 * @param {number} current - Valor atual
 * @param {number} target - Valor alvo
 * @param {number} alpha - Fator de suavização (0-1)
 * @returns {number} Valor suavizado
 */
export function smoothValue(current, target, alpha = 0.15) {
  return current + (target - current) * alpha;
}

/**
 * Calcula o pitch (ângulo vertical) do acelerômetro
 * @param {number} x - Aceleração X
 * @param {number} y - Aceleração Y
 * @param {number} z - Aceleração Z
 * @returns {number} Pitch em graus
 */
export function calculatePitchFromAccelerometer(x, y, z) {
  const pitchRad = Math.atan2(z, Math.sqrt(x * x + y * y));
  return (pitchRad * 180) / Math.PI;
}

/**
 * Valida se um ponto está dentro de um bounding box
 * @param {object} point - { latitude, longitude }
 * @param {object} bbox - { minLat, maxLat, minLon, maxLon }
 * @returns {boolean}
 */
export function isPointInBBox(point, bbox) {
  return (
    point.latitude >= bbox.minLat &&
    point.latitude <= bbox.maxLat &&
    point.longitude >= bbox.minLon &&
    point.longitude <= bbox.maxLon
  );
}

export default {
  calculateDistanceHaversine,
  geoToCartesian,
  cartesianToGeo,
  calcularTriangulacao,
  calculate3DDistance,
  calculateObjectHeight,
  normalizeAngle,
  angleDifference,
  smoothValue,
  calculatePitchFromAccelerometer,
  isPointInBBox,
};