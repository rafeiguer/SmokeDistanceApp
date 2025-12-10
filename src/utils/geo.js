// 🗺️ UTILITÁRIOS GEOGRÁFICOS - BBOX, Conversões, Helpers

import { deg2rad, R } from '../constants';
import { calculateDistanceHaversine, isPointInBBox } from './calculations';

/**
 * Cria um Bounding Box ao redor de um ponto (em km)
 * @param {number} lat - Latitude central
 * @param {number} lon - Longitude central
 * @param {number} km - Raio em quilômetros
 * @returns {object} { minLat, maxLat, minLon, maxLon }
 */
export function makeBBox(lat, lon, km = 100) {
  const dLat = km / 111; // 111 km por grau de latitude
  const dLon = km / (111 * Math.cos((lat * Math.PI) / 180)); // Ajustar por latitude
  
  return {
    minLat: lat - dLat,
    minLon: lon - dLon,
    maxLat: lat + dLat,
    maxLon: lon + dLon,
  };
}

/**
 * Verifica se um ponto está dentro de um BBOX
 * @param {object} point - { latitude, longitude }
 * @param {object} bbox - { minLat, maxLat, minLon, maxLon }
 * @returns {boolean}
 */
export function insideBBox(point, bbox) {
  return isPointInBBox(point, bbox);
}

/**
 * Expande um BBOX por um percentual
 * @param {object} bbox - BBox original
 * @param {number} percentage - Percentual de expansão (ex: 20 = 20%)
 * @returns {object} BBox expandido
 */
export function expandBBox(bbox, percentage = 20) {
  const pct = percentage / 100;
  
  const latDiff = (bbox.maxLat - bbox.minLat) * pct;
  const lonDiff = (bbox.maxLon - bbox.minLon) * pct;
  
  return {
    minLat: bbox.minLat - latDiff,
    maxLat: bbox.maxLat + latDiff,
    minLon: bbox.minLon - lonDiff,
    maxLon: bbox.maxLon + lonDiff,
  };
}

/**
 * Obtém a distância máxima do BBOX até um ponto
 * @param {object} bbox - BBox
 * @param {number} lat - Latitude do ponto
 * @param {number} lon - Longitude do ponto
 * @returns {number} Distância máxima em metros
 */
export function getMaxDistanceToBBox(bbox, lat, lon) {
  const corners = [
    { lat: bbox.minLat, lon: bbox.minLon },
    { lat: bbox.minLat, lon: bbox.maxLon },
    { lat: bbox.maxLat, lon: bbox.minLon },
    { lat: bbox.maxLat, lon: bbox.maxLon },
  ];
  
  let maxDist = 0;
  corners.forEach(corner => {
    const dist = calculateDistanceHaversine(lat, lon, corner.lat, corner.lon);
    if (dist > maxDist) maxDist = dist;
  });
  
  return maxDist;
}

/**
 * Calcula centro de múltiplos pontos
 * @param {array} points - Array de { latitude, longitude }
 * @returns {object} { latitude, longitude }
 */
export function getCenterOfPoints(points) {
  if (!points || points.length === 0) return null;
  
  const avgLat = points.reduce((sum, p) => sum + p.latitude, 0) / points.length;
  const avgLon = points.reduce((sum, p) => sum + p.longitude, 0) / points.length;
  
  return { latitude: avgLat, longitude: avgLon };
}

/**
 * Calcula o ponto mais próximo dentro de um BBOX para uma coordenada
 * @param {object} point - { latitude, longitude }
 * @param {object} bbox - BBox
 * @returns {object} Ponto clamped ao BBOX
 */
export function clampPointToBBox(point, bbox) {
  return {
    latitude: Math.max(bbox.minLat, Math.min(bbox.maxLat, point.latitude)),
    longitude: Math.max(bbox.minLon, Math.min(bbox.maxLon, point.longitude)),
  };
}

/**
 * Calcula heading (azimute) entre dois pontos
 * @param {number} lat1 - Latitude ponto 1
 * @param {number} lon1 - Longitude ponto 1
 * @param {number} lat2 - Latitude ponto 2
 * @param {number} lon2 - Longitude ponto 2
 * @returns {number} Heading em graus (0-360)
 */
