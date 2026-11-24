# CorridasApp - gera o APK Android no proprio PC.
# Nao usa Expo Go, conta Expo nem EAS: compila localmente com Gradle + Android SDK.
#
# Primeira execucao: instala JDK 17 + Android SDK (~4 GB) e leva de 20 a 40 min.
# Proximas execucoes: poucos minutos.
#
# Uso: duplo clique em GERAR-APK.bat   (ou)   powershell -ExecutionPolicy Bypass -File .\gerar-apk.ps1
param(
    [string]$Abis = 'arm64-v8a,armeabi-v7a'
)

$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'

$Src     = $PSScriptRoot
$Version = 'v' + ((Get-Content (Join-Path $Src 'package.json') -Raw | ConvertFrom-Json).version)
$Build   = 'C:\cbuild\corridas'                  # caminho curto (limite de 260 caracteres do Windows)
$Sdk     = Join-Path $env:LOCALAPPDATA 'Android\Sdk'
$ApkOut  = Join-Path $Src "Corridas-$Version.apk"

$SdkPackages = @(
    'platform-tools',
    'platforms;android-36',
    'build-tools;36.0.0',
    'ndk;27.1.12297006',
    'cmake;3.22.1'
)

function Step([string]$msg) { Write-Host "`n==> $msg" -ForegroundColor Cyan }

function Exec([string]$File, [string[]]$Arguments) {
    & $File @Arguments
    if ($LASTEXITCODE -ne 0) { throw "Falhou ($LASTEXITCODE): $File $($Arguments -join ' ')" }
}

function Find-Jdk17 {
    $roots = @(
        (Join-Path $env:ProgramFiles 'Microsoft'),
        (Join-Path $env:ProgramFiles 'Eclipse Adoptium'),
        (Join-Path $env:ProgramFiles 'Java')
    )
    foreach ($r in $roots) {
        if (-not (Test-Path $r)) { continue }
        $d = Get-ChildItem $r -Directory -Filter 'jdk-17*' -ErrorAction SilentlyContinue |
            Sort-Object Name -Descending | Select-Object -First 1
        if ($d -and (Test-Path (Join-Path $d.FullName 'bin\java.exe'))) { return $d.FullName }
    }
    return $null
}

