# Nimbus NVR Gateway

A Docker-free local gateway for production NVR backup. It runs inside the customer LAN, receives RTSP camera streams from the NVR, creates MP4 segments, queues them locally during outages, and uploads completed segments to Nimbus over HTTPS.

## Before you install

You'll need one thing during setup:

1. **A one-time gateway enrollment code** — generated in Nimbus under **Settings → CCTV → Create a gateway**. Paste it into the installer and press Enter. The installer uses the current Nimbus API automatically.

The machine you install on needs network access to both the NVR (on the LAN) and the Nimbus API URL above (typically over the internet) — it does not need any inbound ports opened.

## Windows 10/11

1. Extract the downloaded zip anywhere (Desktop, Downloads, doesn't matter).
2. Double-click **`install.bat`** inside the extracted folder.
3. Click **Yes** on the Windows permission prompt that appears — a black window opens and installs everything for you.
4. When it asks, paste the one-time enrollment code from Nimbus and press Enter.

That's it — no PowerShell knowledge, no execution-policy settings, no API URL to enter, and no need to `cd` into any folder yourself. The installer installs Node.js LTS and FFmpeg automatically if needed (via `winget` — if that's missing, install "App Installer" from the Microsoft Store first), enrolls the gateway, and registers a scheduled task so it starts automatically at boot and restarts itself if it ever crashes. No Docker is required.

(If you prefer running it from PowerShell directly instead of double-clicking, that still works: `Set-ExecutionPolicy Bypass -Scope Process -Force` then `.\install.ps1`, as Administrator.)

## Linux

```bash
sudo ./install.sh
```

The installer installs Node.js, npm and FFmpeg, enrolls the gateway, and installs a systemd service (auto-restarts on failure, starts at boot). No Docker is required.

## Verifying it actually worked

The installer now waits briefly for the gateway token and reports whether enrollment was actually confirmed. If enrollment is confirmed, no manual log inspection is required for normal setup:

- **Windows**: open Task Scheduler → Task Scheduler Library → "Nimbus NVR Gateway" → History tab. Or run `node dist\index.js` manually from the install folder (`%ProgramData%\Nimbus\NVR Gateway`) to see live output.
- **Linux**: `sudo journalctl -u nimbus-nvr-gateway -f`

Either way, look for:

```
Gateway enrolled as <your gateway name> (<device id>).
```

If instead you see the same error repeating every few seconds, the gateway is stuck retrying — it did **not** enroll. The most common causes, in order of likelihood:
- The enrollment code expired (24h) or was already used — create a fresh one in Nimbus and re-run the installer.
- The Nimbus API URL was mistyped, or doesn't include `https://`.
- The install machine can't reach the Nimbus API URL at all (firewall, DNS, no internet).

Back in Nimbus (**Settings → CCTV**), the device's status updates automatically within a few seconds of a successful enrollment — no need to refresh the page or reopen the tab.

## After enrollment

Remove `NIMBUS_ENROLLMENT_CODE` from the local `.env` if you want to harden the machine further — it's single-use anyway, so leaving it is low-risk, but there's no reason to keep it around once enrolled. The permanent gateway token that replaces it is stored with restricted file permissions in the spool directory.

NVR credentials and camera configuration are entered in Nimbus (**Settings → CCTV → Configure**) after enrollment, not in the gateway's `.env` file.

## Uninstalling

- **Windows**: run `uninstall.ps1` as Administrator.
- **Linux**: run `sudo ./uninstall.sh`.

Both remove the scheduled task/service and the local install + spool directories, including any recordings still queued locally that hadn't finished uploading yet.
