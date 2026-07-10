import { describe, it, expect, vi, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { run, computeJoin } from '../../src/usage.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixtureRoot = path.join(__dirname, '../fixtures/usage-home');

function iso(msAgo: number): string {
  return new Date(Date.now() - msAgo).toISOString();
}

function line(obj: unknown): string {
  return JSON.stringify(obj) + '\n';
}

function assistantAgentLine(subagentType: string, timestamp: string, toolName: 'Agent' | 'Task' = 'Agent'): string {
  return line({
    type: 'assistant',
    timestamp,
    message: {
      content: [
        {
          type: 'tool_use',
          name: toolName,
          input: { subagent_type: subagentType },
        },
      ],
    },
  });
}

const DAY_MS = 24 * 60 * 60 * 1000;

describe('usage', () => {
  beforeAll(() => {
    fs.mkdirSync(fixtureRoot, { recursive: true });

    // proj-mixed: Agent + Task tool_use, both recent — aggregation correctness.
    const mixedDir = path.join(fixtureRoot, 'projects', 'proj-mixed');
    fs.mkdirSync(mixedDir, { recursive: true });
    const mixedFile = path.join(mixedDir, 'session.jsonl');
    fs.writeFileSync(
      mixedFile,
      assistantAgentLine('reviewer', iso(60 * 60 * 1000), 'Agent') +
        assistantAgentLine('implementor', iso(30 * 60 * 1000), 'Task') +
        assistantAgentLine('reviewer', iso(10 * 60 * 1000), 'Agent')
    );

    // proj-cutoff: one recent line + one line older than the --days cutoff.
    const cutoffDir = path.join(fixtureRoot, 'projects', 'proj-cutoff');
    fs.mkdirSync(cutoffDir, { recursive: true });
    const cutoffFile = path.join(cutoffDir, 'session.jsonl');
    fs.writeFileSync(
      cutoffFile,
      assistantAgentLine('recent-agent', iso(60 * 60 * 1000)) +
        assistantAgentLine('old-agent', iso(40 * DAY_MS))
    );

    // proj-oldfile: content itself is recent, but the file's mtime predates
    // the cutoff — the mtime prefilter must skip the whole file unopened.
    const oldFileDir = path.join(fixtureRoot, 'projects', 'proj-oldfile');
    fs.mkdirSync(oldFileDir, { recursive: true });
    const oldFile = path.join(oldFileDir, 'session.jsonl');
    fs.writeFileSync(oldFile, assistantAgentLine('mtime-skipped-agent', iso(60 * 60 * 1000)));
    const oldMtime = new Date(Date.now() - 400 * DAY_MS);
    fs.utimesSync(oldFile, oldMtime, oldMtime);

    // proj-broken: one malformed JSON line alongside a valid one.
    const brokenDir = path.join(fixtureRoot, 'projects', 'proj-broken');
    fs.mkdirSync(brokenDir, { recursive: true });
    const brokenFile = path.join(brokenDir, 'session.jsonl');
    fs.writeFileSync(
      brokenFile,
      '{ this is not valid json\n' + assistantAgentLine('resilient-agent', iso(60 * 60 * 1000))
    );

    // proj-notimestamp: valid JSON, but missing the line-level timestamp.
    const noTsDir = path.join(fixtureRoot, 'projects', 'proj-notimestamp');
    fs.mkdirSync(noTsDir, { recursive: true });
    const noTsFile = path.join(noTsDir, 'session.jsonl');
    fs.writeFileSync(
      noTsFile,
      line({
        type: 'assistant',
        message: {
          content: [{ type: 'tool_use', name: 'Agent', input: { subagent_type: 'no-timestamp-agent' } }],
        },
      })
    );
  });

  afterAll(() => {
    // Only remove the dynamically generated content — the fixture root
    // itself (with its .gitkeep) is a tracked, empty scaffold directory.
    fs.rmSync(path.join(fixtureRoot, 'projects'), { recursive: true, force: true });
  });

  let logSpy: ReturnType<typeof vi.spyOn>;
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.stubEnv('ROSTER_CLAUDE_DIR', fixtureRoot);
  });

  afterEach(() => {
    logSpy.mockRestore();
    errorSpy.mockRestore();
    vi.unstubAllEnvs();
  });

  function jsonOutput(): { days: number; counts: Record<string, number>; unused: string[]; ghosts: string[] } {
    const printed = logSpy.mock.calls.map((c) => c[0]).join('\n');
    return JSON.parse(printed);
  }

  it('aggregates Agent and Task tool_use invocations by subagent_type', async () => {
    const code = await run(['--json', '--days', '30']);
    expect(code).toBe(0);
    const { counts } = jsonOutput();
    expect(counts.reviewer).toBe(2);
    expect(counts.implementor).toBe(1);
  });

  it('excludes lines whose timestamp is older than the --days cutoff', async () => {
    const code = await run(['--json', '--days', '30']);
    expect(code).toBe(0);
    const { counts } = jsonOutput();
    expect(counts['recent-agent']).toBe(1);
    expect(counts['old-agent']).toBeUndefined();
  });

  it('skips a whole file whose mtime predates the cutoff, even if its content is recent', async () => {
    const code = await run(['--json', '--days', '30']);
    expect(code).toBe(0);
    const { counts } = jsonOutput();
    expect(counts['mtime-skipped-agent']).toBeUndefined();
  });

  it('tolerates malformed JSON lines without crashing', async () => {
    const code = await run(['--json', '--days', '30']);
    expect(code).toBe(0);
    const { counts } = jsonOutput();
    expect(counts['resilient-agent']).toBe(1);
  });

  it('skips lines with no line-level timestamp', async () => {
    const code = await run(['--json', '--days', '30']);
    expect(code).toBe(0);
    const { counts } = jsonOutput();
    expect(counts['no-timestamp-agent']).toBeUndefined();
  });

  it('emits parseable JSON with the documented shape via --json', async () => {
    const code = await run(['--json']);
    expect(code).toBe(0);
    const parsed = jsonOutput();
    expect(parsed.days).toBe(30);
    expect(typeof parsed.counts).toBe('object');
    expect(Array.isArray(parsed.unused)).toBe(true);
    expect(Array.isArray(parsed.ghosts)).toBe(true);
  });

  it('always exits 0, including for an unrecognized flag', async () => {
    const code = await run(['--bogus-flag']);
    expect(code).toBe(0);
  });

  it('prints help and exits 0 for --help', async () => {
    const code = await run(['--help']);
    expect(code).toBe(0);
    const printed = logSpy.mock.calls.map((c) => c[0]).join('\n');
    expect(printed.toLowerCase()).toContain('usage');
  });
});

