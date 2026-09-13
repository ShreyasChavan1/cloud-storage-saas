@echo off
:: Double-click this file to install. No need to open PowerShell, set an
:: execution policy, or navigate to this folder manually — it finds itself
:: and re-launches with admin rights automatically.

:: --- Check for admin rights; if missing, relaunch elevated and exit this copy ---
>nul 2>&1 "%SystemRoot%\system32\cacls.exe" "%SystemRoot%\system32\config\system"
if '%errorlevel%' NEQ '0' (
    echo Requesting administrator privileges...
    echo Set UAC = CreateObject^("Shell.Application"^) > "%temp%\nimbus-getadmin.vbs"
    echo UAC.ShellExecute "%~s0", "", "", "runas", 1 >> "%temp%\nimbus-getadmin.vbs"
    "%temp%\nimbus-getadmin.vbs"
    del "%temp%\nimbus-getadmin.vbs"
    exit /B
)

:: --- Always run from this file's own folder, wherever it was extracted to ---
cd /d "%~dp0"

echo.
echo ============================================
echo   Nimbus NVR Gateway installer
echo ============================================
echo.

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0install.ps1"

echo.
echo ============================================
echo   Done. You can close this window.
echo ============================================
pause
