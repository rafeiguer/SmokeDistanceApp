// App.js - SmokeDistance Full RA + HUD na Câmera + Triangulação + Sensores + Relatório
import React, { useState, useEffect, useRef } from "react";
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, Dimensions } from "react-native";
import MapView, { Marker } from "react-native-maps";
import * as Location from "expo-location";
import { Camera } from "expo-camera";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import { Barometer, Accelerometer, Gyroscope } from "expo-sensors";

const R = 6371000;
const deg2rad = Math.PI / 180;

// Utils de coordenadas
function latLonToXY(lat, lon, lat0 = lat) {
  const x = lon * deg2rad * R * Math.cos(lat0 * deg2rad);
  const y = lat * deg2rad * R;
  return { x, y };
}
function xyToLatLon(x, y, lat0 = y / (deg2rad * R)) {
  const lat = y / (deg2rad * R);
  const lon = x / (deg2rad * R * Math.cos(lat0 * deg2rad));
  return { lat, lon };
}
function intersectLines(p1, d1, p2, d2) {
  const a = [
    [d1.x, -d2.x],
    [d1.y, -d2.y]
  ];
  const b = { x: p2.x - p1.x, y: p2.y - p1.y };
  const det = a[0][0] * a[1][1] - a[0][1] * a[1][0];
  if (Math.abs(det) < 1e-9) return { ok: false };
  const t = (b.x * a[1][1] - b.y * a[0][1]) / det;
  return { ok: true, x: p1.x + t * d1.x, y: p1.y + t * d1.y };
}
function bearingToDirectionVector(bearingDeg) {
  const θ = bearingDeg * deg2rad;
  return { x: Math.sin(θ), y: Math.cos(θ) };
}

