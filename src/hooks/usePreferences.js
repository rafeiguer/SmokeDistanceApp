// ⚙️ HOOK usePreferences - Tema, Modo GPS, Persistência

import { useState, useEffect } from 'react';
import { salvarPreference, carregarPreference } from '../services/storageService';
import { GPS_MODES } from '../constants';

export function usePreferences() {
  const [darkMode, setDarkMode] = useState(false);
  const [gpsMode, setGpsMode] = useState('normal');
  const [prefsLoaded, setPrefsLoaded] = useState(false);

  // 📂 Carregar preferências ao iniciar
  useEffect(() => {
    (async () => {
      try {
        // Carregar tema
        const savedDark = await carregarPreference('pref_dark_mode', '0');
        if (savedDark === '1') setDarkMode(true);
        
        // Carregar modo GPS
        const savedGpsMode = await carregarPreference('pref_gps_mode', 'normal');
        if (Object.values(GPS_MODES).includes(savedGpsMode)) {
          setGpsMode(savedGpsMode);
        }
      } catch (e) {
        console.warn('⚠️ Erro ao carregar preferências:', e);
      } finally {
        setPrefsLoaded(true);
      }
    })();
  }, []);

  // 💾 Salvar tema quando muda
  useEffect(() => {
    if (!prefsLoaded) return;
    
    (async () => {
      try {
        await salvarPreference('pref_dark_mode', darkMode ? '1' : '0');
      } catch (e) {
        console.warn('⚠️ Erro ao salvar tema:', e);
      }
    })();
  }, [darkMode, prefsLoaded]);

  // 💾 Salvar modo GPS quando muda
  useEffect(() => {
    if (!prefsLoaded) return;
    
    (async () => {
      try {
        await salvarPreference('pref_gps_mode', gpsMode);
      } catch (e) {
        console.warn('⚠️ Erro ao salvar modo GPS:', e);
      }
    })();
  }, [gpsMode, prefsLoaded]);

  return {
    darkMode,
    setDarkMode,
    gpsMode,
    setGpsMode,
    prefsLoaded,
  };
}