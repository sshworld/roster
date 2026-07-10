import type { AgentDef, Finding, Rule } from '../core/types.js';

const WILDCARD_TOKENS = new Set(['*', 'all']);

function isWildcardTools(tools: string[]): boolean {
  return tools.some((t) => WILDCARD_TOKENS.has(t.trim().toLowerCase()));
}

export const harnessRule: Rule = {
  id: 'harness',
  description: 'Flags agents that reference tools without a matching harness/permission definition.',
  run(agents: AgentDef[]): Finding[] {
    const findings: Finding[] = [];

    for (const agent of agents) {
      const noTools = agent.tools === undefined || agent.tools.length === 0;
      const wildcard = agent.tools !== undefined && isWildcardTools(agent.tools);

      if (noTools || wildcard) {
        findings.push({
          ruleId: 'harness',
          severity: 'warning',
          agent: agent.name,
          message: '도구 제한 없음 — 전 도구 개방 (모자만 있는 agent)',
        });
      }
    }

    return findings;
  },
};
