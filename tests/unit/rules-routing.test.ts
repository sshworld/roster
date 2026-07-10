import { describe, it, expect } from 'vitest';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirSource } from '../../src/sources/dir.js';
import { routingRule } from '../../src/rules/routing.js';
import type { AgentDef } from '../../src/core/types.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixtureDir = path.join(__dirname, '../fixtures/rule-cases');

async function loadAgent(name: string): Promise<AgentDef> {
  const agents = await dirSource.load({ dir: fixtureDir });
  const agent = agents.find((a) => a.name === name);
  if (!agent) throw new Error(`fixture agent not found: ${name}`);
  return agent;
}

describe('routingRule', () => {
  it('warns when description is absent', async () => {
    const agent = await loadAgent('routing-no-description');
    const findings = routingRule.run([agent]);
    const warning = findings.find((f) => f.severity === 'warning');
    expect(warning).toBeDefined();
    expect(warning!.ruleId).toBe('routing');
    expect(warning!.agent).toBe('routing-no-description');
  });

  it('reports info when description has no delegation trigger signal', async () => {
    const agent = await loadAgent('routing-no-trigger');
    const findings = routingRule.run([agent]);
    const info = findings.find((f) => f.severity === 'info' && f.agent === 'routing-no-trigger');
    expect(info).toBeDefined();
    expect(info!.ruleId).toBe('routing');
  });

  it('reports info when description exceeds 400 characters', async () => {
    const agent = await loadAgent('routing-long-description');
    const findings = routingRule.run([agent]);
    const info = findings.find((f) => f.severity === 'info' && f.agent === 'routing-long-description');
    expect(info).toBeDefined();
  });

  it('does not warn on a well-formed description with a clear trigger', async () => {
    const agent = await loadAgent('harness-explicit-tools');
    const findings = routingRule.run([agent]);
    const warning = findings.find((f) => f.severity === 'warning');
    expect(warning).toBeUndefined();
  });
});
