import Constants from 'expo-constants';
import { insideBBox, makeBBox } from './calculations';
import { FIRMS_SOURCES, SATELLITE_BBOX_KM } from '../../constants';

// 🛰️ Ler configurações do app.json
const extra = (Constants?.expoConfig?.extra) || (Constants?.manifest?.extra) || {};
const FIRMS_MAP_KEY = (extra?.FIRMS_MAP_KEY || '').trim();
const FIRMS_URL = (extra?.FIRMS_URL || '').trim();
const FIRMS_TOKEN = extra?.FIRMS_TOKEN || '';

// 🛰️ FOCOS SIMULADOS POR SATÉLITE (fallback)
let sfSeq = 0;
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
  return [...build(3), ...build(3), ...build(4)];
}

// 🛰️ FIRMS CONFIGURADO (via token no app.json)
export async function tryFetchFIRMSConfigured(bbox) {
  if (!FIRMS_URL) return [];
  
  let finalUrl = FIRMS_URL;
  if (FIRMS_TOKEN && !finalUrl.includes('token=')) {
    const sep = finalUrl.includes('?') ? '&' : '?';
    finalUrl = `${finalUrl}${sep}token=${encodeURIComponent(FIRMS_TOKEN)}`;
  }
  
  try {
    const res = await fetch(finalUrl);
    if (!res.ok) return [];
    
    const isJSON = (res.headers.get('content-type') || '').includes('application/json');
    const text = await res.text();
    const geo = isJSON ? JSON.parse(text) : JSON.parse(text);
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
    return [];
  }
}

// 🛰️ FIRMS PÚBLICO (GeoJSON)
export async function tryFetchFIRMSGeoJSON(bbox) {
  const results = [];
  
  for (const url of FIRMS_SOURCES) {
    try {
      console.log(`📡 Buscando FIRMS em: ${url}`);
      const res = await fetch(url);
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
      console.log(`✅ FIRMS carregado: ${results.length} focos`);
    } catch (e) {
      console.warn(`⚠️ Erro ao carregar FIRMS:`, e.message);
    }
  }
  return results;
}

// 🛰️ GOES (placeholder - retorna vazio)
export async function tryFetchGOES(bbox) {
  console.log('📡 GOES ainda não implementado');
  return [];
}

// 🛰️ MSG (placeholder - retorna vazio)
export async function tryFetchMSG(bbox) {
  console.log('📡 MSG ainda não implementado');
  return [];
}

// 🛰️ CARREGAR TODOS OS FOCOS COM DEDUPLICAÇÃO
export async function loadAllSatelliteFocos(
  location,
  enableFIRMS,
  enableGOES,
  enableMSG
) {
  if (!location) return [];
  
  try {
    console.log(`🛰️ Carregando focos de satélites...`);
    
    const bbox = makeBBox(location.latitude, location.longitude, SATELLITE_BBOX_KM);
    let all = [];
    
    if (enableFIRMS) {
      console.log(`📡 Tentando FIRMS...`);
      let f = await tryFetchFIRMSConfigured(bbox);
      if (!f || f.length === 0) {
        f = await tryFetchFIRMSGeoJSON(bbox);
      }
      all = all.concat(f);
      console.log(`✅ FIRMS: ${f.length} focos`);
    }
    
    if (enableGOES) {
      console.log(`📡 Tentando GOES...`);
      const g = await tryFetchGOES(bbox);
      all = all.concat(g);
      console.log(`✅ GOES: ${g.length} focos`);
    }
    
    if (enableMSG) {
      console.log(`📡 Tentando MSG...`);
      const m = await tryFetchMSG(bbox);
      all = all.concat(m);
      console.log(`✅ MSG: ${m.length} focos`);
    }
    
    // Fallback: focos simulados se nenhuma fonte retornou
    if (all.length === 0) {
      console.log(`📋 Nenhuma fonte retornou focos, usando simulados`);
      const sim = await fetchSatelliteFiresAround(location.latitude, location.longitude);
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
    
    console.log(`✅ Total de focos únicos: ${unique.length}`);
    return unique;
  } catch (err) {
    console.warn('⚠️ Erro ao carregar satélites:', err?.message);
    return [];
  }
}

// 📊 CONTAR FOCOS POR SATÉLITE
export function countFocosBySatellite(focos, enableFIRMS, enableGOES, enableMSG) {
  const countFIRMS = enableFIRMS ? focos.filter(x => x.origem === 'FIRMS').length : 0;
  const countGOES = enableGOES ? focos.filter(x => x.origem === 'GOES').length : 0;
  const countMSG = enableMSG ? focos.filter(x => x.origem === 'MSG').length : 0;
  
  return [
    { id: 'sat-1', nome: 'FIRMS (MODIS/VIIRS)', atualizacao: '≈ 15min-6h', resolucao: '375m-1km', focos: countFIRMS },
    { id: 'sat-2', nome: 'GOES', atualizacao: '≈ 5-15min', resolucao: '2-10km', focos: countGOES },
    { id: 'sat-3', nome: 'MSG', atualizacao: '≈ 15min', resolucao: '3km', focos: countMSG },
  ];
}