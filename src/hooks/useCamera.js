import { useEffect, useState } from 'react';
import { Accelerometer } from 'expo-sensors';
import { EYE_HEIGHT, CAMERA_BASELINE_THRESHOLD } from '../constants';

export function useCamera(cameraActive) {
  const [cameraPhoto, setCameraPhoto] = useState(null);
  const [cameraObjectHeight, setCameraObjectHeight] = useState('50');
  const [cameraDynamicDistance, setCameraDynamicDistance] = useState(null);
  const [accelerometerData, setAccelerometerData] = useState({ x: 0, y: 0, z: 0 });
  const [pitchAngle, setPitchAngle] = useState(0);
  const [cameraBaselinePitch, setCameraBaselinePitch] = useState(null);

  // 📱 Hook para ler acelerômetro quando câmera estiver ativa
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

  // 📐 Calcular distância dinâmica na câmera (Telêmetro 3D real)
  useEffect(() => {
    if (!cameraActive) return;

    // Acelerômetro: calcular ângulo de pitch (vertical)
    const pitchRad = Math.atan2(
      accelerometerData.z,
      Math.sqrt(accelerometerData.x ** 2 + accelerometerData.y ** 2)
    );
    const pitchDeg = (pitchRad * 180) / Math.PI;
    setPitchAngle(pitchDeg);

    // Se pitch está muito próximo de -90° (apontando pra baixo), use como calibração
    if (pitchDeg < -80 && !cameraBaselinePitch) {
      setCameraBaselinePitch(pitchRad);
      console.log(`✅ Baseline calibrado em pitch ${pitchDeg.toFixed(1)}°`);
    }

    // Se baseline foi calibrado, calcular distância
    if (cameraBaselinePitch !== null) {
      const angleRad = pitchRad;
      const eyeHeight = EYE_HEIGHT;

      // Ângulo relativo ao baseline
      const relativeAngleRad = angleRad - cameraBaselinePitch;
      const relativeAngleDeg = (relativeAngleRad * 180) / Math.PI;

      // Se está muito próximo do baseline (< 5°), força distância 0
      if (Math.abs(relativeAngleDeg) < CAMERA_BASELINE_THRESHOLD) {
        setCameraDynamicDistance(0);
        setCameraObjectHeight('0');
        return;
      }

      if (Math.abs(relativeAngleRad) > 0.02) {
        // Usar valor absoluto do ângulo
        const absAngleRad = Math.abs(relativeAngleRad);

        // Ângulo complementar para inverter a relação
        const complementAngleRad = Math.PI / 2 - absAngleRad;
        const tanAngle = Math.tan(complementAngleRad);

        // Proteger contra valores extremos
        if (!isFinite(tanAngle) || Math.abs(tanAngle) < 0.05) {
          setCameraDynamicDistance(null);
          return;
        }

        // Fórmula: distance = height / tan(complemento)
        const horizontalDist = Math.abs(eyeHeight / tanAngle);

        // Limitar distância máxima a 1000m
        if (horizontalDist > 1000) {
          setCameraDynamicDistance(null);
          return;
        }

        let D_H = horizontalDist;

        // Se distância > 100m, corrigir com curvatura da Terra
        if (horizontalDist > 100) {
          const R = 6371000; // Raio da Terra
          const deg2rad = Math.PI / 180;
          const smoothHeading = 0; // Você vai passar isso depois

          const radians = smoothHeading * deg2rad;
          const targetLat = 0 + (horizontalDist / R) * Math.cos(radians) * deg2rad; // Placeholder
          const targetLon = 0 + (horizontalDist / R / Math.cos(0 * deg2rad)) * Math.sin(radians) * deg2rad;

          // Recalcular com distância real (Haversine)
          // Por enquanto usar horizontalDist
          D_H = horizontalDist;
        }

        const verticalDiff = horizontalDist * tanAngle;
        const objectHeight = Math.abs(verticalDiff);
        const D_3D = Math.sqrt(D_H * D_H + verticalDiff * verticalDiff);

        if (isFinite(D_3D) && D_3D > 0.5 && D_3D < 1000) {
          setCameraDynamicDistance(D_3D);
          setCameraObjectHeight(Math.round(objectHeight).toString());
        } else {
          setCameraDynamicDistance(null);
        }
      }
    } else {
      setCameraDynamicDistance(null);
    }
  }, [cameraActive, accelerometerData, cameraBaselinePitch]);

  // 🔄 Reset baseline quando fecha câmera
  useEffect(() => {
    if (!cameraActive) {
      setCameraBaselinePitch(null);
    }
  }, [cameraActive]);

  return {
    cameraPhoto,
    setCameraPhoto,
    cameraObjectHeight,
    setCameraObjectHeight,
    cameraDynamicDistance,
    setCameraDynamicDistance,
    accelerometerData,
    setAccelerometerData,
    pitchAngle,
    setPitchAngle,
    cameraBaselinePitch,
    setCameraBaselinePitch,
  };
}
