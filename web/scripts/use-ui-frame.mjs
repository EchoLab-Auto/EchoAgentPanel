#!/usr/bin/env node
//! ui-frame 引用方式切换（开发用）。
//!
//! Panel 默认以 `file:./vendor/ui-frame`（仓库内提交的本地快照）引用组件库；
//! 本脚本支持在「本地快照」与「npm 已发布包」之间切换，并配套同步/差异检查：
//!
//! ```bash
//! npm run ui-frame:status            # 当前模式 + 安装形态 + npm dist-tags 对照
//! npm run ui-frame:local             # 切回本地快照（file:./vendor/ui-frame）
//! npm run ui-frame:npm               # 切到 npm 包（默认跟随当前通道：vendor 为
//!                                    #   预发布时解析 dev 标签，否则 latest）
//! npm run ui-frame:npm -- 1.3.2      # 指定版本/范围/标签（一律解析为精确版本写入）
//! npm run ui-frame:sync              # 从 ui-frame 源码仓库刷新 vendor 快照
//! npm run ui-frame:sync -- --build   # 先构建源码仓库再刷新
//! npm run ui-frame:diff              # 对比 vendor 与 npm 版本（未发布改动清单）
//! npm run ui-frame:diff -- 1.3.2     # 指定对比目标
//! ```
//!
//! 设计口径：
//! - **package.json 的依赖行是唯一事实来源**——切换即改这一行 + `npm install`；
//!   切换结果会出现在 git diff 里（有意如此，便于审阅/回滚）。
//! - 两个方向都**显式传 spec** 给 npm install：npm 12 在「软链已满足新 spec 的
//!   版本号」时裸 `npm install` 会误判 up-to-date 而不重建（实测），显式 spec 才
//!   会真正把 link 换成 registry 副本、或反向重建 link。
//! - npm 模式一律写入**精确版本**（tag/范围即写即解析）；本地模式写回仓库约定
//!   的 `file:./vendor/ui-frame`（npm 自身会规范化为 `file:vendor/ui-frame`，
//!   脚本在安装后改回约定写法，避免无意义的行差异）。
//! - `sync` 只刷新本地快照（vendor 目录），不改依赖行；当前若非 local 模式会提示。
//! - `diff` 对 vendor 与 npm tarball 做整目录比对，回答「切到 npm 会丢什么」——
//!   vendor 常含未发布的本地修复（如 useClipboard 非安全上下文兜底）。

