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

$ApiUrl = Read-Host "Nimbus API URL (for example https://api.nimbus.example.com)"
$Code = Read-Host "One-time Nimbus gateway enrollment code"
if ([string]::IsNullOrWhiteSpace($ApiUrl) -or [string]::IsNullOrWhiteSpace($Code)) { throw "Nimbus API URL and enrollment code are required." }

Copy-Item -Path (Join-Path $PSScriptRoot "*\") -Destination $InstallDir -Recurse -Force -Exclude "*.ps1"
Push-Location $InstallDir
npm install
npm run build
npm prune --omit=dev
Pop-Location

@"
NIMBUS_API_URL=$ApiUrl
NIMBUS_ENROLLMENT_CODE=$Code
SPOOL_DIR=$SpoolDir
"@ | Set-Content -Path (Join-Path $InstallDir ".env") -Encoding ASCII

$Action = New-ScheduledTaskAction -Execute (Join-Path (Split-Path (Get-Command node).Source) "node.exe") -Argument "`"$InstallDir\dist\index.js`"" -WorkingDirectory $InstallDir
$Trigger = New-ScheduledTaskTrigger -AtStartup
$Principal = New-ScheduledTaskPrincipal -UserId "SYSTEM" -LogonType ServiceAccount -RunLevel Highest
Register-ScheduledTask -TaskName "Nimbus NVR Gateway" -Action $Action -Trigger $Trigger -Principal $Principal -Force | Out-Null
Start-ScheduledTask -TaskName "Nimbus NVR Gateway"
Write-Host "Nimbus NVR Gateway installed and started." -ForegroundColor Green
Write-Host "It runs automatically at Windows startup. NVR configuration is managed from Nimbus." -ForegroundColor Green
