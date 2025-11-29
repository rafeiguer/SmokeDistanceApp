// 🎯 SISTEMA DE RASTREAMENTO DE FUMAÇA - Mira Inteligente
// Detecta regiões de fumaça e rastreia movimento em tempo real

class SmokeTracker {
  /**
   * Analisa imagem e encontra regiões de fumaça
   * @param {Uint8Array} pixels - Array de pixels RGBA
   * @param {number} width - Largura da imagem
   * @param {number} height - Altura da imagem
   * @returns {Object} { regions: [{x, y, size, confidence}], dominant: {...}}
   */
  static detectSmokeRegions(pixels, width, height) {
    try {
      if (!pixels || pixels.length === 0) {
        return { regions: [], dominant: null };
      }

      // Dividir imagem em GRID de 8x8 células
      const gridSize = 8;
      const cellWidth = Math.floor(width / gridSize);
      const cellHeight = Math.floor(height / gridSize);
      
      const grid = [];

      // Analisar cada célula
      for (let gy = 0; gy < gridSize; gy++) {
        for (let gx = 0; gx < gridSize; gx++) {
          const cellScore = this.analyzeCellForSmoke(
            pixels, width, height,
            gx * cellWidth, gy * cellHeight,
            cellWidth, cellHeight
          );

          if (cellScore.confidence > 0.1) { // Threshold BAIXO para células (detecção mais sensível)
            grid.push({
              x: gx,
              y: gy,
              centerX: gx * cellWidth + cellWidth / 2,
              centerY: gy * cellHeight + cellHeight / 2,
              confidence: cellScore.confidence,
              grayRatio: cellScore.grayRatio,
              variance: cellScore.variance
            });
          }
        }
      }

      // Se não encontrou nada, retornar vazio
      if (grid.length === 0) {
        console.log('🚫 Nenhuma célula acima do threshold encontrada');
        return { regions: [], dominant: null };
      }

      console.log('✅ Grid detectou', grid.length, 'células acima do threshold 0.1');

      // Agrupar células adjacentes em clusters (regiões maiores)
      const regions = this.clusterRegions(grid, gridSize);

      // Encontrar região dominante (maior e mais confiante)
      let dominant = null;
      if (regions.length > 0) {
        dominant = regions.reduce((best, current) => {
          const currentScore = current.confidence * current.size;
          const bestScore = best.confidence * best.size;
          return currentScore > bestScore ? current : best;
        });
      }

      return {
        regions,
        dominant,
        gridAnalysis: {
          cellsDetected: grid.length,
          totalCells: gridSize * gridSize,
          coverage: ((grid.length / (gridSize * gridSize)) * 100).toFixed(1) + '%'
        }
      };
    } catch (err) {
      console.error('❌ Erro ao detectar regiões:', err);
      return { regions: [], dominant: null };
    }
  }

  /**
   * Analisa uma célula específica da imagem
   */
  static analyzeCellForSmoke(pixels, imgWidth, imgHeight, startX, startY, width, height) {
    let grayPixels = 0;
    let whitePixels = 0;
    let totalPixels = 0;
    let varianceSum = 0;
    let graySum = 0;
    const grayValues = [];

    // Amostrar pixels da célula
    for (let y = Math.floor(startY); y < Math.floor(startY + height); y++) {
      for (let x = Math.floor(startX); x < Math.floor(startX + width); x++) {
        if (x < 0 || x >= imgWidth || y < 0 || y >= imgHeight) continue;

        const idx = (y * imgWidth + x) * 4;
        const r = pixels[idx];
        const g = pixels[idx + 1];
        const b = pixels[idx + 2];
        const a = pixels[idx + 3];

        if (a < 128) continue;

        const gray = (r + g + b) / 3;
        grayValues.push(gray);
        graySum += gray;
        totalPixels++;

        if (gray > 200) whitePixels++;
        if (gray > 120 && gray < 200) grayPixels++;
      }
    }

    if (totalPixels === 0) {
      return { confidence: 0, grayRatio: 0, variance: 0 };
    }

    // Calcular variância
    const mean = graySum / totalPixels;
    grayValues.forEach(val => {
      varianceSum += Math.pow(val - mean, 2);
    });
    const variance = Math.sqrt(varianceSum / totalPixels);

    // Score: precisa de cinza + variância (CRÍTERIOS MAIS BAIXOS)
    const grayRatio = (grayPixels + whitePixels) / totalPixels;
    // Aceitar qualquer variância (fumaça pode ter texturas variadas)
    const varianceScore = variance > 5 ? 0.8 : 0.4; // Qualquer variância > 5 é bom
    
    const confidence = grayRatio * 0.7 + varianceScore * 0.3;

    return {
      confidence: Math.min(1, confidence),
      grayRatio,
      variance
    };
  }

