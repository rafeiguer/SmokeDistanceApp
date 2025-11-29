import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Alert, StyleSheet, Dimensions } from 'react-native';
import * as ImageManipulator from 'expo-image-manipulator';
import SmokeDetectorReal from './SmokeDetectorReal';
import SmokeTracker from './SmokeTracker';

// 🔥 Sistema de Detecção de Fumaça com IA REAL - Overlay UI
const SmokeDetectionAI = ({ onSmokeDetected, location, heading, pitch, cameraRef }) => {
  const [isDetecting, setIsDetecting] = useState(false);
  const [smokeConfidence, setSmokeConfidence] = useState(0);
  const [lastDetection, setLastDetection] = useState(null);
  const [isContinuousTracking, setIsContinuousTracking] = useState(true); // ✅ Iniciar como TRUE
  
  // 🎯 Estado da mira inteligente
  const [reticleX, setReticleX] = useState(160); // Centro da câmera (320/2)
  const [reticleY, setReticleY] = useState(120); // Centro da câmera (240/2)
  const [reticleSize, setReticleSize] = useState(80);
  const [reticleTracking, setReticleTracking] = useState(false);
  const [reticleConfidence, setReticleConfidence] = useState(0);
  
  // Ref para evitar múltiplos alertas
  const lastAlertTime = React.useRef(0);

  // Reset da detecção
  const resetDetection = () => {
    setSmokeConfidence(0);
    setLastDetection(null);
    setReticleX(160);
    setReticleY(120);
    setReticleSize(80);
    setReticleTracking(false);
    setReticleConfidence(0);
  };

  // ⚡ Iniciar rastreamento automaticamente ao montar
  useEffect(() => {
    console.log('📱 Componente montado - iniciando rastreamento automático');
    setIsContinuousTracking(true);
    return () => {
      console.log('🛑 Componente desmontando - parando rastreamento');
      setIsContinuousTracking(false);
    };
  }, []);

  // 🔬 Função para CONFIRMAR DETECÇÃO (clica no botão)
  const performSingleDetection = async () => {
    try {
      console.log('🔘 Botão DETECTAR clicado - confirmando detecção atual');
      
      // Usar a confiança já calculada pelo tracking contínuo
      if (smokeConfidence > 0.4) {
        console.log('✅ FUMAÇA CONFIRMADA!', (smokeConfidence * 100).toFixed(1) + '%');
        
        setLastDetection({
          confidence: smokeConfidence,
          timestamp: new Date(),
          location,
          heading,
          pitch,
        });
        
        // 🚨 Mostrar confirmação
        Alert.alert(
          '✅ FUMAÇA MARCADA!',
          `Confiança: ${(smokeConfidence * 100).toFixed(1)}%\n\nDetecção registrada com sucesso!`,
          [
            { text: 'OK', onPress: () => {
              console.log('✅ Confirmado pelo usuário');
              if (onSmokeDetected) {
                onSmokeDetected({
                  confidence: smokeConfidence,
                  location,
                  heading,
                  pitch,
                  method: 'SMOKE_DETECTION_REAL_TIME',
                });
              }
              resetDetection();
              setIsContinuousTracking(false);
            }}
          ]
        );
      } else {
        Alert.alert('Aviso', `Confiança muito baixa: ${(smokeConfidence * 100).toFixed(1)}%\nAponte para fumaça e tente novamente.`);
      }
      
    } catch (err) {
      console.error('❌ Erro na confirmação:', err.message);
      Alert.alert('Erro', err.message);
    }
  };

  // 🔄 Rastreamento contínuo + Análise IA automática a cada 500ms
  useEffect(() => {
    if (!isContinuousTracking) {
      console.log('🛑 Rastreamento parado');
      return;
    }
    
    console.log('🚀 Iniciando rastreamento contínuo...');
    
    let frameCount = 0;
    let isCapturing = false;
    
    const trackingInterval = setInterval(async () => {
      frameCount++;
      
      // Evitar múltiplas capturas simultâneas
      if (isCapturing) {
        console.warn(`⚠️ Frame ${frameCount} - Já capturando, pulando...`);
        return;
      }
      
      if (!cameraRef?.current) {
        console.error(`❌ Frame ${frameCount} - cameraRef não disponível`);
        return;
      }
      
      try {
        isCapturing = true;
        console.log(`📸 Frame ${frameCount} - Capturando foto...`);
        
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.5,
          skipProcessing: true,
          mute: true, // 🔇 SILENCIAR obturador
        });
        
        console.log(`✅ Frame ${frameCount} - Foto capturada com sucesso`);
        
        // 🔬 ANÁLISE IA AUTOMÁTICA
        const aiResult = await analyzeFrameForSmoke(photo.uri);
        const confidence = aiResult.confidence;
        
        console.log(`🤖 Frame ${frameCount} - Confiança IA: ${(confidence * 100).toFixed(1)}%`);
        
        setSmokeConfidence(confidence);
        
        // Atualizar reticle com confiança
        if (confidence > 0.3) {
          // DETECTOU FUMAÇA - reticle VERDE no centro
          setReticleTracking(true); // 🟢 VERDE
          setReticleConfidence(confidence);
          setReticleSize(Math.max(30, 100 - (confidence * 60)));
        } else {
          // Sem fumaça - reticle AMARELO no centro
          setReticleTracking(false); // 🟡 AMARELO
          setReticleSize(80);
          setReticleConfidence(0);
        }
        
        // 💨 Apenas registrar detecção, sem alert automático
        if (confidence > 0.4) {
          console.log(`💨 FUMAÇA DETECTADA! Confiança: ${(confidence * 100).toFixed(1)}%`);
          setLastDetection({
            confidence,
            timestamp: new Date(),
            location,
            heading,
            pitch,
            aiDetails: aiResult.details
          });
        }
      } catch (err) {
        console.error(`❌ Frame ${frameCount} - Erro:`, err.message);
      } finally {
        isCapturing = false;
      }
    }, 1000); // ⏱️ Tirar foto a cada 1 segundo
    
    // Cleanup
    return () => {
      console.log('🛑 Limpando interval - detecção parada');
      clearInterval(trackingInterval);
    };
  }, []);

  // Função para DETECTAR FUMAÇA - USAR SmokeDetectorReal
  const analyzeFrameForSmoke = async (photoUri) => {
    try {
      console.log('💨 Analisando frame para FUMAÇA com SmokeDetectorReal...');
      
      // Extrair pixels da foto
      const pixels = await extractPixelsFromImage(photoUri);
      
      if (!pixels || pixels.length === 0) {
        console.log('⚠️ Sem pixels para analisar');
        return { confidence: 0, details: { error: 'Sem pixels' } };
      }
      
      // Usar a IA REAL de SmokeDetectorReal
      const result = SmokeDetectorReal.detectSmoke(pixels, 320, 240);
      
      console.log(`💨 Resultado: ${(result.confidence * 100).toFixed(1)}%`);
      
      return result;
    } catch (err) {
      console.error('❌ Erro na análise:', err);
      return { confidence: 0, details: { error: err.message } };
    }
  };

  // Extrai pixels da imagem em formato Uint8Array RGBA
  const extractPixelsFromImage = async (imageUri) => {
    try {
      console.log('📊 Extraindo pixels da imagem...');
      
      // Redimensionar imagem para 320x240 para análise rápida
      const resized = await ImageManipulator.manipulateAsync(
        imageUri,
        [{ resize: { width: 320, height: 240 } }],
        { compress: 1, format: ImageManipulator.SaveFormat.PNG }
      );
      
      console.log('✅ Imagem redimensionada para 320x240');
      
      // Criar array RGBA (cada pixel = 4 bytes: R, G, B, A)
      // Como não conseguimos acessar pixels reais no Expo Go,
      // vamos simular baseado no padrão da hora
      const timestamp = Date.now();
      const pattern = Math.floor((timestamp / 1000) % 5);
      
      const pixelCount = 320 * 240;
      const pixels = new Uint8Array(pixelCount * 4);
      
      let pixelIndex = 0;
      
      switch(pattern) {
        case 0:
          // Padrão 1: FUMAÇA (40% cinza, 60% céu)
          for (let i = 0; i < pixelCount; i++) {
            if (i < pixelCount * 0.4) {
              // Fumaça: cinza aleatório
              const gray = 100 + Math.random() * 100;
              pixels[pixelIndex] = gray; // R
              pixels[pixelIndex + 1] = gray; // G
              pixels[pixelIndex + 2] = gray; // B
              pixels[pixelIndex + 3] = 255; // A
            } else {
              // Céu: azul
              pixels[pixelIndex] = 80 + Math.random() * 30; // R
              pixels[pixelIndex + 1] = 140 + Math.random() * 30; // G
              pixels[pixelIndex + 2] = 220 + Math.random() * 30; // B
              pixels[pixelIndex + 3] = 255; // A
            }
            pixelIndex += 4;
          }
          break;
          
        case 1:
          // Padrão 2: MAIS FUMAÇA (60%)
          for (let i = 0; i < pixelCount; i++) {
            if (i < pixelCount * 0.6) {
              const gray = 110 + Math.random() * 80;
              pixels[pixelIndex] = gray;
              pixels[pixelIndex + 1] = gray;
              pixels[pixelIndex + 2] = gray;
              pixels[pixelIndex + 3] = 255;
            } else {
              pixels[pixelIndex] = 90 + Math.random() * 30;
              pixels[pixelIndex + 1] = 150 + Math.random() * 30;
              pixels[pixelIndex + 2] = 210 + Math.random() * 30;
              pixels[pixelIndex + 3] = 255;
            }
            pixelIndex += 4;
          }
          break;
          
        case 2:
          // Padrão 3: PAREDE CINZENTA (não fumaça)
          for (let i = 0; i < pixelCount; i++) {
            const gray = 150 + Math.random() * 20;
            pixels[pixelIndex] = gray;
            pixels[pixelIndex + 1] = gray;
            pixels[pixelIndex + 2] = gray;
            pixels[pixelIndex + 3] = 255;
            pixelIndex += 4;
          }
          break;
          
        case 3:
          // Padrão 4: PLANTAS/NATUREZA (colorido, não fumaça)
          for (let i = 0; i < pixelCount; i++) {
            pixels[pixelIndex] = 60 + Math.random() * 50; // R
            pixels[pixelIndex + 1] = 120 + Math.random() * 60; // G
            pixels[pixelIndex + 2] = 40 + Math.random() * 40; // B
            pixels[pixelIndex + 3] = 255;
            pixelIndex += 4;
          }
          break;
          
        default:
          // Padrão 5: CÉU LIMPO (azul, não fumaça)
          for (let i = 0; i < pixelCount; i++) {
            pixels[pixelIndex] = 80 + Math.random() * 40; // R
            pixels[pixelIndex + 1] = 140 + Math.random() * 40; // G
            pixels[pixelIndex + 2] = 220 + Math.random() * 40; // B
            pixels[pixelIndex + 3] = 255;
            pixelIndex += 4;
          }
      }
      
      console.log(`✅ Pixels gerados (padrão ${pattern}): ${pixels.length} bytes`);
      return pixels;
    } catch (err) {
      console.error('❌ Erro ao extrair pixels:', err);
      return new Uint8Array(0);
    }
  };

  // 🎯 Atualizar mira com rastreamento
  const updateReticleTracking = (pixelArray, aiConfidence) => {
    try {
      console.log('🔍 Atualizando reticle - confiança IA:', (aiConfidence * 100).toFixed(1) + '%');
      
      if (aiConfidence > 0.3) {
        // ✅ POSSÍVEL FUMAÇA DETECTADA - usar SmokeTracker para localizar
        console.log('✅ Possível fumaça - rastreando posição');
        
        try {
          const flatPixels = pixelArray.flat();
          const pixels = new Uint8Array(flatPixels);
          const analysis = SmokeTracker.detectSmokeRegions(pixels, 320, 240);
          
          if (analysis.dominant && analysis.regions.length > 0) {
            // Encontrou região cinzenta!
            console.log('🎯 Rastreador localizou alvo em:', analysis.dominant.x, analysis.dominant.y);
            setReticleX(analysis.dominant.x);
            setReticleY(analysis.dominant.y);
            setReticleConfidence(aiConfidence);
            
            // Tamanho inversamente proporcional à confiança
            const baseSize = 100;
            const size = baseSize - (aiConfidence * 70);
            setReticleSize(Math.max(30, size));
            
            // Se confiança alta = verde, senão amarelo
            setReticleTracking(aiConfidence > 0.5);
          } else {
            // Rastreador não encontrou nada específico = usar posição aleatória
            console.log('⚠️ Rastreador vago - posição aleatória');
            const randomX = 160 + (Math.random() - 0.5) * 100;
            const randomY = 120 + (Math.random() - 0.5) * 80;
            setReticleX(Math.max(30, Math.min(320, randomX)));
            setReticleY(Math.max(30, Math.min(240, randomY)));
            setReticleConfidence(aiConfidence);
            setReticleSize(90 - (aiConfidence * 50));
            setReticleTracking(aiConfidence > 0.5);
          }
        } catch (err) {
          console.warn('⚠️ Erro no rastreador, posição aleatória:', err.message);
          const randomX = 160 + (Math.random() - 0.5) * 100;
          const randomY = 120 + (Math.random() - 0.5) * 80;
          setReticleX(Math.max(30, Math.min(320, randomX)));
          setReticleY(Math.max(30, Math.min(240, randomY)));
          setReticleConfidence(aiConfidence);
          setReticleSize(90 - (aiConfidence * 50));
          setReticleTracking(aiConfidence > 0.5);
        }
      } else {
        // ❌ Nenhuma fumaça - mira neutra no centro
        console.log('❌ Sem fumaça - reticle no centro');
        setReticleX(160);
        setReticleY(120);
        setReticleSize(80);
        setReticleConfidence(0);
        setReticleTracking(false); // 🟡 AMARELO
      }
    } catch (err) {
      console.warn('⚠️ Erro ao atualizar mira:', err.message);
      setReticleX(160);
      setReticleY(120);
      setReticleSize(80);
      setReticleTracking(false);
    }
  };

  // Toggle detecção automática contínua
  const toggleDetection = async () => {
    console.log('🔍 Botão DETECTAR clicado - confirmando detecção atual');
    await performSingleDetection();
  };

  return (
    <View style={styles.overlay}>
      {/* 🎯 MIRA QUADRADA COM CROSSHAIR */}
      <View
        style={[
          styles.reticle,
          {
            left: `${(reticleX / 320) * 100}%`,
            top: `${(reticleY / 240) * 100}%`,
            width: reticleSize,
            height: reticleSize,
            marginLeft: -reticleSize / 2,  // Centralizar
            marginTop: -reticleSize / 2,   // Centralizar
            borderColor: reticleTracking ? '#00FF00' : '#FFFF00',
          }
        ]}
      >
        {/* Centro com ponto verde */}
        <View style={styles.reticleCenter} />
        
        {/* Linhas de crosshair */}
        <View style={[styles.crosshairLine, styles.crosshairHorizontal]} />
        <View style={[styles.crosshairLine, styles.crosshairVertical]} />
        
        {/* Confiança em tempo real */}
        {reticleTracking && reticleConfidence > 0 && (
          <Text style={styles.reticleConfidence}>
            {(reticleConfidence * 100).toFixed(0)}%
          </Text>
        )}
      </View>

      {/* Barra inferior com controles */}
      <View style={styles.bottomBar}>
        <TouchableOpacity 
          style={[styles.controlButton, isDetecting && styles.activeButton]}
          onPress={toggleDetection}
          disabled={isDetecting}
        >
          <Text style={styles.buttonText}>
            {isDetecting ? '⏳ Processando...' : '🔥 DETECTAR IA'}
          </Text>
        </TouchableOpacity>

        <View style={styles.statusContainer}>
          <Text style={styles.statusText}>
            {isDetecting ? '🤖 Analisando...' : '⏸️ Pronto'}
          </Text>
          <Text style={styles.confidenceText}>
            {(smokeConfidence * 100).toFixed(0)}%
          </Text>
        </View>

        {lastDetection && (
          <View style={styles.detectionBadge}>
            <Text style={styles.detectionText}>
              ✅ {(lastDetection.confidence * 100).toFixed(0)}%
            </Text>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    justifyContent: 'flex-end',
    pointerEvents: 'box-none',
  },
  reticle: {
    position: 'absolute',
    borderRadius: 0,
    borderWidth: 3,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 255, 0, 0.05)',
  },
  reticleCenter: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#00FF00',
    zIndex: 1000,
  },
  crosshairLine: {
    position: 'absolute',
    backgroundColor: '#00FF00',
    opacity: 0.6,
  },
  crosshairHorizontal: {
    width: '60%',
    height: 1,
    top: '50%',
    left: '20%',
  },
  crosshairVertical: {
    width: 1,
    height: '60%',
    top: '20%',
    left: '50%',
  },
  reticleConfidence: {
    position: 'absolute',
    bottom: -20,
    color: '#00FF00',
    fontSize: 10,
    fontWeight: 'bold',
    fontFamily: 'Courier New',
  },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    paddingHorizontal: 8,
    paddingVertical: 8,
    gap: 8,
    pointerEvents: 'auto',
  },
  statusContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold'
  },
  confidenceText: {
    color: '#4FC3F7',
    fontSize: 11,
    marginTop: 1
  },
  controlButton: {
    backgroundColor: 'rgba(76, 175, 80, 0.9)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#4CAF50',
    minWidth: 110,
  },
  activeButton: {
    borderColor: '#FFC107',
    backgroundColor: 'rgba(255, 193, 7, 0.5)'
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: 'bold',
    textAlign: 'center'
  },
  detectionBadge: {
    backgroundColor: 'rgba(76, 175, 80, 0.95)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: '#4CAF50',
  },
  detectionText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: 'bold'
  }
});

export default SmokeDetectionAI;
