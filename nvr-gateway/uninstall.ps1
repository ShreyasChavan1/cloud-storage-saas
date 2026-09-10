$ErrorActionPreference = "Stop"
$Task = "Nimbus NVR Gateway"
$InstallDir = Join-Path $env:ProgramData "Nimbus\NVR Gateway"
Unregister-ScheduledTask -TaskName $Task -Confirm:$false -ErrorAction SilentlyContinue
Remove-Item -LiteralPath $InstallDir -Recurse -Force -ErrorAction SilentlyContinue
Write-Host "Nimbus NVR Gateway removed. Stored recordings in the local spool were removed with the gateway directory." -ForegroundColor Yellow
