#!/usr/bin/env node
/**
 * 同步管理面协议类型：从 Core 生成 `src/protocol.generated.ts`。
 *
 * ## 为什么要有这个脚本
 *
 * 协议的真值是 Core 的 Rust 类型（`agent-module-management/src/protocol/`）。
 * Panel 侧的类型是**生成物**——手改没有意义（下次同步会覆盖），所以同步必须
 * 是一条命令，不是"记得去改"。
 *
 * ## 用法
 *
 * ```bash
 * npm run sync-protocol                     # 从默认路径的 Core 源码生成
 * CORE_SOURCE=/path/to/core npm run sync-protocol
 * npm run check-protocol                    # 只校验，不写（本地/独立构建用）
 * npm run check-protocol:strict             # 严格校验（正式 CI 用）
 * ```
 *
 * ## 严格模式（CI）
 *
 * `--strict` 隐含 `--check`。以下任一条件不满足都退出 1：
 *
 * 1. Core 源码可访问（`CORE_SOURCE` 或默认路径，目录里必须有 `Cargo.toml`）；
 * 2. Core 源码是 git 工作树，HEAD 是一个**完整 40 位提交**；
 * 3. HEAD 等于 `web/package.json` 的 `protocolCore.commit`（除非工作流用
 *    `CORE_REF` 显式提供另一个完整提交——只允许不可变的提交，不接受分支/短 SHA）；
 * 4. Core 已跟踪文件没有未提交修改（否则生成结果不对应任何提交）；
 * 5. `dump-protocol-ts` 的输出与提交的 `protocol.generated.ts` 逐字一致；
 * 6. 生成物 sha256 等于 `protocolCore.generatedSha256`。
 *
 * 非严格模式保留"Panel 可独立构建"：没有 Core 源码时 `--check` 只警告并
 * 退出 0（生成物已提交）。但正式 CI 必须跑严格模式，否则这道闸等于放假。
 *
 * ## 为什么用 `cargo run` 而不是读一个预编译产物
 *
 * 生成能力由 `feature = "ts-bindings"` 门控（默认构建不引入 ts-rs）。让脚本
 * 自己开 feature 编译，能保证"生成结果与你手上的 Rust 源码一致"，而不是
 * 某个过期的二进制。
 *
 * ## 为什么用独立的 Cargo target 目录
 *
 * Core 自己也在同一个仓库里跑 `cargo test/clippy`（另一个 agent/CI 任务）。
 * 共用 `core/target` 会在 Cargo 的文件锁上排队，甚至互相覆盖增量产物。
 * 默认把生成用的 target 放到 `~/.cache/echo-agent-panel/protocol-target`，
 * 与 Core 的日常构建隔离；CI 用 `CORE_TARGET_DIR` 指到可缓存的目录。
 */
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const target = resolve(here, '../src/protocol.generated.ts');
const packagePath = resolve(here, '../package.json');

const COMMIT_RE = /^[0-9a-f]{40}$/i;
const SHA256_RE = /^[0-9a-f]{64}$/i;

// ── 命令行 ──────────────────────────────────────────────────────────────────

let checkOnly = false;
let strict = false;
let coreSourceArg = null;
let coreRefArg = null;

const argv = process.argv.slice(2);
for (let i = 0; i < argv.length; i += 1) {
  const arg = argv[i];
  if (arg === '--check') {
    checkOnly = true;
  } else if (arg === '--strict') {
    strict = true;
    checkOnly = true; // 严格模式只校验，不写文件。
  } else if (arg === '--core-source') {
    coreSourceArg = argv[i + 1];
    if (!coreSourceArg) usage('--core-source 需要一个目录参数');
    i += 1;
  } else if (arg.startsWith('--core-source=')) {
    coreSourceArg = arg.slice('--core-source='.length);
    if (!coreSourceArg) usage('--core-source 需要一个目录参数');
  } else if (arg === '--core-ref') {
    coreRefArg = argv[i + 1];
    if (!coreRefArg) usage('--core-ref 需要一个提交参数');
    i += 1;
  } else if (arg.startsWith('--core-ref=')) {
    coreRefArg = arg.slice('--core-ref='.length);
    if (!coreRefArg) usage('--core-ref 需要一个提交参数');
  } else if (arg === '--help' || arg === '-h') {
    usage();
  } else {
    usage(`未知参数：${arg}`);
  }
}

