#!/usr/bin/env node
// scripts/update-bench-table.mjs — regenerates the leaderboard table in a
// target markdown file (e.g. README.md) from the summary stats in each
// docs/benchmarks/*.md report. Node built-ins only, no runtime deps.
//
// Usage:
//   node scripts/update-bench-table.mjs <file.md>            # rewrite in place
//   node scripts/update-bench-table.mjs <file.md> --check     # verify only, exit 1 if stale
//
// The target file must contain a `<!-- bench:start -->` / `<!-- bench:end -->`
// marker pair; content between them is replaced with the regenerated table.
// If the markers are absent, this is a no-op (warning + exit 0) — inserting
// the markers is owned by whichever slice first wires this into a real file.

import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const START_MARKER = '<!-- bench:start -->';
const END_MARKER = '<!-- bench:end -->';

export function parseReport(text) {
  const repoMatch = text.match(/\*\*Repo\*\*: \[([^\]]+)\]\(([^)]+)\)/);
  const agentsMatch = text.match(/Agents scanned: \*\*(\d+)\*\*/);
  const topPairMatch = text.match(/Top overlap pair \(of top \d+\): \*\*(.+?)\*\*/);
  const noToolsMatch = text.match(/No-harness agents[^:]*: \*\*\d+\*\* \(([\d.]+)% of roster\)/);
  const fixedCostMatch = text.match(/Roster fixed cost estimate: \*\*(~[^*]+)\*\*/);

  if (!repoMatch || !agentsMatch || !topPairMatch || !noToolsMatch || !fixedCostMatch) {
    return null;
  }

  return {
    repo: repoMatch[1],
    repoUrl: repoMatch[2],
    agents: Number(agentsMatch[1]),
    topPair: topPairMatch[1],
    noToolsPct: noToolsMatch[1],
    fixedCost: fixedCostMatch[1],
  };
}

export function renderBenchTable(reports) {
  const header = '| Repo | Agents | Top overlap pair | No-tools % | Fixed cost |';
  const separator = '| --- | --- | --- | --- | --- |';

  if (reports.length === 0) {
    return [header, separator, '| (no benchmark reports found) | - | - | - | - |'].join('\n');
  }

  const rows = reports.map(
    (r) => `| [${r.repo}](${r.repoUrl}) | ${r.agents} | ${r.topPair} | ${r.noToolsPct}% | ${r.fixedCost} |`
  );

  return [header, separator, ...rows].join('\n');
}

export function replaceBetweenMarkers(text, table) {
  const startIdx = text.indexOf(START_MARKER);
  const endIdx = text.indexOf(END_MARKER);
  if (startIdx === -1 || endIdx === -1 || endIdx < startIdx) {
    return null;
  }

  const before = text.slice(0, startIdx + START_MARKER.length);
  const after = text.slice(endIdx);
  return `${before}\n${table}\n${after}`;
}

function loadReports(benchDir) {
  const files = readdirSync(benchDir)
    .filter((f) => f.endsWith('.md'))
    .sort();

  const reports = [];
  for (const file of files) {
    const text = readFileSync(path.join(benchDir, file), 'utf8');
    const report = parseReport(text);
    if (!report) {
      console.error(`update-bench-table: WARNING could not parse ${file} — skipping`);
      continue;
    }
    reports.push(report);
  }
  return reports;
}

export async function main(argv) {
  const checkMode = argv.includes('--check');
  const target = argv.find((a) => a !== '--check');

  if (!target) {
    console.error('usage: update-bench-table.mjs <file.md> [--check]');
    return 2;
  }

  const rootDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
  const benchDir = path.join(rootDir, 'docs/benchmarks');
  const reports = loadReports(benchDir);
  const table = renderBenchTable(reports);

  const targetPath = path.resolve(target);
  const targetText = readFileSync(targetPath, 'utf8');
  const replaced = replaceBetweenMarkers(targetText, table);

  if (replaced === null) {
    console.warn(
      `update-bench-table: no ${START_MARKER}/${END_MARKER} markers found in ${target} — no-op`
    );
    return 0;
  }

  if (checkMode) {
    if (replaced === targetText) return 0;
    console.error(`update-bench-table: ${target} is stale — run without --check to update`);
    return 1;
  }

  if (replaced !== targetText) {
    writeFileSync(targetPath, replaced);
    console.log(`update-bench-table: updated ${target}`);
  }
  return 0;
}

const isDirectRun = process.argv[1] !== undefined && import.meta.url === `file://${process.argv[1]}`;
if (isDirectRun) {
  main(process.argv.slice(2)).then(
    (code) => process.exit(code),
    (err) => {
      console.error(err instanceof Error ? err.message : String(err));
      process.exit(2);
    }
  );
}
