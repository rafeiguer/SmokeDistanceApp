// Funções de cálculo geográfico
import { R, DEG2RAD } from '../constants';

export function calculateDistanceHaversine(lat1, lon1, lat2, lon2) {
  const dLat = (lat2 - lat1) * DEG2RAD;
  const dLon = (lon2 - lon1) * DEG2RAD;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * DEG2RAD) * Math.cos(lat2 * DEG2RAD) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function geoToCartesian(lat, lon, alt = 0) {
  const phi = lat * DEG2RAD;
  const lambda = lon * DEG2RAD;
  const x = (R + alt) * Math.cos(phi) * Math.cos(lambda);
  const y = (R + alt) * Math.cos(phi) * Math.sin(lambda);
  const z = (R + alt) * Math.sin(phi);
  return { x, y, z };
}