try {
    # ---------------------------------------------------------------- Node
    Step 'Node.js'
    if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
        throw 'Node.js nao encontrado. Instale com: winget install OpenJS.NodeJS.LTS'
    }
    node -v

    # ---------------------------------------------------------------- JDK 17
    Step 'Java (JDK 17)'
    $jdk = Find-Jdk17
    if (-not $jdk) {
        Exec 'winget' @('install', '--id', 'Microsoft.OpenJDK.17', '-e', '--silent',
            '--accept-source-agreements', '--accept-package-agreements')
        $jdk = Find-Jdk17
    }
    if (-not $jdk) { throw 'JDK 17 nao encontrado apos a instalacao.' }
    $env:JAVA_HOME = $jdk
    $env:Path = "$jdk\bin;$env:Path"
    Write-Host "JAVA_HOME = $jdk"

    # ---------------------------------------------------------------- Android SDK
    Step "Android SDK em $Sdk"
    $sdkm = Join-Path $Sdk 'cmdline-tools\latest\bin\sdkmanager.bat'
    if (-not (Test-Path $sdkm)) {
        $zipName = 'commandlinetools-win-11076708_latest.zip'
        try {
            $xml = (Invoke-WebRequest -UseBasicParsing 'https://dl.google.com/android/repository/repository2-3.xml').Content
            $latest = [regex]::Matches($xml, 'commandlinetools-win-(\d+)_latest\.zip') |
                Sort-Object { [long]$_.Groups[1].Value } -Descending | Select-Object -First 1
            if ($latest) { $zipName = $latest.Value }
        } catch { }

        Write-Host "Baixando $zipName ..."
        $zip = Join-Path $env:TEMP $zipName
        Invoke-WebRequest -UseBasicParsing "https://dl.google.com/android/repository/$zipName" -OutFile $zip

        $tmp = Join-Path $env:TEMP 'corridas-cmdline-tools'
        if (Test-Path $tmp) { Remove-Item $tmp -Recurse -Force }
        Expand-Archive $zip -DestinationPath $tmp -Force

        $dest = Join-Path $Sdk 'cmdline-tools\latest'
        if (Test-Path $dest) { Remove-Item $dest -Recurse -Force }
        New-Item -ItemType Directory -Force -Path (Split-Path $dest -Parent) | Out-Null
        Move-Item (Join-Path $tmp 'cmdline-tools') $dest
        Remove-Item $zip -Force
        Remove-Item $tmp -Recurse -Force -ErrorAction SilentlyContinue
    }
    $env:ANDROID_HOME = $Sdk
    $env:ANDROID_SDK_ROOT = $Sdk
    $env:Path = "$Sdk\platform-tools;$env:Path"

    $yes = 1..60 | ForEach-Object { 'y' }
    $yes | & $sdkm "--sdk_root=$Sdk" --licenses | Out-Null
    Write-Host 'Instalando pacotes do SDK (pode demorar na primeira vez)...'
    $yes | & $sdkm "--sdk_root=$Sdk" @SdkPackages
    if ($LASTEXITCODE -ne 0) { throw 'Falha ao instalar pacotes do Android SDK.' }

    # ---------------------------------------------------------------- Projeto
    Step "Copiando o projeto para $Build"
    New-Item -ItemType Directory -Force -Path $Build | Out-Null
    & robocopy $Src $Build /MIR /NFL /NDL /NJH /NJS /NP /XD node_modules android .expo dist /XF *.apk | Out-Null
    if ($LASTEXITCODE -ge 8) { throw "robocopy falhou ($LASTEXITCODE)" }
    $global:LASTEXITCODE = 0
    Set-Location $Build

    Step 'Instalando dependencias (npm install)'
    Exec 'npm.cmd' @('install', '--no-audit', '--no-fund')

    Step 'Gerando o projeto Android nativo (expo prebuild)'
    $env:CI = '1'
    Exec 'npx.cmd' @('expo', 'prebuild', '--platform', 'android', '--clean', '--no-install')
    Remove-Item Env:\CI -ErrorAction SilentlyContinue

    $sdkProp = $Sdk.Replace('\', '\\').Replace(':', '\:')
    Set-Content -Path (Join-Path $Build 'android\local.properties') -Value "sdk.dir=$sdkProp" -Encoding Ascii

    $ramGb = [math]::Round((Get-CimInstance Win32_ComputerSystem).TotalPhysicalMemory / 1GB)
    if ($ramGb -ge 8) {
        $gp = Join-Path $Build 'android\gradle.properties'
        (Get-Content $gp) -replace '-Xmx2048m', '-Xmx4096m' | Set-Content $gp -Encoding Ascii
    }

    # ---------------------------------------------------------------- Build
    Step 'Compilando o APK (Gradle) - a primeira vez baixa bastante coisa'
    Set-Location (Join-Path $Build 'android')
    Exec '.\gradlew.bat' @('assembleRelease', "-PreactNativeArchitectures=$Abis", '--console=plain')

    $apk = Join-Path $Build 'android\app\build\outputs\apk\release\app-release.apk'
    if (-not (Test-Path $apk)) { throw "APK nao encontrado em $apk" }
    Copy-Item $apk $ApkOut -Force

    $mb = [math]::Round((Get-Item $ApkOut).Length / 1MB, 1)
    Step "APK pronto ($mb MB): $ApkOut"
    Start-Process explorer.exe "/select,`"$ApkOut`""
}
catch {
    Write-Host "`nERRO: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
finally {
    Set-Location $Src
}
