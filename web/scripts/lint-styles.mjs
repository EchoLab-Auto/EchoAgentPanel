#!/usr/bin/env node
//! 样式守卫（2026-10 审计配套）：禁止"幻影令牌"类缺陷回流。
//!
//! 背景：Panel 曾出现 37 处引用了**不存在**的 CSS 变量（--nf-* 假命名空间、
//! --nm-bg / --nm-text-tertiary 等错名、--panel-error 拼写错）——由于 `var()`
//! 有 fallback，缺陷静默生效：主题切换失效（暗底白、亮底灰）、两种错误色同屏。
//!
//! 本脚本扫描 src/**/*.{vue,css}：
//!   1) `var(--nf-*)`：禁用命名空间（从未定义过）；
//!   2) 历史幻影 `--nm-*` 名单（精确 token 匹配，不误伤 --nm-primary-color）；
//!   3) `--panel-error` 拼写错（正确为 --panel-err）；
//!   4) 可选強校验：若能找到 ui-frame 的 tokens.scss（环境变量 UI_FRAME_TOKENS
//!      或本机默认路径），把 Panel 引用的全部 --nm-* 逐一对照真实令牌定义。
//!   5) 图标尺寸/线宽档（2026-10 图标统一）：SVG 的 width/height 属性和
//!      图标类宽高须落在 ui-frame §8 的枚举档 {12,14,16,18,20,24,32}，
//!      stroke-width 须 ∈ {0.5,1,1.5,2,2.5,3}——防止自造档位（15/17/10px、
//!      1.3/1.8 线宽）再次混入。
//!   6) emoji / 符号字符当控件图标：模板里的 emoji（🔒🏠📁⛓☑ 等）禁止
//!      直接作为图标出现（内容表达除外），须改用 PanelIcon。
//!
//! 用法：node scripts/lint-styles.mjs   （退出码 1 = 有违例）

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const WEB_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SRC_DIR = join(WEB_DIR, 'src');

/** 历史幻影（精确 token；改名前均曾引发主题失效）。 */
const PHANTOM_NM_TOKENS = new Set([
  '--nm-bg',
  '--nm-bg-soft',
  '--nm-bg-raised',
  '--nm-border',
  '--nm-error',
  '--nm-primary',
  '--nm-surface',
  '--nm-surface-inset',
  '--nm-text-tertiary',
]);

/** ui-frame 真实令牌表（可选加载，用于全量对照）。 */
function loadUiFrameTokens() {
  const candidates = [
    process.env.UI_FRAME_TOKENS,
    join(process.env.HOME ?? '', 'code_file/gitlab/echo-tech/ui-frame/src/styles/tokens.scss'),
    join(WEB_DIR, 'vendor/ui-frame/dist/tokens.css'),
  ].filter(Boolean);
  for (const file of candidates) {
    if (!existsSync(file)) continue;
    const tokens = new Set();
    for (const line of readFileSync(file, 'utf-8').split('\n')) {
      const match = line.match(/^\s*(--nm-[a-z0-9-]+)\s*:/);
      if (match) tokens.add(match[1]);
    }
    if (tokens.size > 0) return { file, tokens };
  }
  return null;
}

/** ui-frame §8 图标尺寸枚举档（--nm-icon-size-* 值域）。 */
const ICON_SIZE_ALLOWED = new Set([12, 14, 16, 18, 20, 24, 32]);
/** ui-frame §8 描边线宽六档（2 标准 / 2.5 ≤12px 补偿 / 3 勾选 / 1.5 ≥24px / 1 / 0.5 图表）。 */
const STROKE_ALLOWED = new Set([0.5, 1, 1.5, 2, 2.5, 3]);
/** 允许的 emoji（内容表达 / 文案里的箭头说明不在此列，仅拦"当图标用"的）。 */
const EMOJI_ICON_RE =
  /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{2700}-\u{27BF}]/u;

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) walk(full, out);
    else if (/\.(vue|css)$/.test(entry)) out.push(full);
  }
  return out;
}

