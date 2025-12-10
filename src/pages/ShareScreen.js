// 📤 SHARE SCREEN - Compartilhamento de Dados

import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { styles } from '../styles';
import { darkStyles } from '../styles/darkStyles';

export default function ShareScreen({
  focos,
  triangulacaoResultado,
  location,
  meteoDataDinamica,
  darkMode,
  onNavigate,
}) {
  const prepararDadosParaEnvio = (autoridade) => {
    if (!focos || focos.length === 0) {
      Alert.alert('⚠️ Erro', 'Nenhum foco marcado!');
      return;
    }

    const agora = new Date();
    const data = agora.toLocaleDateString('pt-BR');
    const hora = agora.toLocaleTimeString('pt-BR');
    
    let mensagem = `🚨 ALERTA DE FOCO DE FUMAÇA\n`;
    mensagem += `📅 Data: ${data}\n`;
    mensagem += `⏰ Hora: ${hora}\n`;
    mensagem += `📍 Localização do Observador:\n`;
    mensagem += `   Latitude: ${location?.latitude.toFixed(6) || 'N/A'}\n`;
    mensagem += `   Longitude: ${location?.longitude.toFixed(6) || 'N/A'}\n`;
    mensagem += `   Altitude: ${location?.altitude?.toFixed(1) || 'N/A'}m\n\n`;
    
    mensagem += `🔥 FOCOS DETECTADOS: ${focos.length}\n`;
    focos.forEach((foco, idx) => {
      mensagem += `\n   Foco ${idx + 1}:\n`;
      mensagem += `   - Latitude: ${foco.latitude.toFixed(6)}\n`;
      mensagem += `   - Longitude: ${foco.longitude.toFixed(6)}\n`;
      mensagem += `   - Altitude: ${foco.altitude.toFixed(1)}m\n`;
      mensagem += `   - Distância: ${foco.distancia.toFixed(1)}m\n`;
      mensagem += `   - Hora da Marcação: ${foco.timestamp}\n`;
    });

    if (triangulacaoResultado) {
      mensagem += `\n📍 LOCALIZAÇÃO ESTIMADA DO FOGO (Triangulação):\n`;
      mensagem += `   Latitude: ${triangulacaoResultado.latitude.toFixed(6)}\n`;
      mensagem += `   Longitude: ${triangulacaoResultado.longitude.toFixed(6)}\n`;
      mensagem += `   Altitude: ${triangulacaoResultado.altitude.toFixed(1)}m\n`;
      mensagem += `   Precisão: ${(100 - triangulacaoResultado.erro * 100).toFixed(1)}%\n`;
    }

    mensagem += `\n🌡️ DADOS METEOROLÓGICOS:\n`;
    mensagem += `   Temperatura: ${meteoDataDinamica.temp}°C\n`;
    mensagem += `   Umidade: ${meteoDataDinamica.humidity}%\n`;
    mensagem += `   Velocidade do Vento: ${meteoDataDinamica.windSpeed} km/h\n`;
    mensagem += `   Direção do Vento: ${meteoDataDinamica.windDirection}°\n`;

    mensagem += `\n📍 MAPA INTERATIVO:\n`;
    mensagem += `   https://maps.google.com/maps?q=${focos[0].latitude},${focos[0].longitude}\n`;

    mensagem += `\n⚠️ AVISO: Esta mensagem foi gerada automaticamente pelo app SmokeDistance`;

    Alert.alert(
      `📤 DADOS PREPARADOS - ${autoridade}`,
      `Focos: ${focos.length}\nData: ${data}\nHora: ${hora}`,
      [
        { text: 'Fechar' },
        { 
          text: '📋 Ver Detalhes', 
          onPress: () => {
            Alert.alert('📋 DADOS COMPLETOS', mensagem, [
              { text: 'Fechar' }
            ]);
          }
        }
      ]
    );
  };

  return (
    <View style={[styles.container, darkMode && darkStyles.container]}>
      <View style={[styles.header, darkMode && darkStyles.header]}>
        <Text style={[styles.title, darkMode && darkStyles.title]}>📤 Compartilhar Dados</Text>
      </View>
      
      <ScrollView style={styles.content}>
        {focos.length === 0 ? (
          <View style={[styles.card, darkMode && darkStyles.card]}>
            <Text style={[styles.cardTitle, darkMode && darkStyles.cardTitle]}>⚠️ Sem Dados</Text>
            <Text style={[styles.text, darkMode && darkStyles.text]}>
              Você não tem focos marcados. Marque focos no mapa antes de compartilhar!
            </Text>
          </View>
        ) : (
          <>
            {/* Resumo dos Dados */}
            <View style={[styles.card, { backgroundColor: '#E8F5E9', borderLeftWidth: 4, borderLeftColor: '#4CAF50' }]}>
              <Text style={[styles.cardTitle, { color: '#2E7D32' }]}>📊 Resumo dos Dados</Text>
              <Text style={[styles.text, darkMode && darkStyles.text]}>🔥 Focos: {focos.length}</Text>
              <Text style={[styles.text, darkMode && darkStyles.text]}>
                📍 Sua Localização: {location?.latitude.toFixed(4)}, {location?.longitude.toFixed(4)}
              </Text>
              <Text style={[styles.text, darkMode && darkStyles.text]}>
                ⏰ Data/Hora: {new Date().toLocaleString('pt-BR')}
              </Text>
              {triangulacaoResultado && (
                <Text style={[styles.text, { color: '#FFD700', fontWeight: 'bold' }]}>
                  🎯 Fogo Estimado: {triangulacaoResultado.latitude.toFixed(4)}, {triangulacaoResultado.longitude.toFixed(4)}
                </Text>
              )}
            </View>

            {/* AVISO IMPORTANTE */}
            <View style={[styles.card, { backgroundColor: '#FFF3E0', borderLeftWidth: 4, borderLeftColor: '#FF6F00' }]}>
              <Text style={[styles.cardTitle, { color: '#E65100' }]}>⚠️ AVISO IMPORTANTE</Text>
              <Text style={[styles.text, { color: '#333' }]}>
                Seus dados pessoais e as informações capturadas serão compartilhados com autoridades competentes. Este é um processo oficial!
              </Text>
            </View>

            {/* Contatos de Emergência */}
            <View style={[styles.card, { backgroundColor: '#FFE4B5', borderLeftWidth: 4, borderLeftColor: '#FF6F00' }]}>
              <Text style={[styles.cardTitle, { color: '#FF6F00' }]}>🚨 ENVIAR PARA AUTORIDADES</Text>
              
              <TouchableOpacity 
                style={[styles.buttonPrimary, { backgroundColor: '#E53935', marginBottom: 10 }]}
                onPress={() => prepararDadosParaEnvio('🚒 Bombeiros - 193')}
              >
                <Text style={styles.buttonText}>🚒 Bombeiros: 193</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.buttonPrimary, { backgroundColor: '#1976D2', marginBottom: 10 }]}
                onPress={() => prepararDadosParaEnvio('🛡️ Defesa Civil - 199')}
              >
                <Text style={styles.buttonText}>🛡️ Defesa Civil: 199</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.buttonPrimary, { backgroundColor: '#00796B', marginBottom: 10 }]}
                onPress={() => prepararDadosParaEnvio('🌿 ICMBio (Ambiental)')}
              >
                <Text style={styles.buttonText}>🌿 ICMBio (Ambiental)</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.buttonPrimary, { backgroundColor: '#6A1B9A' }]}
                onPress={() => prepararDadosParaEnvio('👨‍💼 Proprietário (Premium)')}
              >
                <Text style={styles.buttonText}>👨‍💼 Proprietário (Premium)</Text>
              </TouchableOpacity>
            </View>

            {/* Exportar JSON */}
            <View style={[styles.card, { backgroundColor: '#E3F2FD', borderLeftWidth: 4, borderLeftColor: '#2196F3' }]}>
              <Text style={[styles.cardTitle, { color: '#1565C0' }]}>📋 EXPORTAR DADOS</Text>
              
              <TouchableOpacity 
                style={[styles.buttonPrimary, { backgroundColor: '#2196F3' }]}
                onPress={() => {
                  const jsonData = {
                    timestamp: new Date().toISOString(),
                    app: 'SmokeDistance v1.0.0',
                    usuarioLocalizacao: {
                      latitude: location?.latitude || 0,
                      longitude: location?.longitude || 0,
                      altitude: location?.altitude || 0
                    },
                    focos: focos.map((f, idx) => ({
                      numero: idx + 1,
                      latitude: f.latitude,
                      longitude: f.longitude,
                      altitude: f.altitude,
                      distancia_metros: f.distancia,
                      timestamp: f.timestamp
                    })),
                    totalFocos: focos.length,
                    dataExportacao: new Date().toLocaleString('pt-BR')
                  };
                  
                  Alert.alert(
                    '✅ JSON Gerado',
                    `${focos.length} foco(s) em JSON\nArquivo: focos_${Date.now()}.json`,
                    [{ text: 'OK' }]
                  );
                }}
              >
                <Text style={styles.buttonText}>📋 Exportar como JSON</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>

      <TouchableOpacity 
        style={styles.buttonPrimary}
        onPress={() => onNavigate(2)}
      >
        <Text style={styles.buttonText}>← Voltar ao Mapa</Text>
      </TouchableOpacity>
    </View>
  );
}