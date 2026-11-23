//! `sync-protocol.mjs` 的独立测试：不依赖真实 Core 仓库、不跑 cargo。
//!
//! 用一个临时 git 仓库冒充 Core（根目录有 Cargo.toml），把假的 `cargo`
//! 放到 PATH 最前面。假 cargo 只做一件事：把 `FIXTURE_FILE` 的内容写到
//! stdout / `--out` 指定的文件。这样能精确构造严格模式要拦的每一种情况：
//!
//!   - 缺 Core 源码（本地独立构建仍应放行；严格模式必须失败）
//!   - 显式来源无效 / 不是 git 工作树 / HEAD 不符 / 工作树脏
//!   - 生成物漂移 / 绑定哈希不符 / 绑定记录缺失
//!   - 工作流用 CORE_REF 提供完整提交（允许，但仍是不可变提交）
//!
//! 真实 Core 的整链验证（公开提交 → 生成 → 与提交文件逐字一致）由 CI 的
//! `check-protocol:strict` 负责；这里只钉脚本自身的判定逻辑。

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  appendFileSync,
  chmodSync,
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT = join(dirname(fileURLToPath(import.meta.url)), 'sync-protocol.mjs');
const FIXTURE = '// @generated fixture —— 假 cargo 的输出\n' + 'export type Fixture = { ok: true };\n';
const sha256 = (text) => createHash('sha256').update(text, 'utf8').digest('hex');

function git(cwd, ...args) {
  return execFileSync('git', args, { cwd, encoding: 'utf8' }).trim();
}

/**
 * 搭一个隔离的 Panel + Core 假仓库。
 *
 * @param {object} [options]
 * @param {boolean} [options.pin]           是否写 package.json 的 protocolCore
 * @param {string} [options.pinCommit]      protocolCore.commit（缺省=假 Core 的 HEAD）
 * @param {string} [options.pinHash]        protocolCore.generatedSha256（缺省=提交文件哈希）
 * @param {string} [options.committed]      提交的 protocol.generated.ts 内容
 * @param {string} [options.generated]      假 cargo 实际输出的内容
 * @param {boolean} [options.dirty]         假 Core 是否有未提交修改
 */
function makeHarness(options = {}) {
  const {
    pin = true,
    pinCommit,
    pinHash,
    committed = FIXTURE,
    generated = FIXTURE,
    dirty = false,
  } = options;

  const root = mkdtempSync(join(tmpdir(), 'protocol-sync-test-'));
  const web = join(root, 'web');
  const scripts = join(web, 'scripts');
  const src = join(web, 'src');
  mkdirSync(scripts, { recursive: true });
  mkdirSync(src, { recursive: true });
  copyFileSync(SCRIPT, join(scripts, 'sync-protocol.mjs'));
  writeFileSync(join(src, 'protocol.generated.ts'), committed);

  // 假 Core：只需要 Cargo.toml 让脚本认出“这是 Core 源码”，以及一个干净
  // 的 git HEAD 让严格模式能核对提交。
  const core = join(root, 'core');
  mkdirSync(core, { recursive: true });
  writeFileSync(join(core, 'Cargo.toml'), '[package]\nname = "fixture-core"\nversion = "0.0.0"\n');
  git(core, 'init', '-q');
  git(core, 'config', 'user.email', 'protocol-sync-test@example.invalid');
  git(core, 'config', 'user.name', 'protocol sync test');
  git(core, 'add', '.');
  git(core, 'commit', '-qm', 'fixture');
  const head = git(core, 'rev-parse', 'HEAD');
  if (dirty) appendFileSync(join(core, 'Cargo.toml'), '\n# dirty\n');

  const fixtureFile = join(root, 'fixture.ts');
  writeFileSync(fixtureFile, generated);

  // 假 cargo：解析 `--out <path>`；有就写文件，没有就写 stdout。
  const bin = join(root, 'bin');
  mkdirSync(bin, { recursive: true });
  const cargo = join(bin, 'cargo');
  writeFileSync(
    cargo,
    `#!/bin/sh
out=""
prev=""
for arg in "$@"; do
  if [ "$prev" = "--out" ]; then out="$arg"; fi
  prev="$arg"
done
if [ -n "$out" ]; then
  mkdir -p "$(dirname "$out")"
  cat "$FIXTURE_FILE" > "$out"
else
  cat "$FIXTURE_FILE"
fi
`,
  );
  chmodSync(cargo, 0o755);

  const pkg = { name: 'protocol-sync-fixture', private: true, type: 'module' };
  if (pin) {
    pkg.protocolCore = {
      repository: 'example/EchoAgentCore',
      commit: pinCommit ?? head,
      generatedSha256: pinHash ?? sha256(committed),
    };
  }
  writeFileSync(join(web, 'package.json'), JSON.stringify(pkg, null, 2));

  mkdirSync(join(root, 'home'), { recursive: true });
  return { root, web, core, head, fixtureFile, bin };
}

