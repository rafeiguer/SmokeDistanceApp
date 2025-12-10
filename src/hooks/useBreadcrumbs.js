// 🍞 HOOK useBreadcrumbs - Rastreamento de Sinal Perdido

import { useState, useEffect } from 'react';
import { salvarBreadcrumbs, carregarBreadcrumbs } from '../services/storageService';
import { BREADCRUMB_CONFIG } from '../constants';

export function useBreadcrumbs(location, isConnected) {
  const [breadcrumbs, setBreadcrumbs] = useState([]);
  const [lastBreadcrumbLocation, setLastBreadcrumbLocation] = useState(null);
  const [disconnectTime, setDisconnectTime] = useState(null);

  // 📂 Carregar breadcrumbs salvos ao iniciar
  useEffect(() => {
    (async () => {
      try {
        const saved = await carregarBreadcrumbs();
        if (Array.isArray(saved) && saved.length > 0) {
          setBreadcrumbs(saved);
          console.log(`🍞 ${saved.length} breadcrumbs carregados`);
        }
      } catch (err) {
        console.warn('⚠️ Erro ao carregar breadcrumbs:', err);
      }
    })();
  }, []);

  // 🍞 Criar breadcrumbs quando sem sinal há 10+ min
  useEffect(() => {
    if (!location || isConnected || !disconnectTime) return;

    const timeWithoutConnection = (Date.now() - disconnectTime) / 1000 / 60; // minutos
    
    // Se passou 10 minutos sem sinal, criar breadcrumbs
    if (timeWithoutConnection >= BREADCRUMB_CONFIG.minTimeWithoutConnection && lastBreadcrumbLocation) {
      // Calcular distância
      const dLat = location.latitude - lastBreadcrumbLocation.latitude;
      const dLon = location.longitude - lastBreadcrumbLocation.longitude;
      const distanceKm = Math.sqrt(dLat * dLat + dLon * dLon) * 111; // 111 km/grau
      const distanceMeters = distanceKm * 1000;

      // Se moveu 500m+, criar novo breadcrumb
      if (distanceMeters >= BREADCRUMB_CONFIG.minDistanceBetweenBreadcrumbs) {
        console.log(`🍞 Novo breadcrumb! Distância: ${distanceMeters.toFixed(0)}m`);
        
        const newBreadcrumb = {
          id: Date.now(),
          latitude: lastBreadcrumbLocation.latitude,
          longitude: lastBreadcrumbLocation.longitude,
          timestamp: Date.now(),
        };
        
        const next = [...breadcrumbs, newBreadcrumb];
        setBreadcrumbs(next);
        setLastBreadcrumbLocation(location);
        
        // Salvar
        salvarBreadcrumbs(next).catch(e => console.warn('⚠️ Erro ao salvar:', e));
      }
    }
  }, [location, disconnectTime, isConnected, lastBreadcrumbLocation, breadcrumbs]);

  // 📊 Detectar desconexão
  useEffect(() => {
    if (!isConnected && !disconnectTime && location) {
      console.log('🍞 Iniciando rastreamento de breadcrumbs');
      setDisconnectTime(Date.now());
      setLastBreadcrumbLocation(location);
    }
  }, [isConnected, location, disconnectTime]);

  // 🔄 Detectar reconexão
  useEffect(() => {
    if (isConnected && disconnectTime) {
      console.log('🍞 Reconectado, encerrando rastreamento');
      setDisconnectTime(null);
      setLastBreadcrumbLocation(null);
    }
  }, [isConnected, disconnectTime]);

  return {
    breadcrumbs,
    setBreadcrumbs,
    lastBreadcrumbLocation,
    disconnectTime,
  };
}