# EchoAgentPanel — Web 面板服务镜像（Rust 后端 + 预构建前端）。
#
# 容器化部署（2026-09-24）：与 EchoAgentCore 同一 compose 网络——
#   - Panel → Core：ws://core:3132（[core] connect_url）
#   - 媒体库：与 Core 共享 /data 挂载，[server] media_dir = /data/media
#     否则消息里的图片（/media/<id>）会 404。
#
# 镜像内含已构建的前端（web/dist），无需宿主 Node；
# 页面在 http://<host>:8080。
#
# 构建（需在仓库根目录）：
#   docker build -t echo-agent-panel:local .

# ── Stage 1: 前端构建 ──
FROM node:22-bookworm-slim AS webbuilder
WORKDIR /web
COPY web/package.json web/package-lock.json ./
RUN npm ci
COPY web/ ./
RUN npm run build

# ── Stage 2: Rust 后端构建 ──
FROM rust:1.92-bookworm AS builder
WORKDIR /app
COPY Cargo.toml Cargo.lock ./
COPY source ./source
RUN cargo build --release --locked -p echo-web-server

# ── Stage 3: 运行镜像 ──
FROM debian:bookworm-slim
RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates \
    && apt-get clean \
    && find /var/lib/apt/lists -mindepth 1 -delete

WORKDIR /app
COPY --from=builder /app/target/release/echo-agent-panel /usr/local/bin/echo-agent-panel
COPY --from=webbuilder /web/dist /app/web
COPY config/echo-agent-panel.toml /app/config/echo-agent-panel.toml
COPY docker/entrypoint.sh /usr/local/bin/echo-agent-entrypoint

RUN mkdir -p /config /data && chmod +x /usr/local/bin/echo-agent-entrypoint

# 8080: 面板 HTTP/WS（浏览器入口）
EXPOSE 8080

# 配置解析顺序：$ECHO_CONFIG → /config/panel.toml → 镜像内置默认。
ENTRYPOINT ["/usr/local/bin/echo-agent-entrypoint"]
