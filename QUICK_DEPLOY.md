# 🚀 Publicação Rápida - SmokeDistance

## ⚡ TL;DR - Publicar em 10 Minutos

### 1️⃣ **Google Play Store (Android)**

```bash
# Windows PowerShell
.\deploy.ps1 -Platform android -VersionType patch

# Linux/Mac
./deploy.sh android patch
```

Resultado: `app-release.aab` pronto para upload no Google Play Console

### 2️⃣ **Apple App Store (iOS)**

```bash
# Windows PowerShell
.\deploy.ps1 -Platform ios -VersionType patch

# Linux/Mac
./deploy.sh ios patch
```

Resultado: App pronto para upload via App Store Connect

### 3️⃣ **Ambos**

```bash
# Windows PowerShell
.\deploy.ps1 -Platform both -VersionType patch

# Linux/Mac
./deploy.sh both patch
```

---

## 📋 Checklist Antes de Publicar

### Credenciais (Fazer Uma Vez)

- [ ] `eas login` - Autenticar com conta Expo
- [ ] Apple Team ID configurado
- [ ] Google Play Service Account criado

### Arquivo (Antes de Cada Publicação)

- [ ] Versão incrementada
- [ ] Screenshots prontas (1080x1920+)
- [ ] Ícones de alta qualidade
- [ ] Descrição em português
- [ ] Notas de versão preenchidas
- [ ] Testado em Expo Go: `npx expo start`

---

## 🔄 Versioning

```bash
# Bug fix (1.0.0 → 1.0.1)
./deploy.sh android patch

# Nova feature (1.0.0 → 1.1.0)
./deploy.sh android minor

# Mudança maior (1.0.0 → 2.0.0)
./deploy.sh android major
```

---

## 📊 Status dos Builds

```bash
# Ver lista de builds
eas build:list

# Ver build específico
eas build:view <BUILD_ID>

# Download do APK/AAB/IPA
eas build:download <BUILD_ID>
```

---

## 🎯 Google Play Store - Upload Manual

1. **Preparar:**
   ```bash
   .\deploy.ps1 -Platform android -VersionType patch
   ```

2. **Esperar build completar** (~30 min)

3. **Ir para** https://play.google.com/console

4. **Aplicativo > Releases > Production > Criar Release**

5. **Fazer upload** do `app-release.aab`

6. **Preencher:**
   - ✅ Notas de versão
   - ✅ Screenshots (1080x1920)
   - ✅ Descrição
   - ✅ Privacidade/Permissões

7. **Revisar e Publicar**

**Tempo total:** 1-3 horas (incluindo revisão Google)

---

## 🍎 Apple App Store - Upload Manual

1. **Preparar:**
   ```bash
   .\deploy.ps1 -Platform ios -VersionType patch
   ```

2. **Esperar build completar** (~45 min)

3. **Ir para** https://appstoreconnect.apple.com

4. **Aplicativo > Versions > iOS > Criar Versão**

5. **Build:**
   - Clicar em "Selecionar Build"
   - Escolher build gerado pelo EAS

6. **Preencher:**
   - ✅ Descrição em português
   - ✅ Notas de versão
   - ✅ Palavras-chave
   - ✅ Categoria
   - ✅ Screenshot (1170x2532)

7. **Enviar para Revisão**

**Tempo total:** 24-48 horas (incluindo revisão Apple)

---

## 🆘 Troubleshooting

### "Build Failed"
```bash
# Limpar tudo e recomeçar
rm -r node_modules .expo
npm install --legacy-peer-deps
expo prebuild --clean
eas build --platform android --type app-signing
```

### "Certificado Expirado (iOS)"
```bash
# Apple gerencia automaticamente via EAS
# Se precisar renovar:
# 1. Ir para https://developer.apple.com/account/resources/certificates/
# 2. Renovar certificado
# 3. Rodar deploy novamente
```

### "App Store Rejeitou"
- Ler feedback com atenção
- Corrigir problemas
- Incrementar versão: `deploy.ps1 -VersionType patch`
- Resubmeter

### "Permissões Necessárias (Android)"
```json
// Todas já estão em app.json:
[
  "android.permission.CAMERA",
  "android.permission.ACCESS_FINE_LOCATION",
  "android.permission.INTERNET",
  "android.permission.VIBRATE"
]
```

---

## 💡 Pro Tips

### 1. **Usar EAS Update para Hot Fixes**
```bash
# Sem rebuild, direto para usuários
eas update --message "Bug fix da IA"
```

### 2. **Testar Build Localmente (Preview)**
```bash
# Antes de publicar
eas build --platform android --type preview
# Isso gera um APK testável
```

### 3. **Configurar CI/CD**
```bash
# GitHub Actions (opcional, avançado)
# Automatizar deploy ao fazer push tag
git push --tags  # Dispara build automático
```

### 4. **Monitorar Crashes**
```bash
# Integrar com Sentry (opcional)
npm install @sentry/react-native
# Configurar no App.js
```

---

## 📞 Links de Suporte

| Plataforma | Link |
|-----------|------|
| Expo Docs | https://docs.expo.dev |
| EAS Build | https://docs.expo.dev/build/ |
| Google Play | https://developer.android.com/distribute |
| Apple App Store | https://developer.apple.com/app-store/ |
| Expo Discord | https://discord.gg/expo |

---

## ✅ Checklist Final

```
ANTES DE PUBLICAR
☐ Versão incrementada (major/minor/patch)
☐ Testado em Expo Go
☐ Screenshots prontos
☐ Descrição atualizada
☐ Termos de Serviço definidos
☐ Política de Privacidade definida

DURANTE PUBLICAÇÃO
☐ Build completado com sucesso
☐ AAB/IPA baixado
☐ Upload no console correto
☐ Informações preenchidas
☐ Imagens anexadas

APÓS PUBLICAÇÃO
☐ App em revisão
☐ Status monitorado
☐ Feedback da reviewers lido
☐ Usuários notificados (Twitter/Email)
```

---

## 🎉 Sucesso!

Seu app está pronto para o mundo! 🌍

**Próximos passos:**
1. Compartilhar link na App Store
2. Compartilhar link no Google Play
3. Divulgar em redes sociais
4. Monitorar reviews e ratings
5. Planejar próximas versões

**Obrigado por usar SmokeDistance!** 🔥📱

---

*Última atualização: 28/11/2025*  
*SmokeDistance v1.0.0+*

