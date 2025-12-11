// 🌤️ HOOK useWeatherData

import { useState, useEffect } from 'react';
import { obterDadosMeteologicos } from '../services/weatherService';
import { FALLBACK_METEO } from '../constants';

export function useWeatherData(location, isConnected) {
  const [meteoDataDinamica, setMeteoDataDinamica] = useState(FALLBACK_METEO);

  useEffect(() => {
    if (!location || !isConnected) return;
    
    (async () => {
      const meteo = await obterDadosMeteologicos(location.latitude, location.longitude);
      if (meteo) {
        setMeteoDataDinamica(meteo);
      }
    })();
  }, [location, isConnected]);

  return { meteoDataDinamica, setMeteoDataDinamica };
}