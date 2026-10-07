#!/usr/bin/env python3
"""XR 就绪检测页的本地服务器。

- GET /            渲染 probe/index.html（检测页）
- POST /report     接收检测页回传的 JSON（追加写入 reports.log）

用法: python3 server.py [PORT]        默认 8787
"""
import json
import sys
import time
from http.server import HTTPServer, SimpleHTTPRequestHandler
from pathlib import Path

ROOT = Path(__file__).resolve().parent
LOG = ROOT / "reports.log"


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def _send(self, code: int, body: bytes = b"", ctype: str = "text/plain; charset=utf-8"):
        self.send_response(code)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        if body:
            self.wfile.write(body)

    def do_GET(self):  # noqa: N802
        if self.path in ("/", "/probe", "/probe/"):
            page = (ROOT / "index.html").read_bytes()
            return self._send(200, page, "text/html; charset=utf-8")
        if self.path == "/report":
            try:
                body = LOG.read_text(encoding="utf-8")
            except FileNotFoundError:
                body = ""
            return self._send(200, body.encode("utf-8"))
        if self.path in ("/ca.crt", "/dev-ca.crt"):
            # 本机开发根证书（可选安装到头显，减少 HTTPS 警告）：
            # 单独提供下载是因为证书本身是公开信息，明文 HTTP 分发无风险。
            ca = Path.home() / ".config" / "echo-agent-panel" / "dev-tls" / "dev-ca.crt"
            if not ca.is_file():
                return self._send(404, b"ca not generated yet")
            body = ca.read_bytes()
            self.send_response(200)
            self.send_header("Content-Type", "application/x-x509-ca-cert")
            self.send_header("Content-Disposition", 'attachment; filename="echo-agent-dev-ca.crt"')
            self.send_header("Content-Length", str(len(body)))
            self.send_header("Cache-Control", "no-store")
            self.end_headers()
            self.wfile.write(body)
            return
        return self._send(404, b"not found")

    def do_POST(self):  # noqa: N802
        if self.path != "/report":
            return self._send(404, b"not found")
        length = int(self.headers.get("Content-Length") or 0)
        raw = self.rfile.read(min(length, 256 * 1024))
        try:
            data = json.loads(raw.decode("utf-8", "replace"))
            pretty = json.dumps(data, ensure_ascii=False)
        except Exception:
            pretty = raw.decode("utf-8", "replace")
        line = f"[{time.strftime('%Y-%m-%d %H:%M:%S')}] {self.client_address[0]}  {pretty}\n"
        with LOG.open("a", encoding="utf-8") as fh:
            fh.write(line)
        print(line, end="", flush=True)
        return self._send(204)

    def log_message(self, fmt, *args):  # 精简访问日志
        print(f"{self.client_address[0]} {fmt % args}", flush=True)


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8787
    print(f"XR probe server: http://0.0.0.0:{port}/probe   报告落盘: {LOG}", flush=True)
    HTTPServer(("0.0.0.0", port), Handler).serve_forever()
