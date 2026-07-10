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
          message: 'description 부재 — 메인 모델이 위임 판단 불가',
        });
        continue;
      }

      if (!hasTriggerSignal(description)) {
        findings.push({
          ruleId: 'routing',
          severity: 'info',
          agent: agent.name,
          message: 'description 에 위임 트리거 신호 없음 (use when/트리거 조건절 권장)',
        });
      }

      if (description.length > MAX_DESCRIPTION_LENGTH) {
        findings.push({
          ruleId: 'routing',
          severity: 'info',
          agent: agent.name,
          message: `description 이 ${MAX_DESCRIPTION_LENGTH}자를 초과함 (로스터 목록 비대)`,
        });
      }
    }

    return findings;
  },
};
