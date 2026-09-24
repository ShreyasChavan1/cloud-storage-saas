$ErrorActionPreference = "Stop"
$ServiceName = "Nimbus NVR Gateway"
$InstallDir = Join-Path $env:ProgramData "Nimbus\NVR Gateway"

if (Get-Service -Name $ServiceName -ErrorAction SilentlyContinue) {
  Stop-Service -Name $ServiceName -Force -ErrorAction SilentlyContinue
  Start-Sleep -Seconds 1
  Push-Location $InstallDir
  if (Test-Path "service-install.cjs") { node service-install.cjs uninstall }
  Pop-Location
}

# Remove any legacy scheduled-task deployment too.
Unregister-ScheduledTask -TaskName $ServiceName -Confirm:$false -ErrorAction SilentlyContinue

$StartMenuDir = Join-Path $env:ProgramData "Microsoft\Windows\Start Menu\Programs\Nimbus"
Remove-Item $StartMenuDir -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -LiteralPath $InstallDir -Recurse -Force -ErrorAction SilentlyContinue
Write-Host "Nimbus NVR Gateway removed. Stored recordings in the local spool were removed with the gateway directory." -ForegroundColor Yellow