function usage(message) {
  if (message) console.error(`✗ ${message}\n`);
  console.error(`用法：
  node scripts/sync-protocol.mjs [--check] [--strict] [--core-source <dir>] [--core-ref <sha>]

  --check          只校验，不写文件（npm run check-protocol）
  --strict         严格校验（隐含 --check）：缺 Core 源码、来源不是 git、
                   HEAD 与固定提交不符、工作树有改动、生成物/哈希不符都失败。
                   CI 用 npm run check-protocol:strict。
  --core-source    显式指定 Core 源码目录（等价于 CORE_SOURCE）
  --core-ref       显式指定期望的 Core 提交（完整 40 位 SHA，等价于 CORE_REF）`);
  process.exit(message ? 2 : 0);
}

function fail(message) {
  console.error(`✗ ${message}`);
  process.exit(1);
}

const sha256 = (text) => createHash('sha256').update(text, 'utf8').digest('hex');

// ── 绑定记录（web/package.json 的 protocolCore）────────────────────────────
//
// 这里固定的是**生成/核对这份 protocol.generated.ts 的 Core 提交**，不是"最新
// Core main"。远端 main 往后走是常态；严格模式只认这份记录（或工作流显式
// 提供的完整提交），这样 CI 不会把"今天恰好能生成"当成"绑定没漂移"。
//
// 字段：
//   repository       Core 仓库（owner/repo；必须对 CI 匿名可读）
//   commit           生成时的完整 40 位提交
//   generatedSha256  生成物的 sha256（防止手改生成物/只改了一半）

function readProtocolPin() {
  let pkg;
  try {
    pkg = JSON.parse(readFileSync(packagePath, 'utf8'));
  } catch (error) {
    return { pin: null, error: `读不了 ${packagePath}：${error.message}` };
  }
  const raw = pkg?.protocolCore;
  if (raw == null) return { pin: null };
  if (typeof raw !== 'object' || Array.isArray(raw)) {
    return { pin: null, error: 'web/package.json 的 protocolCore 不是对象' };
  }
  const problems = [];
  if (typeof raw.repository !== 'string' || raw.repository.trim() === '') {
    problems.push('repository');
  }
  if (typeof raw.commit !== 'string' || !COMMIT_RE.test(raw.commit)) {
    problems.push('commit（完整 40 位十六进制）');
  }
  if (typeof raw.generatedSha256 !== 'string' || !SHA256_RE.test(raw.generatedSha256)) {
    problems.push('generatedSha256（完整 64 位十六进制）');
  }
  if (problems.length > 0) {
    return {
      pin: null,
      error: `web/package.json 的 protocolCore 字段无效：缺/错 ${problems.join('、')}`,
    };
  }
  return {
    pin: {
      repository: raw.repository,
      commit: raw.commit.toLowerCase(),
      generatedSha256: raw.generatedSha256.toLowerCase(),
    },
  };
}

const pinResult = readProtocolPin();
const pin = pinResult.pin;

if (pinResult.error) {
  if (strict) fail(`${pinResult.error}\n严格模式要求绑定记录完整；修好后重跑。`);
  console.warn(`⚠ ${pinResult.error}\n  本次按本地模式继续；正式 CI 的严格模式会失败。`);
} else if (pin) {
  console.log(`绑定基线：Core ${pin.commit}（${pin.repository}）`);
} else if (strict) {
  fail(
    '严格模式缺少绑定记录：web/package.json 需要 protocolCore ' +
      '{ repository, commit, generatedSha256 }。\n' +
      '先跑 npm run sync-protocol，把输出里的 commit/sha256 写进 package.json。',
  );
} else {
  console.warn(
    '⚠ web/package.json 没有 protocolCore 绑定记录；本地校验可继续，' +
      '正式 CI 的严格模式会失败。',
  );
}

// ── 定位 Core 源码 ────────────────────────────────────────────────────────

let coreSource = null;
const defaultCoreSource = join(homedir(), '.local/share/echo-agent-core/source');
const explicitCoreSource = coreSourceArg || process.env.CORE_SOURCE || null;

if (explicitCoreSource) {
  const dir = resolve(explicitCoreSource);
  if (!existsSync(join(dir, 'Cargo.toml'))) {
    fail(`CORE_SOURCE 指向的目录不是 Core 源码（缺 Cargo.toml）：${dir}`);
  }
  coreSource = dir;
  console.log(`Core 源码：${coreSource}（显式指定）`);
} else if (existsSync(join(defaultCoreSource, 'Cargo.toml'))) {
  coreSource = defaultCoreSource;
  console.log(`Core 源码：${coreSource}（默认路径）`);
} else {
  const detail =
    `找不到 Core 源码。用 CORE_SOURCE=/path/to/EchoAgentCore 指定。\n` +
    `试过：\n  ${defaultCoreSource}`;
  if (strict) {
    fail(`严格模式需要 Core 源码：\n${detail}`);
  }
  if (checkOnly) {
    // Panel 可以**独立构建**（生成物已提交）。没有 Core 时无法比对，但也不该
    // 让独立构建失败——只在日志里明说"这次没校验"。
    console.warn(
      `⚠ 跳过协议校验（独立构建）：${detail}\n` +
        '  生成物按提交内容使用；正式 CI 的严格模式会因此失败。',
    );
    process.exit(0);
  }
  fail(detail);
}

