#!/usr/bin/env bash
# XR 开发环境一键启停（Panel HTTPS 前端 + 就绪检测页 + 检测页 HTTPS）。
#
# 组件：
#   echo-xr-tls-panel   https://0.0.0.0:8443 → Panel  127.0.0.1:8080
#   echo-xr-probe       就绪检测页          http://0.0.0.0:8787
#   echo-xr-tls-probe   就绪检测页          https://0.0.0.0:8444
#
# 用法:
#   ./start-all.sh up       证书校验（IP 变化自动重签）+ 启动全部 + 打印访问地址
#   ./start-all.sh down     停止全部
#   ./start-all.sh status   状态 + 连通快测
#   ./start-all.sh reverse  （可选·需 adb）对已连接的 PICO 建立端口反转
#
# 注：若已运行 ./install-units.sh，本脚本对「持久单元」生效（开机自启）；
#     未安装时以 transient 方式临时启动（重启后消失），并提示安装。
set -Eeuo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
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
  if [ -f "$HOME/.config/systemd/user/$unit.service" ]; then
    systemctl --user start "$unit"
    echo "  ▶ $unit 已启动（持久单元）"
  else
    systemd-run --user --collect --unit="$unit" --description="$desc" \
      --property=Restart=on-failure -- "$@" >/dev/null
    echo "  ▶ $unit 已启动（临时；./install-units.sh 可安装为持久单元）"
  fi
}

case "${1:-up}" in
  up)
    echo "🔐 证书检查…"
    "$DIR/ensure-cert.sh"

    echo "🚀 启动 XR 服务…"
    start_unit echo-xr-tls-panel "XR Dev: Panel HTTPS 前端 (8443→8080)" "$DIR/tls-front.sh" 8443 127.0.0.1:8080
    start_unit echo-xr-probe     "XR Dev: 就绪检测页服务器 (:8787)"       /usr/bin/python3 "$DIR/probe/server.py" 8787
    start_unit echo-xr-tls-probe "XR Dev: 检测页 HTTPS 前端 (8444→8787)" "$DIR/tls-front.sh" 8444 127.0.0.1:8787
    sleep 1

    IP="$(lan_ip || true)"; IP="${IP:-<本机IP>}"
    cat <<EOF

════════ 访问入口（PICO 头显里打开 · 无需 adb）════════

① 就绪检测页（先看这个，判定安全上下文 / WebXR 可用性）
   https://${IP}:8444/probe        ← 首次弹证书警告：高级 → 继续前往
   或 http://${IP}:8787/probe      （若已用 pico://flags 把本地址加白）

② Panel 巨幕（可直接打开；检测页里有入口按钮）
   https://${IP}:8443              ← 首次弹证书警告：高级 → 继续前往
   打开后：地址栏「作为独立应用打开/运行」→ 顶栏「全屏」

③（可选）把根证书装到头显，减少警告：检测页里有「下载根证书」按钮
   CA 文件：~/.config/echo-agent-panel/dev-tls/dev-ca.crt

PC 端快查：./start-all.sh status ; 停止：./start-all.sh down
EOF
    ;;
  down)
    for u in "${UNITS[@]}"; do
      systemctl --user stop "$u" 2>/dev/null || true
      if [ -f "$HOME/.config/systemd/user/$u.service" ]; then
        echo "  ■ $u 已停止（持久单元仍启用，下次登录自启；不想自启用 disable）"
      else
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
    CA="$HOME/.config/echo-agent-panel/dev-tls/dev-ca.crt"
    printf 'Panel     https://%s:8443/        ' "$IP"
    curl -s -o /dev/null -w '%{http_code}\n' --cacert "$CA" "https://$IP:8443/" || echo fail
    printf 'Probe     https://%s:8444/probe  ' "$IP"
    curl -s -o /dev/null -w '%{http_code}\n' --cacert "$CA" "https://$IP:8444/probe" || echo fail
    printf 'Probe     http://%s:8787/probe   ' "$IP"
    curl -s -o /dev/null -w '%{http_code}\n' "http://$IP:8787/probe" || echo fail
    printf 'CA 下载   http://%s:8787/ca.crt  ' "$IP"
    curl -s -o /dev/null -w '%{http_code}\n' "http://$IP:8787/ca.crt" || echo fail
    ;;
  reverse)
    "$DIR/adb-connect.sh" reverse
    ;;
  *)
    echo "用法: $0 [up|down|status|reverse]" >&2
    exit 2
    ;;
esac
