// 🎨 COLORS - Paleta de Cores Centralizada

export const COLORS = {
  // 🟢 Verdes (Principal)
  primary: '#8B5C2A',
  primaryDark: '#145A32',
  primaryLight: '#A1887F',
  
  // 🟢 Verdes Secundários
  background: '#2e7d32',
  backgroundLight: '#c5e1c9',
  
  // ✅ Status Cores
  success: '#4CAF50',
  successDark: '#2E7D32',
  successLight: '#E8F5E9',
  
  // ❌ Erro Cores
  error: '#E53935',
  errorDark: '#C62828',
  errorLight: '#FFEBEE',
  
  // ⚠️ Alerta Cores
  warning: '#FF9800',
  warningDark: '#E65100',
  warningLight: '#FFF3E0',
  
  // ℹ️ Info Cores
  info: '#2196F3',
  infoDark: '#1565C0',
  infoLight: '#E3F2FD',
  
  // 🔥 Fogo Cores
  fire: '#FF3333',
  fireLight: '#FF6B6B',
  fireDark: '#CC0000',
  
  // 🎯 Satélite Cores
  satellite: '#FFD700',
  satelliteLight: '#FFEB3B',
  satelliteDark: '#FBC02D',
  
  // 💧 Água Cores
  water: '#00AA00',
  waterLight: '#4CAF50',
  waterDark: '#00796B',
  
  // 🧭 Bussola Cores
  compass: '#FF6B6B',
  compassLight: '#FF8A80',
  compassRing: '#1E90FF',
  
  // ⚫ Neutral
  black: '#000',
  white: '#fff',
  gray: '#999',
  grayDark: '#666',
  grayLight: '#ddd',
  
  // 🌙 Dark Mode
  darkBg: '#121212',
  darkCard: '#1E1E1E',
  darkText: '#D0D0D0',
  darkTextSecondary: '#B0B0B0',
  darkBorder: '#2A2A2A',
  
  // 🔮 Transparentes
  transparent: 'rgba(0,0,0,0)',
  transparentLight: 'rgba(0, 0, 0, 0.3)',
  transparentDark: 'rgba(0, 0, 0, 0.7)',
  
  // 🗺️ Mapa Cores
  mapBackground: '#c5e1c9',
  mapBorder: '#9fbf9d',
  mapUserPin: '#000000',
  mapFocusPin: '#FF3333',
  mapEstimatedPin: '#FFD700',
  mapTrailLight: '#00BFA5',
  mapTrailDark: '#004D40',
};

/**
 * Paleta de cores alternativa por modo
 */
export const COLOR_SCHEMES = {
  light: {
    bg: COLORS.white,
    text: COLORS.grayDark,
    border: COLORS.grayLight,
    card: COLORS.success + '15', // 85% transparência
  },
  dark: {
    bg: COLORS.darkBg,
    text: COLORS.darkText,
    border: COLORS.darkBorder,
    card: COLORS.darkCard,
  },
};

/**
 * Gradientes úteis
 */
export const GRADIENTS = {
  primary: [COLORS.primaryDark, COLORS.primary],
  success: [COLORS.successDark, COLORS.success],
  error: [COLORS.errorDark, COLORS.error],
  warning: [COLORS.warningDark, COLORS.warning],
  fire: [COLORS.fireDark, COLORS.fire],
};

/**
 * Sombras úteis
 */
export const SHADOWS = {
  small: {
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  medium: {
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 3,
  },
  large: {
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
};

export default COLORS;