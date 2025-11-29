# 🧠 SISTEMA DE TREINAMENTO DA IA

A IA agora aprende com seus feedbacks! Quanto mais você usar, melhor ela fica!

## Como Treinar a IA

### 1️⃣ Fazer Detecções
- Vá à Página 3 (Câmera)
- Clique em "🔥 DETECTAR IA"
- A IA analisa e mostra confiança

### 2️⃣ Dar Feedback
Depois que a IA detecta (ou não), você confirma:
- ✅ **"Sim, foi correto"** - A IA aprendeu
- ❌ **"Não, foi errado"** - A IA ajusta

### 3️⃣ Ver Progresso
- Abra o **Painel de Treinamento** (🧠 botão na tela)
- Veja:
  - 📊 **Precisão atual** (% de acertos)
  - ✅ **Padrões de sucesso** (tipos de imagem aprendidos)
  - 💡 **Sugestões** (ajustes recomendados)

## Dados Coletados

```javascript
{
  id: timestamp,
  timestamp: data/hora,
  detection: {
    confidence: 0.75,      // Confiança (0-1)
    imagePattern: "smoke", // Tipo detectado
    pixels: {...}          // Dados da imagem
  },
  userFeedback: true       // Se estava correto
}
```

## Estatísticas

- **Total de Registros**: Histórico de detecções
- **Acertos**: Quantas detecções foram corretas
- **Precisão**: Percentual de acertos (melhor = >80%)

## Padrões de Sucesso

A IA aprende quais **tipos de imagem** são mais fáceis de detectar:
- `smoke` - Fumaça com variação
- `fire` - Cores quentes (fogo)
- `wall` - Parede uniforme
- `sky` - Céu azul
- `green` - Vegetação

## Sugestões Automáticas

O sistema sugere ajustes no **limiar de confiança** baseado em:
- Confiança média dos acertos
- Confiança média dos erros
- Ponto de intersecção (limiar ótimo)

## Exportar Dados

Use o botão "📤 Exportar" para gerar relatório completo:
- Estatísticas gerais
- Padrões descobertos
- Histórico completo de detecções

## Limpar Dados

Use "🗑️ Limpar" para começar do zero (cuidado, é irreversível!)

## Ciclo de Melhoria

```
1. Detectar → 2. Feedback → 3. IA Aprende → 4. Precisão Melhora
   ↑                                               ↓
   └───────────────────────────────────────────────┘
```

## Dicas de Treinamento

✅ **Faça muitas detecções** - Mais dados = melhor aprendizado
✅ **Seja honesto** - Marque feedback correto sempre
✅ **Teste cenários diferentes** - Céu, parede, fumaça, etc
✅ **Revise as sugestões** - Considere ajustar limiares

❌ **Não** marque feedback aleatório
❌ **Não** confie em uma única detecção
❌ **Não** ignore as sugestões automáticas

## Status Atual

- **Modelo**: Análise de pixels (OpenCV-like)
- **Limiares**: 60% de confiança para detectar
- **Padrões**: 5 tipos de imagem
- **Precisão**: Melhora conforme você treina

---

**Comece a treinar agora! Quanto mais você usa, mais inteligente a IA fica! 🚀**
