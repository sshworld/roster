#!/usr/bin/env node
import { realpathSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import type { AgentDef, Finding, Report } from './core/types.js';
import { sources } from './sources/index.js';
import { rules } from './rules/index.js';
import { renderers } from './render/index.js';
import { run as runDoccheck } from './doccheck.js';
import { run as runUsage } from './usage.js';
import { run as runMcp } from './mcp.js';
import { supportsColor } from './render/ansi.js';

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
  enabledOnly: boolean;
  help: boolean;
}

const HELP_TEXT = `Usage: roster <command> [<dir>] [options]

Commands:
  audit                       Audit a roster for overlaps and issues
  doccheck                    Check docs for drift
  usage                       Report agent usage stats
  mcp                         Run an MCP server on stdio

Options:
  --json                      Output machine-readable JSON
  --html <out>                Write an HTML report to <out>
  --user                      Load agents from the user-level agent directory
  --plugin [name]             Load agents from the plugin cache
  --enabled-only              With --plugin, only include entries active for the current project
                              (installation scope) AND enabled in settings.json/settings.local.json
  --repo <owner/name[@ref]>   Load agents from a GitHub repo
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
    enabledOnly: false,
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
      case '--enabled-only':
        result.enabledOnly = true;
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
  if (argv.length === 0 || argv[0] === '--help' || argv[0] === '-h') {
    console.log(HELP_TEXT);
    return 0;
  }

  const [cmd, ...rest] = argv;
  if (cmd === 'doccheck') return runDoccheck(rest);
  if (cmd === 'usage') return runUsage(rest);
  if (cmd === 'mcp') return runMcp(rest);
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

  // 요청된 소스 전부 수집 — 복수 flag 는 병합 스캔 (출처는 sourceLabel 로 구분)
  const wanted: string[] = [];
  if (parsed.dir) wanted.push('dir');
  if (parsed.user) wanted.push('user');
  if (parsed.plugin) wanted.push('plugin-cache');
  if (parsed.repo) wanted.push('github');
  if (wanted.length === 0) {
    console.error('audit requires a <dir> argument or one of --user / --plugin / --repo');
    return 1;
  }

  if (parsed.enabledOnly && !parsed.plugin) {
    console.error('--enabled-only has no effect without --plugin');
  }

  let rendererId = 'cli';
  if (parsed.json) rendererId = 'json';
  else if (parsed.html !== undefined) {
    if (!parsed.html) {
      console.error('--html requires an output file path');
      return 1;
    }
    rendererId = 'html';
  }

  const renderer = renderers[rendererId];
  if (!renderer) {
    console.error(`unknown renderer: ${rendererId}`);
    return 1;
  }
  if (renderer.stub) {
    console.error(`not implemented: renderer '${rendererId}'`);
    return 2;
  }

  const agents: AgentDef[] = [];
  for (const sourceId of wanted) {
    const source = sources[sourceId];
    if (!source) {
      console.error(`unknown source: ${sourceId}`);
      return 1;
    }
    if (source.stub) {
      console.error(`not implemented: source '${sourceId}'`);
      return 2;
    }
    agents.push(
      ...(await source.load({
        dir: parsed.dir,
        pluginName: parsed.pluginName,
        repo: parsed.repo,
        enabledOnly: parsed.enabledOnly,
      }))
    );
  }

  const findings: Finding[] = [];
  for (const rule of Object.values(rules)) {
    if (rule.stub) continue;
    findings.push(...rule.run(agents, { top: parsed.top, failAbove: parsed.failAbove }));
  }

  const report: Report = {
    agents,
    findings,
    meta: { sourceLabels: [...new Set(agents.map((a) => a.sourceLabel))] },
  };

  const output = renderer.render(report, { color: supportsColor() });
  if (rendererId === 'html') {
    writeFileSync(parsed.html!, output);
    console.log(`HTML report written: ${parsed.html}`);
  } else {
    console.log(output);
  }

  const hasCritical = findings.some((f) => f.severity === 'critical');
  if (parsed.noFail) return 0;
  return hasCritical ? 1 : 0;
}

const isDirectRun = (() => {
  if (process.argv[1] === undefined) return false;
  try {
    return import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href;
  } catch {
    return false;
  }
})();
if (isDirectRun) {
  main(process.argv.slice(2)).then(
    (code) => process.exit(code),
    (err) => {
      console.error(err instanceof Error ? err.message : String(err));
      process.exit(2);
    }
  );
}
