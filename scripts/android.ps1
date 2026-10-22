param(
    [ValidateSet('Run', 'Doctor', 'Build', 'Emulator', 'Configure')]
    [string]$Mode = 'Run',
    [string]$AvdName = 'CardioRehab_API_36'
)
$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent $PSScriptRoot
$mobileRoot = Join-Path $repoRoot 'apps/mobile'
$androidRoot = Join-Path $mobileRoot 'android'
$logsRoot = Join-Path $repoRoot '.dev-logs'

function Find-AndroidSdk {
    foreach ($candidate in @($env:ANDROID_HOME, $env:ANDROID_SDK_ROOT, (Join-Path $env:LOCALAPPDATA 'Android/Sdk'))) {
        if ($candidate -and (Test-Path -LiteralPath (Join-Path $candidate 'platform-tools/adb.exe'))) { return $candidate }
    }
    throw 'Android SDK/ADB ausente. Instale os componentes de docs/android-windows.md e execute npm run android:configure.'
}
function Find-Java17 {
    $candidates = @($env:JAVA_HOME, [Environment]::GetEnvironmentVariable('JAVA_HOME', 'User'))
    foreach ($parent in @('C:/Program Files/Eclipse Adoptium', 'C:/Program Files/Java', (Join-Path $env:LOCALAPPDATA 'Programs/Eclipse Adoptium'), (Join-Path $env:LOCALAPPDATA 'Programs/Java'))) {
        if (Test-Path -LiteralPath $parent) {
            $candidates += @(Get-ChildItem -LiteralPath $parent -Directory | Where-Object Name -Match 'jdk-?17' | Select-Object -ExpandProperty FullName)
        }
    }
    foreach ($candidate in $candidates) {
        if (!$candidate -or !(Test-Path -LiteralPath (Join-Path $candidate 'release'))) { continue }
        if (Select-String -LiteralPath (Join-Path $candidate 'release') -Pattern '^JAVA_VERSION="17\.' -Quiet) { return $candidate }
    }
    throw 'JDK 17 ausente. Instale Eclipse Temurin 17 JDK e execute npm run android:configure.'
}
function Invoke-Checked([string]$Executable, [string[]]$Arguments) {
    & $Executable @Arguments
    if ($LASTEXITCODE -ne 0) { throw "Falha em $Executable (codigo $LASTEXITCODE)." }
}
function Test-EmulatorAcceleration([string]$Executable) {
    $accelerationOutput = @(& $Executable -accel-check)
    $accelerationExit = $LASTEXITCODE
    $accelerationOutput | ForEach-Object { Write-Host $_ }
    return ($accelerationExit -eq 0 -and ($accelerationOutput -join "`n") -match '(?m)^\s*0\s*$')
}
function Get-Endpoint([string]$Url) {
    try {
        $content = (Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 5).Content
        # Decode before returning: PowerShell enumerates byte[] through the
        # pipeline, otherwise Metro's binary Content becomes an object array.
        if ($content -is [byte[]]) { $content = [Text.Encoding]::UTF8.GetString($content) }
        return [string]$content
    }
    catch { return $null }
}
function Assert-Port([int]$Port, [string]$Url, [string]$Expected) {
    $listeners = @(Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue)
    if (!$listeners.Count) { return $false }
    $content = Get-Endpoint $Url
    if ($content -is [byte[]]) { $content = [Text.Encoding]::UTF8.GetString($content) }
    if (!$content -or $content -notmatch $Expected) {
        throw "Porta $Port ocupada por outro servico (PID $($listeners[0].OwningProcess)). Nenhum processo foi encerrado."
    }
    # Metro status alone does not identify the project. Verify the owning
    # command when available, and refuse a Metro started from another checkout.
    if ($Port -eq 8082) {
        $owner = Get-CimInstance Win32_Process -Filter "ProcessId=$($listeners[0].OwningProcess)" -ErrorAction SilentlyContinue
        if ($owner.CommandLine -and $owner.CommandLine.IndexOf($repoRoot, [StringComparison]::OrdinalIgnoreCase) -lt 0) {
            throw 'Porta 8082 possui Metro de outro caminho/projeto. Encerre-o manualmente ou use o Metro deste checkout.'
        }
    }
    Write-Host "Porta ${Port}: reutilizando servico existente."
    return $true
}
function Ensure-Server([string]$Name, [int]$Port, [string]$Url, [string]$Expected, [string[]]$Arguments, [string]$Directory) {
    if (Assert-Port $Port $Url $Expected) { return }
    New-Item -ItemType Directory -Path $logsRoot -Force | Out-Null
    $server = Start-Process -FilePath (Get-Command node.exe).Source -ArgumentList $Arguments -WorkingDirectory $Directory -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $logsRoot "$Name.out.log") -RedirectStandardError (Join-Path $logsRoot "$Name.err.log")
    $deadline = [DateTime]::UtcNow.AddSeconds(90)
    do {
        $content = Get-Endpoint $Url
        if ($content -is [byte[]]) { $content = [Text.Encoding]::UTF8.GetString($content) }
        if ($content -and $content -match $Expected) { Write-Host "$Name iniciado (PID $($server.Id), porta $Port)."; return }
        if ($server.HasExited) { throw "$Name encerrou. Consulte .dev-logs/$Name.err.log." }
        Start-Sleep -Seconds 1
    } while ([DateTime]::UtcNow -lt $deadline)
    throw "Timeout iniciando $Name. Consulte .dev-logs/$Name.err.log."
}

