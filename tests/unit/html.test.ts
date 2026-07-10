import { describe, it, expect } from 'vitest';
import { htmlRenderer } from '../../src/render/html.js';
import type { AgentDef, Finding, Report } from '../../src/core/types.js';

function makeAgent(overrides: Partial<AgentDef> = {}): AgentDef {
  return {
    name: 'writer',
    description: 'Drafts marketing copy',
    tools: ['Write'],
    body: 'You write short punchy sentences.',
    sourceLabel: 'dir:tests/fixtures/roster-a',
    filePath: '/tmp/roster-a/writer.md',
    ...overrides,
  };
}

function makeReport(overrides: Partial<Report> = {}): Report {
  return {
    agents: [makeAgent()],
    findings: [],
    meta: { sourceLabels: ['dir:tests/fixtures/roster-a'] },
    ...overrides,
  };
}

describe('htmlRenderer', () => {
  it('has id "html"', () => {
    expect(htmlRenderer.id).toBe('html');
  });

  it('produces a self-contained html document with no external asset loads', () => {
    const report = makeReport();
    const html = htmlRenderer.render(report);

    expect(html).toMatch(/^<!DOCTYPE html>/i);
    expect(html).not.toMatch(/<script\s+src=/i);
    expect(html).not.toMatch(/<link\s+href=/i);
    expect(html).not.toMatch(/url\(http/i);
  });

  it('renders a header card with agent count and source labels', () => {
    const report = makeReport({
      agents: [makeAgent({ name: 'writer' }), makeAgent({ name: 'designer' })],
      meta: { sourceLabels: ['dir:tests/fixtures/roster-a'] },
    });
    const html = htmlRenderer.render(report);

    expect(html).toContain('2');
    expect(html).toContain('dir:tests/fixtures/roster-a');
  });

  it('renders an overlap section consuming overlap findings', () => {
    const findings: Finding[] = [
      {
        ruleId: 'overlap',
        severity: 'info',
        pair: ['writer', 'designer'],
        score: 0.72,
        message: 'writer and designer overlap (similarity 0.720)',
      },
    ];
    const report = makeReport({
      agents: [makeAgent({ name: 'writer' }), makeAgent({ name: 'designer' })],
      findings,
    });
    const html = htmlRenderer.render(report);

    expect(html.toLowerCase()).toContain('overlap');
    expect(html).toContain('writer');
    expect(html).toContain('designer');
    expect(html).toContain('0.72');
  });

  it('renders a rule-grouped findings accordion using <details>', () => {
    const findings: Finding[] = [
      {
        ruleId: 'harness',
        severity: 'warning',
        agent: 'writer',
        message: 'writer is missing tool restrictions',
      },
    ];
    const report = makeReport({ findings });
    const html = htmlRenderer.render(report);

    expect(html).toContain('<details');
    expect(html).toContain('harness');
    expect(html).toContain('writer is missing tool restrictions');
  });

  it('renders an agent listing table with name, tools presence, description length, and estimated tokens', () => {
    const report = makeReport({
      agents: [makeAgent({ name: 'writer', tools: ['Write'], description: 'short desc' })],
    });
    const html = htmlRenderer.render(report);

    expect(html).toContain('writer');
    expect(html).toMatch(/<table/i);
  });

  it('escapes agent-controlled content to prevent XSS', () => {
    const report = makeReport({
      agents: [
        makeAgent({
          name: '<script>alert(1)</script>',
          description: '<img src=x onerror=alert(2)>',
        }),
      ],
    });
    const html = htmlRenderer.render(report);

    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).toContain('&lt;script&gt;');
    expect(html).not.toContain('<img src=x onerror=alert(2)>');
  });

  it('escapes finding messages and agent names inside the overlap/findings sections', () => {
    const findings: Finding[] = [
      {
        ruleId: 'overlap',
        severity: 'info',
        pair: ['<script>evil()</script>', 'designer'],
        score: 0.5,
        message: '<script>evil()</script> and designer overlap',
      },
    ];
    const report = makeReport({ findings });
    const html = htmlRenderer.render(report);

    expect(html).not.toContain('<script>evil()</script>');
  });

  it('does not throw and still renders required sections when there are no findings and no agents beyond defaults', () => {
    const report = makeReport({ agents: [], findings: [], meta: { sourceLabels: [] } });
    expect(() => htmlRenderer.render(report)).not.toThrow();
    const html = htmlRenderer.render(report);
    expect(html.toLowerCase()).toContain('overlap');
    expect(html).toMatch(/<table/i);
  });

  it('omits the cost card when no cost finding is present, and shows it when present', () => {
    const withoutCost = htmlRenderer.render(makeReport());
    expect(withoutCost.toLowerCase()).not.toContain('roster cost');

    const withCost = htmlRenderer.render(
      makeReport({
        findings: [
          {
            ruleId: 'cost',
            severity: 'info',
            message: 'Estimated fixed cost: 12345 tokens',
          },
        ],
      })
    );
    expect(withCost).toContain('12345');
  });
});
