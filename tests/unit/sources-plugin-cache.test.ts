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
  it('loads exactly one install per plugin NAME, even across marketplaces/versions', async () => {
    const agents = await pluginCacheSource.load({ home: homeDir });
    const names = agents.map((a) => a.name).sort();
    // alpha exists in marketplace-a@1.0.0 and marketplace-b@2.0.0 — only the
    // highest version wins; gamma exists at 0.6.5 and 0.6.7 — only 0.6.7 wins.
    // epsilon has no scope field at all.
    expect(names).toEqual(['alpha-agent-b', 'beta-agent', 'epsilon-agent', 'gamma-agent']);
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

  it('picks the highest version when multiple projects pin different versions', async () => {
    const agents = await pluginCacheSource.load({ home: homeDir });
    const gamma = agents.filter((a) => a.name === 'gamma-agent');
    expect(gamma).toHaveLength(1);
    expect(gamma[0]?.sourceLabel).toBe('plugin:gamma@0.6.7');
  });

  it('prefers the entry pinned by the current project (opts.cwd) over a higher version', async () => {
    const agents = await pluginCacheSource.load({ home: homeDir, cwd: '/proj-a' });
    const gamma = agents.filter((a) => a.name === 'gamma-agent');
    expect(gamma).toHaveLength(1);
    expect(gamma[0]?.sourceLabel).toBe('plugin:gamma@0.6.5');
  });

  it('prefers a user-scope entry over a higher-versioned project-scope entry', async () => {
    // beta has a user-scope 0.5.0 entry plus a local entry at the same path;
    // alpha's winner (2.0.0) is user scope. This guards the scope ordering.
    const agents = await pluginCacheSource.load({ home: homeDir });
    const alpha = agents.find((a) => a.name === 'alpha-agent-b');
    expect(alpha?.sourceLabel).toBe('plugin:alpha@2.0.0');
  });

  it('tags sourceLabel as plugin:<name>@<version>', async () => {
    const agents = await pluginCacheSource.load({ home: homeDir });
    const beta = agents.find((a) => a.name === 'beta-agent');
    expect(beta?.sourceLabel).toBe('plugin:beta@0.5.0');
  });

  it('filters to a single plugin name via opts.pluginName', async () => {
    const agents = await pluginCacheSource.load({ home: homeDir, pluginName: 'beta' });
    expect(agents.map((a) => a.name)).toEqual(['beta-agent']);
  });

  it('returns an empty array (not an error) when installed_plugins.json is missing', async () => {
    const agents = await pluginCacheSource.load({ home: path.join(homeDir, 'does-not-exist') });
    expect(agents).toEqual([]);
  });

  describe('opts.enabledOnly', () => {
    it('passes through user-scope entries', async () => {
      const agents = await pluginCacheSource.load({ home: homeDir, enabledOnly: true, cwd: '/some/unrelated/cwd' });
      expect(agents.map((a) => a.name)).toContain('beta-agent');
    });

    it('excludes a local-scope entry pinned by a different project', async () => {
      const agents = await pluginCacheSource.load({ home: homeDir, enabledOnly: true, cwd: '/proj-a' });
      // gamma is pinned by /proj-a (0.6.5) and /proj-b (0.6.7); cwd=/proj-a must
      // only see the /proj-a pin, never the /proj-b one.
      const gamma = agents.filter((a) => a.name === 'gamma-agent');
      expect(gamma).toHaveLength(1);
      expect(gamma[0]?.sourceLabel).toBe('plugin:gamma@0.6.5');
    });

    it('includes a local-scope entry when cwd is a subdirectory of projectPath', async () => {
      const agents = await pluginCacheSource.load({
        home: homeDir,
        enabledOnly: true,
        cwd: '/proj-a/nested/deeper',
      });
      const gamma = agents.filter((a) => a.name === 'gamma-agent');
      expect(gamma).toHaveLength(1);
      expect(gamma[0]?.sourceLabel).toBe('plugin:gamma@0.6.5');
    });

    it('drops all pins for a plugin when cwd matches none of its projectPaths', async () => {
      const agents = await pluginCacheSource.load({ home: homeDir, enabledOnly: true, cwd: '/nowhere' });
      expect(agents.map((a) => a.name)).not.toContain('gamma-agent');
    });

    it('passes through entries with no scope field', async () => {
      const agents = await pluginCacheSource.load({ home: homeDir, enabledOnly: true, cwd: '/nowhere' });
      expect(agents.map((a) => a.name)).toContain('epsilon-agent');
    });

    it('does not filter anything when enabledOnly is not set', async () => {
      const agents = await pluginCacheSource.load({ home: homeDir, cwd: '/nowhere' });
      expect(agents.map((a) => a.name)).toContain('gamma-agent');
    });
  });
});
