// 🏠 HOME SCREEN - Página Inicial

import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { styles } from '../styles';
import { darkStyles } from '../styles/darkStyles';

export default function HomeScreen({
  location,
  loading,
  focos,
  triangulacaoResultado,
  meteoDataDinamica,
  isConnected,
  cameraPhoto,
  distanceSingle,
  smokeHeight,
  setSmokeHeight,
  darkMode,
  onNavigate,
  onCameraOpen,
  onCameraClear,
}) {
  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>📱 SmokeDistance</Text>
        </View>
        <View style={styles.content}>
          <Text style={styles.text}>🔄 Obtendo localização...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, darkMode && darkStyles.container]}>
      <View style={[styles.header, darkMode && darkStyles.header]}>
        <Text style={[styles.title, darkMode && darkStyles.title]}>📱 SmokeDistance</Text>
        <Text style={[styles.subtitle, darkMode && darkStyles.subtitle]}>Detecção de Fumaça</Text>
      </View>

      <ScrollView style={styles.content}>
        {/* Localização GPS */}
        <View style={[styles.card, darkMode && darkStyles.card]}>
          <Text style={[styles.cardTitle, darkMode && darkStyles.cardTitle]}>📍 Localização GPS</Text>
          {location ? (
            <>
              <Text style={[styles.text, darkMode && darkStyles.text]}>Lat: {location.latitude.toFixed(4)}°</Text>
              <Text style={[styles.text, darkMode && darkStyles.text]}>Lon: {location.longitude.toFixed(4)}°</Text>
              <Text style={[styles.text, darkMode && darkStyles.text]}>Alt: {location.altitude ? location.altitude.toFixed(1) : 'N/D'}m</Text>
            </>
          ) : (
            <Text style={[styles.text, darkMode && darkStyles.text]}>❌ GPS não disponível</Text>
          )}
        </View>

        {/* Dados Meteorológicos */}
        <View style={[styles.card, darkMode && darkStyles.card]}>
          <Text style={[styles.cardTitle, darkMode && darkStyles.cardTitle]}>📊 Dados Meteorológicos</Text>
          <Text style={[styles.text, darkMode && darkStyles.text]}>🌡️ Temperatura: {meteoDataDinamica.temp}°C</Text>
          <Text style={[styles.text, darkMode && darkStyles.text]}>💧 Umidade: {meteoDataDinamica.humidity}%</Text>
          <Text style={[styles.text, darkMode && darkStyles.text]}>💨 Vento: {meteoDataDinamica.windSpeed} km/h</Text>
          <Text style={[styles.text, darkMode && darkStyles.text]}>🧭 Direção: {meteoDataDinamica.windDirection}°</Text>
          <Text style={[styles.text, { color: '#1976D2', fontWeight: 'bold', marginTop: 8 }]}>
            🌦️ {meteoDataDinamica.descricao}
          </Text>
          {!isConnected && (
            <Text style={[styles.text, { color: '#ff9800', fontSize: 12, marginTop: 5 }]}>
              ⚠️ Dados em cache (sem internet)
            </Text>
          )}
        </View>

        {/* Resultado Distância */}
        {distanceSingle && (
          <View style={[styles.card, { backgroundColor: '#e8f5e9' }]}>
            <Text style={[styles.cardTitle, { color: '#2e7d32' }]}>✅ Distância Calculada</Text>
            <Text style={[styles.text, { color: '#1b5e20', fontWeight: 'bold', fontSize: 16 }]}>
              {distanceSingle.toFixed(1)} metros
            </Text>
          </View>
        )}

        {/* Foto Capturada */}
        {cameraPhoto && (
          <View style={[styles.card, { backgroundColor: '#e8f5e9' }]}>
            <Text style={[styles.cardTitle, { color: '#2e7d32' }]}>📷 Foto Capturada</Text>
            <Text style={styles.text}>✅ Foto documentada</Text>
            <TouchableOpacity
              style={[styles.button, { backgroundColor: '#8B5C2A', marginTop: 8 }]}
              onPress={onCameraClear}
            >
              <Text style={styles.buttonText}>🗑️ Limpar</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Botão Câmera */}
        <TouchableOpacity 
          style={[styles.buttonPrimary, darkMode && darkStyles.buttonPrimary, { backgroundColor: '#8B5C2A', marginBottom: 15 }]}
          onPress={onCameraOpen}
        >
          <Text style={styles.buttonText}>📷 CÂMERA</Text>
        </TouchableOpacity>

        {/* Botões de Navegação */}
        <View>
          <TouchableOpacity 
            style={[styles.button, { backgroundColor: '#8B5C2A', borderRadius: 10, padding: 12, alignItems: 'center', elevation: 2, marginBottom: 10 }]}
            onPress={() => onNavigate(2)}
          >
            <Text style={styles.buttonText}>🗺️ Mapa</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.button, { backgroundColor: '#8B5C2A', borderRadius: 10, padding: 12, alignItems: 'center', elevation: 2, marginBottom: 10 }]}
            onPress={() => onNavigate(5)}
          >
            <Text style={styles.buttonText}>🛰️ Satélites</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.button, { backgroundColor: '#8B5C2A', borderRadius: 10, padding: 12, alignItems: 'center', elevation: 2, marginBottom: 10 }]}
            onPress={() => onNavigate(4)}
          >
            <Text style={styles.buttonText}>📤 Compartilhar</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.button, { backgroundColor: '#8B5C2A', borderRadius: 10, padding: 12, alignItems: 'center', elevation: 2 }]}
            onPress={() => onNavigate(3)}
          >
            <Text style={styles.buttonText}>⚙️ Config</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}