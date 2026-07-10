import { describe, it, expect } from 'vitest';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirSource } from '../../src/sources/dir.js';
import { harnessRule } from '../../src/rules/harness.js';
import type { AgentDef } from '../../src/core/types.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixtureDir = path.join(__dirname, '../fixtures/rule-cases');

async function loadAgent(name: string): Promise<AgentDef> {
  const agents = await dirSource.load({ dir: fixtureDir });
  const agent = agents.find((a) => a.name === name);
  if (!agent) throw new Error(`fixture agent not found: ${name}`);
  return agent;
}

describe('harnessRule', () => {
  it('warns when tools frontmatter is absent entirely', async () => {
    const agent = await loadAgent('harness-no-tools');
    const findings = harnessRule.run([agent]);
    expect(findings.length).toBeGreaterThan(0);
    expect(findings[0].severity).toBe('warning');
    expect(findings[0].ruleId).toBe('harness');
    expect(findings[0].agent).toBe('harness-no-tools');
  });

  it('warns when tools is a wildcard/all-access declaration', async () => {
    const agent = await loadAgent('harness-wildcard-tools');
    const findings = harnessRule.run([agent]);
    expect(findings.length).toBeGreaterThan(0);
    expect(findings[0].severity).toBe('warning');
  });

  it('does not flag an agent with an explicit tool list', async () => {
    const agent = await loadAgent('harness-explicit-tools');
    const findings = harnessRule.run([agent]);
    expect(findings.length).toBe(0);
  });
});
