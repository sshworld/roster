import { existsSync, readFileSync } from 'node:fs';
import { execFile, type ExecFileException } from 'node:child_process';
import { createInterface } from 'node:readline';
import path, { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const SUPPORTED_PROTOCOL_VERSIONS = new Set(['2024-11-05', '2025-03-26', '2025-06-18']);
const LATEST_PROTOCOL_VERSION = '2025-06-18';

const moduleDir = dirname(fileURLToPath(import.meta.url));
const cliPath = join(moduleDir, 'cli.js');

interface JsonRpcRequest {
  jsonrpc?: string;
  id?: string | number | null;
  method?: string;
  params?: Record<string, unknown>;
}

const ABS_PATH_HINT = 'Absolute paths are recommended.';

const TOOLS = [
  {
    name: 'roster_audit',
    description: 'Statically audit an agent roster for overlap, missing tools/harness gaps, routing ambiguity, and context/token cost.',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: `Directory of agent .md files to audit. ${ABS_PATH_HINT}` },
        user: { type: 'boolean', description: 'Include agents from the user-level agent directory (~/.claude/agents).' },
        plugin: { type: 'boolean', description: 'Include agents from the installed plugin cache.' },
        pluginName: { type: 'string', description: 'Restrict the plugin scan to a single plugin by name.' },
        enabledOnly: {
          type: 'boolean',
          description: 'With plugin, only include entries enabled for the current project.',
        },
        repo: { type: 'string', description: 'owner/name[@ref][:subdir] GitHub roster (subdir scopes the scan)' },
        cwd: {
          type: 'string',
          description: `Working directory for resolving relative paths and enabledOnly project detection. ${ABS_PATH_HINT}`,
        },
      },
    },
    annotations: { readOnlyHint: true },
  },
  {
    name: 'roster_usage',
    description:
      "Aggregate real subagent invocations from Claude Code transcripts and join against the roster to find unused agents and ghost invocations.",
    inputSchema: {
      type: 'object',
      properties: {
        days: { type: 'number', description: 'Number of days of transcript history to include.' },
        user: { type: 'boolean', description: 'Include agents from the user-level agent directory (~/.claude/agents).' },
        plugin: { type: 'boolean', description: 'Include agents from the installed plugin cache.' },
        cwd: { type: 'string', description: `Working directory. ${ABS_PATH_HINT}` },
      },
    },
    annotations: { readOnlyHint: true },
  },
  {
    name: 'roster_doccheck',
    description: 'Check markdown docs for commands that would fail: dead relative paths and missing npm scripts.',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: `Markdown file or directory to check. ${ABS_PATH_HINT}` },
        cwd: { type: 'string', description: `Working directory used to resolve a relative path. ${ABS_PATH_HINT}` },
      },
      required: ['path'],
    },
    annotations: { readOnlyHint: true },
  },
];

function readVersion(): string {
  try {
    const pkg = JSON.parse(readFileSync(join(moduleDir, '../package.json'), 'utf8')) as { version?: string };
    return pkg.version ?? '0.0.0';
  } catch {
    return '0.0.0';
  }
}

interface ExecResult {
  content: { type: 'text'; text: string }[];
  isError: boolean;
}

function execRoster(argv: string[], cwd: string | undefined, opts: { doccheckOk1?: boolean } = {}): Promise<ExecResult> {
  return new Promise((resolve) => {
    execFile(
      process.execPath,
      [cliPath, ...argv],
      { cwd: cwd ?? process.cwd(), maxBuffer: 32 * 1024 * 1024, timeout: 120_000 },
      (err, stdout, stderr) => {
        let text = stdout ?? '';
        if (stderr) text += `\n[stderr]\n${stderr}`;

        let isError = false;
        if (err) {
          const execErr = err as ExecFileException;
          if (execErr.killed || execErr.signal) {
            text = `timed out after 120s${text ? `\n${text}` : ''}`;
            isError = true;
          } else if (opts.doccheckOk1 && execErr.code === 1) {
            isError = false;
          } else {
            isError = true;
          }
        }

        resolve({ content: [{ type: 'text', text }], isError });
      }
    );
  });
}

