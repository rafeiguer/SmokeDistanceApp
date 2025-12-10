// 🎨 STYLES - Principal StyleSheet

import { StyleSheet } from 'react-native';
import { COLORS } from '../constants';

export const styles = StyleSheet.create({
  // 🔷 CONTAINER & LAYOUT
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  
  // 🔷 HEADER
  header: {
    backgroundColor: COLORS.primaryDark,
    padding: 20,
    paddingTop: 50,
    alignItems: 'center',
    elevation: 3,
  },
  
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  
  subtitle: {
    fontSize: 12,
    color: '#ddd',
    marginTop: 5,
  },
  
  // 🔷 CONTENT & SCROLLING
  content: {
    flex: 1,
    padding: 15,
  },
  
  // 🔷 CARDS
  card: {
    backgroundColor: COLORS.cardLight,
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    elevation: 2,
  },
  
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.textLight,
    marginBottom: 10,
  },
  
  // 🔷 TEXT
  text: {
    fontSize: 14,
    color: COLORS.textLight,
    marginBottom: 5,
  },
  
  // 🔷 INPUTS
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 10,
    borderRadius: 5,
    fontSize: 14,
  },
  
  textInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 10,
    borderRadius: 5,
    fontSize: 14,
    marginBottom: 8,
    backgroundColor: COLORS.white,
  },
  
  // 🔷 BUTTONS
  buttonPrimary: {
    backgroundColor: COLORS.primary,
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 15,
    elevation: 3,
  },
  
  buttonSecondary: {
    backgroundColor: COLORS.primary,
    flex: 1,
    marginRight: 7,
  },
  
  buttonTertiary: {
    backgroundColor: COLORS.primary,
    flex: 1,
    marginLeft: 7,
  },
  
  button: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    alignItems: 'center',
    elevation: 2,
  },
  
  buttonText: {
    color: COLORS.white,
    fontWeight: 'bold',
    fontSize: 14,
  },
  
  buttonRow: {
    flexDirection: 'row',
    marginBottom: 15,
  },
  
  // 🔷 MAP
  map: {
    flex: 1,
    width: '100%',
  },
  
  mapControls: {
    flexDirection: 'row',
    padding: 10,
    backgroundColor: '#c5e1c9',
    gap: 10,
  },
  
  mapButton: {
    flex: 1,
    backgroundColor: COLORS.primary,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    elevation: 2,
  },
  
  mapButtonActive: {
    backgroundColor: COLORS.success,
  },
  
  mapInfo: {
    backgroundColor: '#c5e1c9',
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: '#9fbf9d',
  },
  
  infoText: {
    fontSize: 13,
    color: COLORS.textLight,
    marginBottom: 5,
  },
  
  // 🔷 MINI COMPASS
  miniCompassWrapper: {
    position: 'absolute',
    top: 162,
    right: 10,
    alignItems: 'center',
    zIndex: 100,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderRadius: 8,
    padding: 6,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  
  miniRoseContainer: {
    position: 'relative',
    width: 90,
    height: 90,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  crossVertical: {
    position: 'absolute',
    width: 1,
    height: 80,
    backgroundColor: '#FF6B6B',
    zIndex: 5,
  },
  
  crossHorizontal: {
    position: 'absolute',
    width: 80,
    height: 1,
    backgroundColor: '#FF6B6B',
    zIndex: 5,
  },
  
  compassRing: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: COLORS.info,
  },
  
  rotatingGroup: {
    position: 'absolute',
    width: 80,
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  nRotator: {
    position: 'absolute',
    top: -5,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  miniCompass: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'transparent',
  },
  
  miniCompassNorth: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF6B6B',
  },
  
  miniHeadingText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: COLORS.textLight,
    marginTop: 4,
  },
  
  // 🔷 CAMERA
  camera: {
    flex: 1,
  },
  
  cameraOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    padding: 20,
    pointerEvents: 'none',
  },
  
  overlayHeader: {
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    padding: 12,
    borderRadius: 8,
  },
  
  overlayTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  
  overlayCenter: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  
  targetReticle: {
    width: 120,
    height: 120,
    borderWidth: 2,
    borderColor: '#00ff00',
    borderRadius: 60,
    backgroundColor: 'rgba(0, 255, 0, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  overlayData: {
    backgroundColor: COLORS.cardLight,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  
  overlayText: {
    color: '#00ff00',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 5,
    fontFamily: 'Courier New',
  },
  
  cameraControls: {
    flexDirection: 'row',
    padding: 15,
    backgroundColor: COLORS.black,
    gap: 10,
  },
  
  // 🔷 COMPASS (antigo)
  compassContainer: {
    alignItems: 'center',
    padding: 20,
  },
  
  roseContainer: {
    position: 'relative',
    width: 180,
    height: 180,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  
  compass: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#E3F2FD',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: COLORS.info,
  },
  
  compassArrow: {
    fontSize: 48,
    color: COLORS.info,
  },
  
  roseText: {
    position: 'absolute',
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.warning,
  },
  
  roseNorth: {
    top: 5,
    left: '50%',
    marginLeft: -8,
  },
  
  roseSouth: {
    bottom: 5,
    left: '50%',
    marginLeft: -8,
  },
  
  roseEast: {
    right: 5,
    top: '50%',
    marginTop: -10,
  },
  
  roseWest: {
    left: 5,
    top: '50%',
    marginTop: -10,
  },
  
  headingText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.textLight,
  },
});

export default styles;