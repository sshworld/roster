import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import type { AgentDef, RosterSource } from '../core/types.js';
import { parseAgentMarkdown } from '../parse/agent-md.js';
import { isExcludedDocFile } from './dir.js';

// R2 — real ~/.claude/plugins/ layout (verified via `ls`/`cat` against a live
// installation, 2026-07-10):
//
//   ~/.claude/plugins/installed_plugins.json
//     { "version": 2, "plugins": { "<name>@<marketplace>": [ { scope, installPath,
//       version, projectPath?, installedAt, lastUpdated, gitCommitSha? }, ... ] } }
//
//   ~/.claude/plugins/cache/<marketplace>/<name>/<version>/agents/*.md
//
// A single "<name>@<marketplace>" key can have MULTIPLE array entries (one per
// scope: user/project/local) that all point at the SAME installPath+version — these
// must collapse to one scan, not one-per-scope. Separately, `cache/` on disk can
// contain stale/orphaned version directories left over from upgrades or from other
// marketplaces that are NOT referenced by installed_plugins.json at all — those must
// be ignored entirely (this was the actual bug: naive `cache/**/agents` globbing
// picked up every version+marketplace copy on disk and produced ~100% overlap
// false positives between duplicate copies of the same plugin).
//
// Field data (2026-07-10): the SAME plugin name can also appear under multiple
// marketplaces AND at multiple versions, because each project scope pins its own
// version (e.g. superpowers@5.0.7 pinned by one project while user scope runs
// 6.1.1). Scanning every pinned copy reintroduces the ~100% self-overlap false
// positives, so we collapse to ONE install per plugin NAME, preferring:
//   1. the entry pinned by the current project (projectPath == cwd)
//   2. a user-scope entry
//   3. the highest version
// Losing entries are reported on stderr so the narrowing is never silent.

interface InstalledPluginEntry {
  installPath: string;
  version: string;
  scope?: string;
  projectPath?: string;
}

interface InstalledPluginsFile {
  version?: number;
  plugins?: Record<string, InstalledPluginEntry[]>;
}

interface ActivePlugin {
  name: string;
  marketplace: string;
  version: string;
  installPath: string;
  scope?: string;
  projectPath?: string;
}

async function readInstalledPlugins(pluginsRoot: string): Promise<InstalledPluginsFile | undefined> {
  const file = path.join(pluginsRoot, 'installed_plugins.json');
  try {
    const raw = await readFile(file, 'utf8');
    return JSON.parse(raw) as InstalledPluginsFile;
  } catch {
    return undefined;
  }
}

function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map((n) => parseInt(n, 10));
  const pb = b.split('.').map((n) => parseInt(n, 10));
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const na = pa[i];
    const nb = pb[i];
    if (Number.isNaN(na ?? NaN) || Number.isNaN(nb ?? NaN)) {
      // Non-numeric segment (git SHAs etc.) — fall back to string compare.
      return a < b ? -1 : a > b ? 1 : 0;
    }
    if ((na ?? 0) !== (nb ?? 0)) return (na ?? 0) - (nb ?? 0);
  }
  return 0;
}

function pickPreferred(a: ActivePlugin, b: ActivePlugin, cwd: string): ActivePlugin {
  const aCwd = a.projectPath !== undefined && path.resolve(a.projectPath) === cwd;
  const bCwd = b.projectPath !== undefined && path.resolve(b.projectPath) === cwd;
  if (aCwd !== bCwd) return aCwd ? a : b;

  const aUser = a.scope === 'user';
  const bUser = b.scope === 'user';
  if (aUser !== bUser) return aUser ? a : b;

  return compareVersions(a.version, b.version) >= 0 ? a : b;
}

// --enabled-only: user-scope (or scope absent) entries are always active; a
// local/project-scope entry is only active for the project that pinned it —
// i.e. cwd is that project's directory or a subdirectory of it.
function passesEnabledOnly(entry: InstalledPluginEntry, cwd: string): boolean {
  if (entry.scope !== 'local' && entry.scope !== 'project') return true;
  if (!entry.projectPath) return false;
  const projectPath = path.resolve(entry.projectPath);
  return cwd === projectPath || cwd.startsWith(projectPath + path.sep);
}

