import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Alert, StyleSheet, ScrollView } from 'react-native';
import AITrainer from './AITrainer';

// 🧠 PAINEL DE TREINAMENTO DA IA
const AITrainingPanel = ({ isVisible, onClose }) => {
  const [stats, setStats] = useState(null);
  const [patterns, setPatterns] = useState(null);
  const [suggestions, setSuggestions] = useState(null);

  useEffect(() => {
    if (isVisible) {
      loadStats();
    }
  }, [isVisible]);

  const loadStats = async () => {
    const accuracy = await AITrainer.getAccuracy();
    const patt = await AITrainer.getSuccessPatterns();
    const sugg = await AITrainer.suggestThresholdAdjustments();
    
    setStats(accuracy);
    setPatterns(patt);
    setSuggestions(sugg);
  };

  const handleClearData = () => {
    Alert.alert(
      '⚠️ Confirmar',
      'Remover todos os dados de treinamento?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Remover',
          onPress: async () => {
            await AITrainer.clearTrainingData();
            setStats(null);
            setPatterns(null);
            Alert.alert('✅ Dados removidos!');
            loadStats();
          }
        }
      ]
    );
  };

  const handleExportData = async () => {
    const report = await AITrainer.exportTrainingData();
    if (report) {
      Alert.alert('📊 Relatório gerado', `Total de registros: ${report.totalRecords}\nPrecisão: ${report.statistics.accuracy}%`);
    }
  };

  if (!isVisible) return null;

  return (
    <View style={styles.container}>
      <ScrollView style={styles.panel}>
        <View style={styles.header}>
          <Text style={styles.title}>🧠 PAINEL DE TREINAMENTO DA IA</Text>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.closeBtn}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* ESTATÍSTICAS */}
        {stats && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📊 ESTATÍSTICAS</Text>
            <View style={styles.stat}>
              <Text style={styles.statLabel}>Total de Registros:</Text>
              <Text style={styles.statValue}>{stats.total}</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statLabel}>Acertos:</Text>
              <Text style={styles.statValue}>{stats.correct}</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statLabel}>Precisão:</Text>
              <Text style={[styles.statValue, { color: stats.accuracy > 80 ? '#4CAF50' : '#FFC107' }]}>
                {stats.accuracy}%
              </Text>
            </View>
          </View>
        )}

        {/* PADRÕES DE SUCESSO */}
        {patterns && Object.keys(patterns).length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>✅ PADRÕES DE SUCESSO</Text>
            {Object.entries(patterns).map(([pattern, count]) => (
              <View key={pattern} style={styles.pattern}>
                <Text style={styles.patternName}>{pattern}</Text>
                <Text style={styles.patternCount}>{count}x</Text>
              </View>
            ))}
          </View>
        )}

        {/* SUGESTÕES */}
        {suggestions && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>💡 SUGESTÕES</Text>
            <View style={styles.suggestion}>
              <Text style={styles.suggestionText}>
                Limiar atual: <Text style={styles.bold}>{suggestions.currentThreshold}</Text>
              </Text>
              <Text style={styles.suggestionText}>
                Sugerido: <Text style={styles.bold}>{suggestions.suggestedThreshold}</Text>
              </Text>
              <Text style={styles.suggestionText}>
                Melhoria: <Text style={styles.bold}>{suggestions.improvement}</Text>
              </Text>
            </View>
          </View>
        )}

        {/* BOTÕES DE AÇÃO */}
        <View style={styles.actions}>
          <TouchableOpacity style={styles.btnPrimary} onPress={loadStats}>
            <Text style={styles.btnText}>🔄 Recarregar</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.btnSecondary} onPress={handleExportData}>
            <Text style={styles.btnText}>📤 Exportar</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.btnDanger} onPress={handleClearData}>
            <Text style={styles.btnText}>🗑️ Limpar</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Treine a IA marcando se cada detecção foi correta ou não. Isso ajuda a melhorar a precisão! 🚀
          </Text>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
    zIndex: 1000
  },
  panel: {
    backgroundColor: '#1E1E1E',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '80%',
    padding: 16
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#444'
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4CAF50'
  },
  closeBtn: {
    fontSize: 24,
    color: '#AAA'
  },
  section: {
    marginBottom: 16,
    backgroundColor: '#2A2A2A',
    borderRadius: 8,
    padding: 12
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 10
  },
  stat: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#444'
  },
  statLabel: {
    color: '#AAA',
    fontSize: 12
  },
  statValue: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: 'bold'
  },
  pattern: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#444'
  },
  patternName: {
    color: '#FFF',
    fontSize: 12
  },
  patternCount: {
    color: '#4CAF50',
    fontWeight: 'bold'
  },
  suggestion: {
    backgroundColor: '#333',
    borderLeftWidth: 3,
    borderLeftColor: '#FFC107',
    padding: 10,
    borderRadius: 4
  },
  suggestionText: {
    color: '#FFF',
    fontSize: 12,
    marginBottom: 6
  },
  bold: {
    fontWeight: 'bold',
    color: '#FFC107'
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 16,
    marginBottom: 12
  },
  btnPrimary: {
    flex: 1,
    backgroundColor: '#4CAF50',
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: 'center'
  },
  btnSecondary: {
    flex: 1,
    backgroundColor: '#2196F3',
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: 'center'
  },
  btnDanger: {
    flex: 1,
    backgroundColor: '#F44336',
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: 'center'
  },
  btnText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold'
  },
  footer: {
    backgroundColor: '#2A2A2A',
    padding: 10,
    borderRadius: 6,
    marginTop: 8
  },
  footerText: {
    color: '#AAA',
    fontSize: 11,
    fontStyle: 'italic'
  }
});

export default AITrainingPanel;
