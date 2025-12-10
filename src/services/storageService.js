// 💾 STORAGE SERVICE - AsyncStorage com tratamento de erros

import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Salva focos no storage persistente
 * @param {array} focos - Array de focos
 * @returns {Promise<boolean>}
 */
export async function salvarFocosStorage(focos) {
  try {
    await AsyncStorage.setItem('focos_salvos', JSON.stringify(focos));
    console.log('💾 Focos salvos no storage:', focos.length);
    return true;
  } catch (err) {
    console.error('❌ Erro ao salvar focos:', err);
    return false;
  }
}

/**
 * Carrega focos do storage
 * @returns {Promise<array>}
 */
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

/**
 * Salva breadcrumbs no storage
 * @param {array} breadcrumbs - Array de breadcrumbs
 * @returns {Promise<boolean>}
 */
export async function salvarBreadcrumbs(breadcrumbs) {
  try {
    if (breadcrumbs.length > 0) {
      await AsyncStorage.setItem('breadcrumbs', JSON.stringify(breadcrumbs));
      console.log('🍞 Breadcrumbs salvos:', breadcrumbs.length);
      return true;
    }
    return false;
  } catch (err) {
    console.error('❌ Erro ao salvar breadcrumbs:', err);
    return false;
  }
}

/**
 * Carrega breadcrumbs do storage
 * @returns {Promise<array>}
 */
export async function carregarBreadcrumbs() {
  try {
    const saved = await AsyncStorage.getItem('breadcrumbs');
    if (saved) {
      const data = JSON.parse(saved);
      console.log('🍞 Breadcrumbs carregados:', data.length);
      return data;
    }
    return [];
  } catch (err) {
    console.warn('⚠️ Erro ao carregar breadcrumbs:', err?.message);
    return [];
  }
}

/**
 * Salva círculos de cobertura de sinal
 * @param {array} circles - Array de círculos
 * @returns {Promise<boolean>}
 */
export async function salvarCirculosSinal(circles) {
  try {
    await AsyncStorage.setItem('circulos_sinal', JSON.stringify(circles));
    console.log('🔵 Círculos de sinal salvos:', circles.length);
    return true;
  } catch (err) {
    console.error('❌ Erro ao salvar círculos:', err);
    return false;
  }
}

/**
 * Carrega círculos de cobertura de sinal
 * @returns {Promise<array>}
 */
export async function carregarCirculosSinal() {
  try {
    const saved = await AsyncStorage.getItem('circulos_sinal');
    if (saved) {
      const arr = JSON.parse(saved);
      if (Array.isArray(arr)) {
        console.log('🔵 Círculos carregados:', arr.length);
        return arr;
      }
    }
    return [];
  } catch (e) {
    console.warn('⚠️ Erro ao carregar círculos:', e?.message);
    return [];
  }
}

/**
 * Salva preferências do usuário
 * @param {object} prefs - { darkMode, gpsMode, ... }
 * @returns {Promise<boolean>}
 */
export async function salvarPreferences(prefs) {
  try {
    await AsyncStorage.setItem('preferences', JSON.stringify(prefs));
    console.log('⚙️ Preferências salvas');
    return true;
  } catch (err) {
    console.error('❌ Erro ao salvar preferências:', err);
    return false;
  }
}

/**
 * Carrega preferências do usuário
 * @returns {Promise<object>}
 */
export async function carregarPreferences() {
  try {
    const saved = await AsyncStorage.getItem('preferences');
    if (saved) {
      return JSON.parse(saved);
    }
    return {};
  } catch (err) {
    console.error('❌ Erro ao carregar preferências:', err);
    return {};
  }
}

/**
 * Salva um valor específico de preferência
 * @param {string} key - Chave
 * @param {string} value - Valor
 * @returns {Promise<boolean>}
 */
export async function salvarPreference(key, value) {
  try {
    const prefs = await carregarPreferences();
    prefs[key] = value;
    return salvarPreferences(prefs);
  } catch (err) {
    console.error('❌ Erro ao salvar preferência:', err);
    return false;
  }
}

/**
 * Carrega um valor específico de preferência
 * @param {string} key - Chave
 * @param {*} defaultValue - Valor padrão
 * @returns {Promise<*>}
 */
export async function carregarPreference(key, defaultValue = null) {
  try {
    const prefs = await carregarPreferences();
    return prefs[key] ?? defaultValue;
  } catch (err) {
    console.error('❌ Erro ao carregar preferência:', err);
    return defaultValue;
  }
}

