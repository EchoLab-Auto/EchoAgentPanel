#!/usr/bin/env bash
# 安装 XR 开发服务为「持久 systemd 用户单元」（开机/登录自启），并立即启动。
#
#   echo-xr-probe.service      就绪检测页          http://0.0.0.0:8787
#   echo-xr-tls-panel.service  Panel HTTPS 前端    https://0.0.0.0:8443 → 127.0.0.1:8080
#   echo-xr-tls-probe.service  检测页 HTTPS 前端   https://0.0.0.0:8444 → 127.0.0.1:8787
#
# 证书在启动前由 ensure-cert.sh 校验（IP 变化自动重签叶子证书）。
#
# 卸载/停用：
#   systemctl --user disable --now echo-xr-probe echo-xr-tls-panel echo-xr-tls-probe
#   rm ~/.config/systemd/user/echo-xr-{probe,tls-panel,tls-probe}.service && systemctl --user daemon-reload
set -Eeuo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
UNIT_DIR="${HOME}/.config/systemd/user"

UNITS=(echo-xr-probe echo-xr-tls-panel echo-xr-tls-probe)

# 旧的 transient 同名单元（systemd-run 启动的）先停掉，避免与持久单元冲突
for u in "${UNITS[@]}"; do
  if systemctl --user is-active --quiet "$u.service" 2>/dev/null; then
    systemctl --user stop "$u.service" 2>/dev/null || true
  fi
done

mkdir -p "$UNIT_DIR"

cat > "$UNIT_DIR/echo-xr-probe.service" <<EOF
[Unit]
Description=XR Dev: readiness probe server (http :8787)
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
ExecStart=/usr/bin/python3 $DIR/probe/server.py 8787
Restart=on-failure
RestartSec=3
UMask=0077

[Install]
WantedBy=default.target
EOF

cat > "$UNIT_DIR/echo-xr-tls-panel.service" <<EOF
[Unit]
Description=XR Dev: Panel HTTPS front (8443 -> 127.0.0.1:8080)
After=network-online.target echo-agent-panel.service
Wants=network-online.target
PartOf=echo-agent-panel.service

[Service]
Type=simple
ExecStartPre=$DIR/ensure-cert.sh
ExecStart=$DIR/tls-front.sh 8443 127.0.0.1:8080
Restart=on-failure
RestartSec=3
UMask=0077

[Install]
WantedBy=default.target
EOF

cat > "$UNIT_DIR/echo-xr-tls-probe.service" <<EOF
[Unit]
Description=XR Dev: probe HTTPS front (8444 -> 127.0.0.1:8787)
After=network-online.target echo-xr-probe.service
Wants=network-online.target
PartOf=echo-xr-probe.service

[Service]
Type=simple
ExecStartPre=$DIR/ensure-cert.sh
ExecStart=$DIR/tls-front.sh 8444 127.0.0.1:8787
Restart=on-failure
RestartSec=3
UMask=0077

[Install]
WantedBy=default.target
EOF

systemctl --user daemon-reload
systemctl --user enable --now "${UNITS[@]/%/.service}" 2>&1 | tail -3 || true
sleep 1

echo
echo "✅ 持久单元已安装并启用（开机自启）："
for u in "${UNITS[@]}"; do
  printf '  %-22s %s\n' "$u" "$(systemctl --user is-active "$u.service" 2>/dev/null || echo inactive)"
done
echo
echo "状态查看： $DIR/start-all.sh status"
echo "停用：     systemctl --user disable --now ${UNITS[*]}"
