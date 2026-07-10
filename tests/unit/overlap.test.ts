import { describe, it, expect } from 'vitest';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirSource } from '../../src/sources/dir.js';
import { overlapRule } from '../../src/rules/overlap.js';
import type { Finding } from '../../src/core/types.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixtureDir = path.join(__dirname, '../fixtures/roster-a');

describe('dirSource', () => {
  it('recursively scans all markdown files, including nested category directories', async () => {
    const agents = await dirSource.load({ dir: fixtureDir });
    expect(agents.length).toBe(6);
    const names = agents.map((a) => a.name).sort();
    expect(names).toEqual(
      ['code-critic', 'code-reviewer', 'designer', 'planner', 'researcher', 'writer'].sort()
    );
  });
});

describe('overlapRule', () => {
  it('excludes self-pairs, dedupes symmetric pairs, and ranks the near-duplicate pair above unrelated pairs', async () => {
    const agents = await dirSource.load({ dir: fixtureDir });
    const findings: Finding[] = overlapRule.run(agents, { top: 20 });

    for (const f of findings) {
      expect(f.pair).toBeDefined();
      expect(f.pair![0]).not.toBe(f.pair![1]);
    }

    const seen = new Set<string>();
    for (const f of findings) {
      const key = [...f.pair!].sort().join('::');
      expect(seen.has(key)).toBe(false);
      seen.add(key);
    }

    const dupKey = ['code-reviewer', 'code-critic'].sort().join('::');
    const dupFinding = findings.find((f) => [...f.pair!].sort().join('::') === dupKey);
    expect(dupFinding).toBeDefined();

    const sortedByScore = [...findings].sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
    const rank = sortedByScore.indexOf(dupFinding!);
    expect(rank).toBeLessThan(2);

    const otherScores = findings.filter((f) => f !== dupFinding).map((f) => f.score ?? 0);
    expect(dupFinding!.score ?? 0).toBeGreaterThan(Math.max(...otherScores));
  });

  it('disambiguates same-named agents from different sources with their source label', async () => {
    // Auditing a repo that is ALSO installed as a plugin yields the same agent
    // twice (dir + plugin source) — the pair must not render as "x <-> x".
    const agents = await dirSource.load({ dir: fixtureDir });
    const clone = { ...agents[0], sourceLabel: 'plugin:demo@1.0.0' };
    const findings: Finding[] = overlapRule.run([...agents, clone], { top: 30 });

    const selfPair = findings.find((f) => f.pair!.every((p) => p.includes(agents[0].name)));
    expect(selfPair).toBeDefined();
    expect(selfPair!.pair![0]).not.toBe(selfPair!.pair![1]);
    expect(selfPair!.pair!.join(' ')).toContain('plugin:demo@1.0.0');
  });
});
