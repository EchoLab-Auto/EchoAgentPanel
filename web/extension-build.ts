import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Plugin } from 'vite';

export const webRoot = path.dirname(fileURLToPath(import.meta.url));

interface ExtensionManifest {
  id: string;
  entry: string;
}

export function extensionEntries(): Array<{ id: string; entry: string }> {
  const roots = (process.env.PANEL_UI_EXTENSIONS ?? '')
    .split(path.delimiter)
    .map((item) => item.trim())
    .filter(Boolean);
  return roots.map((root) => {
    const manifestPath = path.resolve(root, 'panel-extension.json');
    if (!existsSync(manifestPath)) throw new Error(`Panel UI extension manifest not found: ${manifestPath}`);
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as ExtensionManifest;
    if (!manifest.id || !manifest.entry) throw new Error(`Invalid Panel UI extension manifest: ${manifestPath}`);
    return { id: manifest.id, entry: path.resolve(root, manifest.entry) };
  });
}

export function panelExtensions(): Plugin {
  const virtualId = 'virtual:panel-extensions';
  const resolvedVirtualId = '\0virtual:panel-extensions';
  return {
    name: 'echo-panel-ui-extensions',
    resolveId(id, importer) {
      if (id === virtualId) return resolvedVirtualId;
      if (id === '@echo-agent/panel/App') return path.join(webRoot, 'src/App.vue');
      if (id === '@echo-agent/panel') return path.join(webRoot, 'src/extension-api.ts');
      if (id.startsWith('@echo-agent/panel/components/')) {
        const component = id.slice('@echo-agent/panel/components/'.length);
        if (!/^[A-Za-z][A-Za-z0-9]*$/.test(component)) throw new Error(`Invalid public Panel component: ${id}`);
        return path.join(webRoot, `src/components/${component}.vue`);
      }
      if (importer && path.isAbsolute(importer) && !importer.startsWith(`${webRoot}${path.sep}`) && !id.startsWith('.') && !path.isAbsolute(id)) {
        return this.resolve(id, path.join(webRoot, 'src/extension-api.ts'), { skipSelf: true });
      }
      return null;
    },
    load(id) {
      if (id !== resolvedVirtualId) return null;
      const entries = extensionEntries();
      const ids = new Set<string>();
      for (const extension of entries) {
        if (ids.has(extension.id)) throw new Error(`Duplicate Panel UI extension id: ${extension.id}`);
        ids.add(extension.id);
      }
      return entries.map((extension) => `import ${JSON.stringify(extension.entry)}; // ${extension.id}`).join('\n');
    },
  };
}