// ── 确认 Core 来源可追踪 ──────────────────────────────────────────────────

function tryGit(args) {
  try {
    return execFileSync('git', ['-C', coreSource, ...args], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    }).trim();
  } catch {
    return null;
  }
}

const gitTopLevel = tryGit(['rev-parse', '--show-toplevel']);
const isGitRoot = gitTopLevel !== null && resolve(gitTopLevel) === resolve(coreSource);
const head = isGitRoot ? tryGit(['rev-parse', 'HEAD']) : null;
const dirtyOutput = isGitRoot
  ? tryGit(['status', '--porcelain', '--untracked-files=no'])
  : null;
const dirtyEntries = dirtyOutput === null ? null : dirtyOutput.split('\n').filter(Boolean);

if (head) console.log(`Core 提交：${head}`);
else if (strict) {
  fail(
    `严格模式要求 Core 源码是 git 工作树根目录，且 HEAD 可解析：${coreSource}\n` +
      '（如果是下载的源码包，请改用 git clone；否则无法确认生成结果对应哪个提交。）',
  );
} else {
  console.warn('⚠ Core 源码不是 git 工作树根目录：无法确认生成结果对应的提交。');
}

if (strict && isGitRoot && dirtyEntries === null) {
  fail(`严格模式无法读取 Core 工作树状态（git status 失败）：${coreSource}`);
}

if (strict && dirtyEntries && dirtyEntries.length > 0) {
  fail(
    `严格模式要求 Core 工作树干净（已跟踪文件不能有未提交修改），实际有 ${dirtyEntries.length} 个：\n` +
      dirtyEntries
        .slice(0, 10)
        .map((line) => `  ${line}`)
        .join('\n') +
      (dirtyEntries.length > 10 ? '\n  …' : '') +
      '\n先提交/还原这些修改，或换一个干净的 checkout。',
  );
} else if (!strict && dirtyEntries && dirtyEntries.length > 0) {
  console.warn(
    `⚠ Core 工作树有 ${dirtyEntries.length} 个已跟踪文件被修改：生成结果不对应任何提交，` +
      '正式 CI 的严格模式会失败。',
  );
}

// 期望提交：CLI > CORE_REF > package.json。严格模式只接受完整提交。
const requestedRef = coreRefArg || process.env.CORE_REF || null;
const expectedRef = (requestedRef || pin?.commit || null)?.toLowerCase() ?? null;

if (strict) {
  if (!expectedRef) {
    fail(
      '缺少可追踪的 Core 提交：在 web/package.json 的 protocolCore.commit 固定，' +
        '或用 CORE_REF 显式提供完整 40 位提交。',
    );
  }
  if (!COMMIT_RE.test(expectedRef)) {
    fail(
      `严格模式只接受完整 40 位提交（收到 ${requestedRef ?? expectedRef}）。\n` +
        '分支名/短 SHA 会随时间移动，不能作为可追踪基线。',
    );
  }
  if (requestedRef && pin && requestedRef.toLowerCase() !== pin.commit) {
    console.log(
      `注意：CORE_REF=${requestedRef} 覆盖了 package.json 固定的 ${pin.commit}。` +
        '本次仍要求生成物哈希与 package.json 记录一致。',
    );
  }
  if (head !== expectedRef) {
    fail(
      `Core HEAD 与期望提交不符：\n  HEAD: ${head ?? '<无法解析>'}\n  期望: ${expectedRef}` +
        (pin ? `\n  package.json 固定: ${pin.commit}` : '') +
        '\n严格模式不会用"另一个版本碰巧生成一样"来放行。',
    );
  }
} else if (head && pin && head !== pin.commit) {
  console.warn(
    `⚠ Core HEAD ${head} 与 package.json 基线 ${pin.commit} 不同；` +
      '本地校验按当前源码继续，正式 CI 的严格模式会失败。',
  );
}

// ── 生成 ──────────────────────────────────────────────────────────────────

