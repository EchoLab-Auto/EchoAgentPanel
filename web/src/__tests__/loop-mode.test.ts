import { describe, expect, it } from 'vitest';
import { applyMode, deriveMode } from '../loop-mode';
import { LOOP_PARALLEL_PLUGIN_ID, LOOP_SINGLE_PLUGIN_ID } from '../protocol';

const ALL = ['echo-agent.tools.builtin', 'echo-agent.skills.dir', LOOP_SINGLE_PLUGIN_ID];

describe('loop-mode form mapping', () => {
  it('derives single for an empty or mode-less allowlist (default)', () => {
    expect(deriveMode([])).toBe('single');
    expect(deriveMode(['echo-agent.tools.builtin'])).toBe('single');
    expect(deriveMode([LOOP_SINGLE_PLUGIN_ID])).toBe('single');
  });

  it('derives parallel only from the parallel plugin id', () => {
    expect(deriveMode([LOOP_PARALLEL_PLUGIN_ID])).toBe('parallel');
    expect(deriveMode(['echo-agent.tools.builtin', LOOP_PARALLEL_PLUGIN_ID])).toBe('parallel');
  });

  it('switching to single keeps the materialised list and writes the single id', () => {
    const next = applyMode([LOOP_PARALLEL_PLUGIN_ID, 'echo-agent.tools.builtin'], 'single', ALL);
    expect(next).toContain(LOOP_SINGLE_PLUGIN_ID);
    expect(next).not.toContain(LOOP_PARALLEL_PLUGIN_ID);
    expect(next).toContain('echo-agent.tools.builtin');
    expect(deriveMode(next)).toBe('single');
  });

  it('switching to parallel materialises an empty allowlist and writes the parallel id', () => {
    const next = applyMode([], 'parallel', ALL);
    expect(next).toContain(LOOP_PARALLEL_PLUGIN_ID);
    for (const id of ALL) {
      if (id !== LOOP_SINGLE_PLUGIN_ID) expect(next).toContain(id);
    }
    expect(next).not.toContain(LOOP_SINGLE_PLUGIN_ID);
    expect(deriveMode(next)).toBe('parallel');
  });

  it('an empty allowlist stays empty when single is selected (default is no-op)', () => {
    expect(applyMode([], 'single', ALL)).toEqual([]);
  });
});
