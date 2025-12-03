import AsyncStorage from '@react-native-async-storage/async-storage';

// Salvar focos no AsyncStorage
export async function salvarFocosStorage(focos) {
  try {
    await AsyncStorage.setItem('focos_salvos', JSON.stringify(focos));
    console.log('💾 Focos salvos no storage:', focos.length);
  } catch (err) {
    console.error('❌ Erro ao salvar focos:', err);
  }
}

// Carregar focos do AsyncStorage
export async function carregarFocosStorage() {
  try {
    const dados = await AsyncStorage.getItem('focos_salvos');
    if (dados) {
      const focos = JSON.parse(dados);
      console.log('📖 Focos carregados do storage:', focos.length);
      return focos;
    }
    return [];
  } catch (err) {
    console.error('❌ Erro ao carregar focos:', err);
    return [];
  }
}

// Exportar focos para JSON (para compartilhar)
export async function exportarFocosJSON(focos, localizacao) {
  try {
    const dataExporte = {
      timestamp: new Date().toISOString(),
      app: 'SmokeDistance v1.0.0',
      usuarioLocalizacao: {
        latitude: localizacao?.latitude || 0,
        longitude: localizacao?.longitude || 0,
        altitude: localizacao?.altitude || 0
      },
      focos: focos.map((foco, idx) => ({
        numero: idx + 1,
        observador: foco.observadorId,
        latitude: foco.latitude,
        longitude: foco.longitude,
        altitude: foco.altitude,
        distancia_metros: foco.distancia,
        heading: foco.heading,
        pitch: foco.pitch,
        timestamp: foco.timestamp
      })),
      totalFocos: focos.length,
      dataExportacao: new Date().toLocaleString('pt-BR')
    };

    const jsonString = JSON.stringify(dataExporte, null, 2);
    console.log('📤 JSON exportado:', jsonString);
    return jsonString;
  } catch (err) {
    console.error('❌ Erro ao exportar:', err);
    return null;
  }
}

// Preparar dados para envio externo
export async function prepararDadosParaEnvio(focos, localizacao) {
  try {
    const jsonString = await exportarFocosJSON(focos, localizacao);
    if (!jsonString) return null;
    return {
      arquivo: `focos_${Date.now()}.json`,
      conteudo: jsonString,
      totalFocos: focos.length,
      dataEnvio: new Date().toISOString()
    };
  } catch (err) {
    console.error('❌ Erro ao preparar:', err);
    return null;
  }
}
