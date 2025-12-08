// 🌍 Constantes Globais do App

// Terra
export const R = 6371000; // Raio da Terra em metros
export const DEG2RAD = Math.PI / 180; // Converter graus para radianos

// GPS
export const AUTO_BOUNCE_INTERVAL_MS = 15000; // máximo 1 bounce a cada 15s
export const MIN_RADIUS_FOR_CIRCLE = 300; // metros: evita ruído urbano

// Câmera
export const EYE_HEIGHT = 1.7; // altura dos olhos do usuário em metros
export const CAMERA_BASELINE_THRESHOLD = 5; // graus, limite pra considerar calibrado

// Focos
export const MAX_FOCOS = 5; // máximo de observações para triangulação
export const MIN_FOCOS_FOR_TRIANGULATION = 2; // mínimo pra fazer triangulação

// GPS Stale Detection
export const GPS_STALE_LIMITS = {
  eco: 15000,      // 15 segundos
  normal: 10000,   // 10 segundos
  preciso: 6000    // 6 segundos
};

export const GPS_GRACE_PERIOD = 15000; // período inicial de tolerância
export const GPS_RESTART_GAP = 15000; // nunca tentar reiniciar antes de 15s
export const GPS_RECOVERY_CYCLE_DURATION = 90000; // após 90s sem sinal, permite nova tentativa

// Breadcrumbs
export const BREADCRUMB_TRIGGER_MINUTES = 10; // criar breadcrumb após 10 min sem rede
export const BREADCRUMB_DISTANCE_METERS = 500; // criar novo breadcrumb a cada 500m

// API URLs
export const OSRM_URL = 'https://router.project-osrm.org/route/v1/walking';
export const GRAPHHOPPER_API_KEY = '6e7e76e1-7e59-40a6-8352-c34c8f1dc0d6';
export const GRAPHHOPPER_URL = 'https://graphhopper.com/api/1/route';
export const OPEN_METEO_URL = 'https://api.open-meteo.com/v1/forecast';
export const WMM_URL = 'https://www.ngdc.noaa.gov/geomag-web/calculators/calculateDeclination';

// Satélites
export const FIRMS_SOURCES = [
  'https://firms2.modaps.eosdis.nasa.gov/active_fire/latest/viirs-snpp_nrt_South_America_24h.geojson',
  'https://firms2.modaps.eosdis.nasa.gov/active_fire/latest/MODIS_C6_1_South_America_24h.geojson',
];

export const SATELLITE_BBOX_KM = 150; // buscar satélites num raio de 150km

// Cores e Estilos
export const COLORS = {
  primary: '#2e7d32',      // verde
  primaryDark: '#145A32',  // verde escuro
  secondary: '#8B5C2A',    // marrom
  success: '#4CAF50',
  error: '#E53935',
  warning: '#FF9800',
  info: '#2196F3',
  light: '#e8f5e9',        // verde suave
  dark: '#121212',         // modo noite
  white: '#FFFFFF',
  text: '#666666',
  textDark: '#D0D0D0',
};

// Ícones/Emojis
export const ICONS = {
  location: '🔍',
  compass: '🧭',
  fire: '🔥',
  smoke: '💨',
  water: '💧',
  map: '🗺️',
  camera: '📷',
  satellite: '🛰️',
  settings: '⚙️',
  share: '📤',
  network: '📡',
  gps: '🚩',
  breadcrumb: '🍞',
  success: '✅',
  error: '❌',
  warning: '⚠️',
  loading: '📄',
  weather: '🌡️',
};