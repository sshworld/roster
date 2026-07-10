import type { AgentDef, Finding, Rule } from '../core/types.js';

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

export const costRule: Rule = {
  id: 'cost',
  description: 'Estimates the context-window cost of loading the full agent roster.',
  run(agents: AgentDef[]): Finding[] {
    const findings: Finding[] = [];
    let descriptionTokenTotal = 0;

    for (const agent of agents) {
      const tokens = estimateTokens(`${agent.description}${agent.body}`);
      descriptionTokenTotal += estimateTokens(agent.description);

      findings.push({
        ruleId: 'cost',
        severity: 'info',
        agent: agent.name,
        message: `${agent.name} estimated token cost ~${tokens} tokens (estimate)`,
      });
    }

    findings.push({
      ruleId: 'cost',
      severity: 'info',
      message: `roster fixed cost per turn ~${descriptionTokenTotal} tokens (estimate)`,
    });

    return findings;
  },
};