import { execFileSync } from 'node:child_process';
import {
  cpSync,
  existsSync,
  lstatSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  readlinkSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const WEB_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PACKAGE_JSON = join(WEB_DIR, 'package.json');
const VENDOR_DIR = join(WEB_DIR, 'vendor', 'ui-frame');
const PKG_NAME = '@echolab-auto/ui-frame';
/** 仓库约定的本地快照写法（npm 会规范化为 `file:vendor/ui-frame`，安装后改回）。 */
const LOCAL_SPEC = 'file:./vendor/ui-frame';
/** 传给 `npm install` 的位置参数（目录形式）。 */
const LOCAL_INSTALL_ARG = './vendor/ui-frame';
/** 源码仓库默认位置（可用环境变量 UI_FRAME_REPO 覆盖）。 */
const DEFAULT_REPO = join(
  process.env.HOME ?? '',
  'code_file/gitlab/echo-tech/ui-frame',
);

const [command, ...rest] = process.argv.slice(2);
const args = rest.filter((a) => !a.startsWith('--'));
const flags = new Set(rest.filter((a) => a.startsWith('--')));
const noInstall = flags.has('--no-install');

function fail(message) {
  console.error(`✗ ${message}`);
  process.exit(1);
}

/** 子进程环境：剥掉父 npm 注入的 `npm_config_allow_scripts`。
 *
 * npm 12 把经 `npm run` 注入的 `npm_config_*` 环境变量当作 CLI 选项解析；
 * 用户级 `~/.npmrc` 的 `allow-scripts` 会在嵌套 `npm install` 时变成
 * `--allow-scripts`，而 project-scoped install 拒绝该选项（EALLOWSCRIPTS，
 * 退出码 1）。名称改为「allowScripts 字段」后 .npmrc 那行本就已被忽略，
 * 剥离它对结果无副作用。 */
function npmEnv() {
  const env = { ...process.env };
  delete env.npm_config_allow_scripts;
  return env;
}

/** 用 node 直接调 npm（`npm run` 环境下 npm_execpath 指向 npm-cli.js）。 */
function npmIn(cwd, argv, { inherit = false } = {}) {
  const cli = process.env.npm_execpath;
  const [bin, prefix] =
    cli && existsSync(cli) ? [process.execPath, [cli]] : ['npm', []];
  return execFileSync(bin, [...prefix, ...argv], {
    cwd,
    encoding: 'utf8',
    stdio: inherit ? 'inherit' : 'pipe',
    env: npmEnv(),
  });
}

function install(argv, label) {
  if (noInstall) {
    console.log('（--no-install：跳过 npm install——node_modules 需另行同步）');
    return;
  }
  console.log(`→ npm install ${label} …`);
  npmIn(WEB_DIR, ['install', ...argv, '--no-audit', '--no-fund'], {
    inherit: true,
  });
}

/** 读 package.json 依赖行 spec。 */
function currentSpec() {
  const text = readFileSync(PACKAGE_JSON, 'utf8');
  const match = text.match(new RegExp(`"${PKG_NAME}":\\s*"([^"]+)"`));
  if (!match) fail(`package.json 中未找到 ${PKG_NAME} 依赖`);
  return match[1];
}

/** 仅替换依赖行（package.json 其余格式保持不变）；已是目标则 no-op。 */
function setSpec(spec) {
  if (currentSpec() === spec) return;
  const text = readFileSync(PACKAGE_JSON, 'utf8');
  const next = text.replace(
    new RegExp(`("@echolab-auto/ui-frame":\\s*)"[^"]+"`),
    `$1"${spec}"`,
  );
  if (next === text) fail(`写入依赖行失败：${spec}`);
  writeFileSync(PACKAGE_JSON, next);
}

function mode(spec) {
  if (spec.startsWith('file:')) return 'local';
  if (spec.startsWith('link:') || spec.startsWith('portal:')) return 'link';
  return 'npm';
}

/** node_modules 里 ui-frame 的安装形态：符号链接（本地）还是真实目录（npm 包）。 */
function installShape() {
  const installed = join(WEB_DIR, 'node_modules', ...PKG_NAME.split('/'));
  try {
    if (lstatSync(installed).isSymbolicLink()) {
      return `符号链接 → ${readlinkSync(installed)}`;
    }
    const version = JSON.parse(
      readFileSync(join(installed, 'package.json'), 'utf8'),
    ).version;
    return `真实目录（${version}）`;
  } catch {
    return '未安装';
  }
}

function vendorVersion() {
  try {
    return JSON.parse(
      readFileSync(join(VENDOR_DIR, 'package.json'), 'utf8'),
    ).version;
  } catch {
    return '(缺失)';
  }
}

function distTags() {
  try {
    // `npm view ... --json` 对多值字段会包一层数组（单对象在内），规整掉。
    const parsed = JSON.parse(
      npmIn(WEB_DIR, ['view', PKG_NAME, 'dist-tags', '--json']),
    );
    return Array.isArray(parsed) ? parsed[parsed.length - 1] : parsed;
  } catch (error) {
    fail(`查询 npm dist-tags 失败：${error.message}`);
  }
}

function resolveVersion(spec) {
  const raw = npmIn(WEB_DIR, [
    'view',
    `${PKG_NAME}@${spec}`,
    'version',
    '--json',
  ]).trim();
  const parsed = JSON.parse(raw);
  const version = Array.isArray(parsed) ? parsed[parsed.length - 1] : parsed;
  if (typeof version !== 'string' || !version) fail(`无法解析版本：${spec}`);
  return version;
}

function countFiles(dir) {
  let count = 0;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    count += entry.isDirectory() ? countFiles(join(dir, entry.name)) : 1;
  }
  return count;
}

function status() {
  const spec = currentSpec();
  console.log(`依赖声明   : ${PKG_NAME} @ ${spec}   [${mode(spec)}]`);
  console.log(`安装形态   : ${installShape()}`);
  const dist = join(VENDOR_DIR, 'dist');
  console.log(
    `vendor     : version=${vendorVersion()}  dist=${existsSync(dist) ? `${countFiles(dist)} 文件` : '缺失'}`,
  );
  try {
    const tags = distTags();
    console.log('npm 发布版 :');
    for (const [tag, version] of Object.entries(tags)) {
      console.log(`  ${tag.padEnd(8)} ${version}`);
    }
  } catch {
    console.log('npm 发布版 : （查询失败，离线？）');
  }
  console.log('');
  console.log('切换：npm run ui-frame:local | ui-frame:npm [-- <spec>]');
  console.log(
    '同步：npm run ui-frame:sync [-- --build]    差异：npm run ui-frame:diff [-- <spec>]',
  );
}

