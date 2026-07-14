import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { spawn, execSync, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { existsSync } from 'node:fs';
import { createInterface } from 'node:readline';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, '../..');
const distCli = path.join(repoRoot, 'dist/cli.js');

describe('roster mcp', () => {
  let child: ChildProcessWithoutNullStreams;
  const allLines: string[] = [];
  const pending = new Map<string | number, (msg: any) => void>();

  beforeAll(() => {
    if (!existsSync(distCli)) {
      execSync('npm run build', { cwd: repoRoot });
    }
  }, 60_000);

  beforeAll(() => {
    child = spawn('node', [distCli, 'mcp'], { cwd: repoRoot });
    const rl = createInterface({ input: child.stdout, crlfDelay: Infinity });
    rl.on('line', (line) => {
      allLines.push(line);
      let msg: any;
      try {
        msg = JSON.parse(line);
      } catch {
        return;
      }
      if (msg && typeof msg === 'object' && 'id' in msg && pending.has(msg.id)) {
        const resolve = pending.get(msg.id)!;
        pending.delete(msg.id);
        resolve(msg);
      }
    });
  });

  afterAll(() => {
    if (child && !child.killed) child.kill();
  });

  function send(msg: unknown): void {
    child.stdin.write(JSON.stringify(msg) + '\n');
  }

  function awaitResponse(id: string | number, timeoutMs = 15_000): Promise<any> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        pending.delete(id);
        reject(new Error(`timed out waiting for response id=${String(id)}`));
      }, timeoutMs);
      pending.set(id, (resp) => {
        clearTimeout(timer);
        resolve(resp);
      });
    });
  }

  function request(msg: { id: string | number; [key: string]: unknown }, timeoutMs = 15_000): Promise<any> {
    const p = awaitResponse(msg.id, timeoutMs);
    send(msg);
    return p;
  }

  async function waitForLineCountAtLeast(n: number, timeoutMs = 15_000): Promise<void> {
    const start = Date.now();
    while (allLines.length < n) {
      if (Date.now() - start > timeoutMs) throw new Error(`timed out waiting for ${n} lines`);
      await new Promise((r) => setTimeout(r, 20));
    }
  }

  it('initialize with a supported protocolVersion echoes it back', async () => {
    const resp = await request({
      jsonrpc: '2.0',
      id: 'init-1',
      method: 'initialize',
      params: { protocolVersion: '2025-03-26', capabilities: {}, clientInfo: { name: 't', version: '0' } },
    });
    expect(resp.result.protocolVersion).toBe('2025-03-26');
    expect(resp.result.serverInfo.name).toBe('roster');
    expect(resp.result.capabilities.tools).toBeDefined();
  }, 20_000);

  it('initialize with an unsupported protocolVersion falls back to the latest', async () => {
    const resp = await request({
      jsonrpc: '2.0',
      id: 'init-2',
      method: 'initialize',
      params: { protocolVersion: '1999-01-01', capabilities: {}, clientInfo: { name: 't', version: '0' } },
    });
    expect(resp.result.protocolVersion).toBe('2025-06-18');
  }, 20_000);

  it('echoes numeric id 0 and string ids verbatim', async () => {
    const zero = await request({ jsonrpc: '2.0', id: 0, method: 'ping' });
    expect(zero.id).toBe(0);

    const str = await request({ jsonrpc: '2.0', id: 'abc', method: 'ping' });
    expect(str.id).toBe('abc');
  }, 20_000);

  it('gives notifications no response', async () => {
    const before = allLines.length;
    send({ jsonrpc: '2.0', method: 'notifications/initialized' });
    const resp = await request({ jsonrpc: '2.0', id: 'after-notif', method: 'ping' });
    expect(resp.result).toEqual({});
    expect(allLines.length - before).toBe(1);
  }, 20_000);

  it('tools/list returns the three read-only tools', async () => {
    const resp = await request({ jsonrpc: '2.0', id: 'tools-list', method: 'tools/list' });
    const names = resp.result.tools.map((t: any) => t.name).sort();
    expect(names).toEqual(['roster_audit', 'roster_doccheck', 'roster_usage']);
    for (const tool of resp.result.tools) {
      expect(tool.annotations.readOnlyHint).toBe(true);
    }
  }, 20_000);

  it('tools/call roster_audit returns JSON findings', async () => {
    const resp = await request(
      {
        jsonrpc: '2.0',
        id: 'call-audit',
        method: 'tools/call',
        params: { name: 'roster_audit', arguments: { path: 'tests/fixtures/roster-a', cwd: repoRoot } },
      },
      30_000
    );
    expect(resp.result.isError).toBeFalsy();
    const parsed = JSON.parse(resp.result.content[0].text);
    expect(Array.isArray(parsed.findings)).toBe(true);
  }, 35_000);

  it('tools/call with an unknown tool name is a protocol error', async () => {
    const resp = await request({
      jsonrpc: '2.0',
      id: 'call-unknown',
      method: 'tools/call',
      params: { name: 'nope', arguments: {} },
    });
    expect(resp.error).toBeDefined();
    expect(resp.error.code).toBe(-32602);
    expect(resp.result).toBeUndefined();
  }, 20_000);

  it('tools/call roster_doccheck with a nonexistent path is a protocol error', async () => {
    const resp = await request({
      jsonrpc: '2.0',
      id: 'call-doccheck-missing',
      method: 'tools/call',
      params: { name: 'roster_doccheck', arguments: { path: '/nonexistent/xyz.md' } },
    });
    expect(resp.error).toBeDefined();
    expect(resp.error.code).toBe(-32602);
  }, 20_000);

  it('handles two messages in one write and one message split across two writes', async () => {
    const a = awaitResponse('joined-a');
    const b = awaitResponse('joined-b');
    child.stdin.write(
      JSON.stringify({ jsonrpc: '2.0', id: 'joined-a', method: 'ping' }) +
        '\n' +
        JSON.stringify({ jsonrpc: '2.0', id: 'joined-b', method: 'ping' }) +
        '\n'
    );
    const [respA, respB] = await Promise.all([a, b]);
    expect(respA.id).toBe('joined-a');
    expect(respB.id).toBe('joined-b');

    const full = JSON.stringify({ jsonrpc: '2.0', id: 'split-write', method: 'ping' }) + '\n';
    const mid = Math.floor(full.length / 2);
    const split = awaitResponse('split-write');
    child.stdin.write(full.slice(0, mid));
    await new Promise((r) => setTimeout(r, 50));
    child.stdin.write(full.slice(mid));
    const resp = await split;
    expect(resp.id).toBe('split-write');
    expect(resp.result).toEqual({});
  }, 20_000);

  it('rejects a JSON-RPC batch and keeps serving subsequent requests', async () => {
    const before = allLines.length;
    const batchLine =
      JSON.stringify([
        { jsonrpc: '2.0', id: 'batch-1', method: 'ping' },
        { jsonrpc: '2.0', id: 'batch-2', method: 'ping' },
      ]) + '\n';
    child.stdin.write(batchLine);
    await waitForLineCountAtLeast(before + 1);
    const batchResp = JSON.parse(allLines[before]);
    expect(batchResp.error).toBeDefined();
    expect(batchResp.error.code).toBe(-32600);
    expect(batchResp.id).toBeNull();

    const resp = await request({ jsonrpc: '2.0', id: 'after-batch', method: 'ping' });
    expect(resp.result).toEqual({});
  }, 20_000);

  it('resources/list, prompts/list, and ping return their spec-shaped empty results', async () => {
    const resources = await request({ jsonrpc: '2.0', id: 'resources-list', method: 'resources/list' });
    expect(resources.result.resources).toEqual([]);

    const prompts = await request({ jsonrpc: '2.0', id: 'prompts-list', method: 'prompts/list' });
    expect(prompts.result.prompts).toEqual([]);

    const ping = await request({ jsonrpc: '2.0', id: 'ping-empty', method: 'ping' });
    expect(ping.result).toEqual({});
  }, 20_000);

  it('every stdout line across the whole session parses as JSON', () => {
    for (const line of allLines) {
      expect(() => JSON.parse(line)).not.toThrow();
    }
  });

  it('exits within 5s when stdin is closed', async () => {
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('did not exit within 5s')), 5_000);
      child.once('exit', () => {
        clearTimeout(timer);
        resolve();
      });
      child.stdin.end();
    });
  }, 10_000);
});
