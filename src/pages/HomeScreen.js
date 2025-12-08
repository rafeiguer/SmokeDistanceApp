import React from 'react';
import { View, ScrollView, Text, TouchableOpacity, Alert } from 'react-native';

export default function HomeScreen({ 
  location, 
  meteoDataDinamica,
  isConnected,
  pendingFireData,
  distanceSingle,
  cameraPhoto,
  setCameraActive,
  setCameraPhoto,
  setPendingFireData,
  setPage,
  darkMode,
  compassData,
  focosData,
  networkData
}) {
  return (
    <View style={{ flex: 1, backgroundColor: darkMode ? '#121212' : '#2e7d32' }}>
      <View style={{ 
        backgroundColor: darkMode ? '#1E1E1E' : '#145A32', 
        padding: 20, 
        paddingTop: 50, 
        alignItems: 'center', 
        elevation: 3 
      }}>
        <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#fff' }}>
           SmokeDistance
        </Text>
        <Text style={{ fontSize: 12, color: '#ddd', marginTop: 5 }}>
          Detecção de Fumaça
        </Text>
      </View>


      <ScrollView style={{ flex: 1, padding: 15 }}>
        {/* Card Localização GPS */}
        <View style={{ backgroundColor: darkMode ? '#1E1E1E' : '#e8f5e9', padding: 15, borderRadius: 10, marginBottom: 15, elevation: 2 }}>
          <Text style={{ fontSize: 16, fontWeight: 'bold', color: darkMode ? '#E0E0E0' : '#666', marginBottom: 10 }}>📍 Localização GPS</Text>
          {location ? (
            <>
              <Text style={{ fontSize: 14, color: darkMode ? '#D0D0D0' : '#666', marginBottom: 5 }}>Lat: {location.latitude.toFixed(4)}°</Text>
              <Text style={{ fontSize: 14, color: darkMode ? '#D0D0D0' : '#666', marginBottom: 5 }}>Lon: {location.longitude.toFixed(4)}°</Text>
              <Text style={{ fontSize: 14, color: darkMode ? '#D0D0D0' : '#666' }}>Alt: {location.altitude ? location.altitude.toFixed(1) : 'N/D'}m</Text>
            </>
          ) : (
            <Text style={{ fontSize: 14, color: darkMode ? '#D0D0D0' : '#666' }}>❌ GPS não disponível</Text>
          )}
        </View>

        {/* Card Meteorologia */}
        <View style={{ backgroundColor: darkMode ? '#1E1E1E' : '#e8f5e9', padding: 15, borderRadius: 10, marginBottom: 15, elevation: 2 }}>
          <Text style={{ fontSize: 16, fontWeight: 'bold', color: darkMode ? '#E0E0E0' : '#666', marginBottom: 10 }}>🌡️ Meteorologia</Text>
          <Text style={{ fontSize: 14, color: darkMode ? '#D0D0D0' : '#666', marginBottom: 5 }}>Temp: {meteoDataDinamica?.temp ?? 'N/D'}°C</Text>
          <Text style={{ fontSize: 14, color: darkMode ? '#D0D0D0' : '#666', marginBottom: 5 }}>Umidade: {meteoDataDinamica?.humidity ?? 'N/D'}%</Text>
          <Text style={{ fontSize: 14, color: darkMode ? '#D0D0D0' : '#666', marginBottom: 5 }}>Vento: {meteoDataDinamica?.windSpeed ?? 'N/D'} km/h</Text>
          <Text style={{ fontSize: 14, color: darkMode ? '#D0D0D0' : '#666' }}>Direção: {meteoDataDinamica?.windDirection ?? 'N/D'}°</Text>
        </View>

        <TouchableOpacity 
          style={{ 
            backgroundColor: '#8B5C2A', 
            padding: 15, 
            borderRadius: 10, 
            alignItems: 'center', 
            marginBottom: 15,
            elevation: 3
          }}
          onPress={() => setCameraActive(true)}
        >
          <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 14 }}>
             CÂMERA
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={{ 
            backgroundColor: '#8B5C2A', 
            padding: 12, 
            borderRadius: 10, 
            alignItems: 'center', 
            marginBottom: 10,
            elevation: 2
          }}
          onPress={() => setPage(2)}
        >
          <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 14 }}>
             Mapa
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={{ 
            backgroundColor: '#8B5C2A', 
            padding: 12, 
            borderRadius: 10, 
            alignItems: 'center', 
            marginBottom: 10,
            elevation: 2
          }}
          onPress={() => setPage(5)}
        >
          <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 14 }}>
             Satélites
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={{ 
            backgroundColor: '#8B5C2A', 
            padding: 12, 
            borderRadius: 10, 
            alignItems: 'center', 
            marginBottom: 10,
            elevation: 2
          }}
          onPress={() => setPage(4)}
        >
          <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 14 }}>
             Compartilhar
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={{ 
            backgroundColor: '#8B5C2A', 
            padding: 12, 
            borderRadius: 10, 
            alignItems: 'center',
            elevation: 2
          }}
          onPress={() => setPage(3)}
        >
          <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 14 }}>
             Config
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}
