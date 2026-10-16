//! parse.test.ts（03a §5.1）：版本分支 / 结构容错 / 未知节点 / 字段校验。

import { describe, expect, it } from 'vitest';
import { parseDescriptor } from '../parse';

const codes = (raw: unknown) => parseDescriptor(raw).warnings.map((w) => w.code);

describe('parseDescriptor：版本分支（03a §3.1）', () => {
  it('version 1 正常解析、无 warning', () => {
    const parsed = parseDescriptor({ version: 1, panels: [] });
    expect(parsed.version).toBe(1);
    expect(parsed.newerVersion).toBe(false);
    expect(parsed.invalid).toBe(false);
    expect(parsed.warnings).toEqual([]);
  });

  it('version 缺省按 1 处理 + unknown_version warning', () => {
    const parsed = parseDescriptor({ panels: [] });
    expect(parsed.version).toBe(1);
    expect(codes({ panels: [] })).toEqual(['unknown_version']);
  });

  it('version 非数字按 1 处理 + warning', () => {
    expect(codes({ version: 'x', panels: [] })).toEqual(['unknown_version']);
  });

  it('version 2 尽力解析 + 版本提示标志', () => {
    const parsed = parseDescriptor({
      version: 2,
      panels: [{ id: 'p', nodes: [{ type: 'text', bind: 'self_id' }] }],
    });
    expect(parsed.newerVersion).toBe(true);
    expect(parsed.invalid).toBe(false);
    expect(parsed.panels).toHaveLength(1);
    expect(parsed.panels[0].nodes).toHaveLength(1);
  });

  it('version 0 / -1：无 panel + invalid + warning', () => {
    for (const version of [0, -1]) {
      const parsed = parseDescriptor({ version, panels: [{ id: 'p', nodes: [] }] });
      expect(parsed.invalid).toBe(true);
      expect(parsed.panels).toEqual([]);
      expect(parsed.warnings.map((w) => w.code)).toContain('unknown_version');
    }
  });

  it('null / undefined：空渲染且无 warning（03a §1.2）', () => {
    for (const raw of [null, undefined]) {
      const parsed = parseDescriptor(raw);
      expect(parsed.panels).toEqual([]);
      expect(parsed.warnings).toEqual([]);
    }
  });

  it('非对象 raw 不抛异常', () => {
    for (const raw of [42, 'x', [], true]) {
      expect(() => parseDescriptor(raw)).not.toThrow();
    }
  });
});

describe('parseDescriptor：结构容错（03a §3.2）', () => {
  it('panels 非数组 → []', () => {
    expect(parseDescriptor({ version: 1, panels: 'x' }).panels).toEqual([]);
  });

  it('panel 缺 id → panel-<index>；id 重复 → 后者加后缀', () => {
    const parsed = parseDescriptor({
      version: 1,
      panels: [{ nodes: [] }, { id: 'a', nodes: [] }, { id: 'a', nodes: [] }],
    });
    expect(parsed.panels.map((p) => p.id)).toEqual(['panel-0', 'a', 'a-2']);
  });

  it('nodes 非数组 → 该 panel 空节点列表（渲染 Empty）', () => {
    const parsed = parseDescriptor({ version: 1, panels: [{ id: 'p', nodes: 1 }] });
    expect(parsed.panels[0].nodes).toEqual([]);
  });

  it('未知节点静默跳过；同 type 只发一次 unknown_node', () => {
    const parsed = parseDescriptor({
      version: 1,
      panels: [
        {
          id: 'p',
          nodes: [
            { type: 'slider' },
            { type: 'slider' },
            { foo: 1 },
            { type: 'text', bind: 'self_id' },
          ],
        },
      ],
    });
    expect(parsed.panels[0].nodes).toHaveLength(1);
    expect(parsed.panels[0].nodes[0].type).toBe('text');
    const unknown = parsed.warnings.filter((w) => w.code === 'unknown_node');
    expect(unknown).toHaveLength(2); // slider 一次 + 缺 type 一次
  });

  it('已知节点上的未知字段一律忽略', () => {
    const parsed = parseDescriptor({
      version: 1,
      panels: [{ id: 'p', nodes: [{ type: 'text', bind: 'self_id', foo: 1 }] }],
    });
    expect(parsed.panels[0].nodes[0]).toMatchObject({ type: 'text', bind: 'self_id' });
    expect(parsed.warnings).toEqual([]);
  });
});

