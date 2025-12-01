// utils/triangulation.js
// Funções para triangulação de focos e conversão de coordenadas
import { R, DEG2RAD } from '../constants';

export function geoToCartesian(lat, lon, alt, originLat, originLon, originAlt) {
  const dLat = (lat - originLat) * DEG2RAD;
  const dLon = (lon - originLon) * DEG2RAD;
  const x = R * dLon * Math.cos(originLat * DEG2RAD);
  const y = R * dLat;
  const z = alt - originAlt;
  return { x, y, z };
}

export function calcularTriangulacao(focos) {
  if (focos.length < 2) return null;
  const origem = focos[0];
  const originLat = origem.latitude;
  const originLon = origem.longitude;
  const originAlt = origem.altitude || 0;
  const observadores = focos.map((foco, idx) => {
    const cart = geoToCartesian(
      foco.latitude,
      foco.longitude,
      foco.altitude || 0,
      originLat,
      originLon,
      originAlt
    );
    const headingRad = foco.heading * DEG2RAD;
    const pitchRad = foco.pitch * DEG2RAD;
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
  const distMedia = focos.reduce((sum, f) => sum + (f.distancia || 0), 0) / focos.length;
  const obsRef = observadores[0];
  const pX = obsRef.posicao.x + obsRef.direcao.x * distMedia;
  const pY = obsRef.posicao.y + obsRef.direcao.y * distMedia;
  const pZ = obsRef.posicao.z + obsRef.direcao.z * distMedia;
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
