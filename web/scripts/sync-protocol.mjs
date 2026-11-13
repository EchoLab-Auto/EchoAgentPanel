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
 * npm run sync-protocol          # 从默认路径的 Core 源码生成
 * CORE_SOURCE=/path/to/core npm run sync-protocol
 * npm run sync-protocol -- --check   # 只校验，不写（CI 用；不一致则退出码 1）
 * ```
 *
 * ## 为什么用 `cargo run` 而不是读一个预编译产物
 *
 * 生成能力由 `feature = "ts-bindings"` 门控（默认构建不引入 ts-rs）。让脚本
 * 自己开 feature 编译，能保证"生成结果与你手上的 Rust 源码一致"，而不是
 * 某个过期的二进制。
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const target = resolve(here, '../src/protocol.generated.ts');
const checkOnly = process.argv.includes('--check');

// Core 源码位置：显式环境变量 > 常见安装路径。
const candidates = [
  process.env.CORE_SOURCE,
  `${process.env.HOME}/.local/share/echo-agent-core/source`,
].filter(Boolean);
const coreSource = candidates.find((dir) => existsSync(`${dir}/Cargo.toml`));
if (!coreSource) {
  const detail =
    `找不到 Core 源码。用 CORE_SOURCE=/path/to/EchoAgentCore 指定。\n` +
    `试过：\n  ${candidates.join('\n  ')}`;
  if (checkOnly) {
    // Panel 可以**独立构建**（生成物已提交）。没有 Core 时无法比对，但也不该
    // 让独立构建失败——只在日志里明说"这次没校验"。
    console.warn(`⚠ 跳过协议校验：${detail}\n` +
      '  生成物按提交内容使用；CI 里请确保 Core 源码可访问。');
    process.exit(0);
  }
  console.error(detail);
  process.exit(1);
}

console.log(`Core 源码：${coreSource}`);
console.log(`目标文件：${target}`);

const cargoArgs = [
  'run',
  '--quiet',
  '-p',
  'echo-agent-core',
  '--features',
  'ts-bindings',
  '--',
  'dump-protocol-ts',
];
if (!checkOnly) {
  cargoArgs.push('--out', target);
}

let generated;
try {
  generated = execFileSync('cargo', cargoArgs, {
    cwd: coreSource,
    encoding: 'utf8',
    stdio: checkOnly ? ['ignore', 'pipe', 'inherit'] : 'inherit',
    maxBuffer: 16 * 1024 * 1024,
  });
} catch (error) {
  console.error('生成失败：', error.message);
  process.exit(1);
}

if (!checkOnly) {
  // `--out` 分支由 Core 自己写文件（原子替换），这里只补一句确认。
  console.log('已写入。');
  process.exit(0);
}

// ── --check：比对当前提交的文件与 Core 的输出 ──
if (!existsSync(target)) {
  console.error(`缺少 ${target}——先跑 npm run sync-protocol`);
  process.exit(1);
}
const current = readFileSync(target, 'utf8');
if (current !== generated) {
  console.error(
    '协议类型已漂移：`src/protocol.generated.ts` 与 Core 的 Rust 类型不一致。\n' +
      '跑 `npm run sync-protocol` 重新生成后提交。\n' +
      diffHint(current, generated),
  );
  process.exit(1);
}
console.log('一致。');

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
