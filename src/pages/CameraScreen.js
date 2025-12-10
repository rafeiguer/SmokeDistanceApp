// 📷 CAMERA SCREEN - Câmera com Overlay HUD

import React, { useRef } from 'react';
import { View, Text, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';

export default function CameraScreen({
  location,
  smoothHeading,
  magneticDeclination,
  cameraDynamicDistance,
  pitchAngle,
  cameraRef,
  onCapture,
  onCancel,
}) {
  const [permission, requestPermission] = useCameraPermissions();
  const internalCameraRef = useRef(null);

  if (!permission?.granted) {
    return (
      <View style={cameraStyles.container}>
        <View style={cameraStyles.header}>
          <Text style={cameraStyles.title}>📷 Câmera</Text>
        </View>
        <View style={cameraStyles.content}>
          <Text style={cameraStyles.text}>Permissão de câmera negada</Text>
          <TouchableOpacity 
            style={[cameraStyles.button, { marginTop: 15 }]}
            onPress={requestPermission}
          >
            <Text style={cameraStyles.buttonText}>✅ Solicitar Permissão</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[cameraStyles.button, { backgroundColor: '#8B5C2A', marginTop: 10 }]}
            onPress={onCancel}
          >
            <Text style={cameraStyles.buttonText}>❌ Cancelar</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={cameraStyles.container}>
      {/* Câmera + Overlay */}
      <View style={{ flex: 1, position: 'relative' }}>
        <CameraView 
          ref={internalCameraRef}
          style={cameraStyles.camera}
          facing="back"
        />
        
        {/* HUD Overlay */}
        <View style={cameraStyles.cameraOverlay}>
          {/* Cabeçalho */}
          <View style={cameraStyles.overlayHeader}>
            <Text style={cameraStyles.overlayTitle}>🎥 CAPTURA DE FUMAÇA</Text>
          </View>

          {/* Centro - Alvo */}
          <View style={cameraStyles.overlayCenter}>
            <View style={cameraStyles.targetReticle} />
          </View>

          {/* Dados em tempo real */}
          <View style={cameraStyles.overlayData}>
            <Text style={cameraStyles.overlayText}>📍 LAT: {location?.latitude.toFixed(4)}°</Text>
            <Text style={cameraStyles.overlayText}>📍 LON: {location?.longitude.toFixed(4)}°</Text>
            <Text style={cameraStyles.overlayText}>📍 ALT: {location?.altitude?.toFixed(1) || '?'}m</Text>
            <Text style={cameraStyles.overlayText}>📐 PITCH: {Math.round(pitchAngle)}°</Text>
            
            {/* Distância dinâmica */}
            <Text style={[cameraStyles.overlayText, { color: '#00ff00', fontWeight: 'bold', marginTop: 8, fontSize: 16 }]}>
              🎯 DIST 3D: {cameraDynamicDistance !== null ? cameraDynamicDistance.toFixed(1) : '?'}m
            </Text>
            
            <Text style={cameraStyles.overlayText}>🧭 RUMO: {(Math.round(smoothHeading) % 360) || 0}° (Decl: {magneticDeclination.toFixed(1)}°)</Text>
          </View>
        </View>
      </View>
      
      {/* Controles */}
      <View style={cameraStyles.cameraControls}>
        <TouchableOpacity 
          style={[cameraStyles.button, { backgroundColor: '#8B5C2A', borderRadius: 10, padding: 12, flex: 1, marginRight: 10 }]}
          onPress={async () => {
            try {
              if (internalCameraRef.current) {
                const photo = await internalCameraRef.current.takePictureAsync({
                  quality: 0.8,
                  exif: true,
                });
                onCapture(photo);
                Alert.alert('✅ Foto Capturada', `🎯 Distância 3D: ${cameraDynamicDistance?.toFixed(1) || '?'}m\n📐 Pitch: ${Math.round(pitchAngle)}°`);
              }
            } catch (err) {
              console.error('❌ Erro ao capturar:', err);
              Alert.alert('❌ Erro', 'Erro ao capturar foto');
            }
          }}
        >
          <Text style={cameraStyles.buttonText}>📸 CAPTURAR</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[cameraStyles.button, { backgroundColor: '#8B5C2A', borderRadius: 10, padding: 12, flex: 1 }]}
          onPress={onCancel}
        >
          <Text style={cameraStyles.buttonText}>❌ CANCELAR</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const cameraStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    backgroundColor: '#145A32',
    padding: 20,
    paddingTop: 50,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  content: {
    flex: 1,
    padding: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
  },
  button: {
    backgroundColor: '#2196F3',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 10,
    elevation: 3,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
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
    color: '#fff',
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
  },
  overlayData: {
    backgroundColor: '#e8f5e9',
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
    backgroundColor: '#000',
    gap: 10,
  },
});