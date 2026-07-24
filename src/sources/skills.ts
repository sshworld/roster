import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import type { AgentDef, RosterSourceLoadOptions } from '../core/types.js';
import { parseSkillMarkdown } from '../parse/agent-md.js';
import { listActivePlugins } from './plugin-cache.js';

// Skills live one level deep: <skillsDir>/<skill-name>/SKILL.md. Unlike the
// agent loaders, this is not a recursive markdown sweep — only that exact
// shape is recognized.
async function collectSkillFiles(skillsDir: string): Promise<string[]> {
  let entries;
  try {
    entries = await readdir(skillsDir, { withFileTypes: true });
  } catch {
    return [];
  }

  const files: string[] = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const skillFile = path.join(skillsDir, entry.name, 'SKILL.md');
    try {
      const s = await stat(skillFile);
      if (s.isFile()) files.push(skillFile);
    } catch {
      // no SKILL.md in this skill dir — skip
    }
  }
  return files;
}

async function loadSkillsFromDir(skillsDir: string, sourceLabel: string): Promise<AgentDef[]> {
  const files = await collectSkillFiles(skillsDir);
  const parsed = await Promise.all(
    files.map(async (filePath) => {
      const raw = await readFile(filePath, 'utf8');
      return parseSkillMarkdown(raw, filePath, sourceLabel);
    })
  );
  return parsed.filter((skill): skill is AgentDef => skill !== undefined);
}

export async function loadUserSkills(opts?: RosterSourceLoadOptions): Promise<AgentDef[]> {
  const home = (opts?.home as string | undefined) ?? process.env.HOME;
  if (!home) {
    console.error('sources/skills: HOME is not set, no opts.home override provided — returning empty roster');
    return [];
  }

  return loadSkillsFromDir(path.join(home, '.claude', 'skills'), 'user');
}

export async function loadPluginSkills(opts?: RosterSourceLoadOptions): Promise<AgentDef[]> {
  const activePlugins = await listActivePlugins(opts);
  const lists = await Promise.all(
    activePlugins.map(async (plugin) => {
      const skills = await loadSkillsFromDir(
        path.join(plugin.installPath, 'skills'),
        `plugin:${plugin.name}@${plugin.version}`
      );
      return skills.map((skill) => ({ ...skill, pluginName: plugin.name }));
    })
  );
  return lists.flat();
}

export async function loadProjectSkills(dir: string): Promise<AgentDef[]> {
  return loadSkillsFromDir(path.join(dir, '.claude', 'skills'), `dir:${dir}`);
}
