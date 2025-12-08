import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';

export default function PropagationScreen({ setPage, darkMode }) {
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
           Propagação
        </Text>
      </View>

      <ScrollView style={{ flex: 1, padding: 15 }}>
        <View style={{ 
          backgroundColor: darkMode ? '#1E1E1E' : '#e8f5e9', 
          padding: 15, 
          borderRadius: 10, 
          marginBottom: 15,
          borderLeftWidth: 4,
          borderLeftColor: '#FF9800',
          elevation: 2
        }}>
          <Text style={{ 
            fontSize: 16, 
            fontWeight: 'bold', 
            color: darkMode ? '#FFB74D' : '#F57C00', 
            marginBottom: 10 
          }}>
             Em Desenvolvimento
          </Text>
          
          <Text style={{ fontSize: 14, color: darkMode ? '#D0D0D0' : '#666', marginBottom: 10 }}>
            Esta tela será utilizada para visualizar e analisar:
          </Text>

          <Text style={{ fontSize: 13, color: darkMode ? '#D0D0D0' : '#666', marginBottom: 5 }}>
              Direção e velocidade do vento
          </Text>

          <Text style={{ fontSize: 13, color: darkMode ? '#D0D0D0' : '#666', marginBottom: 5 }}>
              Propagação da fumaça
          </Text>

          <Text style={{ fontSize: 13, color: darkMode ? '#D0D0D0' : '#666', marginBottom: 5 }}>
              Modelos de dispersão
          </Text>

          <Text style={{ fontSize: 13, color: darkMode ? '#D0D0D0' : '#666' }}>
              Mapa de risco
          </Text>
        </View>

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
             Funcionalidades Planejadas
          </Text>

          <Text style={{ fontSize: 13, color: darkMode ? '#D0D0D0' : '#666', marginBottom: 5 }}>
             Integração com dados meteorológicos reais
          </Text>

          <Text style={{ fontSize: 13, color: darkMode ? '#D0D0D0' : '#666', marginBottom: 5 }}>
             Simulação de propagação 3D
          </Text>

          <Text style={{ fontSize: 13, color: darkMode ? '#D0D0D0' : '#666', marginBottom: 5 }}>
             Análise de risco por zona
          </Text>

          <Text style={{ fontSize: 13, color: darkMode ? '#D0D0D0' : '#666' }}>
             Alertas de propagação em tempo real
          </Text>
        </View>

        <View style={{ 
          backgroundColor: darkMode ? '#1E1E1E' : '#e8f5e9', 
          padding: 15, 
          borderRadius: 10,
          elevation: 2
        }}>
          <Text style={{ 
            fontSize: 16, 
            fontWeight: 'bold', 
            color: darkMode ? '#E0E0E0' : '#666', 
            marginBottom: 10 
          }}>
             Status
          </Text>

          <Text style={{ fontSize: 13, color: darkMode ? '#D0D0D0' : '#666' }}>
            Desenvolvimento: 15% - Prototipagem inicial
          </Text>
        </View>
      </ScrollView>

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
