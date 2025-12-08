import AsyncStorage from '@react-native-async-storage/async-storage';

// 💾 FOCOS - Salvar
export async function salvarFocosStorage(focos) {
  try {
    await AsyncStorage.setItem('focos_salvos', JSON.stringify(focos));
    console.log('💾 Focos salvos no storage:', focos.length);
  } catch (err) {
    console.error('❌ Erro ao salvar focos:', err);
  }
}

// 📖 FOCOS - Carregar
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

// 📤 FOCOS - Exportar como JSON
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

// 📍 CÍRCULOS DE COBERTURA - Salvar
export async function salvarCoverageCircles(circles) {
  try {
    await AsyncStorage.setItem('circulos_sinal', JSON.stringify(circles));
    console.log('💾 Círculos salvos:', circles.length);
  } catch (err) {
    console.error('❌ Erro ao salvar círculos:', err);
  }
}

// 📍 CÍRCULOS DE COBERTURA - Carregar
export async function carregarCoverageCircles() {
  try {
    const saved = await AsyncStorage.getItem('circulos_sinal');
    if (saved) {
      const arr = JSON.parse(saved);
      return Array.isArray(arr) ? arr : [];
    }
    return [];
  } catch (err) {
    console.error('❌ Erro ao carregar círculos:', err);
    return [];
  }
}

// 🍞 BREADCRUMBS - Salvar
export async function salvarBreadcrumbs(breadcrumbs) {
  try {
    if (breadcrumbs.length > 0) {
      await AsyncStorage.setItem('breadcrumbs', JSON.stringify(breadcrumbs));
      console.log('💾 Breadcrumbs salvos:', breadcrumbs.length);
    }
  } catch (err) {
    console.error('❌ Erro ao salvar breadcrumbs:', err);
  }
}

// 🍞 BREADCRUMBS - Carregar
export async function carregarBreadcrumbs() {
  try {
    const saved = await AsyncStorage.getItem('breadcrumbs');
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (err) {
    console.error('❌ Erro ao carregar breadcrumbs:', err);
  }
  return [];
}

// 🔒 PREFERÊNCIAS - Salvar
export async function salvarPreferencias(darkMode, gpsMode) {
  try {
    await AsyncStorage.setItem('pref_dark_mode', darkMode ? '1' : '0');
    await AsyncStorage.setItem('pref_gps_mode', gpsMode);
    console.log('💾 Preferências salvas');
  } catch (err) {
    console.error('❌ Erro ao salvar preferências:', err);
  }
}

// 🔒 PREFERÊNCIAS - Carregar
export async function carregarPreferencias() {
  try {
    const darkMode = (await AsyncStorage.getItem('pref_dark_mode')) === '1';
    const gpsMode = await AsyncStorage.getItem('pref_gps_mode') || 'normal';
    return { darkMode, gpsMode };
  } catch (err) {
    console.error('❌ Erro ao carregar preferências:', err);
    return { darkMode: false, gpsMode: 'normal' };
  }
}

// 📡 PINGS PENDENTES - Enfileirar
export async function enqueuePing(ping) {
  try {
    const key = 'pending_pings';
    const raw = await AsyncStorage.getItem(key);
    const arr = raw ? JSON.parse(raw) : [];
    arr.push(ping);
    await AsyncStorage.setItem(key, JSON.stringify(arr));
    console.log('📡 Ping enfileirado');
  } catch (err) {
    console.error('❌ Erro ao enfileirar ping:', err);
  }
}

// 📡 PINGS PENDENTES - Obter
export async function getPendingPings() {
  try {
    const key = 'pending_pings';
    const raw = await AsyncStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.error('❌ Erro ao obter pings:', err);
    return [];
  }
}

// 📡 PINGS PENDENTES - Limpar processados
export async function clearProcessedPings(indices) {
  try {
    const key = 'pending_pings';
    const raw = await AsyncStorage.getItem(key);
    let arr = raw ? JSON.parse(raw) : [];
    
    // Remove índices em ordem reversa
    arr = arr.filter((_, i) => !indices.includes(i));
    
    await AsyncStorage.setItem(key, JSON.stringify(arr));
    console.log('📡 Pings processados removidos');
  } catch (err) {
    console.error('❌ Erro ao limpar pings:', err);
  }
}

// 🧭 BUSSOLA - Salvar offsets de calibração
export async function salvarCompassOffsets(offsetX, offsetY, offsetZ) {
  try {
    await AsyncStorage.setItem('compassOffsets', JSON.stringify({
      offsetX,
      offsetY,
      offsetZ,
      timestamp: Date.now()
    }));
    console.log('💾 Offsets de bussola salvos');
  } catch (err) {
    console.error('❌ Erro ao salvar offsets:', err);
  }
}

// 🧭 BUSSOLA - Carregar offsets de calibração
export async function carregarCompassOffsets() {
  try {
    const saved = await AsyncStorage.getItem('compassOffsets');
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (err) {
    console.error('❌ Erro ao carregar offsets:', err);
  }
  return { offsetX: 0, offsetY: 0, offsetZ: 0, timestamp: null };
}