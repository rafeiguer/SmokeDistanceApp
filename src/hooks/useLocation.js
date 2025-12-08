import { useEffect, useRef, useState } from 'react';
import * as Location from 'expo-location';
import {
  GPS_STALE_LIMITS,
  GPS_GRACE_PERIOD,
  GPS_RESTART_GAP,
  GPS_RECOVERY_CYCLE_DURATION,
  BREADCRUMB_TRIGGER_MINUTES,
  BREADCRUMB_DISTANCE_METERS,
  MIN_RADIUS_FOR_CIRCLE,
} from '../constants';
import {
  salvarBreadcrumbs,
  carregarBreadcrumbs,
  salvarCoverageCircles,
  carregarCoverageCircles,
} from '../utils/storage';
import { calculateDistanceHaversine } from '../utils/calculations';

export function useLocation(isConnected, gpsMode = 'normal', prefsLoaded = true) {
  // Estado
  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [gpsStale, setGpsStale] = useState(false);
  const [gpsRestarting, setGpsRestarting] = useState(false);
  const [lastLocationUpdateTs, setLastLocationUpdateTs] = useState(Date.now());
  const [gpsGraceUntil, setGpsGraceUntil] = useState(Date.now() + GPS_GRACE_PERIOD);
  const [disconnectTime, setDisconnectTime] = useState(null);
  const [lastKnownLocationBeforeDisconnect, setLastKnownLocationBeforeDisconnect] = useState(null);
  const [breadcrumbs, setBreadcrumbs] = useState([]);
  const [lastBreadcrumbLocation, setLastBreadcrumbLocation] = useState(null);
  const [coverageCircles, setCoverageCircles] = useState([]);
  const [coverageCenter, setCoverageCenter] = useState(null);
  const [watchRestartToken, setWatchRestartToken] = useState(0);
  const [needsRecenter, setNeedsRecenter] = useState(false);
  const [currentRegion, setCurrentRegion] = useState(null);

  // Refs para controle fino
  const lastGpsRestartRef = useRef(0);
  const staleLoggedRef = useRef(false);
  const gpsRecoveryAttemptedRef = useRef(false);
  const staleStartRef = useRef(0);
  const lastKnownRef = useRef(null);
  const lastIsConnectedRef = useRef(null);

  // 🔍 Obter localização inicial
  useEffect(() => {
    (async () => {
      try {
        console.log('🔍 Requisitando permissão de localização...');
        const { status } = await Location.requestForegroundPermissionsAsync();

        if (status !== 'granted') {
          console.warn('⚠️ Permissão GPS negada');
          setLocation({
            latitude: -15.7939,
            longitude: -47.8828,
            altitude: 1200,
          });
          setLoading(false);
          return;
        }

        console.log('🔍 Obtendo localização...');
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });

        if (loc?.coords) {
          console.log('✅ GPS obtido:', loc.coords);
          setLocation(loc.coords);
          lastKnownRef.current = loc.coords;
        } else {
          throw new Error('Sem coordenadas');
        }
      } catch (err) {
        console.error('❌ Erro ao obter GPS:', err.message);
        setLocation({
          latitude: -15.7939,
          longitude: -47.8828,
          altitude: 1200,
        });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // 📍 Carregar círculos de cobertura persistidos
  useEffect(() => {
    (async () => {
      try {
        const saved = await carregarCoverageCircles();
        if (Array.isArray(saved)) {
          setCoverageCircles(saved);
        }
      } catch (e) {
        console.warn('⚠️ Erro ao carregar círculos:', e?.message);
      }
    })();
  }, []);

  // 🍞 Carregar breadcrumbs do AsyncStorage
  useEffect(() => {
    (async () => {
      try {
        const saved = await carregarBreadcrumbs();
        if (Array.isArray(saved)) {
          setBreadcrumbs(saved);
          console.log(`🍞 Carregados ${saved.length} breadcrumbs salvos`);
        }
      } catch (err) {
        console.warn('⚠️ Erro ao carregar breadcrumbs:', err);
      }
    })();
  }, []);

  // 🚶 Atualizar localização continuamente
  useEffect(() => {
    let watcher = null;
    (async () => {
      if (!prefsLoaded) return;

      try {
        let perm = await Location.getForegroundPermissionsAsync();
        if (!perm.granted) {
          perm = await Location.requestForegroundPermissionsAsync();
          if (!perm.granted) return;
        }

        // Configuração do watcher conforme modo GPS
        const cfg = (() => {
          if (gpsMode === 'eco') {
            return { accuracy: Location.Accuracy.Balanced, distanceInterval: 10, timeInterval: 5000 };
          }
          if (gpsMode === 'preciso') {
            return { accuracy: Location.Accuracy.BestForNavigation, distanceInterval: 1, timeInterval: 1000 };
          }
          return { accuracy: Location.Accuracy.High, distanceInterval: 3, timeInterval: 2000 };
        })();

        watcher = await Location.watchPositionAsync(cfg, (pos) => {
          if (pos?.coords) {
            setLastLocationUpdateTs(Date.now());

            if (gpsRestarting) {
              setGpsRestarting(false);
              setGpsGraceUntil(Date.now() + 7000);
            }

            staleLoggedRef.current = false;
            gpsRecoveryAttemptedRef.current = false;

            setLocation((prev) => {
              if (!prev) return pos.coords;
              const moved =
                Math.abs(prev.latitude - pos.coords.latitude) > 0.000005 ||
                Math.abs(prev.longitude - pos.coords.longitude) > 0.000005;
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
      try {
        if (watcher) watcher.remove();
      } catch {}
    };
  }, [gpsMode, prefsLoaded, watchRestartToken]);

  // ⚠️ Monitorar inatividade do GPS
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      if (now < gpsGraceUntil) return;

      const inactiveMs = now - lastLocationUpdateTs;
      const baseLimit = gpsMode === 'preciso' ? 6000 : gpsMode === 'eco' ? 15000 : 10000;
      const limit = Math.round(baseLimit * 1.5);
      const isStale = inactiveMs > limit;

      if (isStale) {
        if (!gpsStale) {
          setGpsStale(true);
          staleStartRef.current = now;
        }

        if (!staleLoggedRef.current) {
          console.log(`⚠️ GPS parado há ${(inactiveMs / 1000).toFixed(1)}s (> ${limit / 1000}s).`);
          staleLoggedRef.current = true;
        }

        const sinceLastRestart = now - (lastGpsRestartRef.current || 0);
        const cycleDuration = staleStartRef.current ? now - staleStartRef.current : inactiveMs;
        const allowRetryThisCycle = cycleDuration > GPS_RECOVERY_CYCLE_DURATION;

        if (!gpsRecoveryAttemptedRef.current && sinceLastRestart > GPS_RESTART_GAP && !gpsRestarting) {
          gpsRecoveryAttemptedRef.current = true;
          lastGpsRestartRef.current = now;
          setGpsRestarting(true);
          console.log(`🔄 Reiniciando watcher (1ª tentativa ciclo, gap ${(sinceLastRestart / 1000).toFixed(1)}s)`);
          setWatchRestartToken(Date.now());
          setGpsGraceUntil(Date.now() + 8000);
        } else if (allowRetryThisCycle && sinceLastRestart > GPS_RESTART_GAP && !gpsRestarting && gpsRecoveryAttemptedRef.current) {
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

  // 📡 Monitorar conectividade (transições de rede)
  useEffect(() => {
    const handleConnectionChange = (isNowConnected) => {
      const loc = location;

      // Detectar queda de rede
      if (lastIsConnectedRef.current === true && isNowConnected === false && loc) {
        console.log('🔴 Rede caiu! Congelando última localização conhecida...');
        setLastKnownLocationBeforeDisconnect(loc);
        setDisconnectTime(Date.now());
        setLastBreadcrumbLocation(loc);

        (async () => {
          try {
            const center = coverageCenter || lastKnownRef.current || loc;
            await addCoverageCircleIfValid(center, loc);
          } finally {
            setCoverageCenter(null);
          }
        })();
      }

      // Detectar reconexão
      if (lastIsConnectedRef.current === false && isNowConnected === true) {
        if (disconnectTime) {
          console.log('🟢 Rede restaurada! Removendo marcador congelado...');
          setLastKnownLocationBeforeDisconnect(null);
          setDisconnectTime(null);
          setLastBreadcrumbLocation(null);
          if (loc) setCoverageCenter(loc);
        }
      }

      lastIsConnectedRef.current = isNowConnected;
    };

    handleConnectionChange(isConnected);
  }, [isConnected, location, disconnectTime, coverageCenter]);

  // 🍞 Sistema de Breadcrumbs
  useEffect(() => {
    if (!disconnectTime || !location || isConnected) return;

    const timeWithoutConnection = (Date.now() - disconnectTime) / 1000 / 60;

    if (timeWithoutConnection >= BREADCRUMB_TRIGGER_MINUTES && lastBreadcrumbLocation) {
      const dLat = location.latitude - lastBreadcrumbLocation.latitude;
      const dLon = location.longitude - lastBreadcrumbLocation.longitude;
      const distanceKm = Math.sqrt(dLat * dLat + dLon * dLon) * 111;
      const distanceMeters = distanceKm * 1000;

      if (distanceMeters >= BREADCRUMB_DISTANCE_METERS) {
        console.log(`🍞 Criando breadcrumb! Distância: ${distanceMeters.toFixed(0)}m`);

        const newBreadcrumb = {
          id: Date.now(),
          latitude: lastBreadcrumbLocation.latitude,
          longitude: lastBreadcrumbLocation.longitude,
          timestamp: Date.now(),
        };

        const updated = [...breadcrumbs, newBreadcrumb];
        setBreadcrumbs(updated);
        setLastBreadcrumbLocation(location);
      }
    }
  }, [location, disconnectTime, isConnected, lastBreadcrumbLocation, breadcrumbs]);

  // 💾 Salvar breadcrumbs persistentemente
  useEffect(() => {
    try {
      if (breadcrumbs.length > 0) {
        salvarBreadcrumbs(breadcrumbs);
      }
    } catch (err) {
      console.warn('⚠️ Erro ao salvar breadcrumbs:', err);
    }
  }, [breadcrumbs]);

  // 📍 Função auxiliar: adicionar círculo de cobertura
  const addCoverageCircleIfValid = async (center, edge) => {
    if (!center || !edge) return;

    const radius = calculateDistanceHaversine(
      center.latitude,
      center.longitude,
      edge.latitude,
      edge.longitude
    );

    if (!isFinite(radius) || radius <= 0) return;
    if (radius < MIN_RADIUS_FOR_CIRCLE) return;

    try {
      // Verificar se é área urbana (simplificado)
      const res = await Location.reverseGeocodeAsync({
        latitude: edge.latitude,
        longitude: edge.longitude,
      });

      const info = res && res[0];
      if (info && (info.city || info.subregion || info.district || info.street)) return;
    } catch (e) {
      // continua mesmo se falhar reverse geocode
    }

    const circle = {
      id: Date.now(),
      center: { latitude: center.latitude, longitude: center.longitude },
      radius,
      timestamp: Date.now(),
    };

    const next = [...coverageCircles, circle];
    setCoverageCircles(next);

    try {
      await salvarCoverageCircles(next);
    } catch {}
  };

  return {
    location,
    loading,
    gpsStale,
    gpsRestarting,
    lastLocationUpdateTs,
    gpsGraceUntil,
    disconnectTime,
    lastKnownLocationBeforeDisconnect,
    breadcrumbs,
    lastBreadcrumbLocation,
    coverageCircles,
    coverageCenter,
    watchRestartToken,
    needsRecenter,
    currentRegion,
    setLocation,
    setLoading,
    setGpsStale,
    setGpsRestarting,
    setLastLocationUpdateTs,
    setGpsGraceUntil,
    setDisconnectTime,
    setLastKnownLocationBeforeDisconnect,
    setBreadcrumbs,
    setLastBreadcrumbLocation,
    setCoverageCircles,
    setCoverageCenter,
    setWatchRestartToken,
    setNeedsRecenter,
    setCurrentRegion,
  };
}
 