// 🔥 FIREBASE SERVICE - Firestore Pings e Sync

import { getDb } from '../firebase';

/**
 * Envia um ping para Firestore
 * @param {object} ping - Dados do ping
 * @returns {Promise<boolean>}
 */
export async function sendPingToFirestore(ping) {
  try {
    const db = getDb();
    if (!db) {
      console.warn('⚠️ Firestore não configurado');
      return false;
    }
    
    const { addDoc, collection, serverTimestamp } = require('firebase/firestore');
    
    await addDoc(collection(db, 'pings'), {
      latitude: ping.latitude || 0,
      longitude: ping.longitude || 0,
      altitude: ping.altitude || 0,
      heading: ping.heading || 0,
      pitch: ping.pitch || 0,
      distancia: ping.distancia || 0,
      timestampLocal: ping.timestamp || new Date().toLocaleTimeString('pt-BR'),
      createdAt: serverTimestamp(),
    });
    
    console.log('✅ Ping enviado para Firestore');
    return true;
  } catch (e) {
    console.error('❌ Erro ao enviar ping:', e?.message);
    return false;
  }
}

/**
 * Drena fila de pings pendentes ao reconectar
 * @param {array} pendingPings - Array de pings pendentes
 * @returns {Promise<array>} Pings que ainda não foram enviados
 */
export async function syncPendingPings(pendingPings) {
  try {
    if (!Array.isArray(pendingPings) || pendingPings.length === 0) {
      console.log('📭 Nenhum ping pendente para sincronizar');
      return [];
    }
    
    console.log(`📤 Sincronizando ${pendingPings.length} pings pendentes...`);
    
    const kept = [];
    
    for (const p of pendingPings) {
      const ok = await sendPingToFirestore(p);
      if (!ok) {
        kept.push(p); // Manter na fila se falhou
      }
    }
    
    if (kept.length === 0) {
      console.log(`✅ Todos os pings foram sincronizados!`);
    } else {
      console.log(`⚠️ ${kept.length} pings ainda pendentes`);
    }
    
    return kept;
  } catch (err) {
    console.error('❌ Erro ao sincronizar pings:', err);
    return pendingPings; // Retornar lista intacta em caso de erro
  }
}

/**
 * Subscreve a atualizações de pings comunitários
 * @param {function} onUpdate - Callback quando pings mudam
 * @returns {function} Unsubscribe
 */
export function subscribeToCommunityPings(onUpdate) {
  try {
    const db = getDb();
    if (!db) {
      console.warn('⚠️ Firestore não configurado');
      return () => {};
    }
    
    const { collection, query, orderBy, limit, onSnapshot } = require('firebase/firestore');
    
    const q = query(
      collection(db, 'pings'),
      orderBy('createdAt', 'desc'),
      limit(200)
    );
    
    const unsub = onSnapshot(q, (snap) => {
      const list = [];
      snap.forEach((doc) => {
        const d = doc.data();
        if (!d || typeof d.latitude !== 'number' || typeof d.longitude !== 'number') {
          return;
        }
        list.push({ id: doc.id, ...d });
      });
      onUpdate(list);
    });
    
    console.log('📡 Inscrito em pings comunitários');
    return () => {
      unsub && unsub();
      console.log('📡 Desinscrito de pings comunitários');
    };
  } catch (err) {
    console.error('❌ Erro ao inscrever em pings:', err);
    return () => {};
  }
}

/**
 * Obtém um ping específico
 * @param {string} pingId - ID do ping
 * @returns {Promise<object|null>}
 */
export async function getPing(pingId) {
  try {
    const db = getDb();
    if (!db) return null;
    
    const { doc, getDoc } = require('firebase/firestore');
    const docRef = doc(db, 'pings', pingId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() };
    }
    return null;
  } catch (err) {
    console.error('❌ Erro ao obter ping:', err);
    return null;
  }
}

/**
 * Deleta um ping do Firestore
 * @param {string} pingId - ID do ping
 * @returns {Promise<boolean>}
 */
export async function deletePing(pingId) {
  try {
    const db = getDb();
    if (!db) return false;
    
    const { doc, deleteDoc } = require('firebase/firestore');
    await deleteDoc(doc(db, 'pings', pingId));
    
    console.log(`✅ Ping ${pingId} deletado`);
    return true;
  } catch (err) {
    console.error('❌ Erro ao deletar ping:', err);
    return false;
  }
}

/**
 * Obtém estatísticas de pings por dia
 * @returns {Promise<array>}
 */
export async function getPingStatistics() {
  try {
    const db = getDb();
    if (!db) return [];
    
    const { collection, query, orderBy, limit, getDocs } = require('firebase/firestore');
    
    const q = query(
      collection(db, 'pings'),
      orderBy('createdAt', 'desc'),
      limit(1000)
    );
    
    const snap = await getDocs(q);
    
    // Agrupar por dia
    const byDay = {};
    snap.forEach((doc) => {
      const d = doc.data();
      if (d.createdAt) {
        const date = new Date(d.createdAt.toDate()).toLocaleDateString('pt-BR');
        byDay[date] = (byDay[date] || 0) + 1;
      }
    });
    
    return Object.entries(byDay).map(([date, count]) => ({ date, count }));
  } catch (err) {
    console.error('❌ Erro ao obter estatísticas:', err);
    return [];
  }
}

export default {
  sendPingToFirestore,
  syncPendingPings,
  subscribeToCommunityPings,
  getPing,
  deletePing,
  getPingStatistics,
};