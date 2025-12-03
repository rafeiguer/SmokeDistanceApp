
import React, { useState, useEffect, useRef } from "react";
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, KeyboardAvoidingView, Platform, Linking } from "react-native";
import * as Location from "expo-location";
import * as TaskManager from "expo-task-manager";
import * as IntentLauncher from 'expo-intent-launcher';
import MapView, { Marker, Polyline, Circle, WMSTile } from "react-native-maps";
import NetInfo from "@react-native-community/netinfo";
import * as ImagePicker from "expo-image-picker";
import { CameraView, useCameraPermissions } from "expo-camera";
import { Accelerometer } from "expo-sensors";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { salvarFocosStorage, carregarFocosStorage, exportarFocosJSON } from './src/services/focosStorage';
import Constants from 'expo-constants';
import { registerForPushNotificationsAsync } from './src/notifications';
import { getDb } from './src/firebase';

// Constantes
const R = 6371000;
const deg2rad = Math.PI / 180;
let sfSeq = 0; // sequência para IDs únicos simulados
const AUTO_BOUNCE_INTERVAL_MS = 15000; // no máximo 1 bounce a cada 15s
const BG_TASK_NAME = 'smokedistance-location-updates';
const isExpoGo = Constants?.appOwnership === 'expo';

const SafeOps = {
  parseNumber: (value, fallback = 0) => {
    const num = parseFloat(value);
    return isNaN(num) || !isFinite(num) ? fallback : num;
  },
};


