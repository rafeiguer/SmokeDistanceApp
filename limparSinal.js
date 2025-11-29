// Script para limpar círculos e pings de sinal
const AsyncStorage = require('@react-native-async-storage/async-storage').default;

async function limpar() {
  try {
    await AsyncStorage.removeItem('circulos_sinal');
    console.log('✅ Círculos e pings de sinal limpos com sucesso!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Erro ao limpar:', err);
    process.exit(1);
  }
}

limpar();
