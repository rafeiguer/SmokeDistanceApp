#!/bin/bash

# 🚀 SmokeDistance - Deploy Automation Script
# Uso: ./deploy.sh [android|ios|both] [major|minor|patch]

set -e

PLATFORMS=${1:-"both"}
VERSION_TYPE=${2:-"patch"}
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Funções
print_header() {
  echo -e "\n${BLUE}========================================${NC}"
  echo -e "${BLUE}$1${NC}"
  echo -e "${BLUE}========================================${NC}\n"
}

print_success() {
  echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
  echo -e "${RED}❌ $1${NC}"
  exit 1
}

print_warning() {
  echo -e "${YELLOW}⚠️  $1${NC}"
}

# 1. Verificar pré-requisitos
print_header "1️⃣  Verificando Pré-Requisitos"

command -v node > /dev/null || print_error "Node.js não instalado"
print_success "Node.js instalado"

command -v npm > /dev/null || print_error "npm não instalado"
print_success "npm instalado"

command -v eas > /dev/null || print_error "EAS CLI não instalado. Execute: npm install -g eas-cli"
print_success "EAS CLI instalado"

# 2. Verificar login Expo
print_header "2️⃣  Verificando Autenticação Expo"

if [ ! -f "$HOME/.expo/credentials.json" ]; then
  print_warning "Não autenticado no Expo. Executando login..."
  eas login
else
  print_success "Autenticado no Expo"
fi

# 3. Atualizar Versão
print_header "3️⃣  Atualizando Versão ($VERSION_TYPE)"

CURRENT_VERSION=$(jq -r '.version' "$PROJECT_DIR/package.json")
print_success "Versão atual: $CURRENT_VERSION"

case $VERSION_TYPE in
  major)
    NEW_VERSION=$(echo $CURRENT_VERSION | awk -F. '{print ($1+1) ".0.0"}')
    ;;
  minor)
    NEW_VERSION=$(echo $CURRENT_VERSION | awk -F. '{print $1 "." ($2+1) ".0"}')
    ;;
  patch)
    NEW_VERSION=$(echo $CURRENT_VERSION | awk -F. '{print $1 "." $2 "." ($3+1)}')
    ;;
  *)
    print_error "Tipo de versão inválido: $VERSION_TYPE"
    ;;
esac

print_warning "Nova versão: $NEW_VERSION"
read -p "Confirmar? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  print_error "Cancelado pelo usuário"
fi

# Atualizar package.json
jq ".version = \"$NEW_VERSION\"" "$PROJECT_DIR/package.json" > "$PROJECT_DIR/package.json.tmp"
mv "$PROJECT_DIR/package.json.tmp" "$PROJECT_DIR/package.json"
print_success "package.json atualizado"

# Atualizar app.json
jq ".expo.version = \"$NEW_VERSION\" | .expo.ios.buildNumber = \"$NEW_VERSION\" | .expo.android.versionCode += 1" "$PROJECT_DIR/app.json" > "$PROJECT_DIR/app.json.tmp"
mv "$PROJECT_DIR/app.json.tmp" "$PROJECT_DIR/app.json"
print_success "app.json atualizado"

# 4. Limpar dependências
print_header "4️⃣  Limpando Dependências"

cd "$PROJECT_DIR"
rm -rf node_modules .expo
print_success "Cache limpo"

# 5. Instalar dependências
print_header "5️⃣  Instalando Dependências"

npm install --legacy-peer-deps || print_error "Falha ao instalar dependências"
print_success "Dependências instaladas"

# 6. Fazer Prebuild
print_header "6️⃣  Preparando Build (Prebuild)"

expo prebuild --clean || print_warning "Prebuild exigido apenas para builds locais"
print_success "Prebuild concluído"

# 7. Build Android
build_android() {
  print_header "7️⃣  Construindo para Android (Google Play)"
  
  eas build --platform android --type app-signing --message "v$NEW_VERSION" || print_error "Falha no build Android"
  print_success "Build Android concluído! Verifice no Expo Dashboard"
}

# 8. Build iOS
build_ios() {
  print_header "8️⃣  Construindo para iOS (Apple App Store)"
  
  eas build --platform ios --type app-store --message "v$NEW_VERSION" || print_error "Falha no build iOS"
  print_success "Build iOS concluído! Verifice no Expo Dashboard"
}

# 9. Executar builds
case $PLATFORMS in
  android)
    build_android
    ;;
  ios)
    build_ios
    ;;
  both)
    build_android
    build_ios
    ;;
  *)
    print_error "Plataforma inválida: $PLATFORMS. Use: android, ios, ou both"
    ;;
esac

# 10. Finalizar
print_header "✅ Deploy Iniciado com Sucesso!"

echo -e "${GREEN}Próximos passos:${NC}"
echo "1. Verifique o status dos builds no Expo Dashboard"
echo "2. Baixe os builds quando prontos"
echo "3. Upload nos stores (Google Play e/ou Apple App Store)"
echo ""
echo -e "${BLUE}Links úteis:${NC}"
echo "📊 Expo Dashboard: https://expo.dev"
echo "🤖 Google Play Console: https://play.google.com/console"
echo "🍎 App Store Connect: https://appstoreconnect.apple.com"
echo ""
echo -e "${YELLOW}Dica: Use 'eas build:list' para ver histórico de builds${NC}"

# 11. Fazer commit Git
print_header "11️⃣  Salvando Alterações no Git"

read -p "Fazer commit das alterações de versão? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
  git add package.json app.json
  git commit -m "chore: bump version to $NEW_VERSION"
  git tag "v$NEW_VERSION"
  print_success "Versão $NEW_VERSION commitada e tagueada"
  print_warning "Execute 'git push' e 'git push --tags' para sincronizar"
fi

print_success "Deploy script concluído!"