// 独立 target：不跟 Core 自己的 cargo test/clippy 抢文件锁。
// CORE_TARGET_DIR > CARGO_TARGET_DIR > ~/.cache/echo-agent-panel/protocol-target
const cacheRoot = process.env.XDG_CACHE_HOME || join(homedir(), '.cache');
const targetDir = resolve(
  process.env.CORE_TARGET_DIR ||
    process.env.CARGO_TARGET_DIR ||
    join(cacheRoot, 'echo-agent-panel', 'protocol-target'),
);

const cargoArgs = ['run', '--quiet'];
if (strict) cargoArgs.push('--locked');
cargoArgs.push(
  '-p',
  'echo-agent-core',
  '--features',
  'ts-bindings',
  '--',
  'dump-protocol-ts',
);
if (!checkOnly) cargoArgs.push('--out', target);

console.log(`生成 target：${targetDir}`);
console.log(`目标文件：${target}`);

let generated = null;
try {
  generated = execFileSync('cargo', cargoArgs, {
    cwd: coreSource,
    encoding: 'utf8',
    env: { ...process.env, CARGO_TARGET_DIR: targetDir },
    stdio: checkOnly ? ['ignore', 'pipe', 'inherit'] : 'inherit',
    maxBuffer: 16 * 1024 * 1024,
  });
} catch (error) {
  console.error('生成失败：', error.message);
  process.exit(1);
}

if (!checkOnly) {
  // `--out` 分支由 Core 自己写文件（原子替换）；读回来算哈希并提示更新绑定。
  const written = readFileSync(target, 'utf8');
  const hash = sha256(written);
  console.log(`已写入 ${target}`);
  console.log(`生成物 sha256：${hash}`);
  console.log(
    `把下面两行写进 web/package.json 的 protocolCore（与当前生成物配套）：\n` +
      `  "commit": "${head ?? '<Core 提交不可用>'}",\n` +
      `  "generatedSha256": "${hash}"`,
  );
  if (!head) {
    console.warn('⚠ Core 源码不是 git 工作树：无法记录 commit，CI 严格模式无法通过。');
  } else if (!pin) {
    console.log('提示：package.json 没有有效的 protocolCore 记录，补上后 CI 才能严格校验。');
  } else if (pin.commit !== head || pin.generatedSha256 !== hash) {
    console.warn('⚠ 当前生成物与 package.json 的绑定记录不一致——提交前更新 protocolCore。');
  }
  process.exit(0);
}

// ── --check：比对当前提交的文件与 Core 的输出 ──────────────────────────────

if (!existsSync(target)) {
  fail(`缺少 ${target}——先跑 npm run sync-protocol`);
}
const current = readFileSync(target, 'utf8');
const currentHash = sha256(current);
const generatedHash = sha256(generated);

if (current !== generated) {
  console.error(
    '协议类型已漂移：`src/protocol.generated.ts` 与 Core 的 Rust 类型不一致。\n' +
      '跑 `npm run sync-protocol` 重新生成后提交。\n' +
      diffHint(current, generated),
  );
  console.error(`  提交文件 sha256: ${currentHash}`);
  console.error(`  Core 生成 sha256: ${generatedHash}`);
  process.exit(1);
}

if (strict) {
  if (pin.generatedSha256 !== generatedHash) {
    fail(
      `生成物哈希与绑定记录不符：\n  package.json: ${pin.generatedSha256}\n  实际生成: ${generatedHash}\n` +
        '更新 web/package.json 的 protocolCore.generatedSha256 后再提交。',
    );
  }
  console.log(`✓ 严格校验通过：Core ${head} → ${generatedHash}`);
} else {
  if (pin && pin.generatedSha256 !== generatedHash) {
    console.warn(
      `⚠ 生成物哈希与 package.json 记录不同（记录 ${pin.generatedSha256}，实际 ${generatedHash}）；` +
        '正式 CI 的严格模式会失败。',
    );
  }
  console.log(`一致（Core ${head ?? '未知提交'}；sha256 ${generatedHash}）。`);
}

/** 只报行数与首个差异行，避免 CI 日志刷屏。 */
function diffHint(a, b) {
  const la = a.split('\n');
  const lb = b.split('\n');
  for (let i = 0; i < Math.max(la.length, lb.length); i += 1) {
    if (la[i] !== lb[i]) {
      return `首个差异在第 ${i + 1} 行：\n  提交: ${(la[i] ?? '<缺失>').slice(0, 160)}\n  Core: ${(lb[i] ?? '<缺失>').slice(0, 160)}`;
    }
  }
  return '';
}
