import React, { useState, useEffect } from "react";
import { View, StyleSheet } from "react-native";
import MapView, { Marker, Circle } from "react-native-maps";
import * as Location from "expo-location";
import * as Network from "expo-network";

// 👉 usa a função de distância do geo.js
import { calculateDistanceHaversine } from "../utils/geo";

// 👉 triangulação de focos (satélite) — pode ser usada depois
import { calcularTriangulacao } from "../utils/triangulation";

// Firebase (bootstrap leve)
import { getDb } from "../firebase";
import { collection, addDoc, onSnapshot } from "firebase/firestore";

export default function MapPanel() {
  const [location, setLocation] = useState(null);
  const [lastSignalLocation, setLastSignalLocation] = useState(null);
  const [markers, setMarkers] = useState([]);
  const [circles, setCircles] = useState([]);

  // 👉 pega o Firestore via bootstrap
  const db = getDb();

  // 🔥 salvar ping no Firebase
  const savePing = async (loc) => {
    if (!db) return;
    await addDoc(collection(db, "pings"), {
      latitude: loc.latitude,
      longitude: loc.longitude,
      timestamp: Date.now(),
    });
  };

  // 🔥 salvar círculo no Firebase
  const saveCircle = async (center, radius) => {
    if (!db) return;
    await addDoc(collection(db, "circles"), {
      latitude: center.latitude,
      longitude: center.longitude,
      radius,
      timestamp: Date.now(),
    });
  };

  // 📡 pegar localização inicial
  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return;
      let loc = await Location.getCurrentPositionAsync({});
      setLocation(loc.coords);
    })();
  }, []);

  // 📡 monitorar rede e salvar ping/círculo
  useEffect(() => {
    const checkNetwork = async () => {
      const netInfo = await Network.getNetworkStateAsync();
      if (netInfo.isConnected && location) {
        setLastSignalLocation(location);
        savePing(location); // salva ping no Firebase
      } else if (!netInfo.isConnected && location && lastSignalLocation) {
        // 👉 usa geo.js para calcular distância
        const d = calculateDistanceHaversine(
          lastSignalLocation.latitude,
          lastSignalLocation.longitude,
          location.latitude,
          location.longitude
        );
        const radiusMeters = d * 1000; // km → metros
        saveCircle(lastSignalLocation, radiusMeters); // salva círculo no Firebase
      }
    };

    const interval = setInterval(checkNetwork, 5000);
    return () => clearInterval(interval);
  }, [location, lastSignalLocation]);

  // 🔄 escutar Firebase em tempo real
  useEffect(() => {
    if (!db) return;

    const unsubscribePings = onSnapshot(collection(db, "pings"), (snapshot) => {
      const data = snapshot.docs.map((doc) => doc.data());
      setMarkers(data);
    });

    const unsubscribeCircles = onSnapshot(collection(db, "circles"), (snapshot) => {
      const data = snapshot.docs.map((doc) => doc.data());
      setCircles(data);
    });

    return () => {
      unsubscribePings();
      unsubscribeCircles();
    };
  }, [db]);

  // 🛰️ exemplo de triangulação de focos (satélite)
  useEffect(() => {
    const focos = [
      { latitude: -12.34, longitude: -41.56, altitude: 0, heading: 45, pitch: 10, distancia: 2000 },
      { latitude: -12.35, longitude: -41.57, altitude: 0, heading: 60, pitch: 12, distancia: 1800 }
    ];

    const triangulado = calcularTriangulacao(focos);
    if (triangulado) {
      setMarkers((prev) => [
        ...prev,
        {
          latitude: triangulado.latitude,
          longitude: triangulado.longitude,
          tipo: "foco-triangulado"
        }
      ]);
    }
  }, []);

  return (
    <View style={styles.container}>
      {location && (
        <MapView
          style={styles.map}
          initialRegion={{
            latitude: location.latitude,
            longitude: location.longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          }}
        >
          {/* marcador da posição atual */}
          <Marker coordinate={location} title="Minha posição" />

          {/* pings fixos do Firebase */}
          {markers.map((m, i) => (
            <Marker
              key={i}
              coordinate={{ latitude: m.latitude, longitude: m.longitude }}
              title={m.tipo === "foco-triangulado" ? "Foco triangulado" : "Ping de rede"}
              pinColor={m.tipo === "foco-triangulado" ? "orange" : "blue"}
            />
          ))}

          {/* círculos do Firebase */}
          {circles.map((c, i) => (
            <Circle
              key={i}
              center={{ latitude: c.latitude, longitude: c.longitude }}
              radius={c.radius}
              strokeColor="rgba(255,0,0,0.8)"
              fillColor="rgba(255,0,0,0.2)"
            />
          ))}
        </MapView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
});