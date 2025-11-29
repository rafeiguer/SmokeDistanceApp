# 🎯 SISTEMA DE MIRA INTELIGENTE - Rastreamento de Fumaça

## 📋 Visão Geral

O novo sistema de mira inteligente detecta e rastreia fumaça em tempo real, funcionando como um **"face tracking" para fumaça**. A mira segue o alvo automaticamente, adapta o zoom e a confiança.

## 🔧 Como Funciona

### 1️⃣ Detecção de Regiões (Grid Analysis)
```
┌─────────────────────────────────┐
│ Imagem 320x240                  │
│  ┌──┬──┬──┬──┬──┬──┬──┬──┐     │
│  ├──┼──┼──┼──┼──┼──┼──┼──┤     │
│  ├──┼─ 🔥 ──┼──┼──┼──┼──┤  8x8 Grid
│  ├──┼──┼──┼──┼──┼──┼──┼──┤     │
│  └──┴──┴──┴──┴──┴──┴──┴──┘     │
└─────────────────────────────────┘
```

- Divide a imagem em **8x8 = 64 células**
- Analisa cada célula para características de fumaça
- Threshold: >30% confiança por célula

**Características analisadas por célula:**
- Proporção de pixels cinza/branco
- Variância (textura)
- Ausência de cores fortes

### 2️⃣ Clustering (Agrupamento)
```
🔍 Células detectadas são agrupadas em regiões maiores:
   
   Single Cell  →  5 células  →  Cluster
   conf: 0.4       adjacentes      size: 5
                                  conf: 0.65
```

- **BFS (Busca em Largura)** agrupa células adjacentes
- Calcula confiança média do cluster
- Encontra "região dominante" (maior + mais confiante)

### 3️⃣ Cálculo da Mira
```
Posição: Centro do cluster
Tamanho: Inversamente proporcional à confiança
         - Alta confiança (90%) = Mira pequena (40px)
         - Baixa confiança (40%) = Mira grande (100px)

Zoom:    Proporcional à confiança
         - 0% confiança = 1x zoom
         - 100% confiança = 2x zoom
```

### 4️⃣ Suavização (Smoothing)
```
Evita tremor/jitter da mira:
  
  Posição atual:  160, 120
  Posição nova:   165, 118
  Alpha:          0.15 (15% para nova, 85% para antiga)
  
  Resultado: 160.75, 119.7 (movimento suave)
```

- **Alpha = 0.15** (ajustável)
- Funciona com: posição X/Y, tamanho, zoom

## 📊 Arquitetura

### `SmokeTracker.js` - Core do rastreamento
```javascript
detectSmokeRegions()      // Analisa grid e encontra clusters
↓
clusterRegions()          // Agrupa células adjacentes
↓
calculateReticle()        // Posição/tamanho/zoom da mira
↓
smoothReticle()           // Suaviza movimento
↓
predictTarget()           // [Futuro] Previsão de movimento
```

### `SmokeDetectionAI.js` - Integração com UI
```javascript
toggleDetection()         // Captura frame
↓
analyzeFrameForSmoke()    // IA real detecta fumaça
↓
updateReticleTracking()   // Atualiza mira
↓
Renderiza mira visual     // Mira verde na tela
```

## 🎨 Visual da Mira

```
       ┌─────────────────────┐
       │                     │
       │      🎥 Câmera      │
       │                     │
       │       ╱────╲        │
       │      │  🔥  │◄─ Círculo rastreando
       │       ╲────╱        │
       │        │ │          │ ◄─ Cruz de precisão
       │        │ │          │
       │       80-100px       │
       │  Verde se rastreando│
       │  Amarelo se parado  │
       │                     │
       │  75% - Confiança    │
       └─────────────────────┘
    🔥 DETECTAR IA | ⏸️ Pronto | 75%
```

### Estados da Mira:
- **🟢 Verde + Brilhante**: Rastreando fumaça (tracking=true)
- **🟡 Amarelo**: Parado no centro (tracking=false)
- **Tamanho**: Pequeno = alta confiança, Grande = baixa confiança
- **Zoom**: Aproxima na fumaça detectada

## 🔨 Ajustes Finos

### Sensibilidade de célula
```javascript
// Em SmokeTracker.detectSmokeRegions()
if (cellScore.confidence > 0.3) // ← Aumentar para menos células
```

### Velocidade de suavização
```javascript
// Em SmokeDetectionAI.updateReticleTracking()
SmokeTracker.smoothReticle(..., 0.15) // ← 0.05 = mais lento, 0.3 = mais rápido
```

### Tamanho máximo/mínimo
```javascript
// Em SmokeTracker.calculateReticle()
const minSize = 40;   // ← Mira nunca menor que isso
const maxSize = 120;  // ← Mira nunca maior que isso
```

### Zoom máximo
```javascript
const zoom = 1 + targetRegion.confidence; // ← Muda o multiplicador
```

## 📈 Performance

- **Grid 8x8**: 64 análises por frame (muito rápido)
- **Clustering**: BFS eficiente (< 5ms típico)
- **Suavização**: Cálculo O(1)
- **Total**: ~20-50ms por frame

## 🎯 Casos de Uso

### 1. Fumaça Densa Próxima
```
Região grande (10+ células)
Confiança: 85%+
Mira: Pequena (40px) + Verde brilhante
Zoom: 1.85x
```

### 2. Fumaça Fina Distante
```
Região pequena (2-3 células)
Confiança: 40-50%
Mira: Grande (100px) + Verde
Zoom: 1.4x-1.5x
```

### 3. Sem Fumaça
```
Região: Null
Confiança: 0%
Mira: Centro (160, 120) + Amarelo
Zoom: 1x
```

## 🚀 Próximas Melhorias

- [ ] Previsão de movimento (Kalman filter)
- [ ] Multi-alvo (rastrear vários focos)
- [ ] Histórico de posições (trail visual)
- [ ] Detecção de velocidade do alvo
- [ ] Adaptação dinâmica de sensibilidade

## 🐛 Troubleshooting

### Mira tremendo muito
→ Aumentar `alpha` em `smoothReticle()` (ex: 0.25)

### Mira não segue o alvo
→ Diminuir threshold de célula: `cellScore.confidence > 0.2`

### Falsos positivos (mira segue não-fumaça)
→ Aumentar confiança global em `SmokeDetectorReal.js`

### Mira muito grande/pequena
→ Ajustar `minSize` e `maxSize` em `calculateReticle()`
