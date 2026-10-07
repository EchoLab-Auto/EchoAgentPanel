# XR 开发支撑（安全上下文 + 设备探测）

> 为 Panel 的 XR 化（在 PICO 4 Ultra 等头显里用 WebXR）解决第一个拦路石：
> **WebXR 只在「安全上下文（Secure Context）」里可用**——`https://` 或 `http://localhost`，
> 普通局域网 `http://192.168.x.x` 一律不可用（`navigator.xr === undefined`）。

## 四条可用路线（桌面 Chromium 已实测，PICO 侧待设备探测）

| # | 路线 | 机制 | 前置 | 实测（桌面 Chromium） |
|---|------|------|------|----------------------|
| A | **adb reverse** → `http://localhost:8080` | localhost 天然是安全上下文（规范例外），**无需任何证书** | PICO 开开发者模式 + USB/Wi-Fi adb | ✅ `isSecureContext=true`，`navigator.xr` 就绪 |
| B | **自签 HTTPS + 点过证书警告** | `https://` 本身就是安全上下文；证书警告「继续前往」不影响 | 跑 `tls-front.sh`；头显上点一次警告 | ✅ 点过后 `isSecureContext=true`、`navigator.xr` 就绪 |
| C | **`pico://flags`** 把 LAN http 加白名单 | 「Insecure origins treated as secure」让指定 http 源变安全 | PICO 浏览器支持内部网址（PICO OS 5.x 可用；OS 6 暂未开放） | ✅ 同款 Chromium 开关实测有效（完整版 Chromium） |
| D | **安装自签 CA 到设备** | 设备信任 CA 后 HTTPS 直接绿锁 | 设备有证书安装入口且浏览器信任用户 CA | ✅（模拟「已信任」：`isSecureContext=true`） |

> 表格右侧为**桌面 Chromium 的等价验证**（见 `secure-context-test.py` 与本目录 README 末节）；
> PICO 浏览器行为以设备探测页的实际回传为准。

## 快速开始（PC 侧，已就绪）

```bash
cd scripts/xr

# ① 生成证书（CA 只生成一次，叶子每次重签；SAN 自动含局域网 IP）
./gen-certs.sh

# ② HTTPS 前端（前台跑；8443 → Panel 8080）
./tls-front.sh                 # https://192.168.31.35:8443 → http://127.0.0.1:8080

# ③ adb（PICO 装好「开发者模式 + USB 调试」后）
./adb-connect.sh usb           # USB 直连
./adb-connect.sh reverse       # 8080/8443/8787/8444 端口反转
./adb-connect.sh tcpip         # （可选）切成无线，然后拔线
./adb-connect.sh wifi <PICO_IP>  # 无线连接，再执行一次 reverse

# ④ 就绪检测页服务（本目录常驻：8787 http / 8444 https）
python3 probe/server.py 8787
```

## PICO 侧操作（三种路线）

**路线 A（推荐先试，零证书）**：头显设置 → 通用 → 关于本机 → 连点「软件版本号」直到出现「开发者」→ 打开「USB 调试」；PC 执行 `./adb-connect.sh usb && ./adb-connect.sh reverse`；头显浏览器打开 **`http://localhost:8787/probe`**。

**路线 B（自签 HTTPS）**：头显浏览器直接打开 **`https://192.168.31.35:8444/probe`**；出现证书警告时选「继续前往 / 高级」；然后看页面上的检测结果。

**路线 C（pico://flags）**：头显浏览器打开 `pico://flags`，搜索 `insecure`，把
`http://192.168.31.35:8787`（多个用逗号分隔）填入「Insecure origins treated as secure」，重启浏览器；打开 **`http://192.168.31.35:8787/probe`**。

> 检测页会把结果自动回传到 PC：`scripts/xr/probe/reports.log`（或浏览器访问 `http://127.0.0.1:8787/report` 直接看）。
> 页面上还会有一个「启动 immersive-vr 会话」按钮——**能启动就说明全链路打通**。

## 文件说明

| 文件 | 作用 |
|------|------|
| `gen-certs.sh` | 生成本地根 CA + 服务器证书（SAN 自动含 localhost/主机名/局域网 IP） |
| `tls-front.sh` | socat TLS 终结前端：`https://:8443 → http://127.0.0.1:8080`（HTTP+WS 全兼容） |
| `adb-connect.sh` | PICO adb 连接 + 端口反转辅助（usb/wifi/tcpip/reverse/unreachable 状态） |
| `probe/server.py` | 就绪检测页服务器（收集设备回传报告） |
| `probe/index.html` | 检测页：显示 `isSecureContext` / `navigator.xr` / 会话支持，可一键试启 VR 会话 |
| `secure-context-test.py` | 桌面 Chromium 行为实验（Playwright，可复跑） |

## 桌面 Chromium 实验记录（2026-10，Playwright + Chromium 153）

| 场景 | isSecureContext | navigator.xr |
|------|:---:|:---:|
| `http://127.0.0.1`（loopback） | true | ✅ |
| `http://localhost` | true | ✅ |
| `http://192.168.31.35`（LAN） | false | ❌ |
| `https://` 自签 + CDP 模拟「继续前往」 | true | ✅ |
| `https://` 自签 + 浏览器级信任（≈装 CA） | true | ✅ |
| `http://LAN` + `--unsafely-treat-insecure-origin-as-secure` | true | ✅ |

结论：**四条路线在 Chromium 引擎层面全部成立**（LAN 明文 HTTP 是唯一的死路）。
PICO 浏览器是 Chromium 系（PICO OS 5 浏览器为 Chromium 125+），但「警告能否继续」「flags 是否开放」「用户 CA 是否被信任」需设备实测——用检测页判定。

## 备注

- **Panel HTTPS 口**：`8443`（`tls-front.sh` 默认）；检测页 HTTPS 口 `8444`。
- 证书目录：`~/.config/echo-agent-panel/dev-tls/`（`dev-ca.crt` 可用于给其他设备/工具导入信任）。
- adb 位置：`~/.local/opt/platform-tools/adb`（`adb-connect.sh` 默认使用；可用 `ADB=` 覆盖）。
- PICO OS 6 设备另有官方调试口子：对 Web App Runtime 可用
  `adb shell am broadcast -p com.picoxr.webappservice -a com.picoxr.webappservice.action.TOGGLE_DEBUG_MODE --ez enable true`
  让其接受 HTTP（见 PICO WebSpatial 文档）；PICO OS 5.x（PICO 4 Ultra 现役系统）以本目录三条路线为准。
