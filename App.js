// ⚡ APP.JS NOVO - Router Principal & State Global

import React, { useState, useEffect, useRef } from 'react';
import { Alert } from 'react-native';

// 📱 Hooks Customizados
import { useLocation } from './src/hooks/useLocation';
import { useCompass } from './src/hooks/useCompass';
import { useCamera } from './src/hooks/useCamera';
import { useSatellites } from './src/hooks/useSatellites';
import { useNetwork } from './src/hooks/useNetwork';
import { useBreadcrumbs } from './src/hooks/useBreadcrumbs';
import { usePreferences } from './src/hooks/usePreferences';

// 📄 Pages
import HomeScreen from './src/pages/HomeScreen';
import MapScreen from './src/pages/MapScreen';
import SettingsScreen from './src/pages/SettingsScreen';
import ShareScreen from './src/pages/ShareScreen';
import SatellitesScreen from './src/pages/SatellitesScreen';
import CameraScreen from './src/pages/CameraScreen';

// 📡 Services
import { registerForPushNotificationsAsync } from './src/notifications';

export default function App() {
  const mapRef = useRef(null);
  
  // ✅ Estados Principais
  const [page, setPage] = useState(1);
  const [smokeHeight, setSmokeHeight] = useState('100');
  const [pickedPoint, setPickedPoint] = useState(null);
  const [distanceSingle, setDistanceSingle] = useState(null);
  const [cameraPhoto, setCameraPhoto] = useState(null);
  const [focos, setFocos] = useState([]);
  const [triangulacaoResultado, setTriangulacaoResultado] = useState(null);
  const [marcandoFocoMapa, setMarcandoFocoMapa] = useState(false);
  const [waterMarkers, setWaterMarkers] = useState([]);
  const [breadcrumbs, setBreadcrumbs] = useState([]);
  const [comunityPings, setCommunityPings] = useState([]);
  const [showCommunityPings, setShowCommunityPings] = useState(false);
  const [showSatelliteOverlay, setShowSatelliteOverlay] = useState(false);
  const [mapaCamera, setMapaCamera] = useState('hybrid');
  const [followUser, setFollowUser] = useState(true);
  const [currentRegion, setCurrentRegion] = useState(null);
  const [needsRecenter, setNeedsRecenter] = useState(false);
  const [recenterVisible, setRecenterVisible] = useState(false);
  const [inputsManualFoco, setInputsManualFoco] = useState({
    latitude: '',
    longitude: '',
    altitude: '',
    heading: '',
    pitch: '',
    distancia: ''
  });
  const [waypointTemporario, setWaypointTemporario] = useState(null);
  const [focoSalvoAgora, setFocoSalvoAgora] = useState(false);
  const [focoPendente, setFocoPendente] = useState(false);
  const [pendingFireData, setPendingFireData] = useState(null);
  const [trilhasProximas, setTrilhasProximas] = useState([]);
  
  // 🎣 HOOKS CUSTOMIZADOS (substituem lógica espalhada)
  const { location, loading } = useLocation();
  const { heading, smoothHeading, magneticDeclination, isCalibrating, setIsCalibrating, magnetometerReadings } = useCompass(location);
  const { cameraDynamicDistance, pitchAngle, cameraActive, setCameraActive, accelerometerData } = useCamera(location, smoothHeading);
  const { satelliteFocos, setSatelliteFocos, loadSatelliteFocos, enableFIRMS, setEnableFIRMS, enableGOES, setEnableGOES, enableMSG, setEnableMSG } = useSatellites();
  const { isConnected, networkMarker, coverageCircles, setCoverageCircles } = useNetwork(location);
  const { breadcrumbs: loadedBreadcrumbs } = useBreadcrumbs(location, isConnected);
  const { darkMode, setDarkMode, gpsMode, setGpsMode } = usePreferences();
  const { meteoDataDinamica, setMeteoDataDinamica } = useWeatherData(location, isConnected);
  
  // 🎬 Efeitos de Inicialização
  useEffect(() => {
    (async () => {
      try { 
        await registerForPushNotificationsAsync(); 
      } catch (e) {
        console.warn('⚠️ Push notifications erro:', e);
      }
    })();
  }, []);
  
  // 📊 Handler de Trianguação
  const handleFocoAdded = (novoFoco) => {
    const novosFocos = [...focos, novoFoco];
    setFocos(novosFocos);
    
    if (novosFocos.length >= 2) {
      const resultado = calcularTriangulacao(novosFocos);
      setTriangulacaoResultado(resultado);
    }
    
    setFocoSalvoAgora(true);
    setTimeout(() => setFocoSalvoAgora(false), 3000);
  };
  
  // 🎬 Renderização Condicional
  if (cameraActive) {
    return (
      <CameraScreen
        location={location}
        smoothHeading={smoothHeading}
        magneticDeclination={magneticDeclination}
        cameraDynamicDistance={cameraDynamicDistance}
        pitchAngle={pitchAngle}
        cameraRef={useRef(null)}
        onCapture={(photo) => {
          setCameraPhoto(photo);
          setCameraActive(false);
        }}
        onCancel={() => {
          setCameraActive(false);
          setTrilhasProximas([]);
        }}
      />
    );
  }
  
  // 🏠 Página 1: HOME
  if (page === 1) {
    return (
      <HomeScreen
        location={location}
        loading={loading}
        focos={focos}
        triangulacaoResultado={triangulacaoResultado}
        meteoDataDinamica={meteoDataDinamica}
        isConnected={isConnected}
        cameraPhoto={cameraPhoto}
        distanceSingle={distanceSingle}
        smokeHeight={smokeHeight}
        setSmokeHeight={setSmokeHeight}
        darkMode={darkMode}
        onNavigate={setPage}
        onCameraOpen={() => setCameraActive(true)}
        onCameraClear={() => setCameraPhoto(null)}
      />
    );
  }
  
  // 🗺️ Página 2: MAPA
  if (page === 2) {
    return (
      <MapScreen
        location={location}
        focos={focos}
        setFocos={setFocos}
        triangulacaoResultado={triangulacaoResultado}
        setTriangulacaoResultado={setTriangulacaoResultado}
        waterMarkers={waterMarkers}
        setWaterMarkers={setWaterMarkers}
        breadcrumbs={breadcrumbs}
        setBreadcrumbs={setBreadcrumbs}
        showSatelliteOverlay={showSatelliteOverlay}
        setShowSatelliteOverlay={setShowSatelliteOverlay}
        satelliteFocos={satelliteFocos}
        setSatelliteFocos={setSatelliteFocos}
        loadSatelliteFocos={loadSatelliteFocos}
        mapaCamera={mapaCamera}
        setMapaCamera={setMapaCamera}
        followUser={followUser}
        setFollowUser={setFollowUser}
        mapRef={mapRef}
        currentRegion={currentRegion}
        setCurrentRegion={setCurrentRegion}
        needsRecenter={needsRecenter}
        setNeedsRecenter={setNeedsRecenter}
        recenterVisible={recenterVisible}
        setRecenterVisible={setRecenterVisible}
        inputsManualFoco={inputsManualFoco}
        setInputsManualFoco={setInputsManualFoco}
        waypointTemporario={waypointTemporario}
        setWaypointTemporario={setWaypointTemporario}
        marcandoFocoMapa={marcandoFocoMapa}
        setMarcandoFocoMapa={setMarcandoFocoMapa}
        focoSalvoAgora={focoSalvoAgora}
        setFocoSalvoAgora={setFocoSalvoAgora}
        smoothHeading={smoothHeading}
        magneticDeclination={magneticDeclination}
        isCalibrating={isCalibrating}
        setIsCalibrating={setIsCalibrating}
        trilhasProximas={trilhasProximas}
        setTrilhasProximas={setTrilhasProximas}
        meteoDataDinamica={meteoDataDinamica}
        darkMode={darkMode}
        onNavigate={setPage}
      />
    );
  }
  
  // ⚙️ Página 3: SETTINGS
  if (page === 3) {
    return (
      <SettingsScreen
        darkMode={darkMode}
        setDarkMode={setDarkMode}
        gpsMode={gpsMode}
        setGpsMode={setGpsMode}
  
       onNavigate={setPage}
      />
    );
  }
  
  // 📤 Página 4: SHARE
  if (page === 4) {
    return (
      <ShareScreen
        focos={focos}
        triangulacaoResultado={triangulacaoResultado}
        location={location}
        meteoDataDinamica={meteoDataDinamica}
        darkMode={darkMode}
        onNavigate={setPage}
      />
    );
  }
  
  // 🛰️ Página 5: SATELLITES
  if (page === 5) {
    return (
      <SatellitesScreen
        satelliteFocos={satelliteFocos}
        loadSatelliteFocos={loadSatelliteFocos}
        enableFIRMS={enableFIRMS}
        setEnableFIRMS={setEnableFIRMS}
        enableGOES={enableGOES}
        setEnableGOES={setEnableGOES}
        enableMSG={enableMSG}
        setEnableMSG={setEnableMSG}
        showSatelliteOverlay={showSatelliteOverlay}
        setShowSatelliteOverlay={setShowSatelliteOverlay}
        darkMode={darkMode}
        location={location}
        onNavigate={setPage}
      />
    );
  }
  
  return null;
}

// ⚠️ NOTA: Este é um starter. Você precisa criar os HOOKS que faltam:
// - useWeatherData (análogo ao carregamento de meteorologia)
// - Importar calcularTriangulacao de utils/calculations
// 
// Os arquivos estão prontos em:
// /src/hooks/, /src/services/, /src/utils/, /src/pages/, /src/styles/