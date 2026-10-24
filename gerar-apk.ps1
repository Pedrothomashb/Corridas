# Gera o APK Android do CorridasApp no EAS Build (nuvem da Expo).
# Uso:  .\gerar-apk.ps1            (pede o token)
#       .\gerar-apk.ps1 -Token xxx
param([string]$Token = $env:EXPO_TOKEN)

Set-Location $PSScriptRoot

if (-not $Token) {
    $Token = Read-Host 'Token do Expo (https://expo.dev/settings/access-tokens)'
}
$env:EXPO_TOKEN = $Token.Trim()

function Run($cmd) {
    Write-Host "> $cmd" -ForegroundColor Cyan
    Invoke-Expression $cmd
    if ($LASTEXITCODE -ne 0) { throw "Falhou: $cmd" }
}

if (-not (Test-Path node_modules)) { Run 'npm install' }

Run 'npx --yes eas-cli@latest whoami'

if (-not (Select-String -Path app.json -Pattern '"projectId"' -Quiet)) {
    Run 'npx --yes eas-cli@latest init --force --non-interactive'
}

Run 'npx --yes eas-cli@latest build --platform android --profile preview'
