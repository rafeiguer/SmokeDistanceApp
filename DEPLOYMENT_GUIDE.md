# 📱 Guia de Publicação - SmokeDistance

## 1️⃣ Pré-Requisitos

### Contas e Ferramentas Necessárias

- **Expo CLI**: `npm install -g expo-cli` ✅ (instalado)
- **EAS CLI**: `npm install -g eas-cli`
- **Apple Developer Account**: US$ 99/ano (https://developer.apple.com)
- **Google Play Developer Account**: US$ 25 (única vez)
- **Xcode**: Para builds iOS (Mac necessário)
- **Android Studio**: Para testes locais (opcional)

---

## 2️⃣ Preparação do App

### A. Versioning (IMPORTANTE!)

```bash
# Atualizar versão no package.json
# Atualizar versão no app.json
# Seguir: MAJOR.MINOR.PATCH (ex: 1.0.0 → 1.0.1 ou 1.1.0)
```

**Regras de versioning:**
- `patch` (1.0.0 → 1.0.1): Bug fixes
- `minor` (1.0.0 → 1.1.0): Novas features
- `major` (1.0.0 → 2.0.0): Breaking changes

### B. Ícones e Splash Screens

**Ícones necessários:**
- `icon.png`: 1024x1024 (quadrado, sem transparência nas bordas)
- `adaptive-icon.png`: 1024x1024 (Android)
- `splash-icon.png`: 3840x2160 (tela de abertura)
- `favicon.png`: 192x192 (web)

**Locais:** Todos em `./assets/`

### C. Descrição e Metadados

Atualizar no `app.json`:
```json
{
  "description": "Aplicativo profissional para detecção de fumaça com IA em tempo real",
  "keywords": ["smoke", "detection", "ai", "fire", "wildfire"]
}
```

### D. Permissões (Já Configuradas ✅)

- ✅ Câmera
- ✅ Localização (GPS)
- ✅ Sensores
- ✅ Internet

---

## 3️⃣ Configuração EAS (Expo Application Services)

### A. Login na Expo

```bash
expo login
# ou
eas login
```

Usar credenciais da conta Expo criada.

### B. Atualizar eas.json

```json
{
  "cli": {
    "version": ">= 16.20.1",
    "appVersionSource": "remote"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal"
    },
    "production": {
      "autoIncrement": true,
      "channel": "production"
    }
  },
  "submit": {
    "production": {
      "ios": {
        "ascAppId": "SEUS_NÚMEROS_AQUI"
      },
      "android": {
        "track": "internal"
      }
    }
  }
}
```

---

## 4️⃣ BUILD Android (Google Play Store)

### Passo 1: Preparar Credenciais

```bash
# Gerar keystore (primeira vez apenas)
eas build --platform android --type app-signing

# Isso vai criar/configurar o keystore automaticamente
```

### Passo 2: Fazer Build

```bash
# Build para produção
eas build --platform android --type app-signing

# Ou com changelog
eas build --platform android --type app-signing --message "v1.0.1: IA Melhorada"
```

**Tempo:** ~30 min

### Passo 3: Download do APK/AAB

Após build:
```bash
# Verificar status
eas build:list

# Download automático ou manual via Expo Dashboard
```

**Arquivo gerado:** `app-release.aab` (Android App Bundle)

---

## 5️⃣ BUILD iOS (Apple App Store)

### Passo 1: Criar Bundle ID e Certificados

**No Apple Developer Portal:**
1. Ir para Certificates, Identifiers & Profiles
2. Criar novo Bundle ID: `com.rafeiguer.smokedistance`
3. Criar App ID
4. Gerar certificates e provisioning profiles

### Passo 2: Configurar Credenciais

```bash
# EAS vai ajudar a configurar
eas build --platform ios

# Seguir prompts para:
# - Apple Team ID
# - Bundle ID
# - Provisioning profiles
```

### Passo 3: Fazer Build

```bash
# Build para App Store
eas build --platform ios --type app-store

# Ou build local (requer Mac)
expo run:ios
```

**Tempo:** ~45 min

---

## 6️⃣ PUBLICAÇÃO Google Play Store

### Passo 1: Criar Conta

1. Ir para https://play.google.com/console
2. Pagar US$ 25 (única vez)
3. Criar novo app
4. Preencher dados do app

### Passo 2: Preencher Informações Obrigatórias

**Na seção "Informações do App":**
- ✅ Nome: "SmokeDistance"
- ✅ Descrição curta (80 caracteres)
- ✅ Descrição completa
- ✅ Categorias: "Utility" ou "Lifestyle"
- ✅ Classificação de conteúdo
- ✅ Privacidade: Link para política

### Passo 3: Ícones e Screenshots

**Necessário:**
- Ícone do app: 512x512 (PNG)
- Screenshots: 2-8 imagens (1080x1920 ou 1440x2560)
- Imagem de destaque: 1024x500
- Vídeo de demonstração: 15-30s (opcional)

### Passo 4: Upload do AAB

1. Ir para "Releases" → "Production"
2. Criar novo release
3. Fazer upload: `app-release.aab`
4. Adicionar notas de versão
5. Revisar e publicar

**Tempo de revisão:** 1-3 horas

---

## 7️⃣ PUBLICAÇÃO Apple App Store

### Passo 1: Criar Conta

1. Ir para https://appstoreconnect.apple.com
2. Aceitar Developer Agreement
3. Criar novo app

### Passo 2: Preencher Informações

**App Information:**
- Nome: "SmokeDistance"
- Bundle ID: `com.rafeiguer.smokedistance`
- SKU: Código único (ex: SMOKEDIST001)
- Primária: Português (Brasil)

**Ratings:**
- Preencher questionário de classificação etária
- Aparência: "Sem classificação"
- Fogo/Fumaça: ✅ Contexto educacional

### Passo 3: Build & Version

1. Ir para "Builds"
2. Fazer upload usando Xcode ou Transporter
3. Preencher informações de teste:
   - Demo account (se necessário)
   - Notas de teste

### Passo 4: App Review

1. Preencher "App Review Information"
2. Notas para review: Descrever uso de câmera/GPS
3. Adicionar screenshot com demo de fumaça/fogo
4. Enviar para revisão

**Tempo de revisão:** 24-48 horas

---

## 8️⃣ CHECKLIST FINAL

### Antes de Submeter

- [ ] Versão incrementada em `package.json` e `app.json`
- [ ] Testar no Expo Go: `npx expo start`
- [ ] Testar localmente: `eas build` (preview)
- [ ] Icons/screenshots de alta qualidade prontos
- [ ] Descrição clara do app em português
- [ ] Notas de versão preenchidas
- [ ] Política de Privacidade (obrigatório Apple)
- [ ] Termos de Serviço (recomendado)
- [ ] Credenciais Expo/EAS configuradas

### Credenciais Seguras

```bash
# Backup seguro
eas credentials

# Verificar status
eas device:list
```

---

## 9️⃣ TROUBLESHOOTING

### "Build Failed"
```bash
# Limpar cache
expo prebuild --clean

# Reconstruir
eas build --platform android --type app-signing
```

### "Certificate Expired"
```bash
# iOS: Gerar novo certificate no Apple Developer Portal
# Android: EAS gerencia automaticamente
```

### "App Rejected"
- Leia feedback da reviewers com cuidado
- Corrija problemas descritos
- Resubmita nova versão

---

## 🔟 ATUALIZAÇÕES FUTURAS

### Hot Updates (sem rebuild)

```bash
# Atualizar código sem novo build
eas update --message "Bug fix da IA"

# Users receberão update ao abrir app
```

### Nova Versão com Build

```bash
# Incrementar versão
# Fazer commit no Git
# Executar build
eas build --platform android
```

---

## 📞 Suporte

**Documentação:**
- Expo Docs: https://docs.expo.dev
- EAS Build: https://docs.expo.dev/build/
- Apple App Store: https://developer.apple.com/app-store/review/guidelines/
- Google Play: https://play.google.com/console/about/gplay-developer-program-policies/

**Comunidade:**
- Expo Discord: https://discord.gg/expo
- Stack Overflow: [tag: expo]

---

## 📊 Estimativa de Custos (Anual)

| Serviço | Custo | Período |
|---------|-------|---------|
| Apple Developer | $99 | Anual |
| Google Play | $25 | Única vez |
| Expo Services (free) | $0 | Sempre |
| **TOTAL** | **$99** | **Anual** |

---

**Criado em:** 28/11/2025  
**App:** SmokeDistance v1.0.0+  
**Última atualização:** Pronto para produção ✅

