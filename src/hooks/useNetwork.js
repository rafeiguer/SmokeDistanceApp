// 🌐 HOOK useNetwork - Conectividade + Coverage Circles

import { useState, useEffect, useRef } from 'react';
import NetInfo from '@react-native-community/netinfo';
import * as Location from 'expo-location';
import { salvarCirculosSinal, carregarCirculosSinal } from '../services/storageService';
import { calculateDistanceHaversine } from '../utils/calculations';
import { MIN_RADIUS_FOR_CIRCLE } from '../constants';

export function useNetwork(location) {
  const [isConnected, setIsConnected] = useState(false);
  const [networkMarker, setNetworkMarker] = useState(null);
  const [coverageCircles, setCoverageCircles] = useState([]);
  const [lastKnownLocationBeforeDisconnect, setLastKnownLocationBeforeDisconnect] = useState(null);
  const [disconnectTime, setDisconnectTime] = useState(null);
  const [coverageCenter, setCoverageCenter] = useState(null);
  
  const lastIsConnectedRef = useRef(null);
  const locationRef = useRef(location);
  const coverageCirclesRef = useRef([]);

  // Sync refs
  useEffect(() => {
    locationRef.current = location;
  }, [location]);

  useEffect(() => {
    coverageCirclesRef.current = coverageCircles;
  }, [coverageCircles]);

  // 💾 Carregar círculos salvos ao iniciar
  useEffect(() => {
    (async () => {
      try {
        const saved = await carregarCirculosSinal();
        if (Array.isArray(saved) && saved.length > 0) {
          setCoverageCircles(saved);
        }
      } catch (e) {
        console.warn('⚠️ Erro ao carregar círculos:', e?.message);
      }
    })();
  }, []);

  // 🌍 Monitorar conexão de rede
  useEffect(() => {
    try {
      const unsubscribe = NetInfo.addEventListener(state => {
        const loc = locationRef.current;
        
        // Detectar desconexão
        if (lastIsConnectedRef.current === true && state.isConnected === false && loc) {
          console.log('🔴 Rede caiu! Congelando localização...');
          setLastKnownLocationBeforeDisconnect(loc);
          setDisconnectTime(Date.now());
          setCoverageCenter(loc);
          
          // Tentar adicionar círculo de cobertura
          (async () => {
            try {
              const center = loc;
              const edge = loc; // Usar mesmo ponto para calcular raio minimalista
              await addCoverageCircleIfValid(center, edge);
            } finally {
              setCoverageCenter(null);
            }
          })();
        }
        
        // Detectar reconexão
        if (lastIsConnectedRef.current === false && state.isConnected === true) {
          if (disconnectTime) {
            console.log('🟢 Rede restaurada!');
            setLastKnownLocationBeforeDisconnect(null);
            setDisconnectTime(null);
            if (loc) setCoverageCenter(loc);
          }
        }
        
        setIsConnected(state.isConnected);
        lastIsConnectedRef.current = state.isConnected;
        
        // Atualizar marcador de sinal de rede
        if (state.isConnected && loc) {
          setNetworkMarker({
            latitude: loc.latitude,
            longitude: loc.longitude,
            title: `📡 Sinal de Rede: ${state.type}`,
            description: `Rede conectada!\nTipo: ${state.type}`
          });
        }
      });
      
      return () => {
        try {
          unsubscribe && unsubscribe();
        } catch (e) {
          console.warn('⚠️ Erro ao desinscrever:', e);
        }
      };
    } catch (err) {
      console.warn('⚠️ Erro ao iniciar monitoramento:', err.message);
    }
  }, [disconnectTime]);

  /**
   * Verifica se é área urbana (para não poluir com círculos)
   */
  async function shouldSkipCircle(edge) {
    try {
      if (!edge || !isConnected) return false;
      
      const res = await Location.reverseGeocodeAsync({
        latitude: edge.latitude,
        longitude: edge.longitude,
      });
      
      const info = res && res[0];
      if (!info) return false;
      
      // Se tiver city/street/district, é urbano
      if (info.city || info.subregion || info.district || info.street || info.name) {
        return true;
      }
      return false;
    } catch (e) {
      return false;
    }
  }

  /**
   * Adiciona círculo de cobertura se válido
   */
  async function addCoverageCircleIfValid(center, edge) {
    if (!center || !edge) return;
    
    const radius = calculateDistanceHaversine(
      center.latitude, center.longitude, 
      edge.latitude, edge.longitude
    );
    
    if (!isFinite(radius) || radius <= 0) return;
    if (radius < MIN_RADIUS_FOR_CIRCLE) return;
    
    const urban = await shouldSkipCircle(edge);
    if (urban) return;
    
    const circle = {
      id: Date.now(),
      center: { latitude: center.latitude, longitude: center.longitude },
      radius,
      timestamp: Date.now(),
    };
    
    const next = [...coverageCirclesRef.current, circle];
    setCoverageCircles(next);
    
    // Salvar no storage
    try {
      await salvarCirculosSinal(next);
    } catch (e) {
      console.warn('⚠️ Erro ao salvar círculos:', e);
    }
  }

  return {
    isConnected,
    networkMarker,
    coverageCircles,
    setCoverageCircles,
    lastKnownLocationBeforeDisconnect,
    disconnectTime,
    addCoverageCircleIfValid,
  };
}