import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  parseReport,
  renderBenchTable,
  replaceBetweenMarkers,
  main,
} from '../../scripts/update-bench-table.mjs';

const FIXTURE_REPORT = `# Benchmark — some-owner/some-repo

- **Repo**: [some-owner/some-repo](https://github.com/some-owner/some-repo)
- **Pinned SHA**: \`deadbeef\`
- **Generated**: 2026-07-10

## Summary

- Agents scanned: **10**
- Top overlap pair (of top 15): **agent-a <-> agent-b (0.500)**
- No-harness agents (no tool restriction / wildcard tools): **2** (20.0% of roster)
- Roster fixed cost estimate: **~1234 tokens/turn**
- Total findings: **5**
`;

describe('parseReport', () => {
  it('extracts summary fields from a benchmark report', () => {
    const report = parseReport(FIXTURE_REPORT);
    expect(report).toEqual({
      repo: 'some-owner/some-repo',
      repoUrl: 'https://github.com/some-owner/some-repo',
      agents: 10,
      topPair: 'agent-a <-> agent-b (0.500)',
      noToolsPct: '20.0',
      fixedCost: '~1234 tokens/turn',
    });
  });

  it('returns null when required fields are missing', () => {
    expect(parseReport('# Benchmark — nothing here\n')).toBeNull();
  });
});

describe('renderBenchTable', () => {
  it('renders one row per report', () => {
    const table = renderBenchTable([
      {
        repo: 'owner-a/repo-a',
        repoUrl: 'https://github.com/owner-a/repo-a',
        agents: 10,
        topPair: 'agent-a <-> agent-b (0.500)',
        noToolsPct: '20.0',
        fixedCost: '~1234 tokens/turn',
      },
      {
        repo: 'owner-b/repo-b',
        repoUrl: 'https://github.com/owner-b/repo-b',
        agents: 20,
        topPair: 'agent-c <-> agent-d (0.700)',
        noToolsPct: '5.0',
        fixedCost: '~5678 tokens/turn',
      },
    ]);

    expect(table).toBe(
      [
        '| Repo | Agents | Top overlap pair | No-tools % | Fixed cost |',
        '| --- | --- | --- | --- | --- |',
        '| [owner-a/repo-a](https://github.com/owner-a/repo-a) | 10 | agent-a <-> agent-b (0.500) | 20.0% | ~1234 tokens/turn |',
        '| [owner-b/repo-b](https://github.com/owner-b/repo-b) | 20 | agent-c <-> agent-d (0.700) | 5.0% | ~5678 tokens/turn |',
      ].join('\n')
    );
  });

  it('renders a placeholder row when there are no reports', () => {
    const table = renderBenchTable([]);
    expect(table).toContain('| Repo | Agents | Top overlap pair | No-tools % | Fixed cost |');
    expect(table).toContain('(no benchmark reports found)');
  });
});

describe('replaceBetweenMarkers', () => {
  const table = '| a | b |\n| --- | --- |\n| 1 | 2 |';

  it('replaces the content between bench:start and bench:end markers', () => {
    const text = [
      '# Leaderboard',
      '',
      '<!-- bench:start -->',
      'stale content',
      '<!-- bench:end -->',
      '',
      'trailing text',
    ].join('\n');

    const result = replaceBetweenMarkers(text, table);

    expect(result).toBe(
      ['# Leaderboard', '', '<!-- bench:start -->', table, '<!-- bench:end -->', '', 'trailing text'].join('\n')
    );
  });

  it('returns null (no-op) when markers are absent', () => {
    const text = '# Leaderboard\n\nno markers here\n';
    expect(replaceBetweenMarkers(text, table)).toBeNull();
  });
});

describe('main (CLI)', () => {
  function writeTmp(name: string, content: string): string {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'update-bench-table-'));
    const file = path.join(dir, name);
    fs.writeFileSync(file, content);
    return file;
  }

  it('is a no-op and exits 0 when the target file has no markers', async () => {
    const file = writeTmp('no-markers.md', '# No markers here\n');
    const before = fs.readFileSync(file, 'utf8');

    const code = await main([file]);

    expect(code).toBe(0);
    expect(fs.readFileSync(file, 'utf8')).toBe(before);
  });

  it('--check exits 1 when the file is stale and does not modify it', async () => {
    const content = '# Leaderboard\n\n<!-- bench:start -->\nstale\n<!-- bench:end -->\n';
    const file = writeTmp('stale.md', content);

    const code = await main([file, '--check']);

    expect(code).toBe(1);
    expect(fs.readFileSync(file, 'utf8')).toBe(content);
  });

  it('writes the regenerated table and then passes --check', async () => {
    const content = '# Leaderboard\n\n<!-- bench:start -->\nstale\n<!-- bench:end -->\n';
    const file = writeTmp('update-me.md', content);

    const writeCode = await main([file]);
    expect(writeCode).toBe(0);
    expect(fs.readFileSync(file, 'utf8')).not.toBe(content);

    const checkCode = await main([file, '--check']);
    expect(checkCode).toBe(0);
  });
});