describe('parseDescriptor：字段校验（03a §3.2 / §3.3）', () => {
  const oneNode = (node: unknown) =>
    parseDescriptor({ version: 1, panels: [{ id: 'p', nodes: [node] }] });

  it('bind 非法路径（空串 / a..b / a[0]）→ bad_field + 按无 bind', () => {
    for (const bind of ['', 'a..b', 'a[0]']) {
      const parsed = oneNode({ type: 'text', bind });
      expect(parsed.warnings.map((w) => w.code)).toContain('bad_field');
      expect(parsed.panels[0].nodes[0].bind).toBeUndefined();
    }
  });

  it('method 形状非法（空串 / 含空格）→ unknown_action + 按无 action', () => {
    for (const method of ['', 'a b']) {
      const parsed = oneNode({ type: 'select', bind: 'gate.mode', options: ['a'], action: { method } });
      expect(parsed.warnings.map((w) => w.code)).toContain('unknown_action');
      const node = parsed.panels[0].nodes[0];
      expect(node.type).toBe('select');
      expect(node.action).toBeUndefined();
    }
  });

  it('button 无合法 action → 跳过节点 + bad_field', () => {
    expect(oneNode({ type: 'button', label: 'x' }).panels[0].nodes).toEqual([]);
    expect(codes({ version: 1, panels: [{ id: 'p', nodes: [{ type: 'button' }] }] })).toContain(
      'bad_field',
    );
    const parsed = oneNode({ type: 'button', action: { method: '' } });
    expect(parsed.panels[0].nodes).toEqual([]);
    expect(parsed.warnings.map((w) => w.code)).toEqual(
      expect.arrayContaining(['unknown_action', 'bad_field']),
    );
  });

  it('image 无合法 fetch → 跳过节点 + bad_field；bind 共存忽略 + bad_field', () => {
    expect(oneNode({ type: 'image', label: 'x' }).panels[0].nodes).toEqual([]);
    const withBind = oneNode({
      type: 'image',
      bind: 'online',
      fetch: { method: 'login_qrcode', result_key: 'png_base64' },
    });
    expect(withBind.warnings.map((w) => w.code)).toContain('bad_field');
    const node = withBind.panels[0].nodes[0];
    expect(node.type).toBe('image');
    expect('bind' in node && node.bind).toBeFalsy();
    // result_key 缺失
    const badKey = oneNode({ type: 'image', fetch: { method: 'login_qrcode' } });
    expect(badKey.panels[0].nodes).toEqual([]);
  });

  it('status / link 声明 action → 忽略 + bad_field', () => {
    for (const type of ['status', 'link']) {
      const parsed = oneNode({ type, bind: 'online', action: { method: 'x' } });
      expect(parsed.warnings.map((w) => w.code)).toContain('bad_field');
      expect('action' in parsed.panels[0].nodes[0]).toBe(false);
    }
  });

  it('select options：字符串形态与对象形态 {value,label,hint}；非法项过滤；非数组 → bad_field + []', () => {
    const parsed = oneNode({
      type: 'select',
      bind: 'gate.mode',
      options: ['none', { value: 'allowlist', label: '白名单', hint: '仅名单内' }, 42, { label: 'x' }],
    });
    const node = parsed.panels[0].nodes[0];
    expect(node.type).toBe('select');
    expect(node.options).toEqual([
      { value: 'none' },
      { value: 'allowlist', label: '白名单', hint: '仅名单内' },
    ]);
    expect(codes({ version: 1, panels: [{ id: 'p', nodes: [{ type: 'select', options: 'x' }] }] })).toContain(
      'bad_field',
    );
  });

  it('扩展字段白名单：text editable / image clear_when / button confirm 被解析', () => {
    const parsed = parseDescriptor({
      version: 1,
      panels: [
        {
          id: 'p',
          nodes: [
            { type: 'text', bind: 'owner', editable: true, action: { method: 'set_owner' } },
            {
              type: 'image',
              clear_when: 'online',
              fetch: { method: 'login_qrcode', result_key: 'png_base64' },
            },
            { type: 'button', label: 'b', confirm: '确定？', action: { method: 'get_state' } },
          ],
        },
      ],
    });
    const [text, image, button] = parsed.panels[0].nodes;
    expect(text.type === 'text' && text.editable).toBe(true);
    expect(image.type === 'image' && image.clear_when).toBe('online');
    expect(button.type === 'button' && button.confirm).toBe('确定？');
  });
});
