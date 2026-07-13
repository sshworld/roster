import { describe, it, expect, afterEach, vi } from 'vitest';
import { supportsColor, bold, red, yellow, dim } from '../../src/render/ansi.js';

describe('supportsColor', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('is true when FORCE_COLOR is set alone', () => {
    vi.stubEnv('FORCE_COLOR', '1');
    vi.stubEnv('NO_COLOR', '');
    expect(supportsColor()).toBe(true);
  });

  it('is false when NO_COLOR is set alone', () => {
    vi.stubEnv('FORCE_COLOR', '');
    vi.stubEnv('NO_COLOR', '1');
    expect(supportsColor()).toBe(false);
  });

  it('is true when both FORCE_COLOR and NO_COLOR are set (FORCE wins)', () => {
    vi.stubEnv('FORCE_COLOR', '1');
    vi.stubEnv('NO_COLOR', '1');
    expect(supportsColor()).toBe(true);
  });

  it('is false when neither is set and stdout is not a TTY', () => {
    vi.stubEnv('FORCE_COLOR', '');
    vi.stubEnv('NO_COLOR', '');
    const original = process.stdout.isTTY;
    Object.defineProperty(process.stdout, 'isTTY', { value: undefined, configurable: true });
    try {
      expect(supportsColor()).toBe(false);
    } finally {
      Object.defineProperty(process.stdout, 'isTTY', { value: original, configurable: true });
    }
  });
});

describe('wrappers', () => {
  it('wrap with escape codes when enabled', () => {
    expect(bold('x', true)).toBe('\x1b[1mx\x1b[0m');
    expect(red('x', true)).toBe('\x1b[31mx\x1b[0m');
    expect(yellow('x', true)).toBe('\x1b[33mx\x1b[0m');
    expect(dim('x', true)).toBe('\x1b[2mx\x1b[0m');
  });

  it('return the string unchanged when disabled', () => {
    expect(bold('x', false)).toBe('x');
    expect(red('x', false)).toBe('x');
    expect(yellow('x', false)).toBe('x');
    expect(dim('x', false)).toBe('x');
  });
});
