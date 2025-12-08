import React, { useState } from 'react';
import { View, Text } from 'react-native';

// ===== IMPORTS DOS HOOKS =====
import { useLocation } from './src/hooks/useLocation';
import { useCompass } from './src/hooks/useCompass';
import { useFocos } from './src/hooks/useFocos';
import { useNetwork } from './src/hooks/useNetwork';
import { useCamera } from './src/hooks/useCamera';
import { useWeather } from './src/hooks/useWeather';

// ===== IMPORTS DOS SCREENS =====
import HomeScreen from './src/pages/HomeScreen';
import MapScreen from './src/pages/MapScreen';
import SettingsScreen from './src/pages/SettingsScreen';
import ShareScreen from './src/pages/ShareScreen';
import SatelliteScreen from './src/pages/SatelliteScreen';
import PropagationScreen from './src/pages/PropagationScreen';
import CameraScreen from './src/pages/CameraScreen';

export default function App() {
  // ===== ESTADO DE NAVEGAÇÃO =====
  const [page, setPage] = useState(1);
  const [darkMode, setDarkMode] = useState(false);
  const [distanceSingle, setDistanceSingle] = useState(null);
  const [cameraActive, setCameraActive] = useState(false);

  // ===== HOOKS CUSTOMIZADOS =====
  const locationData = useLocation(true, 'normal', true);
  const compassData = useCompass(locationData.location, true, false, () => {});
  const focosData = useFocos();
  const networkData = useNetwork();
  const cameraData = useCamera(cameraActive);
  const weatherData = useWeather(locationData.location, true);

  // ===== LOADING INICIAL =====
  if (locationData.loading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#2e7d32', justifyContent: 'center', alignItems: 'center', paddingTop: 50 }}>
        <View style={{ backgroundColor: '#145A32', padding: 20, alignItems: 'center', borderRadius: 10 }}>
          <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#fff', marginBottom: 20 }}>
            📱 SmokeDistance
          </Text>
          <Text style={{ fontSize: 14, color: '#ddd' }}>
            🔄 Obtendo localização...
          </Text>
        </View>
      </View>
    );
  }

  // ===== ROUTER DE TELAS =====
  if (cameraActive) {
    return (
      <CameraScreen
        cameraPhoto={cameraData.cameraPhoto}
        setCameraPhoto={cameraData.setCameraPhoto}
        cameraDynamicDistance={cameraData.cameraDynamicDistance}
        cameraObjectHeight={cameraData.cameraObjectHeight}
        pitchAngle={cameraData.pitchAngle}
        setCameraActive={setCameraActive}
        marcarFoco={focosData.marcarFoco}
        location={locationData.location}
        darkMode={darkMode}
        smoothHeading={compassData.smoothHeading}
        magneticDeclination={compassData.magneticDeclination}
        focos={focosData.focos}
      />
    );
  }

  switch (page) {
    case 1:
      return (
        <HomeScreen
          location={locationData.location}
          meteoDataDinamica={weatherData.meteoData}
          isConnected={networkData.isConnected}
          pendingFireData={null}
          distanceSingle={distanceSingle}
          cameraPhoto={cameraData.cameraPhoto}
          setCameraActive={setCameraActive}
          setCameraPhoto={cameraData.setCameraPhoto}
          setPendingFireData={() => {}}
          setPage={setPage}
          darkMode={darkMode}
        />
      );

    case 2:
      return (
        <MapScreen
          location={locationData.location}
          focos={focosData.focos}
          triangulacaoResultado={focosData.triangulacaoResultado}
          waypointTemporario={focosData.waypointTemporario}
          smoothHeading={compassData.smoothHeading}
          isConnected={networkData.isConnected}
          networkMarker={networkData.networkMarker}
          breadcrumbs={locationData.breadcrumbs}
          coverageCircles={locationData.coverageCircles}
          gpsStale={locationData.gpsStale}
          meteoDataDinamica={weatherData.meteoData}
          marcarFoco={focosData.marcarFoco}
          removerFoco={focosData.removerFoco}
          limparFocos={focosData.limparFocos}
          salvarFocoManual={focosData.salvarFocoManual}
          setWaypointTemporario={focosData.setWaypointTemporario}
          setPage={setPage}
          darkMode={darkMode}
          isCalibrating={compassData.isCalibrating}
          setIsCalibrating={compassData.setIsCalibrating}
          magneticDeclination={compassData.magneticDeclination}
        />
      );

    case 3:
      return (
        <SettingsScreen
          darkMode={darkMode}
          setDarkMode={setDarkMode}
          setPage={setPage}
        />
      );

    case 4:
      return (
        <ShareScreen
          focos={focosData.focos}
          location={locationData.location}
          triangulacaoResultado={focosData.triangulacaoResultado}
          meteoDataDinamica={weatherData.meteoData}
          setPage={setPage}
          darkMode={darkMode}
        />
      );

    case 5:
      return (
        <SatelliteScreen
          location={locationData.location}
          setPage={setPage}
          darkMode={darkMode}
        />
      );

    case 6:
      return (
        <PropagationScreen
          setPage={setPage}
          darkMode={darkMode}
        />
      );

    default:
      return (
        <HomeScreen
          location={locationData.location}
          meteoDataDinamica={weatherData.meteoData}
          isConnected={networkData.isConnected}
          pendingFireData={null}
          distanceSingle={distanceSingle}
          cameraPhoto={cameraData.cameraPhoto}
          setCameraActive={setCameraActive}
          setCameraPhoto={cameraData.setCameraPhoto}
          setPendingFireData={() => {}}
          setPage={setPage}
          darkMode={darkMode}
        />
      );
  }
}