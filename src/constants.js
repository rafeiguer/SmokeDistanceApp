// 📍 CONSTANTES GLOBAIS - SmokeDistance

// 🌍 Constantes Geométricas
export const R = 6371000; // Raio da Terra em metros
export const deg2rad = Math.PI / 180;
export const rad2deg = 180 / Math.PI;

// 📡 Auto-Bounce do Mapa
export const AUTO_BOUNCE_INTERVAL_MS = 15000; // máximo 1 bounce a cada 15s

// 🎯 Limites e Validações
export const MIN_RADIUS_FOR_CIRCLE = 300; // metros: evita ruído urbano
export const MAX_FOCOS = 5; // máximo de observações para triangulação
export const MAX_SATELLITE_DISTANCE = 150; // km para buscar focos de satélite
export const MAX_CAMERA_DISTANCE = 1000; // metros - distância máxima da câmera

// ⏱️ Timeouts e Intervals
export const GPS_STALE_LIMIT_BASE_PRECISO = 6000; // ms
export const GPS_STALE_LIMIT_BASE_ECO = 15000; // ms
export const GPS_STALE_LIMIT_BASE_NORMAL = 10000; // ms
export const GPS_GRACE_PERIOD = 15000; // 15s de tolerância inicial
export const GPS_RESTART_COOLDOWN = 15000; // 15s mínimo entre reinícios
export const STALE_CYCLE_RETRY_THRESHOLD = 90000; // 90s para permitir nova tentativa

// 📍 GPS Padrão (fallback)
export const DEFAULT_LOCATION = {
  latitude: -15.7939,
  longitude: -47.8828,
  altitude: 1200
};

// 🗺️ Mapa - Delta inicial
export const MAP_INITIAL_DELTA = 0.025; // Zoom maior

// 📡 APIs Externas
export const FIRMS_SOURCES = [
  'https://firms2.modaps.eosdis.nasa.gov/active_fire/latest/viirs-snpp_nrt_South_America_24h.geojson',
  'https://firms2.modaps.eosdis.nasa.gov/active_fire/latest/MODIS_C6_1_South_America_24h.geojson',
];

export const WEATHER_API_URL = 'https://api.open-meteo.com/v1/forecast';
export const WMM_API_URL = 'https://www.ngdc.noaa.gov/geomag-web/calculators/calculateDeclination';
export const OSRM_ROUTING_URL = 'https://router.project-osrm.org/route/v1/walking';
export const GRAPHHOPPER_API_URL = 'https://graphhopper.com/api/1/route';

// 🎨 Cores
export const COLORS = {
  primary: '#8B5C2A',
  primaryDark: '#145A32',
  success: '#4CAF50',
  error: '#E53935',
  warning: '#FF9800',
  info: '#2196F3',
  background: '#2e7d32',
  cardLight: '#e8f5e9',
  cardDark: '#1E1E1E',
  textLight: '#666',
  textDark: '#D0D0D0',
  white: '#fff',
  black: '#000',
  transparentLight: 'rgba(0, 0, 0, 0.3)',
  transparentDark: 'rgba(0, 0, 0, 0.7)',
};

// 🎯 Modos GPS
export const GPS_MODES = {
  ECO: 'eco',
  NORMAL: 'normal',
  PRECISO: 'preciso'
};

export const GPS_CONFIG = {
  eco: { accuracy: 3, distanceInterval: 10, timeInterval: 5000 },
  normal: { accuracy: 2, distanceInterval: 3, timeInterval: 2000 },
  preciso: { accuracy: 1, distanceInterval: 1, timeInterval: 1000 }
};

// 📊 Satélites Info
export const SATELLITES_INFO = [
  { id: 'sat-1', nome: 'FIRMS (MODIS/VIIRS)', atualizacao: '≈ 15min-6h', resolucao: '375m-1km', focos: 0 },
  { id: 'sat-2', nome: 'GOES', atualizacao: '≈ 5-15min', resolucao: '2-10km', focos: 0 },
  { id: 'sat-3', nome: 'MSG', atualizacao: '≈ 15min', resolucao: '3km', focos: 0 },
];

// 🌤️ Weather Codes
export const WEATHER_CODES = {
  0: 'CÉU LIMPO',
  1: 'CÉU QUASE LIMPO',
  2: 'NUBLADO',
  3: 'MUITO NUBLADO',
  45: 'NEVOEIRO',
  48: 'NEVOEIRO GELADO',
  51: 'CHUVA LEVE',
  53: 'CHUVA MODERADA',
  55: 'CHUVA FORTE',
  61: 'CHUVA',
  63: 'CHUVA FORTE',
  65: 'CHUVA MUITO FORTE',
  71: 'NEVE LEVE',
  73: 'NEVE MODERADA',
  75: 'NEVE FORTE',
  80: 'PANCADAS DE CHUVA',
  81: 'PANCADAS DE CHUVA FORTE',
  82: 'PANCADAS DE CHUVA MUITO FORTE',
  95: 'TEMPESTADE'
};

// 🎨 Cores para Trilhas
export const TRAIL_COLORS = ['#00BFA5', '#009688', '#00897B', '#00796B', '#00695C', '#004D40', '#00D4AA', '#1DE9B6'];

// 🔐 Dados Simulados (fallback)
export const FALLBACK_METEO = {
  temp: '22',
  humidity: '60',
  windSpeed: '10',
  windDirection: '180',
  descricao: 'SEM CONEXÃO'
};

// 🎥 Câmera
export const CAMERA_CONFIG = {
  eyeHeight: 1.7, // altura dos olhos em metros
  minRelativeAngle: 5, // ângulo mínimo em graus
  minAbsAngle: 0.02, // ângulo mínimo em radianos
};

// 📱 Breadcrumbs
export const BREADCRUMB_CONFIG = {
  minTimeWithoutConnection: 10, // minutos
  minDistanceBetweenBreadcrumbs: 500, // metros
};

// 🧭 Bussola
export const COMPASS_CONFIG = {
  updateInterval: 50, // ms
  magnetometerMinMagnitude: 20, // microTesla
  magnetometerMaxMagnitude: 80, // microTesla
  magnetometerSmoothingAlpha: 0.15,
  calibrationMinReadings: 30,
  calibrationMaxReadings: 200,
  manualCalibrationOffset: -52, // graus - sincronização com iPhone
};

export default {
  R,
  deg2rad,
  rad2deg,
  AUTO_BOUNCE_INTERVAL_MS,
  MIN_RADIUS_FOR_CIRCLE,
  MAX_FOCOS,
  MAX_SATELLITE_DISTANCE,
  MAX_CAMERA_DISTANCE,
  GPS_STALE_LIMIT_BASE_PRECISO,
  GPS_STALE_LIMIT_BASE_ECO,
  GPS_STALE_LIMIT_BASE_NORMAL,
  GPS_GRACE_PERIOD,
  GPS_RESTART_COOLDOWN,
  STALE_CYCLE_RETRY_THRESHOLD,
  DEFAULT_LOCATION,
  MAP_INITIAL_DELTA,
  FIRMS_SOURCES,
  WEATHER_API_URL,
  WMM_API_URL,
  OSRM_ROUTING_URL,
  GRAPHHOPPER_API_URL,
  COLORS,
  GPS_MODES,
  GPS_CONFIG,
  SATELLITES_INFO,
  WEATHER_CODES,
  TRAIL_COLORS,
  FALLBACK_METEO,
  CAMERA_CONFIG,
  BREADCRUMB_CONFIG,
  COMPASS_CONFIG,
};