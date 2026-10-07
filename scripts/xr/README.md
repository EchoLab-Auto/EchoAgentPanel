# XR 开发支撑（安全上下文 + 巨幕模式 + 设备探测）

> 为 Panel 的 XR 化（在 PICO 4 Ultra 等头显里使用）解决第一层问题：
> **WebXR 只在「安全上下文（Secure Context）」里可用**——`https://` 或 `http://localhost`，
> 普通局域网 `http://192.168.x.x` 一律不可用（`navigator.xr === undefined`）。
> 在此之上落地 **XR-0 巨幕模式**：头显里把 Panel 当巨幕用（Web App 独立窗口 + 一键全屏）。
>
> **本目录的默认路线不使用 adb**：走自签 HTTPS（首次点一次「继续前往」）或
> `pico://flags` 白名单。adb 仅作为可选附录保留。

## XR-0 巨幕模式（已落地）

头显里使用现有 Panel 的三件套：

1. **安全上下文**（下面「无 adb 两条路线」任选其一）；
2. **PWA 清单**（`web/public/manifest.webmanifest` + 图标）——浏览器把它当作
   Web App / PWA 识别：PICO 浏览器地址栏出现「作为独立应用打开/运行」入口，
   桌面/移动 Chromium 则可「安装应用」；
3. **顶栏「全屏」按钮**——一键铺满视野（`fullscreenchange` 同步，Esc/系统退出自动还原）。

**两个入口形态（别混淆 · PICO OS 6 Web App 语义）**：

- **「作为独立应用运行」= 免安装**：从 URL 点开即获得一个**独立窗口**（无浏览器
  标签栏，像原生应用一样），用完即抛——不留图标、不触发 PWA 安装、不获得安装级
  权限。适合调试与临时使用。
- **「安装」= 真正的 PWA 安装（可选）**：在 Web App 窗口的 PWA 菜单里点「安装」
  才把应用装到设备——应用库 / Home 出现图标、可从图标启动、获得原生级权限（可在
  系统设置里管理）。**两者都不需要上架应用商店**，都是浏览器层的 PWA 机制。
- 我们已满足全部「可安装」条件（manifest 的 name / 192+512 图标 / start_url /
  display=standalone 齐备，HTTPS 提供；Chromium 实测**零安装性错误**，
  对照 MDN 现行标准逐项通过）。装与不装随你。

## 无 adb 两条路线

**路线 B（默认，自签 HTTPS + 点一次「继续前往」）**——推荐直接照下面的「三步上手」做。
自签证书的警告拦截是**可点继续**的（桌面 Chromium 已实测：点过后
`isSecureContext=true`、`navigator.xr` 就绪）；浏览器重启后可能再次弹警告，再点一次即可。

**路线 C（pico://flags 白名单，彻底无警告）**——若你的 PICO 系统支持内部网址：
头显浏览器打开 `pico://flags` → 搜索 `insecure` → 把 `http://192.168.31.35:8787`
（多个用逗号分隔）填入 **Insecure origins treated as secure** → 重启浏览器。
之后 http 入口即成为安全上下文，连警告都没有。（PICO 开发者文档：内部网址在
PICO OS 5.x 可用；OS 6 暂未开放、计划后续版本支持。）

**可选加强：装根证书**（减少警告，视浏览器是否信任用户 CA 而定）——检测页上有
「下载根证书」按钮（`/ca.crt`），装法：头显 设置 → 安全/加密与凭据 → 安装证书 →
**CA 证书** → 选刚下载的文件。若浏览器不信任用户证书，回退用「继续前往」，不影响 WebXR。

## 三步上手（无 adb）

```bash
# ① PC：一次性安装持久服务（开机自启）+ 启动（已在跑则幂等）
cd scripts/xr
./install-units.sh

# ② PICO 头显浏览器打开检测页（首次弹证书警告：高级 → 继续前往）
#    https://192.168.31.35:8444/probe
#    页面上会显示 isSecureContext / navigator.xr / immersive-vr 支持，并可一键试启 VR 会话

# ③ 检测页里点「打开 Panel（HTTPS）」→（同样点一次继续前往）→
#    地址栏「作为独立应用打开/运行」→ 顶栏「全屏」→ 巨幕就绪
```

PC 侧快查：`./start-all.sh status`（含 CA 下载连通性）；停止：`./start-all.sh down`。

### 服务与端口

| 单元（systemd user） | 端口 | 作用 |
|---|---|---|
| `echo-xr-probe` | `:8787` http | 就绪检测页 + 报告回传 + `/ca.crt` 下载 |
| `echo-xr-tls-panel` | `:8443` https | Panel 巨幕（TLS 终端 → 127.0.0.1:8080） |
| `echo-xr-tls-probe` | `:8444` https | 检测页的 HTTPS 版本 |

- 证书在每次启动前由 `ensure-cert.sh` 校验：**局域网 IP 变化会自动复用 CA 重签叶子证书**
  （设备侧无需重装，如装过 CA）。
- 若 mDNS 可用，也可用 `https://evence-4090-24.local:8443`（证书 SAN 已含该名）。

## 四条安全上下文路线总表（桌面 Chromium 已实测，PICO 侧待设备探测）

