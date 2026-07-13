import { createReadStream } from 'node:fs';
import { readdir, stat } from 'node:fs/promises';
import { createInterface } from 'node:readline';
import os from 'node:os';
import path from 'node:path';
import { sources } from './sources/index.js';
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
  --plugin         Join against the installed plugin-cache roster
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
): Promise<{ names: string[]; aliases: Record<string, string> }> {
  const names = new Set<string>();
  const aliases: Record<string, string> = {};
  if (user) {
    const agents = await sources.user.load();
    for (const agent of agents) names.add(agent.name);
  }
  if (plugin) {
    const agents = await sources['plugin-cache'].load();
    for (const agent of agents) {
      names.add(agent.name);
      if (agent.pluginName) {
        aliases[`${agent.pluginName}:${agent.name}`] = agent.name;
      }
    }
  }
  return { names: [...names], aliases };
}

function renderHuman(
  days: number,
  counts: Record<string, number>,
  unused: string[],
  ghosts: string[],
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
  if (parsed.user || parsed.plugin) {
    const { names: rosterNames, aliases } = await loadRosterNames(parsed.user, parsed.plugin);
    const joined = computeJoin(counts, rosterNames, aliases);
    unused = joined.unused;
    ghosts = joined.ghosts;
  }

  if (parsed.json) {
    console.log(JSON.stringify({ days: parsed.days, counts, unused, ghosts }));
  } else {
    console.log(renderHuman(parsed.days, counts, unused, ghosts, supportsColor()));
  }

  return 0;
}
