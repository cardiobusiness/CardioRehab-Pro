#Requires -RunAsAdministrator
$ErrorActionPreference = 'Stop'
$statusPath = Join-Path (Split-Path -Parent $PSScriptRoot) '.dev-logs/android-hypervisor.json'
New-Item -ItemType Directory -Path (Split-Path -Parent $statusPath) -Force | Out-Null
try {
    $feature = Get-WindowsOptionalFeature -Online -FeatureName HypervisorPlatform
    $restartNeeded = $false
    if ($feature.State -ne 'Enabled') {
        $result = Enable-WindowsOptionalFeature -Online -FeatureName HypervisorPlatform -All -NoRestart
        $restartNeeded = [bool]$result.RestartNeeded
    }
    @{ feature='HypervisorPlatform'; enabled=$true; restartNeeded=$restartNeeded; automaticRestart=$false } |
        ConvertTo-Json | Set-Content -LiteralPath $statusPath -Encoding utf8
} catch {
    @{ feature='HypervisorPlatform'; enabled=$false; error=$_.Exception.Message; automaticRestart=$false } |
        ConvertTo-Json | Set-Content -LiteralPath $statusPath -Encoding utf8
    exit 1
}
