// 🛰️ SATELLITES SCREEN - Focos por Satélite

import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { styles } from '../styles';
import { darkStyles } from '../styles/darkStyles';

export default function SatellitesScreen({
  satelliteFocos,
  loadSatelliteFocos,
  enableFIRMS,
  setEnableFIRMS,
  enableGOES,
  setEnableGOES,
  enableMSG,
  setEnableMSG,
  showSatelliteOverlay,
  setShowSatelliteOverlay,
  darkMode,
  location,
  onNavigate,
}) {
  return (
    <View style={[styles.container, darkMode && darkStyles.container]}>
      <View style={[styles.header, darkMode && darkStyles.header]}>
        <Text style={[styles.title, darkMode && darkStyles.title]}>🛰️ Satélites</Text>
      </View>
      
      <ScrollView style={styles.content}>
        {/* Info */}
        <View style={[styles.card, { backgroundColor: '#E3F2FD', borderLeftWidth: 4, borderLeftColor: '#2196F3' }]}>
          <Text style={[styles.cardTitle, { color: '#0D47A1' }]}>Camada de Focos por Satélite</Text>
          <Text style={[styles.text, darkMode && darkStyles.text]}>
            Esta página lista os satélites disponíveis e permite atualizar focos próximos. 
            No mapa (Página 2), o botão "🔥 Satélites" alterna a visualização desses focos.
          </Text>
        </View>

        {/* Fontes Ativas */}
        <View style={[styles.card, darkMode && darkStyles.card]}>
          <Text style={[styles.cardTitle, darkMode && darkStyles.cardTitle]}>Fontes Ativas</Text>
          
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            <TouchableOpacity
              style={[styles.mapButton, { backgroundColor: enableFIRMS ? '#2E7D32' : '#9E9E9E' }]}
              onPress={() => setEnableFIRMS(!enableFIRMS)}
            >
              <Text style={styles.buttonText}>FIRMS</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.mapButton, { backgroundColor: enableGOES ? '#2E7D32' : '#9E9E9E' }]}
              onPress={() => setEnableGOES(!enableGOES)}
            >
              <Text style={styles.buttonText}>GOES</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.mapButton, { backgroundColor: enableMSG ? '#2E7D32' : '#9E9E9E' }]}
              onPress={() => setEnableMSG(!enableMSG)}
            >
              <Text style={styles.buttonText}>MSG</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Info dos Satélites */}
        <View style={[styles.card, darkMode && darkStyles.card]}>
          <Text style={[styles.cardTitle, darkMode && darkStyles.cardTitle]}>📡 FIRMS (MODIS/VIIRS)</Text>
          <Text style={[styles.text, darkMode && darkStyles.text]}>Atualização: ≈ 15min-6h</Text>
          <Text style={[styles.text, darkMode && darkStyles.text]}>Resolução: 375m-1km</Text>
          <Text style={[styles.text, darkMode && darkStyles.text]}>Focos carregados: {satelliteFocos.filter(x => x.origem === 'FIRMS').length}</Text>
        </View>

        <View style={[styles.card, darkMode && darkStyles.card]}>
          <Text style={[styles.cardTitle, darkMode && darkStyles.cardTitle]}>📡 GOES</Text>
          <Text style={[styles.text, darkMode && darkStyles.text]}>Atualização: ≈ 5-15min</Text>
          <Text style={[styles.text, darkMode && darkStyles.text]}>Resolução: 2-10km</Text>
          <Text style={[styles.text, darkMode && darkStyles.text]}>Focos carregados: {satelliteFocos.filter(x => x.origem === 'GOES').length}</Text>
        </View>

        <View style={[styles.card, darkMode && darkStyles.card]}>
          <Text style={[styles.cardTitle, darkMode && darkStyles.cardTitle]}>📡 MSG</Text>
          <Text style={[styles.text, darkMode && darkStyles.text]}>Atualização: ≈ 15min</Text>
          <Text style={[styles.text, darkMode && darkStyles.text]}>Resolução: 3km</Text>
          <Text style={[styles.text, darkMode && darkStyles.text]}>Focos carregados: {satelliteFocos.filter(x => x.origem === 'MSG').length}</Text>
        </View>

        {/* Botões de Ação */}
        <TouchableOpacity
          style={[styles.buttonPrimary, { backgroundColor: '#1976D2' }]}
          onPress={async () => {
            if (location) {
              await loadSatelliteFocos(location.latitude, location.longitude);
              Alert.alert('✅ Atualizado', 'Focos carregados. Abra o mapa na Página 2');
            } else {
              Alert.alert('⚠️ Erro', 'GPS não disponível');
            }
          }}
        >
          <Text style={styles.buttonText}>🔄 Atualizar Focos Próximos</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.buttonPrimary, { backgroundColor: showSatelliteOverlay ? '#E53935' : '#8B5C2A' }]}
          onPress={async () => {
            if (!showSatelliteOverlay && satelliteFocos.length === 0) {
              if (location) {
                await loadSatelliteFocos(location.latitude, location.longitude);
              }
            }
            setShowSatelliteOverlay(!showSatelliteOverlay);
            Alert.alert(
              'Camada',
              !showSatelliteOverlay 
                ? 'Camada ativada. Vá ao mapa (Página 2).' 
                : 'Camada desativada.'
            );
          }}
        >
          <Text style={styles.buttonText}>
            {showSatelliteOverlay ? '🔥 Desativar Camada' : '🔥 Ativar Camada'}
          </Text>
        </TouchableOpacity>

        {/* Info Extra */}
        <View style={[styles.card, { backgroundColor: '#FFF3E0', borderLeftWidth: 4, borderLeftColor: '#FF6F00' }]}>
          <Text style={[styles.cardTitle, { color: '#FF6F00' }]}>ℹ️ Sobre os Satélites</Text>
          <Text style={[styles.text, { color: '#333' }]}>
            🛰️ FIRMS: Dados de fogo em tempo real do NASA (MODIS e VIIRS){'\n'}{'\n'}
            🛰️ GOES: Sistema geoestacionário de satélites americanos{'\n'}{'\n'}
            🛰️ MSG: Satélite europeu para monitoramento meteorológico{'\n'}{'\n'}
            Os focos são atualizados em intervalos regulares e exibidos no mapa como marcadores 🔥.
          </Text>
        </View>
      </ScrollView>

      <TouchableOpacity style={styles.buttonPrimary} onPress={() => onNavigate(1)}>
        <Text style={styles.buttonText}>← Voltar</Text>
      </TouchableOpacity>
    </View>
  );
}