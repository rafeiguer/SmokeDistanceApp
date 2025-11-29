# 🚀 SmokeDistance - Deploy Automation Script (Windows)
# Uso: .\deploy.ps1 -Platform "both" -VersionType "patch"

param(
    [ValidateSet("android", "ios", "both")]
    [string]$Platform = "both",
    
    [ValidateSet("major", "minor", "patch")]
    [string]$VersionType = "patch"
)

# Configuração
$ProjectDir = (Get-Location).Path
$PackageJsonPath = "$ProjectDir\package.json"
$AppJsonPath = "$ProjectDir\app.json"

# Funções
function Write-Header {
    param([string]$Text)
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Blue
    Write-Host $Text -ForegroundColor Blue
    Write-Host "========================================" -ForegroundColor Blue
    Write-Host ""
}

function Write-Success {
    param([string]$Text)
    Write-Host "✅ $Text" -ForegroundColor Green
}

function Write-Error2 {
    param([string]$Text)
    Write-Host "❌ $Text" -ForegroundColor Red
    exit 1
}

function Write-Warning2 {
    param([string]$Text)
    Write-Host "⚠️  $Text" -ForegroundColor Yellow
}

# 1. Verificar pré-requisitos
Write-Header "1️⃣  Verificando Pré-Requisitos"

$commands = @("node", "npm", "eas")
foreach ($cmd in $commands) {
    try {
        $null = Invoke-Expression "$cmd --version"
        Write-Success "$cmd instalado"
    } catch {
        Write-Error2 "$cmd não instalado ou não está no PATH"
    }
}

# 2. Verificar autenticação
Write-Header "2️⃣  Verificando Autenticação Expo"

$credPath = "$env:USERPROFILE\.expo\credentials.json"
if (-not (Test-Path $credPath)) {
    Write-Warning2 "Não autenticado no Expo. Executando login..."
    eas login
} else {
    Write-Success "Autenticado no Expo"
}

# 3. Obter versão atual
Write-Header "3️⃣  Atualizando Versão ($VersionType)"

$packageJson = Get-Content $PackageJsonPath | ConvertFrom-Json
$currentVersion = $packageJson.version
Write-Success "Versão atual: $currentVersion"

# Calcular nova versão
$versionParts = $currentVersion.Split('.')
[int]$major = $versionParts[0]
[int]$minor = $versionParts[1]
[int]$patch = $versionParts[2]

switch ($VersionType) {
    "major" { $major++; $minor = 0; $patch = 0 }
    "minor" { $minor++; $patch = 0 }
    "patch" { $patch++ }
}

$newVersion = "$major.$minor.$patch"
Write-Warning2 "Nova versão: $newVersion"

$confirm = Read-Host "Confirmar? (s/n)"
if ($confirm -ne "s") {
    Write-Error2 "Cancelado pelo usuário"
}

# 4. Atualizar versões
Write-Header "4️⃣  Atualizando Arquivos de Versão"

$packageJson.version = $newVersion
$packageJson | ConvertTo-Json -Depth 10 | Set-Content $PackageJsonPath
Write-Success "package.json atualizado"

$appJson = Get-Content $AppJsonPath | ConvertFrom-Json
$appJson.expo.version = $newVersion
$appJson.expo.ios.buildNumber = $newVersion
$appJson.expo.android.versionCode += 1
$appJson | ConvertTo-Json -Depth 10 | Set-Content $AppJsonPath
Write-Success "app.json atualizado"

# 5. Limpar cache
Write-Header "5️⃣  Limpando Cache"

Remove-Item -Recurse -Force "node_modules" -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force ".expo" -ErrorAction SilentlyContinue
Write-Success "Cache limpo"

# 6. Instalar dependências
Write-Header "6️⃣  Instalando Dependências"

npm install --legacy-peer-deps
if ($LASTEXITCODE -ne 0) {
    Write-Error2 "Falha ao instalar dependências"
}
Write-Success "Dependências instaladas"

# 7. Função para build Android
function Build-Android {
    Write-Header "7️⃣  Construindo para Android (Google Play)"
    
    eas build --platform android --type app-signing --message "v$newVersion"
    
    if ($LASTEXITCODE -ne 0) {
        Write-Error2 "Falha no build Android"
    }
    Write-Success "Build Android iniciado! Verifique no Expo Dashboard"
}

# 8. Função para build iOS
function Build-iOS {
    Write-Header "8️⃣  Construindo para iOS (Apple App Store)"
    
    eas build --platform ios --type app-store --message "v$newVersion"
    
    if ($LASTEXITCODE -ne 0) {
        Write-Error2 "Falha no build iOS"
    }
    Write-Success "Build iOS iniciado! Verifique no Expo Dashboard"
}

# 9. Executar builds
switch ($Platform) {
    "android" { Build-Android }
    "ios" { Build-iOS }
    "both" {
        Build-Android
        Build-iOS
    }
}

# 10. Finalizar
Write-Header "✅ Deploy Iniciado com Sucesso!"

Write-Host "Próximos passos:" -ForegroundColor Green
Write-Host "1. Verifique o status dos builds no Expo Dashboard"
Write-Host "2. Baixe os builds quando prontos"
Write-Host "3. Upload nos stores (Google Play e/ou Apple App Store)"
Write-Host ""

Write-Host "Links úteis:" -ForegroundColor Blue
Write-Host "📊 Expo Dashboard: https://expo.dev"
Write-Host "🤖 Google Play Console: https://play.google.com/console"
Write-Host "🍎 App Store Connect: https://appstoreconnect.apple.com"
Write-Host ""

Write-Warning2 "Dica: Use 'eas build:list' para ver histórico de builds"

# 11. Fazer commit Git
Write-Header "11️⃣  Salvando Alterações no Git"

$gitCommit = Read-Host "Fazer commit das alterações? (s/n)"
if ($gitCommit -eq "s") {
    git add package.json app.json
    git commit -m "chore: bump version to $newVersion"
    git tag "v$newVersion"
    Write-Success "Versão $newVersion commitada e tagueada"
    Write-Warning2 "Execute 'git push' e 'git push --tags' para sincronizar"
}

Write-Success "Deploy script concluído!"
