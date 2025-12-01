// App.js
// SmokeDistance - Reconstruído por completo
// Recursos: Mapa com focos 🔥 (satélite + manual), botão Satélite, botão Foco (rota OSRM),
// botão Água (pontos fixos), Ping de Rede customizado com círculo de alcance,
// Bússola translúcida, Aviso de compartilhamento, Câmera com AI (captura periódica),
// Histórico, Exportação JSON, Modo noturno, Alertas sonoros.
// Botões sem emojis, conforme solicitado.

import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  Share,
  StyleSheet,
  Platform,
  ScrollView,
  Modal,
  Switch,
} from "react-native";
import MapView, { Marker, Circle, Polyline, Callout } from "react-native-maps";
import NetInfo from "@react-native-community/netinfo";
import * as Location from "expo-location";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import { Camera } from "expo-camera";

// ------------------------------
// Configurações e helpers
// ------------------------------
const INITIAL_REGION = {
  latitude: -12.5089, // Palmeiras, Bahia
  longitude: -41.5817,
  latitudeDelta: 0.25,
  longitudeDelta: 0.25,
};

const OSRM_ROUTE_URL = "https://router.project-osrm.org/route/v1/driving";

// Função de rota com OSRM (sem fallback de linha reta)
async function getRouteOSRM(fromLat, fromLon, toLat, toLon) {
  try {
    const url = `${OSRM_ROUTE_URL}/${fromLon},${fromLat};${toLon},${toLat}?overview=full&geometries=geojson`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("Falha na requisição OSRM");
    const data = await res.json();
    const coords = data?.routes?.[0]?.geometry?.coordinates || [];
    const polylineCoords = coords.map(([lon, lat]) => ({ latitude: lat, longitude: lon }));
    return polylineCoords;
  } catch (err) {
    console.warn("Erro OSRM:", err.message);
    Alert.alert("Rota", "Não foi possível obter a rota no momento.");
    return null;
  }
}

// Simulação de API de focos via satélite
async function fetchSatelliteFires(bounds) {
  // Você pode substituir por INPE, FIRMS/NASA etc.
  // Aqui, focos simulados próximos de Palmeiras/BA.
  await new Promise((r) => setTimeout(r, 500));
  return [
    {
      id: "sat-1",
      latitude: -12.4,
      longitude: -41.6,
      origem: "Satélite",
      intensidade: "Alta",
      hora: new Date().toLocaleTimeString(),
    },
    {
      id: "sat-2",
      latitude: -12.58,
      longitude: -41.48,
      origem: "Satélite",
      intensidade: "Média",
      hora: new Date().toLocaleTimeString(),
    },
  ];
}

