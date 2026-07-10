import type { Renderer } from '../core/types.js';

export const cliRenderer: Renderer = {
  id: 'cli',
  render(report): string {
    const lines: string[] = [];
    lines.push('Roster Audit Report');
    lines.push(`Agents scanned: ${report.agents.length}`);
    lines.push(`Sources: ${report.meta.sourceLabels.join(', ')}`);
    lines.push('');

    const overlapFindings = report.findings.filter((f) => f.ruleId === 'overlap');
    lines.push(`Top overlapping pairs (${overlapFindings.length}):`);
    if (overlapFindings.length === 0) {
      lines.push('  (none)');
    } else {
      for (const f of overlapFindings) {
        const [a, b] = f.pair ?? ['?', '?'];
        const scoreStr = f.score !== undefined ? f.score.toFixed(3) : '?';
        const tag = f.severity === 'critical' ? ' [CRITICAL]' : '';
        lines.push(`  ${scoreStr}  ${a} <-> ${b}${tag}`);
      }
    }

    lines.push('');
    const criticalCount = report.findings.filter((f) => f.severity === 'critical').length;
    const warningCount = report.findings.filter((f) => f.severity === 'warning').length;
    lines.push(`Findings: ${report.findings.length} total (${criticalCount} critical, ${warningCount} warning)`);

    return lines.join('\n');
  },
};
