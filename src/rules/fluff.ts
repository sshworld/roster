import type { AgentDef, Finding, Rule } from '../core/types.js';

const MIN_BODY_LINES = 20;
const NARRATIVE_RATIO_THRESHOLD = 0.7;

const IMPERATIVE_VERB_PATTERN =
  /^(run|check|verify|confirm|ensure|use|call|invoke|write|read|add|remove|update|create|delete|build|deploy|test|review|flag|report|notify|tag|push|trigger)\b/i;
const CHECKLIST_PATTERN = /^-\s*\[( |x|X)\]/;
const NUMBERED_STEP_PATTERN = /^\d+[.)]\s+/;
const CODE_FENCE_PATTERN = /^```/;

function isExecutableLine(line: string): boolean {
  const trimmed = line.trim();
  if (trimmed === '') return false;
  return (
    IMPERATIVE_VERB_PATTERN.test(trimmed) ||
    CHECKLIST_PATTERN.test(trimmed) ||
    NUMBERED_STEP_PATTERN.test(trimmed) ||
    CODE_FENCE_PATTERN.test(trimmed)
  );
}

export const fluffRule: Rule = {
  id: 'fluff',
  description: 'Flags agent definitions with low information density (filler prose, vague instructions).',
  run(agents: AgentDef[]): Finding[] {
    const findings: Finding[] = [];

    for (const agent of agents) {
      const lines = agent.body.split('\n').filter((l) => l.trim() !== '');
      if (lines.length <= MIN_BODY_LINES) continue;

      const executableCount = lines.filter(isExecutableLine).length;
      const narrativeRatio = (lines.length - executableCount) / lines.length;

      if (narrativeRatio > NARRATIVE_RATIO_THRESHOLD) {
        findings.push({
          ruleId: 'fluff',
          severity: 'info',
          agent: agent.name,
          message: `[experimental] ${agent.name} body is ${(narrativeRatio * 100).toFixed(0)}% narrative — low executability`,
        });
      }
    }

    return findings;
  },
};
