#!/usr/bin/env python3
"""桌面 Chromium「WebXR 安全上下文」行为实验（修正版）。

E1: http://127.0.0.1        → 预期 secure=true（localhost 白名单）
E2: http://192.168.31.35    → 预期 secure=false（问题根因）
E3: https://自签 + CDP 模拟「用户点过证书警告」 → 关键结论
E4: http://LAN + --unsafely-treat-insecure-origin-as-secure → 关键结论（pico://flags 类似物）
E5: https://自签 + 浏览器级忽略证书错误（≈设备已信任该 CA） → 关键结论
"""
import json
from playwright.sync_api import sync_playwright

LOOPBACK = "http://127.0.0.1:8787/probe"
LAN = "http://192.168.31.35:8787/probe"
LAN_TLS = "https://192.168.31.35:8444/probe"

JS = "() => ({ secure: window.isSecureContext, hasXR: 'xr' in navigator, href: location.href })"


def read(page, label):
    try:
        info = page.evaluate(JS)
    except Exception as e:
        info = {"error": str(e)[:140]}
    print(f"[{label}]\n    {json.dumps(info, ensure_ascii=False)}", flush=True)
    return info


def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)

        ctx = browser.new_context(locale="en-US")
        page = ctx.new_page()
        page.goto(LOOPBACK, timeout=15000)
        read(page, "E1 loopback http")
        page.goto(LAN, timeout=15000)
        read(page, "E2 LAN http")
        ctx.close()

        # E3: CDP 模拟用户点过证书警告
        ctx = browser.new_context(locale="en-US")
        page = ctx.new_page()
        cdp = ctx.new_cdp_session(page)
        cdp.send("Security.enable")
        cdp.send("Security.setOverrideCertificateErrors", {"override": True})

        def on_cert(params):
            try:
                cdp.send("Security.handleCertificateError", {"eventId": params["eventId"], "action": "continue"})
                print("    (cert error 事件 → action=continue 模拟“继续前往”)", flush=True)
            except Exception as e:
                print("    (handleCertificateError failed:", e, ")", flush=True)

        cdp.on("Security.certificateError", on_cert)
        try:
            page.goto(LAN_TLS, timeout=20000)
        except Exception as e:
            print("    goto 异常:", str(e)[:100], flush=True)
        page.wait_for_timeout(1200)
        read(page, "E3 自签 HTTPS + 点过警告")
        ctx.close()

        browser.close()

    # E4: 启动参数把 LAN http 加入安全白名单
    with sync_playwright() as p:
        browser = p.chromium.launch(
            headless=True,
            args=["--unsafely-treat-insecure-origin-as-secure=http://192.168.31.35:8787"],
        )
        ctx = browser.new_context(locale="en-US")
        page = ctx.new_page()
        page.goto(LAN, timeout=15000)
        read(page, "E4 LAN http + unsafely-treat-insecure-origin-as-secure")
        browser.close()

    # E5: 浏览器级忽略证书错误（近似“设备已信任自签 CA”）
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        ctx = browser.new_context(locale="en-US", ignore_https_errors=True)
        page = ctx.new_page()
        page.goto(LAN_TLS, timeout=15000)
        read(page, "E5 自签 HTTPS + 强制信任（≈已安装 CA）")
        browser.close()


if __name__ == "__main__":
    main()