function cleanup(harness) {
  rmSync(harness.root, { recursive: true, force: true });
}

function runScript(harness, args, { coreSource = harness.core, env = {} } = {}) {
  const base = { ...process.env };
  for (const key of ['CORE_SOURCE', 'CORE_REF', 'CORE_TARGET_DIR', 'CARGO_TARGET_DIR', 'XDG_CACHE_HOME']) {
    delete base[key];
  }
  base.HOME = join(harness.root, 'home');
  base.PATH = [harness.bin, process.env.PATH].filter(Boolean).join(':');
  base.FIXTURE_FILE = harness.fixtureFile;
  base.CORE_TARGET_DIR = join(harness.root, 'target');
  if (coreSource) base.CORE_SOURCE = coreSource;
  return spawnSync(process.execPath, [join(harness.web, 'scripts', 'sync-protocol.mjs'), ...args], {
    encoding: 'utf8',
    env: { ...base, ...env },
  });
}

function assertExit(result, expected, label) {
  assert.equal(
    result.status,
    expected,
    `${label}\n--- stdout ---\n${result.stdout}\n--- stderr ---\n${result.stderr}`,
  );
}

test('严格模式：固定提交 + 干净工作树 + 生成物/哈希一致 → 通过', (t) => {
  const h = makeHarness();
  t.after(() => cleanup(h));
  const r = runScript(h, ['--strict']);
  assertExit(r, 0, 'strict pass');
  assert.match(r.stdout, /严格校验通过/);
  assert.match(r.stdout, new RegExp(h.head));
});

test('严格模式：缺 Core 源码 → 失败', (t) => {
  const h = makeHarness();
  t.after(() => cleanup(h));
  const r = runScript(h, ['--strict'], { coreSource: null });
  assertExit(r, 1, 'strict missing source');
  assert.match(r.stderr, /严格模式需要 Core 源码/);
});

test('本地独立构建：非严格 --check 缺 Core 源码 → 警告并放行', (t) => {
  const h = makeHarness();
  t.after(() => cleanup(h));
  const r = runScript(h, ['--check'], { coreSource: null });
  assertExit(r, 0, 'local missing source');
  assert.match(r.stderr, /跳过协议校验（独立构建）/);
});

test('显式 CORE_SOURCE 无效 → 本地模式也失败（不静默回落默认路径）', (t) => {
  const h = makeHarness();
  t.after(() => cleanup(h));
  const r = runScript(h, ['--check'], { coreSource: join(h.root, 'not-core') });
  assertExit(r, 1, 'invalid explicit source');
  assert.match(r.stderr, /不是 Core 源码（缺 Cargo\.toml）/);
});

test('严格模式：Core HEAD 与期望提交不符 → 失败', (t) => {
  const h = makeHarness();
  t.after(() => cleanup(h));
  const r = runScript(h, ['--strict'], { env: { CORE_REF: 'a'.repeat(40) } });
  assertExit(r, 1, 'commit mismatch');
  assert.match(r.stderr, /HEAD 与期望提交不符/);
});

test('严格模式：CORE_REF 必须是完整 40 位提交，分支名不行', (t) => {
  const h = makeHarness();
  t.after(() => cleanup(h));
  const r = runScript(h, ['--strict'], { env: { CORE_REF: 'main' } });
  assertExit(r, 1, 'branch ref rejected');
  assert.match(r.stderr, /完整 40 位提交/);
});

