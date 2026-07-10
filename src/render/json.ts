import type { AgentDef, Finding, Report, Renderer, Severity } from '../core/types.js';

const SEVERITY_RANK: Record<Severity, number> = { critical: 0, warning: 1, info: 2 };

function findingTarget(finding: Finding): string {
  if (finding.agent !== undefined) return finding.agent;
  if (finding.pair !== undefined) return finding.pair.join('::');
  return '';
}

function sortAgents(agents: AgentDef[]): AgentDef[] {
  return [...agents].sort((a, b) => a.name.localeCompare(b.name));
}

function sortFindings(findings: Finding[]): Finding[] {
  return [...findings].sort((a, b) => {
    const severityDiff = SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity];
    if (severityDiff !== 0) return severityDiff;

    const ruleIdDiff = a.ruleId.localeCompare(b.ruleId);
    if (ruleIdDiff !== 0) return ruleIdDiff;

    return findingTarget(a).localeCompare(findingTarget(b));
  });
}

export const jsonRenderer: Renderer = {
  id: 'json',
  render(report: Report): string {
    const stable: Report = {
      agents: sortAgents(report.agents),
      findings: sortFindings(report.findings),
      meta: report.meta,
    };
    return JSON.stringify(stable, null, 2);
  },
};
