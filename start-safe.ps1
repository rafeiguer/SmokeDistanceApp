# Script para rodar SmokeDistance com segurança
# Fecha VS Code, restaura App.js, inicia Expo

Write-Host "Protegendo App.js..."
Get-Process code -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep 2

Set-Location "c:\Users\Rafa\Desktop\SmokeDistance"

Write-Host "Restaurando App.js do git..."
git checkout App.js

Write-Host "Verificando sintaxe..."
node -c App.js

Write-Host "Iniciando Expo..."
npx expo start --go