test('严格模式：Core 工作树有未提交修改 → 失败', (t) => {
  const h = makeHarness({ dirty: true });
  t.after(() => cleanup(h));
  const r = runScript(h, ['--strict']);
  assertExit(r, 1, 'dirty core');
  assert.match(r.stderr, /工作树干净/);
});

test('严格模式：Core 不是 git 工作树 → 失败', (t) => {
  const h = makeHarness();
  t.after(() => cleanup(h));
  rmSync(join(h.core, '.git'), { recursive: true, force: true });
  const r = runScript(h, ['--strict']);
  assertExit(r, 1, 'not a git worktree');
  assert.match(r.stderr, /git 工作树根目录/);
});

test('严格模式：生成物与 Core 输出不一致 → 失败（带首个差异行）', (t) => {
  const h = makeHarness({ generated: '// different\n' });
  t.after(() => cleanup(h));
  const r = runScript(h, ['--strict']);
  assertExit(r, 1, 'generation drift');
  assert.match(r.stderr, /协议类型已漂移/);
  assert.match(r.stderr, /首个差异在第 1 行/);
});

test('严格模式：生成物哈希与绑定记录不符 → 失败', (t) => {
  const h = makeHarness({ pinHash: 'b'.repeat(64) });
  t.after(() => cleanup(h));
  const r = runScript(h, ['--strict']);
  assertExit(r, 1, 'hash mismatch');
  assert.match(r.stderr, /生成物哈希与绑定记录不符/);
});

test('严格模式：缺少 protocolCore 绑定记录 → 失败', (t) => {
  const h = makeHarness({ pin: false });
  t.after(() => cleanup(h));
  const r = runScript(h, ['--strict'], { env: { CORE_REF: h.head } });
  assertExit(r, 1, 'missing pin');
  assert.match(r.stderr, /缺少绑定记录/);
});

test('严格模式：protocolCore 字段不完整 → 失败', (t) => {
  const h = makeHarness({ pinCommit: 'abc' });
  t.after(() => cleanup(h));
  const r = runScript(h, ['--strict']);
  assertExit(r, 1, 'invalid pin');
  assert.match(r.stderr, /protocolCore 字段无效/);
});

test('工作流 CORE_REF 提供完整提交：可覆盖 package.json 基线（仍校验哈希）', (t) => {
  const h = makeHarness({ pinCommit: 'c'.repeat(40) });
  t.after(() => cleanup(h));
  const r = runScript(h, ['--strict'], { env: { CORE_REF: h.head } });
  assertExit(r, 0, 'workflow ref override');
  assert.match(r.stdout, /覆盖了 package\.json 固定的/);
  assert.match(r.stdout, /严格校验通过/);
});

test('本地 --check：package.json 基线提交不同 → 警告但按当前源码继续', (t) => {
  const h = makeHarness({ pinCommit: 'd'.repeat(40) });
  t.after(() => cleanup(h));
  const r = runScript(h, ['--check']);
  assertExit(r, 0, 'local pin mismatch');
  assert.match(r.stderr, /与 package\.json 基线/);
  assert.match(r.stdout, /一致/);
});

test('本地 --check：绑定哈希不同 → 警告但生成物一致时放行', (t) => {
  const h = makeHarness({ pinHash: 'e'.repeat(64) });
  t.after(() => cleanup(h));
  const r = runScript(h, ['--check']);
  assertExit(r, 0, 'local hash mismatch');
  assert.match(r.stderr, /生成物哈希与 package\.json 记录不同/);
});

test('写模式：调用 cargo --out 写文件，并打印要回填的 commit/sha256', (t) => {
  const h = makeHarness({ committed: '// old\n' });
  t.after(() => cleanup(h));
  const r = runScript(h, []);
  assertExit(r, 0, 'write mode');
  assert.equal(readFileSync(join(h.web, 'src', 'protocol.generated.ts'), 'utf8'), FIXTURE);
  assert.match(r.stdout, /生成物 sha256：/);
  assert.match(r.stdout, /"commit": "/);
  assert.match(r.stdout, /"generatedSha256": "/);
});
