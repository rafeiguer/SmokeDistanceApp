// Serviço de rotas (OSRM/GraphHopper)
import { API_URLS } from '../constants';

export async function fetchOSRMRoute(start, end) {
  const url = `${API_URLS.osrm}/route/v1/foot/${start.lon},${start.lat};${end.lon},${end.lat}?overview=full&geometries=geojson`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Erro ao buscar rota OSRM');
  return res.json();
}

export async function fetchGraphHopperRoute(start, end, apiKey) {
  const url = `${API_URLS.graphhopper}/route?point=${start.lat},${start.lon}&point=${end.lat},${end.lon}&profile=foot&locale=pt&key=${apiKey}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Erro ao buscar rota GraphHopper');
  return res.json();
}
