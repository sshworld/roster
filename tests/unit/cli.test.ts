import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { main } from '../../src/cli.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixtureDir = path.join(__dirname, '../fixtures/roster-a');
const agentShapedFixtureDir = path.join(__dirname, '../fixtures/agent-shaped-dir');

describe('cli main()', () => {
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

  it('exits 1 when a finding crosses --fail-above', async () => {
    const code = await main(['audit', fixtureDir, '--fail-above', '0.9']);
    expect(code).toBe(1);
  });

  it('exits 0 with --no-fail even when crossing the threshold', async () => {
    const code = await main(['audit', fixtureDir, '--fail-above', '0.9', '--no-fail']);
    expect(code).toBe(0);
  });

  it('emits valid JSON with --json', async () => {
    const code = await main(['audit', fixtureDir, '--json', '--no-fail']);
    expect(code).toBe(0);
    const printed = logSpy.mock.calls.map((c) => c[0]).join('\n');
    const parsed = JSON.parse(printed);
    expect(parsed.findings).toBeDefined();
    expect(parsed.agents.length).toBeGreaterThan(0);
    expect(parsed.meta.skippedNonAgentFiles).toBe(0);
  });

  it('reports meta.skippedNonAgentFiles when non-agent-shaped markdown is skipped', async () => {
    const code = await main(['audit', agentShapedFixtureDir, '--json', '--no-fail']);
    expect(code).toBe(0);
    const printed = logSpy.mock.calls.map((c) => c[0]).join('\n');
    const parsed = JSON.parse(printed);
    expect(parsed.meta.skippedNonAgentFiles).toBe(2);
  });

  it('writes a self-contained HTML report with --html <out>', async () => {
    const out = path.join(os.tmpdir(), `roster-cli-test-${process.pid}.html`);
    try {
      const code = await main(['audit', fixtureDir, '--html', out, '--no-fail']);
      expect(code).toBe(0);
      const html = fs.readFileSync(out, 'utf8');
      expect(html.toLowerCase()).toContain('overlap');
      expect(html).not.toMatch(/<script src=|<link href=|url\(http/);
    } finally {
      fs.rmSync(out, { force: true });
    }
  });

  it('merges multiple sources and errors without any source', async () => {
    const code = await main(['audit']);
    expect(code).toBe(1);
    expect(errorSpy).toHaveBeenCalled();
  });

  it('prints an overlap section via the default human renderer', async () => {
    const code = await main(['audit', fixtureDir, '--no-fail']);
    expect(code).toBe(0);
    const printed = logSpy.mock.calls.map((c) => c[0]).join('\n');
    expect(printed.toLowerCase()).toContain('overlap');
  });

  it('emits ANSI escapes when FORCE_COLOR is set', async () => {
    vi.stubEnv('FORCE_COLOR', '1');
    try {
      const code = await main(['audit', fixtureDir, '--no-fail']);
      expect(code).toBe(0);
      const printed = logSpy.mock.calls.map((c) => c[0]).join('\n');
      expect(printed).toContain('\x1b[');
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it('emits no ANSI escapes without color env stubs (non-TTY)', async () => {
    const originalIsTTY = process.stdout.isTTY;
    Object.defineProperty(process.stdout, 'isTTY', { value: undefined, configurable: true });
    try {
      const code = await main(['audit', fixtureDir, '--no-fail']);
      expect(code).toBe(0);
      const printed = logSpy.mock.calls.map((c) => c[0]).join('\n');
      expect(printed).not.toContain('\x1b[');
    } finally {
      Object.defineProperty(process.stdout, 'isTTY', { value: originalIsTTY, configurable: true });
    }
  });

  it('prints help and exits 0 for --help', async () => {
    const code = await main(['--help']);
    expect(code).toBe(0);
    expect(logSpy).toHaveBeenCalled();
  });

  it('warns on stderr but keeps auditing when --enabled-only is used without --plugin', async () => {
    const code = await main(['audit', fixtureDir, '--enabled-only', '--no-fail']);
    expect(code).toBe(0);
    const errors = errorSpy.mock.calls.map((c) => c[0]).join('\n');
    expect(errors).toContain('--enabled-only');
  });

  describe('subcommand dispatch', () => {
    it('dispatches to doccheck, which exits 0 for the repo\'s real README.md (zero findings)', async () => {
      const code = await main(['doccheck', 'README.md']);
      expect(code).toBe(0);
    });

    it('dispatches to usage, which is implemented and always exits 0', async () => {
      // usage.ts is a real report generator (not a stub) — point it at an
      // empty transcripts root so this stays fast and deterministic.
      vi.stubEnv('ROSTER_CLAUDE_DIR', path.join(os.tmpdir(), `roster-cli-test-empty-${process.pid}`));
      try {
        const code = await main(['usage']);
        expect(code).toBe(0);
      } finally {
        vi.unstubAllEnvs();
      }
    });

    it('exits 1 and prints help for an unknown subcommand', async () => {
      const code = await main(['bogus']);
      expect(code).toBe(1);
      expect(errorSpy).toHaveBeenCalled();
    });

    it('still runs the audit subcommand as before', async () => {
      const code = await main(['audit', fixtureDir, '--no-fail']);
      expect(code).toBe(0);
    });
  });
});
