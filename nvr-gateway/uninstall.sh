#!/usr/bin/env bash
set -euo pipefail
if [[ $EUID -ne 0 ]]; then echo "Run as root (sudo)."; exit 1; fi
systemctl disable --now nimbus-nvr-gateway.service 2>/dev/null || true
rm -f /etc/systemd/system/nimbus-nvr-gateway.service
systemctl daemon-reload
rm -rf /opt/nimbus-nvr-gateway /var/lib/nimbus-nvr-gateway
echo "Nimbus NVR Gateway removed."
