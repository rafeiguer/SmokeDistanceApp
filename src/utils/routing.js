import { calculateDistanceHaversine } from './calculations';
import { OSRM_URL, GRAPHHOPPER_URL, GRAPHHOPPER_API_KEY } from '../../constants';
import { R, DEG2RAD } from '../../constants';

// 🥾 ENCONTRAR TRILHAS/ROTAS ATÉ O FOCO (OSRM + Fallback)
export async function encontrarTrilhasProximas(
  userLatitude,
  userLongitude,
  focusLatitude,
  focusLongitude
) {
  try {
    console.log(`🥾 Calculando rota do usuário até o foco via OSRM...`);
    
    // Validar coordenadas
    if (!userLatitude || !userLongitude) {
      console.warn('⚠️ Localização do usuário não disponível');
      throw new Error('No user location');
    }
    
    // OSRM usa formato lon,lat
    const osrmUrl = `${OSRM_URL}/walking/${userLongitude},${userLatitude};${focusLongitude},${focusLatitude}?geometries=geojson&overview=full&steps=true`;
    
    console.log(`📡 Buscando rota via OSRM...`);
    const response = await fetch(osrmUrl);
    
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
    
    // Tentar GraphHopper como fallback
    try {
      console.log('📄 Tentando fallback com GraphHopper...');
      
      const ghUrl = `${GRAPHHOPPER_URL}?point=${userLatitude},${userLongitude}&point=${focusLatitude},${focusLongitude}&profile=foot&locale=pt&key=${GRAPHHOPPER_API_KEY}`;
      
      const ghResponse = await fetch(ghUrl);
      
      if (ghResponse.ok) {
        const ghData = await ghResponse.json();
        
        if (ghData.paths && ghData.paths.length > 0) {
          const path = ghData.paths[0];
          
          if (path.points && path.points.coordinates) {
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
        }
      }
    } catch (ghErr) {
      console.warn('⚠️ GraphHopper também falhou:', ghErr.message);
    }
    
    // Último fallback: linha reta interpolada
    console.log('📋 Usando rota simulada como fallback final...');
    
    const coordinates = [];
    const steps = 20;
    
    for (let i = 0; i <= steps; i++) {
      const ratio = i / steps;
      
      coordinates.push({
        latitude: userLatitude + (focusLatitude - userLatitude) * ratio,
        longitude: userLongitude + (focusLongitude - userLongitude) * ratio
      });
    }
    
    const distance = calculateDistanceHaversine(
      userLatitude,
      userLongitude,
      focusLatitude,
      focusLongitude
    );
    
    return [{
      id: 'fallback-route',
      coordinates: coordinates,
      distance: distance,
      type: 'way',
      tags: { name: 'Rota Direta (Simulada)' }
    }];
  }
}