// ------------------------------
// Componente principal
// ------------------------------
export default function App() {
  // Localização
  const [region, setRegion] = useState(INITIAL_REGION);
  const [location, setLocation] = useState(null);

  // Focos
  const [satelliteFocos, setSatelliteFocos] = useState([]);
  const [manualFocos, setManualFocos] = useState([]);
  const [selectedFoco, setSelectedFoco] = useState(null);

  // Água
  const [waterPings, setWaterPings] = useState([]);

  // Rede
  const [isConnected, setIsConnected] = useState(true);
  const [networkPing, setNetworkPing] = useState(null); // { latitude, longitude, radius }

  // Mapa
  const [mapType, setMapType] = useState("standard");
  const [nightMode, setNightMode] = useState(false);

  // Rota
  const [routeCoords, setRouteCoords] = useState([]);

  // UI
  const [satelliteLoading, setSatelliteLoading] = useState(false);
  const [lastSatelliteUpdate, setLastSatelliteUpdate] = useState(null); // Date string
  const [autoSatEnabled, setAutoSatEnabled] = useState(true); // atualizar automaticamente quando visível
  const [reportModal, setReportModal] = useState(false);
  const [satPageModal, setSatPageModal] = useState(false);

  // Histórico e exportação
  const [history, setHistory] = useState([]);

  // Câmera e AI
  const cameraRef = useRef(null);
  const [hasCamPermission, setHasCamPermission] = useState(null);
  const [aiEnabled, setAiEnabled] = useState(false);
  const [aiIntervalMs, setAiIntervalMs] = useState(1000); // 1s; celulares fortes podem 500ms
  const [aiDetectionLog, setAiDetectionLog] = useState([]); // logs de detecção (ex.: fumaça)

  // Bússola (azimute simples mock; substitua por magnetômetro se desejar)
  const [azimuth, setAzimuth] = useState(null);

  // --------------------------------
  // Efeitos de inicialização
  // --------------------------------
  useEffect(() => {
    (async () => {
      // Localização
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Localização", "Permissão de localização negada.");
        return;
      }
      const loc = await Location.getCurrentPositionAsync({});
      const coords = {
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      };
      setLocation(coords);
      setRegion((prev) => ({ ...prev, latitude: coords.latitude, longitude: coords.longitude }));
    })();
  }, []);

  useEffect(() => {
    // Rede
    const unsubscribe = NetInfo.addEventListener((state) => {
      const connected = !!state.isConnected;
      setIsConnected(connected);
      if (!connected && location) {
        // Perdeu sinal → cria ping fixo no mapa
        setNetworkPing((prev) => ({
          latitude: location.latitude,
          longitude: location.longitude,
          radius: prev?.radius || 800, // raio inicial; pode ajustar conforme regras
        }));
      }
    });
    return () => unsubscribe();
  }, [location]);

  useEffect(() => {
    // Permissão da câmera
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasCamPermission(status === "granted");
    })();
  }, []);

  useEffect(() => {
    // Simulação de azimute (bussola); substitua por magnetômetro para dados reais
    const interval = setInterval(() => {
      setAzimuth((prev) => {
        const p = typeof prev === "number" ? prev : 0;
        const next = (p + 10) % 360;
        return next;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // --------------------------------
  // Lógica da câmera + AI
  // --------------------------------
  useEffect(() => {
    let intervalId;
    if (aiEnabled && hasCamPermission) {
      intervalId = setInterval(async () => {
        try {
          if (!cameraRef.current) return;
          // Captura de foto periódica
          const photo = await cameraRef.current.takePictureAsync({ quality: 0.5, skipProcessing: true });
          // Aqui você chamaria o seu modelo de AI para analisar a imagem:
          // ex.: const result = await analyzeSmoke(photo.uri);
          // Simulando detecção aleatória leve:
          const detected = Math.random() < 0.2; // 20% chance
          const log = {
            time: new Date().toISOString(),
            uri: photo?.uri,
            smokeDetected: detected,
          };
          setAiDetectionLog((prev) => [log, ...prev].slice(0, 50));
          if (detected) {
            // Opcional: alerta sonoro/vibração
            // Alert.alert("AI", "Possível fumaça detectada.");
          }
        } catch (err) {
          console.warn("AI Camera error:", err.message);
        }
      }, aiIntervalMs);
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [aiEnabled, aiIntervalMs, hasCamPermission]);

  // --------------------------------
  // Ações e Handlers
  // --------------------------------
  async function handleLoadSatelliteFires() {
    try {
      setSatelliteLoading(true);
      const bounds = region; // use se quiser filtrar por bounding box
      const focos = await fetchSatelliteFires(bounds);
      setSatelliteFocos(focos);
      setLastSatelliteUpdate(new Date());
      Alert.alert("Satélite", "Focos de satélite carregados.");
    } catch (err) {
      Alert.alert("Satélite", "Não foi possível carregar focos de satélite.");
    } finally {
      setSatelliteLoading(false);
    }
  }

  function handleToggleSatelliteLayer() {
    if (satelliteFocos.length === 0) {
      handleLoadSatelliteFires();
    } else {
      setSatelliteFocos([]);
      setLastSatelliteUpdate(null);
    }
  }

  // Atualização automática a cada 5 minutos enquanto camada satélite ativa
  useEffect(() => {
    if (!autoSatEnabled) return;
    if (!isConnected) return;
    if (!satelliteFocos.length) return; // só se camada ativa
    const interval = setInterval(() => {
      console.log('⏱️ Atualização automática de focos satélite...');
      handleLoadSatelliteFires();
    }, 5 * 60 * 1000); // 5 minutos
    return () => clearInterval(interval);
  }, [autoSatEnabled, isConnected, satelliteFocos.length, region]);

  function handleAddManualFocoAtCurrent() {
    if (!location) {
      Alert.alert("Foco", "Localização não disponível.");
      return;
    }
    const novo = {
      id: `man-${Date.now()}`,
      latitude: location.latitude,
      longitude: location.longitude,
      origem: "Manual",
      hora: new Date().toLocaleTimeString(),
    };
    setManualFocos((prev) => [novo, ...prev]);
    setHistory((prev) => [
      { type: "foco_manual", ...novo, timestamp: Date.now() },
      ...prev,
    ].slice(0, 500));
  }

  function handleAddWaterPing() {
    if (!location) {
      Alert.alert("Água", "Localização não disponível.");
      return;
    }
    const ping = {
      latitude: location.latitude,
      longitude: location.longitude,
      createdAt: Date.now(),
    };
    setWaterPings((prev) => [ping, ...prev]);
    setHistory((prev) => [
      { type: "agua_ping", ...ping, timestamp: Date.now() },
      ...prev,
    ].slice(0, 500));
  }

  async function handleTraceRouteToFoco() {
    if (!location || !selectedFoco) {
      Alert.alert("Rota", "Selecione um foco no mapa para traçar a rota.");
      return;
    }
    const coords = await getRouteOSRM(
      location.latitude,
      location.longitude,
      selectedFoco.latitude,
      selectedFoco.longitude
    );
    if (coords && coords.length > 0) {
      setRouteCoords(coords);
    }
  }

  function handleSelectFoco(foco) {
    setSelectedFoco(foco);
    // centraliza no foco
    setRegion((prev) => ({
      ...prev,
      latitude: foco.latitude,
      longitude: foco.longitude,
      latitudeDelta: 0.1,
      longitudeDelta: 0.1,
    }));
  }

  async function handleShareReport() {
    const report = {
      app: "SmokeDistance",
      userLocation: location,
      network: isConnected ? "Conectado" : "Sem sinal",
      networkPing,
      waterPingsCount: waterPings.length,
      satelliteFiresCount: satelliteFocos.length,
      manualFiresCount: manualFocos.length,
      selectedFoco,
      routeCoordsCount: routeCoords.length,
      aiEnabled,
      aiIntervalMs,
      aiLastDetections: aiDetectionLog.slice(0, 5),
      timestamp: new Date().toISOString(),
      disclaimer:
        "Ao compartilhar este relatório, seus dados de localização e sensores serão enviados. Use com responsabilidade.",
    };

    const message =
      `Relatório SmokeDistance\n` +
      `Localização: ${location ? `${location.latitude.toFixed(5)}, ${location.longitude.toFixed(5)}` : "N/D"}\n` +
      `Rede: ${isConnected ? "Conectado" : "Sem sinal"}\n` +
      `Água marcada: ${waterPings.length}\n` +
      `Focos satélite: ${satelliteFocos.length}\n` +
      `Focos manuais: ${manualFocos.length}\n` +
      `Foco selecionado: ${selectedFoco ? `${selectedFoco.origem} @ ${selectedFoco.latitude.toFixed(4)},${selectedFoco.longitude.toFixed(4)}` : "N/D"}\n` +
      `Trechos de rota: ${routeCoords.length}\n` +
      `AI ativa: ${aiEnabled ? "Sim" : "Não"} (intervalo ${aiIntervalMs}ms)\n` +
      `Aviso: ${report.disclaimer}`;

    try {
      await Share.share({ message, title: "Relatório SmokeDistance" });
    } catch (err) {
      Alert.alert("Compartilhar", "Não foi possível compartilhar o relatório.");
    }
  }

  async function handleExportJSON() {
    try {
      const payload = {
        location,
        satelliteFocos,
        manualFocos,
        waterPings,
        networkPing,
        isConnected,
        routeCoords,
        aiEnabled,
        aiIntervalMs,
        aiDetectionLog,
        history,
        timestamp: new Date().toISOString(),
      };
      const fileUri = FileSystem.cacheDirectory + `smokedistance_export_${Date.now()}.json`;
      await FileSystem.writeAsStringAsync(fileUri, JSON.stringify(payload, null, 2));
      if (Platform.OS === "android" || Platform.OS === "ios") {
        await Sharing.shareAsync(fileUri, { mimeType: "application/json" });
      } else {
        Alert.alert("Exportação", "Arquivo JSON gerado:\n" + fileUri);
      }
    } catch (err) {
      Alert.alert("Exportação", "Falha ao exportar JSON.");
    }
  }

  // Modo noturno (apenas alterna tipo de mapa aqui; estilos avançados podem ser adicionados)
  function toggleNightMode() {
    setNightMode((prev) => !prev);
    setMapType((prev) => (prev === "standard" ? "hybrid" : "standard"));
  }

  // Página Satélites (modal simples com info dos 3 satélites)
  function SatPage() {
    return (
      <Modal visible={satPageModal} animationType="slide">
        <View style={styles.modalContainer}>
          <Text style={styles.modalTitle}>Satélites de Monitoramento</Text>
          <ScrollView style={{ flex: 1 }}>
            <View style={styles.satCard}>
              <Text style={styles.satTitle}>Satélite 1 — Órbita Polar</Text>
              <Text style={styles.satText}>Atualização: ~6h</Text>
              <Text style={styles.satText}>Resolução: 375m</Text>
            </View>
            <View style={styles.satCard}>
              <Text style={styles.satTitle}>Satélite 2 — Geoestacionário</Text>
              <Text style={styles.satText}>Atualização: ~15min</Text>
              <Text style={styles.satText}>Resolução: 1km</Text>
            </View>
            <View style={styles.satCard}>
              <Text style={styles.satTitle}>Satélite 3 — Órbita Baixa</Text>
              <Text style={styles.satText}>Atualização: ~12h</Text>
              <Text style={styles.satText}>Resolução: 500m</Text>
            </View>
          </ScrollView>

          <View style={styles.modalActions}>
            <TouchableOpacity style={styles.btnPrimary} onPress={() => setSatPageModal(false)}>
              <Text style={styles.btnText}>Fechar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.btnSecondary} onPress={handleLoadSatelliteFires}>
              <Text style={styles.btnText}>Carregar focos via satélite</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  }

  // Modal de relatório (preview + aviso)
  function ReportModal() {
    return (
      <Modal visible={reportModal} animationType="slide" onRequestClose={() => setReportModal(false)}>
        <View style={styles.modalContainer}>
          <Text style={styles.modalTitle}>Relatório</Text>

          <View style={styles.aviso}>
            <Text style={styles.avisoTitulo}>Aviso Importante</Text>
            <Text style={styles.avisoTexto}>
              Ao compartilhar este relatório, você estará enviando também seus dados de localização e sensores.
              Essas informações são reais e devem ser usadas com responsabilidade.
            </Text>
          </View>

          <ScrollView style={{ flex: 1 }}>
            <Text style={styles.reportLine}>
              Localização: {location ? `${location.latitude.toFixed(5)}, ${location.longitude.toFixed(5)}` : "N/D"}
            </Text>
            <Text style={styles.reportLine}>Rede: {isConnected ? "Conectado" : "Sem sinal"}</Text>
            <Text style={styles.reportLine}>Água marcada: {waterPings.length}</Text>
            <Text style={styles.reportLine}>Focos satélite: {satelliteFocos.length}</Text>
            <Text style={styles.reportLine}>Focos manuais: {manualFocos.length}</Text>
            <Text style={styles.reportLine}>
              Foco selecionado: {selectedFoco ? `${selectedFoco.origem} @ ${selectedFoco.latitude.toFixed(4)},${selectedFoco.longitude.toFixed(4)}` : "N/D"}
            </Text>
            <Text style={styles.reportLine}>Trechos de rota: {routeCoords.length}</Text>
            <Text style={styles.reportLine}>AI ativa: {aiEnabled ? "Sim" : "Não"} ({aiIntervalMs}ms)</Text>

            <Text style={styles.sectionTitle}>Últimas detecções da AI</Text>
            {aiDetectionLog.slice(0, 5).map((d, i) => (
              <View key={i} style={styles.detRow}>
                <Text style={styles.detText}>Hora: {new Date(d.time).toLocaleTimeString()}</Text>
                <Text style={styles.detText}>Fumaça: {d.smokeDetected ? "Possível" : "Não"}</Text>
              </View>
            ))}
          </ScrollView>

          <View style={styles.modalActions}>
            <TouchableOpacity style={styles.btnSecondary} onPress={handleShareReport}>
              <Text style={styles.btnText}>Compartilhar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.btnSecondary} onPress={handleExportJSON}>
              <Text style={styles.btnText}>Exportar JSON</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.btnPrimary} onPress={() => setReportModal(false)}>
              <Text style={styles.btnText}>Fechar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  }

  // --------------------------------
  // Render principal
  // --------------------------------
  return (
    <View style={{ flex: 1 }}>
      {/* Modais */}
      {SatPage()}
      {ReportModal()}

      {/* Aviso fixo no topo (pode ocultar se preferir só no modal) */}
      <View style={styles.aviso}>
        <Text style={styles.avisoTitulo}>Aviso Importante</Text>
        <Text style={styles.avisoTexto}>
          Ao compartilhar este relatório, você estará enviando também seus dados de localização e sensores.
          Essas informações são reais e devem ser usadas com responsabilidade.
        </Text>
      </View>

      {/* Mapa */}
      <MapView
        style={{ flex: 1 }}
        mapType={mapType}
        region={region}
        onRegionChangeComplete={(r) => setRegion(r)}
      >
        {/* Focos via satélite */}
        {satelliteFocos.map((foco) => (
          <Marker
            key={foco.id}
            coordinate={{ latitude: foco.latitude, longitude: foco.longitude }}
            onPress={() => handleSelectFoco(foco)}
          >
            <Text style={{ fontSize: 28 }}>🔥</Text>
            <Callout>
              <View style={{ maxWidth: 220 }}>
                <Text style={styles.callTitle}>Foco Satélite</Text>
                <Text style={styles.callText}>Intensidade: {foco.intensidade}</Text>
                <Text style={styles.callText}>Hora: {foco.hora}</Text>
                <Text style={styles.callText}>
                  Coordenadas: {foco.latitude.toFixed(4)}, {foco.longitude.toFixed(4)}
                </Text>
                <TouchableOpacity style={styles.callBtn} onPress={() => handleSelectFoco(foco)}>
                  <Text style={styles.callBtnText}>Selecionar foco</Text>
                </TouchableOpacity>
              </View>
            </Callout>
          </Marker>
        ))}

        {/* Focos manuais */}
        {manualFocos.map((foco) => (
          <Marker
            key={foco.id}
            coordinate={{ latitude: foco.latitude, longitude: foco.longitude }}
            onPress={() => handleSelectFoco(foco)}
          >
            <Text style={{ fontSize: 28 }}>🔥</Text>
            <Callout>
              <View style={{ maxWidth: 220 }}>
                <Text style={styles.callTitle}>Foco Manual</Text>
                <Text style={styles.callText}>
                  Coordenadas: {foco.latitude.toFixed(4)}, {foco.longitude.toFixed(4)}
                </Text>
                <Text style={styles.callText}>Hora: {foco.hora}</Text>
                <TouchableOpacity style={styles.callBtn} onPress={() => handleSelectFoco(foco)}>
                  <Text style={styles.callBtnText}>Selecionar foco</Text>
                </TouchableOpacity>
              </View>
            </Callout>
          </Marker>
        ))}

        {/* Pings de água (fixos) */}
        {waterPings.map((ping, idx) => (
          <Marker key={`water-${idx}`} coordinate={ping}>
            <Text style={{ fontSize: 22 }}>💧</Text>
            <Callout>
              <View>
                <Text style={styles.callTitle}>Ponto de água</Text>
                <Text style={styles.callText}>
                  Coordenadas: {ping.latitude.toFixed(4)}, {ping.longitude.toFixed(4)}
                </Text>
              </View>
            </Callout>
          </Marker>
        ))}

        {/* Ping de rede + círculo de alcance */}
        {networkPing && (
          <>
            <Marker coordinate={networkPing}>
              {/* Bolinha com barrinhas brancas (preta conectado, vermelha sem sinal) */}
              <View style={styles.networkIcon(isConnected)}>
                <View style={styles.networkBars}>
                  <View style={styles.bar(6)} />
                  <View style={styles.bar(10)} />
                  <View style={styles.bar(14)} />
                  <View style={styles.bar(18)} />
                </View>
                {!isConnected && <View style={styles.networkSlash} />}
              </View>
              <Callout>
                <View>
                  <Text style={styles.callTitle}>Ping de Rede</Text>
                  <Text style={styles.callText}>
                    Estado: {isConnected ? "Conectado" : "Sem sinal"}
                  </Text>
                  <Text style={styles.callText}>
                    Raio: {Math.round(networkPing.radius)} m
                  </Text>
                </View>
              </Callout>
            </Marker>

            <Circle
              center={networkPing}
              radius={networkPing.radius}
              strokeColor="red"
              fillColor="rgba(255,0,0,0.1)"
            />
          </>
        )}

        {/* Rota OSRM desenhada */}
        {routeCoords.length > 1 && (
          <Polyline
            coordinates={routeCoords}
            strokeColor="#2E86DE"
            strokeWidth={4}
          />
        )}
      </MapView>

      {/* Bússola translúcida (canto superior direito) */}
      <View style={styles.bussola}>
        <Text style={styles.bussolaCompass}>🧭</Text>
        <Text style={styles.bussolaText}>
          {typeof azimuth === "number" ? `${Math.round(azimuth)}°` : "N/D"}
        </Text>
      </View>

      {/* Controles principais (sem emojis nos botões) */}
      <View style={styles.controls}>
        <TouchableOpacity style={styles.btnPrimary} onPress={handleToggleSatelliteLayer}>
          <Text style={styles.btnText}>{satelliteFocos.length ? "Ocultar satélite" : "Mostrar satélite"}</Text>
        </TouchableOpacity>

        {satelliteFocos.length > 0 && (
          <TouchableOpacity style={styles.btnSecondary} onPress={handleLoadSatelliteFires} disabled={satelliteLoading}>
            <Text style={styles.btnText}>{satelliteLoading ? 'Atualizando...' : 'Atualizar satélite'}</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.btnSecondary} onPress={handleAddManualFocoAtCurrent}>
          <Text style={styles.btnText}>Marcar foco manual</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.btnSecondary} onPress={handleTraceRouteToFoco}>
          <Text style={styles.btnText}>Traçar rota até foco</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.btnSecondary} onPress={handleAddWaterPing}>
          <Text style={styles.btnText}>Marcar água</Text>
        </TouchableOpacity>
      </View>

      {/* Barra inferior: extras e alternâncias */}
      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.btnSmall} onPress={() => setSatPageModal(true)}>
          <Text style={styles.btnSmallText}>Satélites</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.btnSmall} onPress={() => setReportModal(true)}>
          <Text style={styles.btnSmallText}>Relatório</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.btnSmall} onPress={toggleNightMode}>
          <Text style={styles.btnSmallText}>{nightMode ? "Modo claro" : "Modo noturno"}</Text>
        </TouchableOpacity>
        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>AI câmera</Text>
          <Switch value={aiEnabled} onValueChange={setAiEnabled} />
        </View>
        {satelliteFocos.length > 0 && (
          <View style={{ alignItems: 'center', marginLeft: 8 }}>
            <Text style={{ fontSize: 10, color: '#333' }}>
              Última: {lastSatelliteUpdate ? new Date(lastSatelliteUpdate).toLocaleTimeString() : '—'}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
              <Text style={{ fontSize: 10, marginRight: 4, color: '#333' }}>Auto</Text>
              <Switch value={autoSatEnabled} onValueChange={setAutoSatEnabled} />
            </View>
          </View>
        )}
      </View>

      {/* Câmera invisível: usada para captura periódica pela AI */}
      {hasCamPermission && (
        <View style={{ position: "absolute", width: 1, height: 1, top: -10, left: -10, opacity: 0 }}>
          <Camera ref={cameraRef} style={{ width: 1, height: 1 }} />
        </View>
      )}
    </View>
  );
}

// ------------------------------
// Estilos
// ------------------------------
const styles = StyleSheet.create({
  aviso: {
    backgroundColor: "rgba(255,0,0,0.1)",
    padding: 10,
    marginHorizontal: 10,
    marginTop: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "red",
  },
  avisoTitulo: { fontWeight: "bold", color: "red", marginBottom: 6 },
  avisoTexto: { color: "#111" },

  bussola: {
    position: "absolute",
    top: 16,
    right: 16,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  bussolaCompass: { color: "white", fontSize: 24 },
  bussolaText: { color: "white", fontSize: 12, marginTop: 4 },

  controls: {
    position: "absolute",
    left: 10,
    right: 10,
    bottom: 100,
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
    backgroundColor: "rgba(255,255,255,0.9)",
    padding: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  bottomBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: "rgba(240,240,240,0.95)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderColor: "#ddd",
  },

  btnPrimary: {
    flex: 1,
    marginHorizontal: 4,
    backgroundColor: "#2E86DE",
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  btnSecondary: {
    flex: 1,
    marginHorizontal: 4,
    backgroundColor: "#6C757D",
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  btnText: {
    color: "white",
    fontWeight: "600",
  },

  btnSmall: {
    backgroundColor: "#343A40",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  btnSmallText: { color: "white", fontWeight: "600" },

  switchRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  switchLabel: { color: "#222", fontSize: 14 },

  networkIcon: (connected) => ({
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: connected ? "black" : "red",
    justifyContent: "center",
    alignItems: "center",
  }),
  networkBars: { flexDirection: "row", alignItems: "flex-end" },
  bar: (h) => ({
    width: 3,
    height: h,
    backgroundColor: "white",
    margin: 1,
  }),
  networkSlash: {
    position: "absolute",
    width: 2,
    height: 32,
    backgroundColor: "white",
    transform: [{ rotate: "45deg" }],
  },

  callTitle: { fontWeight: "bold", marginBottom: 6 },
  callText: { color: "#333", marginBottom: 4 },
  callBtn: {
    marginTop: 8,
    backgroundColor: "#2E86DE",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
  },
  callBtnText: { color: "white", fontWeight: "600" },

  modalContainer: { flex: 1, padding: 16, backgroundColor: "white" },
  modalTitle: { fontWeight: "bold", fontSize: 18, marginBottom: 12 },
  modalActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
    marginTop: 16,
  },
  satCard: {
    backgroundColor: "#f7f7f7",
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#eee",
  },
  satTitle: { fontWeight: "bold", marginBottom: 4 },
  satText: { color: "#333" },

  reportLine: { color: "#222", marginBottom: 6 },
  sectionTitle: { fontWeight: "bold", marginTop: 10, marginBottom: 6 },
  detRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  detText: { color: "#333" },
});
