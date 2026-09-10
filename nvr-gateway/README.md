# Nimbus NVR Gateway

A Docker-free local gateway for production NVR backup. It runs inside the customer LAN, receives RTSP camera streams from the NVR, creates MP4 segments, queues them locally during outages, and uploads completed segments to Nimbus over HTTPS.

## Customer installation

### Windows 10/11
Run PowerShell as Administrator:

```powershell
Set-ExecutionPolicy Bypass -Scope Process -Force
.\install.ps1
```

The installer installs Node.js LTS and FFmpeg automatically if needed, enrolls the gateway with the one-time code, and registers it to start automatically at boot. No Docker is required.

### Linux
```bash
sudo ./install.sh
```

The installer installs Node.js, npm and FFmpeg, enrolls the gateway, and installs a systemd service. No Docker is required.

After enrollment, remove the one-time enrollment code from the local `.env` if you want to harden the machine further. The permanent gateway token is stored with restricted permissions in the spool directory.

NVR credentials and camera configuration are managed from Nimbus, not entered into the gateway `.env`.
