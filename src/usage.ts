import { createReadStream } from 'node:fs';
import { readdir, stat } from 'node:fs/promises';
import { createInterface } from 'node:readline';
import os from 'node:os';
import path from 'node:path';
import type { AgentDef } from './core/types.js';
import { sources } from './sources/index.js';
import { loadPluginRoster, type ActivePlugin } from './sources/plugin-cache.js';
import { bold, red, yellow, supportsColor } from './render/ansi.js';

interface ParsedArgs {
  days: number;
  json: boolean;
  user: boolean;
  plugin: boolean;
  help: boolean;
}

const HELP_TEXT = `Usage: roster usage [options]

Reports how often each subagent_type has been invoked (via the Agent/Task
tool) across Claude Code transcript files.

Options:
  --days <n>       Only count invocations from the last <n> days (default 30)
  --json           Output machine-readable JSON
  --user           Join against the user-level agent roster (~/.claude/agents)
  --plugin         Join against the installed plugin-cache roster, plus a
                   per-plugin unused-agent rollup (uninstall candidates)
  --help, -h       Show this help text

Env:
  ROSTER_CLAUDE_DIR   Transcripts root (default ~/.claude)
`;

function parseArgs(argv: string[]): ParsedArgs {
  const result: ParsedArgs = {
    days: 30,
    json: false,
    user: false,
    plugin: false,
    help: false,
  };

  let i = 0;
  while (i < argv.length) {
    const arg = argv[i];
    switch (arg) {
      case '--help':
      case '-h':
        result.help = true;
        i += 1;
        break;
      case '--json':
        result.json = true;
        i += 1;
        break;
      case '--user':
        result.user = true;
        i += 1;
        break;
      case '--plugin':
        result.plugin = true;
        i += 1;
        break;
      case '--days': {
        const n = Number(argv[i + 1]);
        if (Number.isFinite(n) && n > 0) result.days = n;
        i += 2;
        break;
      }
      default:
        i += 1;
        break;
    }
  }

  return result;
}

/**
 * Pure join between observed invocation counts and a roster's agent names.
 * - unused: in the roster, but zero observed invocations (directly, or via an
 *   alias key such as the `<plugin>:<name>` form transcripts record for
 *   plugin-sourced subagents).
 * - ghosts: observed invocations for a subagent_type that isn't in the roster
 *   and isn't a known alias of a roster name.
 *
 * `aliases` maps an observed count key (e.g. `sshworld:implementor`) to the
 * canonical bare roster name (e.g. `implementor`). Omitting it preserves the
 * prior exact-match-only behavior.
 */
export function computeJoin(
  counts: Record<string, number>,
  rosterNames: string[],
  aliases: Record<string, string> = {}
): { unused: string[]; ghosts: string[] } {
  const rosterSet = new Set(rosterNames);
  const unused = rosterNames.filter((name) => {
    if (counts[name]) return false;
    return !Object.keys(counts).some((key) => aliases[key] === name);
  });
  const ghosts = Object.keys(counts).filter(
    (name) => !rosterSet.has(name) && !(name in aliases && rosterSet.has(aliases[name]))
  );
  return { unused, ghosts };
}

export interface PluginRollupEntry {
  name: string;
  scope?: string;
  projectPath?: string;
  version: string;
  agentCount: number;
  usedCount: number;
  unusedAgents: string[];
  status: 'unused' | 'used' | 'no-agents';
}

/**
 * Per-plugin unused-agent rollup — the data behind `--plugin`'s uninstall
 * candidates: a plugin is `unused` when every agent it ships has zero
 * observed invocations, `used` when at least one does, and `no-agents` when
 * it ships zero agents at all (excluded from the unused/used judgement —
 * there's nothing to have observed).
 *
 * "used" (agent, not invocation) = `counts[name] > 0` OR
 * `counts["<pluginName>:<name>"] > 0` (the alias form transcripts record for
 * plugin-sourced subagents). The bare-name check can false-positive "used" if
 * an unrelated same-named user agent is invoked instead — that's the safe
 * direction: it can only make us under-report an uninstall candidate, never
 * wrongly flag an in-use plugin as safe to remove.
 */
