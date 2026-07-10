import { accessSync, constants, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

interface Finding {
  file: string;
  line: number;
  command: string;
  reason: string;
}

interface FenceLine {
  text: string;
  lineNumber: number;
}

const SHELL_LANGS = new Set(['sh', 'bash', 'shell']);
const FENCE_OPEN_RE = /^\s*(`{3,}|~{3,})\s*([A-Za-z0-9_+-]*)\s*$/;

const HELP_TEXT = `Usage: roster doccheck [<file|dir> ...] [options]

Scans fenced sh/bash/shell code blocks in markdown docs for commands that
would fail if run: dead relative paths, missing npm run scripts, and
scripts that exist but lack the executable bit.

Arguments:
  <file|dir> ...   Markdown files or directories to scan (directories are
                   scanned recursively for *.md). Defaults to README.md and
                   docs/**/*.md, whichever exist, when omitted.

Options:
  --json           Output findings as JSON: { findings: [...] }
  --help, -h       Show this help text
`;

export async function run(argv: string[]): Promise<number> {
  if (argv.includes('--help') || argv.includes('-h')) {
    console.log(HELP_TEXT);
    return 0;
  }

  const jsonMode = argv.includes('--json');
  const positional = argv.filter((a) => a !== '--json');

  const targets = resolveTargets(positional);
  const scripts = loadPackageScripts();

  const findings: Finding[] = [];
  for (const target of targets) {
    findings.push(...checkFile(target, scripts));
  }

  if (jsonMode) {
    console.log(JSON.stringify({ findings }));
  } else if (findings.length === 0) {
    console.log('doccheck: no findings');
  } else {
    for (const f of findings) {
      console.log(`${f.file}:${f.line}  ${f.command}  ${f.reason}`);
    }
    console.log(`doccheck: ${findings.length} finding(s)`);
  }

  return findings.length > 0 ? 1 : 0;
}

function resolveTargets(positional: string[]): string[] {
  if (positional.length === 0) {
    const targets: string[] = [];
    if (isFile('README.md')) targets.push('README.md');
    if (isDir('docs')) targets.push(...collectMarkdownFiles('docs'));
    return targets;
  }

  const targets: string[] = [];
  for (const target of positional) {
    if (isDir(target)) {
      targets.push(...collectMarkdownFiles(target));
    } else if (isFile(target)) {
      targets.push(target);
    }
  }
  return targets;
}

function collectMarkdownFiles(dir: string): string[] {
  const result: string[] = [];
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return result;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      result.push(...collectMarkdownFiles(full));
    } else if (entry.isFile() && path.extname(entry.name).toLowerCase() === '.md') {
      result.push(full);
    }
  }
  return result;
}

function loadPackageScripts(): Set<string> {
  try {
    const raw = readFileSync(path.join(process.cwd(), 'package.json'), 'utf8');
    const pkg = JSON.parse(raw) as { scripts?: Record<string, string> };
    return new Set(Object.keys(pkg.scripts ?? {}));
  } catch {
    return new Set();
  }
}

function checkFile(filePath: string, scripts: Set<string>): Finding[] {
  let content: string;
  try {
    content = readFileSync(filePath, 'utf8');
  } catch {
    return [];
  }

  const findings: Finding[] = [];
  for (const block of extractShellBlocks(content)) {
    for (const { text, lineNumber } of block) {
      const reason = checkCommandLine(text, scripts);
      if (reason) {
        findings.push({ file: filePath, line: lineNumber, command: text.trim(), reason });
      }
    }
  }
  return findings;
}

function extractShellBlocks(content: string): FenceLine[][] {
  const lines = content.split(/\r?\n/);
  const blocks: FenceLine[][] = [];
  let i = 0;

  while (i < lines.length) {
    const openMatch = FENCE_OPEN_RE.exec(lines[i]);
    if (!openMatch) {
      i += 1;
      continue;
    }

    const fenceChar = openMatch[1][0];
    const fenceLen = openMatch[1].length;
    const lang = openMatch[2].toLowerCase();
    const closeRe = new RegExp(`^\\s*[${fenceChar}]{${fenceLen},}\\s*$`);

    let j = i + 1;
    while (j < lines.length && !closeRe.test(lines[j])) {
      j += 1;
    }

    if (SHELL_LANGS.has(lang)) {
      const blockLines: FenceLine[] = [];
      for (let k = i + 1; k < j; k += 1) {
        blockLines.push({ text: lines[k], lineNumber: k + 1 });
      }
      blocks.push(blockLines);
    }

    i = j + 1;
  }

  return blocks;
}

function checkCommandLine(rawLine: string, scripts: Set<string>): string | null {
  const trimmed = rawLine.trim();
  if (trimmed === '' || trimmed.startsWith('#')) return null;

  let tokens = trimmed.split(/\s+/).filter(Boolean);
  while (tokens.length > 0 && /^[A-Za-z_][A-Za-z0-9_]*=\S*$/.test(tokens[0])) {
    tokens = tokens.slice(1);
  }
  if (tokens.length === 0) return null;

  const cmd = tokens[0];

  if (cmd === 'npm') {
    if (tokens[1] === 'run' && tokens[2]) {
      const scriptName = tokens[2];
      if (!scripts.has(scriptName)) {
        return `npm script not found: ${scriptName}`;
      }
    }
    return null;
  }

  if (cmd === 'npx') return null;
  if (cmd.startsWith('/')) return null; // absolute path or a slash-command like /plugin

  if (cmd.startsWith('./') || cmd.includes('/')) {
    const resolved = path.join(process.cwd(), cmd);
    if (!pathExists(resolved)) {
      return `relative path not found: ${cmd}`;
    }
    if (!isExecutable(resolved)) {
      return `not executable: ${cmd}`;
    }
    return null;
  }

  // No path separator and not npm/npx/absolute — treat as a global binary, skip.
  return null;
}

function isFile(p: string): boolean {
  try {
    return statSync(p).isFile();
  } catch {
    return false;
  }
}

function isDir(p: string): boolean {
  try {
    return statSync(p).isDirectory();
  } catch {
    return false;
  }
}

function pathExists(p: string): boolean {
  try {
    statSync(p);
    return true;
  } catch {
    return false;
  }
}

function isExecutable(p: string): boolean {
  try {
    accessSync(p, constants.X_OK);
    return true;
  } catch {
    return false;
  }
}
