import { R, DEG2RAD } from '../../constants';

// 📏 Calcular distância entre dois pontos (Haversine)
export function calculateDistanceHaversine(lat1, lon1, lat2, lon2) {
  const dLat = (lat2 - lat1) * DEG2RAD;
  const dLon = (lon2 - lon1) * DEG2RAD;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * DEG2RAD) * Math.cos(lat2 * DEG2RAD) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// 🔄 Converter coordenadas geográficas para cartesianas
export function geoToCartesian(lat, lon, alt, originLat, originLon, originAlt) {
  const dLat = (lat - originLat) * DEG2RAD;
  const dLon = (lon - originLon) * DEG2RAD;
  
  const x = R * dLon * Math.cos(originLat * DEG2RAD);
  const y = R * dLat;
  const z = alt - originAlt;
  
  return { x, y, z };
}

// 🎯 Triangulação 3D - encontrar ponto de fogo a partir de 2+ observadores
export function calcularTriangulacao(focos) {
  if (focos.length < 2) return null;

  // Usar primeiro foco como origem
  const origem = focos[0];
  const originLat = origem.latitude;
  const originLon = origem.longitude;
  const originAlt = origem.altitude || 0;

  // Converter todos para cartesiano
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
    const headingRad = foco.heading * DEG2RAD;
    const pitchRad = foco.pitch * DEG2RAD;

    // Vetor de direção
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

  // Buscar ponto mais próximo (método dos mínimos quadrados)
  const distMedia = focos.reduce((sum, f) => sum + (f.distancia || 0), 0) / focos.length;

  const obsRef = observadores[0];
  const pX = obsRef.posicao.x + obsRef.direcao.x * distMedia;
  const pY = obsRef.posicao.y + obsRef.direcao.y * distMedia;
  const pZ = obsRef.posicao.z + obsRef.direcao.z * distMedia;

  // Calcular erro da triangulação
  let erroTotal = 0;
  observadores.forEach((obs) => {
    const vx = pX - obs.posicao.x;
    const vy = pY - obs.posicao.y;
    const vz = pZ - obs.posicao.z;

    const distObs = Math.sqrt(vx * vx + vy * vy + vz * vz);
    const dot = (vx * obs.direcao.x + vy * obs.direcao.y + vz * obs.direcao.z) / distObs;
    const erro = Math.abs(1 - dot);

    erroTotal += erro;
  });

  // Converter de volta para lat/lon/alt
  const latFogo = originLat + (pY / R) / DEG2RAD;
  const lonFogo = originLon + (pX / (R * Math.cos(originLat * DEG2RAD))) / DEG2RAD;
  const altFogo = originAlt + pZ;

  return {
    latitude: latFogo,
    longitude: lonFogo,
    altitude: altFogo,
    erro: erroTotal / observadores.length,
    observadores: observadores.length
  };
}

// 📍 Criar bounding box ao redor de um ponto
export function makeBBox(lat, lon, km = 100) {
  const dLat = km / 111;
  const dLon = km / (111 * Math.cos((lat * Math.PI) / 180));
  return {
    minLat: lat - dLat,
    minLon: lon - dLon,
    maxLat: lat + dLat,
    maxLon: lon + dLon,
  };
}

// ✅ Verificar se ponto está dentro de bbox
export function insideBBox(p, bbox) {
  return (
    p.latitude >= bbox.minLat &&
    p.latitude <= bbox.maxLat &&
    p.longitude >= bbox.minLon &&
    p.longitude <= bbox.maxLon
  );
}

// 🔒 Parser seguro de números
export const SafeOps = {
  parseNumber: (value, fallback = 0) => {
    const num = parseFloat(value);
    return isNaN(num) || !isFinite(num) ? fallback : num;
  },
};

// 🧭 Calcular bearing (direção) entre dois pontos
export function calculateBearing(lat1, lon1, lat2, lon2) {
  const dLon = (lon2 - lon1) * DEG2RAD;
  const y = Math.sin(dLon) * Math.cos(lat2 * DEG2RAD);
  const x =
    Math.cos(lat1 * DEG2RAD) * Math.sin(lat2 * DEG2RAD) -
    Math.sin(lat1 * DEG2RAD) * Math.cos(lat2 * DEG2RAD) * Math.cos(dLon);
  
  let bearing = Math.atan2(y, x) * (180 / Math.PI);
  bearing = (bearing + 360) % 360;
  return bearing;
}

// 📐 Calcular ponto a partir de distância e bearing
export function calculateDestinationPoint(lat, lon, distance, bearing) {
  const lat1 = lat * DEG2RAD;
  const lon1 = lon * DEG2RAD;
  const bearingRad = bearing * DEG2RAD;
  
  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(distance / R) +
    Math.cos(lat1) * Math.sin(distance / R) * Math.cos(bearingRad)
  );
  
  const lon2 = lon1 + Math.atan2(
    Math.sin(bearingRad) * Math.sin(distance / R) * Math.cos(lat1),
    Math.cos(distance / R) - Math.sin(lat1) * Math.sin(lat2)
  );
  
  return {
    latitude: lat2 / DEG2RAD,
    longitude: lon2 / DEG2RAD
  };
}