export default function App() {
  const [page, setPage] = useState(1);
  const [location, setLocation] = useState(null);
  const [mapRegion, setMapRegion] = useState(null);
  const [pickedPoint, setPickedPoint] = useState(null);
  const [obs1, setObs1] = useState({ lat: "", lon: "", bearing: "" });
  const [obs2, setObs2] = useState({ lat: "", lon: "", bearing: "" });
  const [intersection, setIntersection] = useState(null);
  const [distanceSingle, setDistanceSingle] = useState(null);

  const [cameraPermission, setCameraPermission] = useState(null);
  const cameraRef = useRef(null);

  const [sensorData, setSensorData] = useState({
    temperature: null,
    windSpeed: null,
    windDir: null,
    altitude: null,
    obsAltitude: null,
    time: null,
    gyro: null,
    accel: null
  });

  const cacheFile = FileSystem.documentDirectory + "mapCache.json";

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") { Alert.alert("Erro", "Permissão de localização negada."); return; }
      const loc = await Location.getCurrentPositionAsync({});
      setLocation(loc.coords);
      setMapRegion({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        latitudeDelta: 0.1,
        longitudeDelta: 0.1
      });
      setSensorData(prev => ({ ...prev, obsAltitude: loc.coords.altitude || 0, time: new Date().toLocaleString() }));

      const camStatus = await Camera.requestCameraPermissionsAsync();
      setCameraPermission(camStatus.status === "granted");

      const exists = await FileSystem.getInfoAsync(cacheFile);
      if (exists.exists) {
        const data = await FileSystem.readAsStringAsync(cacheFile);
        const json = JSON.parse(data);
        setSensorData(prev => ({ ...prev, ...json }));
      } else {
        const weatherData = { temperature: 25, windSpeed: 5, windDir: 180 };
        setSensorData(prev => ({ ...prev, ...weatherData }));
        await FileSystem.writeAsStringAsync(cacheFile, JSON.stringify(weatherData));
      }
    })();

    const baroSub = Barometer.addListener(data => setSensorData(prev => ({ ...prev, altitude: data.pressure })));
    const gyroSub = Gyroscope.addListener(data => setSensorData(prev => ({ ...prev, gyro: data })));
    const accSub = Accelerometer.addListener(data => setSensorData(prev => ({ ...prev, accel: data })));
    return () => { baroSub.remove(); gyroSub.remove(); accSub.remove(); };
  }, []);

  const handleMapPress = (e) => { setPickedPoint(e.nativeEvent.coordinate); };

  function runTriangulation() {
    try {
      const a1 = parseFloat(obs1.lat), o1 = parseFloat(obs1.lon), b1 = parseFloat(obs1.bearing);
      const a2 = parseFloat(obs2.lat), o2 = parseFloat(obs2.lon), b2 = parseFloat(obs2.bearing);
      if ([a1,o1,b1,a2,o2,b2].some(v => !isFinite(v))) { Alert.alert("Erro","Preencha lat, lon e azimute"); return; }
      const lat0 = (a1+a2)/2;
      const p1 = latLonToXY(a1,o1,lat0); const p2 = latLonToXY(a2,o2,lat0);
      const d1 = bearingToDirectionVector(b1); const d2 = bearingToDirectionVector(b2);
      const inter = intersectLines(p1,d1,p2,d2);
      if(!inter.ok){ Alert.alert("Erro","Linhas paralelas"); return; }
      const latlon = xyToLatLon(inter.x, inter.y, lat0);
      setIntersection({ lat: latlon.lat, lon: latlon.lon });
      setPickedPoint({ latitude: latlon.lat, longitude: latlon.lon });
      setMapRegion({ latitude: latlon.lat, longitude: latlon.lon, latitudeDelta:0.05, longitudeDelta:0.05 });
    } catch(e){ Alert.alert("Erro", e.message || String(e)); }
  }

  function calcSingleDistance() {
    if(!pickedPoint || !location) return;
    const dx = pickedPoint.latitude - location.latitude;
    const dy = pickedPoint.longitude - location.longitude;
    const dist = Math.sqrt(dx*dx + dy*dy) * R * Math.PI/180;
    setDistanceSingle(dist);
  }

  useEffect(() => {
    let interval = setInterval(() => {
      if(pickedPoint && location) calcSingleDistance();
    }, 500);
    return () => clearInterval(interval);
  }, [pickedPoint, location]);

  const exportReport = async () => {
    let lines = [];
    lines.push("Relatório Full RA");
    if(pickedPoint) lines.push(`Ponto: ${pickedPoint.latitude.toFixed(6)}, ${pickedPoint.longitude.toFixed(6)}`);
    lines.push(`Altitude observador: ${sensorData.obsAltitude}`);
    lines.push(`Altitude objeto: ${sensorData.altitude}`);
    lines.push(`Distância: ${distanceSingle?.toFixed(1) || "N/D"}`);
    lines.push(`Vento: ${sensorData.windSpeed}, Temp: ${sensorData.temperature}`);
    lines.push(`Hora: ${sensorData.time}`);
    const path = FileSystem.cacheDirectory + "report.txt";
    await FileSystem.writeAsStringAsync(path, lines.join("\n"));
    await Sharing.shareAsync(path);
  };

  if(page === 1){
    return (
      <View style={{flex:1}}>
        {cameraPermission &&
          <View style={{flex:0.5}}>
            <Camera style={{flex:1}} ref={cameraRef} />
            {/* HUD sobre a câmera */}
            <View style={styles.hud}>
              <Text style={styles.hudText}>Distância: {distanceSingle?.toFixed(1) || "N/D"} m</Text>
              <Text style={styles.hudText}>Alt Objeto: {sensorData.altitude}</Text>
              <Text style={styles.hudText}>Vento: {sensorData.windSpeed} m/s</Text>
              <Text style={styles.hudText}>Temp: {sensorData.temperature}°C</Text>
            </View>
          </View>
        }
        <View style={{flex:0.5, padding:10}}>
          {mapRegion && <MapView style={{height:150, marginTop:10}} region={mapRegion} onPress={handleMapPress}>
            {pickedPoint && <Marker coordinate={pickedPoint} title="Alvo" pinColor="red"/>}
          </MapView>}
          <View style={{flexDirection:'row', marginTop:10}}>
            <TouchableOpacity onPress={()=>setPage(2)} style={styles.btn}><Text style={styles.btnText}>Manual / Relatório</Text></TouchableOpacity>
            <TouchableOpacity onPress={()=>setPage(3)} style={styles.btnGray}><Text style={styles.btnText}>Configurações</Text></TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  if(page === 2){
    return (
      <ScrollView style={{flex:1,padding:10}}>
        <Text style={{fontWeight:'bold', fontSize:16}}>Triangulação Manual</Text>
        <Text>Obs1:</Text>
        <TextInput placeholder="Lat" keyboardType="numeric" value={obs1.lat} onChangeText={t=>setObs1({...obs1,lat:t})} />
        <TextInput placeholder="Lon" keyboardType="numeric" value={obs1.lon} onChangeText={t=>setObs1({...obs1,lon:t})} />
        <TextInput placeholder="Azimute" keyboardType="numeric" value={obs1.bearing} onChangeText={t=>setObs1({...obs1,bearing:t})} />
        <Text>Obs2:</Text>
        <TextInput placeholder="Lat" keyboardType="numeric" value={obs2.lat} onChangeText={t=>setObs2({...obs2,lat:t})} />
        <TextInput placeholder="Lon" keyboardType="numeric" value={obs2.lon} onChangeText={t=>setObs2({...obs2,lon:t})} />
        <TextInput placeholder="Azimute" keyboardType="numeric" value={obs2.bearing} onChangeText={t=>setObs2({...obs2,bearing:t})} />
        <TouchableOpacity onPress={runTriangulation} style={styles.btn}><Text style={styles.btnText}>Calcular Triangulação</Text></TouchableOpacity>
        <TouchableOpacity onPress={calcSingleDistance} style={[styles.btn,{backgroundColor:'green'}]}><Text style={styles.btnText}>Calcular Distância</Text></TouchableOpacity>
        <TouchableOpacity onPress={exportReport} style={[styles.btn,{backgroundColor:'purple'}]}><Text style={styles.btnText}>Gerar / Compartilhar Relatório</Text></TouchableOpacity>
        <TouchableOpacity onPress={()=>setPage(1)} style={styles.btnGray}><Text style={styles.btnText}>Voltar Camera</Text></TouchableOpacity>
      </ScrollView>
    );
  }

  if(page === 3){
    return (
      <ScrollView style={{flex:1,padding:10}}>
        <Text style={{fontWeight:'bold', fontSize:16}}>Configurações</Text>
        <Text>Habilitar Bluetooth: (opcional)</Text>
        <Text>Desligar sensores não essenciais: (opcional)</Text>
        <TouchableOpacity onPress={()=>setPage(1)} style={styles.btnGray}><Text style={styles.btnText}>Voltar Camera</Text></TouchableOpacity>
      </ScrollView>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  btn:{flex:1,backgroundColor:'blue',padding:10,marginRight:5,marginTop:5,alignItems:'center'},
  btnGray:{flex:1,backgroundColor:'gray',padding:10,marginTop:5,alignItems:'center'},
  btnText:{color:'#fff',fontWeight:'600'},
  hud:{position:'absolute', top:10, left:10, backgroundColor:'rgba(0,0,0,0.4)', padding:5, borderRadius:5},
  hudText:{color:'#fff', fontWeight:'bold'}
});
