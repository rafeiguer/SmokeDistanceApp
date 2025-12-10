// ⚙️ SETTINGS SCREEN - Configurações

import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { styles } from '../styles';
import { darkStyles } from '../styles/darkStyles';

export default function SettingsScreen({
  darkMode,
  setDarkMode,
  gpsMode,
  setGpsMode,
  onNavigate,
}) {
  return (
    <View style={[styles.container, darkMode && darkStyles.container]}>
      <View style={[styles.header, darkMode && darkStyles.header]}>
        <Text style={[styles.title, darkMode && darkStyles.title]}>⚙️ Configurações</Text>
      </View>
      
      <ScrollView style={styles.content}>
        {/* Info da App */}
        <View style={[styles.card, darkMode && darkStyles.card]}>
          <Text style={[styles.cardTitle, darkMode && darkStyles.cardTitle]}>📱 Informações da App</Text>
          <Text style={[styles.text, darkMode && darkStyles.text]}>SmokeDistance v1.0.0</Text>
          <Text style={[styles.text, darkMode && darkStyles.text]}>Detecção de focos de fumaça</Text>
          <Text style={[styles.text, darkMode && darkStyles.text]}>© 2025 VIA</Text>
        </View>

        {/* Modo GPS */}
        <View style={[styles.card, darkMode && darkStyles.card]}>
          <Text style={[styles.cardTitle, darkMode && darkStyles.cardTitle]}>📍 Atualização de GPS</Text>
          <Text style={[styles.text, darkMode && darkStyles.text]}>Escolha o modo de atualização:</Text>
          
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
            <TouchableOpacity
              style={[styles.mapButton, { flex: 1, backgroundColor: gpsMode === 'eco' ? '#2E7D32' : '#9E9E9E' }]}
              onPress={() => setGpsMode('eco')}
            >
              <Text style={styles.buttonText}>🔋 Eco</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.mapButton, { flex: 1, backgroundColor: gpsMode === 'normal' ? '#2E7D32' : '#9E9E9E' }]}
              onPress={() => setGpsMode('normal')}
            >
              <Text style={styles.buttonText}>⚖️ Normal</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.mapButton, { flex: 1, backgroundColor: gpsMode === 'preciso' ? '#2E7D32' : '#9E9E9E' }]}
              onPress={() => setGpsMode('preciso')}
            >
              <Text style={styles.buttonText}>🎯 Preciso</Text>
            </TouchableOpacity>
          </View>
          
          <Text style={[styles.text, { fontSize: 12, color: '#555', marginTop: 10 }]}>
            🔋 Eco: menos consumo (~5s/10m){'\n'}
            ⚖️ Normal: equilibrado (~2s/3m){'\n'}
            🎯 Preciso: máximo (~1s/1m)
          </Text>
        </View>

        {/* Tema Noite */}
        <View style={[styles.card, darkMode && darkStyles.card]}>
          <Text style={[styles.cardTitle, darkMode && darkStyles.cardTitle]}>🌙 Modo Noite</Text>
          <Text style={[styles.text, darkMode && darkStyles.text]}>Economiza bateria (AMOLED) e reduz brilho em campo.</Text>
          
          <TouchableOpacity
            style={[styles.mapButton, { marginTop: 10, backgroundColor: darkMode ? '#4CAF50' : '#8B5C2A' }]}
            onPress={() => setDarkMode(!darkMode)}
          >
            <Text style={styles.buttonText}>{darkMode ? '✅ Ativo' : '🌙 Ativar'}</Text>
          </TouchableOpacity>
        </View>

        {/* Sobre */}
        <View style={[styles.card, { backgroundColor: '#FFF3E0', borderLeftWidth: 4, borderLeftColor: '#FF6F00' }]}>
          <Text style={[styles.cardTitle, { color: '#FF6F00' }]}>ℹ️ Sobre SmokeDistance</Text>
          <Text style={[styles.text, { color: '#333' }]}>
            SmokeDistance é um aplicativo de detecção de focos de fumaça que utiliza:
          </Text>
          <Text style={[styles.text, { color: '#333', marginTop: 8 }]}>
            ✅ GPS em tempo real{'\n'}
            ✅ Câmera com telemétro 3D{'\n'}
            ✅ Magnetômetro (bussola){'\n'}
            ✅ Triangulação geodésica{'\n'}
            ✅ Dados meteorológicos{'\n'}
            ✅ Focos de satélite (FIRMS)
          </Text>
        </View>
      </ScrollView>

      <TouchableOpacity 
        style={styles.buttonPrimary}
        onPress={() => onNavigate(1)}
      >
        <Text style={styles.buttonText}>← Voltar</Text>
      </TouchableOpacity>
    </View>
  );
}