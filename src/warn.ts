import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { stat } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import type { AgentDef } from './core/types.js';
import { sources } from './sources/index.js';
import { loadUserSkills, loadPluginSkills, loadProjectSkills } from './sources/skills.js';
import { tokenize, buildVectors, norm, dotProduct } from './rules/overlap.js';

const MIN_TOKENS = 8;
const DEFAULT_NAME_THRESHOLD = 0.6;
const DEFAULT_HOOK_THRESHOLD = 0.7;

export interface WarnOpts {
  home?: string;
  cwd?: string;
  cacheDir?: string;
  stdin?: string;
}

interface ParsedArgs {
  name?: string;
  kind?: 'agent' | 'skill';
  above?: number;
  json: boolean;
  hook: boolean;
  help: boolean;
}

interface Sibling {
  name: string;
  kind: 'agent' | 'skill';
  score: number;
  sourceLabel: string;
}

const HELP_TEXT = `Usage: roster warn --name <invoked> [options]
       roster warn --hook [options]

Warns when a just-invoked agent/skill overlaps with a sibling in the roster.

Options:
  --name <name>     Agent/skill name to check (plugin:name for a namespaced match)
  --kind <kind>     Restrict matching to 'agent' or 'skill'
  --above <score>   Similarity threshold (default 0.6, hook default 0.7)
  --json            Output machine-readable JSON
  --hook            Read a PostToolUse hook payload from stdin instead
  --help, -h        Show this help text
`;