function useLocal() {
  if (!existsSync(join(VENDOR_DIR, 'dist'))) {
    fail(`vendor 快照缺失：${VENDOR_DIR}（先跑 npm run ui-frame:sync）`);
  }
  setSpec(LOCAL_SPEC);
  install([LOCAL_INSTALL_ARG], `${LOCAL_INSTALL_ARG}（本地快照）`);
  // npm 会把 spec 规范化为 `file:vendor/ui-frame`；改回仓库约定写法。
  setSpec(LOCAL_SPEC);
  console.log(
    `✓ 已切到本地快照：${LOCAL_SPEC}（vendor version=${vendorVersion()}）`,
  );
  console.log(
    '提示：改过 ui-frame 源码后，用 `npm run ui-frame:sync` 刷新快照；dev server 若缓存未刷新，重启或 `npm run dev -- --force`。',
  );
}

function useNpm() {
  const vendor = vendorVersion();
  // 默认跟随当前通道：vendor 是预发布（含 `-`）时解析 dev 标签，否则 latest。
  const requested = args[0] ?? (vendor.includes('-') ? 'dev' : 'latest');
  const version = resolveVersion(requested);
  install(
    [`${PKG_NAME}@${version}`, '--save-exact'],
    `${PKG_NAME}@${version}（npm 包）`,
  );
  setSpec(version);
  console.log(`✓ 已切到 npm 包：${version}（由 ${requested} 解析，写为精确版本）`);
}

function sync() {
  const repo = process.env.UI_FRAME_REPO ?? DEFAULT_REPO;
  if (!existsSync(join(repo, 'package.json'))) {
    fail(`未找到 ui-frame 源码仓库：${repo}（用 UI_FRAME_REPO 指定）`);
  }
  if (flags.has('--build')) {
    console.log(`→ 构建源码仓库：${repo}`);
    npmIn(repo, ['run', 'build'], { inherit: true });
  }
  const repoDist = join(repo, 'dist');
  if (!existsSync(repoDist)) {
    fail(`源码仓库无 dist：${repoDist}（先构建，或加 --build）`);
  }
  rmSync(join(VENDOR_DIR, 'dist'), { recursive: true, force: true });
  cpSync(repoDist, join(VENDOR_DIR, 'dist'), { recursive: true });
  cpSync(join(repo, 'package.json'), join(VENDOR_DIR, 'package.json'));
  console.log(
    `✓ vendor 快照已刷新：version=${vendorVersion()}，dist=${countFiles(join(VENDOR_DIR, 'dist'))} 文件`,
  );
  if (mode(currentSpec()) !== 'local') {
    console.log(
      '提示：当前依赖不是本地快照模式（`npm run ui-frame:local` 切回后生效）。',
    );
  } else {
    console.log(
      '提示：Vite dev server 若未热更新，重启或 `npm run dev -- --force`。',
    );
  }
}

function diff() {
  const requested =
    args[0] ?? (vendorVersion().includes('-') ? 'dev' : 'latest');
  const version = resolveVersion(requested);
  const work = mkdtempSync(join(tmpdir(), 'ui-frame-diff-'));
  try {
    const packed = npmIn(WEB_DIR, [
      'pack',
      `${PKG_NAME}@${version}`,
      '--pack-destination',
      work,
      '--silent',
    ])
      .trim()
      .split('\n')
      .pop();
    execFileSync('tar', ['xzf', join(work, packed), '-C', work]);
    const npmDist = join(work, 'package', 'dist');
    if (!existsSync(npmDist)) fail('npm 包内未找到 dist/');
    let output = '';
    try {
      output = execFileSync('diff', ['-rq', npmDist, join(VENDOR_DIR, 'dist')], {
        encoding: 'utf8',
      });
    } catch (error) {
      output = error.stdout ?? '';
    }
    const lines = output.split('\n').filter((l) => l.trim());
    console.log(
      `vendor(version=${vendorVersion()}) vs npm@${version}：${lines.length} 处差异`,
    );
    for (const line of lines.slice(0, 40)) {
      console.log(`  ${line.replace(/\s+/g, ' ')}`);
    }
    if (lines.length > 40) console.log(`  …（其余 ${lines.length - 40} 处省略）`);
  } finally {
    rmSync(work, { recursive: true, force: true });
  }
}

const commands = { status, local: useLocal, npm: useNpm, sync, diff };

if (!command || !commands[command]) {
  console.log(
    '用法：node scripts/use-ui-frame.mjs <status|local|npm|sync|diff> [spec] [--no-install] [--build]',
  );
  process.exit(command ? 1 : 0);
}
commands[command]();
