#!/usr/bin/env bash
# TLS 终结前端：把 https://<本机>:<LISTEN_PORT> 转发到本地明文 HTTP 目标。
#
# 用 socat 做「TLS 包裹 + 裸 TCP 转发」——HTTP/1.1 与 WebSocket 都是明文 TCP
# 协议，因此天然兼容 Panel 的 HTTP + /ws 双通道，无需任何转发中间件。
#
# 用法：
#   ./tls-front.sh                    # https://*:8443 → 127.0.0.1:8080（Panel）
#   ./tls-front.sh 8444 127.0.0.1:8787  # 自定义：监听端口 + 目标
#
# 前置：先跑 ./gen-certs.sh 生成证书。
set -Eeuo pipefail

DIR="${XR_TLS_DIR:-$HOME/.config/echo-agent-panel/dev-tls}"
PORT="${1:-8443}"
TARGET="${2:-127.0.0.1:8080}"

if [ ! -f "$DIR/panel-fullchain.crt" ] || [ ! -f "$DIR/panel.key" ]; then
  echo "❌ 未找到证书（$DIR），请先运行 ./gen-certs.sh" >&2
  exit 1
fi

echo "🔒 https://0.0.0.0:${PORT}  →  http://${TARGET}  （Ctrl+C 退出）"
exec socat "OPENSSL-LISTEN:${PORT},reuseaddr,fork,verify=0,cert=${DIR}/panel-fullchain.crt,key=${DIR}/panel.key" "TCP:${TARGET}"