const uiFrame = loadUiFrameTokens();
if (uiFrame) {
  console.log(`令牌对照源: ${uiFrame.file}（${uiFrame.tokens.size} 个令牌）`);
} else {
  console.log('令牌对照源未找到（跳过全量对照，仅做名单检查）');
}

const violations = [];
const files = walk(SRC_DIR);
for (const file of files) {
  const text = readFileSync(file, 'utf-8');
  const lines = text.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const where = `${file.slice(WEB_DIR.length + 1)}:${i + 1}`;

    if (/var\(--nf-/.test(line)) {
      violations.push(`${where}  禁用命名空间 var(--nf-*)`);
    }
    if (/--panel-error\b/.test(line)) {
      violations.push(`${where}  拼写错：--panel-error（应为 --panel-err）`);
    }
    for (const match of line.matchAll(/var\((--nm-[a-z0-9-]+)/g)) {
      const token = match[1];
      if (PHANTOM_NM_TOKENS.has(token)) {
        violations.push(`${where}  幻影令牌 ${token}（历史缺陷名单）`);
      } else if (uiFrame && !uiFrame.tokens.has(token)) {
        violations.push(`${where}  令牌 ${token} 在 ui-frame 中不存在`);
      }
    }
  }
}

// ── 规则 5/6：图标尺寸/线宽档 + emoji 当图标 ─────────────────────────
for (const file of files) {
  if (!file.endsWith('.vue')) continue;
  const text = readFileSync(file, 'utf-8');
  const lines = text.split('\n');
  let inTemplate = false;
  let svgOpen = false;
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const where = `${file.slice(WEB_DIR.length + 1)}:${i + 1}`;
    if (/<template[^>]*>/.test(raw)) inTemplate = true;
    if (/<\/template>/.test(raw)) inTemplate = false;

    // 线宽档（模板与样式皆可出现；CSS stroke-width 同样适用）
    const sw = raw.match(/stroke-width\s*[:=]\s*["']?([\d.]+)/);
    if (sw && !STROKE_ALLOWED.has(Number(sw[1]))) {
      violations.push(`${where}  图标线宽 ${sw[1]} 不在档位 {0.5,1,1.5,2,2.5,3}`);
    }

    if (!inTemplate) continue;
    const stripped = raw.trim();

    // <svg> 开标签内的 width/height 数字（多行开标签状态机）
    if (/^<svg(\s|>|$)/.test(stripped)) {
      svgOpen = !stripped.endsWith('>');
      // 负向后视排除 stroke-width="2" 里的 width（'w' 前是 '-'）
      for (const m of stripped.matchAll(/(?<![-\w])(width|height)="(\d+)"/g)) {
        if (!ICON_SIZE_ALLOWED.has(Number(m[2]))) {
          violations.push(`${where}  图标尺寸 ${m[2]}px 不在档位 {12,14,16,18,20,24,32}`);
        }
      }
    } else if (svgOpen && /^(>|\/>)$/.test(stripped)) {
      svgOpen = false;
    } else if (svgOpen) {
      const m = stripped.match(/^(width|height)="(\d+)"/);
      if (m && !ICON_SIZE_ALLOWED.has(Number(m[2]))) {
        violations.push(`${where}  图标尺寸 ${m[2]}px 不在档位 {12,14,16,18,20,24,32}`);
      }
    }

    // emoji 当图标（去注释行后判断）
    if (stripped.startsWith('//') || stripped.startsWith('*') || stripped.startsWith('<!--')) continue;
    if (/<[^>]*class="[^"]*(icon|ico|mark|caret|grip|badge|dot)[^"]*"[^>]*>\s*[^<\s]{1,3}\s*</.test(raw)) {
      const inner = raw.replace(/<[^>]+>/g, '');
      if (EMOJI_ICON_RE.test(inner)) {
        violations.push(`${where}  emoji/符号充当控件图标（改用 PanelIcon）：${inner.trim()}`);
      }
    }
  }
}

console.log(`扫描 ${files.length} 个文件`);
if (violations.length > 0) {
  console.error('\n发现 ' + violations.length + ' 处样式令牌违例：');
  for (const v of violations) console.error('  ✗ ' + v);
  process.exit(1);
}
console.log('样式令牌检查通过 ✓');
