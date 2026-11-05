import { existsSync, writeFileSync } from 'node:fs';
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
  include: ['src', 'env.d.ts', ...roots.map((root) => path.relative(webRoot, root))],
};
const generated = path.join(webRoot, 'tsconfig.extensions.generated.json');
writeFileSync(generated, `${JSON.stringify(config, null, 2)}\n`);
const binary = path.join(webRoot, 'node_modules/.bin/vue-tsc');
const result = spawnSync(binary, ['-p', generated], { cwd: webRoot, stdio: 'inherit' });
process.exit(result.status ?? 1);
