// 🧠 SISTEMA DE TREINAMENTO DA IA
// Aprende com feedback do usuário para melhorar detecção

import AsyncStorage from '@react-native-async-storage/async-storage';

class AITrainer {
  static STORAGE_KEY = 'ai_training_data';
  
  /**
   * Salvar resultado de uma detecção para treinamento
   * @param {Object} detection - Dados da detecção
   * @param {boolean} wasCorrect - Se a detecção foi correta ou não
   */
  static async recordFeedback(detection, wasCorrect) {
    try {
      const trainingData = await this.getTrainingData();
      
      const feedback = {
        id: Date.now(),
        timestamp: new Date().toISOString(),
        detection: {
          confidence: detection.confidence,
          imagePattern: detection.imagePattern, // Tipo de imagem detectada
          pixels: detection.pixels
        },
        userFeedback: wasCorrect, // true = correto, false = falso positivo/negativo
        tags: [] // Tags: "fumaça", "parede", "céu", etc
      };
      
      trainingData.push(feedback);
      
      // Manter só os últimos 100 registros
      if (trainingData.length > 100) {
        trainingData.shift();
      }
      
      await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(trainingData));
      console.log('📚 Feedback registrado. Total de registros:', trainingData.length);
      
      return feedback;
    } catch (err) {
      console.error('❌ Erro ao registrar feedback:', err);
      return null;
    }
  }
  
  /**
   * Obter todos os dados de treinamento
   */
  static async getTrainingData() {
    try {
      const data = await AsyncStorage.getItem(this.STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (err) {
      console.error('❌ Erro ao carregar dados de treinamento:', err);
      return [];
    }
  }
  
  /**
   * Calcular estatísticas de precisão da IA
   */
  static async getAccuracy() {
    try {
      const trainingData = await this.getTrainingData();
      
      if (trainingData.length === 0) {
        return { total: 0, correct: 0, accuracy: 0 };
      }
      
      const correct = trainingData.filter(d => d.userFeedback === true).length;
      const accuracy = (correct / trainingData.length) * 100;
      
      return {
        total: trainingData.length,
        correct,
        accuracy: accuracy.toFixed(1)
      };
    } catch (err) {
      console.error('❌ Erro ao calcular precisão:', err);
      return { total: 0, correct: 0, accuracy: 0 };
    }
  }
  
  /**
   * Obter padrões mais comuns em detecções corretas
   */
  static async getSuccessPatterns() {
    try {
      const trainingData = await this.getTrainingData();
      
      const correctDetections = trainingData.filter(d => d.userFeedback === true);
      const patterns = {};
      
      correctDetections.forEach(d => {
        const pattern = d.detection.imagePattern;
        patterns[pattern] = (patterns[pattern] || 0) + 1;
      });
      
      console.log('✅ Padrões de sucesso:', patterns);
      return patterns;
    } catch (err) {
      console.error('❌ Erro ao analisar padrões:', err);
      return {};
    }
  }
  
  /**
   * Exportar dados de treinamento para análise
   */
  static async exportTrainingData() {
    try {
      const trainingData = await this.getTrainingData();
      const stats = await this.getAccuracy();
      const patterns = await this.getSuccessPatterns();
      
      const report = {
        exportDate: new Date().toISOString(),
        statistics: stats,
        successPatterns: patterns,
        totalRecords: trainingData.length,
        data: trainingData
      };
      
      console.log('📊 Relatório de treinamento:', JSON.stringify(report, null, 2));
      return report;
    } catch (err) {
      console.error('❌ Erro ao exportar dados:', err);
      return null;
    }
  }
  
  /**
   * Limpar dados de treinamento
   */
  static async clearTrainingData() {
    try {
      await AsyncStorage.removeItem(this.STORAGE_KEY);
      console.log('🗑️ Dados de treinamento removidos');
      return true;
    } catch (err) {
      console.error('❌ Erro ao limpar dados:', err);
      return false;
    }
  }
  
  /**
   * Sugerir ajustes nos limiares baseado em treinamento
   */
  static async suggestThresholdAdjustments() {
    try {
      const trainingData = await this.getTrainingData();
      
      if (trainingData.length < 10) {
        console.log('⚠️ Poucos dados para sugerir ajustes (mínimo 10)');
        return null;
      }
      
      // Analisar confiança média dos acertos vs erros
      const correctDetections = trainingData.filter(d => d.userFeedback === true);
      const incorrectDetections = trainingData.filter(d => d.userFeedback === false);
      
      const avgCorrect = correctDetections.reduce((sum, d) => sum + d.detection.confidence, 0) / correctDetections.length;
      const avgIncorrect = incorrectDetections.reduce((sum, d) => sum + d.detection.confidence, 0) / incorrectDetections.length;
      
      console.log('📊 Confiança média - Corretos:', avgCorrect.toFixed(2), 'Incorretos:', avgIncorrect.toFixed(2));
      
      // Sugerir novo limiar no meio
      const suggestedThreshold = ((avgCorrect + avgIncorrect) / 2).toFixed(2);
      
      return {
        currentThreshold: 0.60,
        suggestedThreshold: parseFloat(suggestedThreshold),
        improvement: Math.abs(avgCorrect - avgIncorrect).toFixed(2)
      };
    } catch (err) {
      console.error('❌ Erro ao sugerir ajustes:', err);
      return null;
    }
  }
}

export default AITrainer;
