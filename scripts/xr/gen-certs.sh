#!/usr/bin/env bash
# 生成 XR 开发生用的本地 HTTPS 证书（自签 CA + 服务器证书）。
#
# 产物（默认 $HOME/.config/echo-agent-panel/dev-tls/）：
#   dev-ca.crt / dev-ca.key     —— 本地根 CA（把它装到设备上，或用于 curl --cacert）
#   panel.crt / panel.key       —— 服务器证书（SAN 覆盖本机域名与局域网 IP）
#   panel-fullchain.crt         —— leaf + CA 链（socat / 服务器用）
#
# 用法：
#   ./gen-certs.sh                    # 自动收集：localhost、本机名、本机名.local、127.0.0.1、默认路由网卡 IP
#   ./gen-certs.sh IP:10.10.10.100    # 追加 SAN（可多个；IP: 或 DNS: 前缀）
#
# 注意：CA 只生成一次（存在则复用），叶子证书每次重新签发——
# 设备上装过一次 CA 后，重跑本脚本无需重装。
set -Eeuo pipefail

OUT_DIR="${OUT_DIR:-$HOME/.config/echo-agent-panel/dev-tls}"
DAYS_CA="${DAYS_CA:-3650}"
DAYS_LEAF="${DAYS_LEAF:-825}"

mkdir -p "$OUT_DIR"
cd "$OUT_DIR"

HOST="$(hostname)"
SANS="DNS:localhost,DNS:${HOST},DNS:${HOST}.local,IP:127.0.0.1"
# 默认路由网卡的 IPv4（即头显能访问到的局域网/隧道地址）
LAN_IP="$(ip -4 route get 1.1.1.1 2>/dev/null | awk '{for(i=1;i<=NF;i++) if($i=="src"){print $(i+1); exit}}' || true)"
if [ -n "${LAN_IP:-}" ]; then
  SANS="${SANS},IP:${LAN_IP}"
fi
for extra in "$@"; do
  SANS="${SANS},${extra}"
done

echo "📌 SAN: ${SANS}"

if [ ! -f dev-ca.crt ]; then
  echo "🔐 生成新的本地根 CA（dev-ca）…"
  openssl genrsa -out dev-ca.key 2048 2>/dev/null
  openssl req -x509 -new -key dev-ca.key -sha256 -days "$DAYS_CA" \
    -subj "/CN=EchoAgent XR Dev CA/O=EchoAgent Local Dev" \
    -addext "basicConstraints=critical,CA:TRUE" \
    -addext "keyUsage=critical,keyCertSign,cRLSign" \
    -out dev-ca.crt
else
  echo "🔐 复用既有根 CA（dev-ca.crt）"
fi

echo "🔏 签发服务器证书（panel）…"
openssl genrsa -out panel.key 2048 2>/dev/null
openssl req -new -key panel.key -subj "/CN=echo-agent-panel-dev/O=EchoAgent Local Dev" -out panel.csr
cat > san.cnf <<EOF
subjectAltName=${SANS}
extendedKeyUsage=serverAuth
keyUsage=critical,digitalSignature,keyEncipherment
EOF
openssl x509 -req -in panel.csr -CA dev-ca.crt -CAkey dev-ca.key -CAcreateserial \
  -days "$DAYS_LEAF" -sha256 -extfile san.cnf -out panel.crt 2>/dev/null
cat panel.crt dev-ca.crt > panel-fullchain.crt
rm -f panel.csr san.cnf

chmod 600 dev-ca.key panel.key
echo
echo "✅ 证书就绪：$OUT_DIR"
openssl x509 -in panel.crt -noout -subject -ext subjectAltName
echo
echo "下一步："
echo "  · PC 端验证：  curl --cacert $OUT_DIR/dev-ca.crt https://127.0.0.1:8443/"
echo "  · PICO 端安装 CA（可选）： 把 dev-ca.crt 传到头显后按系统设置安装（详见 README）"
