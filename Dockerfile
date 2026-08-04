# Build stage
FROM rust:1.92-bookworm AS builder
WORKDIR /build
COPY . .
RUN cargo build --release --workspace

# Runtime stage
FROM debian:bookworm-slim
RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=builder /build/target/release/echo-agent-panel /usr/local/bin/echo-agent-panel
COPY config/echo-agent-panel.toml /app/config/echo-agent-panel.toml
COPY skills/ /app/skills/

EXPOSE 3131
# Docker 内无 TTY，TUI 不可用，以 headless 模式运行
ENTRYPOINT ["echo-agent-panel", "--headless", "--config", "/app/config/echo-agent-panel.toml"]
