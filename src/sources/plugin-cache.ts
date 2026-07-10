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

interface InstalledPluginEntry {
  installPath: string;
  version: string;
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

function resolveActivePlugins(data: InstalledPluginsFile): ActivePlugin[] {
  const active: ActivePlugin[] = [];
  const seenInstallPaths = new Set<string>();

  for (const [key, entries] of Object.entries(data.plugins ?? {})) {
    const sepIndex = key.indexOf('@');
    const name = sepIndex === -1 ? key : key.slice(0, sepIndex);
    const marketplace = sepIndex === -1 ? '' : key.slice(sepIndex + 1);

    for (const entry of entries) {
      if (!entry.installPath || seenInstallPaths.has(entry.installPath)) continue;
      seenInstallPaths.add(entry.installPath);
      active.push({ name, marketplace, version: entry.version, installPath: entry.installPath });
    }
  }

  return active;
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

    const pluginNameFilter = opts?.pluginName as string | undefined;
    const activePlugins = resolveActivePlugins(data).filter(
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
