import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert } from 'react-native';

export default function ShareScreen({ focos, location, triangulacaoResultado, meteoDataDinamica, setPage, darkMode }) {
  const handleShare = () => {
    if (!focos || focos.length === 0) {
      Alert.alert('Sem Focos', 'Marque pelo menos um foco antes de compartilhar');
      return;
    }

    const agora = new Date();
    const data = agora.toLocaleDateString('pt-BR');
    const hora = agora.toLocaleTimeString('pt-BR');

    Alert.alert(
      'Dados Preparados',
      `✅ ${focos.length} foco(s) detectado(s)\n📅 ${data}\n⏰ ${hora}\n\nDados prontos para envio`,
      [{ text: 'OK', onPress: () => {} }]
    );
  };

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
           Compartilhar
        </Text>
      </View>

      <ScrollView style={{ flex: 1, padding: 15 }}>
        <View style={{ 
          backgroundColor: darkMode ? '#1E1E1E' : '#e8f5e9', 
          padding: 15, 
          borderRadius: 10, 
          marginBottom: 15,
          elevation: 2
        }}>
          <Text style={{ 
            fontSize: 16, 
            fontWeight: 'bold', 
            color: darkMode ? '#E0E0E0' : '#666', 
            marginBottom: 10 
          }}>
             Resumo dos Focos
          </Text>
          
          <Text style={{ fontSize: 14, color: darkMode ? '#D0D0D0' : '#666', marginBottom: 8 }}>
             Focos Detectados: {focos?.length || 0}
          </Text>
          
          {location && (
            <>
              <Text style={{ fontSize: 14, color: darkMode ? '#D0D0D0' : '#666', marginBottom: 8 }}>
                 Sua Localização:
              </Text>
              <Text style={{ fontSize: 13, color: darkMode ? '#A0A0A0' : '#999' }}>
                Lat: {location.latitude.toFixed(4)}°
              </Text>
              <Text style={{ fontSize: 13, color: darkMode ? '#A0A0A0' : '#999' }}>
                Lon: {location.longitude.toFixed(4)}°
              </Text>
            </>
          )}
        </View>

        {triangulacaoResultado && (
          <View style={{ 
            backgroundColor: darkMode ? '#1E1E1E' : '#e8f5e9', 
            padding: 15, 
            borderRadius: 10, 
            marginBottom: 15,
            borderLeftWidth: 4,
            borderLeftColor: '#00AA00',
            elevation: 2
          }}>
            <Text style={{ 
              fontSize: 16, 
              fontWeight: 'bold', 
              color: darkMode ? '#E0E0E0' : '#666', 
              marginBottom: 10 
            }}>
               Localização Estimada
            </Text>
            
            <Text style={{ fontSize: 13, color: darkMode ? '#D0D0D0' : '#666', marginBottom: 5 }}>
              Lat: {triangulacaoResultado.latitude.toFixed(6)}°
            </Text>
            
            <Text style={{ fontSize: 13, color: darkMode ? '#D0D0D0' : '#666', marginBottom: 5 }}>
              Lon: {triangulacaoResultado.longitude.toFixed(6)}°
            </Text>
            
            <Text style={{ fontSize: 13, color: darkMode ? '#D0D0D0' : '#666' }}>
              Erro: {triangulacaoResultado.erro.toFixed(2)}
            </Text>
          </View>
        )}

        {meteoDataDinamica && (
          <View style={{ 
            backgroundColor: darkMode ? '#1E1E1E' : '#e8f5e9', 
            padding: 15, 
            borderRadius: 10, 
            marginBottom: 15,
            elevation: 2
          }}>
            <Text style={{ 
              fontSize: 16, 
              fontWeight: 'bold', 
              color: darkMode ? '#E0E0E0' : '#666', 
              marginBottom: 10 
            }}>
               Condições Meteorológicas
            </Text>
            
            <Text style={{ fontSize: 13, color: darkMode ? '#D0D0D0' : '#666', marginBottom: 5 }}>
              Temperatura: {meteoDataDinamica.temp}°C
            </Text>
            
            <Text style={{ fontSize: 13, color: darkMode ? '#D0D0D0' : '#666', marginBottom: 5 }}>
              Vento: {meteoDataDinamica.windSpeed} km/h ({meteoDataDinamica.windDirection}°)
            </Text>
            
            <Text style={{ fontSize: 13, color: darkMode ? '#D0D0D0' : '#666' }}>
              Umidade: {meteoDataDinamica.humidity}%
            </Text>
          </View>
        )}
      </ScrollView>

      <TouchableOpacity
        style={{ 
          backgroundColor: '#ff6f00', 
          padding: 15, 
          borderRadius: 10, 
          alignItems: 'center', 
          marginHorizontal: 15,
          marginBottom: 10,
          elevation: 3
        }}
        onPress={handleShare}
      >
        <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 14 }}>
           Preparar Dados
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={{ 
          backgroundColor: '#8B5C2A', 
          padding: 15, 
          borderRadius: 10, 
          alignItems: 'center', 
          margin: 15,
          elevation: 3
        }}
        onPress={() => setPage(1)}
      >
        <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 14 }}>
           Voltar
        </Text>
      </TouchableOpacity>
    </View>
  );
}