function parseArgs(argv: string[]): ParsedArgs {
  const result: ParsedArgs = { json: false, hook: false, help: false };

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
      case '--hook':
        result.hook = true;
        i += 1;
        break;
      case '--name':
        result.name = argv[i + 1];
        i += 2;
        break;
      case '--kind':
        if (argv[i + 1] === 'agent' || argv[i + 1] === 'skill') result.kind = argv[i + 1] as 'agent' | 'skill';
        i += 2;
        break;
      case '--above': {
        const n = Number(argv[i + 1]);
        if (Number.isFinite(n)) result.above = n;
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

async function pathIsDir(p: string): Promise<boolean> {
  try {
    return (await stat(p)).isDirectory();
  } catch {
    return false;
  }
}

async function loadCorpus(home: string | undefined, cwd: string): Promise<AgentDef[]> {
  const agents: AgentDef[] = [];

  if (home) {
    agents.push(...(await sources.user.load({ home })));
    agents.push(...(await sources['plugin-cache'].load({ home, cwd, enabledOnly: true })));
    agents.push(...(await loadUserSkills({ home })));
    agents.push(...(await loadPluginSkills({ home, cwd, enabledOnly: true })));
  }

  const projectAgentsDir = path.join(cwd, '.claude', 'agents');
  if (await pathIsDir(projectAgentsDir)) {
    agents.push(...(await sources.dir.load({ dir: projectAgentsDir })));
  }
  agents.push(...(await loadProjectSkills(cwd)));

  return agents;
}

// agent = description+body (matches overlapRule's own tokenize input);
// skill = name+description only — a SKILL.md body is boilerplate, not signal.
function docText(agent: AgentDef): string {
  if (agent.kind === 'skill') return `${agent.name}\n${agent.description}`;
  return `${agent.description}\n${agent.body}`;
}

function kindOf(agent: AgentDef): 'agent' | 'skill' {
  return agent.kind === 'skill' ? 'skill' : 'agent';
}

// user-scope ('user') and project-scope ('dir:...') sources outrank a
// same-named plugin-scope agent when a bare (non-namespaced) name is given.
function sourcePriority(agent: AgentDef): number {
  return agent.sourceLabel === 'user' || agent.sourceLabel.startsWith('dir:') ? 0 : 1;
}

function parseNameArg(raw: string): { pluginName?: string; name: string } {
  const idx = raw.indexOf(':');
  if (idx === -1) return { name: raw };
  return { pluginName: raw.slice(0, idx), name: raw.slice(idx + 1) };
}

function findTargetIndex(
  agents: AgentDef[],
  parsedName: { pluginName?: string; name: string },
  kindFilter: 'agent' | 'skill' | undefined
): number {
  let candidates = agents.map((agent, idx) => ({ agent, idx })).filter(({ agent }) => agent.name === parsedName.name);
  if (parsedName.pluginName) {
    candidates = candidates.filter(({ agent }) => agent.pluginName === parsedName.pluginName);
  }
  if (kindFilter) {
    candidates = candidates.filter(({ agent }) => kindOf(agent) === kindFilter);
  }
  if (candidates.length === 0) return -1;

  candidates.sort((a, b) => sourcePriority(a.agent) - sourcePriority(b.agent));
  return candidates[0].idx;
}

function computeSiblings(agents: AgentDef[], targetIdx: number, above: number): Sibling[] {
  const docsTokens = agents.map((agent) => tokenize(docText(agent)));
  const eligible = docsTokens.map((tokens) => tokens.length >= MIN_TOKENS);
  if (!eligible[targetIdx]) return [];

  const vectors = buildVectors(docsTokens);
  const norms = vectors.map(norm);
  if (norms[targetIdx] === 0) return [];

  const siblings: Sibling[] = [];
  for (let j = 0; j < agents.length; j++) {
    if (j === targetIdx || !eligible[j] || norms[j] === 0) continue;
    const score = dotProduct(vectors[targetIdx], vectors[j]) / (norms[targetIdx] * norms[j]);
    if (score >= above) {
      siblings.push({ name: agents[j].name, kind: kindOf(agents[j]), score, sourceLabel: agents[j].sourceLabel });
    }
  }

  siblings.sort((a, b) => b.score - a.score);
  return siblings;
}

async function runNameMode(parsed: ParsedArgs, home: string | undefined, cwd: string): Promise<number> {
  if (!parsed.name) {
    console.error('roster warn: --name is required (or use --hook)');
    return 1;
  }

  const agents = await loadCorpus(home, cwd);
  const parsedName = parseNameArg(parsed.name);
  const targetIdx = findTargetIndex(agents, parsedName, parsed.kind);
  if (targetIdx === -1) return 0;

  const above = parsed.above ?? DEFAULT_NAME_THRESHOLD;
  const siblings = computeSiblings(agents, targetIdx, above);
  if (siblings.length === 0) return 0;

  const target = agents[targetIdx];
  const targetOut = { name: target.name, kind: kindOf(target), sourceLabel: target.sourceLabel };

  if (parsed.json) {
    console.log(JSON.stringify({ target: targetOut, siblings }));
  } else {
    console.log(`[roster warn] '${target.name}' overlaps with ${siblings.length} sibling(s):`);
    for (const s of siblings) {
      console.log(`  - ${s.name} (${s.kind}, ${s.sourceLabel}) score=${s.score.toFixed(3)}`);
    }
  }
  return 0;
}

function sanitize(s: string): string {
  return s.replace(/[^A-Za-z0-9_.-]/g, '_');
}

function readStdin(): Promise<string> {
  return new Promise((resolve) => {
    let data = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => (data += chunk));
    process.stdin.on('end', () => resolve(data));
  });
}

async function runHookMode(parsed: ParsedArgs, opts: WarnOpts, home: string | undefined, cwd: string): Promise<number> {
  try {
    const raw = opts.stdin ?? (await readStdin());

    let payload: unknown;
    try {
      payload = JSON.parse(raw);
    } catch {
      return 0;
    }
    if (typeof payload !== 'object' || payload === null) return 0;
    const obj = payload as Record<string, unknown>;

    const sessionId = obj.session_id;
    if (typeof sessionId !== 'string' || !sessionId) return 0;

    const toolName = obj.tool_name;
    const toolInput = (obj.tool_input as Record<string, unknown> | undefined) ?? {};

    let name: string | undefined;
    let kindFilter: 'agent' | 'skill' | undefined;
    if (toolName === 'Task' || toolName === 'Agent') {
      if (typeof toolInput.subagent_type === 'string') {
        name = toolInput.subagent_type;
        kindFilter = 'agent';
      }
    } else if (toolName === 'Skill') {
      if (typeof toolInput.skill === 'string') {
        name = toolInput.skill;
        kindFilter = 'skill';
      }
    }
    if (!name) return 0;

    const cacheRoot = opts.cacheDir ?? path.join(home ?? os.homedir(), '.cache', 'roster');
    const sessionDir = path.join(cacheRoot, `warn-seen-${sanitize(sessionId)}`);
    const markerPath = path.join(sessionDir, sanitize(name));
    if (existsSync(markerPath)) return 0;

    const above = parsed.above ?? DEFAULT_HOOK_THRESHOLD;
    const agents = await loadCorpus(home, cwd);
    const parsedName = parseNameArg(name);
    const targetIdx = findTargetIndex(agents, parsedName, kindFilter);
    const siblings = targetIdx === -1 ? [] : computeSiblings(agents, targetIdx, above);

    mkdirSync(sessionDir, { recursive: true });
    writeFileSync(markerPath, '');

    if (siblings.length > 0) {
      const displayName = parsedName.pluginName ? `${parsedName.pluginName}:${parsedName.name}` : parsedName.name;
      const summary = siblings.map((s) => `${s.name} (${s.score.toFixed(2)})`).join(', ');
      console.log(
        JSON.stringify({
          systemMessage: `[roster] '${displayName}' overlaps with: ${summary}`,
          hookSpecificOutput: {
            hookEventName: 'PostToolUse',
            additionalContext: `roster warn: '${displayName}' overlaps with: ${summary}. Relay this advisory to the user in one short line.`,
          },
        })
      );
    }
    return 0;
  } catch (err) {
    console.error(`roster warn --hook: ${err instanceof Error ? err.message : String(err)}`);
    return 0;
  }
}

export async function run(argv: string[], opts: WarnOpts = {}): Promise<number> {
  const parsed = parseArgs(argv);
  if (parsed.help) {
    console.log(HELP_TEXT);
    return 0;
  }

  const home = opts.home ?? process.env.HOME;
  const cwd = opts.cwd ?? process.cwd();

  if (parsed.hook) {
    return runHookMode(parsed, opts, home, cwd);
  }
  return runNameMode(parsed, home, cwd);
}
