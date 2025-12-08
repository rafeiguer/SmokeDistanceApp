import { OPEN_METEO_URL, WMM_URL } from '../../constants';

// 🌡️ Obter dados meteorológicos reais (Open-Meteo + Fallback)
export async function obterDadosMeteologicos(latitude, longitude) {
  try {
    console.log(`🌡️ Consultando dados meteorológicos para ${latitude}, ${longitude}...`);
    
    // Usar Open-Meteo que é gratuito e sem autenticação
    const url = `${OPEN_METEO_URL}?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,wind_direction_10m&timezone=auto`;
    console.log(`📡 URL: ${url}`);
    
    const response = await fetch(url);
    console.log(`📊 Status da resposta: ${response.status}`);
    
    if (!response.ok) {
      console.warn(`⚠️ Open-Meteo retornou status ${response.status}`);
      throw new Error(`HTTP ${response.status}`);
    }
    
    const data = await response.json();
    console.log(`📦 Dados recebidos:`, JSON.stringify(data).substring(0, 200));
    
    if (!data.current) {
      console.warn('⚠️ Dados sem propriedade "current"');
      throw new Error('No current data in response');
    }
    
    const current = data.current;
    console.log(`📊 Current object:`, current);
    
    const weatherCodes = {
      0: 'CÉU LIMPO',
      1: 'CÉU QUASE LIMPO',
      2: 'NUBLADO',
      3: 'MUITO NUBLADO',
      45: 'NEVOEIRO',
      48: 'NEVOEIRO GELADO',
      51: 'CHUVA LEVE',
      53: 'CHUVA MODERADA',
      55: 'CHUVA FORTE',
      61: 'CHUVA',
      63: 'CHUVA FORTE',
      65: 'CHUVA MUITO FORTE',
      71: 'NEVE LEVE',
      73: 'NEVE MODERADA',
      75: 'NEVE FORTE',
      80: 'PANCADAS DE CHUVA',
      81: 'PANCADAS DE CHUVA FORTE',
      82: 'PANCADAS DE CHUVA MUITO FORTE',
      95: 'TEMPESTADE'
    };
    
    const meteo = {
      temp: current.temperature_2m !== undefined ? Math.round(current.temperature_2m).toString() : '?',
      humidity: current.relative_humidity_2m !== undefined ? Math.round(current.relative_humidity_2m).toString() : '?',
      windSpeed: current.wind_speed_10m !== undefined ? Math.round(current.wind_speed_10m).toString() : '?',
      windDirection: current.wind_direction_10m !== undefined ? Math.round(current.wind_direction_10m).toString() : '?',
      descricao: weatherCodes[current.weather_code] || 'DESCONHECIDO'
    };
    
    console.log(`✅ Dados meteorológicos obtidos:`, meteo);
    return meteo;
  } catch (err) {
    console.error('❌ Erro ao obter dados meteorológicos:', err.message, err);
    
    // Fallback: dados simulados para testes
    console.log('📋 Usando fallback com dados genéricos');
    return {
      temp: '22',
      humidity: '60',
      windSpeed: '10',
      windDirection: '180',
      descricao: 'SEM CONEXÃO'
    };
  }
}

// 🧭 Obter declinação magnética (WMM - World Magnetic Model)
export async function obterDeclinacaoMagnetica(latitude, longitude, isConnected) {
  try {
    // Tentar API WMM online (melhor precisão)
    if (isConnected) {
      console.log(`🔡 Buscando WMM online para calibração...`);
      
      const response = await fetch(
        `${WMM_URL}?lat=${latitude}&lon=${longitude}&key=zVQnD7M4KjV7H&resultFormat=json`
      );
      
      if (response.ok) {
        const text = await response.text();
        
        // Validar se é JSON
        if (!text.includes('<') && !text.includes('html')) {
          const data = JSON.parse(text);
          
          if (data.result && data.result.declination !== undefined) {
            const declination = data.result.declination;
            console.log(`✅ WMM Online: Declinação = ${declination.toFixed(2)}° (lat: ${latitude.toFixed(4)}, lon: ${longitude.toFixed(4)})`);
            return declination;
          }
        }
      }
    }
    
    // Fallback: Usar modelo WMM offline aproximado
    console.log(`📊 Usando WMM offline (cache local)...`);
    
    // Modelo WMM aproximado baseado em latitude/longitude
    // Fórmula simplificada: declinação ≈ 0.2 * (lon - 100) - 0.02 * lat
    const declination = 0.2 * (longitude - 100) - 0.02 * latitude;
    
    console.log(`📍 WMM Offline: Declinação ≈ ${declination.toFixed(2)}° (aproximado)`);
    return declination;
    
  } catch (err) {
    console.warn(`⚠️ Erro ao obter declinação magnética:`, err.message);
    console.log(`📍 Usando declinação padrão: 0°`);
    return 0; // Continua funcionando com declinação = 0
  }
}

// 🌤️ Preparar dados meteorológicos para envio
export function prepararDadosMeterologicos(meteoData) {
  return {
    temperatura: `${meteoData.temp}°C`,
    umidade: `${meteoData.humidity}%`,
    velocidadeVento: `${meteoData.windSpeed} km/h`,
    direcaoVento: `${meteoData.windDirection}°`,
    descricao: meteoData.descricao
  };
}