| # | 路线 | 机制 | 前置 | 实测（桌面 Chromium） |
|---|------|------|------|----------------------|
| B | **自签 HTTPS + 点过证书警告**（默认） | `https://` 本身就是安全上下文；「继续前往」后完全可用 | 本目录服务；头显上点一次警告 | ✅ `isSecureContext=true`、`navigator.xr` 就绪 |
| C | **`pico://flags`** 把 LAN http 加白名单 | 「Insecure origins treated as secure」让指定 http 源变安全 | PICO 内部网址可用（OS 5.x 可用；OS 6 暂未开放） | ✅ 同款 Chromium 开关实测有效 |
| D | **安装自签 CA 到设备**（可选加强） | 设备信任 CA 后 HTTPS 直接绿锁 | 设备证书安装入口 + 浏览器信任用户 CA | ✅（模拟「已信任」：`isSecureContext=true`） |
| A | （可选·需 adb）`adb reverse` → `http://localhost` | localhost 天然是安全上下文，零证书 | 开发者模式 + USB/Wi-Fi adb | ✅ `isSecureContext=true`，`navigator.xr` 就绪 |

> 表格右侧为**桌面 Chromium 的等价验证**（见 `secure-context-test.py` 与末节实验记录）；
> PICO 浏览器行为以设备检测页的实际回传为准。

## PC 侧操作（细节）

```bash
cd scripts/xr

./install-units.sh         # 安装持久单元（开机自启）并启动；幂等
./start-all.sh up          # 校验证书（IP 变化自动重签）+ 启动 + 打印入口
./start-all.sh down        # 停止
./start-all.sh status      # 状态 + 连通快测

./gen-certs.sh             # 手工重签证书（CA 只生成一次；叶子重签）
./tls-front.sh 8443 127.0.0.1:8080   # 前台跑 HTTPS 前端（调试用，Ctrl+C 退出）

# 附录·可选（需 adb；本目录默认路线不需要）
./adb-connect.sh usb && ./adb-connect.sh reverse
```

## PICO 侧操作（探测与巨幕模式）

1. **检测页**：头显浏览器打开 `https://192.168.31.35:8444/probe`——证书警告
   选「继续前往 / 高级」。看三行结论：`isSecureContext`（须为 true）、
   `navigator.xr`（须存在）、`immersive-vr`（支持）。
2. **试会话**：点检测页的「① 尝试启动 immersive-vr 会话」——戴上头显能看到
   WebXR 接管画面即全链路打通（8 秒后自动退出）。
3. **进 Panel**：点「打开 Panel（HTTPS）」→ 继续前往 → Panel 打开 →
   地址栏「作为独立应用打开/运行」→ 顶栏「全屏」。

> 检测页结果自动回传到 PC：`scripts/xr/probe/reports.log`
> （或浏览器访问 `http://127.0.0.1:8787/report` 直接看）。

## 文件说明

| 文件 | 作用 |
|------|------|
| `install-units.sh` | 安装三个持久 systemd 用户单元（开机自启）× 立即启动（幂等） |
| `start-all.sh` | 一键启停（up/down/status/reverse）：证书校验 + 三服务 |
| `ensure-cert.sh` | 证书体检：无则生成；IP 变化则复用 CA 重签叶子（供单元 ExecStartPre） |
| `gen-certs.sh` | 生成本地根 CA + 服务器证书（SAN 自动含 localhost/主机名/局域网 IP） |
| `tls-front.sh` | socat TLS 终端：`https://:端口 → http://127.0.0.1:端口`（HTTP+WS 全兼容） |
| `probe/server.py` | 检测页服务器：页面 / 报告回传 / 根证书下载（`/ca.crt`） |
| `probe/index.html` | 检测页：`isSecureContext` / `navigator.xr` / 会话试启 + 打开 Panel 入口 |
| `secure-context-test.py` | 桌面 Chromium 行为实验（Playwright，可复跑） |
| `adb-connect.sh` | （可选·附录）PICO adb 连接 + 端口反转 |

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
PICO 浏览器是 Chromium 系（PICO OS 5 浏览器为 Chromium 125+），但「警告能否继续」
「flags 是否开放」「用户 CA 是否被信任」需设备实测——用检测页判定。

## 备注

- **Panel HTTPS 口**：`8443`；检测页 HTTPS 口 `8444`；检测页 HTTP 口 `8787`（路线 C 用）。
- 证书目录：`~/.config/echo-agent-panel/dev-tls/`（`dev-ca.crt` 可下载到头显导入信任）。
- 停用持久单元：`systemctl --user disable --now echo-xr-probe echo-xr-tls-panel echo-xr-tls-probe`
- **Panel 侧 XR-0 资产（同仓库）**：PWA 清单 `web/public/manifest.webmanifest` + 图标
  `web/public/icons/*`（生成器 `web/scripts/gen-app-icons.py`）、顶栏「全屏」按钮
  （`web/src/components/FullscreenToggleButton.vue`）、静态服务 `.webmanifest` MIME
  （`source/echo-web-server/src/static_files.rs`）。
- （附录·PICO OS 6）对 Web App Runtime 的官方调试开关（需 adb）：
  `adb shell am broadcast -p com.picoxr.webappservice -a com.picoxr.webappservice.action.TOGGLE_DEBUG_MODE --ez enable true`
  可让其接受 HTTP（见 PICO WebSpatial 文档）。
