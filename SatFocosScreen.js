// SatFocosScreen.js
import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, ActivityIndicator, StyleSheet } from 'react-native';
import { buscarFocosSatelite } from './services/satelite';

export default function SatFocosScreen({ latitude, longitude }) {
  const [dados, setDados] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      const result = await buscarFocosSatelite({ latitude, longitude });
      setDados(result);
      setLoading(false);
    }
    fetchData();
  }, [latitude, longitude]);

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Focos Satelitais</Text>
      {loading ? (
        <ActivityIndicator size="large" color="#e53935" />
      ) : (
        dados.map((sat, idx) => (
          <View key={sat.satelite + idx} style={styles.satBlock}>
            <Text style={styles.satTitle}>{sat.satelite}</Text>
            {sat.focos.length > 0 ? (
              sat.focos.map((foco, i) => (
                <View key={i} style={styles.focoItem}>
                  <Text>Lat: {foco.latitude || foco.lat}</Text>
                  <Text>Lon: {foco.longitude || foco.lon}</Text>
                  <Text>Data: {foco.data || foco.date || foco.timestamp}</Text>
                  <Text>Intensidade: {foco.intensidade || foco.intensity || foco.frp}</Text>
                </View>
              ))
            ) : (
              <Text style={styles.semFocos}>Nenhum foco encontrado ou erro: {sat.erro || '---'}</Text>
            )}
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 16 },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 16, color: '#e53935' },
  satBlock: { marginBottom: 24, padding: 12, backgroundColor: '#f9f9f9', borderRadius: 8 },
  satTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 8 },
  focoItem: { marginBottom: 8, padding: 8, backgroundColor: '#ffeaea', borderRadius: 6 },
  semFocos: { color: '#888', fontStyle: 'italic' }
});
