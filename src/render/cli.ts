import type { Renderer } from '../core/types.js';
import { bold, red, yellow, dim } from './ansi.js';

export const cliRenderer: Renderer = {
  id: 'cli',
  render(report, opts): string {
    const color = opts?.color === true;
    const lines: string[] = [];
    lines.push(bold('Roster Audit Report', color));
    lines.push(`Agents scanned: ${report.agents.length}`);
    lines.push(`Sources: ${report.meta.sourceLabels.join(', ')}`);
    lines.push('');

    const overlapFindings = report.findings.filter((f) => f.ruleId === 'overlap');
    lines.push(bold(`Top overlapping pairs (${overlapFindings.length}):`, color));
    if (overlapFindings.length === 0) {
      lines.push('  (none)');
    } else {
      for (const f of overlapFindings) {
        const [a, b] = f.pair ?? ['?', '?'];
        const scoreStr = f.score !== undefined ? f.score.toFixed(3) : '?';
        const scoreColored =
          f.score !== undefined && f.score >= 0.7
            ? red(scoreStr, color)
            : f.score !== undefined && f.score >= 0.4
              ? yellow(scoreStr, color)
              : dim(scoreStr, color);
        const tag = f.severity === 'critical' ? red(' [CRITICAL]', color) : '';
        lines.push(`  ${scoreColored}  ${a} <-> ${b}${tag}`);
      }
    }

    lines.push('');
    const criticalCount = report.findings.filter((f) => f.severity === 'critical').length;
    const warningCount = report.findings.filter((f) => f.severity === 'warning').length;
    const criticalStr = criticalCount > 0 ? red(String(criticalCount), color) : String(criticalCount);
    const warningStr = warningCount > 0 ? yellow(String(warningCount), color) : String(warningCount);
    lines.push(`Findings: ${report.findings.length} total (${criticalStr} critical, ${warningStr} warning)`);

    return lines.join('\n');
  },
};
