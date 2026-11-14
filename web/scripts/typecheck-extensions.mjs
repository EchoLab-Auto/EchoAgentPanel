import { existsSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const webRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const roots = (process.env.PANEL_UI_EXTENSIONS ?? '').split(path.delimiter).filter(Boolean);
if (!roots.length) process.exit(0);

for (const root of roots) {
  if (!existsSync(path.join(root, 'panel-extension.json'))) {
    throw new Error(`Panel UI extension manifest not found: ${path.join(root, 'panel-extension.json')}`);
  }
}
/**
 * 扩展仓里**实际参与门禁**的文件（生产代码）。
 *
 * 显式枚举而不是用 `exclude` glob：扩展根目录在 webRoot **之外**
 * （`../../../../code_file/gitlab/...`），TS 的 exclude 匹配在带 `..` 的路径上
 * 不可靠——实测排除规则一条都没生效。枚举没有这个歧义。
 */
function productionFiles(root) {
  const out = [];
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === 'node_modules' || entry.name === 'dist') continue;
        // 测试目录整棵跳过（夹具不是线格式样本，见下方 exclude 注释）。
        if (entry.name === 'tests' || entry.name === '__tests__') continue;
        walk(full);
        continue;
      }
      if (!/\.(ts|vue)$/.test(entry.name)) continue;
      if (/\.(test|spec)\.(ts|vue)$/.test(entry.name)) continue;
      out.push(full);
    }
  };
  walk(root);
  return out;
}

const config = {
  extends: './tsconfig.json',
  compilerOptions: {
    noEmit: true,
    baseUrl: ".",
    paths: {
      '@echo-agent/panel': ['./src/extension-api.ts'],
      '@echo-agent/panel/App': ['./src/App.vue'],
      '@echo-agent/panel/components/*': ['./src/components/*.vue'],
      '@echolab-auto/ui-frame/components/*': ['./node_modules/@echolab-auto/ui-frame/dist/components/*'],
      '@echolab-auto/ui-frame/composables/*': ['./node_modules/@echolab-auto/ui-frame/dist/composables/*'],
      '@echolab-auto/ui-frame/icons': ['./node_modules/@echolab-auto/ui-frame/dist/icons/index.d.ts'],
      'three': ['./node_modules/@types/three'],
      '*': ['./node_modules/*'],
    },
  },
  include: ['src', 'env.d.ts'],
  // 扩展侧只查**生产代码**（2026-11 根治）。
  //
  // 测试文件里的那些对象是**显示夹具**（`{ id, name }` 够渲染就行），
  // 不是线格式样本。让它们跟协议字段一起演进，就等于 Core 每加一个带
  // `#[serde(default)]` 的字段，两个扩展仓都要跟着改一遍——把"协议契约"
  // 和"测试凑数据"混成一件事。夹具真错了，运行期测试自己会失败。
  //
  // 生产代码仍严格：它真的往 ws 上发帧，写错就是静默丢命令——本轮就靠
  // 这条抓出 prodoc 的 `{ ProDocRoots: {} }`（Core 侧是无载荷变体，只认
  // 裸字符串 `"ProDocRoots"`）。
  files: roots.flatMap(productionFiles),
};
const generated = path.join(webRoot, 'tsconfig.extensions.generated.json');
writeFileSync(generated, `${JSON.stringify(config, null, 2)}\n`);
const binary = path.join(webRoot, 'node_modules/.bin/vue-tsc');
const result = spawnSync(binary, ['-p', generated], { cwd: webRoot, stdio: 'inherit' });
process.exit(result.status ?? 1);
