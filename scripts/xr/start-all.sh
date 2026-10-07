#!/usr/bin/env bash
# XR 开发环境一键启停（Panel HTTPS 前端 + 就绪检测页 + 检测页 HTTPS）。
#
# 组件（systemd 用户级 transient 单元）：
#   echo-xr-tls-panel   https://0.0.0.0:8443 → Panel  127.0.0.1:8080
#   echo-xr-probe       就绪检测页          http://0.0.0.0:8787
#   echo-xr-tls-probe   就绪检测页          https://0.0.0.0:8444
#
# 用法:
#   ./start-all.sh up       证书就绪检查 + 启动全部（已在跑则跳过）+ 打印访问地址
#   ./start-all.sh down     停止全部
#   ./start-all.sh status   状态 + 连通快测
#   ./start-all.sh reverse  （可选）对已连接的 PICO 建立 adb 端口反转
set -Eeuo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CERT_DIR="${XR_TLS_DIR:-$HOME/.config/echo-agent-panel/dev-tls}"
UNITS=(echo-xr-tls-panel echo-xr-probe echo-xr-tls-probe)

lan_ip() {
  ip -4 route get 1.1.1.1 2>/dev/null | awk '{for(i=1;i<=NF;i++) if($i=="src"){print $(i+1); exit}}'
}

start_unit() { # start_unit <unit> <desc> <cmd...>
  local unit="$1" desc="$2"; shift 2
  if systemctl --user is-active --quiet "$unit"; then
    echo "  ✓ $unit 已在运行（跳过）"
    return 0
  fi
  systemd-run --user --collect --unit="$unit" --description="$desc" \
    --property=Restart=on-failure -- "$@" >/dev/null
  echo "  ▶ $unit 已启动"
}

case "${1:-up}" in
  up)
    echo "🔐 证书检查…"
    if [ ! -f "$CERT_DIR/panel-fullchain.crt" ]; then
      "$DIR/gen-certs.sh"
    else
      echo "  ✓ 复用 $CERT_DIR"
    fi

    echo "🚀 启动 XR 服务…"
    start_unit echo-xr-tls-panel "XR Dev: Panel HTTPS 前端 (8443→8080)" "$DIR/tls-front.sh" 8443 127.0.0.1:8080
    start_unit echo-xr-probe     "XR Dev: 就绪检测页服务器 (:8787)"       /usr/bin/python3 "$DIR/probe/server.py" 8787
    start_unit echo-xr-tls-probe "XR Dev: 检测页 HTTPS 前端 (8444→8787)" "$DIR/tls-front.sh" 8444 127.0.0.1:8787
    sleep 1

    IP="$(lan_ip || true)"; IP="${IP:-<本机IP>}"
    cat <<EOF

════════ 访问入口 ════════
Panel（头显里打开 · 巨幕模式）
  自签 HTTPS      https://${IP}:8443        （首次点过证书警告）
  或 adb 反转后   http://localhost:8080     （adb reverse 建立后）

就绪检测页（判定安全上下文 / WebXR 可用性）
  HTTP            http://${IP}:8787/probe
  自签 HTTPS      https://${IP}:8444/probe

PC 端快查：./start-all.sh status
停止：    ./start-all.sh down
EOF
    ;;
  down)
    for u in "${UNITS[@]}"; do
      if systemctl --user is-active --quiet "$u"; then
        systemctl --user stop "$u" >/dev/null 2>&1 || true
        echo "  ■ $u 已停止"
      fi
    done
    ;;
  status)
    for u in "${UNITS[@]}"; do
      printf '%-22s %s\n' "$u" "$(systemctl --user is-active "$u" 2>/dev/null || echo inactive)"
    done
    echo
    IP="$(lan_ip || true)"; IP="${IP:-127.0.0.1}"
    CA="$CERT_DIR/dev-ca.crt"
    printf 'Panel  https://%s:8443/        ' "$IP"
    curl -s -o /dev/null -w '%{http_code}\n' --cacert "$CA" "https://$IP:8443/" || echo fail
    printf 'Probe  https://%s:8444/probe  ' "$IP"
    curl -s -o /dev/null -w '%{http_code}\n' --cacert "$CA" "https://$IP:8444/probe" || echo fail
    printf 'Probe  http://%s:8787/probe   ' "$IP"
    curl -s -o /dev/null -w '%{http_code}\n' "http://$IP:8787/probe" || echo fail
    ;;
  reverse)
    "$DIR/adb-connect.sh" reverse
    ;;
  *)
    echo "用法: $0 [up|down|status|reverse]" >&2
    exit 2
    ;;
esac
