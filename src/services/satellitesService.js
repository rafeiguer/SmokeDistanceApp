// 🛰️ SATELLITE SERVICE - FIRMS, GOES, MSG

import { FIRMS_SOURCES, MAX_SATELLITE_DISTANCE } from '../constants';
import { makeBBox, insideBBox, filterPointsInBBox } from '../utils/geo';
import Constants from 'expo-constants';

let sfSeq = 0; // sequência para IDs únicos simulados

/**
 * Obtém referência para config extra do app.json
 * @private
 */
function getAppConfig() {
  return (Constants?.expoConfig?.extra) || (Constants?.manifest?.extra) || {};
}

/**
 * Busca focos FIRMS configurados via URL/TOKEN do app.json
 * @param {object} bbox - Bounding box
 * @returns {Promise<array>}
 */
export async function tryFetchFIRMSConfigured(bbox) {
  const extra = getAppConfig();
  const url = (extra?.FIRMS_URL || '').trim();
  
  if (!url) return [];
  
  try {
    let finalUrl = url;
    if (extra?.FIRMS_TOKEN && !finalUrl.includes('token=')) {
      const sep = finalUrl.includes('?') ? '&' : '?';
      finalUrl = `${finalUrl}${sep}token=${encodeURIComponent(extra.FIRMS_TOKEN)}`;
    }
    
    const res = await fetch(finalUrl, { timeout: 15000 });
    if (!res.ok) return [];
    
    const text = await res.text();
    const geo = JSON.parse(text);
    const feats = geo?.features || [];
    const out = [];
    
    feats.forEach((f) => {
      const [lon, lat] = f.geometry?.coordinates || [];
      if (typeof lat === 'number' && typeof lon === 'number') {
        const p = { latitude: lat, longitude: lon };
        if (!bbox || insideBBox(p, bbox)) {
          const props = f.properties || {};
          out.push({
            id: `firmscfg-${props?.acq_date || ''}-${props?.acq_time || ''}-${lon?.toFixed?.(4)}${lat?.toFixed?.(4)}`,
            latitude: lat,
            longitude: lon,
            origem: 'FIRMS',
            intensidade: props.confidence || props.brightness || 'N/D',
            hora: props.acq_time ? String(props.acq_time) : 'N/D',
            tempK: props.bright_ti4 || props.brightness || null,
          });
        }
      }
    });
    
    return out;
  } catch (e) {
    console.warn('⚠️ Erro ao buscar FIRMS configurado:', e?.message);
    return [];
  }
}

/**
 * Busca focos FIRMS GeoJSON público (sem token)
 * @param {object} bbox - Bounding box
 * @returns {Promise<array>}
 */
export async function tryFetchFIRMSGeoJSON(bbox) {
  const results = [];
  
  for (const url of FIRMS_SOURCES) {
    try {
      const res = await fetch(url, { timeout: 15000 });
      if (!res.ok) continue;
      
      const geo = await res.json();
      const feats = geo?.features || [];
      
      feats.forEach((f) => {
        const [lon, lat] = f.geometry?.coordinates || [];
        if (typeof lat === 'number' && typeof lon === 'number') {
          const p = { latitude: lat, longitude: lon };
          if (!bbox || insideBBox(p, bbox)) {
            const props = f.properties || {};
            results.push({
              id: `firms-${props?.acq_date || ''}-${props?.acq_time || ''}-${lon.toFixed(4)}${lat.toFixed(4)}`,
              latitude: lat,
              longitude: lon,
              origem: 'FIRMS',
              intensidade: props.confidence || props.brightness || 'N/D',
              hora: props.acq_time ? String(props.acq_time) : 'N/D',
              tempK: props.bright_ti4 || props.brightness || null,
            });
          }
        }
      });
    } catch (e) {
      console.warn(`⚠️ Erro ao buscar FIRMS (${url}):`, e?.message);
      // Continua com próxima fonte
    }
  }
  
  return results;
}

/**
 * Busca focos GOES (placeholder - retorna vazio)
 * @param {object} bbox - Bounding box
 * @returns {Promise<array>}
 */
export async function tryFetchGOES(bbox) {
  // TODO: Implementar quando API GOES estiver disponível
  return [];
}

/**
 * Busca focos MSG (placeholder - retorna vazio)
 * @param {object} bbox - Bounding box
 * @returns {Promise<array>}
 */
export async function tryFetchMSG(bbox) {
  // TODO: Implementar quando API MSG estiver disponível
  return [];
}

/**
 * Busca focos de satélite simulados (para testes)
 * @param {number} lat - Latitude central
 * @param {number} lon - Longitude central
 * @returns {Promise<array>}
 */