function resolveActivePlugins(
  data: InstalledPluginsFile,
  cwd: string,
  enabledOnly: boolean
): ActivePlugin[] {
  const byName = new Map<string, ActivePlugin>();
  const skipped: ActivePlugin[] = [];

  for (const [key, entries] of Object.entries(data.plugins ?? {})) {
    const sepIndex = key.indexOf('@');
    const name = sepIndex === -1 ? key : key.slice(0, sepIndex);
    const marketplace = sepIndex === -1 ? '' : key.slice(sepIndex + 1);

    for (const entry of entries) {
      if (!entry.installPath) continue;
      if (enabledOnly && !passesEnabledOnly(entry, cwd)) continue;
      const candidate: ActivePlugin = {
        name,
        marketplace,
        version: entry.version,
        installPath: entry.installPath,
        scope: entry.scope,
        projectPath: entry.projectPath,
      };
      const current = byName.get(name);
      if (!current) {
        byName.set(name, candidate);
      } else if (current.installPath !== candidate.installPath) {
        const winner = pickPreferred(current, candidate, cwd);
        const loser = winner === current ? candidate : current;
        byName.set(name, winner);
        skipped.push(loser);
      }
    }
  }

  for (const loser of skipped) {
    const winner = byName.get(loser.name);
    if (winner && winner.installPath !== loser.installPath) {
      console.error(
        `sources/plugin-cache: skipped ${loser.name}@${loser.version}` +
          `${loser.projectPath ? ` (pinned by ${loser.projectPath})` : ''} — using ${winner.version}`
      );
    }
  }

  return [...byName.values()];
}

async function collectMarkdownFiles(root: string): Promise<string[]> {
  let entries;
  try {
    entries = await readdir(root, { withFileTypes: true });
  } catch {
    return [];
  }

  const files: string[] = [];
  for (const entry of entries) {
    const fullPath = path.join(root, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectMarkdownFiles(fullPath)));
    } else if (entry.isFile() && entry.name.endsWith('.md') && !isExcludedDocFile(fullPath)) {
      files.push(fullPath);
    }
  }
  return files;
}

async function dirExists(dir: string): Promise<boolean> {
  try {
    return (await stat(dir)).isDirectory();
  } catch {
    return false;
  }
}

export const pluginCacheSource: RosterSource = {
  id: 'plugin-cache',
  description: 'Loads agents from the installed Claude Code plugin cache.',
  async load(opts): Promise<AgentDef[]> {
    const home = (opts?.home as string | undefined) ?? process.env.HOME;
    if (!home) {
      console.error('sources/plugin-cache: HOME is not set, no opts.home override provided — returning empty roster');
      return [];
    }

    const pluginsRoot = path.join(home, '.claude', 'plugins');
    const data = await readInstalledPlugins(pluginsRoot);
    if (!data) {
      console.error(`sources/plugin-cache: ${pluginsRoot}/installed_plugins.json not found — returning empty roster`);
      return [];
    }

    const cwd = path.resolve((opts?.cwd as string | undefined) ?? process.cwd());
    const pluginNameFilter = opts?.pluginName as string | undefined;
    const enabledOnly = (opts?.enabledOnly as boolean | undefined) ?? false;
    const activePlugins = resolveActivePlugins(data, cwd, enabledOnly).filter(
      (p) => !pluginNameFilter || p.name === pluginNameFilter
    );

    const agentLists = await Promise.all(
      activePlugins.map(async (plugin) => {
        const agentsDir = path.join(plugin.installPath, 'agents');
        if (!(await dirExists(agentsDir))) return [];

        const files = await collectMarkdownFiles(agentsDir);
        const sourceLabel = `plugin:${plugin.name}@${plugin.version}`;
        return Promise.all(
          files.map(async (filePath) => {
            const raw = await readFile(filePath, 'utf8');
            return parseAgentMarkdown(raw, filePath, sourceLabel);
          })
        );
      })
    );

    return agentLists.flat();
  },
};