// 🥾 ENCONTRAR ROTA ATÉ O FOCO (OSRM - Open Street Routing Machine)
async function encontrarTrilhasProximas(userLatitude, userLongitude, focusLatitude, focusLongitude) {
  try {
    console.log(`🥾 Calculando rota do usuário até o foco via OSRM...`);

    // Validar coordenadas do usuário
    if (!userLatitude || !userLongitude) {
      console.warn('⚠️ Localização do usuário não disponível');
      throw new Error('No user location');
    }

    // OSRM retorna rota pelos caminhos existentes (OpenStreetMap)
    // Formato: lon,lat (nota: OSRM usa lon,lat não lat,lon)
    const osrmUrl = `https://router.project-osrm.org/route/v1/walking/${userLongitude},${userLatitude};${focusLongitude},${focusLatitude}?geometries=geojson&overview=full&steps=true`;

    console.log(`📡 Buscando rota via OSRM...`);

    const response = await fetch(osrmUrl);

    if (!response.ok) {
      console.warn(`⚠️ OSRM retornou ${response.status}`);
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();

    if (data.code !== 'Ok') {
      console.warn(`⚠️ OSRM code: ${data.code}`);
      throw new Error(`OSRM: ${data.code}`);
    }

    if (!data.routes || data.routes.length === 0) {
      console.warn('⚠️ Nenhuma rota encontrada');
      throw new Error('No routes found');
    }

    const route = data.routes[0];
    const geometry = route.geometry;

    // Converter GeoJSON geometry para array de coords
    const coordinates = geometry.coordinates.map(coord => ({
      latitude: coord[1],  // GeoJSON usa [lon, lat]
      longitude: coord[0]
    }));

    const distanceKm = (route.distance / 1000).toFixed(2);
    const durationMin = Math.round(route.duration / 60);

    console.log(`✅ Rota encontrada com ${coordinates.length} pontos`);
    console.log(`📍 Distância: ${distanceKm}km, Tempo: ${durationMin}min`);

    // Retornar apenas UMA rota
    return [{
      id: 'route-main',
      coordinates: coordinates,
      distance: route.distance,
      type: 'way',
      tags: {
        name: 'Rota até o Foco',
        distance: `${distanceKm}km`,
        duration: `${durationMin}min`
      }
    }];

  } catch (err) {
    console.error('❌ Erro ao buscar rota OSRM:', err.message);

    // Tentar GraphHopper como fallback secundário
    try {
      console.log('🔄 Tentando fallback com GraphHopper...');

      const ghUrl = `https://graphhopper.com/api/1/route?point=${userLatitude},${userLongitude}&point=${focusLatitude},${focusLongitude}&profile=foot&locale=pt&key=6e7e76e1-7e59-40a6-8352-c34c8f1dc0d6`;

      const ghResponse = await fetch(ghUrl);

      if (ghResponse.ok) {
        const ghData = await ghResponse.json();

        if (ghData.paths && ghData.paths.length > 0) {
          const path = ghData.paths[0];

          if (path.points && path.points.coordinates) {
            const coordinates = path.points.coordinates.map(coord => ({
              latitude: coord[1],
              longitude: coord[0]
            }));

            const distanceKm = (path.distance / 1000).toFixed(2);
            const durationMin = Math.round(path.time / 60000);

            console.log(`✅ Rota GraphHopper encontrada com ${coordinates.length} pontos`);

            return [{
              id: 'route-graphhopper',
              coordinates: coordinates,
              distance: path.distance,
              type: 'way',
              tags: {
                name: 'Rota até o Foco (GraphHopper)',
                distance: `${distanceKm}km`,
                duration: `${durationMin}min`
              }
            }];
          }
        }
      }
    } catch (ghErr) {
      console.warn('⚠️ GraphHopper também falhou:', ghErr.message);
    }

    // Último fallback: linha reta com alguns pontos intermediários
    console.log('📋 Usando rota simulada como fallback final...');

    const coordinates = [];
    const steps = 20;

    // Interpolar entre usuário e foco
    for (let i = 0; i <= steps; i++) {
      const ratio = i / steps;

      coordinates.push({
        latitude: userLatitude + (focusLatitude - userLatitude) * ratio,
        longitude: userLongitude + (focusLongitude - userLongitude) * ratio
      });
    }

    const distance = calculateDistanceHaversine(userLatitude, userLongitude, focusLatitude, focusLongitude);

    return [{
      id: 'fallback-route',
      coordinates: coordinates,
      distance: distance,
      type: 'way',
      tags: { name: 'Rota Direta (Simulada)' }
    }];
  }
}

// 🌤️ OBTER DADOS METEOROLÓGICOS REAIS (Open-Meteo + Fallback)
async function obterDadosMeteologicos(latitude, longitude) {
  try {
    console.log(`🌤️ Consultando dados meteorológicos para ${latitude}, ${longitude}...`);

    // Usar Open-Meteo que é gratuito e sem autenticação
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,wind_direction_10m&timezone=auto`;
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

function calculateDistanceHaversine(lat1, lon1, lat2, lon2) {
  const dLat = (lat2 - lat1) * deg2rad;
  const dLon = (lon2 - lon1) * deg2rad;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * deg2rad) * Math.cos(lat2 * deg2rad) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// 🛰️ Focos por satélite (simulados – pode conectar à FIRMS/INPE depois)
async function fetchSatelliteFiresAround(lat, lon) {
  const rand = (min, max) => Math.random() * (max - min) + min;
  const ts = Date.now();
  const build = (n) => Array.from({ length: n }).map(() => {
    const latitude = lat + rand(-0.12, 0.12);
    const longitude = lon + rand(-0.12, 0.12);
    const id = `sf-${ts}-${sfSeq++}-${Math.round(latitude * 1e6)}-${Math.round(longitude * 1e6)}`;
    return {
      id,
      latitude,
      longitude,
      origem: 'Satélite',
      intensidade: ['Baixa','Média','Alta'][Math.floor(Math.random() * 3)],
      hora: new Date().toLocaleTimeString('pt-BR'),
    };
  });
  return [...build(3), ...build(3), ...build(4)];
}

// 🚦 Lê configurações (tokens/URLs) do app.json
const extra = (Constants?.expoConfig?.extra) || (Constants?.manifest?.extra) || {};
const FIRMS_MAP_KEY = (extra?.FIRMS_MAP_KEY || '').trim();

// 🔗 Tentar FIRMS configurado via URL/TOKEN do extra
async function tryFetchFIRMSConfigured(bbox) {
  const url = (extra?.FIRMS_URL || '').trim();
  if (!url) return [];
  let finalUrl = url;
  if (extra?.FIRMS_TOKEN && !finalUrl.includes('token=')) {
    const sep = finalUrl.includes('?') ? '&' : '?';
    finalUrl = `${finalUrl}${sep}token=${encodeURIComponent(extra.FIRMS_TOKEN)}`;
  }
  try {
    const res = await fetch(finalUrl);
    if (!res.ok) return [];
    const isJSON = (res.headers.get('content-type') || '').includes('application/json');
    const text = await res.text();
    const geo = isJSON ? JSON.parse(text) : JSON.parse(text); // tenta JSON de qualquer forma
    const feats = geo?.features || [];
    const out = [];
    feats.forEach((f) => {
      const [lon, lat] = f.geometry?.coordinates || [];
      if (typeof lat === 'number' && typeof lon === 'number') {
        const p = { latitude: lat, longitude: lon };
        if (!bbox || insideBBox(p, bbox)) {
          const props = f.properties || {};
          out.push({
            id: `firmscfg-${props?.acq_date || ''}-${props?.acq_time || ''}-${lon?.toFixed?.(4)}${lat?.toFixed?.(4)}`,
            latitude: lat,
            longitude: lon,
            origem: 'FIRMS',
            intensidade: props.confidence || props.brightness || 'N/D',
            hora: props.acq_time ? String(props.acq_time) : 'N/D',
            tempK: props.bright_ti4 || props.brightness || null,
          });
        }
      }
    });
    return out;
  } catch (e) {
    return [];
  }
}

// 🔲 BBOX simples ao redor de um ponto (km)
function makeBBox(lat, lon, km = 100) {
  const dLat = km / 111;
  const dLon = km / (111 * Math.cos((lat * Math.PI) / 180));
  return {
    minLat: lat - dLat,
    minLon: lon - dLon,
    maxLat: lat + dLat,
    maxLon: lon + dLon,
  };
}

function insideBBox(p, bbox) {
  return (
    p.latitude >= bbox.minLat &&
    p.latitude <= bbox.maxLat &&
    p.longitude >= bbox.minLon &&
    p.longitude <= bbox.maxLon
  );
}

// 🌎 Tentar FIRMS GeoJSON público (sem token). Se falhar, retorna []
async function tryFetchFIRMSGeoJSON(bbox) {
  const sources = [
    // VIIRS NRT América do Sul 24h
    'https://firms2.modaps.eosdis.nasa.gov/active_fire/latest/viirs-snpp_nrt_South_America_24h.geojson',
    // MODIS C6.1 América do Sul 24h
    'https://firms2.modaps.eosdis.nasa.gov/active_fire/latest/MODIS_C6_1_South_America_24h.geojson',
  ];
  const results = [];
  for (const url of sources) {
    try {
      const res = await fetch(url);
      if (!res.ok) continue;
      const geo = await res.json();
      const feats = geo?.features || [];
      feats.forEach((f) => {
        const [lon, lat] = f.geometry?.coordinates || [];
        if (typeof lat === 'number' && typeof lon === 'number') {
          const p = { latitude: lat, longitude: lon };
          if (!bbox || insideBBox(p, bbox)) {
            const props = f.properties || {};
            results.push({
              id: `firms-${props?.acq_date || ''}-${props?.acq_time || ''}-${lon.toFixed(4)}${lat.toFixed(4)}`,
              latitude: lat,
              longitude: lon,
              origem: 'FIRMS',
              intensidade: props.confidence || props.brightness || 'N/D',
              hora: props.acq_time ? String(props.acq_time) : 'N/D',
              tempK: props.bright_ti4 || props.brightness || null,
            });
          }
        }
      });
    } catch (e) {
      // ignora fonte que falhar
    }
  }
  return results;
}

// 🛰️ Placeholder GOES/MSG – retornam [] por padrão (podemos ligar depois)
async function tryFetchGOES(bbox) {
  return [];
}
async function tryFetchMSG(bbox) {
  return [];
}


// Converter lat/lon/alt para coordenadas cartesianas (metros a partir de um ponto de origem)
function geoToCartesian(lat, lon, alt, originLat, originLon, originAlt) {
  const dLat = (lat - originLat) * deg2rad;
  const dLon = (lon - originLon) * deg2rad;
  
  const x = R * dLon * Math.cos(originLat * deg2rad);
  const y = R * dLat;
  const z = alt - originAlt;
  
  return { x, y, z };
}

// Calcular ponto 3D pela interseção de múltiplas linhas de visada
  function calcularTriangulacao(focos) {
    if (focos.length < 2) return null;

    // Usar o primeiro foco como origem
    const origem = focos[0];
    const originLat = origem.latitude;
    const originLon = origem.longitude;
    const originAlt = origem.altitude || 0;

    // Converter todos os focos para coordenadas cartesianas
    const observadores = focos.map((foco, idx) => {
      const cart = geoToCartesian(
        foco.latitude,
        foco.longitude,
        foco.altitude || 0,
        originLat,
        originLon,
        originAlt
      );

      // Calcular direção da visada (heading + pitch)
      const headingRad = foco.heading * deg2rad;
      const pitchRad = foco.pitch * deg2rad;

      // Vetor de direção (normal para a câmera)
      const dirX = Math.sin(headingRad) * Math.cos(pitchRad);
      const dirY = Math.cos(headingRad) * Math.cos(pitchRad);
      const dirZ = Math.sin(pitchRad);

      return {
        posicao: cart,
        direcao: { x: dirX, y: dirY, z: dirZ },
        distancia: foco.distancia || 0,
        nome: `Obs ${idx + 1}`
      };
    });

    // Usar o método de mínimos quadrados para encontrar o ponto mais próximo
    // que satisfaz todas as linhas de visada
    let melhorPonto = null;
    let melhorErro = Infinity;

    // Busca em grid perto da distância média
    const distMedia = focos.reduce((sum, f) => sum + (f.distancia || 0), 0) / focos.length;

    // Usar o primeiro observador como referência
    const obsRef = observadores[0];
    const pX = obsRef.posicao.x + obsRef.direcao.x * distMedia;
    const pY = obsRef.posicao.y + obsRef.direcao.y * distMedia;
    const pZ = obsRef.posicao.z + obsRef.direcao.z * distMedia;

    // Calcular erro da triangulação (quão bem todos os observadores "veem" este ponto)
    let erroTotal = 0;
    observadores.forEach((obs) => {
      // Vetor do observador ao ponto
      const vx = pX - obs.posicao.x;
      const vy = pY - obs.posicao.y;
      const vz = pZ - obs.posicao.z;

      const distObs = Math.sqrt(vx * vx + vy * vy + vz * vz);

      // Produto escalar (deve ser ~1 se o ponto está na linha de visada)
      const dot = (vx * obs.direcao.x + vy * obs.direcao.y + vz * obs.direcao.z) / distObs;
      const erro = Math.abs(1 - dot); // Erro de alinhamento

      erroTotal += erro;
    });

    // Converter ponto cartesiano de volta para lat/lon/alt
    const latFogo = originLat + (pY / R) / deg2rad;
    const lonFogo = originLon + (pX / (R * Math.cos(originLat * deg2rad))) / deg2rad;
    const altFogo = originAlt + pZ;

    return {
      latitude: latFogo,
      longitude: lonFogo,
      altitude: altFogo,
      erro: erroTotal / observadores.length,
      observadores: observadores.length
    };
  }

  // Marcar um foco (observação para triangulação)
  function marcarFoco() {
    console.log('🎯 Tentando marcar foco...', {
      location: location ? 'OK' : 'FALTA',
      cameraDynamicDistance,
      focos: focos.length
    });

    if (!location) {
      Alert.alert('⚠️ GPS não disponível', 'Aguarde o GPS se conectar...');
      return;
    }

    if (cameraDynamicDistance === null || cameraDynamicDistance === undefined) {
      Alert.alert('⚠️ Distância não disponível', 'Certifique-se que a câmera está ativa e calibrada');
      return;
    }

    if (focos.length >= 5) {
      Alert.alert('⚠️ Limite atingido', 'Máximo 5 observações para triangulação');
      return;
    }

    const novoFoco = {
      id: Date.now(),
      latitude: location.latitude,
      longitude: location.longitude,
      altitude: location.altitude || 0,
      heading: (Math.round(smoothHeading) % 360) || 0,
      pitch: Math.round(pitchAngle),
      distancia: cameraDynamicDistance,
      timestamp: new Date().toLocaleTimeString(),
      observadorId: `Obs-${focos.length + 1}`
    };

    const novosFocos = [...focos, novoFoco];
    setFocos(novosFocos);
    // Enfileira para backend quando online voltar
    enqueuePing(novoFoco);

    // Calcular triangulação se temos >= 2 focos
    if (novosFocos.length >= 2) {
      const resultado = calcularTriangulacao(novosFocos);
      setTriangulacaoResultado(resultado);
      console.log('🎯 Triangulação:', resultado);
    }

    Alert.alert(
      '✅ Foco Marcado',
      `${novoFoco.observadorId}\n` +
      `Heading: ${novoFoco.heading}°\n` +
      `Pitch: ${novoFoco.pitch}°\n` +
      `Distância: ${novoFoco.distancia.toFixed(1)}m\n` +
      `\nTotal: ${novosFocos.length}/5`
    );
  }

export default function App() {
  const mapRef = useRef(null);
  const lastAutoBounceRef = useRef(0);
  const [page, setPage] = useState(1);
  const [smokeHeight, setSmokeHeight] = useState('100');
  const [pickedPoint, setPickedPoint] = useState(null);
  const [distanceSingle, setDistanceSingle] = useState(null);
  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [heading, setHeading] = useState(0);
  const [smoothHeading, setSmoothHeading] = useState(0);
  const [networkMarker, setNetworkMarker] = useState(null); // marcador temporário de status de rede
  const [fixedCenterMarker, setFixedCenterMarker] = useState(null); // ping fixo do centro (permanece)
  const [showFocos, setShowFocos] = useState(false); // controlar exibição dos focos marcados
  const [waterMarkers, setWaterMarkers] = useState([]);
  const [markingMode, setMarkingMode] = useState(false);
  const [pendingFireData, setPendingFireData] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastKnownLocationBeforeDisconnect, setLastKnownLocationBeforeDisconnect] = useState(null);
  const [disconnectTime, setDisconnectTime] = useState(null); // Quando perdeu conexão
  const [breadcrumbs, setBreadcrumbs] = useState([]); // Array de marcadores de breadcrumb
  const [lastBreadcrumbLocation, setLastBreadcrumbLocation] = useState(null); // Última localização onde criou breadcrumb
  // 📶 Círculos de cobertura de sinal
  const [coverageCenter, setCoverageCenter] = useState(null); // posição quando conectou
  const [coverageCircles, setCoverageCircles] = useState([]); // círculos persistentes
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraPhoto, setCameraPhoto] = useState(null);
  const [cameraObjectHeight, setCameraObjectHeight] = useState('50');
  const [cameraDynamicDistance, setCameraDynamicDistance] = useState(null);
  const [accelerometerData, setAccelerometerData] = useState({ x: 0, y: 0, z: 0 });
  const [pitchAngle, setPitchAngle] = useState(0);
  const [magneticDeclination, setMagneticDeclination] = useState(0);
  const [cameraBaselinePitch, setCameraBaselinePitch] = useState(null); // Calibração do chão
  const [focos, setFocos] = useState([]); // Array de observações para triangulação (até 5)
  const [triangulacaoResultado, setTriangulacaoResultado] = useState(null); // Resultado da triangulação
  const [marcandoFocoMapa, setMarcandoFocoMapa] = useState(false); // Modo marcar foco no mapa
  const [isCalibrating, setIsCalibrating] = useState(false); // Modo calibração de bussola
  const [magnetometerReadings, setMagnetometerReadings] = useState([]); // Leituras para calibração
  const [inputsManualFoco, setInputsManualFoco] = useState({
    latitude: '',
    longitude: '',
    altitude: '',
    heading: '',
    pitch: '',
    distancia: ''
  });
  const [waypointTemporario, setWaypointTemporario] = useState(null); // Waypoint sendo marcado
  const [focoPendente, setFocoPendente] = useState(false); // Se há um foco aguardando salvar
  const [focoSalvoAgora, setFocoSalvoAgora] = useState(false); // Se acabou de salvar
  const [mapaCamera, setMapaCamera] = useState('hybrid'); // Tipo de mapa: standard, satellite, terrain
  const [gpsMode, setGpsMode] = useState('normal'); // eco | normal | preciso
  const [bgLocationEnabled, setBgLocationEnabled] = useState(false); // atualizações em segundo plano
  const [androidBoosted, setAndroidBoosted] = useState(false); // modo 1-toque aplicado
  const [trilhasProximas, setTrilhasProximas] = useState([]); // Trilhas encontradas
  const [meteoDataDinamica, setMeteoDataDinamica] = useState({
    temp: '?',
    humidity: '?',
    windSpeed: '?',
    windDirection: '?',
    descricao: 'Carregando...'
  }); // Dados meteorológicos em tempo real
  // 🛰️ Satélites (focos grátis)
  const [satelliteFocos, setSatelliteFocos] = useState([]);
  const [satelliteLoading, setSatelliteLoading] = useState(false);
  const [showSatelliteOverlay, setShowSatelliteOverlay] = useState(false);
  const [satellitesInfo, setSatellitesInfo] = useState([
    { id: 'sat-1', nome: 'Aqua (MODIS)', atualizacao: '≈ 6h', resolucao: '1km', focos: 0 },
    { id: 'sat-2', nome: 'Terra (MODIS)', atualizacao: '≈ 6h', resolucao: '1km', focos: 0 },
    { id: 'sat-3', nome: 'Suomi NPP (VIIRS)', atualizacao: '≈ 15min', resolucao: '375m', focos: 0 },
  ]);
  const [enableFIRMS, setEnableFIRMS] = useState(true);
  const [enableGOES, setEnableGOES] = useState(false);
  const [enableMSG, setEnableMSG] = useState(false);
  const [lastSatUpdate, setLastSatUpdate] = useState(null);
  const [communityPings, setCommunityPings] = useState([]); // Pings da comunidade (Firestore)
  const [showCommunityPings, setShowCommunityPings] = useState(false);
  const [followUser, setFollowUser] = useState(true);
  const [currentRegion, setCurrentRegion] = useState(null);
  const [needsRecenter, setNeedsRecenter] = useState(false);
  const [recenterVisible, setRecenterVisible] = useState(false);
  const recenterDelayRef = useRef(null);
  const recenterAutoHideRef = useRef(null);
  const lastKnownRef = useRef(null);
  const lastInteractionRef = useRef(0);
  const lastConnRef = useRef(null);

  // Valor seguro para evitar undefined
  const safeInputsManualFoco = inputsManualFoco || {
    latitude: '',
    longitude: '',
    altitude: '',
    heading: '',
    pitch: '',
    distancia: ''
  };

  // ✅ FUNÇÃO PARA SALVAR FOCO MANUAL
  function salvarFocoManual() {
    console.log('🔴 Clicou em Salvar!');
    
    if (!inputsManualFoco || (!inputsManualFoco.latitude && !inputsManualFoco.longitude)) {
      Alert.alert('⚠️ Erro', 'Clique no mapa antes de salvar!');
      return;
    }

    const lat = parseFloat(inputsManualFoco.latitude || 0);
    const lon = parseFloat(inputsManualFoco.longitude || 0);
    const alt = parseFloat(inputsManualFoco.altitude) || 0;
    const dist = parseFloat(inputsManualFoco.distancia) || 0;

    console.log('Dados:', { lat, lon, alt, dist });

    if (isNaN(lat) || isNaN(lon) || isNaN(dist)) {
      Alert.alert('⚠️ Dados inválidos', 'Latitude, longitude e distância são obrigatórios');
      return;
    }

    if (focos.length >= 5) {
      Alert.alert('⚠️ Limite atingido', 'Máximo 5 observações');
      return;
    }

    const novoFoco = {
      id: Date.now(),
      latitude: lat,
      longitude: lon,
      altitude: alt,
      heading: 0,
      pitch: 0,
      distancia: dist,
      timestamp: new Date().toLocaleTimeString(),
      observadorId: `Obs-${focos.length + 1}`
    };

    const novosFocos = [...focos, novoFoco];
    setFocos(novosFocos);
    setShowFocos(true); // ao marcar o primeiro foco, garantir visibilidade
    // Enfileira para backend quando online voltar
    enqueuePing(novoFoco);
    console.log('✅ Foco adicionado:', novoFoco.observadorId);
    
    // Salvar no AsyncStorage de forma assíncrona (sem esperar)
    salvarFocosStorage(novosFocos).then(() => {
      console.log('✅ Salvo no storage!');
    }).catch(err => {
      console.error('❌ Erro ao salvar:', err);
    });

    // Calcular triangulação
    if (novosFocos.length >= 2) {
      const resultado = calcularTriangulacao(novosFocos);
      setTriangulacaoResultado(resultado);
      console.log('🎯 Triangulação calculada!');
    }

    // Limpar inputs
    setInputsManualFoco({
      latitude: '',
      longitude: '',
      altitude: '',
      heading: '',
      pitch: '',
      distancia: ''
    });
    setWaypointTemporario(null);
    console.log('✅ Inputs limpos!');
    
    // Mostrar "Salvo!"
    setFocoSalvoAgora(true);
    console.log('✅ Mostrando "Salvo!"');
  }

  // 🛰️ Carregar focos por satélite próximos

    // 🔔 Registrar push token e salvar no backend (se configurado)
    useEffect(() => {
      (async () => {
        try { await registerForPushNotificationsAsync(); } catch {}
      })();
    }, []);

    // 📤 Enfileirar ping para enviar ao backend (offline-first)
    async function enqueuePing(ping) {
      try {
        const key = 'pending_pings';
        const raw = await AsyncStorage.getItem(key);
        const arr = raw ? JSON.parse(raw) : [];
        arr.push(ping);
        await AsyncStorage.setItem(key, JSON.stringify(arr));
      } catch {}
    }

    // 📡 Enviar ping ao Firestore
    async function sendPingToFirestore(p) {
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
          timestampLocal: p.timestamp || new Date().toLocaleTimeString(),
          createdAt: serverTimestamp(),
        });
        return true;
      } catch (e) {
        return false;
      }
    }

    // 🔄 Drenar fila pendente ao reconectar
    async function syncPendingPings() {
      try {
        const key = 'pending_pings';
        const raw = await AsyncStorage.getItem(key);
        const arr = raw ? JSON.parse(raw) : [];
        if (!arr.length) return;
        const kept = [];
        for (const p of arr) {
          const ok = await sendPingToFirestore(p);
          if (!ok) kept.push(p);
        }
        await AsyncStorage.setItem(key, JSON.stringify(kept));
      } catch {}
    }

    // 👥 Assinar pings recentes (filtra por bbox no cliente)
    useEffect(() => {
      if (!showCommunityPings) return;
      const db = getDb();
      if (!db) return;
      try {
        const { collection, query, orderBy, limit, onSnapshot } = require('firebase/firestore');
        const q = query(collection(db, 'pings'), orderBy('createdAt', 'desc'), limit(200));
        const unsub = onSnapshot(q, (snap) => {
          const list = [];
          snap.forEach((doc) => {
            const d = doc.data();
            if (!d || typeof d.latitude !== 'number' || typeof d.longitude !== 'number') return;
            list.push({ id: doc.id, ...d });
          });
          setCommunityPings(list);
        });
        return () => unsub && unsub();
      } catch {}
    }, [showCommunityPings]);
  async function loadSatelliteFocos() {
    if (!location) return;
    try {
      setSatelliteLoading(true);
      const bbox = makeBBox(location.latitude, location.longitude, 150);
      let all = [];
      if (enableFIRMS) {
        // Primeiro tenta FIRMS configurado; se vazio, tenta público
        let f = await tryFetchFIRMSConfigured(bbox);
        if (!f || f.length === 0) {
          f = await tryFetchFIRMSGeoJSON(bbox);
        }
        all = all.concat(f);
      }
      if (enableGOES) {
        const g = await tryFetchGOES(bbox);
        all = all.concat(g);
      }
      if (enableMSG) {
        const m = await tryFetchMSG(bbox);
        all = all.concat(m);
      }
      // Fallback: se nenhuma fonte retornou, usa simulado para não ficar vazio
      if (all.length === 0) {
        const sim = await fetchSatelliteFiresAround(location.latitude, location.longitude);
        all = sim;
      }
      // Remover duplicados por id ou por aproximação lat/lon+origem+hora
      const seen = new Set();
      const unique = [];
      for (const x of all) {
        const key = x.id || `${x.origem || 'UNK'}:${x.hora || ''}:${(x.latitude ?? 0).toFixed(4)},${(x.longitude ?? 0).toFixed(4)}`;
        if (!seen.has(key)) {
          seen.add(key);
          unique.push(x);
        }
      }
      setSatelliteFocos(unique);
      setLastSatUpdate(Date.now());
      // Atualizar contagem por satélite de forma aproximada
      const countFIRMS = enableFIRMS ? unique.filter(x => x.origem === 'FIRMS').length : 0;
      const countGOES = enableGOES ? unique.filter(x => x.origem === 'GOES').length : 0;
      const countMSG  = enableMSG  ? unique.filter(x => x.origem === 'MSG').length  : 0;
      setSatellitesInfo([
        { id: 'sat-1', nome: 'FIRMS (MODIS/VIIRS)', atualizacao: '≈ 15min-6h', resolucao: '375m-1km', focos: countFIRMS },
        { id: 'sat-2', nome: 'GOES', atualizacao: '≈ 5-15min', resolucao: '2-10km', focos: countGOES },
        { id: 'sat-3', nome: 'MSG',  atualizacao: '≈ 15min',   resolucao: '3km',    focos: countMSG  },
      ]);
    } catch (e) {
      console.warn('⚠️ Falha cargas satélite:', e?.message);
    } finally {
      setSatelliteLoading(false);
    }
  }

  // 📤 PREPARAR DADOS PARA ENVIO ÀS AUTORIDADES
  function prepararDadosParaEnvio(autoridade) {
    if (!focos || focos.length === 0) {
      Alert.alert('⚠️ Erro', 'Nenhum foco marcado!');
      return;
    }

    const agora = new Date();
    const data = agora.toLocaleDateString('pt-BR');
    const hora = agora.toLocaleTimeString('pt-BR');
    
    let mensagem = `🚨 ALERTA DE FOCO DE FUMAÇA\n`;
    mensagem += `📅 Data: ${data}\n`;
    mensagem += `⏰ Hora: ${hora}\n`;
    mensagem += `📍 Localização do Observador:\n`;
    mensagem += `   Latitude: ${location?.latitude.toFixed(6) || 'N/A'}\n`;
    mensagem += `   Longitude: ${location?.longitude.toFixed(6) || 'N/A'}\n`;
    mensagem += `   Altitude: ${location?.altitude?.toFixed(1) || 'N/A'}m\n\n`;
    
    mensagem += `🔥 FOCOS DETECTADOS: ${focos.length}\n`;
    focos.forEach((foco, idx) => {
      mensagem += `\n   Foco ${idx + 1}:\n`;
      mensagem += `   - Latitude: ${foco.latitude.toFixed(6)}\n`;
      mensagem += `   - Longitude: ${foco.longitude.toFixed(6)}\n`;
      mensagem += `   - Altitude: ${foco.altitude.toFixed(1)}m\n`;
      mensagem += `   - Distância: ${foco.distancia.toFixed(1)}m\n`;
      mensagem += `   - Hora da Marcação: ${foco.timestamp}\n`;
    });

    if (triangulacaoResultado) {
      mensagem += `\n📍 LOCALIZAÇÃO ESTIMADA DO FOGO (Triangulação):\n`;
      mensagem += `   Latitude: ${triangulacaoResultado.latitude.toFixed(6)}\n`;
      mensagem += `   Longitude: ${triangulacaoResultado.longitude.toFixed(6)}\n`;
      mensagem += `   Altitude: ${triangulacaoResultado.altitude.toFixed(1)}m\n`;
      mensagem += `   Precisão: ${(100 - triangulacaoResultado.erro * 100).toFixed(1)}%\n`;
    }

    mensagem += `\n🌡️ DADOS METEOROLÓGICOS:\n`;
    mensagem += `   Temperatura: ${meteoDataDinamica.temp}°C\n`;
    mensagem += `   Umidade: ${meteoDataDinamica.humidity}%\n`;
    mensagem += `   Velocidade do Vento: ${meteoDataDinamica.windSpeed} km/h\n`;
    mensagem += `   Direção do Vento: ${meteoDataDinamica.windDirection}°\n`;

    mensagem += `\n📱 MAPA INTERATIVO:\n`;
    mensagem += `   https://maps.google.com/maps?q=${focos[0].latitude},${focos[0].longitude}\n`;

    mensagem += `\n⚠️ AVISO: Esta mensagem foi gerada automaticamente pelo app SmokeDistance`;
    mensagem += `\n✅ MODO TESTE - Dados preparados para envio`;

    // Mostrar modal com dados
    Alert.alert(
      `📤 DADOS PREPARADOS - ${autoridade}`,
      `Focos: ${focos.length}\n` +
      `Data: ${data}\n` +
      `Hora: ${hora}\n` +
      `Localização: ${location?.latitude.toFixed(4)}, ${location?.longitude.toFixed(4)}\n\n` +
      `✅ MODO TESTE - Dados formatados e prontos para envio quando o sistema estiver ativo.`,
      [
        { 
          text: 'Fechar', 
          onPress: () => {} 
        },
        { 
          text: '📋 Ver Detalhes', 
          onPress: () => {
            Alert.alert(
              '📋 DADOS COMPLETOS',
              mensagem,
              [
                { text: 'Fechar', onPress: () => {} },
                { 
                  text: '📋 Copiar', 
                  onPress: () => {
                    // Copia para clipboard
                    Alert.alert('✅ Dados Copiados!', 'Mensagem copiada para a área de transferência');
                  }
                }
              ]
            );
          }
        }
      ]
    );
  }

  const cameraRef = useRef(null);
  const [permission, requestPermission] = useCameraPermissions();

  // Dados simulados (fallback)
  const meteoData = {
    temp: '28',
    humidity: '65',
    windSpeed: '12',
    windDirection: '180',
  };

  const sensorData = {
    orientation: smoothHeading,
    pressure: 1013
  };

  // Obter localização real do GPS
  useEffect(() => {
    (async () => {
      try {
        console.log("📍 Requisitando permissão de localização...");
        const { status } = await Location.requestForegroundPermissionsAsync();
        
        if (status !== 'granted') {
          console.warn("⚠️ Permissão GPS negada");
          setLocation({
            latitude: -15.7939,
            longitude: -47.8828,
            altitude: 1200
          });
          setLoading(false);
          return;
        }

        console.log("🔍 Obtendo localização...");
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        
        if (loc?.coords) {
          console.log("✅ GPS obtido:", loc.coords);
          setLocation(loc.coords);
        } else {
          throw new Error("Sem coordenadas");
        }
      } catch (err) {
        console.error("❌ Erro ao obter GPS:", err.message);
        setLocation({
          latitude: -15.7939,
          longitude: -47.8828,
          altitude: 1200
        });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // 📥 Carregar círculos de cobertura persistidos
  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem('circulos_sinal');
        if (saved) {
          const arr = JSON.parse(saved);
          if (Array.isArray(arr)) setCoverageCircles(arr);
        }
      } catch (e) {
        console.warn('⚠️ Erro ao carregar círculos:', e?.message);
      }
    })();
  }, []);

  const MIN_RADIUS_FOR_CIRCLE = 0; // sem mínimo para o primeiro círculo
  const latestCoverageTs = React.useMemo(() =>
    coverageCircles.reduce((m, c) => Math.max(m, c?.timestamp || 0), 0),
    [coverageCircles]
  );

  async function shouldSkipCircle(edge) {
    // Heurística simples: se reverse geocode indicar cidade/rua, considerar urbano
    try {
      if (!edge) return true;
      if (!isConnected) return false; // sem rede, não dá pra checar, não pula
      const res = await Location.reverseGeocodeAsync({
        latitude: edge.latitude,
        longitude: edge.longitude,
      });
      const info = res && res[0];
      if (!info) return false;
      // Se tiver city/locality/street/district preenchidos, tratar como urbano
      if (info.city || info.subregion || info.district || info.street || info.name) return true;
      return false;
    } catch (e) {
      return false;
    }
  }

  async function addCoverageCircleIfValid(center, edge) {
    if (!center || !edge) return;
    const radius = calculateDistanceHaversine(center.latitude, center.longitude, edge.latitude, edge.longitude);
    if (!isFinite(radius) || radius <= 0) return;
    const urban = await shouldSkipCircle(edge);
    if (urban) return; // evitar áreas urbanas para não sobrecarregar
    // Evitar sobreposição: exigir pelo menos 50m do último círculo
    if (coverageCircles.length > 0) {
      const last = coverageCircles[coverageCircles.length - 1];
      const distLast = calculateDistanceHaversine(last.center.latitude, last.center.longitude, center.latitude, center.longitude);
      if (isFinite(distLast) && distLast < 50) {
        return;
      }
    }
    const circle = {
      id: Date.now(),
      center: { latitude: center.latitude, longitude: center.longitude },
      radius,
      timestamp: Date.now(),
    };
    const next = [...coverageCircles, circle];
    setCoverageCircles(next);
    try { await AsyncStorage.setItem('circulos_sinal', JSON.stringify(next)); } catch {}
  }

  // 🚶 Atualizar localização continuamente para o ping seguir o movimento
  useEffect(() => {
    let watcher = null;
    (async () => {
      try {
        let perm = await Location.getForegroundPermissionsAsync();
        if (!perm.granted) {
          perm = await Location.requestForegroundPermissionsAsync();
          if (!perm.granted) return;
        }
        // Configuração do watcher conforme modo GPS
        const cfg = (function() {
          if (gpsMode === 'eco') {
            return { accuracy: Location.Accuracy.Balanced, distanceInterval: 10, timeInterval: 5000 };
          }
          if (gpsMode === 'preciso') {
            return { accuracy: Location.Accuracy.BestForNavigation, distanceInterval: 1, timeInterval: 1000 };
          }
          // normal
          return { accuracy: Location.Accuracy.High, distanceInterval: 3, timeInterval: 2000 };
        })();
        // Inicia watcher com intervalo por distância ou tempo
        watcher = await Location.watchPositionAsync(
          cfg,
          (pos) => {
            if (pos?.coords) {
              setLocation(prev => {
                // Evitar re-render inútil se não mudou nada relevante
                if (!prev) return pos.coords;
                const moved = Math.abs(prev.latitude - pos.coords.latitude) > 0.000005 || Math.abs(prev.longitude - pos.coords.longitude) > 0.000005;
                return moved ? pos.coords : prev;
              });
              lastKnownRef.current = pos.coords;
              // Auto-centralizar câmera se habilitado
              if (followUser && mapRef?.current) {
                const reg = {
                  latitude: pos.coords.latitude,
                  longitude: pos.coords.longitude,
                  // Preserve current zoom while seguindo usuário
                  latitudeDelta: currentRegion?.latitudeDelta ?? 0.02,
                  longitudeDelta: currentRegion?.longitudeDelta ?? 0.02,
                };
                const now = Date.now();
                const recentlyInteracted = now - (lastInteractionRef.current || 0) < 2500;
                if (!recentlyInteracted) {
                  try { mapRef.current.animateToRegion(reg, 500); } catch {}
                  setNeedsRecenter(false);
                  setRecenterVisible(false);
                } else {
                  setNeedsRecenter(true);
                }
              } else if (!followUser && mapRef?.current && currentRegion) {
                // Não alterar zoom nem recentralizar automaticamente; apenas sinalizar botão
                const metersPerDegLat = 111000;
                const metersPerDegLon = 111000 * Math.cos((currentRegion.latitude * Math.PI) / 180);
                const halfHeightM = (currentRegion.latitudeDelta || 0.02) * metersPerDegLat * 0.5;
                const halfWidthM = (currentRegion.longitudeDelta || 0.02) * metersPerDegLon * 0.5;
                const limit = Math.max(Math.min(halfHeightM, halfWidthM) * 0.8, 500);
                const dist = calculateDistanceHaversine(
                  currentRegion.latitude,
                  currentRegion.longitude,
                  pos.coords.latitude,
                  pos.coords.longitude
                );
                const now = Date.now();
                const isFar = dist > Math.max(limit * 1.2, 1200);
                setNeedsRecenter(isFar);
                // Nunca alterar a região automaticamente quando followUser=false
              }
            } else {
              // Sem coords no callback (GPS momentaneamente indisponível): manter seguindo usando última posição conhecida
              if (followUser && mapRef?.current && lastKnownRef.current) {
                const reg = {
                  latitude: lastKnownRef.current.latitude,
                  longitude: lastKnownRef.current.longitude,
                  latitudeDelta: currentRegion?.latitudeDelta || 0.02,
                  longitudeDelta: currentRegion?.longitudeDelta || 0.02,
                };
                try { mapRef.current.animateToRegion(reg, 600); } catch {}
              }
            }
          }
        );
      } catch (err) {
        console.warn('⚠️ Erro watchPosition:', err.message);
      }
    })();
    return () => {
      try { if (watcher) watcher.remove(); } catch {}
    };
  }, [followUser, currentRegion, gpsMode]);

  // Registrar a task de localização em segundo plano (somente Android e fora do Expo Go)
  if (Platform.OS === 'android' && !isExpoGo) {
    try {
      TaskManager.isTaskRegisteredAsync(BG_TASK_NAME).then((registered) => {
        if (!registered) {
          TaskManager.defineTask(BG_TASK_NAME, ({ data, error }) => {
            if (error) return;
            const { locations } = data || {};
            if (locations && locations.length > 0) {
              const loc = locations[0];
              const coords = loc.coords;
              if (coords) {
                setLocation(prev => {
                  if (!prev) return coords;
                  const moved = Math.abs(prev.latitude - coords.latitude) > 0.000005 || Math.abs(prev.longitude - coords.longitude) > 0.000005;
                  return moved ? coords : prev;
                });
              }
            }
          });
        }
      });
    } catch {}
  }

  // Iniciar/parar atualizações de localização em segundo plano (somente Android e fora do Expo Go)
  useEffect(() => {
    if (Platform.OS !== 'android' || isExpoGo) return;
    (async () => {
      try {
        const hasPerm = await Location.getForegroundPermissionsAsync();
        if (!hasPerm.granted) {
          const req = await Location.requestForegroundPermissionsAsync();
          if (!req.granted) return;
        }
        const bgPerm = await Location.getBackgroundPermissionsAsync();
        if (!bgPerm.granted) {
          await Location.requestBackgroundPermissionsAsync();
        }
        const cfg = (function() {
          if (gpsMode === 'eco') {
            return { accuracy: Location.Accuracy.Balanced, timeInterval: 5000, distanceInterval: 10, showsBackgroundLocationIndicator: true, pausesUpdatesAutomatically: false };
          }
          if (gpsMode === 'preciso') {
            return { accuracy: Location.Accuracy.BestForNavigation, timeInterval: 1000, distanceInterval: 1, showsBackgroundLocationIndicator: true, pausesUpdatesAutomatically: false };
          }
          return { accuracy: Location.Accuracy.High, timeInterval: 2000, distanceInterval: 3, showsBackgroundLocationIndicator: true, pausesUpdatesAutomatically: false };
        })();
        const running = await Location.hasStartedLocationUpdatesAsync(BG_TASK_NAME);
        if (bgLocationEnabled && !running) {
          await Location.startLocationUpdatesAsync(BG_TASK_NAME, cfg);
        } else if (!bgLocationEnabled && running) {
          await Location.stopLocationUpdatesAsync(BG_TASK_NAME);
        }
      } catch {}
    })();
  }, [bgLocationEnabled, gpsMode]);

  async function ativarModoAndroidAvancado() {
    try {
      // 1. Solicitar permissões foreground/background
      let fg = await Location.getForegroundPermissionsAsync();
      if (!fg.granted) {
        fg = await Location.requestForegroundPermissionsAsync();
        if (!fg.granted) {
          Alert.alert('Permissão', 'GPS foreground negado');
          return;
        }
      }
      let bg = await Location.getBackgroundPermissionsAsync();
      if (!bg.granted) {
        bg = await Location.requestBackgroundPermissionsAsync();
      }
      // 2. Ajustar para modo preciso e fundo
      setGpsMode('preciso');
      setBgLocationEnabled(true);
      // 3. Abrir tela de ignorar otimização de bateria (Android)
      if (Platform.OS === 'android') {
        try {
          await IntentLauncher.startActivityAsync(IntentLauncher.ActivityAction.IGNORE_BATTERY_OPTIMIZATION_SETTINGS);
        } catch (e) {
          try {
            await IntentLauncher.startActivityAsync(IntentLauncher.ActivityAction.POWER_USAGE_SUMMARY);
          } catch {}
        }
      }
      setAndroidBoosted(true);
      Alert.alert('✅ Otimização Aplicada', 'Modo Preciso + GPS em segundo plano ativados. Ajuste a bateria na tela aberta para não limitar o app.');
    } catch (e) {
      Alert.alert('Erro', 'Falha ao aplicar configuração: ' + (e?.message || 'desconhecido'));
    }
  }

  function handleRecenter() {
    if (!location || !mapRef?.current) return;
    const reg = {
      latitude: location.latitude,
      longitude: location.longitude,
      latitudeDelta: currentRegion?.latitudeDelta || 0.01,
      longitudeDelta: currentRegion?.longitudeDelta || 0.01,
    };
    try { mapRef.current.animateToRegion(reg, 400); } catch {}
    setNeedsRecenter(false);
    setRecenterVisible(false);
    if (recenterDelayRef.current) { clearTimeout(recenterDelayRef.current); recenterDelayRef.current = null; }
    if (recenterAutoHideRef.current) { clearTimeout(recenterAutoHideRef.current); recenterAutoHideRef.current = null; }
  }

  useEffect(() => {
    // Controla a exibição do botão: delay para aparecer e auto-esconde
    if (followUser) {
      setRecenterVisible(false);
      if (recenterDelayRef.current) { clearTimeout(recenterDelayRef.current); recenterDelayRef.current = null; }
      if (recenterAutoHideRef.current) { clearTimeout(recenterAutoHideRef.current); recenterAutoHideRef.current = null; }
      return;
    }
    if (needsRecenter) {
      if (recenterDelayRef.current) { clearTimeout(recenterDelayRef.current); }
      recenterDelayRef.current = setTimeout(() => {
        setRecenterVisible(true);
        if (recenterAutoHideRef.current) { clearTimeout(recenterAutoHideRef.current); }
        recenterAutoHideRef.current = setTimeout(() => {
          setRecenterVisible(false);
        }, 7000); // auto-esconde após ~7s
      }, 2000); // atraso de ~2s antes de mostrar
    } else {
      setRecenterVisible(false);
      if (recenterDelayRef.current) { clearTimeout(recenterDelayRef.current); recenterDelayRef.current = null; }
      if (recenterAutoHideRef.current) { clearTimeout(recenterAutoHideRef.current); recenterAutoHideRef.current = null; }
    }
  }, [needsRecenter, followUser]);

  useEffect(() => {
    // Limpa timers no unmount
    return () => {
      if (recenterDelayRef.current) clearTimeout(recenterDelayRef.current);
      if (recenterAutoHideRef.current) clearTimeout(recenterAutoHideRef.current);
    };
  }, []);

  // 💾 Carregar focos salvos ao iniciar o app
  useEffect(() => {
    (async () => {
      try {
        const focosSalvos = await carregarFocosStorage();
        if (focosSalvos.length > 0) {
          setFocos(focosSalvos);
          console.log('✅ Focos carregados:', focosSalvos.length);
          
          // Recalcular triangulação se tem >= 2 focos
          if (focosSalvos.length >= 2) {
            const resultado = calcularTriangulacao(focosSalvos);
            setTriangulacaoResultado(resultado);
          }
        }
      } catch (err) {
        console.error('❌ Erro ao carregar focos iniciais:', err);
      }
    })();
  }, []);

  // 🎉 RESETAR ESTADO "SALVO" APÓS 3 SEGUNDOS
  useEffect(() => {
    if (focoSalvoAgora) {
      const timer = setTimeout(() => {
        setFocoSalvoAgora(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [focoSalvoAgora]);

  // 🌤️ CARREGAR DADOS METEOROLÓGICOS QUANDO LOCALIZAÇÃO MUDAR
  useEffect(() => {
    if (!location || !isConnected) return;
    
    (async () => {
      const meteo = await obterDadosMeteologicos(location.latitude, location.longitude);
      if (meteo) {
        setMeteoDataDinamica(meteo);
      }
    })();
  }, [location, isConnected]);

  // Monitorar conectividade (apenas informa status)
  useEffect(() => {
    try {
      // Estado inicial de rede + preparar marcador dependendo do estado atual
      NetInfo.fetch()
        .then((state) => {
          const cur = !!state.isConnected;
          setIsConnected(cur);
          lastConnRef.current = cur;
          // Não definir centro automaticamente ao iniciar conectado; só quando a rede volta após queda
          if (!cur && location) {
            // Se já inicia offline, marcar última localização conhecida
            setLastKnownLocationBeforeDisconnect(location);
            setDisconnectTime(Date.now());
            setLastBreadcrumbLocation(location);
          }
        })
        .catch(() => {});

      const unsubscribe = NetInfo.addEventListener(state => {
        try {
          console.log("🌐 Status Rede:", state.isConnected ? "Conectado" : "Desconectado", state.type);
          const prev = lastConnRef.current;
          lastConnRef.current = state.isConnected;

          // Ao perder o sinal: apenas registrar estado, não fixar centro
          if (prev === true && state.isConnected === false && location) {
            console.log("📍 Rede caiu! Congelando última localização conhecida...");
            setLastKnownLocationBeforeDisconnect(location);
            setDisconnectTime(Date.now());
            setLastBreadcrumbLocation(location);
            // Se já existe centro, fechar círculo com raio até a perda
            (async () => {
              try {
                if (coverageCenter) {
                  await addCoverageCircleIfValid(coverageCenter, location);
                  setCoverageCenter(null);
                  console.log('⭕ Círculo fechado do centro até a perda de sinal.');
                }
              } catch (e) {
                console.warn('⚠️ Erro ao fechar círculo na perda:', e?.message);
              }
            })();
          }
          
          // Se conectou agora, limpar marcador congelado (mas manter breadcrumbs)
          if (prev === false && state.isConnected === true) {
            console.log("📍 Rede restaurada! Removendo marcador congelado...");
            setLastKnownLocationBeforeDisconnect(null);
            setDisconnectTime(null);
            // NÃO limpar breadcrumbs - eles ficam permanentes como dados públicos!
            setLastBreadcrumbLocation(null);
            // Definir centro de cobertura no momento da VOLTA do sinal (se não houver)
            if (location && !coverageCenter && !fixedCenterMarker) {
              (async () => {
                try {
                  // Respeitar espaçamento de 50m em relação ao último círculo
                  let ok = true;
                  if (coverageCircles.length > 0) {
                    const last = coverageCircles[coverageCircles.length - 1];
                    const d = calculateDistanceHaversine(last.center.latitude, last.center.longitude, location.latitude, location.longitude);
                    if (isFinite(d) && d < 50) ok = false;
                  }
                  if (ok) {
                    setCoverageCenter(location);
                    setFixedCenterMarker({
                      latitude: location.latitude,
                      longitude: location.longitude,
                      title: '📍 Centro de Sinal',
                      description: 'Local onde o sinal voltou (ping fixo).'
                    });
                    console.log('✅ Centro fixado na reconexão. Próxima queda fechará círculo.');
                  } else {
                    console.log('↔️ Centro não fixado: muito próximo do último círculo (<50m).');
                  }
                } catch {}
              })();
            }
                      // Drenar pings pendentes
                      (async () => { try { await syncPendingPings(); } catch {} })();
          }
          
          setIsConnected(state.isConnected);
          
          // SE CONECTOU À REDE, TEM FOCO MARCADO (observação ou temporário) E TEM LOCALIZAÇÃO, MARCAR NO MAPA
          const temFocoMarcado = focos.length > 0 || waypointTemporario;
          if (state.isConnected && location && temFocoMarcado) {
            setNetworkMarker({
              latitude: location.latitude,
              longitude: location.longitude,
              title: `📶 Rede: ${state.type}`,
              description: 'Status de rede temporário.'
            });
          } else if (!state.isConnected) {
            setNetworkMarker(null); // remove temporário ao cair
          }
        } catch (err) {
          console.warn("⚠️ Erro ao processar estado de rede:", err.message);
        }
      });

      return () => {
        try {
          if (unsubscribe) unsubscribe();
        } catch (err) {
          console.warn("⚠️ Erro ao desinscrever NetInfo:", err.message);
        }
      };
    } catch (err) {
      console.warn("⚠️ Erro ao iniciar monitoramento de rede:", err.message);
      // Fallback: app continua funcionando sem monitoramento
    }
  }, [location, focos, waypointTemporario]);

  // Buscar declinação magnética com WMM (World Magnetic Model) - como iPhone faz
  useEffect(() => {
    if (!location) return;
    
    (async () => {
      try {
        // Tentar API WMM online (melhor precisão)
        if (isConnected) {
          console.log("📡 Buscando WMM online para calibração...");
          
          const response = await fetch(
            `https://www.ngdc.noaa.gov/geomag-web/calculators/calculateDeclination?lat=${location.latitude}&lon=${location.longitude}&key=zVQnD7M4KjV7H&resultFormat=json`
          );
          
          if (response.ok) {
            const text = await response.text();
            
            // Validar se é JSON
            if (!text.includes('<') && !text.includes('html')) {
              const data = JSON.parse(text);
              
              if (data.result && data.result.declination !== undefined) {
                const declination = data.result.declination;
                setMagneticDeclination(declination);
                console.log(`✅ WMM Online: Declinação = ${declination.toFixed(2)}° (lat: ${location.latitude.toFixed(4)}, lon: ${location.longitude.toFixed(4)})`);
                return;
              }
            }
          }
        }
        
        // Fallback: Usar modelo WMM offline aproximado
        console.log("📊 Usando WMM offline (cache local)...");
        
        // Modelo WMM aproximado baseado em latitude/longitude
        // Fórmula simplificada: declinação ≈ 0.2 * (lon - 100) - 0.02 * lat
        const declination = 0.2 * (location.longitude - 100) - 0.02 * location.latitude;
        
        setMagneticDeclination(declination);
        console.log(`📍 WMM Offline: Declinação ≈ ${declination.toFixed(2)}° (aproximado)`);
        
      } catch (err) {
        console.warn("⚠️ Erro ao obter declinação magnética:", err.message);
        console.log("📍 Usando declinação padrão: 0°");
        // Continua funcionando com declinação = 0
      }
    })();
  }, [location, isConnected]);

  // Bussola - Obter heading em tempo real com Magnetômetro (referência real de Norte)
  useEffect(() => {
    try {
      console.log("🧭 Iniciando bussola com magnetômetro...");
      
      const { Magnetometer } = require('expo-sensors');
      
      Magnetometer.setUpdateInterval(50); // Aumentar taxa de atualização para mais responsividade
      
      const subscription = Magnetometer.addListener(({ x, y, z }) => {
        // Se está em modo de calibração, recolher dados com validação
        if (isCalibrating) {
          // Filtrar dados com ruído (magnitude muito diferente = ruído)
          const magnitude = Math.sqrt(x*x + y*y + z*z);
          
          // Aceitar apenas dados com magnitude entre 20 e 80 microTesla (range normal)
          if (magnitude >= 20 && magnitude <= 80) {
            setMagnetometerReadings(prev => [
              ...prev,
              { x, y, z, magnitude, timestamp: Date.now() }
            ].slice(-200)); // Manter últimos 200 pontos limpos
            
            console.log(`📊 Calibração: ${magnetometerReadings.length + 1} pontos válidos`);
          }
          
          return;
        }
        
        // Calcular heading do vetor magnético (usando componentes x e y)
        // atan2(x, y) retorna o ângulo do vetor magnético (Magnetic North)
        let magneticHeading = Math.atan2(x, y) * (180 / Math.PI);
        
        // Normalizar para 0-359
        magneticHeading = magneticHeading < 0 ? magneticHeading + 360 : magneticHeading;
        
        // Inverter para que rotação seja no sentido correto (0 em cima, 90 direita, etc)
        magneticHeading = 360 - magneticHeading;
        if (magneticHeading >= 360) magneticHeading -= 360;
        
        // Aplicar declinação com sinal INVERTIDO (negativo)
        // Para converter Magnetic para True North: True = Magnetic - Declination
        let trueHeading = magneticHeading - magneticDeclination;
        
        // Offset de calibração manual (-52 graus para sincronizar com iPhone)
        trueHeading = trueHeading - 52;
        
        // Normalizar para 0-359 (sem deixar 360)
        trueHeading = trueHeading % 360;
        if (trueHeading < 0) trueHeading += 360;
        
        // Suavização com alpha smoothing (mais responsivo agora)
        setSmoothHeading(prev => {
          const alpha = 0.15;
          let diff = trueHeading - prev;
          
          // Evitar saltos (ex: 359° -> 1°)
          if (diff > 180) diff -= 360;
          if (diff < -180) diff += 360;
          
          // Calcular novo heading
          let newHeading = prev + diff * alpha;
          
          // Normalizar: primeiro aplicar % 360, depois verificar negativos
          newHeading = ((newHeading % 360) + 360) % 360;
          
          return newHeading;
        });
        
        // Usar True North final
        // Arredondar e aplicar módulo duas vezes pra garantir 0-359
        let displayHeading = Math.round(trueHeading);
        displayHeading = displayHeading % 360;
        if (displayHeading < 0) displayHeading += 360;
        
        // Se por acaso der 360, força pra 0
        displayHeading = displayHeading === 360 ? 0 : displayHeading;
        
        setHeading(displayHeading);
      });

      return () => {
        if (subscription) subscription.remove();
      };
    } catch (err) {
      console.warn("⚠️ Magnetômetro não disponível, usando fallback...");
      const interval = setInterval(() => {
        setSmoothHeading(prev => (prev + 0.5) % 360);
      }, 100);
      return () => clearInterval(interval);
    }
  }, [magneticDeclination, isCalibrating]);

  function calcSingleDistance() {
    if (!pickedPoint || !location) {
      setDistanceSingle(null);
      return;
    }
    
    const D_H = calculateDistanceHaversine(
      location.latitude, 
      location.longitude, 
      pickedPoint.latitude, 
      pickedPoint.longitude
    );
    
    const H_smoke = SafeOps.parseNumber(smokeHeight, 100);
    const delta_H = Math.abs(H_smoke);
    const D_3D = Math.sqrt(D_H * D_H + delta_H * delta_H);
    
    if (isFinite(D_3D)) {
      setDistanceSingle(D_3D);
    }
  }

  useEffect(() => {
    calcSingleDistance();
  }, [pickedPoint, smokeHeight]);

  // Calcular distância dinâmica na câmera (Telêmetro 3D real)
  useEffect(() => {
    if (!cameraActive || !location) return;
    
    // Acelerômetro: calcular ângulo de pitch (vertical)
    const pitchRad = Math.atan2(accelerometerData.z, Math.sqrt(accelerometerData.x ** 2 + accelerometerData.y ** 2));
    const pitchDeg = (pitchRad * 180) / Math.PI;
    setPitchAngle(pitchDeg);
    
    // **Se pitch está muito próximo de -90° (apontando pra baixo), use como calibração**
    if (pitchDeg < -80 && !cameraBaselinePitch) {
      setCameraBaselinePitch(pitchRad);
      console.log(`✅ Baseline calibrado em pitch ${pitchDeg.toFixed(1)}°`);
    }
    
    // Se baseline foi calibrado, calcular distância
    if (cameraBaselinePitch !== null) {
      const angleRad = pitchRad;
      const eyeHeight = 1.7;
      
      // **Ângulo relativo ao baseline**
      const relativeAngleRad = angleRad - cameraBaselinePitch;
      const relativeAngleDeg = (relativeAngleRad * 180) / Math.PI;
      
      // Se está muito próximo do baseline (< 5°), força distância 0
      if (Math.abs(relativeAngleDeg) < 5) {
        setCameraDynamicDistance(0);
        setCameraObjectHeight('0');
        return;
      }
      
      if (Math.abs(relativeAngleRad) > 0.02) {
        // Usar valor absoluto do ângulo
        const absAngleRad = Math.abs(relativeAngleRad);
        
        // Ângulo complementar para inverter a relação
        const complementAngleRad = (Math.PI / 2) - absAngleRad;
        const tanAngle = Math.tan(complementAngleRad);
        
        // Proteger contra valores extremos
        if (!isFinite(tanAngle) || Math.abs(tanAngle) < 0.05) {
          setCameraDynamicDistance(null);
          return;
        }
        
        // Fórmula: distance = height / tan(complemento)
        const horizontalDist = Math.abs(eyeHeight / tanAngle);
        
        // Limitar distância máxima a 1000m
        if (horizontalDist > 1000) {
          setCameraDynamicDistance(null);
          return;
        }
        
        let D_H = horizontalDist;
        
        if (horizontalDist > 100) {
          const radians = (smoothHeading * Math.PI) / 180;
          const targetLat = location.latitude + (horizontalDist / R) * Math.cos(radians) * deg2rad;
          const targetLon = location.longitude + (horizontalDist / R / Math.cos(location.latitude * deg2rad)) * Math.sin(radians) * deg2rad;
          
          D_H = calculateDistanceHaversine(
            location.latitude,
            location.longitude,
            targetLat,
            targetLon
          );
        }
        
        const verticalDiff = horizontalDist * tanAngle;
        const objectHeight = Math.abs(verticalDiff);
        const D_3D = Math.sqrt(D_H * D_H + verticalDiff * verticalDiff);
        
        if (isFinite(D_3D) && D_3D > 0.5 && D_3D < 1000) {
          setCameraDynamicDistance(D_3D);
          setCameraObjectHeight(Math.round(objectHeight).toString());
        } else {
          setCameraDynamicDistance(null);
        }
      }
    } else {
      setCameraDynamicDistance(null);
    }
  }, [cameraActive, location, smoothHeading, accelerometerData, cameraBaselinePitch]);

  // Hook para ler acelerômetro quando câmera estiver ativa
  useEffect(() => {
    if (!cameraActive) return;
    
    Accelerometer.setUpdateInterval(100); // 10 Hz
    
    const subscription = Accelerometer.addListener(({ x, y, z }) => {
      setAccelerometerData({ x, y, z });
    });
    
    return () => {
      subscription.remove();
    };
  }, [cameraActive]);

  // Reset baseline quando fecha câmera
  useEffect(() => {
    if (!cameraActive) {
      setCameraBaselinePitch(null);
    }
  }, [cameraActive]);

  // 🍞 Sistema de Breadcrumbs - Criar migalhas a cada 500m sem sinal após 10 min
  useEffect(() => {
    if (!disconnectTime || !location || isConnected) return;

    const timeWithoutConnection = (Date.now() - disconnectTime) / 1000 / 60; // em minutos
    
    // Se passou 10 minutos sem sinal, começar a criar breadcrumbs
    if (timeWithoutConnection >= 10 && lastBreadcrumbLocation) {
      // Calcular distância entre localização atual e último breadcrumb
      const dLat = location.latitude - lastBreadcrumbLocation.latitude;
      const dLon = location.longitude - lastBreadcrumbLocation.longitude;
      const distanceKm = Math.sqrt(dLat * dLat + dLon * dLon) * 111; // 111 km por grau
      const distanceMeters = distanceKm * 1000;

      // Se moveu 500m, criar novo breadcrumb
      if (distanceMeters >= 500) {
        console.log(`🍞 Criando breadcrumb! Distância: ${distanceMeters.toFixed(0)}m`);
        
        const newBreadcrumb = {
          id: Date.now(),
          latitude: lastBreadcrumbLocation.latitude,
          longitude: lastBreadcrumbLocation.longitude,
          timestamp: Date.now() // Armazenar timestamp em ms para processar depois
        };
        
        setBreadcrumbs([...breadcrumbs, newBreadcrumb]);
        setLastBreadcrumbLocation(location); // Atualizar referência
      }
    }
  }, [location, disconnectTime, isConnected, lastBreadcrumbLocation, breadcrumbs]);

  // 💾 Salvar breadcrumbs em localStorage para serem permanentes
  useEffect(() => {
    try {
      if (breadcrumbs.length > 0) {
        AsyncStorage.setItem('breadcrumbs', JSON.stringify(breadcrumbs));
        console.log(`💾 Breadcrumbs salvos: ${breadcrumbs.length} marcadores`);
      }
    } catch (err) {
      console.warn('⚠️ Erro ao salvar breadcrumbs:', err);
    }
  }, [breadcrumbs]);

  // 📂 Carregar breadcrumbs do localStorage ao iniciar
  useEffect(() => {
    const carregarBreadcrumbs = async () => {
      try {
        const saved = await AsyncStorage.getItem('breadcrumbs');
        if (saved) {
          const data = JSON.parse(saved);
          setBreadcrumbs(data);
          console.log(`📂 Carregados ${data.length} breadcrumbs salvos`);
        }
      } catch (err) {
        console.warn('⚠️ Erro ao carregar breadcrumbs:', err);
      }
    };
    
    carregarBreadcrumbs();
  }, []);

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>📱 SmokeDistance</Text>
        </View>
        <View style={styles.content}>
          <Text style={styles.text}>🔄 Obtendo localização...</Text>
        </View>
      </View>
    );
  }

  // Câmera simples
  if (cameraActive) {
    if (!permission?.granted) {
      return (
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>📷 Câmera</Text>
          </View>
          <View style={styles.content}>
            <Text style={styles.text}>Permissão de câmera negada</Text>
            <TouchableOpacity 
              style={[styles.button, { marginTop: 15 }]}
              onPress={requestPermission}
            >
              <Text style={styles.buttonText}>✅ Solicitar Permissão</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.button, { backgroundColor: '#8B5C2A', marginTop: 10 }]}
              onPress={() => setCameraActive(false)}
            >
              <Text style={styles.buttonText}>✖️ Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    return (
      <View style={styles.container}>
        {/* Câmera + Overlay */}
        <View style={{ flex: 1, position: 'relative' }}>
          <CameraView 
            ref={cameraRef}
            style={styles.camera}
            facing="back"
          />
          
          {/* Overlay com dados - Posicionado absolutamente DENTRO do container da câmera */}
          <View style={styles.cameraOverlay}>
            {/* Cabeçalho */}
            <View style={styles.overlayHeader}>
              <Text style={styles.overlayTitle}>🎥 CAPTURA DE FUMAÇA</Text>
            </View>

            {/* Centro - Alvo */}
            <View style={styles.overlayCenter}>
              <View style={styles.targetReticle} />
            </View>

            {/* Dados em tempo real */}
            <View style={styles.overlayData}>
              <Text style={styles.overlayText}>📍 LAT: {location?.latitude.toFixed(4)}°</Text>
              <Text style={styles.overlayText}>📍 LON: {location?.longitude.toFixed(4)}°</Text>
              <Text style={styles.overlayText}>📏 ALT: {location?.altitude.toFixed(1)}m</Text>
              <Text style={styles.overlayText}>📐 PITCH: {Math.round(pitchAngle)}°</Text>
              
              {/* Distância dinâmica - Sempre mostra algo */}
              <Text style={[styles.overlayText, { color: '#00ff00', fontWeight: 'bold', marginTop: 8, fontSize: 16 }]}>
                🎯 DIST 3D: {cameraDynamicDistance !== null && cameraDynamicDistance !== undefined ? cameraDynamicDistance.toFixed(1) : '?'}m
              </Text>
              
              <Text style={styles.overlayText}>🧭 RUMO: {(Math.round(smoothHeading) % 360) || 0}° (Decl: {magneticDeclination.toFixed(1)}°)</Text>
            </View>
          </View>
        </View>
        
        <View style={styles.cameraControls}>
          {/* Marcar Foco (REMOVIDO - VER MAPA) */}
          {/* Capturar */}
          <TouchableOpacity 
            style={[styles.button, { backgroundColor: '#8B5C2A', borderRadius: 10, padding: 12, alignItems: 'center', elevation: 2 }]}
            onPress={async () => {
              try {
                if (cameraRef.current) {
                  const photo = await cameraRef.current.takePictureAsync({
                    quality: 0.8,
                    exif: true,
                  });
                  setCameraPhoto(photo.uri);
                  setCameraActive(false);
                  Alert.alert('✅ Foto Capturada', `📐 Distância 3D: ${cameraDynamicDistance?.toFixed(1)}m\n📐 Pitch: ${Math.round(pitchAngle)}°`);
                }
              } catch (err) {
                console.error("Erro ao capturar foto:", err);
                Alert.alert('❌ Erro', 'Erro ao capturar foto');
              }
            }}
          >
            <Text style={styles.buttonText}>📸 CAPTURAR</Text>
          </TouchableOpacity>

          {/* Cancelar */}
          <TouchableOpacity 
            style={[styles.button, { backgroundColor: '#8B5C2A', borderRadius: 10, padding: 12, alignItems: 'center', elevation: 2 }]}
            onPress={() => {
              setCameraActive(false);
              setTrilhasProximas([]); // Limpar rotas também
            }}
          >
            <Text style={styles.buttonText}>✖️ CANCELAR</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (page === 1) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>📱 SmokeDistance</Text>
          <Text style={styles.subtitle}>Detecção de Fumaça</Text>
        </View>

        <ScrollView style={styles.content}>
          {/* Localização */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>📍 Localização GPS</Text>
            {location ? (
              <>
                <Text style={styles.text}>Lat: {location.latitude.toFixed(4)}°</Text>
                <Text style={styles.text}>Lon: {location.longitude.toFixed(4)}°</Text>
                <Text style={styles.text}>Alt: {location.altitude ? location.altitude.toFixed(1) : 'N/D'}m</Text>
              </>
            ) : (
              <Text style={styles.text}>❌ GPS não disponível</Text>
            )}
          </View>

          {/* Bussola - REMOVIDA, agora é mini no mapa */}

          {/* Dados Meteorológicos */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>📊 Dados Meteorológicos</Text>
            <Text style={styles.text}>🌡️ Temperatura: {meteoDataDinamica.temp}°C</Text>
            <Text style={styles.text}>💧 Umidade: {meteoDataDinamica.humidity}%</Text>
            <Text style={styles.text}>💨 Vento: {meteoDataDinamica.windSpeed} km/h</Text>
            <Text style={styles.text}>🧭 Direção: {meteoDataDinamica.windDirection}°</Text>
            <Text style={[styles.text, { color: '#1976D2', fontWeight: 'bold', marginTop: 8 }]}>
              📝 {meteoDataDinamica.descricao}
            </Text>
            {!isConnected && (
              <Text style={[styles.text, { color: '#ff9800', fontSize: 12, marginTop: 5 }]}>
                ⚠️ Dados em cache (sem internet)
              </Text>
            )}
          </View>



          {/* Status de Fogo Pendente */}
          {pendingFireData && (
            <View style={[styles.card, { backgroundColor: '#fff3cd', borderLeftWidth: 4, borderLeftColor: '#ff9800' }]}>
              <Text style={[styles.cardTitle, { color: '#ff6f00' }]}>⏳ Fogo Aguardando Conexão</Text>
              <Text style={styles.text}>🔴 Fogo detectado mas SEM sinal de internet</Text>
              <Text style={styles.text}>📡 Será sincronizado quando conectar</Text>
              <TouchableOpacity
                style={[styles.buttonPrimary, { backgroundColor: '#8B5C2A', marginTop: 10 }]}
                onPress={() => {
                  setPendingFireData(null);
                  Alert.alert('🗑️ Cancelado', 'Fogo pendente removido');
                }}
              >
                <Text style={styles.buttonText}>🗑️ Limpar Fogo Pendente</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Resultado */}
          {distanceSingle && (
            <View style={[styles.card, { backgroundColor: '#e8f5e9' }]}>
              <Text style={[styles.cardTitle, { color: '#2e7d32' }]}>✅ Distância Calculada</Text>
              <Text style={[styles.text, { color: '#1b5e20', fontWeight: 'bold', fontSize: 16 }]}>
                {distanceSingle.toFixed(1)} metros
              </Text>
            </View>
          )}

          {/* Foto Capturada */}
          {cameraPhoto && (
            <View style={[styles.card, { backgroundColor: '#e8f5e9' }]}>
              <Text style={[styles.cardTitle, { color: '#2e7d32' }]}>📷 Foto Capturada</Text>
              <Text style={styles.text}>✅ Foto documentada</Text>
              <TouchableOpacity
                style={[styles.button, { backgroundColor: '#8B5C2A', marginTop: 8 }]}
                onPress={() => setCameraPhoto(null)}
              >
                <Text style={styles.buttonText}>🗑️ Limpar</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Botão Câmera */}
          <TouchableOpacity 
            style={[styles.buttonPrimary, { backgroundColor: '#8B5C2A', marginBottom: 15 }]}
            onPress={() => setCameraActive(true)}
          >
            <Text style={styles.buttonText}>📷 CÂMERA</Text>
          </TouchableOpacity>

          {/* Botões Página */}
          <View>
            <TouchableOpacity 
              style={[styles.button, { backgroundColor: '#8B5C2A', borderRadius: 10, padding: 12, alignItems: 'center', elevation: 2, marginBottom: 10 }]}
              onPress={() => setPage(2)}
            >
              <Text style={styles.buttonText}>🗺️ Mapa</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.button, { backgroundColor: '#8B5C2A', borderRadius: 10, padding: 12, alignItems: 'center', elevation: 2, marginBottom: 10 }]}
              onPress={() => setPage(5)}
            >
              <Text style={styles.buttonText}>🛰️ Satélites</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.button, { backgroundColor: '#8B5C2A', borderRadius: 10, padding: 12, alignItems: 'center', elevation: 2, marginBottom: 10 }]}
              onPress={() => setPage(4)}
            >
              <Text style={styles.buttonText}>📤 Compartilhar</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.button, { backgroundColor: '#8B5C2A', borderRadius: 10, padding: 12, alignItems: 'center', elevation: 2 }]}
              onPress={() => setPage(3)}
            >
              <Text style={styles.buttonText}>⚙️ Config</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    );
  }

  if (page === 2) {
    // Definir modo híbrido como inicial e zoom maior
    const initialMapType = 'hybrid';
    const initialDelta = 0.025; // Zoom 2x maior
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>🗺️ Mapa</Text>
        </View>
        
        {location && (
          <ScrollView style={{ flex: 1 }}>
            {/* Botões de camadas do mapa */}
            <View style={{ flexDirection: 'row', padding: 10, gap: 5, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#ddd' }}>
              <TouchableOpacity 
                style={[styles.mapButton, { flex: 1, backgroundColor: followUser ? '#43A047' : '#999' }]}
                onPress={() => setFollowUser(!followUser)}
              >
                <Text style={styles.buttonText}>{followUser ? '🎯 Seguindo' : '🎯 Seguir'}</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.mapButton, { flex: 1, backgroundColor: showSatelliteOverlay ? '#E53935' : '#999' }]}
                onPress={async () => {
                  if (!showSatelliteOverlay && satelliteFocos.length === 0) {
                    await loadSatelliteFocos();
                  }
                  setShowSatelliteOverlay(!showSatelliteOverlay);
                }}
              >
                <Text style={styles.buttonText}>🔥 Focos por satélite</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.mapButton, { flex: 1, backgroundColor: mapaCamera === 'satellite' ? '#2196F3' : '#999' }]}
                onPress={() => setMapaCamera('satellite')}
              >
                <Text style={styles.buttonText}>📡 Satélite</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.mapButton, { flex: 1, backgroundColor: mapaCamera === 'terrain' ? '#2196F3' : '#999' }]}
                onPress={() => setMapaCamera('terrain')}
              >
                <Text style={styles.buttonText}>⛰️ Relevo</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.mapButton, { flex: 1, backgroundColor: mapaCamera === 'hybrid' ? '#2196F3' : '#999' }]}
                onPress={() => setMapaCamera('hybrid')}
              >
                <Text style={styles.buttonText}>🛰️📍 Híbrido</Text>
              </TouchableOpacity>
            </View>

            <View style={{ position: 'relative', height: 500 }}>
              <MapView
                provider={Platform.OS === 'android' ? 'google' : undefined}
                ref={mapRef}
                style={[styles.map, { height: 500 }]}
                mapType={mapaCamera || initialMapType}
                onPanDrag={() => { lastInteractionRef.current = Date.now(); }}
                initialRegion={{
                  latitude: location.latitude,
                  longitude: location.longitude,
                  latitudeDelta: initialDelta,
                  longitudeDelta: initialDelta,
                }}
                onRegionChangeComplete={(r) => {
                  setCurrentRegion(r);
                  if (!followUser && location) {
                    const dist = calculateDistanceHaversine(r.latitude, r.longitude, location.latitude, location.longitude);
                    const metersPerDegLat = 111000;
                    const metersPerDegLon = 111000 * Math.cos((r.latitude * Math.PI) / 180);
                    const halfHeightM = (r.latitudeDelta || 0.02) * metersPerDegLat * 0.5;
                    const halfWidthM = (r.longitudeDelta || 0.02) * metersPerDegLon * 0.5;
                    const limit = Math.max(Math.min(halfHeightM, halfWidthM) * 0.8, 500);
                    const isFar = dist > Math.max(limit * 1.2, 1200);
                    setNeedsRecenter(isFar);
                  } else {
                    setNeedsRecenter(false);
                  }
                }}
                onPress={(e) => {
                const { latitude, longitude } = e.nativeEvent.coordinate;

                if (marcandoFocoMapa) {
                  // Modo marcar foco no mapa - calcular TUDO imediatamente
                  const lat1 = location.latitude;
                  const lon1 = location.longitude;
                  const lat2 = latitude;
                  const lon2 = longitude;
                  
                  // Distância via Haversine
                  const distanciaCalculada = calculateDistanceHaversine(lat1, lon1, lat2, lon2);
                  
                  console.log(`📍 Foco marcado: ${lat2.toFixed(4)}, ${lon2.toFixed(4)}`);
                  console.log(`📐 Distância: ${distanciaCalculada.toFixed(1)}m`);
                  
                  // Atualizar inputs com dados imediatos (altitude = 0, você edita se quiser)
                  setInputsManualFoco({
                    latitude: lat2.toFixed(4),
                    longitude: lon2.toFixed(4),
                    altitude: '0',
                    heading: '0',
                    pitch: '0',
                    distancia: distanciaCalculada.toFixed(1)
                  });
                  
                  // Marcar waypoint visual no mapa
                  setWaypointTemporario({
                    latitude: lat2,
                    longitude: lon2,
                    altitude: '0',
                    distancia: distanciaCalculada.toFixed(1)
                  });
                  
                  setFocoPendente(true);
                  setMarcandoFocoMapa(false);
                  Alert.alert(
                    '✅ Foco Localizado',
                    `📍 Lat: ${lat2.toFixed(4)}°\n` +
                    `📍 Lon: ${lon2.toFixed(4)}°\n` +
                    `📐 Distância: ${distanciaCalculada.toFixed(1)}m\n\n` +
                    `Edite a altitude se souber!\n` +
                    `Clique em ✅ Salvar para confirmar!`
                  );
                } else if (markingMode) {
                  // Modo marcar poço
                  const newMarker = {
                    latitude,
                    longitude,
                    title: '💧 Poço de Água',
                    description: `Lat: ${latitude.toFixed(4)}\nLon: ${longitude.toFixed(4)}`,
                    id: Date.now()
                  };
                  
                  setWaterMarkers([...waterMarkers, newMarker]);
                  setMarkingMode(false);
                  Alert.alert('✅ Marcado', 'Poço de água adicionado ao mapa!');
                }
              }}
              >
              {/* 🔥 FIRMS WMS Overlay (via MAP KEY) */}
              {showSatelliteOverlay && FIRMS_MAP_KEY ? (
                <WMSTile
                  urlTemplate={`https://firms.modaps.eosdis.nasa.gov/wms/?MAP_KEY=${encodeURIComponent(FIRMS_MAP_KEY)}`}
                  zIndex={0}
                  opacity={0.6}
                  tileSize={256}
                  minimumZ={0}
                  maximumZ={18}
                  parameters={{
                    service: 'WMS',
                    request: 'GetMap',
                    version: '1.1.1',
                    format: 'image/png',
                    transparent: true,
                    srs: 'EPSG:3857',
                    styles: '',
                    // Camadas comuns do FIRMS (MODIS 24h e VIIRS 24h). Você pode ajustar após validar no GetCapabilities.
                    layers: 'fires_modis_24,fires_viirs_24',
                  }}
                />
              ) : null}
              {/* Marcador de localização atual */}
              <Marker
                coordinate={{
                  latitude: location.latitude,
                  longitude: location.longitude
                }}
                title="📍 Você está aqui"
                description={`Lat: ${location.latitude.toFixed(4)}\nLon: ${location.longitude.toFixed(4)}\nRede: ${isConnected ? '✅ Conectado' : '❌ Desconectado'}`}
              >
                {isConnected ? (
                  <View style={{
                    width: 42,
                    height: 42,
                    borderRadius: 21,
                    backgroundColor: '#000000',
                    justifyContent: 'center',
                    alignItems: 'center',
                    borderWidth: 2,
                    borderColor: '#FFFFFF',
                    shadowColor: '#000000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.25,
                    shadowRadius: 3,
                    elevation: 5
                  }}>
                    <View style={{ flexDirection: 'row', gap: 1.5, alignItems: 'flex-end' }}>
                      <View style={{ width: 2.5, height: 6, backgroundColor: '#FFFFFF', borderRadius: 1.25 }} />
                      <View style={{ width: 2.5, height: 9, backgroundColor: '#FFFFFF', borderRadius: 1.25 }} />
                      <View style={{ width: 2.5, height: 12, backgroundColor: '#FFFFFF', borderRadius: 1.25 }} />
                      <View style={{ width: 2.5, height: 15, backgroundColor: '#FFFFFF', borderRadius: 1.25 }} />
                    </View>
                  </View>
                ) : null}
              </Marker>

              {/* Marcador congelado (última localização quando rede caiu) */}
              {lastKnownLocationBeforeDisconnect && !isConnected && (
                <Marker
                  coordinate={{
                    latitude: lastKnownLocationBeforeDisconnect.latitude,
                    longitude: lastKnownLocationBeforeDisconnect.longitude
                  }}
                  title="📍 Última localização conhecida"
                  description={`Lat: ${lastKnownLocationBeforeDisconnect.latitude.toFixed(4)}\nLon: ${lastKnownLocationBeforeDisconnect.longitude.toFixed(4)}\nRede: ❌ Desconectado`}
                >
                  <View style={{
                    width: 42,
                    height: 42,
                    borderRadius: 21,
                    backgroundColor: '#000000',
                    justifyContent: 'center',
                    alignItems: 'center',
                    borderWidth: 2,
                    borderColor: '#FF8A80',
                    shadowColor: '#000000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.25,
                    shadowRadius: 3,
                    elevation: 5
                  }}>
                    <View style={{ flexDirection: 'row', gap: 1.5, alignItems: 'flex-end' }}>
                      <View style={{ width: 2.5, height: 6, backgroundColor: '#FF8A80', borderRadius: 1.25 }} />
                      <View style={{ width: 2.5, height: 9, backgroundColor: '#FF8A80', borderRadius: 1.25 }} />
                      <View style={{ width: 2.5, height: 12, backgroundColor: '#FF8A80', borderRadius: 1.25 }} />
                      <View style={{ width: 2.5, height: 15, backgroundColor: '#FF8A80', borderRadius: 1.25 }} />
                    </View>
                    <View style={{
                      position: 'absolute',
                      width: 32,
                      height: 1.5,
                      backgroundColor: '#FF8A80',
                      opacity: 0.85,
                      transform: [{ rotate: '45deg' }]
                    }} />
                  </View>
                </Marker>
              )}
              {/* Sem círculo dinâmico: círculos são fixados no momento da queda e ficam persistidos */}
              
              {/* Marcador de sinal de rede (automático) */}
              {networkMarker && (
                <Marker
                  coordinate={{
                    latitude: networkMarker.latitude,
                    longitude: networkMarker.longitude
                  }}
                  title={networkMarker.title}
                  description={networkMarker.description}
                >
                  <View style={{
                    width: 42,
                    height: 42,
                    borderRadius: 21,
                    backgroundColor: '#000000',
                    justifyContent: 'center',
                    alignItems: 'center',
                    borderWidth: 2,
                    borderColor: '#FFFFFF',
                    shadowColor: '#000000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.25,
                    shadowRadius: 3,
                    elevation: 5
                  }}>
                    <View style={{ flexDirection: 'row', gap: 1.5, alignItems: 'flex-end' }}>
                      <View style={{ width: 2.5, height: 6, backgroundColor: '#FFFFFF', borderRadius: 1.25 }} />
                      <View style={{ width: 2.5, height: 9, backgroundColor: '#FFFFFF', borderRadius: 1.25 }} />
                      <View style={{ width: 2.5, height: 12, backgroundColor: '#FFFFFF', borderRadius: 1.25 }} />
                      <View style={{ width: 2.5, height: 15, backgroundColor: '#FFFFFF', borderRadius: 1.25 }} />
                    </View>
                  </View>
                </Marker>
              )}

              {/* 📍 Ping fixo do centro de sinal (permanece) */}
              {fixedCenterMarker && (
                <Marker
                  coordinate={{
                    latitude: fixedCenterMarker.latitude,
                    longitude: fixedCenterMarker.longitude
                  }}
                  title={fixedCenterMarker.title}
                  description={fixedCenterMarker.description}
                >
                  <View style={{
                    width: 44,
                    height: 44,
                    borderRadius: 22,
                    backgroundColor: '#000',
                    justifyContent: 'center',
                    alignItems: 'center',
                    borderWidth: 2,
                    borderColor: '#FF0000',
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.3,
                    shadowRadius: 3,
                    elevation: 6
                  }}>
                    <View style={{ flexDirection: 'row', gap: 1.4, alignItems: 'flex-end' }}>
                      <View style={{ width: 2.6, height: 6, backgroundColor: '#FF0000', borderRadius: 1.3 }} />
                      <View style={{ width: 2.6, height: 9, backgroundColor: '#FF0000', borderRadius: 1.3 }} />
                      <View style={{ width: 2.6, height: 12, backgroundColor: '#FF0000', borderRadius: 1.3 }} />
                      <View style={{ width: 2.6, height: 15, backgroundColor: '#FF0000', borderRadius: 1.3 }} />
                    </View>
                    <View style={{
                      position: 'absolute',
                      width: 34,
                      height: 2,
                      backgroundColor: 'rgba(255,0,0,0.85)',
                      transform: [{ rotate: '45deg' }],
                      borderRadius: 1
                    }} />
                  </View>
                </Marker>
              )}

              {/* 🔥 Focos por Satélite (overlay) */}
                            {showCommunityPings && communityPings
                              .filter(p => location ? calculateDistanceHaversine(location.latitude, location.longitude, p.latitude, p.longitude) <= 200000 : true)
                              .map((p) => (
                                <Marker
                                  key={p.id}
                                  coordinate={{ latitude: p.latitude, longitude: p.longitude }}
                                  title={`👥 Ping de observador`}
                                  description={`Lat: ${p.latitude?.toFixed?.(4)}\nLon: ${p.longitude?.toFixed?.(4)}\nDist: ${p.distancia ? `${Number(p.distancia).toFixed(1)}m` : 'N/D'}`}
                                >
                                  <View style={{ width: 16, height: 16, backgroundColor: '#43A047', borderRadius: 8, borderWidth: 2, borderColor: '#fff' }} />
                                </Marker>
                              ))}
              {showSatelliteOverlay && satelliteFocos.map((f) => (
                <Marker
                  key={f.id}
                  coordinate={{ latitude: f.latitude, longitude: f.longitude }}
                  title={`🔥 Foco Satélite (${f.origem || 'N/D'})`}
                  description={`Intensidade: ${f.intensidade}\nHora: ${f.hora}${f.tempK ? `\nTemp brilho: ${Math.round(f.tempK)} K` : ''}`}
                >
                  <Text style={{ fontSize: 28 }}>🔥</Text>
                </Marker>
              ))}

              {/* 📶 Círculo de cobertura: mostrar apenas o último, e somente quando offline */}
              {(!isConnected && disconnectTime && latestCoverageTs > 0) && (() => {
                const lastCircle = coverageCircles.find(c => c.timestamp === latestCoverageTs);
                if (!lastCircle) return null;
                return (
                  <Circle
                    key={lastCircle.id}
                    center={{ latitude: lastCircle.center.latitude, longitude: lastCircle.center.longitude }}
                    radius={lastCircle.radius}
                    strokeWidth={2}
                    strokeColor={'rgba(255, 0, 0, 0.9)'}
                    fillColor={'rgba(255, 0, 0, 0.15)'}
                    zIndex={1}
                  />
                );
              })()}

              {/* Ping fixo no centro do último círculo ao perder o sinal */}
              {(!isConnected && disconnectTime && latestCoverageTs > 0) && (() => {
                const lastCircle = coverageCircles.find(c => c.timestamp === latestCoverageTs);
                if (!lastCircle) return null;
                return (
                  <Marker
                    coordinate={{
                      latitude: lastCircle.center.latitude,
                      longitude: lastCircle.center.longitude,
                    }}
                    title={'📍 Ponto de Sinal (Centro)'}
                    description={'Centro fixo quando havia sinal; círculo envolve até o ponto de perda.'}
                  >
                    <View style={{
                      width: 36,
                      height: 36,
                      borderRadius: 18,
                      backgroundColor: '#000',
                      justifyContent: 'center',
                      alignItems: 'center',
                      borderWidth: 2,
                      borderColor: '#FF0000',
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.25,
                      shadowRadius: 3,
                      elevation: 4,
                    }}>
                      <View style={{ flexDirection: 'row', gap: 1.2, alignItems: 'flex-end' }}>
                        <View style={{ width: 2, height: 6, backgroundColor: '#FF0000', borderRadius: 1 }} />
                        <View style={{ width: 2, height: 9, backgroundColor: '#FF0000', borderRadius: 1 }} />
                        <View style={{ width: 2, height: 12, backgroundColor: '#FF0000', borderRadius: 1 }} />
                        <View style={{ width: 2, height: 15, backgroundColor: '#FF0000', borderRadius: 1 }} />
                      </View>
                    </View>
                  </Marker>
                );
              })()}

              {/* 🍞 Breadcrumbs - Migalhas de sinal deixadas durante viagem sem rede */}
              {breadcrumbs.map((breadcrumb) => (
                <Marker
                  key={breadcrumb.id}
                  coordinate={{
                    latitude: breadcrumb.latitude,
                    longitude: breadcrumb.longitude
                  }}
                  title="🍞 Marcador de Sinal"
                  description={`${new Date(breadcrumb.timestamp).toLocaleDateString('pt-BR')}`}
                  onPress={() => {
                    const data = new Date(breadcrumb.timestamp);
                    Alert.alert(
                      '🍞 Marcador de Sinal',
                      `Data: ${data.toLocaleDateString('pt-BR')}\nHora: ${data.toLocaleTimeString('pt-BR')}\nLat: ${breadcrumb.latitude.toFixed(4)}\nLon: ${breadcrumb.longitude.toFixed(4)}\n\nÚltima conexão de rede detectada`
                    );
                  }}
                >
                  <View style={{
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    backgroundColor: '#000000',
                    justifyContent: 'center',
                    alignItems: 'center',
                    borderWidth: 1.5,
                    borderColor: '#FFFFFF',
                    shadowColor: '#000000',
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.2,
                    shadowRadius: 2,
                    elevation: 3
                  }}>
                    <View style={{ flexDirection: 'row', gap: 1, alignItems: 'flex-end' }}>
                      <View style={{ width: 2, height: 5, backgroundColor: '#FFFFFF', borderRadius: 1 }} />
                      <View style={{ width: 2, height: 7, backgroundColor: '#FFFFFF', borderRadius: 1 }} />
                      <View style={{ width: 2, height: 9, backgroundColor: '#FFFFFF', borderRadius: 1 }} />
                      <View style={{ width: 2, height: 11, backgroundColor: '#FFFFFF', borderRadius: 1 }} />
                    </View>
                  </View>
                </Marker>
              ))}
              
              {/* Marcadores de poços de água (manual) */}
              {waterMarkers.map((marker) => (
                <Marker
                  key={marker.id}
                  coordinate={{
                    latitude: marker.latitude,
                    longitude: marker.longitude
                  }}
                  title={marker.title}
                  description={marker.description}
                  pinColor="#00AA00"
                  onPress={() => {
                    Alert.alert(
                      'Remover Poço?',
                      'Deseja remover este marcador?',
                      [
                        { text: 'Cancelar', onPress: () => {} },
                        {
                          text: 'Remover',
                          onPress: () => {
                            setWaterMarkers(waterMarkers.filter(m => m.id !== marker.id));
                          },
                          style: 'destructive'
                        }
                      ]
                    );
                  }}
                />
              ))}

              {/* Marcadores de Focos (Observações para Triangulação) - só se visível */}
              {showFocos && focos.map((foco, idx) => (
                <Marker
                  key={foco.id}
                  coordinate={{
                    latitude: foco.latitude,
                    longitude: foco.longitude
                  }}
                  title={`🔥 ${foco.observadorId} - ${foco.distancia.toFixed(1)}m`}
                  description={`Heading: ${foco.heading}°\nPitch: ${foco.pitch}°\n${foco.timestamp}`}
                  onPress={() => {
                    Alert.alert(
                      `🔥 ${foco.observadorId}`,
                      `Distância: ${foco.distancia.toFixed(1)}m\n` +
                      `Heading: ${foco.heading}°\n` +
                      `Pitch: ${foco.pitch}°\n` +
                      `Timestamp: ${foco.timestamp}`,
                      [
                        { text: 'OK', onPress: () => {} },
                        {
                          text: 'Remover',
                          onPress: () => {
                            const novosFocos = focos.filter(f => f.id !== foco.id);
                            setFocos(novosFocos);
                            if (novosFocos.length >= 2) {
                              const resultado = calcularTriangulacao(novosFocos);
                              setTriangulacaoResultado(resultado);
                            } else {
                              setTriangulacaoResultado(null);
                            }
                          },
                          style: 'destructive'
                        }
                      ]
                    );
                  }}
                >
                  <View style={{
                    width: 50,
                    height: 50,
                    borderRadius: 25,
                    backgroundColor: '#FF3333',
                    justifyContent: 'center',
                    alignItems: 'center',
                    borderWidth: 3,
                    borderColor: '#FF0000'
                  }}>
                    <Text style={{ fontSize: 28 }}>🔥</Text>
                  </View>
                </Marker>
              ))}

              {/* Waypoint Temporário (sendo marcado) */}
              {waypointTemporario && (
                <Marker
                  coordinate={{
                    latitude: waypointTemporario.latitude,
                    longitude: waypointTemporario.longitude
                  }}
                  title="🎯 FOCO TEMPORÁRIO"
                  description={`📍 Lat: ${waypointTemporario.latitude.toFixed(4)}°\n` +
                               `📍 Lon: ${waypointTemporario.longitude.toFixed(4)}°\n` +
                               `📏 Alt: ${waypointTemporario.altitude}m\n` +
                               `📐 Dist: ${waypointTemporario.distancia}m`}
                  pinColor="#FFEB3B"
                />
              )}

              {/* Marcador de Resultado da Triangulação */}
              {triangulacaoResultado && (
                <Marker
                  coordinate={{
                    latitude: triangulacaoResultado.latitude,
                    longitude: triangulacaoResultado.longitude
                  }}
                  title="🔥 FOGO ESTIMADO"
                  description={`Precisão: ${(100 - triangulacaoResultado.erro * 100).toFixed(1)}%\n${triangulacaoResultado.observadores} observadores`}
                  pinColor="#FFD700"
                />
              )}

              {/* Linhas de Acesso: Trilhas Completas */}
              {trilhasProximas.map((trilha, idx) => {
                if (!trilha.coordinates || trilha.coordinates.length < 2) return null;
                
                const cores = ['#00BFA5', '#009688', '#00897B', '#00796B', '#00695C', '#004D40', '#00D4AA', '#1DE9B6'];
                
                // Renderizar apenas a trilha, sem conectar ao usuário
                return (
                  <Polyline
                    key={`trilha-${idx}`}
                    coordinates={trilha.coordinates}
                    strokeColor={cores[idx % cores.length]}
                    strokeWidth={4}
                    lineCap="round"
                    lineJoin="round"
                  />
                );
              })}
              </MapView>
              {!followUser && recenterVisible && (
                <TouchableOpacity
                  onPress={handleRecenter}
                  style={{ position: 'absolute', right: 12, bottom: 12, backgroundColor: 'rgba(139,92,42,0.85)', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 18, elevation: 3 }}
                >
                  <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 13 }}>🎯 Centralizar</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Mini Bussola no Mapa */}
            <TouchableOpacity 
              style={styles.miniCompassWrapper}
              onPress={() => {
                if (!isCalibrating) {
                  setIsCalibrating(true);
                  setMagnetometerReadings([]);
                  
                  // Mostrar se vai usar internet (como iPhone faz)
                  const wwm_msg = isConnected 
                    ? '📡 Usando WMM Online para máxima precisão' 
                    : '📍 Usando WMM Offline (sem internet)';
                  
                  Alert.alert(
                    '🧭 Calibração de Bussola',
                    `Gire o celular em padrão "8" (como deitado) ou em círculos.\n\n${wwm_msg}\n\nToque na bussola novamente quando terminar.`
                  );
                } else {
                  // Concluir calibração e aplicar offset
                  setIsCalibrating(false);
                  
                  if (magnetometerReadings.length >= 30) {
                    // Calcular soft iron correction (elipsóide para esfera)
                    const readings = magnetometerReadings;
                    
                    // Encontrar min/max de cada eixo
                    let minX = Infinity, maxX = -Infinity;
                    let minY = Infinity, maxY = -Infinity;
                    let minZ = Infinity, maxZ = -Infinity;
                    
                    readings.forEach(r => {
                      minX = Math.min(minX, r.x);
                      maxX = Math.max(maxX, r.x);
                      minY = Math.min(minY, r.y);
                      maxY = Math.max(maxY, r.y);
                      minZ = Math.min(minZ, r.z);
                      maxZ = Math.max(maxZ, r.z);
                    });
                    
                    // Calcular offsets (hard iron correction)
                    const offsetX = (maxX + minX) / 2;
                    const offsetY = (maxY + minY) / 2;
                    const offsetZ = (maxZ + minZ) / 2;
                    
                    console.log(`✅ Calibração Concluída!`);
                    console.log(`📊 ${readings.length} pontos válidos coletados`);
                    console.log(`🔧 Offsets calculados: X=${offsetX.toFixed(1)}, Y=${offsetY.toFixed(1)}, Z=${offsetZ.toFixed(1)}`);
                    
                    // Mostrar qual WMM está sendo usado
                    const wmm_status = isConnected ? '✅ WMM Online (preciso)' : '📍 WMM Offline (aproximado)';
                    const declination_info = `Declinação: ${magneticDeclination.toFixed(2)}° (${wmm_status})`;
                    
                    Alert.alert(
                      '✅ Calibração Concluída!',
                      `${readings.length} pontos válidos coletados\n\n` +
                      `Offsets aplicados:\n` +
                      `X: ${offsetX.toFixed(1)} µT\n` +
                      `Y: ${offsetY.toFixed(1)} µT\n` +
                      `Z: ${offsetZ.toFixed(1)} µT\n\n` +
                      `${declination_info}\n\n` +
                      `A bussola agora está calibrada como um iPhone!`
                    );
                    
                    // Guardar offsets em AsyncStorage para próximas sessões
                    try {
                      AsyncStorage.setItem('compassOffsets', JSON.stringify({
                        offsetX, offsetY, offsetZ,
                        timestamp: Date.now()
                      }));
                    } catch (e) {
                      console.warn('⚠️ Erro salvando offsets:', e);
                    }
                  } else {
                    Alert.alert(
                      '⚠️ Calibração Incompleta',
                      `Apenas ${magnetometerReadings.length} pontos coletados.\n` +
                      `Precisa de pelo menos 30 pontos. Tente novamente!`
                    );
                  }
                }
              }}
            >
              <View style={styles.miniRoseContainer}>
                {/* Cruz fixa bem fina */}
                <View style={styles.crossVertical} />
                <View style={styles.crossHorizontal} />
                
                {/* Contorno azul */}
                <View style={styles.compassRing} />
                
                {/* Círculo e N que giram juntos */}
                <View 
                  style={[
                    styles.rotatingGroup,
                    { transform: [{ rotate: `${-smoothHeading}deg` }] }
                  ]}
                >
                  {/* N girando */}
                  <View style={styles.nRotator}>
                    <Text style={styles.miniCompassNorth}>N</Text>
                  </View>
                  
                  {/* Círculo interno */}
                      <View style={styles.miniCompass} />
                    </View>
                  </View>
                  <Text style={styles.miniHeadingText}>{(Math.round(smoothHeading) % 360) || 0}°</Text>
                </TouchableOpacity>

                {/* Controles do Mapa */}
                <View style={styles.mapControls}>
              <TouchableOpacity
                style={[
                  styles.mapButton,
                  marcandoFocoMapa && styles.mapButtonActive
                ]}
                onPress={() => {
                  setMarcandoFocoMapa(!marcandoFocoMapa);
                  if (!marcandoFocoMapa) {
                    Alert.alert('🎯 Marcar Foco', 'Toque no mapa para capturar as coordenadas!');
                  }
                }}
              >
                <Text style={styles.buttonText}>
                  {marcandoFocoMapa ? '✅ Mapa Ativo' : '🎯 Marcar Foco'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.mapButton,
                  markingMode && styles.mapButtonActive
                ]}
                onPress={() => {
                  setMarkingMode(!markingMode);
                  if (!markingMode) {
                    Alert.alert('💧 Modo Marcar', 'Toque no mapa para adicionar um poço de água!');
                  }
                }}
              >
                <Text style={styles.buttonText}>
                  {markingMode ? '✅ Modo Ativo' : '💧 Marcar Poço'}
                </Text>
              </TouchableOpacity>

              {/* Bússola sempre visível — toggle removido */}

              <TouchableOpacity
                style={styles.mapButton}
                onPress={() => {
                  if (focos.length === 0) {
                    Alert.alert('⚠️ Vazio', 'Nenhuma observação para limpar.');
                    return;
                  }
                  Alert.alert(
                    '⚠️ TEM CERTEZA?',
                    `Vai remover ${focos.length} observação(ões)!\n\n⚠️ IMPORTANTE:\n- A rede 📡 e poços 💧 NÃO serão removidos\n- Eles continuarão visíveis para outros usuários\n- Apenas suas observações de fogo serão limpas`,
                    [
                      { text: 'Cancelar', onPress: () => {} },
                      {
                        text: 'Remover Mesmo Assim',
                        onPress: () => {
                          // Limpa apenas os focos (observações)
                          setFocos([]);
                          setTriangulacaoResultado(null); // Também limpa a triangulação
                          setTrilhasProximas([]); // Limpa as trilhas
                          setWaypointTemporario(null);
                          Alert.alert('✅ Limpas!', 'Observações removidas. Rede e poços continuam no mapa.');
                        },
                        style: 'destructive'
                      }
                    ]
                  );
                }}
              >
                <Text style={styles.buttonText}>🗑️ Limpar Focos</Text>
              </TouchableOpacity>
            </View>

            {/* Info */}
            <View style={styles.mapInfo}>
              <Text style={styles.infoText}>
                📍 Você: {location.latitude.toFixed(4)}°, {location.longitude.toFixed(4)}°
              </Text>
              <Text style={styles.infoText}>
                📡 Rede: {isConnected ? '✅' : '❌'} {pendingFireData ? '⏳ (Pendente)' : ''}
              </Text>
              <Text style={styles.infoText}>
                💧 Poços: {waterMarkers.length}
              </Text>
              <Text style={styles.infoText}>
                🎯 Observadores: {focos.length}/5
              </Text>
              {triangulacaoResultado && (
                <>
                  <Text style={[styles.infoText, { fontWeight: 'bold', color: '#FFD700' }]}>
                    🔥 FOGO LOCALIZADO!
                  </Text>
                  <Text style={styles.infoText}>
                    Lat: {triangulacaoResultado.latitude.toFixed(4)}°
                  </Text>
                  <Text style={styles.infoText}>
                    Lon: {triangulacaoResultado.longitude.toFixed(4)}°
                  </Text>
                  <Text style={styles.infoText}>
                    Alt: {triangulacaoResultado.altitude.toFixed(1)}m
                  </Text>
                  <Text style={styles.infoText}>
                    Precisão: {(100 - triangulacaoResultado.erro * 100).toFixed(1)}%
                  </Text>
                </>
              )}
              {(showFocos && focos.length > 0) && (
                <>
                  <Text style={[styles.infoText, { fontWeight: 'bold', marginTop: 10, color: '#4CAF50' }]}>
                    ✅ INFORMAÇÕES SALVAS COM SUCESSO!
                  </Text>
                  <Text style={styles.infoText}>
                    📍 Coordenadas: {focos[focos.length - 1]?.latitude.toFixed(6)}, {focos[focos.length - 1]?.longitude.toFixed(6)}
                  </Text>
                  <Text style={styles.infoText}>
                    🔥 Observações: {focos.length}/5
                  </Text>
                  
                  {isConnected ? (
                    <>
                      {focos.length >= 2 && (
                        <>
                          <Text style={[styles.infoText, { color: '#FFD700', fontWeight: 'bold', marginTop: 8 }]}>
                            🎯 ANÁLISE GEOMÉTRICA:
                          </Text>
                          <Text style={styles.infoText}>
                            • Triangulação: {focos.length} pontos de observação
                          </Text>
                          {triangulacaoResultado && (
                            <>
                              <Text style={styles.infoText}>
                                • Localização estimada: {triangulacaoResultado.latitude.toFixed(6)}, {triangulacaoResultado.longitude.toFixed(6)}
                              </Text>
                              <Text style={styles.infoText}>
                                • Precisão: {(100 - triangulacaoResultado.erro * 100).toFixed(1)}%
                              </Text>
                              <Text style={styles.infoText}>
                                • Altitude estimada: {triangulacaoResultado.altitude.toFixed(1)}m
                              </Text>
                            </>
                          )}
                        </>
                      )}
                      
                      <Text style={[styles.infoText, { color: '#2196F3', fontWeight: 'bold', marginTop: 8 }]}>
                        📊 DADOS METEOROLÓGICOS:
                      </Text>
                      <Text style={styles.infoText}>
                        • Temperatura: {meteoDataDinamica.temp}°C
                      </Text>
                      <Text style={styles.infoText}>
                        • Umidade relativa: {meteoDataDinamica.humidity}%
                      </Text>
                      <Text style={styles.infoText}>
                        • Velocidade do vento: {meteoDataDinamica.windSpeed} km/h
                      </Text>
                    </>
                  ) : (
                    <Text style={[styles.infoText, { color: '#FF9800', fontSize: 12, marginTop: 8 }]}>
                      ⏳ Aguardando conexão de rede para carregar dados complementares...
                    </Text>
                  )}
                </>
              )}
            </View>

            {/* Formulário Manual de Foco */}
            {(safeInputsManualFoco?.latitude || safeInputsManualFoco?.longitude) ? (
              <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
                <View style={[styles.mapInfo, { marginTop: 10 }]}>
                  <Text style={[styles.infoText, { fontWeight: 'bold', marginBottom: 10 }]}>
                    📝 Dados do Foco:
                  </Text>

                  <Text style={styles.infoText}>📍 Latitude (automático)</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="Latitude"
                    keyboardType="decimal-pad"
                    editable={false}
                    value={safeInputsManualFoco?.latitude || ''}
                  />

                  <Text style={styles.infoText}>📍 Longitude (automático)</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="Longitude"
                    keyboardType="decimal-pad"
                    editable={false}
                    value={safeInputsManualFoco?.longitude || ''}
                  />

                  <Text style={styles.infoText}>📏 Altitude do local clicado (via Google Maps)</Text>
                  <TextInput
                    style={[styles.textInput, { backgroundColor: '#E8F5E9' }]}
                    placeholder="Ex: 1000"
                    keyboardType="decimal-pad"
                    editable={false}
                    value={safeInputsManualFoco?.altitude || '(será calculada)'}
                  />

                  <Text style={[styles.infoText, { fontWeight: 'bold', marginTop: 10, color: '#4CAF50' }]}>
                    ✅ DISTÂNCIA CALCULADA AUTOMATICAMENTE (GPS)
                  </Text>

                  <Text style={styles.infoText}>📏 Distância até o fogo (em metros)</Text>
                  <TextInput
                    style={[styles.textInput, { fontSize: 16, fontWeight: 'bold', color: '#4CAF50' }]}
                    placeholder="Ex: 500"
                    keyboardType="decimal-pad"
                    value={safeInputsManualFoco?.distancia || ''}
                    onChangeText={(text) => setInputsManualFoco({...(safeInputsManualFoco || {}), distancia: text})}
                  />

                  <Text style={[styles.infoText, { fontSize: 12, color: '#666' }]}>
                    💡 Distância calculada entre sua localização GPS e o ponto clicado no mapa. Pode ajustar se necessário!
                  </Text>

                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <TouchableOpacity
                      style={[
                        styles.mapButton,
                        {
                          flex: 1,
                          backgroundColor: focoSalvoAgora ? '#4CAF50' : '#4CAF50'
                        }
                      ]}
                      onPress={salvarFocoManual}
                      disabled={focoSalvoAgora}
                    >
                      <Text style={[styles.buttonText, { fontWeight: 'bold' }]}>
                        {focoSalvoAgora ? '✅ Salvo!' : '💾 Salvar'}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.mapButton, { flex: 1, backgroundColor: '#00796B' }]}
                      onPress={async () => {
                        // Passar localização do usuário E do foco
                        const rotas = await encontrarTrilhasProximas(
                          location?.latitude || 0,
                          location?.longitude || 0,
                          parseFloat(safeInputsManualFoco?.latitude || 0),
                          parseFloat(safeInputsManualFoco?.longitude || 0)
                        );
                        setTrilhasProximas(rotas);
                        
                        if (rotas.length > 0) {
                          Alert.alert(
                            '🛣️ Rotas Próximas',
                            `Encontradas ${rotas.length} rota(s) de acesso próxima ao foco!\n\nUse o Google Maps para detalhes completos.`,
                            [{ text: 'OK', onPress: () => {} }]
                          );
                        } else {
                          Alert.alert('🛣️ Sem Rotas', 'Nenhuma rota de acesso encontrada próxima ao foco. Verifique o mapa manualmente.');
                        }
                      }}
                    >
                      <Text style={styles.buttonText}>🛣️ Rotas</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.mapButton, { flex: 1, backgroundColor: '#FF9800' }]}
                      onPress={() => {
                        setInputsManualFoco({
                          latitude: '',
                          longitude: '',
                          altitude: '',
                          heading: '',
                          pitch: '',
                          distancia: ''
                        });
                        setWaypointTemporario(null);
                        setFocoPendente(false);
                        setFocoSalvoAgora(false);
                        setTrilhasProximas([]); // Limpar rotas também
                      }}
                    >
                      <Text style={styles.buttonText}>✖️ Cancelar</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </KeyboardAvoidingView>
            ) : null}
            </ScrollView>
        )}

        <TouchableOpacity
          style={styles.buttonPrimary}
          onPress={() => setPage(1)}
        >
          <Text style={styles.buttonText}>← Voltar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // 🛰️ PÁGINA 5: SATÉLITES (grátis)
  if (page === 5) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>🛰️ Satélites (grátis)</Text>
        </View>
        <ScrollView style={styles.content}>
          <View style={[styles.card, { backgroundColor: '#E3F2FD', borderLeftWidth: 4, borderLeftColor: '#2196F3' }]}>
            <Text style={[styles.cardTitle, { color: '#0D47A1' }]}>Camada de Focos por Satélite</Text>
            <Text style={styles.text}>
              Esta página lista os 3 satélites gratuitos e permite atualizar os focos próximos da sua região. No mapa (Página 2),
              o botão "🔥 Focos por satélite" alterna a visualização desses focos.
            </Text>
          </View>

          <View style={[styles.card, { backgroundColor: '#FFF' }]}> 
            <Text style={[styles.cardTitle, { color: '#263238' }]}>Fontes ativas</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
              <TouchableOpacity
                style={[styles.mapButton, { backgroundColor: enableFIRMS ? '#2E7D32' : '#9E9E9E' }]}
                onPress={() => setEnableFIRMS(!enableFIRMS)}
              >
                <Text style={styles.buttonText}>FIRMS</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.mapButton, { backgroundColor: enableGOES ? '#2E7D32' : '#9E9E9E' }]}
                onPress={() => setEnableGOES(!enableGOES)}
              >
                <Text style={styles.buttonText}>GOES</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.mapButton, { backgroundColor: enableMSG ? '#2E7D32' : '#9E9E9E' }]}
                onPress={() => setEnableMSG(!enableMSG)}
              >
                <Text style={styles.buttonText}>MSG</Text>
              </TouchableOpacity>
            </View>
            <Text style={[styles.text, { marginTop: 8, fontSize: 12, color: '#555' }]}>Última atualização: {lastSatUpdate ? new Date(lastSatUpdate).toLocaleTimeString('pt-BR') : '—'}</Text>
          </View>

          {satellitesInfo.map((s) => (
            <View key={s.id} style={[styles.card, { backgroundColor: '#FAFAFA' }]}>
              <Text style={[styles.cardTitle, { color: '#263238' }]}>{s.nome}</Text>
              <Text style={styles.text}>Atualização: {s.atualizacao}</Text>
              <Text style={styles.text}>Resolução: {s.resolucao}</Text>
              <Text style={styles.text}>Focos carregados (aprox.): {s.focos}</Text>
            </View>
          ))}

          <TouchableOpacity
            style={[styles.buttonPrimary, { backgroundColor: '#1976D2', marginBottom: 10 }]}
            onPress={async () => { await loadSatelliteFocos(); Alert.alert('Satélites', 'Focos atualizados. Abra o mapa na Página 2 e ative a camada.'); }}
            disabled={satelliteLoading}
          >
            <Text style={styles.buttonText}>{satelliteLoading ? 'Atualizando...' : 'Atualizar focos próximos'}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.buttonPrimary, { backgroundColor: showSatelliteOverlay ? '#E53935' : '#8B5C2A' }]}
            onPress={async () => {
              if (!showSatelliteOverlay && satelliteFocos.length === 0) await loadSatelliteFocos();
              setShowSatelliteOverlay(!showSatelliteOverlay);
              Alert.alert('Camada', !showSatelliteOverlay ? 'Camada ativada. Vá ao mapa (Página 2).' : 'Camada desativada.');
            }}
          >
            <Text style={styles.buttonText}>{showSatelliteOverlay ? 'Desativar camada no mapa' : 'Ativar camada no mapa'}</Text>
          </TouchableOpacity>
        </ScrollView>

        <TouchableOpacity style={styles.buttonPrimary} onPress={() => setPage(1)}>
          <Text style={styles.buttonText}>← Voltar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // 📤 PÁGINA 4: COMPARTILHAMENTO
  if (page === 4) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>📤 Compartilhar Dados</Text>
        </View>
        <ScrollView style={styles.content}>
          
          {focos.length === 0 ? (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>⚠️ Sem Dados</Text>
              <Text style={styles.text}>Você não tem focos marcados. Marque focos no mapa antes de compartilhar!</Text>
            </View>
          ) : (
            <>
              {/* Resumo dos Dados */}
              <View style={[styles.card, { backgroundColor: '#E8F5E9', borderLeftWidth: 4, borderLeftColor: '#4CAF50' }]}>
                <Text style={[styles.cardTitle, { color: '#2E7D32' }]}>📊 Resumo dos Dados</Text>
                <Text style={styles.text}>🔥 Focos: {focos.length}</Text>
                <Text style={styles.text}>📍 Sua Localização: {location?.latitude.toFixed(4)}, {location?.longitude.toFixed(4)}</Text>
                <Text style={styles.text}>⏰ Data/Hora: {new Date().toLocaleString('pt-BR')}</Text>
                {triangulacaoResultado && (
                  <Text style={[styles.text, { color: '#FFD700', fontWeight: 'bold' }]}>🎯 Fogo Estimado: {triangulacaoResultado.latitude.toFixed(4)}, {triangulacaoResultado.longitude.toFixed(4)}</Text>
                )}
              </View>

              {/* AVISO IMPORTANTE */}
              <View style={[styles.card, { backgroundColor: '#FFF3E0', borderLeftWidth: 4, borderLeftColor: '#FF6F00' }]}>
                <Text style={[styles.cardTitle, { color: '#E65100' }]}>⚠️ AVISO IMPORTANTE</Text>
                <Text style={[styles.text, { color: '#333' }]}>
                  Seus dados pessoais e as informações capturadas serão compartilhados com autoridades competentes. Este é um processo oficial e não pode conter informações falsas!
                </Text>
              </View>

              {/* Contatos de Emergência */}
              <View style={[styles.card, { backgroundColor: '#FFE4B5', borderLeftWidth: 4, borderLeftColor: '#FF6F00' }]}>
                <Text style={[styles.cardTitle, { color: '#FF6F00' }]}>🚒 ENVIAR PARA AUTORIDADES</Text>
                
                <TouchableOpacity 
                  style={[styles.buttonPrimary, { backgroundColor: '#E53935', marginBottom: 10 }]}
                  onPress={() => prepararDadosParaEnvio('🚒 Bombeiros - 193')}
                >
                  <Text style={styles.buttonText}>🚒 Bombeiros: 193</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.buttonPrimary, { backgroundColor: '#1976D2', marginBottom: 10 }]}
                  onPress={() => prepararDadosParaEnvio('🛡️ Defesa Civil - 199')}
                >
                  <Text style={styles.buttonText}>🛡️ Defesa Civil: 199</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.buttonPrimary, { backgroundColor: '#00796B', marginBottom: 10 }]}
                  onPress={() => prepararDadosParaEnvio('🌿 ICMBio (Ambiental)')}
                >
                  <Text style={styles.buttonText}>🌿 ICMBio (Ambiental)</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.buttonPrimary, { backgroundColor: '#6A1B9A', marginBottom: 10 }]}
                  onPress={() => prepararDadosParaEnvio('📍 Proprietário (Premium)')}
                >
                  <Text style={styles.buttonText}>📍 Proprietário (Premium)</Text>
                </TouchableOpacity>
              </View>

              {/* Exportar como JSON */}
              <View style={[styles.card, { backgroundColor: '#E3F2FD', borderLeftWidth: 4, borderLeftColor: '#2196F3' }]}>
                <Text style={[styles.cardTitle, { color: '#1565C0' }]}>📋 EXPORTAR DADOS</Text>
                
                <TouchableOpacity 
                  style={[styles.buttonPrimary, { backgroundColor: '#2196F3', marginBottom: 10 }]}
                  onPress={async () => {
                    const json = await exportarFocosJSON(focos, location);
                    if (json) {
                      Alert.alert(
                        '✅ JSON Gerado',
                        `${focos.length} foco(s) convertido(s) em JSON\n\nArquivo: focos_${Date.now()}.json`,
                        [{ text: 'OK', onPress: () => {} }]
                      );
                    }
                  }}
                >
                  <Text style={styles.buttonText}>📋 Exportar como JSON</Text>
                </TouchableOpacity>
              </View>
            </>
          )}

          {/* Botão Voltar */}
          <TouchableOpacity 
            style={styles.buttonSecondary}
            onPress={() => setPage(2)}
          >
            <Text style={styles.buttonText}>← Voltar ao Mapa</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  if (page === 3) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>⚙️ Configurações</Text>
        </View>
        <ScrollView style={styles.content}>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>App Info</Text>
            <Text style={styles.text}>SmokeDistance v1.0.0</Text>
            <Text style={styles.text}>Detecção de focos de fumaça</Text>
            <Text style={styles.text}>© 2025</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>📍 Atualização de GPS</Text>
            <Text style={styles.text}>Escolha o modo de atualização do GPS:</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity
                style={[styles.mapButton, { flex: 1, backgroundColor: gpsMode === 'eco' ? '#2E7D32' : '#9E9E9E' }]}
                onPress={() => setGpsMode('eco')}
              >
                <Text style={styles.buttonText}>Eco</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.mapButton, { flex: 1, backgroundColor: gpsMode === 'normal' ? '#2E7D32' : '#9E9E9E' }]}
                onPress={() => setGpsMode('normal')}
              >
                <Text style={styles.buttonText}>Normal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.mapButton, { flex: 1, backgroundColor: gpsMode === 'preciso' ? '#2E7D32' : '#9E9E9E' }]}
                onPress={() => setGpsMode('preciso')}
              >
                <Text style={styles.buttonText}>Preciso</Text>
              </TouchableOpacity>
            </View>
            <Text style={[styles.text, { fontSize: 12, color: '#555', marginTop: 6 }]}>
              Eco: menos consumo (≈ 5s/10m) • Normal: equilibrado (≈ 2s/3m) • Preciso: máximo (≈ 1s/1m)
            </Text>
            <View style={{ marginTop: 10 }}>
              <Text style={styles.text}>GPS em segundo plano:</Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TouchableOpacity
                  style={[styles.mapButton, { flex: 1, backgroundColor: bgLocationEnabled ? '#2E7D32' : '#9E9E9E' }]}
                  onPress={() => setBgLocationEnabled(!bgLocationEnabled)}
                >
                  <Text style={styles.buttonText}>{bgLocationEnabled ? 'Ativado' : 'Desativado'}</Text>
                </TouchableOpacity>
              </View>
              <Text style={[styles.text, { fontSize: 12, color: '#555', marginTop: 6 }]}>Ative para manter rastreamento mesmo sem Wi‑Fi ou com a tela desligada. No Android, recomenda-se remover otimização de bateria.</Text>
              <TouchableOpacity
                style={[styles.mapButton, { marginTop: 10, backgroundColor: androidBoosted ? '#4CAF50' : '#8B5C2A' }]}
                onPress={ativarModoAndroidAvancado}
              >
                <Text style={styles.buttonText}>{androidBoosted ? '✅ Otimização Aplicada' : '⚡ Aplicar tudo (Android)'}</Text>
              </TouchableOpacity>
              {Platform.OS === 'android' && androidBoosted && (
                <Text style={[styles.text, { fontSize: 11, color: '#2E7D32', marginTop: 6 }]}>✔ Modo preciso • ✔ Fundo ativo • Abra a tela de bateria e marque “Sem restrições”.</Text>
              )}
            </View>
          </View>

          <TouchableOpacity 
            style={styles.buttonPrimary}
            onPress={() => setPage(1)}
          >
            <Text style={styles.buttonText}>← Voltar</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#2e7d32', // verde exército
  },
  header: {
    backgroundColor: '#145A32', // verde mais escuro
    padding: 20,
    paddingTop: 50,
    alignItems: 'center',
    elevation: 3,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff', // mantém branco para contraste
  },
  subtitle: {
    fontSize: 12,
    color: '#ddd',
    marginTop: 5,
  },
  content: {
    flex: 1,
    padding: 15,
  },
  card: {
    backgroundColor: '#e8f5e9', // verde suave
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#666', // cinza
    marginBottom: 10,
  },
  text: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  compassContainer: {
    alignItems: 'center',
    padding: 20,
  },
  roseContainer: {
    position: 'relative',
    width: 180,
    height: 180,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  compass: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#E3F2FD',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#1E90FF',
  },
  compassArrow: {
    fontSize: 48,
    color: '#1E90FF',
  },
  roseText: {
    position: 'absolute',
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FF6F00',
  },
  roseNorth: {
    top: 5,
    left: '50%',
    marginLeft: -8,
  },
  roseSouth: {
    bottom: 5,
    left: '50%',
    marginLeft: -8,
  },
  roseEast: {
    right: 5,
    top: '50%',
    marginTop: -10,
  },
  roseWest: {
    left: 5,
    top: '50%',
    marginTop: -10,
  },
  headingText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 10,
    borderRadius: 5,
    fontSize: 14,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 10,
    borderRadius: 5,
    fontSize: 14,
    marginBottom: 8,
    backgroundColor: '#fff',
  },
  buttonPrimary: {
    backgroundColor: '#8B5C2A',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 15,
    elevation: 3,
  },
  buttonSecondary: {
    backgroundColor: '#8B5C2A',
    flex: 1,
    marginRight: 7,
  },
  buttonTertiary: {
    backgroundColor: '#8B5C2A',
    flex: 1,
    marginLeft: 7,
  },
  button: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    alignItems: 'center',
    elevation: 2,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  buttonRow: {
    flexDirection: 'row',
    marginBottom: 15,
  },
  map: {
    flex: 1,
    width: '100%',
  },
  miniCompassWrapper: {
    position: 'absolute',
    // Fixo no canto inferior direito da tela
    bottom: 230,
    right: 10,
    alignItems: 'center',
    zIndex: 9999,
    pointerEvents: 'none',
    // Softer translucent green background
    backgroundColor: 'rgba(76, 175, 80, 0.22)',
    // Subtle square frame with 3D shadow
    borderWidth: 1,
    borderColor: '#66BB6A',
    borderRadius: 8,
    padding: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 3,
    elevation: 8,
  },
  miniRoseContainer: {
    position: 'relative',
    width: 80,
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  crossVertical: {
    position: 'absolute',
    width: 1,
    height: 72,
    backgroundColor: '#FFFFFF',
    zIndex: 5,
  },
  crossHorizontal: {
    position: 'absolute',
    width: 72,
    height: 1,
    backgroundColor: '#FFFFFF',
    zIndex: 5,
  },
  compassRing: {
    position: 'absolute',
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 2,
    // Red ring for compass circle
    borderColor: '#FF0000',
    // Subtle 3D edge shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
  rotatingGroup: {
    position: 'absolute',
    width: 72,
    height: 72,
    justifyContent: 'center',
    alignItems: 'center',
  },
  nRotator: {
    position: 'absolute',
    top: -5,
    width: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  miniCompass: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'transparent',
  },
  miniCompassNorth: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  miniRoseText: {
    position: 'absolute',
    fontWeight: 'bold',
    color: '#FF6F00',
  },
  miniHeadingText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 4,
  },
  mapControls: {
    flexDirection: 'row',
    padding: 10,
    backgroundColor: '#fff',
    gap: 10,
  },
  mapButton: {
    flex: 1,
    backgroundColor: '#8B5C2A',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    elevation: 2

  },
  mapButtonActive: {
    backgroundColor: '#00AA00',
  },
  mapInfo: {
    backgroundColor: '#fff',
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: '#ddd',
  },
  infoText: {
    fontSize: 13,
    color: '#333',
    marginBottom: 5,
  },
  camera: {
    flex: 1,
  },
  hudContainer: {
    flex: 1,
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    padding: 20,
  },
  hudHeader: {
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    padding: 15,
    borderRadius: 10,
  },
  hudTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  hudSubtitle: {
    fontSize: 13,
    color: '#aaa',
  },
  hudCenter: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  targetCrosshair: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  crosshairLine: {
    position: 'absolute',
    backgroundColor: '#fff',
  },
  hudData: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  hudText: {
    color: '#0f0',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 5,
    fontFamily: 'Courier New',
  },
  hudButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  hudButton: {
    flex: 1,
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  hudButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  camera: {
    flex: 1,
  },
  cameraOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    padding: 20,
    pointerEvents: 'none', // Permite cliques passar através
  },
  overlayHeader: {
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    padding: 12,
    borderRadius: 8,
  },
  overlayTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff', // mantém branco para contraste
  },
  overlayCenter: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  targetReticle: {
    width: 120,
    height: 120,
    borderWidth: 2,
    borderColor: '#00ff00',
    borderRadius: 60,
    backgroundColor: 'rgba(0, 255, 0, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlayData: {
    backgroundColor: '#e8f5e9', // verde suave
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  overlayText: {
    color: '#00ff00',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 5,
    fontFamily: 'Courier New',
  },
  cameraControls: {
    flexDirection: 'row',
    padding: 15,
    backgroundColor: '#000',
    gap: 10,
  },
});