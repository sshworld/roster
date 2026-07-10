import type { AgentDef, Finding, Report } from '../core/types.js';
import { htmlStyles } from './html-styles.js';

export function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function estimateTokens(agent: AgentDef): number {
  const text = `${agent.description}\n${agent.body}`;
  return Math.ceil(text.length / 4);
}

function scoreClass(score: number): string {
  if (score >= 0.6) return 'score-strong';
  if (score >= 0.3) return 'score-mid';
  return 'score-low';
}

function renderHeaderCard(report: Report): string {
  const costFinding = report.findings.find((f) => f.ruleId === 'cost');
  const costRow = costFinding
    ? `<div class="stat"><span class="value">${escapeHtml(costFinding.message)}</span><span class="label">Roster cost</span></div>`
    : '';

  return `
    <section class="card">
      <h1>Roster Audit Report</h1>
      <div class="header-stats">
        <div class="stat">
          <span class="value">${report.agents.length}</span>
          <span class="label">Agents scanned</span>
        </div>
        <div class="stat">
          <span class="value">${escapeHtml(report.meta.sourceLabels.join(', ') || '(none)')}</span>
          <span class="label">Sources</span>
        </div>
        ${costRow}
      </div>
    </section>
  `;
}

function renderOverlapSection(report: Report): string {
  const overlapFindings = report.findings.filter((f) => f.ruleId === 'overlap');

  const rows = overlapFindings
    .map((f) => {
      const [a, b] = f.pair ?? ['?', '?'];
      const score = f.score ?? 0;
      const severityClass = f.severity === 'critical' ? 'severity-critical' : 'severity-info';
      return `
        <tr>
          <td><span class="score-cell ${scoreClass(score)}">${score.toFixed(3)}</span></td>
          <td>${escapeHtml(a)}</td>
          <td>${escapeHtml(b)}</td>
          <td><span class="severity-badge ${severityClass}">${escapeHtml(f.severity)}</span></td>
        </tr>
      `;
    })
    .join('');

  const body =
    overlapFindings.length === 0
      ? '<p class="empty-note">No overlap findings.</p>'
      : `
        <table>
          <thead>
            <tr><th>Score</th><th>Agent A</th><th>Agent B</th><th>Severity</th></tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      `;

  return `
    <section class="card">
      <h2>Overlap — top overlapping pairs (${overlapFindings.length})</h2>
      ${body}
    </section>
  `;
}

function renderFindingsAccordion(report: Report): string {
  const grouped = new Map<string, Finding[]>();
  for (const f of report.findings) {
    if (!grouped.has(f.ruleId)) grouped.set(f.ruleId, []);
    grouped.get(f.ruleId)!.push(f);
  }

  if (grouped.size === 0) {
    return `
      <section class="card">
        <h2>Findings</h2>
        <p class="empty-note">No findings.</p>
      </section>
    `;
  }

  const details = [...grouped.entries()]
    .map(([ruleId, findings]) => {
      const rows = findings
        .map((f) => {
          const severityClass = f.severity === 'critical' ? 'severity-critical' : f.severity === 'warning' ? 'severity-warning' : 'severity-info';
          const target = f.agent ? escapeHtml(f.agent) : f.pair ? f.pair.map(escapeHtml).join(' <-> ') : '';
          return `
            <div class="finding-row">
              <span class="severity-badge ${severityClass}">${escapeHtml(f.severity)}</span>
              ${target ? `<strong>${target}</strong> — ` : ''}${escapeHtml(f.message)}
            </div>
          `;
        })
        .join('');

      return `
        <details>
          <summary>${escapeHtml(ruleId)} (${findings.length})</summary>
          ${rows}
        </details>
      `;
    })
    .join('');

  return `
    <section class="card">
      <h2>Findings</h2>
      ${details}
    </section>
  `;
}

function renderAgentTable(report: Report): string {
  const rows = report.agents
    .map((agent) => {
      const hasTools = agent.tools !== undefined && agent.tools.length > 0;
      return `
        <tr>
          <td>${escapeHtml(agent.name)}</td>
          <td>${hasTools ? 'yes' : 'no'}</td>
          <td>${agent.description.length}</td>
          <td>${estimateTokens(agent)}</td>
        </tr>
      `;
    })
    .join('');

  const body = `
        <table>
          <thead>
            <tr><th>Name</th><th>Tools</th><th>Description length</th><th>Est. tokens</th></tr>
          </thead>
          <tbody>${rows || '<tr><td colspan="4" class="empty-note">No agents.</td></tr>'}</tbody>
        </table>
      `;

  return `
    <section class="card">
      <h2>Agents (${report.agents.length})</h2>
      ${body}
    </section>
  `;
}

export function renderHtmlTemplate(report: Report): string {
  const sections = [
    renderHeaderCard(report),
    renderOverlapSection(report),
    renderFindingsAccordion(report),
    renderAgentTable(report),
  ].join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Roster Audit Report</title>
<style>${htmlStyles()}</style>
</head>
<body>
${sections}
</body>
</html>`;
}
