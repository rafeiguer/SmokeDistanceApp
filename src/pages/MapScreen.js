// 🗺️ MAP SCREEN - Página do Mapa Interativo (Parte 1)

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  TextInput,
} from 'react-native';
import MapView, { Marker, Polyline, Circle, WMSTile } from 'react-native-maps';
import { styles } from '../styles';
import { darkStyles } from '../styles/darkStyles';
import { salvarFocosStorage } from '../services/storageService';
import { encontrarTrilhasProximas } from '../services/routingService';
import { calcularTriangulacao } from '../utils/calculations';
import { calculateDistanceHaversine } from '../utils/calculations';
import Constants from 'expo-constants';

export default function MapScreen({
  location,
  focos,
  setFocos,
  triangulacaoResultado,
  setTriangulacaoResultado,
  waterMarkers,
  setWaterMarkers,
  breadcrumbs,
  showSatelliteOverlay,
  setShowSatelliteOverlay,
  satelliteFocos,
  loadSatelliteFocos,
  mapaCamera,
  setMapaCamera,
  followUser,
  setFollowUser,
  mapRef,
  currentRegion,
  setCurrentRegion,
  needsRecenter,
  setNeedsRecenter,
  recenterVisible,
  setRecenterVisible,
  inputsManualFoco,
  setInputsManualFoco,
  waypointTemporario,
  setWaypointTemporario,
  marcandoFocoMapa,
  setMarcandoFocoMapa,
  focoSalvoAgora,
  setFocoSalvoAgora,
  smoothHeading,
  magneticDeclination,
  isCalibrating,
  setIsCalibrating,
  trilhasProximas,
  setTrilhasProximas,
  meteoDataDinamica,
  darkMode,
  onNavigate,
}) {
  const initialDelta = 0.025;
  const extra = (Constants?.expoConfig?.extra) || (Constants?.manifest?.extra) || {};
  const FIRMS_MAP_KEY = (extra?.FIRMS_MAP_KEY || '').trim();

  // 🗺️ Renderizar formulário manual de foco
  function renderFocoForm() {
    const safeInputs = inputsManualFoco || {
      latitude: '',
      longitude: '',
      altitude: '',
      heading: '',
      pitch: '',
      distancia: ''
    };

    if (!safeInputs?.latitude && !safeInputs?.longitude) return null;

    return (
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={[styles.mapInfo, { marginTop: 10 }]}>
          <Text style={[styles.infoText, { fontWeight: 'bold', marginBottom: 10 }]}>
            📍 Dados do Foco:
          </Text>

          <Text style={styles.infoText}>📍 Latitude</Text>
          <TextInput
            style={styles.textInput}
            placeholder="Latitude"
            keyboardType="decimal-pad"
            editable={false}
            value={safeInputs?.latitude || ''}
          />

          <Text style={styles.infoText}>📍 Longitude</Text>
          <TextInput
            style={styles.textInput}
            placeholder="Longitude"
            keyboardType="decimal-pad"
            editable={false}
            value={safeInputs?.longitude || ''}
          />

          <Text style={styles.infoText}>📍 Altitude</Text>
          <TextInput
            style={[styles.textInput, { backgroundColor: '#E8F5E9' }]}
            placeholder="Ex: 1000"
            keyboardType="decimal-pad"
            editable={false}
            value={safeInputs?.altitude || '(será calculada)'}
          />

          <Text style={[styles.infoText, { fontWeight: 'bold', marginTop: 10, color: '#4CAF50' }]}>
            ✅ DISTÂNCIA CALCULADA (GPS)
          </Text>

          <TextInput
            style={[styles.textInput, { fontSize: 16, fontWeight: 'bold', color: '#4CAF50' }]}
            placeholder="Ex: 500"
            keyboardType="decimal-pad"
            value={safeInputs?.distancia || ''}
            onChangeText={(text) => setInputsManualFoco({...(safeInputs || {}), distancia: text})}
          />

          <View style={{ flexDirection: 'row', gap: 10 }}>
            <TouchableOpacity
              style={[
                styles.mapButton,
                { flex: 1, backgroundColor: focoSalvoAgora ? '#4CAF50' : '#4CAF50' }
              ]}
              onPress={async () => {
                const lat = parseFloat(safeInputs?.latitude || 0);
                const lon = parseFloat(safeInputs?.longitude || 0);
                const alt = parseFloat(safeInputs?.altitude) || 0;
                const dist = parseFloat(safeInputs?.distancia) || 0;

                if (isNaN(lat) || isNaN(lon) || isNaN(dist)) {
                  Alert.alert('⚠️ Dados inválidos', 'Verifique os valores');
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
                  timestamp: new Date().toLocaleTimeString('pt-BR'),
                  observadorId: `Obs-${focos.length + 1}`
                };

                const novosFocos = [...focos, novoFoco];
                setFocos(novosFocos);

                if (novosFocos.length >= 2) {
                  const resultado = calcularTriangulacao(novosFocos);
                  setTriangulacaoResultado(resultado);
                }

                await salvarFocosStorage(novosFocos);
                setFocoSalvoAgora(true);
                setTimeout(() => setFocoSalvoAgora(false), 3000);

                setInputsManualFoco({
                  latitude: '',
                  longitude: '',
                  altitude: '',
                  heading: '',
                  pitch: '',
                  distancia: ''
                });
                setWaypointTemporario(null);

                Alert.alert('✅ Foco Salvo!', `${novoFoco.observadorId} adicionado`);
              }}
              disabled={focoSalvoAgora}
            >
              <Text style={[styles.buttonText, { fontWeight: 'bold' }]}>
                {focoSalvoAgora ? '✅ Salvo!' : '💾 Salvar'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.mapButton, { flex: 1, backgroundColor: '#00796B' }]}
              onPress={async () => {
                const rotas = await encontrarTrilhasProximas(
                  location?.latitude || 0,
                  location?.longitude || 0,
                  parseFloat(safeInputs?.latitude || 0),
                  parseFloat(safeInputs?.longitude || 0)
                );
                setTrilhasProximas(rotas);
                Alert.alert('🛣️ Rotas', `${rotas.length} rota(s) encontrada(s)`);
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
              }}
            >
              <Text style={styles.buttonText}>❌ Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    );
  }

  if (!location) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>📍 Aguardando localização...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, darkMode && darkStyles.container]}>
      <View style={[styles.header, darkMode && darkStyles.header]}>
        <Text style={[styles.title, darkMode && darkStyles.title]}>🗺️ Mapa</Text>
      </View>
      
      <ScrollView style={{ flex: 1 }}>
        {/* Botões de Camadas */}
        <View style={{ flexDirection: 'row', padding: 10, gap: 5, backgroundColor: darkMode ? '#1E1E1E' : '#c5e1c9', borderBottomWidth: 1, borderBottomColor: darkMode ? '#2A2A2A' : '#9fbf9d' }}>
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
                await loadSatelliteFocos(location.latitude, location.longitude);
              }
              setShowSatelliteOverlay(!showSatelliteOverlay);
            }}
          >
            <Text style={styles.buttonText}>🔥 Satélites</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.mapButton, { flex: 1, backgroundColor: mapaCamera === 'satellite' ? '#2196F3' : '#999' }]}
            onPress={() => setMapaCamera('satellite')}
          >
            <Text style={styles.buttonText}>🛰️ Sat</Text>
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
            <Text style={styles.buttonText}>🗺️ Híbrido</Text>
          </TouchableOpacity>
        </View>

        {/* MapView */}
        <View style={{ position: 'relative', height: 500 }}>
          <MapView
            provider="google"
            ref={mapRef}
            style={[styles.map, { height: 500 }]}
            mapType={mapaCamera || 'hybrid'}
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
                setNeedsRecenter(dist > Math.max(limit * 1.2, 1200));
              }
            }}
            onPress={(e) => {
              const { latitude, longitude } = e.nativeEvent.coordinate;

              if (marcandoFocoMapa) {
                const distanciaCalculada = calculateDistanceHaversine(
                  location.latitude,
                  location.longitude,
                  latitude,
                  longitude
                );

                setInputsManualFoco({
                  latitude: latitude.toFixed(4),
                  longitude: longitude.toFixed(4),
                  altitude: '0',
                  heading: '0',
                  pitch: '0',
                  distancia: distanciaCalculada.toFixed(1)
                });

                setWaypointTemporario({
                  latitude,
                  longitude,
                  altitude: '0',
                  distancia: distanciaCalculada.toFixed(1)
                });

                setMarcandoFocoMapa(false);
                Alert.alert('✅ Foco Localizado', `Lat: ${latitude.toFixed(4)}°\nLon: ${longitude.toFixed(4)}°\nDist: ${distanciaCalculada.toFixed(1)}m`);
              } else if (false) { // markingMode removido por simplicidade
                const newMarker = {
                  latitude,
                  longitude,
                  title: '💧 Poço de Água',
                  id: Date.now()
                };
                setWaterMarkers([...waterMarkers, newMarker]);
              }
            }}
          >
            {/* FIRMS WMS Overlay */}
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
                  layers: 'fires_modis_24,fires_viirs_24',
                }}
              />
            ) : null}

            {/* Marcador de Localização Atual */}
            <Marker
              coordinate={{
                latitude: location.latitude,
                longitude: location.longitude
              }}
              title="📍 Você está aqui"
            >
              <View style={{
                width: 42, height: 42, borderRadius: 21,
                backgroundColor: '#000000', justifyContent: 'center', alignItems: 'center',
                borderWidth: 2, borderColor: '#FFFFFF', elevation: 5
              }}>
                <View style={{ flexDirection: 'row', gap: 1.5, alignItems: 'flex-end' }}>
                  <View style={{ width: 2.5, height: 6, backgroundColor: '#FFFFFF', borderRadius: 1.25 }} />
                  <View style={{ width: 2.5, height: 9, backgroundColor: '#FFFFFF', borderRadius: 1.25 }} />
                  <View style={{ width: 2.5, height: 12, backgroundColor: '#FFFFFF', borderRadius: 1.25 }} />
                  <View style={{ width: 2.5, height: 15, backgroundColor: '#FFFFFF', borderRadius: 1.25 }} />
                </View>
              </View>
            </Marker>

            {/* Focos de Satélite */}
            {showSatelliteOverlay && satelliteFocos.map((f) => (
              <Marker
                key={f.id}
                coordinate={{ latitude: f.latitude, longitude: f.longitude }}
                title={`🔥 Foco (${f.origem})`}
              >
                <Text style={{ fontSize: 28 }}>🔥</Text>
              </Marker>
            ))}

            {/* Focos Marcados */}
            {focos.map((foco, idx) => (
              <Marker
                key={foco.id}
                coordinate={{
                  latitude: foco.latitude,
                  longitude: foco.longitude
                }}
                title={`🔥 ${foco.observadorId}`}
              >
                <View style={{
                  width: 50, height: 50, borderRadius: 25,
                  backgroundColor: '#FF3333', justifyContent: 'center', alignItems: 'center',
                  borderWidth: 3, borderColor: '#FF0000'
                }}>
                  <Text style={{ fontSize: 28 }}>🔥</Text>
                </View>
              </Marker>
            ))}

            {/* Waypoint Temporário */}
            {waypointTemporario && (
              <Marker
                coordinate={{
                  latitude: waypointTemporario.latitude,
                  longitude: waypointTemporario.longitude
                }}
                title="🎯 FOCO TEMPORÁRIO"
                pinColor="#FFEB3B"
              />
            )}

            {/* Resultado da Triangulação */}
            {triangulacaoResultado && (
              <Marker
                coordinate={{
                  latitude: triangulacaoResultado.latitude,
                  longitude: triangulacaoResultado.longitude
                }}
                title="🔥 FOGO ESTIMADO"
                pinColor="#FFD700"
              />
            )}

            {/* Trilhas de Rota */}
            {trilhasProximas.map((trilha, idx) => {
              if (!trilha.coordinates || trilha.coordinates.length < 2) return null;
              const cores = ['#00BFA5', '#009688', '#00897B', '#00796B', '#00695C'];
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

          {/* Mini Bussola */}
          <TouchableOpacity 
            style={styles.miniCompassWrapper}
            onPress={() => {
              if (!isCalibrating) {
                setIsCalibrating(true);
                Alert.alert('🧭 Calibração', 'Gire o celular em padrão 8');
              }
            }}
          >
            <View style={styles.miniRoseContainer}>
              <View style={styles.crossVertical} />
              <View style={styles.crossHorizontal} />
              <View style={styles.compassRing} />
              <View style={[styles.rotatingGroup, { transform: [{ rotate: `${-smoothHeading}deg` }] }]}>
                <View style={styles.nRotator}>
                  <Text style={styles.miniCompassNorth}>N</Text>
                </View>
                <View style={styles.miniCompass} />
              </View>
            </View>
            <Text style={styles.miniHeadingText}>{(Math.round(smoothHeading) % 360) || 0}°</Text>
          </TouchableOpacity>

          {/* Botão Recenter */}
          {!followUser && recenterVisible && (
            <TouchableOpacity
              onPress={() => {
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
              }}
              style={{ position: 'absolute', right: 12, bottom: 12, backgroundColor: 'rgba(139,92,42,0.85)', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 18, elevation: 3 }}
            >
              <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 13 }}>🎯 Centralizar</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Controles do Mapa */}
        <View style={styles.mapControls}>
          <TouchableOpacity
            style={[styles.mapButton, marcandoFocoMapa && styles.mapButtonActive]}
            onPress={() => {
              setMarcandoFocoMapa(!marcandoFocoMapa);
              if (!marcandoFocoMapa) {
                Alert.alert('🎯 Marcar Foco', 'Toque no mapa!');
              }
            }}
          >
            <Text style={styles.buttonText}>
              {marcandoFocoMapa ? '✅ Ativo' : '🎯 Marcar'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.mapButton}
            onPress={() => {
              if (focos.length === 0) {
                Alert.alert('⚠️ Vazio', 'Nenhuma observação para limpar');
                return;
              }
              Alert.alert('⚠️ TEM CERTEZA?', `Vai remover ${focos.length} observação(ões)?`, [
                { text: 'Cancelar' },
                { text: 'Remover', onPress: () => { setFocos([]); setTriangulacaoResultado(null); setTrilhasProximas([]); } }
              ]);
            }}
          >
            <Text style={styles.buttonText}>🗑️ Limpar</Text>
          </TouchableOpacity>
        </View>

        {/* Info */}
        <View style={styles.mapInfo}>
          <Text style={styles.infoText}>📍 Você: {location.latitude.toFixed(4)}°, {location.longitude.toFixed(4)}°</Text>
          <Text style={styles.infoText}>🎯 Focos: {focos.length}/5</Text>
          {triangulacaoResultado && (
            <>
              <Text style={[styles.infoText, { fontWeight: 'bold', color: '#FFD700' }]}>🔥 FOGO LOCALIZADO!</Text>
              <Text style={styles.infoText}>Lat: {triangulacaoResultado.latitude.toFixed(4)}°</Text>
              <Text style={styles.infoText}>Lon: {triangulacaoResultado.longitude.toFixed(4)}°</Text>
              <Text style={styles.infoText}>Precisão: {(100 - triangulacaoResultado.erro * 100).toFixed(1)}%</Text>
            </>
          )}
        </View>

        {renderFocoForm()}
      </ScrollView>

      <TouchableOpacity style={styles.buttonPrimary} onPress={() => onNavigate(1)}>
        <Text style={styles.buttonText}>← Voltar</Text>
      </TouchableOpacity>
    </View>
  );
}