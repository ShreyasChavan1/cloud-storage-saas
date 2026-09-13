# Nimbus NVR Gateway installer for Windows 10/11
$ErrorActionPreference = "Stop"
$InstallDir = Join-Path $env:ProgramData "Nimbus\NVR Gateway"
$SpoolDir = Join-Path $env:ProgramData "Nimbus\NVR Gateway\spool"
New-Item -ItemType Directory -Force -Path $InstallDir, $SpoolDir | Out-Null

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
$ApiUrlInput = Read-Host "Nimbus API URL [default: $DefaultApiUrl]"
$ApiUrl = if ([string]::IsNullOrWhiteSpace($ApiUrlInput)) { $DefaultApiUrl } else { $ApiUrlInput }
$Code = Read-Host "One-time Nimbus gateway enrollment code"
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
Write-Host "Nimbus NVR Gateway installed and started." -ForegroundColor Green
Write-Host "The gateway will fetch its NVR configuration automatically from Nimbus." -ForegroundColor Green
Write-Host "It runs automatically at Windows startup. NVR configuration is managed from Nimbus." -ForegroundColor Green
Write-Host ""
Write-Host "To verify it actually enrolled, check: Task Scheduler > Task Scheduler Library > Nimbus NVR Gateway > History tab," -ForegroundColor Cyan
Write-Host "or run 'node dist\index.js' manually from $InstallDir to see live output." -ForegroundColor Cyan
