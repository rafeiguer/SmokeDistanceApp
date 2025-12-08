import { useEffect, useRef, useState } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { getPendingPings, clearProcessedPings } from '../utils/storage';
import { getDb } from '../firebase';

export function useNetwork() {
  const [isConnected, setIsConnected] = useState(false);
  const [networkMarker, setNetworkMarker] = useState(null);
  const [communityPings, setCommunityPings] = useState([]);
  const [showCommunityPings, setShowCommunityPings] = useState(false);

  const lastIsConnectedRef = useRef(null);

  // 📡 Listener de rede estável
  useEffect(() => {
    try {
      const unsubscribe = NetInfo.addEventListener((state) => {
        try {
          if (state.isConnected !== lastIsConnectedRef.current) {
            console.log('📡 Status Rede:', state.isConnected ? 'Conectado' : 'Desconectado', state.type);
          }

          setIsConnected(state.isConnected);
          lastIsConnectedRef.current = state.isConnected;
        } catch (err) {
          console.warn('⚠️ Erro ao processar estado de rede:', err.message);
        }
      });

      return () => {
        try {
          unsubscribe && unsubscribe();
        } catch {}
      };
    } catch (err) {
      console.warn('⚠️ Erro ao iniciar monitoramento de rede:', err.message);
    }
  }, []);

  // 📡 Enviar ping ao Firestore
  const sendPingToFirestore = async (p) => {
    try {
      const db = getDb();
      if (!db) return false;

      const { addDoc, collection, serverTimestamp } = require('firebase/firestore');
      await addDoc(collection(db, 'pings'), {
        latitude: p.latitude,
        longitude: p.longitude,
        altitude: p.altitude || 0,
        heading: p.heading || 0,
        pitch: p.pitch || 0,
        distancia: p.distancia || 0,
        timestampLocal: p.timestamp || new Date().toLocaleTimeString('pt-BR'),
        createdAt: serverTimestamp(),
      });
      return true;
    } catch (e) {
      console.warn('⚠️ Erro ao enviar ping:', e.message);
      return false;
    }
  };

  // 📡 Drenar fila pendente ao reconectar
  const syncPendingPings = async () => {
    try {
      const arr = await getPendingPings();
      if (!arr.length) {
        console.log('📡 Nenhum ping pendente');
        return;
      }

      console.log(`📡 Sincronizndo ${arr.length} pings pendentes...`);

      const kept = [];
      const processedIndices = [];

      for (let i = 0; i < arr.length; i++) {
        const p = arr[i];
        const ok = await sendPingToFirestore(p);
        if (ok) {
          processedIndices.push(i);
          console.log(`✅ Ping ${i + 1}/${arr.length} sincronizado`);
        } else {
          kept.push(p);
          console.log(`⚠️ Ping ${i + 1}/${arr.length} não foi sincronizado, mantendo na fila`);
        }
      }

      await clearProcessedPings(processedIndices);
      console.log(`✅ Sincronização concluída: ${processedIndices.length} sincronizados, ${kept.length} mantidos na fila`);
    } catch (err) {
      console.error('❌ Erro ao sincronizar pings:', err);
    }
  };

  // 👥 Assinar pings recentes (filtra por bbox no cliente)
  useEffect(() => {
    if (!showCommunityPings) return;

    const db = getDb();
    if (!db) {
      console.warn('⚠️ Firebase não configurado');
      return;
    }

    try {
      const { collection, query, orderBy, limit, onSnapshot } = require('firebase/firestore');
      const q = query(collection(db, 'pings'), orderBy('createdAt', 'desc'), limit(200));

      const unsub = onSnapshot(
        q,
        (snap) => {
          const list = [];
          snap.forEach((doc) => {
            const d = doc.data();
            if (!d || typeof d.latitude !== 'number' || typeof d.longitude !== 'number') return;
            list.push({ id: doc.id, ...d });
          });
          setCommunityPings(list);
          console.log(`👥 ${list.length} pings da comunidade carregados`);
        },
        (error) => {
          console.warn('⚠️ Erro ao escutar pings:', error.message);
        }
      );

      return () => {
        try {
          unsub && unsub();
        } catch {}
      };
    } catch (err) {
      console.warn('⚠️ Erro ao configurar listener de pings:', err.message);
    }
  }, [showCommunityPings]);

  // 📡 Sincronizar quando conectar
  useEffect(() => {
    if (isConnected && lastIsConnectedRef.current === false) {
      console.log('🟢 Rede restaurada! Sincronizando pings...');
      syncPendingPings();
    }
    lastIsConnectedRef.current = isConnected;
  }, [isConnected]);

  // 📡 Atualizar marcador de rede
  const updateNetworkMarker = (location, focos, waypointTemporario) => {
    const temFocoMarcado = (focos?.length || 0) > 0 || waypointTemporario;

    if (isConnected && location && temFocoMarcado) {
      setNetworkMarker({
        latitude: location.latitude,
        longitude: location.longitude,
        title: `📡 Sinal de Rede: ${state?.type || 'desconhecido'}`,
        description: `Rede conectada!\nLat: ${location.latitude.toFixed(4)}\nLon: ${location.longitude.toFixed(4)}`
      });
    } else {
      setNetworkMarker(null);
    }
  };

  return {
    isConnected,
    networkMarker,
    setNetworkMarker,
    communityPings,
    showCommunityPings,
    setShowCommunityPings,
    syncPendingPings,
    sendPingToFirestore,
    updateNetworkMarker,
  };
}
