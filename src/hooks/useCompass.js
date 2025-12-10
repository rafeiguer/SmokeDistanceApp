// 🧭 HOOK useCompass - Magnetômetro + WMM

import { useState, useEffect } from 'react';
import { COMPASS_CONFIG } from '../constants';
import { getMagneticDeclination, calculateHeadingFromMagnetometer, smoothHeading as smoothHeadingFunc } from '../services/magneticService';

export function useCompass(location) {
  const [heading, setHeading] = useState(0);
  const [smoothHeading, setSmoothHeading] = useState(0);
  const [magneticDeclination, setMagneticDeclination] = useState(0);
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [magnetometerReadings, setMagnetometerReadings] = useState([]);

  // 🧭 Fetch WMM quando localização muda
  useEffect(() => {
    if (!location) return;
    
    (async () => {
      try {
        const declination = await getMagneticDeclination(location.latitude, location.longitude);
        setMagneticDeclination(declination);
      } catch (err) {
        console.warn('⚠️ Erro ao obter declinação:', err);
      }
    })();
  }, [location]);

  // 🧭 Inicializar magnetômetro
  useEffect(() => {
    try {
      const { Magnetometer } = require('expo-sensors');
      
      Magnetometer.setUpdateInterval(COMPASS_CONFIG.updateInterval);
      
      const subscription = Magnetometer.addListener(({ x, y, z }) => {
        if (isCalibrating) {
          // Modo calibração: coletar dados
          const magnitude = Math.sqrt(x*x + y*y + z*z);
          
          if (magnitude >= COMPASS_CONFIG.magnetometerMinMagnitude && 
              magnitude <= COMPASS_CONFIG.magnetometerMaxMagnitude) {
            setMagnetometerReadings(prev => [
              ...prev,
              { x, y, z, magnitude, timestamp: Date.now() }
            ].slice(-COMPASS_CONFIG.calibrationMaxReadings));
          }
          return;
        }
        
        // Modo normal: calcular heading
        const trueHeading = calculateHeadingFromMagnetometer(x, y, magneticDeclination);
        
        // Suavizar
        setSmoothHeading(prev => smoothHeadingFunc(prev, trueHeading, COMPASS_CONFIG.magnetometerSmoothingAlpha));
        
        // Display
        let displayHeading = Math.round(trueHeading);
        displayHeading = displayHeading % 360;
        if (displayHeading < 0) displayHeading += 360;
        displayHeading = displayHeading === 360 ? 0 : displayHeading;
        
        setHeading(displayHeading);
      });

      return () => {
        if (subscription) subscription.remove();
      };
    } catch (err) {
      console.warn('⚠️ Magnetômetro não disponível:', err.message);
      // Fallback: rotação simulada
      const interval = setInterval(() => {
        setSmoothHeading(prev => (prev + 0.5) % 360);
      }, 100);
      return () => clearInterval(interval);
    }
  }, [magneticDeclination, isCalibrating]);

  return {
    heading,
    smoothHeading,
    magneticDeclination,
    isCalibrating,
    setIsCalibrating,
    magnetometerReadings,
    setMagnetometerReadings,
  };
}