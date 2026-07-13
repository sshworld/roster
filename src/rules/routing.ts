import type { AgentDef, Finding, Rule } from '../core/types.js';

const MAX_DESCRIPTION_LENGTH = 400;

const TRIGGER_PATTERN =
  /(use when|use this|invoke|trigger|~할 때|~시 사용)|\b(when|if)\b.+\b(use|call|invoke)\b/i;

function hasTriggerSignal(description: string): boolean {
  return TRIGGER_PATTERN.test(description);
}

export const routingRule: Rule = {
  id: 'routing',
  description: 'Flags ambiguous routing between agents with overlapping trigger descriptions.',
  run(agents: AgentDef[]): Finding[] {
    const findings: Finding[] = [];

    for (const agent of agents) {
      const description = agent.description.trim();

      if (description === '') {
        findings.push({
          ruleId: 'routing',
          severity: 'warning',
          agent: agent.name,
          message: 'missing description — the router cannot tell when to delegate',
        });
        continue;
      }

      if (!hasTriggerSignal(description)) {
        findings.push({
          ruleId: 'routing',
          severity: 'info',
          agent: agent.name,
          message: 'description has no delegation trigger signal (add a "use when ..." clause)',
        });
      }

      if (description.length > MAX_DESCRIPTION_LENGTH) {
        findings.push({
          ruleId: 'routing',
          severity: 'info',
          agent: agent.name,
          message: `description exceeds ${MAX_DESCRIPTION_LENGTH} chars (bloats the roster listing)`,
        });
      }
    }

    return findings;
  },
};
