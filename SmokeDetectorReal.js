// 🔥 DETECTOR DE FUMAÇA REAL - Análise de Pixels + Cores
// Detecta padrões visuais típicos de fumaça (cinza, branco, tons quentes)

class SmokeDetectorReal {
  /**
   * Processa imagem e detecta fumaça
   * @param {Uint8Array} pixels - Array de pixels RGBA
   * @param {number} width - Largura da imagem
   * @param {number} height - Altura da imagem
   * @returns {Object} { confidence: 0-1, details: {...} }
   */
  static detectSmoke(pixels, width, height) {
    try {
      if (!pixels || pixels.length === 0) {
        return { confidence: 0, details: { reason: 'Sem dados de pixel' } };
      }

      // Extrair características de fumaça
      const analysis = {
        grayPixels: 0,
        whitePixels: 0,
        warmPixels: 0,
        darkPixels: 0,
        edgePixels: 0,
        uniformPixels: 0, // Pixels muito uniformes (parede)
        totalPixels: 0,
        avgGrayness: 0,
        avgWarmth: 0,
        variance: 0,
        textureScore: 0
      };

      // Analisar pixels
      let graySum = 0;
      let warmthSum = 0;
      const grayValues = [];

      for (let i = 0; i < pixels.length; i += 4) {
        const r = pixels[i];
        const g = pixels[i + 1];
        const b = pixels[i + 2];
        const a = pixels[i + 3];

        // Pular pixels transparentes
        if (a < 128) continue;

        const gray = (r + g + b) / 3;
        const warmth = (r - b); // Diferença entre vermelho e azul
        const saturation = Math.max(r, g, b) - Math.min(r, g, b);
        const uniformity = Math.max(r, g, b) - Math.min(r, g, b); // Quanto maior, menos uniforme

        analysis.totalPixels++;
        grayValues.push(gray);
        graySum += gray;
        warmthSum += warmth;

        // Contar pixels por tipo
        if (gray > 200) analysis.whitePixels++;
        if (gray > 120 && gray < 200) analysis.grayPixels++;
        if (gray < 100) analysis.darkPixels++;
        if (warmth > 30) analysis.warmPixels++;
        
        // Contar pixels muito uniformes (parede cinza)
        if (uniformity < 10) analysis.uniformPixels++;
      }

      if (analysis.totalPixels === 0) {
        return { confidence: 0, details: { reason: 'Imagem vazia' } };
      }

      // Calcular médias
      analysis.avgGrayness = graySum / analysis.totalPixels;
      analysis.avgWarmth = warmthSum / analysis.totalPixels;

      // Calcular variância (textura)
      const mean = analysis.avgGrayness;
      let varianceSum = 0;
      grayValues.forEach(val => {
        varianceSum += Math.pow(val - mean, 2);
      });
      analysis.variance = Math.sqrt(varianceSum / grayValues.length);

      // Calcular score de textura
      analysis.textureScore = Math.min(1, analysis.variance / 100);

      // LÓGICA DE DETECÇÃO DE FUMAÇA - MUITO RIGOROSA
      let confidence = 0;
      const scoreComponents = [];

      // ⚠️ REJEIÇÕES RÁPIDAS (garantir que NÃO é fumaça)
      const uniformRatio = analysis.uniformPixels / analysis.totalPixels;
      
      // Se muito uniforme = parede, rejeitar IMEDIATAMENTE
      if (uniformRatio > 0.6) {
        console.log('   ❌ REJEIÇÃO: Imagem muito uniforme (parede/superfície)');
        return { confidence: 0, details: { ...analysis, reason: 'Surface too uniform (wall-like)' } };
      }

      // Se imagem muito escura, rejeitar
      const darkRatio = analysis.darkPixels / analysis.totalPixels;
      if (darkRatio > 0.7) {
        console.log('   ❌ REJEIÇÃO: Imagem muito escura');
        return { confidence: 0, details: { ...analysis, reason: 'Image too dark' } };
      }

      // Se muito poucas cores cinzas/brancas, não é fumaça
      const grayRatio = (analysis.grayPixels + analysis.whitePixels) / analysis.totalPixels;
      if (grayRatio < 0.25) {
        console.log('   ❌ REJEIÇÃO: Insuficientes pixels cinza/branco (precisa >25%, tem ' + (grayRatio * 100).toFixed(1) + '%)');
        return { confidence: 0, details: { ...analysis, reason: 'Not enough gray/white pixels' } };
      }

      // Se muita cor saturada, não é fumaça (é objeto colorido)
      const colorfulness = analysis.totalPixels > 0 ? (analysis.warmPixels) / analysis.totalPixels : 0;
      if (colorfulness > 0.4) {
        console.log('   ❌ REJEIÇÃO: Muita cor saturada (é um objeto colorido)');
        return { confidence: 0, details: { ...analysis, reason: 'Too much saturation (not smoke)' } };
      }

      // Se textura é MUITO baixa = objeto sólido liso
      if (analysis.variance < 15) {
        console.log('   ❌ REJEIÇÃO: Textura muito baixa (objeto sólido/parede)');
        return { confidence: 0, details: { ...analysis, reason: 'Texture too smooth (not smoke)' } };
      }

      // ✅ PASSOU NAS REJEIÇÕES, agora calcular confiança
      
      // 1️⃣ Pixels cinzento-brancos (35% do score) - CRÍTICO
      const grayScore = Math.min(1, grayRatio * 2.5);
      confidence += grayScore * 0.35;
      scoreComponents.push({ name: 'Gray/White Pixels', value: grayScore, weight: 0.35 });

      // 2️⃣ Ausência de cores (25% do score)
      const lowColorScore = Math.max(0, 1 - colorfulness * 3);
      confidence += lowColorScore * 0.25;
      scoreComponents.push({ name: 'Low Colorfulness', value: lowColorScore, weight: 0.25 });

      // 3️⃣ Textura boa (20% do score) - Precisa ter variação mas não muito
      const textureGood = analysis.variance > 20 && analysis.variance < 70;
      const textureScore = textureGood ? 1 : Math.max(0, 1 - Math.abs(analysis.variance - 45) / 40);
      confidence += textureScore * 0.20;
      scoreComponents.push({ name: 'Texture', value: textureScore, weight: 0.20 });

      // 4️⃣ Não uniforme (20% do score)
      const nonUniformScore = Math.max(0, 1 - uniformRatio * 2);
      confidence += nonUniformScore * 0.20;
      scoreComponents.push({ name: 'Non-Uniform', value: nonUniformScore, weight: 0.20 });

      // Garantir que está entre 0 e 1
      confidence = Math.max(0, Math.min(1, confidence));

      return {
        confidence,
        details: {
          ...analysis,
          grayRatio: (grayRatio * 100).toFixed(1),
          colorfulness: (colorfulness * 100).toFixed(1),
          scoreComponents
        }
      };
    } catch (err) {
      console.error('❌ Erro na análise de fumaça:', err);
      return { confidence: 0, details: { error: err.message } };
    }
  }

