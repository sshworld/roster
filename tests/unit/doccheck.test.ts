import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { run } from '../../src/doccheck.js';

const mixedFixture = 'tests/fixtures/doccheck/mixed.md';
const ignoredFixture = 'tests/fixtures/doccheck/ignored.md';

interface JsonFinding {
  file: string;
  line: number;
  command: string;
  reason: string;
}

describe('doccheck run()', () => {
  let logSpy: ReturnType<typeof vi.spyOn>;
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    logSpy.mockRestore();
    errorSpy.mockRestore();
  });

  async function findingsFor(...args: string[]): Promise<{ code: number; findings: JsonFinding[] }> {
    logSpy.mockClear();
    const code = await run([...args, '--json']);
    const printed = logSpy.mock.calls.map((c) => c[0]).join('\n');
    const parsed = JSON.parse(printed);
    return { code, findings: parsed.findings as JsonFinding[] };
  }

  it('detects a dead relative path command', async () => {
    const { findings } = await findingsFor(mixedFixture);
    const finding = findings.find((f) => f.line === 18);
    expect(finding).toBeDefined();
    expect(finding?.command).toBe('./scripts/does-not-exist.sh');
    expect(finding?.reason.toLowerCase()).toContain('not found');
  });

  it('detects a missing npm run script', async () => {
    const { findings } = await findingsFor(mixedFixture);
    const finding = findings.find((f) => f.line === 17);
    expect(finding).toBeDefined();
    expect(finding?.reason).toContain('this-script-does-not-exist');
  });

  it('detects a relative script that exists but lacks execute permission, with a distinct reason', async () => {
    const { findings } = await findingsFor(mixedFixture);
    const finding = findings.find((f) => f.line === 19);
    expect(finding).toBeDefined();
    expect(finding?.reason.toLowerCase()).toContain('executable');
    expect(finding?.reason.toLowerCase()).not.toContain('not found');
  });

  it('does not flag an existing, executable relative script', async () => {
    const { findings } = await findingsFor(mixedFixture);
    expect(findings.find((f) => f.line === 20)).toBeUndefined();
  });

  it('skips absolute paths, npx, npm install, comments, global binaries, and env-prefixed commands', async () => {
    const { findings } = await findingsFor(mixedFixture);
    // Only the three genuine findings (lines 17, 18, 19) should surface.
    expect(findings.map((f) => f.line).sort((a, b) => a - b)).toEqual([17, 18, 19]);
  });

  it('ignores path-like text outside fenced code blocks and inside non-sh fenced blocks', async () => {
    const { code, findings } = await findingsFor(ignoredFixture);
    expect(findings).toEqual([]);
    expect(code).toBe(0);
  });

  it('exits 1 when findings exist and 0 when clean', async () => {
    const dirty = await findingsFor(mixedFixture);
    expect(dirty.code).toBe(1);
    const clean = await findingsFor(ignoredFixture);
    expect(clean.code).toBe(0);
  });

  it('emits JSON.parse-able output with --json', async () => {
    const code = await run([mixedFixture, '--json']);
    expect(code).toBe(1);
    const printed = logSpy.mock.calls.map((c) => c[0]).join('\n');
    expect(() => JSON.parse(printed)).not.toThrow();
    const parsed = JSON.parse(printed);
    expect(Array.isArray(parsed.findings)).toBe(true);
    expect(parsed.findings.length).toBe(3);
  });

  it('prints human-readable file:line command reason lines without --json', async () => {
    const code = await run([mixedFixture]);
    expect(code).toBe(1);
    const printed = logSpy.mock.calls.map((c) => c[0]).join('\n');
    expect(printed).toContain(`${mixedFixture}:17`);
    expect(printed).toContain(`${mixedFixture}:18`);
    expect(printed).toContain(`${mixedFixture}:19`);
  });

  it('prints help and exits 0 for --help', async () => {
    const code = await run(['--help']);
    expect(code).toBe(0);
    const printed = logSpy.mock.calls.map((c) => c[0]).join('\n');
    expect(printed.toLowerCase()).toContain('doccheck');
  });

  it('is zero-finding against the repo\'s real README.md (regression guard)', async () => {
    const code = await run(['README.md']);
    expect(code).toBe(0);
    expect(errorSpy).not.toHaveBeenCalled();
  });
});