function buildAuditArgv(args: Record<string, unknown>): string[] {
  const argv = ['audit'];
  if (typeof args.path === 'string') argv.push(args.path);
  if (args.user) argv.push('--user');
  if (args.plugin) {
    argv.push('--plugin');
    if (typeof args.pluginName === 'string') argv.push(args.pluginName);
  }
  if (args.enabledOnly) argv.push('--enabled-only');
  if (typeof args.repo === 'string') argv.push('--repo', args.repo);
  argv.push('--json', '--no-fail');
  return argv;
}

function buildUsageArgv(args: Record<string, unknown>): string[] {
  const argv = ['usage'];
  if (args.days !== undefined && args.days !== null) argv.push('--days', String(args.days));
  if (args.user) argv.push('--user');
  if (args.plugin) argv.push('--plugin');
  argv.push('--json');
  return argv;
}

async function handleToolsCall(
  params: Record<string, unknown>
): Promise<{ result?: ExecResult; error?: { code: number; message: string } }> {
  const name = params?.name;
  const args = (params?.arguments as Record<string, unknown>) ?? {};
  const cwd = typeof args.cwd === 'string' ? args.cwd : undefined;

  if (name === 'roster_audit') {
    return { result: await execRoster(buildAuditArgv(args), cwd) };
  }
  if (name === 'roster_usage') {
    return { result: await execRoster(buildUsageArgv(args), cwd) };
  }
  if (name === 'roster_doccheck') {
    if (typeof args.path !== 'string') {
      return { error: { code: -32602, message: 'roster_doccheck requires a path argument' } };
    }
    const resolved = path.isAbsolute(args.path) ? args.path : path.join(cwd ?? process.cwd(), args.path);
    if (!existsSync(resolved)) {
      return { error: { code: -32602, message: `path not found: ${args.path}` } };
    }
    return { result: await execRoster(['doccheck', args.path, '--json'], cwd, { doccheckOk1: true }) };
  }
  return { error: { code: -32602, message: `unknown tool: ${String(name)}` } };
}

async function handleMessage(msg: JsonRpcRequest): Promise<Record<string, unknown> | null> {
  const method = msg.method;

  if (method === 'notifications/initialized' || method === 'notifications/cancelled') {
    return null;
  }

  if (msg.id === undefined) {
    return null;
  }
  const id = msg.id;

  if (method === 'initialize') {
    const requested = (msg.params as Record<string, unknown> | undefined)?.protocolVersion;
    const protocolVersion =
      typeof requested === 'string' && SUPPORTED_PROTOCOL_VERSIONS.has(requested) ? requested : LATEST_PROTOCOL_VERSION;
    return {
      jsonrpc: '2.0',
      id,
      result: {
        protocolVersion,
        capabilities: { tools: {} },
        serverInfo: { name: 'roster', version: readVersion() },
      },
    };
  }

  if (method === 'ping') {
    return { jsonrpc: '2.0', id, result: {} };
  }

  if (method === 'resources/list') {
    return { jsonrpc: '2.0', id, result: { resources: [] } };
  }

  if (method === 'prompts/list') {
    return { jsonrpc: '2.0', id, result: { prompts: [] } };
  }

  if (method === 'tools/list') {
    return { jsonrpc: '2.0', id, result: { tools: TOOLS } };
  }

  if (method === 'tools/call') {
    const outcome = await handleToolsCall(msg.params ?? {});
    if (outcome.error) {
      return { jsonrpc: '2.0', id, error: outcome.error };
    }
    return { jsonrpc: '2.0', id, result: outcome.result };
  }

  return { jsonrpc: '2.0', id, error: { code: -32601, message: `method not found: ${method}` } };
}

function writeResponse(resp: unknown): void {
  process.stdout.write(`${JSON.stringify(resp)}\n`);
}

export async function run(_argv: string[]): Promise<number> {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, crlfDelay: Infinity });

    rl.on('line', (line) => {
      const trimmed = line.trim();
      if (!trimmed) return;

      let parsed: unknown;
      try {
        parsed = JSON.parse(trimmed);
      } catch {
        writeResponse({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } });
        return;
      }

      if (Array.isArray(parsed)) {
        writeResponse({ jsonrpc: '2.0', id: null, error: { code: -32600, message: 'Batch requests are not supported' } });
        return;
      }

      handleMessage(parsed as JsonRpcRequest).then((resp) => {
        if (resp) writeResponse(resp);
      });
    });

    rl.on('close', () => resolve(0));
  });
}
