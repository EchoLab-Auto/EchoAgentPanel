#!/usr/bin/env bash
# 确保 HTTPS 前端所需的叶子证书存在且覆盖当前局域网 IP。
#
#   - 首次（无证书）：全量生成（CA + 叶子）
#   - 已有且 SAN 含当前 IP：不动
#   - 已有但 SAN 缺当前 IP（换网络 / 换网卡）：复用 CA 重签叶子（设备已装过 CA 无需重装）
#
# 供 systemd 单元 ExecStartPre 调用，也可手工执行。
set -Eeuo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CERT_DIR="${XR_TLS_DIR:-$HOME/.config/echo-agent-panel/dev-tls}"
CERT="$CERT_DIR/panel.crt"

ip_now() {
  ip -4 route get 1.1.1.1 2>/dev/null |
    awk '{for (i = 1; i <= NF; i++) if ($i == "src") { print $(i + 1); exit }}'
}

IP="$(ip_now || true)"

if [ ! -f "$CERT" ]; then
  echo "🔐 无证书，全量生成…"
  exec "$DIR/gen-certs.sh"
fi

if [ -n "${IP:-}" ]; then
  if ! openssl x509 -in "$CERT" -noout -ext subjectAltName 2>/dev/null |
    grep -Eq "IP Address:$IP([,[:space:]]|$)"; then
    echo "🔐 当前 IP $IP 不在证书 SAN 中，复用 CA 重签叶子证书…"
    exec "$DIR/gen-certs.sh"
  fi
fi

echo "🔐 证书就绪（SAN 覆盖 ${IP:-无局域网 IP}）"
