// 🛰️ HOOK useSatellites - Focos FIRMS/GOES/MSG

import { useState } from 'react';
import { loadSatelliteFocos as loadSatelliteFocosService } from '../services/satelliteService';

export function useSatellites() {
  const [satelliteFocos, setSatelliteFocos] = useState([]);
  const [satelliteLoading, setSatelliteLoading] = useState(false);
  const [showSatelliteOverlay, setShowSatelliteOverlay] = useState(false);
  const [lastSatUpdate, setLastSatUpdate] = useState(null);
  
  const [enableFIRMS, setEnableFIRMS] = useState(true);
  const [enableGOES, setEnableGOES] = useState(false);
  const [enableMSG, setEnableMSG] = useState(false);

  const [satellitesInfo, setSatellitesInfo] = useState([
    { id: 'sat-1', nome: 'FIRMS (MODIS/VIIRS)', atualizacao: '≈ 15min-6h', resolucao: '375m-1km', focos: 0 },
    { id: 'sat-2', nome: 'GOES', atualizacao: '≈ 5-15min', resolucao: '2-10km', focos: 0 },
    { id: 'sat-3', nome: 'MSG', atualizacao: '≈ 15min', resolucao: '3km', focos: 0 },
  ]);

  /**
   * Carrega focos de satélite próximos
   */
  async function loadSatelliteFocos(latitude, longitude) {
    if (!latitude || !longitude) return;
    
    try {
      setSatelliteLoading(true);
      
      const focos = await loadSatelliteFocosService(latitude, longitude, {
        enableFIRMS,
        enableGOES,
        enableMSG,
      });
      
      setSatelliteFocos(focos);
      setLastSatUpdate(Date.now());
      
      // Atualizar contagem por satélite
      const countFIRMS = enableFIRMS ? focos.filter(x => x.origem === 'FIRMS').length : 0;
      const countGOES = enableGOES ? focos.filter(x => x.origem === 'GOES').length : 0;
      const countMSG = enableMSG ? focos.filter(x => x.origem === 'MSG').length : 0;
      
      setSatellitesInfo([
        { id: 'sat-1', nome: 'FIRMS (MODIS/VIIRS)', atualizacao: '≈ 15min-6h', resolucao: '375m-1km', focos: countFIRMS },
        { id: 'sat-2', nome: 'GOES', atualizacao: '≈ 5-15min', resolucao: '2-10km', focos: countGOES },
        { id: 'sat-3', nome: 'MSG', atualizacao: '≈ 15min', resolucao: '3km', focos: countMSG },
      ]);
      
      console.log(`✅ ${focos.length} focos carregados`);
    } catch (e) {
      console.warn('⚠️ Falha ao carregar satélites:', e?.message);
    } finally {
      setSatelliteLoading(false);
    }
  }

  return {
    satelliteFocos,
    setSatelliteFocos,
    satelliteLoading,
    satellitesInfo,
    setSatellitesInfo,
    showSatelliteOverlay,
    setShowSatelliteOverlay,
    lastSatUpdate,
    
    enableFIRMS,
    setEnableFIRMS,
    enableGOES,
    setEnableGOES,
    enableMSG,
    setEnableMSG,
    
    loadSatelliteFocos,
  };
}