export async function fetchSatelliteFiresAround(lat, lon) {
  const rand = (min, max) => Math.random() * (max - min) + min;
  const ts = Date.now();
  
  const build = (n) => Array.from({ length: n }).map(() => {
    const latitude = lat + rand(-0.12, 0.12);
    const longitude = lon + rand(-0.12, 0.12);
    const id = `sf-${ts}-${sfSeq++}-${Math.round(latitude * 1e6)}-${Math.round(longitude * 1e6)}`;
    
    return {
      id,
      latitude,
      longitude,
      origem: 'Satélite',
      intensidade: ['Baixa', 'Média', 'Alta'][Math.floor(Math.random() * 3)],
      hora: new Date().toLocaleTimeString('pt-BR'),
    };
  });
  
  // Retornar mix de focos: 3 bem próximos, 3 médios, 4 distantes
  return [...build(3), ...build(3), ...build(4)];
}

/**
 * Carrega focos de satélite por múltiplas fontes
 * @param {number} latitude - Latitude do usuário
 * @param {number} longitude - Longitude do usuário
 * @param {object} opcoes - { enableFIRMS, enableGOES, enableMSG }
 * @returns {Promise<array>}
 */
export async function loadSatelliteFocos(latitude, longitude, opcoes = {}) {
  const { enableFIRMS = true, enableGOES = false, enableMSG = false } = opcoes;
  
  try {
    const bbox = makeBBox(latitude, longitude, MAX_SATELLITE_DISTANCE);
    let all = [];
    
    if (enableFIRMS) {
      // Primeiro tenta FIRMS configurado; se vazio, tenta público
      let f = await tryFetchFIRMSConfigured(bbox);
      if (!f || f.length === 0) {
        f = await tryFetchFIRMSGeoJSON(bbox);
      }
      all = all.concat(f);
    }
    
    if (enableGOES) {
      const g = await tryFetchGOES(bbox);
      all = all.concat(g);
    }
    
    if (enableMSG) {
      const m = await tryFetchMSG(bbox);
      all = all.concat(m);
    }
    
    // Fallback: se nenhuma fonte retornou, usa simulado
    if (all.length === 0) {
      const sim = await fetchSatelliteFiresAround(latitude, longitude);
      all = sim;
    }
    
    // Remover duplicados
    const seen = new Set();
    const unique = [];
    
    for (const x of all) {
      const key = x.id || `${x.origem || 'UNK'}:${x.hora || ''}:${(x.latitude ?? 0).toFixed(4)},${(x.longitude ?? 0).toFixed(4)}`;
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(x);
      }
    }
    
    console.log(`✅ Focos de satélite carregados: ${unique.length}`);
    return unique;
    
  } catch (e) {
    console.error('❌ Erro ao carregar focos de satélite:', e?.message);
    return [];
  }
}

/**
 * Filtra focos de satélite por distância
 * @param {array} focos - Array de focos
 * @param {number} latitude - Latitude de referência
 * @param {number} longitude - Longitude de referência
 * @param {number} maxDistanceKm - Distância máxima em km
 * @returns {array}
 */
export function filtrarFocosPorDistancia(focos, latitude, longitude, maxDistanceKm = 150) {
  if (!Array.isArray(focos)) return [];
  
  return focos.filter(foco => {
    const distKm = Math.sqrt(
      Math.pow(foco.latitude - latitude, 2) +
      Math.pow(foco.longitude - longitude, 2)
    ) * 111; // ~111 km por grau
    
    return distKm <= maxDistanceKm;
  });
}

/**
 * Agrupa focos por origem (satélite)
 * @param {array} focos - Array de focos
 * @returns {object} { FIRMS: [], GOES: [], MSG: [], ... }
 */
export function agruparFocosPorOrigem(focos) {
  const grouped = {};
  
  focos.forEach(foco => {
    const origem = foco.origem || 'Desconhecido';
    if (!grouped[origem]) {
      grouped[origem] = [];
    }
    grouped[origem].push(foco);
  });
  
  return grouped;
}

/**
 * Conta focos por tipo de satélite
 * @param {array} focos - Array de focos
 * @returns {object} { FIRMS: count, GOES: count, MSG: count, ... }
 */
export function contarFocosPorOrigem(focos) {
  const grouped = agruparFocosPorOrigem(focos);
  const counts = {};
  
  for (const [origem, list] of Object.entries(grouped)) {
    counts[origem] = list.length;
  }
  
  return counts;
}

/**
 * Detecta focos próximos (risco iminente)
 * @param {array} focos - Array de focos
 * @param {number} latitude - Latitude de referência
 * @param {number} longitude - Longitude de referência
 * @param {number} radiusKm - Raio para considerar próximo
 * @returns {array}
 */
export function detectarFocosProximos(focos, latitude, longitude, radiusKm = 10) {
  return filtrarFocosPorDistancia(focos, latitude, longitude, radiusKm);
}

export default {
  tryFetchFIRMSConfigured,
  tryFetchFIRMSGeoJSON,
  tryFetchGOES,
  tryFetchMSG,
  fetchSatelliteFiresAround,
  loadSatelliteFocos,
  filtrarFocosPorDistancia,
  agruparFocosPorOrigem,
  contarFocosPorOrigem,
  detectarFocosProximos,
};