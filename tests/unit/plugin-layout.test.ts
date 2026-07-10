import { describe, it, expect } from 'vitest';
import path from 'node:path';
import { readFile, access } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, '../..');
const pluginJsonPath = path.join(repoRoot, '.claude-plugin/plugin.json');

async function exists(p: string): Promise<boolean> {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

describe('plugin.json', () => {
  it('is valid JSON', async () => {
    const raw = await readFile(pluginJsonPath, 'utf8');
    expect(() => JSON.parse(raw)).not.toThrow();
  });

  it('has name roster and version matching package.json', async () => {
    const raw = await readFile(pluginJsonPath, 'utf8');
    const plugin = JSON.parse(raw);
    const pkgRaw = await readFile(path.join(repoRoot, 'package.json'), 'utf8');
    const pkg = JSON.parse(pkgRaw);
    expect(plugin.name).toBe('roster');
    expect(plugin.version).toBe(pkg.version);
  });

  it('has an English description', async () => {
    const raw = await readFile(pluginJsonPath, 'utf8');
    const plugin = JSON.parse(raw);
    expect(typeof plugin.description).toBe('string');
    expect(plugin.description.length).toBeGreaterThan(0);
  });

  it('declares hooks including a SessionStart entry referencing roster-drift.sh', async () => {
    const raw = await readFile(pluginJsonPath, 'utf8');
    const plugin = JSON.parse(raw);
    expect(plugin.hooks).toBeDefined();
    const serialized = JSON.stringify(plugin.hooks);
    expect(serialized).toContain('roster-drift.sh');
    expect(serialized).toContain('${CLAUDE_PLUGIN_ROOT}');
  });

  it('references hook script paths that actually exist on disk', async () => {
    const raw = await readFile(pluginJsonPath, 'utf8');
    const plugin = JSON.parse(raw);
    const serialized = JSON.stringify(plugin.hooks);
    const matches = [...serialized.matchAll(/\$\{CLAUDE_PLUGIN_ROOT\}\\?"?\/?([a-zA-Z0-9_/.-]+\.sh)/g)];
    expect(matches.length).toBeGreaterThan(0);
    for (const match of matches) {
      const relPath = match[1];
      const abs = path.join(repoRoot, relPath);
      expect(await exists(abs)).toBe(true);
    }
  });
});

describe('skills/roster-audit/SKILL.md', () => {
  it('exists and has expected frontmatter', async () => {
    const skillPath = path.join(repoRoot, 'skills/roster-audit/SKILL.md');
    expect(await exists(skillPath)).toBe(true);
    const content = await readFile(skillPath, 'utf8');
    expect(content).toMatch(/^---/);
    expect(content).toContain('name: roster-audit');
  });
});

describe('hooks/roster-drift.sh', () => {
  it('exists and is executable', async () => {
    const hookPath = path.join(repoRoot, 'hooks/roster-drift.sh');
    expect(await exists(hookPath)).toBe(true);
    const { statSync } = await import('node:fs');
    const mode = statSync(hookPath).mode;
    // eslint-disable-next-line no-bitwise
    expect(mode & 0o111).not.toBe(0);
  });
});
