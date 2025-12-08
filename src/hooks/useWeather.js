import { useEffect, useState } from 'react';
import { obterDadosMeteologicos } from '../utils/weather';

export function useWeather(location, isConnected) {
  const [meteoDataDinamica, setMeteoDataDinamica] = useState({
    temp: '?',
    humidity: '?',
    windSpeed: '?',
    windDirection: '?',
    descricao: 'Carregando...'
  });

  // 🌡️ CARREGAR DADOS METEOROLÓGICOS QUANDO LOCALIZAÇÃO MUDAR
  useEffect(() => {
    if (!location || !isConnected) return;

    (async () => {
      console.log('🌡️ Carregando dados meteorológicos...');
      const meteo = await obterDadosMeteologicos(location.latitude, location.longitude);
      if (meteo) {
        setMeteoDataDinamica(meteo);
        console.log('✅ Dados meteorológicos atualizados');
      }
    })();
  }, [location, isConnected]);

  // 📊 Preparar dados para exibição
  const meteoData = {
    temp: meteoDataDinamica.temp,
    humidity: meteoDataDinamica.humidity,
    windSpeed: meteoDataDinamica.windSpeed,
    windDirection: meteoDataDinamica.windDirection,
    descricao: meteoDataDinamica.descricao,
  };

  return {
    meteoDataDinamica,
    setMeteoDataDinamica,
    meteoData,
  };
}
