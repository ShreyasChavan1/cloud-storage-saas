#!/usr/bin/env bash
set -euo pipefail
INSTALL_DIR="/opt/nimbus-nvr-gateway"
SPOOL_DIR="/var/lib/nimbus-nvr-gateway/spool"

if [[ $EUID -ne 0 ]]; then echo "Run as root (sudo)."; exit 1; fi
apt-get update
apt-get install -y nodejs npm ffmpeg ca-certificates
mkdir -p "$INSTALL_DIR" "$SPOOL_DIR"
cp -a "$(dirname "$0")"/. "$INSTALL_DIR"/
rm -f "$INSTALL_DIR/install.sh" "$INSTALL_DIR/install.ps1" "$INSTALL_DIR/uninstall.ps1"
read -r -p "Nimbus API URL: " API_URL
read -r -p "One-time Nimbus gateway enrollment code: " ENROLLMENT_CODE
if [[ -z "$API_URL" || -z "$ENROLLMENT_CODE" ]]; then echo "API URL and enrollment code are required."; exit 1; fi
cat > "$INSTALL_DIR/.env" <<EOF
NIMBUS_API_URL=$API_URL
NIMBUS_ENROLLMENT_CODE=$ENROLLMENT_CODE
SPOOL_DIR=$SPOOL_DIR
EOF
cd "$INSTALL_DIR"
npm install
npm run build
npm prune --omit=dev
cat > /etc/systemd/system/nimbus-nvr-gateway.service <<EOF
[Unit]
Description=Nimbus NVR Gateway
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
WorkingDirectory=$INSTALL_DIR
EnvironmentFile=$INSTALL_DIR/.env
ExecStart=/usr/bin/node $INSTALL_DIR/dist/index.js
Restart=always
RestartSec=5
User=root

[Install]
WantedBy=multi-user.target
EOF
systemctl daemon-reload
systemctl enable --now nimbus-nvr-gateway.service
chmod 600 "$INSTALL_DIR/.env"
echo "Nimbus NVR Gateway installed and started."
echo "It runs automatically at boot. NVR configuration is managed from Nimbus."
