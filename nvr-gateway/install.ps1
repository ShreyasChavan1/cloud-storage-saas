# Nimbus NVR Gateway installer for Windows 10/11
$ErrorActionPreference = "Stop"
$InstallDir = Join-Path $env:ProgramData "Nimbus\NVR Gateway"
$SpoolDir = Join-Path $env:ProgramData "Nimbus\NVR Gateway\spool"

# If this installer is being used to re-enroll an existing gateway, stop the
# old task and clear only its persistent enrollment token. This prevents an
# old/revoked token from winning over the new one-time enrollment code.
if (Get-ScheduledTask -TaskName "Nimbus NVR Gateway" -ErrorAction SilentlyContinue) {
  Stop-ScheduledTask -TaskName "Nimbus NVR Gateway" -ErrorAction SilentlyContinue
  Start-Sleep -Seconds 1
}
New-Item -ItemType Directory -Force -Path $InstallDir, $SpoolDir | Out-Null
Remove-Item (Join-Path $SpoolDir ".gateway-token") -Force -ErrorAction SilentlyContinue

function Ensure-WingetPackage($Id, $Name) {
  if (-not (Get-Command winget -ErrorAction SilentlyContinue)) {
    throw "Windows App Installer (winget) is required. Install/update 'App Installer' from Microsoft Store, then run this installer again."
  }
  winget install --id $Id --exact --accept-package-agreements --accept-source-agreements --silent
  if ($LASTEXITCODE -ne 0) { throw "Could not install $Name." }
  $env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User")
}

if (-not (Get-Command node -ErrorAction SilentlyContinue)) { Ensure-WingetPackage "OpenJS.NodeJS.LTS" "Node.js LTS" }
if (-not (Get-Command ffmpeg -ErrorAction SilentlyContinue)) { Ensure-WingetPackage "Gyan.FFmpeg" "FFmpeg" }

# Defaults to the current Nimbus deployment so a customer can just press
# Enter — but stays overridable. A hardcoded, non-overridable URL here would
# silently break every future install the moment the backend moves off this
# host (e.g. off Railway to a permanent one), including anyone who downloads
# this installer from Nimbus after that migration but before someone
# remembers to update and re-package it.
$DefaultApiUrl = "https://cloud-storage-saas-production.up.railway.app"
$ApiUrl = if ([string]::IsNullOrWhiteSpace($env:NIMBUS_INSTALL_API_URL)) { $DefaultApiUrl } else { $env:NIMBUS_INSTALL_API_URL.TrimEnd('/') }
$Code = Read-Host "Paste the one-time Nimbus gateway enrollment code and press Enter"
if ([string]::IsNullOrWhiteSpace($ApiUrl) -or [string]::IsNullOrWhiteSpace($Code)) { throw "Nimbus API URL and enrollment code are required." }

# NOTE: no trailing backslash after the wildcard here — "*\" matches
# directories ONLY in PowerShell's filesystem provider, which silently
# skipped every top-level file (package.json, tsconfig.json, .env.example)
# and left npm with nothing to install or build.
Copy-Item -Path (Join-Path $PSScriptRoot "*") -Destination $InstallDir -Recurse -Force -Exclude "*.ps1"
Push-Location $InstallDir
npm install
# $ErrorActionPreference = "Stop" only catches PowerShell-level errors, not
# a native .exe returning a non-zero exit code — without these checks, a
# failed npm step was silently ignored and the script went on to report
# success anyway.
if ($LASTEXITCODE -ne 0) { Pop-Location; throw "npm install failed (exit code $LASTEXITCODE). Check the output above." }
npm run build
if ($LASTEXITCODE -ne 0) { Pop-Location; throw "npm run build failed (exit code $LASTEXITCODE). Check the output above." }
npm prune --omit=dev
if ($LASTEXITCODE -ne 0) { Pop-Location; throw "npm prune failed (exit code $LASTEXITCODE). Check the output above." }
Pop-Location

@"
NIMBUS_API_URL=$ApiUrl
NIMBUS_ENROLLMENT_CODE=$Code
SPOOL_DIR=$SpoolDir
"@ | Set-Content -Path (Join-Path $InstallDir ".env") -Encoding ASCII

$Action = New-ScheduledTaskAction -Execute (Join-Path (Split-Path (Get-Command node).Source) "node.exe") -Argument "`"$InstallDir\dist\index.js`"" -WorkingDirectory $InstallDir
$Trigger = New-ScheduledTaskTrigger -AtStartup
$Principal = New-ScheduledTaskPrincipal -UserId "SYSTEM" -LogonType ServiceAccount -RunLevel Highest
# Task Scheduler's default ExecutionTimeLimit is 3 days — without overriding
# it to unlimited, Windows would silently kill this long-running gateway
# process every 72 hours. RestartCount/RestartInterval is the closest
# equivalent here to systemd's Restart=always on the Linux side (not truly
# infinite — Task Scheduler caps it — but 999 retries at 1-minute spacing
# comfortably outlasts any transient network blip or NVR reboot).
$Settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -RestartCount 999 -RestartInterval (New-TimeSpan -Minutes 1) -ExecutionTimeLimit ([TimeSpan]::Zero)
Register-ScheduledTask -TaskName "Nimbus NVR Gateway" -Action $Action -Trigger $Trigger -Principal $Principal -Settings $Settings -Force | Out-Null
Start-ScheduledTask -TaskName "Nimbus NVR Gateway"

# Give the gateway a short window to exchange the one-time code for its
# persistent token. This turns installation into a real enrollment check
# instead of reporting success merely because Task Scheduler accepted the task.
$TokenFile = Join-Path $SpoolDir ".gateway-token"
$enrolled = $false
for ($i = 0; $i -lt 30; $i++) {
  if (Test-Path $TokenFile) {
    $token = (Get-Content $TokenFile -Raw -ErrorAction SilentlyContinue).Trim()
    if (-not [string]::IsNullOrWhiteSpace($token)) { $enrolled = $true; break }
  }
  Start-Sleep -Seconds 2
}

if ($enrolled) {
  # The enrollment code is single-use. Remove it after successful enrollment
  # so the persistent gateway token is the only credential kept in .env.
  $envPath = Join-Path $InstallDir ".env"
  if (Test-Path $envPath) {
    (Get-Content $envPath) | Where-Object { $_ -notmatch '^NIMBUS_ENROLLMENT_CODE=' } | Set-Content -Path $envPath -Encoding ASCII
  }
  Write-Host "Nimbus NVR Gateway installed and enrolled successfully." -ForegroundColor Green
  Write-Host "NVR configuration is managed from Nimbus. The gateway will start automatically with Windows." -ForegroundColor Green
} else {
  Write-Host "Nimbus NVR Gateway was installed, but enrollment was not confirmed." -ForegroundColor Yellow
  Write-Host "Create a fresh enrollment code in Nimbus and run install.bat again." -ForegroundColor Yellow
}
