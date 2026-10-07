#!/usr/bin/env bash
# PICO 设备 adb 连接与端口反转辅助（XR 开发用）。
#
# 前置（在头显上一次性完成）：
#   设置 > 通用 > 关于本机 > 连点「软件版本号」若干次 → 出现「开发者」→
#   打开「USB 调试」。
#
# 用法：
#   ./adb-connect.sh status             # 查看设备与反转状态
#   ./adb-connect.sh usb                # USB 直连（插线后）——列出设备
#   ./adb-connect.sh wifi <PICO_IP>     # Wi-Fi 无线 adb（需此前 USB 执行过一次 tcpip 5555）
#   ./adb-connect.sh tcpip              # USB 在线时切换设备到无线监听 5555（之后可拔线）
#   ./adb-connect.sh reverse            # 对当前连接设备建立端口反转（8080/8443/8787/8444）
#   ./adb-connect.sh unreverse          # 清理端口反转
#
# 反转后，头显浏览器里访问 http://localhost:8080 即本机 Panel
# （localhost 是安全上下文 → WebXR 可用，无需任何证书）。
set -Eeuo pipefail

ADB="${ADB:-$HOME/.local/opt/platform-tools/adb}"
PORTS="${XR_REVERSE_PORTS:-8080 8443 8787 8444}"

if [ ! -x "$ADB" ]; then
  echo "❌ 未找到 adb：$ADB" >&2
  echo "   下载：curl -Lo /tmp/pt.zip https://dl.google.com/android/repository/platform-tools-latest-linux.zip" >&2
  echo "         unzip -q -o /tmp/pt.zip -d ~/.local/opt/" >&2
  exit 1
fi

cmd="${1:-status}"
shift || true

case "$cmd" in
  status)
    echo "== 设备 =="; "$ADB" devices -l
    echo; echo "== 端口反转 =="; "$ADB" reverse --list || true
    ;;
  usb)
    "$ADB" kill-server >/dev/null 2>&1 || true
    "$ADB" start-server >/dev/null
    "$ADB" devices -l
    ;;
  tcpip)
    "$ADB" tcpip "${1:-5555}"
    ;;
  wifi)
    ip="${1:?用法: adb-connect.sh wifi <PICO_IP>}"
    "$ADB" connect "${ip}:5555"
    "$ADB" devices -l
    ;;
  reverse)
    for p in $PORTS; do
      "$ADB" reverse "tcp:${p}" "tcp:${p}" && echo "✅ reverse tcp:${p} → tcp:${p}"
    done
    "$ADB" reverse --list
    ;;
  unreverse)
    for p in $PORTS; do
      "$ADB" reverse --remove "tcp:${p}" 2>/dev/null || true
    done
    "$ADB" reverse --list || true
    ;;
  *)
    echo "未知命令: $cmd" >&2; exit 2
    ;;
esac
