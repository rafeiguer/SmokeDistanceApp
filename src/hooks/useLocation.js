// 📍 HOOK useLocation - GPS com Reinício Automático

import { useState, useEffect, useRef } from 'react';
import * as Location from 'expo-location';
import { DEFAULT_LOCATION, GPS_STALE_LIMIT_BASE_PRECISO, GPS_STALE_LIMIT_BASE_ECO, GPS_STALE_LIMIT_BASE_NORMAL, GPS_GRACE_PERIOD, GPS_RESTART_COOLDOWN, STALE_CYCLE_RETRY_THRESHOLD } from '../constants';

export function useLocation(gpsMode = 'normal') {
  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [gpsStale, setGpsStale] = useState(false);
  const [gpsRestarting, setGpsRestarting] = useState(false);
  
  const [lastLocationUpdateTs, setLastLocationUpdateTs] = useState(Date.now());
  const [gpsGraceUntil, setGpsGraceUntil] = useState(Date.now() + GPS_GRACE_PERIOD);
  const [watchRestartToken, setWatchRestartToken] = useState(0);
  
  const lastGpsRestartRef = useRef(0);
  const staleLoggedRef = useRef(false);
  const gpsRecoveryAttemptedRef = useRef(false);
  const staleStartRef = useRef(0);
  const lastKnownRef = useRef(null);
  const watcherRef = useRef(null);

  // 🎯 Obter localização inicial
  useEffect(() => {
    (async () => {
      try {
        console.log('📍 Requisitando permissão de localização...');
        const { status } = await Location.requestForegroundPermissionsAsync();
        
        if (status !== 'granted') {
          console.warn('⚠️ Permissão GPS negada, usando fallback');
          setLocation(DEFAULT_LOCATION);
          setLoading(false);
          return;
        }

        console.log('📍 Obtendo localização...');
        const loc = await Location.getCurrentPositionAsync({ 
          accuracy: Location.Accuracy.Balanced 
        });
        
        if (loc?.coords) {
          console.log('✅ GPS obtido:', loc.coords);
          setLocation(loc.coords);
          lastKnownRef.current = loc.coords;
        } else {
          throw new Error('Sem coordenadas');
        }
      } catch (err) {
        console.error('❌ Erro ao obter GPS:', err.message);
        setLocation(DEFAULT_LOCATION);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // 🔄 Watcher contínuo com reinício automático
  useEffect(() => {
    let watcher = null;
    
    (async () => {
      try {
        let perm = await Location.getForegroundPermissionsAsync();
        if (!perm.granted) {
          perm = await Location.requestForegroundPermissionsAsync();
          if (!perm.granted) return;
        }

        // Configurar conforme modo GPS
        const getConfig = () => {
          if (gpsMode === 'eco') {
            return { accuracy: Location.Accuracy.Balanced, distanceInterval: 10, timeInterval: 5000 };
          }
          if (gpsMode === 'preciso') {
            return { accuracy: Location.Accuracy.BestForNavigation, distanceInterval: 1, timeInterval: 1000 };
          }
          return { accuracy: Location.Accuracy.High, distanceInterval: 3, timeInterval: 2000 };
        };

        const config = getConfig();
        
        watcher = await Location.watchPositionAsync(config, (pos) => {
          if (pos?.coords) {
            setLastLocationUpdateTs(Date.now());
            
            // Fim do estado de reinício
            if (gpsRestarting) {
              setGpsRestarting(false);
              setGpsGraceUntil(Date.now() + 7000);
            }
            
            // Reset flags
            staleLoggedRef.current = false;
            gpsRecoveryAttemptedRef.current = false;
            
            setLocation(prev => {
              const moved = Math.abs(prev?.latitude - pos.coords.latitude) > 0.000005 || 
                           Math.abs(prev?.longitude - pos.coords.longitude) > 0.000005;
              return moved ? pos.coords : prev;
            });
            
            lastKnownRef.current = pos.coords;
          }
        });
      } catch (err) {
        console.warn('⚠️ Erro watchPosition:', err.message);
      }
    })();

    return () => {
      if (watcher) watcher.remove();
    };
  }, [gpsMode, gpsRestarting, watchRestartToken]);

  // 🔍 Monitorar inatividade e reiniciar
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      if (now < gpsGraceUntil) return;
      
      const baseLimit = gpsMode === 'preciso' ? GPS_STALE_LIMIT_BASE_PRECISO : 
                       gpsMode === 'eco' ? GPS_STALE_LIMIT_BASE_ECO : 
                       GPS_STALE_LIMIT_BASE_NORMAL;
      const limit = Math.round(baseLimit * 1.5);
      const inactiveMs = now - lastLocationUpdateTs;
      const isStale = inactiveMs > limit;

      if (isStale) {
        if (!gpsStale) {
          setGpsStale(true);
          staleStartRef.current = now;
        }
        
        if (!staleLoggedRef.current) {
          console.log(`⚠️ GPS parado hÃ¡ ${(inactiveMs/1000).toFixed(1)}s`);
          staleLoggedRef.current = true;
        }

        const sinceLastRestart = now - (lastGpsRestartRef.current || 0);
        const cycleDuration = staleStartRef.current ? now - staleStartRef.current : inactiveMs;

        if (!gpsRecoveryAttemptedRef.current && sinceLastRestart > GPS_RESTART_COOLDOWN && !gpsRestarting) {
          gpsRecoveryAttemptedRef.current = true;
          lastGpsRestartRef.current = now;
          setGpsRestarting(true);
          console.log(`🔄 Reiniciando watcher`);
          setWatchRestartToken(Date.now());
          setGpsGraceUntil(Date.now() + 8000);
        } else if (cycleDuration > STALE_CYCLE_RETRY_THRESHOLD && sinceLastRestart > GPS_RESTART_COOLDOWN && !gpsRestarting && gpsRecoveryAttemptedRef.current) {
          gpsRecoveryAttemptedRef.current = false;
          staleLoggedRef.current = false;
        }
      } else {
        if (gpsStale) setGpsStale(false);
        staleLoggedRef.current = false;
        gpsRecoveryAttemptedRef.current = false;
        if (gpsRestarting) setGpsRestarting(false);
        staleStartRef.current = 0;
      }
    }, 2500);

    return () => clearInterval(interval);
  }, [lastLocationUpdateTs, gpsMode, gpsStale, gpsRestarting, gpsGraceUntil]);

  return {
    location,
    loading,
    gpsStale,
    gpsRestarting,
    lastKnownRef: lastKnownRef.current,
  };
}