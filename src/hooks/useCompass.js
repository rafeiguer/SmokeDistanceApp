import { useEffect, useState } from 'react';
import { Magnetometer } from 'expo-sensors';
import { obterDeclinacaoMagnetica } from '../utils/weather';
import { salvarCompassOffsets, carregarCompassOffsets } from '../utils/storage';

const DEG2RAD = Math.PI / 180;

export function useCompass(location, isConnected, isCalibrating = false, setIsCalibrating) {
  const [heading, setHeading] = useState(0);
  const [smoothHeading, setSmoothHeading] = useState(0);
  const [magneticDeclination, setMagneticDeclination] = useState(0);
  const [magnetometerReadings, setMagnetometerReadings] = useState([]);

  // 🧭 Obter declinação magnética
  useEffect(() => {
    if (!location) return;

    (async () => {
      try {
        const declination = await obterDeclinacaoMagnetica(location.latitude, location.longitude, isConnected);
        setMagneticDeclination(declination);
      } catch (err) {
        console.warn('⚠️ Erro ao obter declinação:', err.message);
        setMagneticDeclination(0);
      }
    })();
  }, [location, isConnected]);

  // 🧭 Bussola - Magnetômetro em tempo real
  useEffect(() => {
    try {
      console.log('🧭 Iniciando bussola com magnetômetro...');

      Magnetometer.setUpdateInterval(50);

      const subscription = Magnetometer.addListener(({ x, y, z }) => {
        // Modo calibração: coletar dados
        if (isCalibrating) {
          const magnitude = Math.sqrt(x * x + y * y + z * z);

          // Aceitar apenas dados com magnitude entre 20 e 80 microTesla
          if (magnitude >= 20 && magnitude <= 80) {
            setMagnetometerReadings((prev) => [
              ...prev,
              { x, y, z, magnitude, timestamp: Date.now() }
            ].slice(-200));

            console.log(`📊 Calibração: ${magnetometerReadings.length + 1} pontos válidos`);
          }

          return;
        }

        // Modo normal: calcular heading
        let magneticHeading = Math.atan2(x, y) * (180 / Math.PI);
        magneticHeading = magneticHeading < 0 ? magneticHeading + 360 : magneticHeading;
        magneticHeading = 360 - magneticHeading;
        if (magneticHeading >= 360) magneticHeading -= 360;

        // Aplicar declinação magnética (invertida)
        let trueHeading = magneticHeading - magneticDeclination;

        // Offset de calibração manual
        trueHeading = trueHeading - 52;

        // Normalizar para 0-359
        trueHeading = trueHeading % 360;
        if (trueHeading < 0) trueHeading += 360;

        // Suavização com alpha smoothing
        setSmoothHeading((prev) => {
          const alpha = 0.15;
          let diff = trueHeading - prev;

          if (diff > 180) diff -= 360;
          if (diff < -180) diff += 360;

          let newHeading = prev + diff * alpha;
          newHeading = ((newHeading % 360) + 360) % 360;

          return newHeading;
        });

        // Display heading
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
      console.warn('⚠️ Magnetômetro não disponível, usando fallback...');
      const interval = setInterval(() => {
        setSmoothHeading((prev) => (prev + 0.5) % 360);
      }, 100);
      return () => clearInterval(interval);
    }
  }, [magneticDeclination, isCalibrating, magnetometerReadings.length]);

  // 🧭 Concluir calibração
  const finalizarCalibracao = async () => {
    if (magnetometerReadings.length >= 30) {
      const readings = magnetometerReadings;

      let minX = Infinity,
        maxX = -Infinity;
      let minY = Infinity,
        maxY = -Infinity;
      let minZ = Infinity,
        maxZ = -Infinity;

      readings.forEach((r) => {
        minX = Math.min(minX, r.x);
        maxX = Math.max(maxX, r.x);
        minY = Math.min(minY, r.y);
        maxY = Math.max(maxY, r.y);
        minZ = Math.min(minZ, r.z);
        maxZ = Math.max(maxZ, r.z);
      });

      const offsetX = (maxX + minX) / 2;
      const offsetY = (maxY + minY) / 2;
      const offsetZ = (maxZ + minZ) / 2;

      console.log(`✅ Calibração Concluída!`);
      console.log(`📊 ${readings.length} pontos válidos coletados`);
      console.log(`🔧 Offsets calculados: X=${offsetX.toFixed(1)}, Y=${offsetY.toFixed(1)}, Z=${offsetZ.toFixed(1)}`);

      try {
        await salvarCompassOffsets(offsetX, offsetY, offsetZ);
      } catch (e) {
        console.warn('⚠️ Erro salvando offsets:', e);
      }

      setMagnetometerReadings([]);
      setIsCalibrating(false);

      return {
        offsetX,
        offsetY,
        offsetZ,
        pontos: readings.length,
      };
    } else {
      return null;
    }
  };

  // 🧭 Carregar offsets salvos
  useEffect(() => {
    (async () => {
      try {
        const offsets = await carregarCompassOffsets();
        if (offsets && offsets.offsetX) {
          console.log(`🧭 Offsets carregados do storage:`, offsets);
        }
      } catch (e) {
        console.warn('⚠️ Erro carregando offsets:', e);
      }
    })();
  }, []);

  return {
    heading,
    smoothHeading,
    magneticDeclination,
    magnetometerReadings,
    isCalibrating,
    setIsCalibrating,
    setMagnetometerReadings,
    finalizarCalibracao,
  };
}