import { describe, it, expect } from 'vitest';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirSource } from '../../src/sources/dir.js';
import { overlapRule } from '../../src/rules/overlap.js';
import { jsonRenderer } from '../../src/render/json.js';
import type { Report } from '../../src/core/types.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixtureDir = path.join(__dirname, '../fixtures/roster-a');

async function buildReport(): Promise<Report> {
  const agents = await dirSource.load({ dir: fixtureDir });
  const findings = overlapRule.run(agents, { top: 20 });
  return {
    agents,
    findings,
    meta: {
      sourceLabels: [...new Set(agents.map((a) => a.sourceLabel))],
      skippedNonAgentFiles: (agents as unknown as { skippedNonAgentFiles?: number }).skippedNonAgentFiles ?? 0,
    },
  };
}

describe('jsonRenderer', () => {
  it('produces valid JSON containing agents and findings', async () => {
    const report = await buildReport();
    const output = jsonRenderer.render(report);
    const parsed = JSON.parse(output);
    expect(Array.isArray(parsed.agents)).toBe(true);
    expect(Array.isArray(parsed.findings)).toBe(true);
    expect(parsed.agents.length).toBe(report.agents.length);
    expect(parsed.findings.length).toBe(report.findings.length);
  });

  it('sorts agents by name', async () => {
    const report = await buildReport();
    const output = jsonRenderer.render(report);
    const parsed = JSON.parse(output);
    const names: string[] = parsed.agents.map((a: { name: string }) => a.name);
    const sorted = [...names].sort();
    expect(names).toEqual(sorted);
  });

  it('sorts findings by severity, then ruleId, then target', async () => {
    const report = await buildReport();
    const output = jsonRenderer.render(report);
    const parsed = JSON.parse(output);

    const severityRank: Record<string, number> = { critical: 0, warning: 1, info: 2 };
    const target = (f: { agent?: string; pair?: [string, string] }): string =>
      f.agent ?? (f.pair ? f.pair.join('::') : '');

    const findings = parsed.findings as { severity: string; ruleId: string; agent?: string; pair?: [string, string] }[];
    const sortKey = (f: (typeof findings)[number]): [number, string, string] => [
      severityRank[f.severity],
      f.ruleId,
      target(f),
    ];

    for (let i = 1; i < findings.length; i++) {
      const prevKey = sortKey(findings[i - 1]);
      const currKey = sortKey(findings[i]);
      const isNonDecreasing =
        currKey[0] > prevKey[0] ||
        (currKey[0] === prevKey[0] && currKey[1] > prevKey[1]) ||
        (currKey[0] === prevKey[0] && currKey[1] === prevKey[1] && currKey[2] >= prevKey[2]);
      expect(isNonDecreasing).toBe(true);
    }
  });

  it('produces stable output — rendering twice yields identical strings', async () => {
    const report = await buildReport();
    const first = jsonRenderer.render(report);
    const second = jsonRenderer.render(report);
    expect(first).toBe(second);
  });
});
