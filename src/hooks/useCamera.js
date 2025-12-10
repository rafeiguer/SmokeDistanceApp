// 📷 HOOK useCamera - Câmera + Distância 3D via Acelerômetro

import { useState, useEffect } from 'react';
import { Accelerometer } from 'expo-sensors';
import { CAMERA_CONFIG } from '../constants';
import { calculateDistanceHaversine } from '../utils/calculations';

export function useCamera(location, smoothHeading) {
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraDynamicDistance, setCameraDynamicDistance] = useState(null);
  const [cameraObjectHeight, setCameraObjectHeight] = useState('0');
  const [pitchAngle, setPitchAngle] = useState(0);
  const [accelerometerData, setAccelerometerData] = useState({ x: 0, y: 0, z: 0 });
  const [cameraBaselinePitch, setCameraBaselinePitch] = useState(null);

  // 📡 Ler acelerômetro quando câmera ativa
  useEffect(() => {
    if (!cameraActive) return;
    
    Accelerometer.setUpdateInterval(100);
    
    const subscription = Accelerometer.addListener(({ x, y, z }) => {
      setAccelerometerData({ x, y, z });
    });
    
    return () => {
      subscription.remove();
    };
  }, [cameraActive]);

  // 🎯 Calcular distância 3D
  useEffect(() => {
    if (!cameraActive || !location) return;
    
    // Calcular pitch do acelerômetro
    const pitchRad = Math.atan2(accelerometerData.z, Math.sqrt(accelerometerData.x ** 2 + accelerometerData.y ** 2));
    const pitchDeg = (pitchRad * 180) / Math.PI;
    setPitchAngle(pitchDeg);
    
    // Se apontando pra baixo, usar como calibração
    if (pitchDeg < -80 && !cameraBaselinePitch) {
      setCameraBaselinePitch(pitchRad);
      console.log(`✅ Baseline calibrado em pitch ${pitchDeg.toFixed(1)}°`);
    }
    
    // Se baseline calibrado, calcular distância
    if (cameraBaselinePitch !== null) {
      const angleRad = pitchRad;
      const eyeHeight = CAMERA_CONFIG.eyeHeight;
      
      // Ângulo relativo ao baseline
      const relativeAngleRad = angleRad - cameraBaselinePitch;
      const relativeAngleDeg = (relativeAngleRad * 180) / Math.PI;
      
      // Se muito próximo do baseline, distância = 0
      if (Math.abs(relativeAngleDeg) < CAMERA_CONFIG.minRelativeAngle) {
        setCameraDynamicDistance(0);
        setCameraObjectHeight('0');
        return;
      }
      
      if (Math.abs(relativeAngleRad) > CAMERA_CONFIG.minAbsAngle) {
        const absAngleRad = Math.abs(relativeAngleRad);
        const complementAngleRad = (Math.PI / 2) - absAngleRad;
        const tanAngle = Math.tan(complementAngleRad);
        
        if (!isFinite(tanAngle) || Math.abs(tanAngle) < 0.05) {
          setCameraDynamicDistance(null);
          return;
        }
        
        const horizontalDist = Math.abs(eyeHeight / tanAngle);
        
        if (horizontalDist > CAMERA_CONFIG.maxCameraDistance) {
          setCameraDynamicDistance(null);
          return;
        }
        
        let D_H = horizontalDist;
        
        // Se muito longe, usar Haversine
        if (horizontalDist > 100) {
          const radians = (smoothHeading * Math.PI) / 180;
          const R = 6371000;
          const deg2rad = Math.PI / 180;
          
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
        
        if (isFinite(D_3D) && D_3D > 0.5 && D_3D < CAMERA_CONFIG.maxCameraDistance) {
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

  // Reset baseline ao fechar câmera
  useEffect(() => {
    if (!cameraActive) {
      setCameraBaselinePitch(null);
    }
  }, [cameraActive]);

  return {
    cameraActive,
    setCameraActive,
    cameraDynamicDistance,
    cameraObjectHeight,
    pitchAngle,
    accelerometerData,
    cameraBaselinePitch,
  };
}