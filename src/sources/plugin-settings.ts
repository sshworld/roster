import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';

// Claude Code settings.json shape (verified against a live ~/.claude/settings.json):
//   { "enabledPlugins": { "<name>@<marketplace>": true, "caveman@caveman": false } }
// A key absent from every file means default-on (enabled).

async function readEnabledPlugins(file: string): Promise<Record<string, boolean>> {
  try {
    const raw = await readFile(file, 'utf8');
    const data = JSON.parse(raw) as { enabledPlugins?: unknown };
    const map = data?.enabledPlugins;
    if (map !== null && typeof map === 'object' && !Array.isArray(map)) {
      return map as Record<string, boolean>;
    }
    return {};
  } catch {
    return {};
  }
}

async function fileExists(file: string): Promise<boolean> {
  try {
    return (await stat(file)).isFile();
  } catch {
    return false;
  }
}

// Walk up from cwd looking for the nearest directory (at or above cwd) that owns
// a `.claude/settings.json` — that's "the project". Stops before reaching home
// (already covered by the user-level files) or the filesystem root.
async function findProjectDir(home: string, cwd: string): Promise<string | undefined> {
  const resolvedHome = path.resolve(home);
  let dir = path.resolve(cwd);
  while (dir !== resolvedHome) {
    if (await fileExists(path.join(dir, '.claude', 'settings.json'))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) return undefined;
    dir = parent;
  }
  return undefined;
}

export async function readEnabledPluginsMap(home: string, cwd: string): Promise<Record<string, boolean>> {
  const map: Record<string, boolean> = {};
  const userSettingsDir = path.join(path.resolve(home), '.claude');
  Object.assign(map, await readEnabledPlugins(path.join(userSettingsDir, 'settings.json')));
  Object.assign(map, await readEnabledPlugins(path.join(userSettingsDir, 'settings.local.json')));

  const projectDir = await findProjectDir(home, cwd);
  if (projectDir) {
    const projectSettingsDir = path.join(projectDir, '.claude');
    Object.assign(map, await readEnabledPlugins(path.join(projectSettingsDir, 'settings.json')));
    Object.assign(map, await readEnabledPlugins(path.join(projectSettingsDir, 'settings.local.json')));
  }

  return map;
}
