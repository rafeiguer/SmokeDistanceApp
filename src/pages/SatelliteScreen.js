import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';

export default function SatelliteScreen({ location, setPage, darkMode }) {
  const satellites = [
    { id: 'sat-1', nome: 'Aqua (MODIS)', atualizacao: ' 6h', resolucao: '1km', focos: 0 },
    { id: 'sat-2', nome: 'Terra (MODIS)', atualizacao: ' 6h', resolucao: '1km', focos: 0 },
    { id: 'sat-3', nome: 'Suomi NPP (VIIRS)', atualizacao: ' 15min', resolucao: '375m', focos: 0 },
  ];

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
           Satélites
        </Text>
      </View>

      <ScrollView style={{ flex: 1, padding: 15 }}>
        {location && (
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
               Sua Localização
            </Text>
            
            <Text style={{ fontSize: 13, color: darkMode ? '#D0D0D0' : '#666', marginBottom: 5 }}>
              Lat: {location.latitude.toFixed(4)}°
            </Text>
            
            <Text style={{ fontSize: 13, color: darkMode ? '#D0D0D0' : '#666' }}>
              Lon: {location.longitude.toFixed(4)}°
            </Text>
          </View>
        )}

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
            marginBottom: 15 
          }}>
             Satélites Disponíveis
          </Text>

          {satellites.map((sat, idx) => (
            <View 
              key={sat.id} 
              style={{ 
                marginBottom: 15, 
                paddingBottom: 15,
                borderBottomWidth: idx < satellites.length - 1 ? 1 : 0,
                borderBottomColor: darkMode ? '#333' : '#ddd'
              }}
            >
              <Text style={{ 
                fontSize: 14, 
                fontWeight: 'bold', 
                color: darkMode ? '#64B5F6' : '#1976D2',
                marginBottom: 5
              }}>
                {sat.nome}
              </Text>
              
              <Text style={{ fontSize: 13, color: darkMode ? '#D0D0D0' : '#666', marginBottom: 3 }}>
                 Atualização: {sat.atualizacao}
              </Text>
              
              <Text style={{ fontSize: 13, color: darkMode ? '#D0D0D0' : '#666', marginBottom: 3 }}>
                 Resolução: {sat.resolucao}
              </Text>
              
              <Text style={{ fontSize: 13, color: darkMode ? '#D0D0D0' : '#666' }}>
                 Focos: {sat.focos}
              </Text>
            </View>
          ))}
        </View>

        <TouchableOpacity
          style={{ 
            backgroundColor: '#00AA00', 
            padding: 15, 
            borderRadius: 10, 
            alignItems: 'center',
            marginBottom: 10,
            elevation: 3
          }}
        >
          <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 14 }}>
             Carregar Dados
          </Text>
        </TouchableOpacity>
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