/**
 * Salva pings pendentes para Firestore
 * @param {array} pings - Array de pings
 * @returns {Promise<boolean>}
 */
export async function salvarPendingPings(pings) {
  try {
    const key = 'pending_pings';
    await AsyncStorage.setItem(key, JSON.stringify(pings));
    console.log('📤 Pings pendentes salvos:', pings.length);
    return true;
  } catch (err) {
    console.error('❌ Erro ao salvar pings:', err);
    return false;
  }
}

/**
 * Carrega pings pendentes
 * @returns {Promise<array>}
 */
export async function carregarPendingPings() {
  try {
    const key = 'pending_pings';
    const raw = await AsyncStorage.getItem(key);
    const arr = raw ? JSON.parse(raw) : [];
    return arr;
  } catch (err) {
    console.error('❌ Erro ao carregar pings:', err);
    return [];
  }
}

/**
 * Enfileira um ping para enviar depois
 * @param {object} ping - Dados do ping
 * @returns {Promise<boolean>}
 */
export async function enqueuePing(ping) {
  try {
    const arr = await carregarPendingPings();
    arr.push(ping);
    return salvarPendingPings(arr);
  } catch (err) {
    console.error('❌ Erro ao enfileirar ping:', err);
    return false;
  }
}

/**
 * Remove um ping da fila
 * @param {string} pingId - ID do ping
 * @returns {Promise<boolean>}
 */
export async function removePingFromQueue(pingId) {
  try {
    const arr = await carregarPendingPings();
    const filtered = arr.filter(p => p.id !== pingId);
    return salvarPendingPings(filtered);
  } catch (err) {
    console.error('❌ Erro ao remover ping:', err);
    return false;
  }
}

/**
 * Limpa toda a fila de pings
 * @returns {Promise<boolean>}
 */
export async function clearPingQueue() {
  try {
    await AsyncStorage.setItem('pending_pings', JSON.stringify([]));
    console.log('🗑️ Fila de pings limpada');
    return true;
  } catch (err) {
    console.error('❌ Erro ao limpar fila:', err);
    return false;
  }
}

/**
 * Salva offsets de bussola de calibração
 * @param {object} offsets - { offsetX, offsetY, offsetZ, timestamp }
 * @returns {Promise<boolean>}
 */
export async function salvarCompassOffsets(offsets) {
  try {
    await AsyncStorage.setItem('compassOffsets', JSON.stringify(offsets));
    console.log('🧭 Offsets de bussola salvos');
    return true;
  } catch (err) {
    console.error('❌ Erro ao salvar offsets:', err);
    return false;
  }
}

/**
 * Carrega offsets de bussola
 * @returns {Promise<object|null>}
 */
export async function carregarCompassOffsets() {
  try {
    const saved = await AsyncStorage.getItem('compassOffsets');
    if (saved) {
      return JSON.parse(saved);
    }
    return null;
  } catch (err) {
    console.warn('⚠️ Erro ao carregar offsets:', err);
    return null;
  }
}

/**
 * Limpa toda a storage (usar com cuidado!)
 * @returns {Promise<boolean>}
 */
export async function clearAllStorage() {
  try {
    await AsyncStorage.clear();
    console.log('🗑️ Toda a storage foi limpada');
    return true;
  } catch (err) {
    console.error('❌ Erro ao limpar storage:', err);
    return false;
  }
}

/**
 * Remove uma chave específica da storage
 * @param {string} key - Chave a remover
 * @returns {Promise<boolean>}
 */
export async function removeFromStorage(key) {
  try {
    await AsyncStorage.removeItem(key);
    console.log(`🗑️ Removido: ${key}`);
    return true;
  } catch (err) {
    console.error('❌ Erro ao remover:', err);
    return false;
  }
}

export default {
  salvarFocosStorage,
  carregarFocosStorage,
  salvarBreadcrumbs,
  carregarBreadcrumbs,
  salvarCirculosSinal,
  carregarCirculosSinal,
  salvarPreferences,
  carregarPreferences,
  salvarPreference,
  carregarPreference,
  salvarPendingPings,
  carregarPendingPings,
  enqueuePing,
  removePingFromQueue,
  clearPingQueue,
  salvarCompassOffsets,
  carregarCompassOffsets,
  clearAllStorage,
  removeFromStorage,
};