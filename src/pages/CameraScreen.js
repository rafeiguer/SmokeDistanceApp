import React, { useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, Image } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';

export default function CameraScreen({
  cameraPhoto,
  setCameraPhoto,
  cameraDynamicDistance,
  cameraObjectHeight,
  pitchAngle,
  setCameraActive,
  marcarFoco,
  location,
  darkMode,
  smoothHeading,
  magneticDeclination,
  focos
}) {
  const cameraRef = useRef(null);
  const [permission, requestPermission] = useCameraPermissions();

  const handleCapturarFoto = async () => {
    try {
      if (cameraRef.current) {
        const photo = await cameraRef.current.takePictureAsync({ quality: 0.5, skipProcessing: true });
        setCameraPhoto(photo);
        Alert.alert('✅ Foto Capturada', 'Foto documentada com sucesso!');
      }
    } catch (err) {
      Alert.alert('❌ Erro', 'Falha ao capturar foto: ' + err.message);
    }
  };

  if (!permission?.granted) {
    return (
      <View style={styles.permissionContainer}>
        <Text style={styles.permissionText}>📷 Permissão da câmera necessária</Text>
        <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
          <Text style={styles.permissionButtonText}>Permitir Câmera</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.permissionButton, { backgroundColor: '#666' }]} onPress={() => setCameraActive(false)}>
          <Text style={styles.permissionButtonText}>Fechar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Camera View */}
      <CameraView ref={cameraRef} style={styles.camera} facing="back" />

      {/* HUD Overlay */}
      <View style={styles.hudOverlay}>
        {/* Header - Título */}
        <View style={styles.hudHeader}>
          <Text style={styles.hudTitle}>🎥 CAPTURA DE FUMAÇA</Text>
          <Text style={styles.hudSubtitle}>Telêmetro 3D em Tempo Real</Text>
        </View>

        {/* Center - Reticle */}
        <View style={styles.hudCenter}>
          <View style={styles.targetReticle}>
            <View style={[styles.crosshairLine, { width: 2, height: 60 }]} />
            <View style={[styles.crosshairLine, { width: 60, height: 2 }]} />
          </View>
        </View>

        {/* Data Panel - Telemetria */}
        <View style={styles.hudDataPanel}>
          {/* Localização GPS */}
          <Text style={styles.hudDataTitle}>📍 LOCALIZAÇÃO GPS</Text>
          <Text style={styles.hudDataText}>LAT: {location?.latitude?.toFixed(4) ?? 'N/D'}°</Text>
          <Text style={styles.hudDataText}>LON: {location?.longitude?.toFixed(4) ?? 'N/D'}°</Text>
          <Text style={styles.hudDataText}>ALT: {location?.altitude?.toFixed(1) ?? 'N/D'}m</Text>

          {/* Orientação */}
          <Text style={[styles.hudDataTitle, { marginTop: 10 }]}>🧭 ORIENTAÇÃO</Text>
          <Text style={styles.hudDataText}>RUMO: {(Math.round(smoothHeading) % 360) || 0}°</Text>
          <Text style={styles.hudDataText}>DECL: {magneticDeclination?.toFixed(1) ?? 'N/D'}°</Text>
          <Text style={styles.hudDataText}>PITCH: {Math.round(pitchAngle)}°</Text>

          {/* Distância 3D - Destaque */}
          <Text style={[styles.hudDataTitle, { marginTop: 10, color: '#00ff00', fontSize: 16, fontWeight: 'bold' }]}>
            🎯 DISTÂNCIA 3D
          </Text>
          <Text style={[styles.hudDataText, { color: '#00ff00', fontSize: 18, fontWeight: 'bold' }]}>
            {cameraDynamicDistance !== null && cameraDynamicDistance !== undefined ? cameraDynamicDistance.toFixed(1) : '?'}m
          </Text>

          {/* Altura do Objeto */}
          <Text style={[styles.hudDataTitle, { marginTop: 10 }]}>📏 ALTURA DO OBJETO</Text>
          <Text style={styles.hudDataText}>{cameraObjectHeight ?? 'N/D'}m</Text>

          {/* Focos Marcados */}
          <Text style={[styles.hudDataTitle, { marginTop: 10, color: '#ff6f00' }]}>🔥 FOCOS MARCADOS</Text>
          <Text style={[styles.hudDataText, { color: '#ff6f00' }]}>{focos?.length ?? 0}/5</Text>
        </View>
      </View>

      {/* Control Buttons - Footer */}
      <View style={styles.controlsContainer}>
        <TouchableOpacity style={[styles.controlButton, styles.captureButton]} onPress={handleCapturarFoto}>
          <Text style={styles.controlButtonText}>📸 CAPTURAR</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.controlButton, styles.closeButton]} onPress={() => setCameraActive(false)}>
          <Text style={styles.controlButtonText}>✖️ FECHAR</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
  },
  permissionContainer: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  permissionText: {
    color: '#fff',
    fontSize: 18,
    marginBottom: 20,
    textAlign: 'center',
  },
  permissionButton: {
    backgroundColor: '#8B5C2A',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    width: '100%',
    alignItems: 'center',
  },
  permissionButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  hudOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 80,
    justifyContent: 'space-between',
    paddingTop: 20,
    paddingHorizontal: 15,
    paddingBottom: 15,
    pointerEvents: 'none',
  },
  hudHeader: {
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    padding: 12,
    borderRadius: 10,
  },
  hudTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  hudSubtitle: {
    fontSize: 12,
    color: '#aaa',
  },
  hudCenter: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  targetReticle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: '#00ff00',
    backgroundColor: 'rgba(0, 255, 0, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  crosshairLine: {
    position: 'absolute',
    backgroundColor: '#00ff00',
  },
  hudDataPanel: {
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    padding: 12,
    borderRadius: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#00ff00',
  },
  hudDataTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  hudDataText: {
    fontSize: 13,
    color: '#0f0',
    marginBottom: 3,
    fontFamily: 'Courier New',
    fontWeight: '600',
  },
  controlsContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    padding: 10,
    gap: 8,
  },
  controlButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    elevation: 3,
  },
  captureButton: {
    backgroundColor: '#00AA00',
  },
  closeButton: {
    backgroundColor: '#E53935',
  },
  controlButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12,
  },
});
