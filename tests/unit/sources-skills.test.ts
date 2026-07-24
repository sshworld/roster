import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import path from 'node:path';
import { readFile, writeFile, mkdtemp, cp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { loadUserSkills, loadPluginSkills, loadProjectSkills } from '../../src/sources/skills.js';
import { dirSource } from '../../src/sources/dir.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe('loadUserSkills', () => {
  const userHome = path.join(__dirname, '../fixtures/skills-user-home');
  const emptyHome = path.join(__dirname, '../fixtures/skills-user-home-empty');

  it('extracts name/description from ~/.claude/skills/*/SKILL.md and tags kind: skill', async () => {
    const skills = await loadUserSkills({ home: userHome });
    expect(skills).toHaveLength(1);
    expect(skills[0].name).toBe('writer-skill');
    expect(skills[0].description).toBe('Writes things for the user.');
    expect(skills[0].kind).toBe('skill');
    expect(skills[0].sourceLabel).toBe('user');
  });

  it('skips a SKILL.md with no name frontmatter', async () => {
    const skills = await loadUserSkills({ home: userHome });
    expect(skills.map((s) => s.name)).not.toContain('broken');
  });

  it('returns an empty array when ~/.claude/skills does not exist', async () => {
    const skills = await loadUserSkills({ home: emptyHome });
    expect(skills).toEqual([]);
  });
});

describe('loadPluginSkills', () => {
  const fixtureTemplateDir = path.join(__dirname, '../fixtures/skills-plugin-home');
  let homeDir: string;

  beforeAll(async () => {
    homeDir = await mkdtemp(path.join(tmpdir(), 'roster-skills-plugin-'));
    await cp(fixtureTemplateDir, homeDir, { recursive: true });
    const installedPath = path.join(homeDir, '.claude/plugins/installed_plugins.json');
    const raw = await readFile(installedPath, 'utf8');
    await writeFile(installedPath, raw.split('__ROOT__').join(homeDir), 'utf8');
  });

  afterAll(async () => {
    await rm(homeDir, { recursive: true, force: true });
  });

  it('extracts skills from an enabled plugin install path with sourceLabel plugin:<name>@<version>', async () => {
    const skills = await loadPluginSkills({ home: homeDir });
    expect(skills).toHaveLength(1);
    expect(skills[0].name).toBe('demo-skill');
    expect(skills[0].kind).toBe('skill');
    expect(skills[0].sourceLabel).toBe('plugin:demo@1.0.0');
  });

  it('sets pluginName on plugin-scope skills so namespaced <plugin>:<name> matching works', async () => {
    const skills = await loadPluginSkills({ home: homeDir });
    expect(skills[0].pluginName).toBe('demo');
  });
});

describe('loadProjectSkills', () => {
  const projectDir = path.join(__dirname, '../fixtures/skills-project-dir');
  const emptyProjectDir = path.join(__dirname, '../fixtures/skills-project-dir-empty');

  it('extracts skills from <dir>/.claude/skills/*/SKILL.md with sourceLabel dir:<dir>', async () => {
    const skills = await loadProjectSkills(projectDir);
    expect(skills).toHaveLength(1);
    expect(skills[0].name).toBe('reviewer-skill');
    expect(skills[0].kind).toBe('skill');
    expect(skills[0].sourceLabel).toBe(`dir:${projectDir}`);
  });

  it('returns an empty array when <dir>/.claude/skills does not exist', async () => {
    const skills = await loadProjectSkills(emptyProjectDir);
    expect(skills).toEqual([]);
  });
});

describe('dirSource — still ignores SKILL.md on the default audit path', () => {
  it('never returns a kind: skill entry, even when scanning a tree containing SKILL.md', async () => {
    const agentShapedFixtureDir = path.join(__dirname, '../fixtures/agent-shaped-dir');
    const agents = await dirSource.load({ dir: agentShapedFixtureDir });
    expect(agents.some((a) => a.kind === 'skill')).toBe(false);
    expect(agents.map((a) => a.name)).not.toContain('some-skill');
  });
});
