// Centralização de constantes do SmokeDistance

export const R = 6371000; // Raio da Terra em metros
export const DEG2RAD = Math.PI / 180;
export const MAX_FOCOS = 5; // Limite padrão de focos
export const STORAGE_KEYS = {
  focos: 'focos_salvos',
  breadcrumbs: 'breadcrumbs',
  compassOffsets: 'compassOffsets',
};
export const DEFAULT_LOCATION = {
  latitude: -15.7939,
  longitude: -47.8828,
  altitude: 1200,
};
export const TIMEOUTS = {
  gps: 10000, // ms
  network: 5000,
};
export const API_URLS = {
  osrm: 'https://router.project-osrm.org',
  graphhopper: 'https://graphhopper.com/api/1',
};
// Adicione outras constantes conforme necessário