  /**
   * Extrai pixels de uma imagem Base64
   * @param {string} base64 - Imagem em base64
   * @returns {Promise} { pixels, width, height }
   */
  static async extractPixelsFromBase64(base64) {
    return new Promise((resolve, reject) => {
      // Converter base64 para buffer binário
      const binary = atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }

      // Criar Image element (React Native compatible)
      const img = new Image();
      img.onload = () => {
        try {
          // Canvas para extrair pixels
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0);
          const imageData = ctx.getImageData(0, 0, img.width, img.height);
          
          resolve({
            pixels: imageData.data,
            width: img.width,
            height: img.height
          });
        } catch (err) {
          reject(err);
        }
      };
      img.onerror = reject;
      img.src = 'data:image/jpeg;base64,' + base64;
    });
  }

  /**
   * Versão simplificada para React Native (sem canvas)
   * @param {number} width - Largura
   * @param {number} height - Altura
   * @param {Array} samplePixels - Array de [R,G,B,A] values
   * @returns {Object} { confidence, details }
   */
  static detectSmokeFromSamples(width, height, samplePixels) {
    // Converter array de samples para Uint8Array
    const pixels = new Uint8Array(samplePixels.flat());
    return this.detectSmoke(pixels, width, height);
  }

  /**
   * Método para testar com cores conhecidas
   */
  static createTestPixels(type = 'smoke') {
    let pixels = [];

    if (type === 'smoke') {
      // Simular fumaça: cinza/branco com variação
      for (let i = 0; i < 1000; i++) {
        const base = Math.random() * 100 + 120; // 120-220
        pixels.push([base, base, base, 255]); // Cinzento
      }
    } else if (type === 'clear') {
      // Céu claro: azul
      for (let i = 0; i < 1000; i++) {
        pixels.push([100, 150, 255, 255]); // Azul
      }
    } else if (type === 'dark') {
      // Noite: escuro
      for (let i = 0; i < 1000; i++) {
        pixels.push([20, 20, 20, 255]); // Preto
      }
    }

    return pixels;
  }
}

export default SmokeDetectorReal;