try {
    $sdkRoot = Find-AndroidSdk
    $javaRoot = Find-Java17
    $env:JAVA_HOME = $javaRoot
    $env:ANDROID_HOME = $sdkRoot
    $env:ANDROID_SDK_ROOT = $sdkRoot
    $toolPaths = @((Join-Path $javaRoot 'bin'), (Join-Path $sdkRoot 'platform-tools'), (Join-Path $sdkRoot 'emulator'), (Join-Path $sdkRoot 'cmdline-tools/latest/bin'))
    $env:Path = ($toolPaths -join ';') + ';' + $env:Path
    $adbPath = Join-Path $sdkRoot 'platform-tools/adb.exe'
    $emulatorPath = Join-Path $sdkRoot 'emulator/emulator.exe'
    Write-Host "JAVA_HOME=$javaRoot"
    Write-Host "ANDROID_HOME=$sdkRoot"
    foreach ($required in @('settings.gradle', 'build.gradle', 'app/build.gradle', 'gradlew.bat', 'gradle/wrapper/gradle-wrapper.jar')) {
        if (!(Test-Path -LiteralPath (Join-Path $androidRoot $required))) { throw "Projeto Android incompleto: $required" }
    }
    foreach ($required in @('platforms/android-36/android.jar', 'build-tools/36.0.0/aapt2.exe', 'ndk/27.1.12297006/source.properties', 'cmake/3.22.1/source.properties')) {
        if (!(Test-Path -LiteralPath (Join-Path $sdkRoot $required))) { throw "Componente SDK ausente: $required. Consulte docs/android-windows.md." }
    }
    $propertiesPath = Join-Path $androidRoot 'local.properties'
    $propertyLines = if (Test-Path -LiteralPath $propertiesPath) { @(Get-Content -LiteralPath $propertiesPath | Where-Object { $_ -notmatch '^sdk\.dir=' }) } else { @() }
    $propertyLines += 'sdk.dir=' + ($sdkRoot -replace '\\', '/')
    Set-Content -LiteralPath $propertiesPath -Value $propertyLines -Encoding ascii

    if ($Mode -eq 'Configure') {
        foreach ($entry in @{ JAVA_HOME=$javaRoot; ANDROID_HOME=$sdkRoot; ANDROID_SDK_ROOT=$sdkRoot }.GetEnumerator()) {
            [Environment]::SetEnvironmentVariable($entry.Key, $entry.Value, 'User')
        }
        $userPathParts = @([Environment]::GetEnvironmentVariable('Path', 'User') -split ';' | Where-Object { $_ })
        foreach ($toolPath in $toolPaths) { if ($userPathParts -notcontains $toolPath) { $userPathParts += $toolPath } }
        [Environment]::SetEnvironmentVariable('Path', ($userPathParts -join ';'), 'User')
        Write-Host 'Variaveis de usuario configuradas sem substituir entradas existentes. Reabra terminais/IDE.'
        exit 0
    }
    if ($Mode -eq 'Doctor') {
        Invoke-Checked (Join-Path $javaRoot 'bin/java.exe') @('-version')
        Invoke-Checked $adbPath @('version')
        Invoke-Checked $emulatorPath @('-list-avds')
        $accelerationReady = Test-EmulatorAcceleration $emulatorPath
        Push-Location $androidRoot
        try { Invoke-Checked '.\gradlew.bat' @('--version') } finally { Pop-Location }
        $null = Assert-Port 8082 'http://127.0.0.1:8082/status' 'packager-status:running'
        $null = Assert-Port 3334 'http://127.0.0.1:3334/health' 'cardiorehab-api'
        if (!$accelerationReady) { throw 'Hipervisor ausente. Ative Windows Hypervisor Platform e reinicie; veja docs/android-windows.md.' }
        exit 0
    }
    if ($Mode -eq 'Build') {
        Push-Location $androidRoot
        try { Invoke-Checked '.\gradlew.bat' @(':app:assembleDebug', '-PreactNativeArchitectures=x86_64', '-PreactNativeDevServerPort=8082', '--max-workers=2', '--no-daemon', '--console=plain') } finally { Pop-Location }
        exit 0
    }
    # Check both ports before starting any server or emulator.
    $null = Assert-Port 8082 'http://127.0.0.1:8082/status' 'packager-status:running'
    $null = Assert-Port 3334 'http://127.0.0.1:3334/health' 'cardiorehab-api'
    Invoke-Checked $adbPath @('start-server')
    $runningEmulators = @(& $adbPath devices | Where-Object { $_ -match '^(emulator-\d+)\s+device$' } | ForEach-Object { ($_.Trim() -split '\s+')[0] })
    if ($runningEmulators.Count -gt 1) { throw 'Mais de um emulador ativo. Deixe apenas o emulador desejado em execucao.' }
    if (!$runningEmulators.Count) {
        $avds = @(& $emulatorPath -list-avds | Where-Object { $_.Trim() })
        if ($avds -notcontains $AvdName) {
            if ($avds.Count -eq 1) { $AvdName = $avds[0] }
            else { throw "AVD $AvdName ausente. Crie-o conforme docs/android-windows.md. Disponiveis: $($avds -join ', ')" }
        }
        if (!(Test-EmulatorAcceleration $emulatorPath)) { throw 'Aceleracao indisponivel. Ative Windows Hypervisor Platform e reinicie o Windows; veja docs/android-windows.md.' }
        # The emulator is intentionally visible: the user requested its UI.
        Start-Process -FilePath $emulatorPath -ArgumentList @('-avd', $AvdName, '-no-snapshot-load', '-no-boot-anim') -WindowStyle Normal | Out-Null
    }
    Write-Host 'Aguardando o boot do emulador; o primeiro boot pode demorar alguns minutos.'
    $deadline = [DateTime]::UtcNow.AddMinutes(8)
    do {
        $runningEmulators = @(& $adbPath devices | Where-Object { $_ -match '^(emulator-\d+)\s+device$' } | ForEach-Object { ($_.Trim() -split '\s+')[0] })
        if ($runningEmulators.Count -eq 1) {
            $serial = $runningEmulators[0]
            $booted = (& $adbPath -s $serial shell getprop sys.boot_completed 2>$null) -join ''
            if ($booted.Trim() -eq '1') { break }
        }
        Start-Sleep -Seconds 2
    } while ([DateTime]::UtcNow -lt $deadline)
    if (!$serial -or $booted.Trim() -ne '1') { throw 'O emulador nao concluiu o boot em 8 minutos. Abra Device Manager e confira o AVD.' }
    if ($Mode -eq 'Emulator') { Write-Host "Emulador pronto: $serial"; exit 0 }
    $previousPort = $env:PORT
    try {
        $env:PORT = '3334'
        Ensure-Server 'api' 3334 'http://127.0.0.1:3334/health' 'cardiorehab-api' @('node_modules/tsx/dist/cli.mjs', 'services/api/src/server.ts') $repoRoot
    } finally { $env:PORT = $previousPort }
    $metroCliArgument = '"' + (Join-Path $repoRoot 'node_modules/react-native/cli.js') + '"'
    Ensure-Server 'metro' 8082 'http://127.0.0.1:8082/status' 'packager-status:running' @($metroCliArgument, 'start', '--host', '0.0.0.0', '--port', '8082') $mobileRoot
    Invoke-Checked $adbPath @('-s', $serial, 'reverse', 'tcp:8082', 'tcp:8082')
    Push-Location $androidRoot
    try { Invoke-Checked '.\gradlew.bat' @(':app:assembleDebug', '-PreactNativeArchitectures=x86_64', '-PreactNativeDevServerPort=8082', '--max-workers=2', '--no-daemon', '--console=plain') } finally { Pop-Location }
    Invoke-Checked $adbPath @('-s', $serial, 'install', '-r', (Join-Path $androidRoot 'app/build/outputs/apk/debug/app-debug.apk'))
    Invoke-Checked $adbPath @('-s', $serial, 'shell', 'am', 'start', '-n', 'com.cardiorehabpro/.MainActivity')
    Write-Host 'CardioRehab Pro aberto. Metro: 8082. API no emulador: http://10.0.2.2:3334.'
} catch {
    Write-Error $_ -ErrorAction Continue
    exit 1
}
