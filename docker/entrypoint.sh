#!/bin/sh
# EchoAgentPanel 容器入口：解析配置路径并启动。
#
# 优先级：$ECHO_CONFIG → /config/panel.toml（compose 绑定挂载）→ 镜像内置默认。
# 静态目录固定为镜像内 /app/web（前端构建产物）。
set -e

CONFIG="${ECHO_CONFIG:-/config/panel.toml}"
if [ ! -f "$CONFIG" ]; then
  echo "[entrypoint] $CONFIG 不存在，回退镜像内置配置 /app/config/echo-agent-panel.toml" >&2
  CONFIG=/app/config/echo-agent-panel.toml
fi

exec echo-agent-panel --config "$CONFIG" --static-dir /app/web
