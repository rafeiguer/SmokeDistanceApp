// 🧩 COMPONENTS - Estilos de Componentes Reutilizáveis

import { StyleSheet } from 'react-native';
import { COLORS, SHADOWS } from './colors';

/**
 * Estilos de Botões Reutilizáveis
 */
export const buttonStyles = StyleSheet.create({
  // ✅ Primary Button
  primary: {
    backgroundColor: COLORS.primary,
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.medium,
  },

  // ⚫ Secondary Button
  secondary: {
    backgroundColor: COLORS.gray,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.small,
  },

  // 🔴 Danger Button
  danger: {
    backgroundColor: COLORS.error,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.small,
  },

  // ⚠️ Warning Button
  warning: {
    backgroundColor: COLORS.warning,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.small,
  },

  // ℹ️ Info Button
  info: {
    backgroundColor: COLORS.info,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.small,
  },

  // 📍 Map Button (pequeno)
  map: {
    flex: 1,
    backgroundColor: COLORS.primary,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    elevation: 2,
  },

  // 🔘 Mini Button (muito pequeno)
  mini: {
    backgroundColor: COLORS.primary,
    padding: 8,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // 📝 Text Button (sem fundo)
  text: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
});

/**
 * Estilos de Texto Reutilizáveis
 */
export const textStyles = StyleSheet.create({
  // 📌 Heading 1 (Títulos)
  h1: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.grayDark,
  },

  // 📌 Heading 2
  h2: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.grayDark,
  },

  // 📌 Heading 3
  h3: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.grayDark,
  },

  // 📝 Body Regular
  body: {
    fontSize: 14,
    color: COLORS.grayDark,
    lineHeight: 20,
  },

  // 📝 Body Small
  bodySmall: {
    fontSize: 12,
    color: COLORS.grayDark,
    lineHeight: 18,
  },

  // 📝 Caption
  caption: {
    fontSize: 11,
    color: COLORS.gray,
    lineHeight: 16,
  },

  // ✅ Success Text
  success: {
    color: COLORS.success,
    fontWeight: '600',
  },

  // ❌ Error Text
  error: {
    color: COLORS.error,
    fontWeight: '600',
  },

  // ⚠️ Warning Text
  warning: {
    color: COLORS.warning,
    fontWeight: '600',
  },

  // ℹ️ Info Text
  info: {
    color: COLORS.info,
    fontWeight: '600',
  },
});

/**
 * Estilos de Cards/Containers
 */
export const cardStyles = StyleSheet.create({
  // 📦 Card Default
  default: {
    backgroundColor: COLORS.successLight,
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    ...SHADOWS.medium,
  },

  // ✅ Success Card
  success: {
    backgroundColor: COLORS.successLight,
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.success,
    ...SHADOWS.small,
  },

  // ❌ Error Card
  error: {
    backgroundColor: COLORS.errorLight,
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.error,
    ...SHADOWS.small,
  },

  // ⚠️ Warning Card
  warning: {
    backgroundColor: COLORS.warningLight,
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.warning,
    ...SHADOWS.small,
  },

  // ℹ️ Info Card
  info: {
    backgroundColor: COLORS.infoLight,
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.info,
    ...SHADOWS.small,
  },

  // 🔥 Fire Card
  fire: {
    backgroundColor: '#FFE5E5',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.fire,
    ...SHADOWS.small,
  },
});

/**
 * Estilos de Input/TextInput
 */
export const inputStyles = StyleSheet.create({
  // 📝 Default Input
  default: {
    borderWidth: 1,
    borderColor: COLORS.grayLight,
    padding: 12,
    borderRadius: 8,
    fontSize: 14,
    marginBottom: 12,
    backgroundColor: COLORS.white,
    color: COLORS.grayDark,
  },

  // 🔍 Focused Input
  focused: {
    borderWidth: 2,
    borderColor: COLORS.info,
    padding: 12,
    borderRadius: 8,
    fontSize: 14,
    marginBottom: 12,
    backgroundColor: COLORS.white,
    color: COLORS.grayDark,
  },

  // ❌ Error Input
  error: {
    borderWidth: 1,
    borderColor: COLORS.error,
    padding: 12,
    borderRadius: 8,
    fontSize: 14,
    marginBottom: 12,
    backgroundColor: COLORS.white,
    color: COLORS.grayDark,
  },

  // ✅ Success Input
  success: {
    borderWidth: 1,
    borderColor: COLORS.success,
    padding: 12,
    borderRadius: 8,
    fontSize: 14,
    marginBottom: 12,
    backgroundColor: COLORS.white,
    color: COLORS.grayDark,
  },

  // 🔒 Disabled Input
  disabled: {
    borderWidth: 1,
    borderColor: COLORS.grayLight,
    padding: 12,
    borderRadius: 8,
    fontSize: 14,
    marginBottom: 12,
    backgroundColor: '#f5f5f5',
    color: COLORS.gray,
  },
});

/**
 * Estilos de Badges/Tags
 */
export const badgeStyles = StyleSheet.create({
  // 📍 Default Badge
  default: {
    backgroundColor: COLORS.primary,
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ✅ Success Badge
  success: {
    backgroundColor: COLORS.successLight,
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.success,
  },

  // ❌ Error Badge
  error: {
    backgroundColor: COLORS.errorLight,
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.error,
  },

  // ⚠️ Warning Badge
  warning: {
    backgroundColor: COLORS.warningLight,
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.warning,
  },

  // 🔥 Fire Badge
  fire: {
    backgroundColor: '#FFE5E5',
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.fire,
  },
});

/**
 * Estilos de Divider
 */
export const dividerStyles = StyleSheet.create({
  // Divider Thin
  thin: {
    height: 1,
    backgroundColor: COLORS.grayLight,
    marginVertical: 8,
  },

  // Divider Medium
  medium: {
    height: 2,
    backgroundColor: COLORS.grayLight,
    marginVertical: 12,
  },

  // Divider Thick
  thick: {
    height: 4,
    backgroundColor: COLORS.grayLight,
    marginVertical: 16,
  },
});

/**
 * Estilos de Spacing (Padding/Margin)
 */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
};

/**
 * Estilos de Border Radius
 */
export const borderRadius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  round: 50,
};

/**
 * Utilidade: Combinar estilos
 */
export const combineStyles = (...styles) => {
  return Object.assign({}, ...styles);
};

export default {
  buttonStyles,
  textStyles,
  cardStyles,
  inputStyles,
  badgeStyles,
  dividerStyles,
  spacing,
  borderRadius,
  combineStyles,
};