describe('computeJoin', () => {
  it('flags roster agents with zero observed invocations as unused', () => {
    const { unused } = computeJoin({ reviewer: 3 }, ['reviewer', 'planner']);
    expect(unused).toEqual(['planner']);
  });

  it('flags observed subagent_types absent from the roster as ghosts', () => {
    const { ghosts } = computeJoin({ reviewer: 3, 'renamed-agent': 1 }, ['reviewer']);
    expect(ghosts).toEqual(['renamed-agent']);
  });

  it('returns empty arrays when counts and roster fully overlap', () => {
    const joined = computeJoin({ reviewer: 1, planner: 2 }, ['reviewer', 'planner']);
    expect(joined.unused).toEqual([]);
    expect(joined.ghosts).toEqual([]);
  });

  it('without an alias map, a plugin-prefixed subagent_type is double-counted as both unused and ghost (regression baseline)', () => {
    const joined = computeJoin({ 'sshworld:implementor': 33 }, ['implementor']);
    expect(joined.unused).toEqual(['implementor']);
    expect(joined.ghosts).toEqual(['sshworld:implementor']);
  });

  it('normalizes a plugin-prefixed subagent_type via the alias map so it counts toward the bare roster name', () => {
    const joined = computeJoin({ 'sshworld:implementor': 33 }, ['implementor'], {
      'sshworld:implementor': 'implementor',
    });
    expect(joined.unused).toEqual([]);
    expect(joined.ghosts).toEqual([]);
  });
});
