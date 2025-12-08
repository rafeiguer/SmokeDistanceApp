import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import MapView, { Marker, Polyline, Circle } from 'react-native-maps';
import { useLocation } from '../hooks/useLocation';
import { useCompass } from '../hooks/useCompass';
import { useFocos } from '../hooks/useFocos';

export default function MapScreen({ setPage, darkMode }) {
  const locationData = useLocation(true, 'normal', true);
  const compassData = useCompass(locationData.location, true, false, () => {});
  const focosData = useFocos();
  
  const mapRef = useRef(null);
  const [currentRegion, setCurrentRegion] = useState({
    latitude: locationData.location?.latitude || -15.8267,
    longitude: locationData.location?.longitude || -48.1267,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  });
  const [followUser, setFollowUser] = useState(true);
  const [marcandoFoco, setMarcandoFoco] = useState(false);
  const [mapType, setMapType] = useState('hybrid');

  // Atualizar posição do mapa quando usuário se move
  useEffect(() => {
    if (locationData.location && followUser && mapRef.current) {
      const newRegion = {
        latitude: locationData.location.latitude,
        longitude: locationData.location.longitude,
        latitudeDelta: currentRegion.latitudeDelta,
        longitudeDelta: currentRegion.longitudeDelta,
      };
      setCurrentRegion(newRegion);
      mapRef.current.animateToRegion(newRegion, 500);
    }
  }, [locationData.location, followUser]);

  const handleMapPress = (e) => {
    if (!marcandoFoco) return;

    const { latitude, longitude } = e.nativeEvent.coordinate;
    
    if (focosData.focos.length >= 5) {
      Alert.alert('⚠️ Limite Atingido', 'Máximo 5 observações para triangulação');
      return;
    }

    // Criar novo foco no local clicado
    const novoFoco = {
      id: Date.now(),
      latitude,
      longitude,
      altitude: locationData.location?.altitude || 0,
      heading: Math.round(compassData.smoothHeading) % 360,
      pitch: 0,
      distancia: 0,
      timestamp: new Date().toLocaleTimeString('pt-BR'),
      observadorId: `Obs-${focosData.focos.length + 1}`,
      marcadoNoMapa: true
    };

    focosData.setFocos([...focosData.focos, novoFoco]);
    Alert.alert('✅ Foco Marcado', `Lat: ${latitude.toFixed(4)}°\nLon: ${longitude.toFixed(4)}°`);
    setMarcandoFoco(false);
  };

  const handleRemoverFoco = (focoId) => {
    focosData.removerFoco(focoId);
    Alert.alert('✅ Foco Removido', 'Foco foi removido da lista');
  };

  return (
    <View style={styles.container}>
      {/* Mapa */}
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={currentRegion}
        mapType={mapType}
        onPress={handleMapPress}
        showsUserLocation
        followsUserLocation={followUser}
      >
        {/* Marcador do usuário */}
        {locationData.location && (
          <Marker
            coordinate={{
              latitude: locationData.location.latitude,
              longitude: locationData.location.longitude,
            }}
            title="Sua Posição"
            description={`Heading: ${Math.round(compassData.smoothHeading)}°`}
            pinColor="#0066ff"
          />
        )}

        {/* Marcadores dos focos */}
        {focosData.focos.map((foco, idx) => (
          <Marker
            key={foco.id}
            coordinate={{
              latitude: foco.latitude,
              longitude: foco.longitude,
            }}
            title={`Foco ${idx + 1}`}
            description={`Observador: ${foco.observadorId}`}
            pinColor="#ff6f00"
          />
        ))}

        {/* Círculo de cobertura se tiver 2+ focos */}
        {focosData.focos.length >= 2 && focosData.triangulacaoResultado && (
          <Circle
            center={{
              latitude: focosData.triangulacaoResultado.latitude,
              longitude: focosData.triangulacaoResultado.longitude,
            }}
            radius={focosData.triangulacaoResultado.radius || 1000}
            fillColor="rgba(255, 111, 0, 0.1)"
            strokeColor="rgba(255, 111, 0, 0.5)"
            strokeWidth={2}
          />
        )}

        {/* Linha entre focos */}
        {focosData.focos.length >= 2 && (
          <Polyline
            coordinates={focosData.focos.map(f => ({
              latitude: f.latitude,
              longitude: f.longitude,
            }))}
            strokeColor="#FF6F00"
            strokeWidth={2}
          />
        )}
      </MapView>

      {/* Overlay de Controles */}
      <View style={[styles.controlPanel, { backgroundColor: darkMode ? '#1E1E1E' : '#fff' }]}>
        {/* Status */}
        <View style={styles.statusBox}>
          <Text style={[styles.statusText, { color: darkMode ? '#E0E0E0' : '#333' }]}>
            📍 Focos: {focosData.focos.length}/5
          </Text>
          <Text style={[styles.statusText, { color: darkMode ? '#A0A0A0' : '#666', fontSize: 12 }]}>
            🧭 Heading: {Math.round(compassData.smoothHeading)}°
          </Text>
        </View>

        {/* Botões de Controle */}
        <View style={styles.buttonRow}>
          <TouchableOpacity 
            style={[styles.mapButton, { backgroundColor: mapType === 'hybrid' ? '#FF6F00' : '#8B5C2A' }]}
            onPress={() => setMapType(mapType === 'hybrid' ? 'standard' : 'hybrid')}
          >
            <Text style={styles.buttonText}>🗺️ {mapType === 'hybrid' ? 'Satélite' : 'Padrão'}</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.mapButton, { backgroundColor: followUser ? '#00AA00' : '#8B5C2A' }]}
            onPress={() => setFollowUser(!followUser)}
          >
            <Text style={styles.buttonText}>📍 {followUser ? 'Seguindo' : 'Fixo'}</Text>
          </TouchableOpacity>
        </View>

        {/* Botão Marcar Foco */}
        <TouchableOpacity 
          style={[
            styles.markButton,
            { backgroundColor: marcandoFoco ? '#FF6F00' : '#00AA00' }
          ]}
          onPress={() => setMarcandoFoco(!marcandoFoco)}
        >
          <Text style={styles.buttonText}>
            {marcandoFoco ? '✋ CANCELAR MARCAÇÃO' : '🎯 MARCAR FOCO NO MAPA'}
          </Text>
        </TouchableOpacity>

        {/* Lista de Focos */}
        {focosData.focos.length > 0 && (
          <ScrollView style={styles.focosList}>
            <Text style={[styles.focoTitle, { color: darkMode ? '#E0E0E0' : '#333' }]}>
              Focos Marcados:
            </Text>
            {focosData.focos.map((foco, idx) => (
              <View key={foco.id} style={[styles.focoItem, { backgroundColor: darkMode ? '#2A2A2A' : '#f5f5f5' }]}>
                <View style={styles.focoInfo}>
                  <Text style={[styles.focoText, { color: darkMode ? '#E0E0E0' : '#333' }]}>
                    #{idx + 1} • {foco.observadorId}
                  </Text>
                  <Text style={[styles.focoTextSmall, { color: darkMode ? '#A0A0A0' : '#666' }]}>
                    {foco.latitude.toFixed(4)}°, {foco.longitude.toFixed(4)}°
                  </Text>
                </View>
                <TouchableOpacity 
                  style={styles.removeButton}
                  onPress={() => handleRemoverFoco(foco.id)}
                >
                  <Text style={styles.removeButtonText}>✕</Text>
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
        )}
      </View>

      {/* Botão Voltar */}
      <TouchableOpacity 
        style={styles.backButton}
        onPress={() => setPage(1)}
      >
        <Text style={styles.backButtonText}>← VOLTAR</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  map: {
    flex: 1,
  },
  controlPanel: {
    position: 'absolute',
    bottom: 60,
    left: 10,
    right: 10,
    borderRadius: 12,
    padding: 12,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    maxHeight: '40%',
  },
  statusBox: {
    marginBottom: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 4,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  mapButton: {
    flex: 1,
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
    elevation: 2,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12,
  },
  markButton: {
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 10,
    elevation: 3,
  },
  focosList: {
    maxHeight: 150,
    marginTop: 10,
  },
  focoTitle: {
    fontWeight: 'bold',
    fontSize: 12,
    marginBottom: 8,
  },
  focoItem: {
    flexDirection: 'row',
    padding: 10,
    marginBottom: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  focoInfo: {
    flex: 1,
  },
  focoText: {
    fontWeight: '600',
    fontSize: 12,
    marginBottom: 3,
  },
  focoTextSmall: {
    fontSize: 11,
  },
  removeButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#E53935',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  removeButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  backButton: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    right: 10,
    backgroundColor: '#8B5C2A',
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
    elevation: 3,
  },
  backButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
});