export function calculateHeading(lat1, lon1, lat2, lon2) {
  const dLon = (lon2 - lon1) * deg2rad;
  const y = Math.sin(dLon) * Math.cos(lat2 * deg2rad);
  const x =
    Math.cos(lat1 * deg2rad) * Math.sin(lat2 * deg2rad) -
    Math.sin(lat1 * deg2rad) * Math.cos(lat2 * deg2rad) * Math.cos(dLon);
  
  let heading = Math.atan2(y, x) * (180 / Math.PI);
  heading = (heading + 360) % 360;
  
  return heading;
}

/**
 * Calcula um ponto a uma certa distância e direção de um ponto inicial
 * @param {number} startLat - Latitude inicial
 * @param {number} startLon - Longitude inicial
 * @param {number} distanceMeters - Distância em metros
 * @param {number} headingDegrees - Direção em graus
 * @returns {object} { latitude, longitude }
 */
export function calculateDestination(startLat, startLon, distanceMeters, headingDegrees) {
  const distance = distanceMeters / R; // Converter metros para radianos
  const heading = headingDegrees * deg2rad;
  
  const lat1 = startLat * deg2rad;
  const lon1 = startLon * deg2rad;
  
  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(distance) +
    Math.cos(lat1) * Math.sin(distance) * Math.cos(heading)
  );
  
  const lon2 = lon1 + Math.atan2(
    Math.sin(heading) * Math.sin(distance) * Math.cos(lat1),
    Math.cos(distance) - Math.sin(lat1) * Math.sin(lat2)
  );
  
  return {
    latitude: lat2 / deg2rad,
    longitude: lon2 / deg2rad,
  };
}

/**
 * Interpola entre dois pontos
 * @param {object} point1 - { latitude, longitude }
 * @param {object} point2 - { latitude, longitude }
 * @param {number} ratio - Razão de interpolação (0-1)
 * @returns {object} Ponto interpolado
 */
export function interpolatePoint(point1, point2, ratio) {
  return {
    latitude: point1.latitude + (point2.latitude - point1.latitude) * ratio,
    longitude: point1.longitude + (point2.longitude - point1.longitude) * ratio,
  };
}

/**
 * Filtra pontos dentro de um BBOX
 * @param {array} points - Array de { latitude, longitude, ... }
 * @param {object} bbox - BBox
 * @returns {array} Pontos filtrados
 */
export function filterPointsInBBox(points, bbox) {
  if (!Array.isArray(points)) return [];
  return points.filter(p => insideBBox(p, bbox));
}

/**
 * Calcula raio de confiança para múltiplos pontos
 * @param {array} points - Array de { latitude, longitude }
 * @returns {object} { center, radius }
 */
export function calculateConfidenceCircle(points) {
  if (!points || points.length === 0) return null;
  
  const center = getCenterOfPoints(points);
  if (!center) return null;
  
  // Calcular distância máxima até o centro
  let maxRadius = 0;
  points.forEach(p => {
    const dist = calculateDistanceHaversine(center.latitude, center.longitude, p.latitude, p.longitude);
    if (dist > maxRadius) maxRadius = dist;
  });
  
  return { center, radius: maxRadius };
}

/**
 * Formata coordenadas para exibição
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 * @param {number} decimals - Casas decimais
 * @returns {string} Coordenadas formatadas
 */
export function formatCoordinates(lat, lon, decimals = 4) {
  return `${lat.toFixed(decimals)}°, ${lon.toFixed(decimals)}°`;
}

/**
 * Converte graus para DMS (graus, minutos, segundos)
 * @param {number} degrees - Valor em graus
 * @returns {object} { degrees, minutes, seconds }
 */
export function convertToDMS(degrees) {
  const d = Math.floor(degrees);
  const m = Math.floor((degrees - d) * 60);
  const s = ((degrees - d) * 60 - m) * 60;
  
  return { degrees: d, minutes: m, seconds: s.toFixed(2) };
}

/**
 * Converte DMS para graus decimais
 * @param {number} degrees
 * @param {number} minutes
 * @param {number} seconds
 * @returns {number} Valor em graus decimais
 */
export function convertFromDMS(degrees, minutes, seconds) {
  return degrees + minutes / 60 + seconds / 3600;
}

export default {
  makeBBox,
  insideBBox,
  expandBBox,
  getMaxDistanceToBBox,
  getCenterOfPoints,
  clampPointToBBox,
  calculateHeading,
  calculateDestination,
  interpolatePoint,
  filterPointsInBBox,
  calculateConfidenceCircle,
  formatCoordinates,
  convertToDMS,
  convertFromDMS,
};