export function computePluginRollup(
  counts: Record<string, number>,
  agents: AgentDef[],
  activePlugins: Pick<ActivePlugin, 'name' | 'version' | 'scope' | 'projectPath'>[]
): PluginRollupEntry[] {
  return activePlugins.map((plugin) => {
    const pluginAgents = agents.filter((agent) => agent.pluginName === plugin.name);
    const unusedAgents: string[] = [];
    let usedCount = 0;

    for (const agent of pluginAgents) {
      const used = Boolean(counts[agent.name]) || Boolean(counts[`${plugin.name}:${agent.name}`]);
      if (used) usedCount += 1;
      else unusedAgents.push(agent.name);
    }

    const agentCount = pluginAgents.length;
    const status: PluginRollupEntry['status'] =
      agentCount === 0 ? 'no-agents' : usedCount > 0 ? 'used' : 'unused';

    return {
      name: plugin.name,
      scope: plugin.scope,
      projectPath: plugin.projectPath,
      version: plugin.version,
      agentCount,
      usedCount,
      unusedAgents,
      status,
    };
  });
}

async function findJsonlFiles(root: string): Promise<string[]> {
  const projectsDir = path.join(root, 'projects');
  let projectEntries;
  try {
    projectEntries = await readdir(projectsDir, { withFileTypes: true });
  } catch {
    return [];
  }

  const files: string[] = [];
  for (const projectEntry of projectEntries) {
    if (!projectEntry.isDirectory()) continue;
    const projectDir = path.join(projectsDir, projectEntry.name);
    let fileEntries;
    try {
      fileEntries = await readdir(projectDir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const fileEntry of fileEntries) {
      if (fileEntry.isFile() && fileEntry.name.endsWith('.jsonl')) {
        files.push(path.join(projectDir, fileEntry.name));
      }
    }
  }
  return files;
}

async function countAgentInvocations(
  filePath: string,
  cutoff: Date,
  counts: Record<string, number>
): Promise<void> {
  const rl = createInterface({
    input: createReadStream(filePath, { encoding: 'utf8' }),
    crlfDelay: Infinity,
  });

  for await (const line of rl) {
    if (!line.trim()) continue;

    let record: unknown;
    try {
      record = JSON.parse(line);
    } catch {
      continue;
    }
    if (typeof record !== 'object' || record === null) continue;
    const obj = record as Record<string, unknown>;

    const timestamp = obj.timestamp;
    if (typeof timestamp !== 'string') continue;
    const ts = new Date(timestamp);
    if (Number.isNaN(ts.getTime()) || ts < cutoff) continue;

    if (obj.type !== 'assistant') continue;
    const message = obj.message as Record<string, unknown> | undefined;
    const content = message?.content;
    if (!Array.isArray(content)) continue;

    for (const block of content) {
      if (
        block &&
        typeof block === 'object' &&
        (block as Record<string, unknown>).type === 'tool_use' &&
        ((block as Record<string, unknown>).name === 'Agent' || (block as Record<string, unknown>).name === 'Task')
      ) {
        const input = (block as Record<string, unknown>).input as Record<string, unknown> | undefined;
        const subagentType = input?.subagent_type;
        if (typeof subagentType === 'string') {
          counts[subagentType] = (counts[subagentType] ?? 0) + 1;
        }
      }
    }
  }
}

async function loadRosterNames(
  user: boolean,
  plugin: boolean
): Promise<{
  names: string[];
  aliases: Record<string, string>;
  pluginAgents: AgentDef[];
  activePlugins: ActivePlugin[];
}> {
  const names = new Set<string>();
  const aliases: Record<string, string> = {};
  let pluginAgents: AgentDef[] = [];
  let activePlugins: ActivePlugin[] = [];

  if (user) {
    const agents = await sources.user.load();
    for (const agent of agents) names.add(agent.name);
  }
  if (plugin) {
    // loadPluginRoster resolves installed_plugins.json exactly once and hands
    // back both the plugin list and their agents from that single pass — see
    // sources/plugin-cache.ts for why calling load() + a separate active-plugin
    // lookup here would double-parse and double-log.
    const roster = await loadPluginRoster();
    pluginAgents = roster.agents;
    activePlugins = roster.plugins;
    for (const agent of pluginAgents) {
      names.add(agent.name);
      if (agent.pluginName) {
        aliases[`${agent.pluginName}:${agent.name}`] = agent.name;
      }
    }
  }
  return { names: [...names], aliases, pluginAgents, activePlugins };
}

function renderHuman(
  days: number,
  counts: Record<string, number>,
  unused: string[],
  ghosts: string[],
  pluginRollup: PluginRollupEntry[] | undefined,
  color: boolean
): string {
  const lines: string[] = [];
  const rows = Object.entries(counts).sort((a, b) => b[1] - a[1]);

  if (rows.length === 0) {
    lines.push(`No agent invocations found in the last ${days} day(s).`);
  } else {
    lines.push(bold(`Agent usage (last ${days} day(s)):`, color));
    for (const [name, count] of rows) {
      lines.push(`  ${count}\t${name}`);
    }
  }

  if (unused.length > 0) {
    lines.push(yellow('Unused (in roster, 0 invocations):', color));
    for (const name of unused) lines.push(`  ${name}`);
  }

  if (ghosts.length > 0) {
    lines.push(red('Ghost subagent_type (invoked, not in roster):', color));
    for (const name of ghosts) lines.push(`  ${name}`);
  }

  if (pluginRollup) {
    const fullyUnused = pluginRollup.filter((p) => p.status === 'unused');
    const noAgents = pluginRollup.filter((p) => p.status === 'no-agents');

    if (fullyUnused.length > 0) {
      lines.push(yellow('Fully-unused plugins (uninstall candidates):', color));
      for (const p of fullyUnused) {
        const scopeHint =
          p.scope === 'local' || p.scope === 'project'
            ? ` (--scope local, run from ${p.projectPath ?? 'the pinning project'})`
            : '';
        lines.push(
          `  ${p.name} — ${p.agentCount} agent(s) unused: claude plugin uninstall ${p.name}${scopeHint}`
        );
      }
    }

    if (noAgents.length > 0) {
      lines.push(`No agents (usage unknown): ${noAgents.map((p) => p.name).join(', ')}`);
    }
  }

  return lines.join('\n');
}

export async function run(argv: string[]): Promise<number> {
  const parsed = parseArgs(argv);
  if (parsed.help) {
    console.log(HELP_TEXT);
    return 0;
  }

  const root = process.env.ROSTER_CLAUDE_DIR ?? path.join(os.homedir(), '.claude');
  const cutoff = new Date(Date.now() - parsed.days * 24 * 60 * 60 * 1000);

  const files = await findJsonlFiles(root);
  const counts: Record<string, number> = {};

  for (const filePath of files) {
    let stats;
    try {
      stats = await stat(filePath);
    } catch {
      continue;
    }
    if (stats.mtime < cutoff) continue;
    await countAgentInvocations(filePath, cutoff, counts);
  }

  let unused: string[] = [];
  let ghosts: string[] = [];
  // Contract: --plugin always yields a `plugins` array in the JSON output
  // (even when empty) — never omitted, never left undefined.
  let pluginRollup: PluginRollupEntry[] | undefined;
  if (parsed.user || parsed.plugin) {
    const { names: rosterNames, aliases, pluginAgents, activePlugins } = await loadRosterNames(
      parsed.user,
      parsed.plugin
    );
    const joined = computeJoin(counts, rosterNames, aliases);
    unused = joined.unused;
    ghosts = joined.ghosts;

    if (parsed.plugin) {
      pluginRollup = computePluginRollup(counts, pluginAgents, activePlugins);
    }
  }

  if (parsed.json) {
    const output: Record<string, unknown> = { days: parsed.days, counts, unused, ghosts };
    if (parsed.plugin) output.plugins = pluginRollup ?? [];
    console.log(JSON.stringify(output));
  } else {
    console.log(renderHuman(parsed.days, counts, unused, ghosts, pluginRollup, supportsColor()));
  }

  return 0;
}
