// App.js

import React, { useState, useEffect, useRef } from "react";
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, Share, Linking, Platform } from "react-native";
import MapView, { Marker, Polyline } from "react-native-maps";
import * as Location from "expo-location";
import * as Clipboard from 'expo-clipboard';
import { Camera } from "expo-camera";
import { Barometer, DeviceMotion, Accelerometer, Gyroscope } from "expo-sensors";

// Constantes
const R = 6371000;
const deg2rad = Math.PI / 180;
const T_STANDARD = 288.15;
const L = 0.0065; 
const g = 9.80665; 
const M = 0.0289644; 
const R_GAS = 8.31447; 

// Funções auxiliares
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

function calculateBarometricAltitude(P, P_ref, H_ref) {
  if (!P_ref || !P || P_ref === 0) return H_ref;
  const T_ref = T_STANDARD - (L * H_ref);
  const altitude = H_ref + (T_ref / L) * (1 - Math.pow(P / P_ref, (R_GAS * L) / (g * M)));
  if (isNaN(altitude) || !isFinite(altitude)) return H_ref;
  return altitude;
}

function destinationPoint(lat, lon, distance, bearing) {
    const d = distance / R; 
    const br = bearing * deg2rad; 
    const latR = lat * deg2rad;
    const lonR = lon * deg2rad;

    const lat2R = Math.asin(
        Math.sin(latR) * Math.cos(d) +
        Math.cos(latR) * Math.sin(d) * Math.cos(br)
    );

    let lon2R = lonR + Math.atan2(
        Math.sin(br) * Math.sin(d) * Math.cos(latR),
        Math.cos(d) - Math.sin(latR) * Math.sin(lat2R)
    );
    
    return {
        latitude: lat2R / deg2rad,
        longitude: lon2R / deg2rad,
    };
}

