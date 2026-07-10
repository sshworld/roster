import { describe, it, expect } from 'vitest';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirSource } from '../../src/sources/dir.js';
import { fluffRule } from '../../src/rules/fluff.js';
import type { AgentDef } from '../../src/core/types.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixtureDir = path.join(__dirname, '../fixtures/rule-cases');

async function loadAgent(name: string): Promise<AgentDef> {
  const agents = await dirSource.load({ dir: fixtureDir });
  const agent = agents.find((a) => a.name === name);
  if (!agent) throw new Error(`fixture agent not found: ${name}`);
  return agent;
}

describe('fluffRule', () => {
  it('flags a long, mostly-narrative body as an experimental info finding', async () => {
    const agent = await loadAgent('fluff-narrative');
    const findings = fluffRule.run([agent]);
    expect(findings.length).toBeGreaterThan(0);
    expect(findings[0].severity).toBe('info');
    expect(findings[0].ruleId).toBe('fluff');
    expect(findings[0].agent).toBe('fluff-narrative');
    expect(findings[0].message).toContain('[experimental]');
  });

  it('never emits warning severity (experimental rule ceiling is info)', async () => {
    const agent = await loadAgent('fluff-narrative');
    const findings = fluffRule.run([agent]);
    expect(findings.every((f) => f.severity !== 'warning' && f.severity !== 'critical')).toBe(true);
  });

  it('does not flag a procedural, checklist-driven body', async () => {
    const agent = await loadAgent('fluff-procedural');
    const findings = fluffRule.run([agent]);
    expect(findings.length).toBe(0);
  });
});
