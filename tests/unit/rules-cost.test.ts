import { describe, it, expect } from 'vitest';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirSource } from '../../src/sources/dir.js';
import { costRule } from '../../src/rules/cost.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixtureDir = path.join(__dirname, '../fixtures/rule-cases');

describe('costRule', () => {
  it('emits a per-agent info finding whose message names it an estimate', async () => {
    const agents = await dirSource.load({ dir: fixtureDir });
    const findings = costRule.run(agents);

    const perAgent = findings.filter((f) => f.agent !== undefined);
    expect(perAgent.length).toBe(agents.length);
    for (const f of perAgent) {
      expect(f.ruleId).toBe('cost');
      expect(f.severity).toBe('info');
      expect(f.message.toLowerCase()).toContain('estimate');
    }
  });

  it('emits a single roster-wide fixed-cost finding summing description tokens', async () => {
    const agents = await dirSource.load({ dir: fixtureDir });
    const findings = costRule.run(agents);

    const rosterFindings = findings.filter((f) => f.agent === undefined);
    expect(rosterFindings.length).toBe(1);
    expect(rosterFindings[0].severity).toBe('info');
    expect(rosterFindings[0].ruleId).toBe('cost');
    expect(rosterFindings[0].message.toLowerCase()).toContain('estimate');
    expect(rosterFindings[0].message.toLowerCase()).toContain('fixed cost per turn');
  });
});