// Componente Principal
export default function App() {
  const [page, setPage] = useState(1);
  const [location, setLocation] = useState(null);
  const [mapRegion, setMapRegion] = useState(null);
  const [pickedPoint, setPickedPoint] = useState(null);
  const [distanceSingle, setDistanceSingle] = useState(null);
  const [smokeHeight, setSmokeHeight] = useState('100'); 
  const [cameraPermission, setCameraPermission] = useState(null);
  const [cameraActive, setCameraActive] = useState(true); // Estado para controlar câmera
  const cameraRef = useRef(null);
  const [refPressure, setRefPressure] = useState(null); 
  const [refAltitude, setRefAltitude] = useState(null);
  const [baroAltitude, setBaroAltitude] = useState(null); 
  const [sensorData, setSensorData] = useState({ 
    pressure: null, 
    orientation: null, 
    accel: null, 
    gyro: null,
    gpsAltitude: 0,
    time: null
  });

  const [meteoData, setMeteoData] = useState({
    temp: 'N/D',
    windSpeed: 'N/D',
    windDirection: 'N/D',
    humidity: 'N/D',
    localAltitude: 'N/D',
  });

  useEffect(() => {
    let baroListener = null;

    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Erro", "Permissão de localização negada.");
        return; 
      }
      
      const loc = await Location.getCurrentPositionAsync({});
      setLocation(loc.coords);
      setMapRegion({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        latitudeDelta: 0.1,
        longitudeDelta: 0.1
      });
      setSensorData(prev => ({ ...prev, gpsAltitude: loc.coords.altitude || 0, time: new Date().toLocaleString() }));
      
      const camStatus = await Camera.requestCameraPermissionsAsync();
      setCameraPermission(camStatus.status === "granted");

      const gyroSub = Gyroscope.addListener(data => setSensorData(prev => ({ ...prev, gyro: data })));
      const accelSub = Accelerometer.addListener(data => setSensorData(prev => ({ ...prev, accel: data })));
      const orientationSub = DeviceMotion.addListener(data => {
          let heading = data.rotation?.alpha; 
          if (heading !== undefined && heading !== null) {
            heading = heading < 0 ? heading + 360 : heading;
            setSensorData(prev => ({ ...prev, orientation: heading }));
          }
      });
      DeviceMotion.setUpdateInterval(100);

      baroListener = Barometer.addListener(data => {
          setSensorData(prev => ({ ...prev, pressure: data.pressure }));
          if (refPressure === null && loc.coords.altitude !== null) {
              setRefPressure(data.pressure);
              setRefAltitude(loc.coords.altitude || 0);
              setMeteoData(prev => ({...prev, localAltitude: loc.coords.altitude.toFixed(1) || 'N/D'}));
          }
      });
      Barometer.setUpdateInterval(500);

      return () => { 
          gyroSub.remove(); 
          accelSub.remove(); 
          orientationSub.remove(); 
          if(baroListener) baroListener.remove(); 
      };
    })();
  }, []);

  useEffect(() => {
    if (sensorData.pressure !== null && refPressure !== null && refAltitude !== null) {
        const calculatedAltitude = calculateBarometricAltitude(
            sensorData.pressure, 
            refPressure, 
            refAltitude
        );
        setBaroAltitude(calculatedAltitude);
    }
  }, [sensorData.pressure, refPressure, refAltitude]);

  function lockSmokePoint() {
      if (!location || !sensorData.orientation) {
          Alert.alert("Erro", "Localização ou orientação do dispositivo indisponível.");
          return;
      }

      const PROJECTION_DISTANCE_M = 5000;

      const newPoint = destinationPoint(
          location.latitude,
          location.longitude,
          PROJECTION_DISTANCE_M,
          sensorData.orientation
      );

      setPickedPoint(newPoint);
      setMapRegion({
          latitude: newPoint.latitude,
          longitude: newPoint.longitude,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05
      });
  }

  function calcSingleDistance() {
    if (!pickedPoint || !location) {
        setDistanceSingle(null);
        return;
    }
    
    const D_H = calculateDistanceHaversine(location.latitude, location.longitude, pickedPoint.latitude, pickedPoint.longitude);
    const H_obs = baroAltitude || location.altitude || 0; 
    const H_smoke = parseFloat(smokeHeight) || 0;
    const delta_H = H_smoke; 
    const D_3D = Math.sqrt(D_H * D_H + delta_H * delta_H);
    
    setDistanceSingle(D_3D);
  }

  useEffect(() => {
    calcSingleDistance();
  }, [pickedPoint, location, baroAltitude, smokeHeight]);

  // Função para abrir Google Maps
  function openInGoogleMaps(lat, lon) {
    const scheme = Platform.select({
      ios: 'maps:0,0?q=',
      android: 'geo:0,0?q='
    });
    const latLng = `${lat},${lon}`;
    const label = 'Foco de Fumaça';
    const url = Platform.select({
      ios: `${scheme}${label}@${latLng}`,
      android: `${scheme}${latLng}(${label})`
    });

    Linking.openURL(url).catch(() => {
      // Fallback para web
      Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${latLng}`);
    });
  }

  // PÁGINA 1: Câmera
  if (page === 1) {
    return (
      <View style={{ flex: 1 }}>
        {/* Seção Superior: Câmera OU Mapa */}
        {cameraPermission && cameraActive ? (
          <View style={{ flex: 0.5 }}>
            <Camera style={{ flex: 1 }} ref={cameraRef} />
            <View style={styles.hud}>
              <Text style={styles.hudText}>Distância 3D: {distanceSingle ? `${distanceSingle.toFixed(1)} m` : "N/D"}</Text>
              <Text style={styles.hudText}>Azimute: {sensorData.orientation ? `${sensorData.orientation.toFixed(1)}°` : "N/D"}</Text>
              <Text style={styles.hudText}>Alt Média: {baroAltitude ? `${baroAltitude.toFixed(1)} m` : "Calibrando..."}</Text>
              <Text style={styles.hudText}>Temp: {meteoData.temp}°C | Vento: {meteoData.windSpeed} km/h</Text>
            </View>
            
            {/* Botão para desativar câmera */}
            <TouchableOpacity 
                onPress={() => setCameraActive(false)} 
                style={styles.toggleCameraBtn}
            >
                <Text style={styles.btnTextSmall}>📷 Desligar Câmera</Text>
            </TouchableOpacity>

            <TouchableOpacity 
                onPress={lockSmokePoint} 
                style={styles.lockButton}
            >
                <Text style={styles.btnText}>TRAVAR FUMAÇA</Text>
            </TouchableOpacity>
          </View>
        ) : (
          // Mapa Fullscreen quando câmera desligada
          <View style={{ flex: 0.5 }}>
            {mapRegion && (
              <MapView 
                style={{ flex: 1 }} 
                region={mapRegion} 
                onPress={(e) => setPickedPoint(e.nativeEvent.coordinate)}
                showsUserLocation={true}
                showsMyLocationButton={true}
                showsCompass={true}
              >
                {location && <Marker coordinate={location} title="Eu" pinColor="blue" />}
                {pickedPoint && (
                  <Marker 
                    coordinate={pickedPoint} 
                    title="Alvo Fumaça" 
                    description="Toque para ver no Google Maps"
                    pinColor="red"
                    onCalloutPress={() => openInGoogleMaps(pickedPoint.latitude, pickedPoint.longitude)}
                  />
                )}
              </MapView>
            )}

            {/* HUD sobre o mapa */}
            <View style={styles.hudMap}>
              <Text style={styles.hudText}>Distância 3D: {distanceSingle ? `${distanceSingle.toFixed(1)} m` : "N/D"}</Text>
              <Text style={styles.hudText}>Azimute: {sensorData.orientation ? `${sensorData.orientation.toFixed(1)}°` : "N/D"}</Text>
              <Text style={styles.hudText}>Alt: {baroAltitude ? `${baroAltitude.toFixed(1)} m` : "GPS"}</Text>
            </View>

            {/* Botão para ativar câmera */}
            <TouchableOpacity 
                onPress={() => setCameraActive(true)} 
                style={styles.toggleCameraBtn}
            >
                <Text style={styles.btnTextSmall}>📷 Ligar Câmera</Text>
            </TouchableOpacity>

            {/* Botão travar fumaça também no mapa */}
            <TouchableOpacity 
                onPress={lockSmokePoint} 
                style={styles.lockButton}
            >
                <Text style={styles.btnText}>TRAVAR FUMAÇA</Text>
            </TouchableOpacity>

            {/* Botão Google Maps */}
            {pickedPoint && (
              <TouchableOpacity 
                  onPress={() => openInGoogleMaps(pickedPoint.latitude, pickedPoint.longitude)} 
                  style={styles.googleMapsBtn}
              >
                  <Text style={styles.btnText}>🗺️ Abrir no Google Maps</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Seção Inferior: Controles */}
        <View style={{ flex: 0.5, padding: 10 }}>
          {mapRegion && (
            <MapView style={{ height: 150 }} region={mapRegion} onPress={(e) => setPickedPoint(e.nativeEvent.coordinate)}>
              {location && <Marker coordinate={location} title="Eu" pinColor="blue" />}
              {pickedPoint && <Marker coordinate={pickedPoint} title="Alvo Fumaça" pinColor="red" />}
            </MapView>
          )}
          
          <Text style={{ fontWeight: 'bold', marginTop: 10 }}>Altura Estimada da Fumaça (m):</Text>
          <TextInput 
              style={styles.input} 
              keyboardType="numeric" 
              value={smokeHeight} 
              onChangeText={setSmokeHeight}
              placeholder="Ex: 100"
          />
          
          <View style={{ flexDirection: 'row', marginTop: 10 }}>
            <TouchableOpacity onPress={() => setPage(2)} style={styles.btn}><Text style={styles.btnText}>Manual / Relatório</Text></TouchableOpacity>
            <TouchableOpacity onPress={() => setPage(3)} style={styles.btnGray}><Text style={styles.btnText}>Configurações/Meteo</Text></TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  // PÁGINA 2: Triangulação e Relatórios
  if (page === 2) {
    return <Page2 location={location} baroAltitude={baroAltitude} sensorData={sensorData} meteoData={meteoData} setPage={setPage} openInGoogleMaps={openInGoogleMaps} />;
  }

  // PÁGINA 3: Configurações
  if (page === 3) {
    return (
      <ScrollView style={{ flex: 1, padding: 10 }}>
        <Text style={{ fontWeight: 'bold', fontSize: 16 }}>Dados de Sensores e Meteo (Rede)</Text>
        <Text style={{ color: 'red' }}>*** Os dados de Vento/Temp/Umidade precisam de API externa. ***</Text>
        <Text style={{ fontWeight: 'bold', marginTop: 10 }}>Dados Meteorológicos (Simulados/API):</Text>
        <Text>Altitude Local (GPS): {meteoData.localAltitude} m</Text>
        <Text>Temperatura: {meteoData.temp} °C</Text>
        <Text>Velocidade do Vento: {meteoData.windSpeed} km/h</Text>
        <Text>Direção do Vento: {meteoData.windDirection}</Text>
        <Text>Umidade do Ar: {meteoData.humidity} %</Text>
        
        <TouchableOpacity onPress={() => setPage(1)} style={styles.btnGray}><Text style={styles.btnText}>Voltar Camera</Text></TouchableOpacity>
      </ScrollView>
    );
  }

  return null;
}

// COMPONENTE PÁGINA 2
function Page2({ location, baroAltitude, sensorData, meteoData, setPage, openInGoogleMaps }) {
  const [activeTab, setActiveTab] = useState('triangulacao');
  
  // Estados para triangulação
  const [obs1, setObs1] = useState({ lat: '', lon: '', azimute: '' });
  const [obs2, setObs2] = useState({ lat: '', lon: '', azimute: '' });
  const [intersection, setIntersection] = useState(null);
  
  // Estados para observador único
  const [singleObs, setSingleObs] = useState({ distancia: '', azimute: '', elevacao: '' });
  const [singleResult, setSingleResult] = useState(null);

  function calculateIntersection() {
    const lat1 = parseFloat(obs1.lat);
    const lon1 = parseFloat(obs1.lon);
    const az1 = parseFloat(obs1.azimute);
    const lat2 = parseFloat(obs2.lat);
    const lon2 = parseFloat(obs2.lon);
    const az2 = parseFloat(obs2.azimute);

    if (isNaN(lat1) || isNaN(lon1) || isNaN(az1) || isNaN(lat2) || isNaN(lon2) || isNaN(az2)) {
      Alert.alert("❌ Erro", "Preencha todos os campos corretamente com valores numéricos");
      return;
    }

    if (lat1 < -90 || lat1 > 90 || lat2 < -90 || lat2 > 90) {
      Alert.alert("❌ Erro", "Latitude deve estar entre -90° e 90°");
      return;
    }

    if (lon1 < -180 || lon1 > 180 || lon2 < -180 || lon2 > 180) {
      Alert.alert("❌ Erro", "Longitude deve estar entre -180° e 180°");
      return;
    }

    if (az1 < 0 || az1 >= 360 || az2 < 0 || az2 >= 360) {
      Alert.alert("❌ Erro", "Azimute deve estar entre 0° e 359°");
      return;
    }

    const φ1 = lat1 * deg2rad;
    const λ1 = lon1 * deg2rad;
    const θ13 = az1 * deg2rad;
    const φ2 = lat2 * deg2rad;
    const λ2 = lon2 * deg2rad;
    const θ23 = az2 * deg2rad;

    const Δφ = φ2 - φ1;
    const Δλ = λ2 - λ1;

    const δ12 = 2 * Math.asin(Math.sqrt(
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2)
    ));

    if (Math.abs(δ12) < 1e-10) {
      Alert.alert("❌ Erro", "Os observadores estão na mesma posição");
      return;
    }

    const cosθa = (Math.sin(φ2) - Math.sin(φ1) * Math.cos(δ12)) / (Math.sin(δ12) * Math.cos(φ1));
    const sinθa = Math.sin(Δλ) * Math.cos(φ2) / Math.sin(δ12);
    const θa = Math.atan2(sinθa, cosθa);

    const θ1 = θ13 - θa;
    const θ2 = θa - θ23 + Math.PI;

    if (Math.sin(θ1) === 0 && Math.sin(θ2) === 0) {
      Alert.alert("❌ Erro", "Linhas de visada são paralelas ou colineares");
      return;
    }

    const cosθ3 = Math.acos(-Math.cos(θ1) * Math.cos(θ2) + Math.sin(θ1) * Math.sin(θ2) * Math.cos(δ12));
    const δ13 = Math.atan2(Math.sin(δ12) * Math.sin(θ1) * Math.sin(θ2), Math.cos(θ2) + Math.cos(θ1) * cosθ3);

    const φ3 = Math.asin(Math.sin(φ1) * Math.cos(δ13) + Math.cos(φ1) * Math.sin(δ13) * Math.cos(θ13));
    const Δλ13 = Math.atan2(Math.sin(θ13) * Math.sin(δ13) * Math.cos(φ1), Math.cos(δ13) - Math.sin(φ1) * Math.sin(φ3));
    const λ3 = λ1 + Δλ13;

    const result = {
      latitude: φ3 / deg2rad,
      longitude: λ3 / deg2rad,
      distObs1: δ13 * R,
      distObs2: Math.acos(Math.sin(φ2) * Math.sin(φ3) + Math.cos(φ2) * Math.cos(φ3) * Math.cos(λ3 - λ2)) * R
    };

    setIntersection(result);
    setActiveTab('mapa');
    Alert.alert("✅ Sucesso", "Interseção calculada! Visualize no mapa.");
  }

  function calculateSingleObserver() {
    const dist = parseFloat(singleObs.distancia);
    const azim = parseFloat(singleObs.azimute);
    const elev = parseFloat(singleObs.elevacao) || 0;

    if (isNaN(dist) || isNaN(azim)) {
      Alert.alert("❌ Erro", "Preencha distância e azimute com valores numéricos");
      return;
    }

    if (dist <= 0) {
      Alert.alert("❌ Erro", "A distância deve ser maior que zero");
      return;
    }

    if (azim < 0 || azim >= 360) {
      Alert.alert("❌ Erro", "Azimute deve estar entre 0° e 359°");
      return;
    }

    if (!location) {
      Alert.alert("❌ Erro", "Localização indisponível");
      return;
    }

    const point = destinationPoint(location.latitude, location.longitude, dist, azim);
    setSingleResult({
      ...point,
      distance: dist,
      azimute: azim,
      elevacao: elev
    });
    setActiveTab('mapa');
    Alert.alert("✅ Sucesso", "Ponto calculado! Visualize no mapa.");
  }

  function generateReport() {
    const report = `
═══════════════════════════════════════
      RELATÓRIO DE DETECÇÃO DE FUMAÇA
═══════════════════════════════════════

📅 Data/Hora: ${new Date().toLocaleString('pt-BR')}

📍 DADOS DO OBSERVADOR
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Latitude: ${location?.latitude.toFixed(6) || 'N/D'}°
Longitude: ${location?.longitude.toFixed(6) || 'N/D'}°
Altitude GPS: ${sensorData.gpsAltitude.toFixed(1)} m
Altitude Barométrica: ${baroAltitude?.toFixed(1) || 'N/D'} m
Orientação: ${sensorData.orientation?.toFixed(1) || 'N/D'}°

🌡️ CONDIÇÕES METEOROLÓGICAS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Temperatura: ${meteoData.temp}°C
Vento: ${meteoData.windSpeed} km/h (${meteoData.windDirection})
Umidade: ${meteoData.humidity}%

${activeTab === 'triangulacao' && intersection ? `
📐 TRIANGULAÇÃO (2 OBSERVADORES)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Observador 1:
  • Lat: ${obs1.lat}°
  • Lon: ${obs1.lon}°
  • Azimute: ${obs1.azimute}°

Observador 2:
  • Lat: ${obs2.lat}°
  • Lon: ${obs2.lon}°
  • Azimute: ${obs2.azimute}°

🎯 POSIÇÃO DO FOCO:
  • Latitude: ${intersection.latitude.toFixed(6)}°
  • Longitude: ${intersection.longitude.toFixed(6)}°
  • Distância Obs1: ${intersection.distObs1.toFixed(1)} m
  • Distância Obs2: ${intersection.distObs2.toFixed(1)} m
` : ''}

${activeTab === 'single' && singleResult ? `
📏 OBSERVADOR ÚNICO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Distância: ${singleObs.distancia} m
Azimute: ${singleObs.azimute}°
Elevação: ${singleObs.elevacao}°

🎯 POSIÇÃO ESTIMADA:
  • Latitude: ${singleResult.latitude.toFixed(6)}°
  • Longitude: ${singleResult.longitude.toFixed(6)}°
` : ''}

═══════════════════════════════════════
    Gerado por SmokeDistance App
═══════════════════════════════════════
    `.trim();

    Alert.alert("Relatório Gerado", report, [
      { text: "Cancelar" },
      { 
        text: "Compartilhar", 
        onPress: async () => {
          try {
            await Share.share({
              message: report,
              title: 'Relatório de Detecção de Fumaça'
            });
          } catch (error) {
            Alert.alert("Erro", "Não foi possível compartilhar o relatório");
          }
        }
      }
    ]);
  }

  return (
    <ScrollView style={styles.page2Container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>SmokeDistance — medir distância da fumaça</Text>
      </View>

      {/* Abas */}
      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'triangulacao' && styles.tabActive]}
          onPress={() => setActiveTab('triangulacao')}
        >
          <Text style={[styles.tabText, activeTab === 'triangulacao' && styles.tabTextActive]}>Triangulação</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'single' && styles.tabActive]}
          onPress={() => setActiveTab('single')}
        >
          <Text style={[styles.tabText, activeTab === 'single' && styles.tabTextActive]}>1 observador (elevação)</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'mapa' && styles.tabActive]}
          onPress={() => setActiveTab('mapa')}
        >
          <Text style={[styles.tabText, activeTab === 'mapa' && styles.tabTextActive]}>Mapa / linha</Text>
        </TouchableOpacity>
      </View>

      {/* Conteúdo da aba Triangulação */}
      {activeTab === 'triangulacao' && (
        <View style={styles.content}>
          <Text style={styles.sectionTitle}>Triangulação — insira duas observações</Text>
          
          <View style={styles.observerCard}>
            <Text style={styles.observerLabel}>Observador 1 (lat, lon, azimute°)</Text>
            <View style={styles.inputRow}>
              <TextInput 
                style={styles.inputSmall} 
                placeholder="Latitude"
                keyboardType="numeric"
                value={obs1.lat}
                onChangeText={(val) => setObs1({...obs1, lat: val})}
              />
              <TextInput 
                style={styles.inputSmall} 
                placeholder="Longitude"
                keyboardType="numeric"
                value={obs1.lon}
                onChangeText={(val) => setObs1({...obs1, lon: val})}
              />
              <TextInput 
                style={styles.inputSmall} 
                placeholder="Azimute"
                keyboardType="numeric"
                value={obs1.azimute}
                onChangeText={(val) => setObs1({...obs1, azimute: val})}
              />
            </View>
            <TouchableOpacity 
              style={styles.btnFill}
              onPress={() => location && setObs1({
                lat: location.latitude.toFixed(6),
                lon: location.longitude.toFixed(6),
                azimute: sensorData.orientation?.toFixed(1) || ''
              })}
            >
              <Text style={styles.btnFillText}>📍 Usar Posição Atual</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.observerCard}>
            <Text style={styles.observerLabel}>Observador 2 (lat, lon, azimute°)</Text>
            <View style={styles.inputRow}>
              <TextInput 
                style={styles.inputSmall} 
                placeholder="Latitude"
                keyboardType="numeric"
                value={obs2.lat}
                onChangeText={(val) => setObs2({...obs2, lat: val})}
              />
              <TextInput 
                style={styles.inputSmall} 
                placeholder="Longitude"
                keyboardType="numeric"
                value={obs2.lon}
                onChangeText={(val) => setObs2({...obs2, lon: val})}
              />
              <TextInput 
                style={styles.inputSmall} 
                placeholder="Azimute"
                keyboardType="numeric"
                value={obs2.azimute}
                onChangeText={(val) => setObs2({...obs2, azimute: val})}
              />
            </View>
          </View>

          <TouchableOpacity style={styles.btnPrimary} onPress={calculateIntersection}>
            <Text style={styles.btnText}>🎯 Calcular interseção</Text>
          </TouchableOpacity>

          {intersection && (
            <View style={styles.resultCard}>
              <Text style={styles.resultTitle}>✅ Resultado da Triangulação</Text>
              <Text style={styles.resultText}>📍 Latitude: {intersection.latitude.toFixed(6)}°</Text>
              <Text style={styles.resultText}>📍 Longitude: {intersection.longitude.toFixed(6)}°</Text>
              <Text style={styles.resultText}>📏 Distância Obs1: {intersection.distObs1.toFixed(1)} m ({(intersection.distObs1/1000).toFixed(2)} km)</Text>
              <Text style={styles.resultText}>📏 Distância Obs2: {intersection.distObs2.toFixed(1)} m ({(intersection.distObs2/1000).toFixed(2)} km)</Text>
              
              <View style={styles.resultButtons}>
                <TouchableOpacity 
                  style={styles.btnCopy}
                  onPress={async () => {
                    await Clipboard.setStringAsync(`${intersection.latitude.toFixed(6)}, ${intersection.longitude.toFixed(6)}`);
                    Alert.alert("✅", "Coordenadas copiadas!");
                  }}
                >
                  <Text style={styles.btnCopyText}>📋 Copiar Coordenadas</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.btnMaps}
                  onPress={() => openInGoogleMaps(intersection.latitude, intersection.longitude)}
                >
                  <Text style={styles.btnCopyText}>🗺️ Ver no Maps</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      )}

      {/* Conteúdo da aba 1 observador */}
      {activeTab === 'single' && (
        <View style={styles.content}>
          <Text style={styles.sectionTitle}>Cálculo com 1 Observador (Distância + Azimute)</Text>
          
          <View style={styles.observerCard}>
            <Text style={styles.observerLabel}>Dados da Observação</Text>
            
            <Text style={styles.inputLabel}>Distância Horizontal (m)</Text>
            <TextInput 
              style={styles.input} 
              placeholder="Ex: 1500"
              keyboardType="numeric"
              value={singleObs.distancia}
              onChangeText={(val) => setSingleObs({...singleObs, distancia: val})}
            />
            
            <Text style={styles.inputLabel}>Azimute (graus)</Text>
            <TextInput 
              style={styles.input} 
              placeholder="Ex: 45"
              keyboardType="numeric"
              value={singleObs.azimute}
              onChangeText={(val) => setSingleObs({...singleObs, azimute: val})}
            />
            
            <Text style={styles.inputLabel}>Ângulo de Elevação (graus) - opcional</Text>
            <TextInput 
              style={styles.input} 
              placeholder="Ex: 10"
              keyboardType="numeric"
              value={singleObs.elevacao}
              onChangeText={(val) => setSingleObs({...singleObs, elevacao: val})}
            />

            <TouchableOpacity 
              style={styles.btnFill}
              onPress={() => setSingleObs({
                ...singleObs,
                azimute: sensorData.orientation?.toFixed(1) || ''
              })}
            >
              <Text style={styles.btnFillText}>🧭 Usar Azimute Atual</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.btnPrimary} onPress={calculateSingleObserver}>
            <Text style={styles.btnText}>📐 Calcular Posição</Text>
          </TouchableOpacity>

          {singleResult && (
            <View style={styles.resultCard}>
              <Text style={styles.resultTitle}>✅ Posição Calculada</Text>
              <Text style={styles.resultText}>📍 Latitude: {singleResult.latitude.toFixed(6)}°</Text>
              <Text style={styles.resultText}>📍 Longitude: {singleResult.longitude.toFixed(6)}°</Text>
              <Text style={styles.resultText}>📏 Distância: {singleResult.distance.toFixed(1)} m ({(singleResult.distance/1000).toFixed(2)} km)</Text>
              <Text style={styles.resultText}>🧭 Azimute: {singleResult.azimute}°</Text>
              {singleResult.elevacao !== 0 && (
                <Text style={styles.resultText}>📐 Elevação: {singleResult.elevacao}°</Text>
              )}
              
              <View style={styles.resultButtons}>
                <TouchableOpacity 
                  style={styles.btnCopy}
                  onPress={async () => {
                    await Clipboard.setStringAsync(`${singleResult.latitude.toFixed(6)}, ${singleResult.longitude.toFixed(6)}`);
                    Alert.alert("✅", "Coordenadas copiadas!");
                  }}
                >
                  <Text style={styles.btnCopyText}>📋 Copiar Coordenadas</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.btnMaps}
                  onPress={() => openInGoogleMaps(singleResult.latitude, singleResult.longitude)}
                >
                  <Text style={styles.btnCopyText}>🗺️ Ver no Maps</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      )}

      {/* Conteúdo da aba Mapa */}
      {activeTab === 'mapa' && (
        <View style={styles.content}>
          <Text style={styles.sectionTitle}>Visualização no Mapa</Text>
          
          {location && (
            <MapView 
              style={styles.mapView}
              initialRegion={{
                latitude: intersection?.latitude || singleResult?.latitude || location.latitude,
                longitude: intersection?.longitude || singleResult?.longitude || location.longitude,
                latitudeDelta: 0.05,
                longitudeDelta: 0.05,
              }}
            >
              {/* Marcador da posição atual */}
              <Marker
                coordinate={{
                  latitude: location.latitude,
                  longitude: location.longitude
                }}
                title="Minha Posição"
                pinColor="blue"
              />

              {/* Triangulação: Observadores e Interseção */}
              {intersection && obs1.lat && obs1.lon && (
                <>
                  <Marker
                    coordinate={{
                      latitude: parseFloat(obs1.lat),
                      longitude: parseFloat(obs1.lon)
                    }}
                    title="Observador 1"
                    pinColor="green"
                  />
                  <Marker
                    coordinate={{
                      latitude: parseFloat(obs2.lat),
                      longitude: parseFloat(obs2.lon)
                    }}
                    title="Observador 2"
                    pinColor="orange"
                  />
                  <Marker
                    coordinate={{
                      latitude: intersection.latitude,
                      longitude: intersection.longitude
                    }}
                    title="Foco de Fumaça"
                    description={`Triangulação: ${intersection.distObs1.toFixed(0)}m / ${intersection.distObs2.toFixed(0)}m`}
                    pinColor="red"
                  />
                  
                  {/* Linhas de visada */}
                  <Polyline
                    coordinates={[
                      { latitude: parseFloat(obs1.lat), longitude: parseFloat(obs1.lon) },
                      { latitude: intersection.latitude, longitude: intersection.longitude }
                    ]}
                    strokeColor="rgba(0,255,0,0.6)"
                    strokeWidth={3}
                  />
                  <Polyline
                    coordinates={[
                      { latitude: parseFloat(obs2.lat), longitude: parseFloat(obs2.lon) },
                      { latitude: intersection.latitude, longitude: intersection.longitude }
                    ]}
                    strokeColor="rgba(255,165,0,0.6)"
                    strokeWidth={3}
                  />
                </>
              )}

              {/* Observador único */}
              {singleResult && !intersection && (
                <>
                  <Marker
                    coordinate={{
                      latitude: singleResult.latitude,
                      longitude: singleResult.longitude
                    }}
                    title="Foco Estimado"
                    description={`Distância: ${singleResult.distance.toFixed(0)}m | Azimute: ${singleResult.azimute}°`}
                    pinColor="red"
                  />
                  <Polyline
                    coordinates={[
                      { latitude: location.latitude, longitude: location.longitude },
                      { latitude: singleResult.latitude, longitude: singleResult.longitude }
                    ]}
                    strokeColor="rgba(255,0,0,0.6)"
                    strokeWidth={3}
                    lineDashPattern={[10, 5]}
                  />
                </>
              )}
            </MapView>
          )}

          {!intersection && !singleResult && (
            <View style={styles.mapInfo}>
              <Text style={styles.mapInfoText}>
                ℹ️ Calcule uma posição nas abas anteriores para visualizar no mapa
              </Text>
            </View>
          )}

          {intersection && obs1.lat && obs1.lon && (
            <View style={styles.legendCard}>
              <Text style={styles.legendTitle}>📊 Estatísticas da Triangulação:</Text>
              <Text style={styles.statsText}>
                • Distância entre observadores: {calculateDistanceHaversine(
                  parseFloat(obs1.lat), 
                  parseFloat(obs1.lon), 
                  parseFloat(obs2.lat), 
                  parseFloat(obs2.lon)
                ).toFixed(1)} m
              </Text>
              <Text style={styles.statsText}>
                • Precisão estimada: ±{(Math.max(intersection.distObs1, intersection.distObs2) * 0.05 / 1000).toFixed(2)} km
              </Text>
              <Text style={styles.statsText}>
                • Ângulo de intersecção: {Math.abs(parseFloat(obs1.azimute) - parseFloat(obs2.azimute)).toFixed(1)}°
              </Text>
              <View style={{marginTop: 10, padding: 10, backgroundColor: '#fff3cd', borderRadius: 5}}>
                <Text style={{fontSize: 12, color: '#856404'}}>
                  💡 Dica: Para melhor precisão, os observadores devem estar a pelo menos 500m de distância
                  e o ângulo entre as linhas de visada deve estar entre 30° e 150°.
                </Text>
              </View>
            </View>
          )}

          {intersection && (
            <View style={styles.legendCard}>
              <Text style={styles.legendTitle}>📍 Legenda:</Text>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, {backgroundColor: 'green'}]} />
                <Text style={styles.legendText}>Observador 1 - Linha Verde</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, {backgroundColor: 'orange'}]} />
                <Text style={styles.legendText}>Observador 2 - Linha Laranja</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, {backgroundColor: 'red'}]} />
                <Text style={styles.legendText}>Foco de Fumaça (Interseção)</Text>
              </View>
            </View>
          )}

          {singleResult && !intersection && (
            <View style={styles.legendCard}>
              <Text style={styles.legendTitle}>📍 Legenda:</Text>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, {backgroundColor: 'blue'}]} />
                <Text style={styles.legendText}>Minha Posição</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, {backgroundColor: 'red'}]} />
                <Text style={styles.legendText}>Foco Estimado - Linha Vermelha</Text>
              </View>
            </View>
          )}
        </View>
      )}

      {/* Seção de Exportar Relatório */}
      <View style={styles.exportSection}>
        <Text style={styles.sectionTitle}>Exportar relatório</Text>
        <TouchableOpacity style={styles.btnExport} onPress={generateReport}>
          <Text style={styles.btnText}>📄 Gerar / Compartilhar relatório</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity onPress={() => setPage(1)} style={styles.btnBack}>
        <Text style={styles.btnText}>← Voltar para Câmera</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

// ESTILOS
const styles = StyleSheet.create({
  // Página 1
  lockButton: {
    position: 'absolute', 
    bottom: 20, 
    alignSelf: 'center', 
    backgroundColor: 'red', 
    padding: 15, 
    borderRadius: 10,
    elevation: 3,
  },
  btn: {
    flex: 1,
    backgroundColor: '#1E90FF', 
    padding: 10,
    marginRight: 5,
    marginTop: 5,
    alignItems: 'center',
    borderRadius: 5,
    elevation: 3
  },
  btnGray: {
    flex: 1,
    backgroundColor: '#808080',
    padding: 10,
    marginTop: 5,
    alignItems: 'center',
    borderRadius: 5,
    elevation: 3
  },
  btnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  hud: {
    position: 'absolute', 
    top: 10, 
    left: 10, 
    backgroundColor: 'rgba(0,0,0,0.8)',
    padding: 10, 
    borderRadius: 5
  },
  hudText: {
    color: '#fff', 
    fontWeight: 'bold', 
    fontSize: 12,
  },
  hudMap: {
    position: 'absolute', 
    top: 10, 
    left: 10, 
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 8, 
    borderRadius: 5,
    maxWidth: '90%',
  },
  toggleCameraBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 10,
    borderRadius: 8,
    elevation: 3,
  },
  btnTextSmall: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 12,
  },
  googleMapsBtn: {
    position: 'absolute',
    bottom: 80,
    alignSelf: 'center',
    backgroundColor: '#34A853',
    padding: 15,
    borderRadius: 10,
    elevation: 3,
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    borderWidth: 1, 
    borderColor: '#bbb', 
    padding: 8, 
    marginBottom: 5, 
    borderRadius: 5
  },
  
  // Página 2
  page2Container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#1E90FF',
    padding: 15,
    paddingTop: 40,
    elevation: 4,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    elevation: 2,
  },
  tab: {
    flex: 1,
    padding: 15,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: '#1E90FF',
  },
  tabText: {
    color: '#666',
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
  },
  tabTextActive: {
    color: '#1E90FF',
    fontWeight: '700',
  },
  content: {
    padding: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  observerCard: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    elevation: 2,
  },
  observerLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#555',
    marginBottom: 10,
  },
  inputRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  inputSmall: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 10,
    marginHorizontal: 3,
    borderRadius: 8,
    backgroundColor: '#f9f9f9',
    fontSize: 14,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#555',
    marginBottom: 5,
    marginTop: 5,
  },
  btnFill: {
    backgroundColor: '#f0f0f0',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 5,
  },
  btnFillText: {
    color: '#1E90FF',
    fontWeight: '600',
    fontSize: 14,
  },
  btnPrimary: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginVertical: 10,
    elevation: 3,
  },
  resultCard: {
    backgroundColor: '#e8f5e9',
    padding: 15,
    borderRadius: 10,
    marginTop: 15,
    borderLeftWidth: 4,
    borderLeftColor: '#4caf50',
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2e7d32',
    marginBottom: 10,
  },
  resultText: {
    fontSize: 14,
    color: '#333',
    marginBottom: 5,
    lineHeight: 20,
  },
  resultButtons: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 8,
  },
  btnCopy: {
    flex: 1,
    backgroundColor: '#2196f3',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  btnMaps: {
    flex: 1,
    backgroundColor: '#ff9800',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  btnCopyText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 13,
  },
  exportSection: {
    padding: 15,
    marginTop: 20,
  },
  btnExport: {
    backgroundColor: '#4caf50',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    elevation: 3,
  },
  btnBack: {
    backgroundColor: '#757575',
    padding: 15,
    margin: 15,
    borderRadius: 10,
    alignItems: 'center',
    elevation: 2,
  },
  mapView: {
    width: '100%',
    height: 400,
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 15,
  },
  mapInfo: {
    backgroundColor: '#fff3cd',
    padding: 15,
    borderRadius: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#ffc107',
    marginTop: 10,
  },
  mapInfoText: {
    color: '#856404',
    fontSize: 14,
    textAlign: 'center',
  },
  legendCard: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    elevation: 2,
    marginTop: 10,
  },
  legendTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 5,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 10,
  },
  legendText: {
    fontSize: 14,
    color: '#555',
  },
  statsText: {
    fontSize: 13,
    color: '#555',
    marginVertical: 3,
    lineHeight: 18,
  },
});