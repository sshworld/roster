import { describe, it, expect, vi, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { run, computeJoin, computePluginRollup } from '../../src/usage.js';

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

    // proj-plugin-rollup: feeds the --plugin rollup integration test below —
    // one direct hit for the bare agent name, one alias-qualified hit
    // (`<pluginName>:<agentName>`, the form transcripts record for plugin-sourced
    // subagents) so both "used" detection paths are exercised end-to-end.
    const pluginRollupDir = path.join(fixtureRoot, 'projects', 'proj-plugin-rollup');
    fs.mkdirSync(pluginRollupDir, { recursive: true });
    fs.writeFileSync(
      path.join(pluginRollupDir, 'session.jsonl'),
      assistantAgentLine('solo-used-agent', iso(60 * 60 * 1000)) +
        assistantAgentLine('alias-used-plugin:alias-used-agent', iso(60 * 60 * 1000))
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

  describe('--plugin rollup integration', () => {
    let pluginHome: string;

    beforeAll(async () => {
      pluginHome = await mkdtemp(path.join(tmpdir(), 'roster-usage-plugin-'));

      function pluginDir(marketplace: string, name: string, version: string): string {
        return path.join(pluginHome, '.claude', 'plugins', 'cache', marketplace, name, version);
      }

      function writeAgent(dir: string, name: string): void {
        fs.mkdirSync(path.join(dir, 'agents'), { recursive: true });
        fs.writeFileSync(
          path.join(dir, 'agents', `${name}.md`),
          `---\nname: ${name}\ndescription: fixture agent ${name}\n---\n\nBody for ${name}.\n`
        );
      }

      const unusedDir = pluginDir('marketplace-x', 'unused-plugin', '1.0.0');
      writeAgent(unusedDir, 'unused-plugin-agent');

      const usedDir = pluginDir('marketplace-x', 'used-plugin', '1.0.0');
      writeAgent(usedDir, 'solo-used-agent');

      const aliasDir = pluginDir('marketplace-x', 'alias-used-plugin', '1.0.0');
      writeAgent(aliasDir, 'alias-used-agent');

      const emptyDir = pluginDir('marketplace-x', 'empty-plugin', '1.0.0');
      fs.mkdirSync(emptyDir, { recursive: true }); // no agents/ subdir at all

      const pluginsRoot = path.join(pluginHome, '.claude', 'plugins');
      fs.mkdirSync(pluginsRoot, { recursive: true });
      fs.writeFileSync(
        path.join(pluginsRoot, 'installed_plugins.json'),
        JSON.stringify({
          version: 2,
          plugins: {
            'unused-plugin@marketplace-x': [
              {
                scope: 'user',
                installPath: unusedDir,
                version: '1.0.0',
                installedAt: '2026-01-01T00:00:00.000Z',
                lastUpdated: '2026-01-01T00:00:00.000Z',
              },
            ],
            'used-plugin@marketplace-x': [
              {
                scope: 'user',
                installPath: usedDir,
                version: '1.0.0',
                installedAt: '2026-01-01T00:00:00.000Z',
                lastUpdated: '2026-01-01T00:00:00.000Z',
              },
            ],
            'alias-used-plugin@marketplace-x': [
              {
                scope: 'user',
                installPath: aliasDir,
                version: '1.0.0',
                installedAt: '2026-01-01T00:00:00.000Z',
                lastUpdated: '2026-01-01T00:00:00.000Z',
              },
            ],
            'empty-plugin@marketplace-x': [
              {
                scope: 'user',
                installPath: emptyDir,
                version: '1.0.0',
                installedAt: '2026-01-01T00:00:00.000Z',
                lastUpdated: '2026-01-01T00:00:00.000Z',
              },
            ],
          },
        })
      );
    });

    afterAll(async () => {
      await rm(pluginHome, { recursive: true, force: true });
    });

    beforeEach(() => {
      vi.stubEnv('HOME', pluginHome);
    });

    it('always returns a `plugins` array (contract) and classifies each fixture plugin by status', async () => {
      const code = await run(['--plugin', '--json']);
      expect(code).toBe(0);
      const printed = logSpy.mock.calls.map((c) => c[0]).join('\n');
      const parsed = JSON.parse(printed) as { plugins: unknown };
      expect(Array.isArray(parsed.plugins)).toBe(true);

      const plugins = parsed.plugins as Array<{ name: string; status: string; agentCount: number }>;
      const byName = Object.fromEntries(plugins.map((p) => [p.name, p]));
      expect(byName['unused-plugin']?.status).toBe('unused');
      expect(byName['used-plugin']?.status).toBe('used');
      expect(byName['alias-used-plugin']?.status).toBe('used');
      expect(byName['empty-plugin']?.status).toBe('no-agents');
      expect(byName['empty-plugin']?.agentCount).toBe(0);
    });

    it('omits the `plugins` field entirely when --plugin is not passed', async () => {
      const code = await run(['--json']);
      expect(code).toBe(0);
      const printed = logSpy.mock.calls.map((c) => c[0]).join('\n');
      const parsed = JSON.parse(printed) as Record<string, unknown>;
      expect('plugins' in parsed).toBe(false);
    });
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

function fakeAgent(name: string, pluginName: string) {
  return {
    name,
    description: `fake agent ${name}`,
    body: 'fake body',
    sourceLabel: `plugin:${pluginName}@1.0.0`,
    filePath: `/fake/${pluginName}/${name}.md`,
    pluginName,
  };
}

describe('computePluginRollup', () => {
  it('marks a plugin unused when none of its agents have any observed invocations', () => {
    const activePlugins = [{ name: 'pkg', marketplace: 'mp', version: '1.0.0', installPath: '/fake/pkg' }];
    const agents = [fakeAgent('agent-a', 'pkg'), fakeAgent('agent-b', 'pkg')];
    const [entry] = computePluginRollup({}, agents, activePlugins);
    expect(entry.status).toBe('unused');
    expect(entry.agentCount).toBe(2);
    expect(entry.usedCount).toBe(0);
    expect(entry.unusedAgents.sort()).toEqual(['agent-a', 'agent-b']);
  });

  it('marks a plugin used when at least one agent has a direct observed invocation', () => {
    const activePlugins = [{ name: 'pkg', marketplace: 'mp', version: '1.0.0', installPath: '/fake/pkg' }];
    const agents = [fakeAgent('agent-a', 'pkg'), fakeAgent('agent-b', 'pkg')];
    const [entry] = computePluginRollup({ 'agent-a': 3 }, agents, activePlugins);
    expect(entry.status).toBe('used');
    expect(entry.usedCount).toBe(1);
    expect(entry.unusedAgents).toEqual(['agent-b']);
  });

  it('marks a plugin used when an agent is only invoked via its `<plugin>:<name>` alias', () => {
    // bare-name matching also counts as used — this is intentionally the safe
    // direction (an unrelated same-named user agent could false-positive this
    // to "used"), which only means we under-report uninstall candidates, never
    // wrongly flag an in-use plugin as safe to remove.
    const activePlugins = [{ name: 'pkg', marketplace: 'mp', version: '1.0.0', installPath: '/fake/pkg' }];
    const agents = [fakeAgent('agent-a', 'pkg')];
    const [entry] = computePluginRollup({ 'pkg:agent-a': 7 }, agents, activePlugins);
    expect(entry.status).toBe('used');
    expect(entry.usedCount).toBe(1);
    expect(entry.unusedAgents).toEqual([]);
  });

  it('marks a plugin no-agents (excluded from unused/used judgement) when it ships zero agents', () => {
    const activePlugins = [{ name: 'pkg', marketplace: 'mp', version: '1.0.0', installPath: '/fake/pkg' }];
    const [entry] = computePluginRollup({}, [], activePlugins);
    expect(entry.status).toBe('no-agents');
    expect(entry.agentCount).toBe(0);
  });

  it('returns an empty array for an empty plugin list', () => {
    expect(computePluginRollup({}, [], [])).toEqual([]);
  });
});
