# Nimbus NVR Gateway installer for Windows 10/11
$ErrorActionPreference = "Stop"
$InstallDir = Join-Path $env:ProgramData "Nimbus\NVR Gateway"
$SpoolDir = Join-Path $env:ProgramData "Nimbus\NVR Gateway\spool"

# If this installer is being used to re-enroll an existing gateway, stop the
# old task and clear only its persistent enrollment token. This prevents an
# old/revoked token from winning over the new one-time enrollment code.
# Stop/remove the previous Task Scheduler deployment if present.
if (Get-ScheduledTask -TaskName "Nimbus NVR Gateway" -ErrorAction SilentlyContinue) {
  Stop-ScheduledTask -TaskName "Nimbus NVR Gateway" -ErrorAction SilentlyContinue
  Unregister-ScheduledTask -TaskName "Nimbus NVR Gateway" -Confirm:$false -ErrorAction SilentlyContinue
  Start-Sleep -Seconds 1
}
# Stop/remove an older Windows service deployment before replacing its files.
$oldService = Get-Service -Name "Nimbus NVR Gateway" -ErrorAction SilentlyContinue
if ($oldService) {
  Stop-Service -Name "Nimbus NVR Gateway" -Force -ErrorAction SilentlyContinue
  Start-Sleep -Seconds 1
  Push-Location $InstallDir
  if (Test-Path "service-install.cjs") { node service-install.cjs uninstall 2>$null }
  Pop-Location
  Start-Sleep -Seconds 1
}
New-Item -ItemType Directory -Force -Path $InstallDir, $SpoolDir | Out-Null
Remove-Item (Join-Path $SpoolDir ".gateway-token") -Force -ErrorAction SilentlyContinue

function Ensure-WingetPackage($Id, $Name) {
  if (-not (Get-Command winget -ErrorAction SilentlyContinue)) {
    throw "Windows App Installer (winget) is required. Install/update 'App Installer' from Microsoft Store, then run this installer again."
  }
  winget install --id $Id --exact --accept-package-agreements --accept-source-agreements --silent --scope machine
  if ($LASTEXITCODE -ne 0) { throw "Could not install $Name." }
  $env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User")
}

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Ensure-WingetPackage "OpenJS.NodeJS.LTS" "Node.js LTS"
}

$FfmpegDir = Join-Path $InstallDir "ffmpeg"
New-Item -ItemType Directory -Force -Path $FfmpegDir | Out-Null

function Find-FfmpegBinary {
  $roots = @(
    (Join-Path $env:ProgramFiles "WinGet\Packages"),
    (Join-Path $env:ProgramFiles "ffmpeg"),
    (Join-Path $env:ProgramData "chocolatey\bin")
  ) | Where-Object { $_ -and (Test-Path $_) }

  foreach ($root in $roots) {
    $hit = Get-ChildItem -Path $root -Filter "ffmpeg.exe" -File -Recurse -ErrorAction SilentlyContinue |
      Where-Object { $_.FullName -notmatch "[\\/]Links[\\/]" } |
      Select-Object -First 1
    if ($hit) { return $hit }
  }

  return $null
}

$FfmpegBinary = Find-FfmpegBinary
if (-not $FfmpegBinary) {
  Ensure-WingetPackage "Gyan.FFmpeg" "FFmpeg"
  $FfmpegBinary = Find-FfmpegBinary
}

if (-not $FfmpegBinary) {
  throw "FFmpeg was installed but ffmpeg.exe could not be located."
}

# Copy the complete FFmpeg bin directory, not only ffmpeg.exe. Gyan builds can
# ship supporting DLLs beside the executable. Keeping a self-contained copy in
# ProgramData makes it visible to SYSTEM and independent of the installing user's PATH.
$FfmpegSourceDir = $FfmpegBinary.Directory.FullName
if ($FfmpegBinary.Name -ne "ffmpeg.exe") { throw "Unexpected FFmpeg binary: $($FfmpegBinary.FullName)" }
Get-ChildItem -Path $FfmpegSourceDir -File | ForEach-Object {
  Copy-Item $_.FullName -Destination (Join-Path $FfmpegDir $_.Name) -Force
}
$FfmpegPath = Join-Path $FfmpegDir "ffmpeg.exe"
if (-not (Test-Path $FfmpegPath)) { throw "FFmpeg copy failed: $FfmpegPath was not created." }
if ((Get-Item $FfmpegPath).Length -lt 100000) { throw "FFmpeg binary looks invalid or incomplete: $FfmpegPath" }

# Verify the copied binary actually starts before we register the long-running task.
$ffmpegCheck = Start-Process -FilePath $FfmpegPath -ArgumentList "-version" -Wait -PassThru -NoNewWindow
if ($ffmpegCheck.ExitCode -ne 0) { throw "The installed FFmpeg binary failed its startup check." }

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
NIMBUS_GATEWAY_DIR=$InstallDir
FFMPEG_PATH=$FfmpegPath
"@ | Set-Content -Path (Join-Path $InstallDir ".env") -Encoding ASCII

$NodePath = Join-Path $env:ProgramFiles "nodejs\node.exe"
if (-not (Test-Path $NodePath)) {
  $NodeCommand = Get-Command node -ErrorAction SilentlyContinue
  if ($NodeCommand) { $NodePath = $NodeCommand.Source }
}
if (-not (Test-Path $NodePath)) { throw "Node.js was installed but node.exe could not be located." }
# Install as a real Windows service. This gives the customer normal Start/Stop
# controls in services.msc and keeps the gateway running in the background
# without exposing Task Scheduler or a console window.
Push-Location $InstallDir
node service-install.cjs install
if ($LASTEXITCODE -ne 0) { Pop-Location; throw "Could not install the Nimbus NVR Gateway Windows service." }
Pop-Location

# Create simple Start/Stop shortcuts in the Start Menu for non-technical users.
$StartMenuDir = Join-Path $env:ProgramData "Microsoft\Windows\Start Menu\Programs\Nimbus"
New-Item -ItemType Directory -Force -Path $StartMenuDir | Out-Null
$WshShell = New-Object -ComObject WScript.Shell
foreach ($item in @(@{Name='Start Nimbus Gateway'; Target=(Join-Path $InstallDir 'start-gateway.bat')}, @{Name='Stop Nimbus Gateway'; Target=(Join-Path $InstallDir 'stop-gateway.bat')})) {
  $shortcut = $WshShell.CreateShortcut((Join-Path $StartMenuDir ($item.Name + '.lnk')))
  $shortcut.TargetPath = $item.Target
  $shortcut.WorkingDirectory = $InstallDir
  $shortcut.Save()
}

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
  Write-Host "NVR configuration is managed from Nimbus. The gateway runs automatically in the background as a Windows service." -ForegroundColor Green
  Write-Host "Start/Stop controls were added to Start Menu > Nimbus." -ForegroundColor Green
} else {
  Write-Host "Nimbus NVR Gateway was installed, but enrollment was not confirmed." -ForegroundColor Yellow
  Write-Host "Create a fresh enrollment code in Nimbus and run install.bat again." -ForegroundColor Yellow
}
