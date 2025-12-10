// 🌤️ WEATHER SERVICE - Open-Meteo API

import { WEATHER_API_URL, WEATHER_CODES, FALLBACK_METEO } from '../constants';
import { validateAPIResponse } from '../utils/validations';

/**
 * Obtém dados meteorológicos reais via Open-Meteo
 * @param {number} latitude - Latitude
 * @param {number} longitude - Longitude
 * @returns {Promise<object>} { temp, humidity, windSpeed, windDirection, descricao }
 */
export async function obterDadosMeteologicos(latitude, longitude) {
  try {
    if (!latitude || !longitude) {
      console.warn('⚠️ Localização não disponível');
      return FALLBACK_METEO;
    }

    console.log(`🌤️ Consultando dados meteorológicos para ${latitude}, ${longitude}...`);
    
    const url = `${WEATHER_API_URL}?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,wind_direction_10m&timezone=auto`;
    
    const response = await fetch(url);
    
    const validation = validateAPIResponse(response, 'json');
    if (!validation.valid) {
      console.warn(`⚠️ Open-Meteo retornou erro: ${validation.error}`);
      return FALLBACK_METEO;
    }
    
    const data = await response.json();
    
    if (!data.current) {
      console.warn('⚠️ Dados sem propriedade "current"');
      return FALLBACK_METEO;
    }
    
    const current = data.current;
    
    const meteo = {
      temp: current.temperature_2m !== undefined 
        ? Math.round(current.temperature_2m).toString() 
        : '?',
      humidity: current.relative_humidity_2m !== undefined 
        ? Math.round(current.relative_humidity_2m).toString() 
        : '?',
      windSpeed: current.wind_speed_10m !== undefined 
        ? Math.round(current.wind_speed_10m).toString() 
        : '?',
      windDirection: current.wind_direction_10m !== undefined 
        ? Math.round(current.wind_direction_10m).toString() 
        : '?',
      descricao: WEATHER_CODES[current.weather_code] || 'DESCONHECIDO'
    };
    
    console.log(`✅ Dados meteorológicos obtidos:`, meteo);
    return meteo;
    
  } catch (err) {
    console.error('❌ Erro ao obter dados meteorológicos:', err.message);
    console.log('🔋 Usando fallback com dados genéricos');
    return FALLBACK_METEO;
  }
}

/**
 * Valida dados meteorológicos antes de usar
 * @param {object} meteo - Dados meteorológicos
 * @returns {boolean}
 */
export function isValidMeteoData(meteo) {
  if (!meteo) return false;
  
  return (
    'temp' in meteo &&
    'humidity' in meteo &&
    'windSpeed' in meteo &&
    'windDirection' in meteo &&
    'descricao' in meteo
  );
}

/**
 * Formata dados meteorológicos para exibição
 * @param {object} meteo - Dados meteorológicos
 * @returns {string} Texto formatado
 */
export function formatMeteoData(meteo) {
  if (!isValidMeteoData(meteo)) return 'Dados indisponíveis';
  
  return `${meteo.temp}°C | ${meteo.humidity}% | ${meteo.windSpeed}km/h | ${meteo.descricao}`;
}

/**
 * Classifica risco de incêndio baseado em dados meteorológicos
 * @param {object} meteo - Dados meteorológicos
 * @returns {string} 'baixo' | 'moderado' | 'alto' | 'muito_alto'
 */
export function classificarRiscoIncendio(meteo) {
  if (!isValidMeteoData(meteo)) return 'desconhecido';
  
  const temp = parseInt(meteo.temp);
  const humidity = parseInt(meteo.humidity);
  const windSpeed = parseInt(meteo.windSpeed);
  
  // Fórmula simplificada de risco de incêndio
  // Considera: temperatura alta, umidade baixa, vento forte
  
  let risco = 0;
  
  if (temp > 35) risco += 3;
  else if (temp > 30) risco += 2;
  else if (temp > 25) risco += 1;
  
  if (humidity < 30) risco += 3;
  else if (humidity < 50) risco += 2;
  else if (humidity < 70) risco += 1;
  
  if (windSpeed > 20) risco += 2;
  else if (windSpeed > 10) risco += 1;
  
  if (risco >= 7) return 'muito_alto';
  if (risco >= 5) return 'alto';
  if (risco >= 3) return 'moderado';
  return 'baixo';
}

/**
 * Retorna descrição em português do código de tempo
 * @param {number} code - Código do Open-Meteo
 * @returns {string}
 */
export function descricaoTempo(code) {
  return WEATHER_CODES[code] || 'Desconhecido';
}

/**
 * Verifica se condições são favoráveis para propagação de fogo
 * @param {object} meteo - Dados meteorológicos
 * @returns {object} { favorable: boolean, motivos: array }
 */
export function verificarCondicoesPropagacao(meteo) {
  if (!isValidMeteoData(meteo)) {
    return { favorable: null, motivos: ['Dados indisponíveis'] };
  }
  
  const motivos = [];
  let favorable = false;
  
  const temp = parseInt(meteo.temp);
  const humidity = parseInt(meteo.humidity);
  const windSpeed = parseInt(meteo.windSpeed);
  
  // Verificar cada fator
  if (temp > 30) {
    motivos.push(`Temperatura alta (${meteo.temp}°C)`);
    favorable = true;
  }
  
  if (humidity < 50) {
    motivos.push(`Umidade baixa (${meteo.humidity}%)`);
    favorable = true;
  }
  
  if (windSpeed > 15) {
    motivos.push(`Vento forte (${meteo.windSpeed}km/h)`);
    favorable = true;
  }
  
  if (!favorable) {
    motivos.push('Condições normais para propagação');
  }
  
  return { favorable, motivos };
}

export default {
  obterDadosMeteologicos,
  isValidMeteoData,
  formatMeteoData,
  classificarRiscoIncendio,
  descricaoTempo,
  verificarCondicoesPropagacao,
};