  /**
   * Agrupa células adjacentes em regiões maiores (clustering)
   */
  static clusterRegions(grid, gridSize) {
    if (grid.length === 0) return [];

    const visited = new Set();
    const clusters = [];

    for (const cell of grid) {
      if (visited.has(`${cell.x},${cell.y}`)) continue;

      // BFS para encontrar célula adjacentes
      const cluster = [];
      const queue = [cell];
      visited.add(`${cell.x},${cell.y}`);

      while (queue.length > 0) {
        const current = queue.shift();
        cluster.push(current);

        // Procurar vizinhos (4 adjacências)
        const neighbors = [
          { x: current.x - 1, y: current.y },
          { x: current.x + 1, y: current.y },
          { x: current.x, y: current.y - 1 },
          { x: current.x, y: current.y + 1 }
        ];

        for (const neighbor of neighbors) {
          const key = `${neighbor.x},${neighbor.y}`;
          if (visited.has(key)) continue;
          if (neighbor.x < 0 || neighbor.x >= gridSize || neighbor.y < 0 || neighbor.y >= gridSize) continue;

          // Encontrar célula no grid
          const found = grid.find(c => c.x === neighbor.x && c.y === neighbor.y);
          if (found && found.confidence > 0.05) { // THRESHOLD MUITO BAIXO (0.05)
            visited.add(key);
            queue.push(found);
          }
        }
      }

      // Converter cluster em região
      if (cluster.length > 0) {
        const avgConfidence = cluster.reduce((sum, c) => sum + c.confidence, 0) / cluster.length;
        const minX = Math.min(...cluster.map(c => c.centerX));
        const maxX = Math.max(...cluster.map(c => c.centerX));
        const minY = Math.min(...cluster.map(c => c.centerY));
        const maxY = Math.max(...cluster.map(c => c.centerY));

        clusters.push({
          x: (minX + maxX) / 2,
          y: (minY + maxY) / 2,
          size: cluster.length, // Número de células
          width: maxX - minX,
          height: maxY - minY,
          confidence: avgConfidence,
          cells: cluster.length
        });
      }
    }

    // Ordenar por confiança
    return clusters.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Calcular mira seguindo o alvo
   * @param {Object} targetRegion - Região de fumaça detectada
   * @param {number} width - Largura da tela
   * @param {number} height - Altura da tela
   * @returns {Object} { x, y, size, zoom, visible }
   */
  static calculateReticle(targetRegion, width, height) {
    if (!targetRegion) {
      // Sem alvo: mira no centro com tamanho padrão
      return {
        x: width / 2,
        y: height / 2,
        size: 80,
        zoom: 1,
        visible: true,
        tracking: false
      };
    }

    // Converter coordenadas de grid para pixels
    // Assumindo que targetRegion.x e .y são em pixels já
    const x = targetRegion.x;
    const y = targetRegion.y;

    // Tamanho da mira baseado na confiança
    const baseSize = 60;
    const minSize = 40;
    const maxSize = 120;
    
    // Quanto maior a confiança, menor a mira (mais focada)
    const size = maxSize - (targetRegion.confidence * (maxSize - minSize));

    // Zoom automático baseado na confiança
    // Quanto mais confiante, mais zoom (até 2x)
    const zoom = 1 + targetRegion.confidence;

    return {
      x,
      y,
      size: Math.max(minSize, size),
      zoom,
      visible: true,
      tracking: true,
      confidence: targetRegion.confidence,
      targetSize: targetRegion.size
    };
  }

  /**
   * Suavizar movimento da mira (evitar tremor)
   * @param {Object} currentReticle - Posição atual
   * @param {Object} newReticle - Posição nova
   * @param {number} alpha - Fator de suavização (0-1)
   * @returns {Object} Mira suavizada
   */
  static smoothReticle(currentReticle, newReticle, alpha = 0.2) {
    if (!currentReticle) return newReticle;

    return {
      x: currentReticle.x + (newReticle.x - currentReticle.x) * alpha,
      y: currentReticle.y + (newReticle.y - currentReticle.y) * alpha,
      size: currentReticle.size + (newReticle.size - currentReticle.size) * alpha,
      zoom: currentReticle.zoom + (newReticle.zoom - currentReticle.zoom) * alpha,
      visible: newReticle.visible,
      tracking: newReticle.tracking,
      confidence: newReticle.confidence,
      targetSize: newReticle.targetSize
    };
  }

  /**
   * Prever próxima posição do alvo (kalman-like)
   */
  static predictTarget(previousPosition, currentPosition, velocity = null) {
    if (!previousPosition) return currentPosition;

    // Calcular velocidade
    const dx = currentPosition.x - previousPosition.x;
    const dy = currentPosition.y - previousPosition.y;

    // Prever próxima posição com pequeno extrapolation
    const predictedX = currentPosition.x + dx * 0.3;
    const predictedY = currentPosition.y + dy * 0.3;

    return {
      ...currentPosition,
      x: predictedX,
      y: predictedY
    };
  }
}

export default SmokeTracker;
