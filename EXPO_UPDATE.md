# 📱 Como Atualizar Expo Go no Celular

## 🔄 3 Formas de Atualizar

### **1️⃣ Via App Store (iOS)**
1. Abra **App Store**
2. Vá em **Sua Conta** (canto inferior direito)
3. Procure por **Expo Go**
4. Se houver atualização, clique em **Atualizar**

### **2️⃣ Via Google Play (Android)**
1. Abra **Google Play Store**
2. Procure por **Expo Go**
3. Se houver atualização, clique em **Atualizar**
4. Espere a instalação terminar

### **3️⃣ Atualização Automática (Recomendado)**
**iOS:**
- Vá em **Configurações** > **App Store**
- Ative **Atualizações automáticas**

**Android:**
- Abra **Google Play Store**
- Menu (≡) > **Configurações** > **Rede**
- Marque **Atualizar apps automaticamente** > **Qualquer rede**

---

## 🚀 Após Atualizar: Conectar ao Seu App

### **Opção A: Via QR Code (Mais Fácil)**
```
1. Abra Expo Go no celular
2. Toque em "Scan QR code"
3. Aponte para a tela do seu PC (arquivo qr_conexao.html)
4. Pronto! App carrega automaticamente
```

**Arquivo QR:** `qr_conexao.html`

### **Opção B: Via URL Manual**
```
1. Abra Expo Go
2. Toque em "Enter URL manually"
3. Cole: exp://192.168.X.X:19000
   (substitua 192.168.X.X pelo IP do seu PC)
4. Pronto!
```

### **Opção C: Via Histórico Recente**
Se já conectou antes:
```
1. Abra Expo Go
2. Procure por "SmokeDistance" no histórico
3. Toque para reconectar
```

---

## 🔍 Verificar Versão Instalada

**iOS:**
- App Store > Sua Conta > Expo Go > Versão
- Ou: Configurações > Geral > Sobre este iPhone > Procurar "Expo"

**Android:**
- Google Play Store > Expo Go > Versão
- Ou: Configurações > Aplicativos > Expo Go > Sobre

---

## ⚠️ Se Não Conectar

### Checklist:
- ✅ PC e celular na **mesma WiFi**
- ✅ Expo Go **atualizado** (última versão)
- ✅ Firewall do PC permite porta **19000** e **19001**
- ✅ npm install **completado** com sucesso
- ✅ `npx expo start` rodando sem erros

### Solução Rápida:
```powershell
# No PC (PowerShell)
cd "c:\Users\Rafa\Desktop\SmokeDistance"

# Parar Expo (se rodando)
# Ctrl+C no terminal

# Limpar cache e reiniciar
npx expo start -c
```

---

## 📊 Versão Recomendada

**Expo Go:** Versão mais recente do app store/play store
**Node.js:** 16+ (verificar: `node --version`)
**npm:** 8+ (verificar: `npm --version`)

Você pode atualizar com:
```powershell
npm install -g npm@latest  # Atualizar npm
```

---

## 🎯 Resumo Rápido

| Ação | iOS | Android |
|------|-----|---------|
| Atualizar | App Store | Play Store |
| Verificar versão | Configurações > Geral > Sobre | Configurações > Aplicativos |
| Conectar via QR | Scan QR code | Scan QR code |
| URL manual | Enter URL | Enter URL |

