import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import path from 'node:path';
import { readFile, writeFile, cp, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { pluginCacheSource } from '../../src/sources/plugin-cache.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixtureTemplateDir = path.join(__dirname, '../fixtures/plugin-cache-home');

// installed_plugins.json embeds absolute installPath values, so we materialize the
// fixture into a fresh temp dir per run and rewrite the __ROOT__ placeholder rather
// than hardcoding a path — keeps the fixture portable across machines/CI.
let homeDir: string;

beforeAll(async () => {
  homeDir = await mkdtemp(path.join(tmpdir(), 'roster-plugin-cache-'));
  await cp(fixtureTemplateDir, homeDir, { recursive: true });

  const installedPath = path.join(homeDir, '.claude/plugins/installed_plugins.json');
  const raw = await readFile(installedPath, 'utf8');
  await writeFile(installedPath, raw.split('__ROOT__').join(homeDir), 'utf8');
});

afterAll(async () => {
  await rm(homeDir, { recursive: true, force: true });
});

describe('pluginCacheSource', () => {
  it('loads only the active installed_plugins.json entries, one per plugin@marketplace', async () => {
    const agents = await pluginCacheSource.load({ home: homeDir });
    const names = agents.map((a) => a.name).sort();
    expect(names).toEqual(['alpha-agent', 'alpha-agent-b', 'beta-agent']);
  });

  it('excludes stale cached copies not referenced by installed_plugins.json', async () => {
    const agents = await pluginCacheSource.load({ home: homeDir });
    expect(agents.map((a) => a.name)).not.toContain('alpha-agent-stale');
  });

  it('does not double count the same installPath referenced by multiple scopes', async () => {
    const agents = await pluginCacheSource.load({ home: homeDir });
    const betaAgents = agents.filter((a) => a.name === 'beta-agent');
    expect(betaAgents).toHaveLength(1);
  });

  it('tags sourceLabel as plugin:<name>@<version>', async () => {
    const agents = await pluginCacheSource.load({ home: homeDir });
    const alpha = agents.find((a) => a.name === 'alpha-agent');
    expect(alpha?.sourceLabel).toBe('plugin:alpha@1.0.0');
    const alphaB = agents.find((a) => a.name === 'alpha-agent-b');
    expect(alphaB?.sourceLabel).toBe('plugin:alpha@2.0.0');
  });

  it('filters to a single plugin name via opts.pluginName', async () => {
    const agents = await pluginCacheSource.load({ home: homeDir, pluginName: 'beta' });
    expect(agents.map((a) => a.name)).toEqual(['beta-agent']);
  });

  it('opts.pluginName matching multiple marketplaces returns all of them', async () => {
    const agents = await pluginCacheSource.load({ home: homeDir, pluginName: 'alpha' });
    expect(agents.map((a) => a.name).sort()).toEqual(['alpha-agent', 'alpha-agent-b']);
  });

  it('returns an empty array (not an error) when installed_plugins.json is missing', async () => {
    const agents = await pluginCacheSource.load({ home: path.join(homeDir, 'does-not-exist') });
    expect(agents).toEqual([]);
  });
});
