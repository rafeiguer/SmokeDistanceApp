import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';

export default function SettingsScreen({ darkMode, setDarkMode, setPage }) {
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
           Configurações
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
             Modo Escuro
          </Text>
          
          <TouchableOpacity
            style={{ 
              backgroundColor: '#8B5C2A', 
              padding: 12, 
              borderRadius: 10, 
              alignItems: 'center',
              elevation: 2
            }}
            onPress={() => setDarkMode(!darkMode)}
          >
            <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 14 }}>
              {darkMode ? ' Ativar Modo Claro' : ' Ativar Modo Escuro'}
            </Text>
          </TouchableOpacity>
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
             Sobre
          </Text>
          
          <Text style={{ color: darkMode ? '#D0D0D0' : '#666', marginBottom: 8, fontSize: 14 }}>
            SmokeDistance v1.0.0
          </Text>
          
          <Text style={{ color: darkMode ? '#D0D0D0' : '#666', fontSize: 14 }}>
            Detecção de Fumaça com IA e Triangulação
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
            ℹ Informações
          </Text>
          
          <Text style={{ color: darkMode ? '#D0D0D0' : '#666', marginBottom: 5, fontSize: 13 }}>
             Hooks Refatorados: 
          </Text>
          
          <Text style={{ color: darkMode ? '#D0D0D0' : '#666', marginBottom: 5, fontSize: 13 }}>
             Utils Modularizados: 
          </Text>
          
          <Text style={{ color: darkMode ? '#D0D0D0' : '#666', fontSize: 13 }}>
             Screens Componentizados: 
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
