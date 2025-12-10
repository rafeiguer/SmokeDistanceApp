// 🛣️ ROUTING SERVICE - OSRM e GraphHopper

import { OSRM_ROUTING_URL, GRAPHHOPPER_API_URL, TRAIL_COLORS } from '../constants';
import { calculateDistanceHaversine } from '../utils/calculations';

/**
 * Encontra rotas até um foco usando OSRM (com fallback GraphHopper)
 * @param {number} userLatitude - Latitude do usuário
 * @param {number} userLongitude - Longitude do usuário
 * @param {number} focusLatitude - Latitude do foco
 * @param {number} focusLongitude - Longitude do foco
 * @returns {Promise<array>} Array de rotas
 */
export async function encontrarTrilhasProximas(
  userLatitude,
  userLongitude,
  focusLatitude,
  focusLongitude
) {
  try {
    console.log(`🥾 Calculando rota do usuário até o foco via OSRM...`);
    
    // Validar coordenadas do usuário
    if (!userLatitude || !userLongitude) {
      console.warn('⚠️ Localização do usuário não disponível');
      throw new Error('No user location');
    }
    
    // OSRM retorna rota pelos caminhos existentes (OpenStreetMap)
    // Formato: lon,lat (nota: OSRM usa lon,lat não lat,lon)
    const osrmUrl = `${OSRM_ROUTING_URL}/walking/${userLongitude},${userLatitude};${focusLongitude},${focusLatitude}?geometries=geojson&overview=full&steps=true`;
    
    console.log(`📡 Buscando rota via OSRM...`);
    
    const response = await fetch(osrmUrl, { timeout: 10000 });
    
    if (!response.ok) {
      console.warn(`⚠️ OSRM retornou ${response.status}`);
      throw new Error(`HTTP ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.code !== 'Ok') {
      console.warn(`⚠️ OSRM code: ${data.code}`);
      throw new Error(`OSRM: ${data.code}`);
    }
    
    if (!data.routes || data.routes.length === 0) {
      console.warn('⚠️ Nenhuma rota encontrada');
      throw new Error('No routes found');
    }
    
    const route = data.routes[0];
    const geometry = route.geometry;
    
    // Converter GeoJSON geometry para array de coords
    const coordinates = geometry.coordinates.map(coord => ({
      latitude: coord[1],  // GeoJSON usa [lon, lat]
      longitude: coord[0]
    }));
    
    const distanceKm = (route.distance / 1000).toFixed(2);
    const durationMin = Math.round(route.duration / 60);
    
    console.log(`✅ Rota encontrada com ${coordinates.length} pontos`);
    console.log(`📍 Distância: ${distanceKm}km, Tempo: ${durationMin}min`);
    
    // Retornar apenas UMA rota
    return [{
      id: 'route-main',
      coordinates: coordinates,
      distance: route.distance,
      type: 'way',
      tags: { 
        name: 'Rota até o Foco',
        distance: `${distanceKm}km`,
        duration: `${durationMin}min`
      }
    }];
    
  } catch (err) {
    console.error('❌ Erro ao buscar rota OSRM:', err.message);
    
    // Tentar GraphHopper como fallback secundário
    try {
      console.log('🔄 Tentando fallback com GraphHopper...');
      return await tentarGraphHopperRota(userLatitude, userLongitude, focusLatitude, focusLongitude);
    } catch (ghErr) {
      console.warn('⚠️ GraphHopper também falhou:', ghErr.message);
      
      // Último fallback: linha reta com alguns pontos intermediários
      console.log('📉 Usando rota simulada como fallback final...');
      return [criarRotaSimulada(userLatitude, userLongitude, focusLatitude, focusLongitude)];
    }
  }
}

/**
 * Tenta buscar rota via GraphHopper
 * @private
 */
async function tentarGraphHopperRota(userLat, userLon, focusLat, focusLon) {
  const ghUrl = `${GRAPHHOPPER_API_URL}?point=${userLat},${userLon}&point=${focusLat},${focusLon}&profile=foot&locale=pt&key=6e7e76e1-7e59-40a6-8352-c34c8f1dc0d6`;
  
  const ghResponse = await fetch(ghUrl, { timeout: 10000 });
  
  if (!ghResponse.ok) {
    throw new Error(`GraphHopper HTTP ${ghResponse.status}`);
  }
  
  const ghData = await ghResponse.json();
  
  if (!ghData.paths || ghData.paths.length === 0) {
    throw new Error('No paths from GraphHopper');
  }
  
  const path = ghData.paths[0];
  
  if (!path.points || !path.points.coordinates) {
    throw new Error('No coordinates in path');
  }
  
  const coordinates = path.points.coordinates.map(coord => ({
    latitude: coord[1],
    longitude: coord[0]
  }));
  
  const distanceKm = (path.distance / 1000).toFixed(2);
  const durationMin = Math.round(path.time / 60000);
  
  console.log(`✅ Rota GraphHopper encontrada com ${coordinates.length} pontos`);
  
  return [{
    id: 'route-graphhopper',
    coordinates: coordinates,
    distance: path.distance,
    type: 'way',
    tags: { 
      name: 'Rota até o Foco (GraphHopper)',
      distance: `${distanceKm}km`,
      duration: `${durationMin}min`
    }
  }];
}

/**
 * Cria uma rota simulada (linha reta com interpolação)
 * @private
 */
function criarRotaSimulada(userLat, userLon, focusLat, focusLon) {
  const coordinates = [];
  const steps = 20;
  
  // Interpolar entre usuário e foco
  for (let i = 0; i <= steps; i++) {
    const ratio = i / steps;
    coordinates.push({
      latitude: userLat + (focusLat - userLat) * ratio,
      longitude: userLon + (focusLon - userLon) * ratio
    });
  }
  
  const distance = calculateDistanceHaversine(userLat, userLon, focusLat, focusLon);
  
  return {
    id: 'fallback-route',
    coordinates: coordinates,
    distance: distance,
    type: 'way',
    tags: { name: 'Rota Direta (Simulada)' }
  };
}

/**
 * Formata informações da rota para exibição
 * @param {object} route - Objeto da rota
 * @returns {string} Texto formatado
 */
export function formatarRotaInfo(route) {
  if (!route || !route.tags) return 'Rota não disponível';
  
  const { name, distance, duration } = route.tags;
  return `${name}\n${distance} | ${duration}`;
}

/**
 * Estima tempo de caminhada para uma distância
 * @param {number} distanceMeters - Distância em metros
 * @param {number} speedKmH - Velocidade de caminhada em km/h (padrão: 5)
 * @returns {object} { minutes, hours, formatted }
 */
export function estimarTemposCaminhada(distanceMeters, speedKmH = 5) {
  const distanceKm = distanceMeters / 1000;
  const hours = distanceKm / speedKmH;
  const minutes = hours * 60;
  
  const formattedHours = Math.floor(hours);
  const formattedMinutes = Math.round((hours - formattedHours) * 60);
  
  const formatted = formattedHours > 0 
    ? `${formattedHours}h ${formattedMinutes}min`
    : `${formattedMinutes}min`;
  
  return { minutes, hours, formatted };
}

/**
 * Calcula dificuldade da rota baseado em distância e terreno
 * @param {object} route - Objeto da rota
 * @returns {string} 'fácil' | 'moderada' | 'difícil'
 */
export function calcularDificuldadeRota(route) {
  if (!route || !route.distance) return 'desconhecida';
  
  const distanceKm = route.distance / 1000;
  
  if (distanceKm < 2) return 'fácil';
  if (distanceKm < 10) return 'moderada';
  return 'difícil';
}

export default {
  encontrarTrilhasProximas,
  formatarRotaInfo,
  estimarTemposCaminhada,
  calcularDificuldadeRota,
};