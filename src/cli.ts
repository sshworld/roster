#!/usr/bin/env node
import type { Report } from './core/types.js';
import { sources } from './sources/index.js';
import { rules } from './rules/index.js';
import { renderers } from './render/index.js';

interface ParsedArgs {
  dir?: string;
  json: boolean;
  html?: string;
  user: boolean;
  plugin: boolean;
  pluginName?: string;
  repo?: string;
  top?: number;
  failAbove?: number;
  noFail: boolean;
  help: boolean;
}

const HELP_TEXT = `Usage: roster audit <dir> [options]

Options:
  --json                      Output machine-readable JSON (S3)
  --html <out>                Write an HTML report to <out> (S3)
  --user                      Load agents from the user-level agent directory (S4)
  --plugin [name]             Load agents from the plugin cache (S4)
  --repo <owner/name[@ref]>   Load agents from a GitHub repo (S4)
  --top <n>                   Number of top overlapping pairs to report (default 10)
  --fail-above <score>        Mark overlap findings above <score> as critical
  --no-fail                   Always exit 0, even with critical findings
  --help, -h                  Show this help text
`;

function parseArgs(argv: string[]): ParsedArgs {
  const result: ParsedArgs = {
    json: false,
    user: false,
    plugin: false,
    noFail: false,
    help: false,
  };

  let i = 0;
  while (i < argv.length) {
    const arg = argv[i];
    switch (arg) {
      case '--help':
      case '-h':
        result.help = true;
        i += 1;
        break;
      case '--json':
        result.json = true;
        i += 1;
        break;
      case '--html':
        result.html = argv[i + 1];
        i += 2;
        break;
      case '--user':
        result.user = true;
        i += 1;
        break;
      case '--plugin':
        result.plugin = true;
        if (argv[i + 1] && !argv[i + 1].startsWith('--')) {
          result.pluginName = argv[i + 1];
          i += 2;
        } else {
          i += 1;
        }
        break;
      case '--repo':
        result.repo = argv[i + 1];
        i += 2;
        break;
      case '--top':
        result.top = Number(argv[i + 1]);
        i += 2;
        break;
      case '--fail-above':
        result.failAbove = Number(argv[i + 1]);
        i += 2;
        break;
      case '--no-fail':
        result.noFail = true;
        i += 1;
        break;
      default:
        if (result.dir === undefined && !arg.startsWith('--')) {
          result.dir = arg;
        }
        i += 1;
        break;
    }
  }

  return result;
}

export async function main(argv: string[]): Promise<number> {
  if (argv.length === 0 || argv.includes('--help') || argv.includes('-h')) {
    console.log(HELP_TEXT);
    return 0;
  }

  const [cmd, ...rest] = argv;
  if (cmd !== 'audit') {
    console.error(`unknown command: ${cmd}`);
    console.error(HELP_TEXT);
    return 1;
  }

  const parsed = parseArgs(rest);
  if (parsed.help) {
    console.log(HELP_TEXT);
    return 0;
  }

  let sourceId = 'dir';
  if (parsed.user) sourceId = 'user';
  else if (parsed.plugin) sourceId = 'plugin-cache';
  else if (parsed.repo) sourceId = 'github';

  const source = sources[sourceId];
  if (!source) {
    console.error(`unknown source: ${sourceId}`);
    return 1;
  }
  if (source.stub) {
    console.error(`not implemented (S4 예정): source '${sourceId}'`);
    return 2;
  }

  let rendererId = 'cli';
  if (parsed.json) rendererId = 'json';
  else if (parsed.html !== undefined) rendererId = 'html';

  const renderer = renderers[rendererId];
  if (!renderer) {
    console.error(`unknown renderer: ${rendererId}`);
    return 1;
  }
  if (renderer.stub) {
    console.error(`not implemented (S3 예정): renderer '${rendererId}'`);
    return 2;
  }

  if (!parsed.dir) {
    console.error('audit requires a <dir> argument');
    return 1;
  }

  const agents = await source.load({ dir: parsed.dir, pluginName: parsed.pluginName, repo: parsed.repo });

  const overlapRule = rules.overlap;
  const findings = overlapRule.run(agents, { top: parsed.top, failAbove: parsed.failAbove });

  const report: Report = {
    agents,
    findings,
    meta: { sourceLabels: [...new Set(agents.map((a) => a.sourceLabel))] },
  };

  const output = renderer.render(report, {});
  console.log(output);

  const hasCritical = findings.some((f) => f.severity === 'critical');
  if (parsed.noFail) return 0;
  return hasCritical ? 1 : 0;
}

const isDirectRun = process.argv[1] !== undefined && import.meta.url === `file://${process.argv[1]}`;
if (isDirectRun) {
  main(process.argv.slice(2)).then((code) => process.exit(code));
}
