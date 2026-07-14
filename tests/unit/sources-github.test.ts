import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { githubSource } from '../../src/sources/github.js';

const AGENT_MD = `---
name: remote-agent
description: An agent fetched from a mocked GitHub repo tree.
tools: [Read]
---

You are fetched via raw.githubusercontent.com, never via tar extraction.
`;

function jsonResponse(body: unknown, init: Partial<Response> = {}): Response {
  return {
    ok: init.ok ?? true,
    status: init.status ?? 200,
    json: async () => body,
    text: async () => JSON.stringify(body),
  } as unknown as Response;
}

function textResponse(body: string, init: Partial<Response> = {}): Response {
  return {
    ok: init.ok ?? true,
    status: init.status ?? 200,
    json: async () => JSON.parse(body),
    text: async () => body,
  } as unknown as Response;
}

describe('githubSource', () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
    fetchMock = vi.fn();
    globalThis.fetch = fetchMock as unknown as typeof globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.unstubAllEnvs();
  });

  it('resolves the default branch when no ref is given, then fetches the tree via the trees API (no tar)', async () => {
    fetchMock.mockImplementation(async (url: string) => {
      if (url.includes('/repos/acme/agents') && !url.includes('/git/trees/')) {
        return jsonResponse({ default_branch: 'main' });
      }
      if (url.includes('/git/trees/main')) {
        expect(url).toContain('recursive=1');
        return jsonResponse({
          tree: [
            { path: 'agents/remote.md', type: 'blob' },
            { path: 'README.md', type: 'blob' },
            { path: 'src/index.js', type: 'blob' },
          ],
          truncated: false,
        });
      }
      if (url.startsWith('https://raw.githubusercontent.com/acme/agents/main/agents/remote.md')) {
        return textResponse(AGENT_MD);
      }
      throw new Error(`unexpected fetch: ${url}`);
    });

    const agents = await githubSource.load({ repo: 'acme/agents' });

    expect(agents).toHaveLength(1);
    expect(agents[0].name).toBe('remote-agent');
    expect(agents[0].sourceLabel).toBe('github:acme/agents@main');

    const calledUrls = fetchMock.mock.calls.map((c) => c[0] as string);
    expect(calledUrls.some((u) => u.includes('/git/trees/'))).toBe(true);
    expect(calledUrls.some((u) => u.includes('tarball') || u.includes('.tar'))).toBe(false);
  });

  it('uses an explicit owner/name@ref pin (branch/tag/SHA) and skips the default-branch lookup', async () => {
    fetchMock.mockImplementation(async (url: string) => {
      if (url.includes('/repos/acme/agents') && !url.includes('/git/trees/')) {
        throw new Error('should not call repos API when ref is explicit');
      }
      if (url.includes('/git/trees/deadbeef')) {
        return jsonResponse({
          tree: [{ path: 'agents/remote.md', type: 'blob' }],
          truncated: false,
        });
      }
      if (url.startsWith('https://raw.githubusercontent.com/acme/agents/deadbeef/agents/remote.md')) {
        return textResponse(AGENT_MD);
      }
      throw new Error(`unexpected fetch: ${url}`);
    });

    const agents = await githubSource.load({ repo: 'acme/agents@deadbeef' });
    expect(agents).toHaveLength(1);
    expect(agents[0].sourceLabel).toBe('github:acme/agents@deadbeef');
  });

  it('excludes non-agent documentation files (README etc) from the tree, same rule as dir source', async () => {
    fetchMock.mockImplementation(async (url: string) => {
      if (url.includes('/git/trees/')) {
        return jsonResponse({
          tree: [
            { path: 'README.md', type: 'blob' },
            { path: 'CONTRIBUTING.md', type: 'blob' },
            { path: 'agents/remote.md', type: 'blob' },
            { path: 'not-markdown.txt', type: 'blob' },
            { path: 'a-directory', type: 'tree' },
          ],
          truncated: false,
        });
      }
      if (url.startsWith('https://raw.githubusercontent.com/')) {
        return textResponse(AGENT_MD);
      }
      throw new Error(`unexpected fetch: ${url}`);
    });

    const agents = await githubSource.load({ repo: 'acme/agents@main' });
    expect(agents).toHaveLength(1);
    expect(agents[0].name).toBe('remote-agent');
  });

  it('throws a clear error on 404 (repo/ref not found)', async () => {
    fetchMock.mockImplementation(async () => jsonResponse({ message: 'Not Found' }, { ok: false, status: 404 }));

    await expect(githubSource.load({ repo: 'acme/does-not-exist@main' })).rejects.toThrow(/404|not found/i);
  });

  it('throws a clear, distinct error on 403 (rate limit)', async () => {
    fetchMock.mockImplementation(async () =>
      jsonResponse({ message: 'API rate limit exceeded' }, { ok: false, status: 403 })
    );

    await expect(githubSource.load({ repo: 'acme/agents@main' })).rejects.toThrow(/rate.?limit|403/i);
  });

  it('sends an Authorization header when GITHUB_TOKEN is set', async () => {
    vi.stubEnv('GITHUB_TOKEN', 'tok_abc123');
    let sawAuthHeader = false;

    fetchMock.mockImplementation(async (url: string, init?: RequestInit) => {
      const headers = (init?.headers ?? {}) as Record<string, string>;
      if (headers.Authorization === 'Bearer tok_abc123' || headers.authorization === 'Bearer tok_abc123') {
        sawAuthHeader = true;
      }
      if (url.includes('/git/trees/')) {
        return jsonResponse({ tree: [{ path: 'agents/remote.md', type: 'blob' }], truncated: false });
      }
      return textResponse(AGENT_MD);
    });

    await githubSource.load({ repo: 'acme/agents@main' });
    expect(sawAuthHeader).toBe(true);
  });

  it('works without GITHUB_TOKEN set (no Authorization header required)', async () => {
    fetchMock.mockImplementation(async (url: string) => {
      if (url.includes('/git/trees/')) {
        return jsonResponse({ tree: [{ path: 'agents/remote.md', type: 'blob' }], truncated: false });
      }
      return textResponse(AGENT_MD);
    });

    const agents = await githubSource.load({ repo: 'acme/agents@main' });
    expect(agents).toHaveLength(1);
  });

  it('warns (but does not throw) when the tree response is truncated', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    fetchMock.mockImplementation(async (url: string) => {
      if (url.includes('/git/trees/')) {
        return jsonResponse({ tree: [{ path: 'agents/remote.md', type: 'blob' }], truncated: true });
      }
      return textResponse(AGENT_MD);
    });

    const agents = await githubSource.load({ repo: 'acme/agents@main' });
    expect(agents).toHaveLength(1);
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it('applies a subdir scope (owner/name@ref:subdir), excluding paths outside it', async () => {
    fetchMock.mockImplementation(async (url: string) => {
      if (url.includes('/git/trees/main')) {
        return jsonResponse({
          tree: [
            { path: 'agents/remote.md', type: 'blob' },
            { path: 'agents-extra/foo.md', type: 'blob' },
            { path: 'other/remote.md', type: 'blob' },
          ],
          truncated: false,
        });
      }
      if (url.startsWith('https://raw.githubusercontent.com/acme/agents/main/agents/remote.md')) {
        return textResponse(AGENT_MD);
      }
      throw new Error(`unexpected fetch: ${url}`);
    });

    const agents = await githubSource.load({ repo: 'acme/agents@main:agents' });
    expect(agents).toHaveLength(1);
    expect(agents[0].filePath).toBe('agents/remote.md');
    const fetchedUrls = fetchMock.mock.calls.map((c) => c[0] as string);
    expect(fetchedUrls.some((u) => u.includes('agents-extra'))).toBe(false);
  });

  it('resolves the default branch when subdir is given without an explicit ref (owner/name:subdir)', async () => {
    fetchMock.mockImplementation(async (url: string) => {
      if (url.includes('/repos/acme/agents') && !url.includes('/git/trees/')) {
        return jsonResponse({ default_branch: 'main' });
      }
      if (url.includes('/git/trees/main')) {
        return jsonResponse({ tree: [{ path: 'agents/remote.md', type: 'blob' }], truncated: false });
      }
      if (url.startsWith('https://raw.githubusercontent.com/acme/agents/main/agents/remote.md')) {
        return textResponse(AGENT_MD);
      }
      throw new Error(`unexpected fetch: ${url}`);
    });

    const agents = await githubSource.load({ repo: 'acme/agents:agents' });
    expect(agents).toHaveLength(1);
    expect(agents[0].sourceLabel).toBe('github:acme/agents@main:agents');
  });

  it('parses a ref containing a slash (branch name) alongside a subdir', async () => {
    fetchMock.mockImplementation(async (url: string) => {
      if (url.includes('/git/trees/feature/x')) {
        return jsonResponse({ tree: [{ path: 'agents/remote.md', type: 'blob' }], truncated: false });
      }
      if (url.startsWith('https://raw.githubusercontent.com/acme/agents/feature/x/agents/remote.md')) {
        return textResponse(AGENT_MD);
      }
      throw new Error(`unexpected fetch: ${url}`);
    });

    const agents = await githubSource.load({ repo: 'acme/agents@feature/x:agents' });
    expect(agents).toHaveLength(1);
    expect(agents[0].sourceLabel).toBe('github:acme/agents@feature/x:agents');
  });

  it('errors on a spec with a stray extra path segment (owner/extra/name)', async () => {
    await expect(githubSource.load({ repo: 'acme/extra/agents' })).rejects.toThrow(/invalid repo spec/i);
  });

  it('skips non-agent-shaped markdown (no name frontmatter), counts the skip, and logs one stderr summary line', async () => {
    const warnSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    fetchMock.mockImplementation(async (url: string) => {
      if (url.includes('/git/trees/')) {
        return jsonResponse({
          tree: [
            { path: 'agents/remote.md', type: 'blob' },
            { path: 'agents/notes.md', type: 'blob' },
          ],
          truncated: false,
        });
      }
      if (url.includes('/agents/remote.md')) {
        return textResponse(AGENT_MD);
      }
      if (url.includes('/agents/notes.md')) {
        return textResponse('# Notes\n\nJust some notes, no frontmatter.');
      }
      throw new Error(`unexpected fetch: ${url}`);
    });

    const agents = await githubSource.load({ repo: 'acme/agents@main' });
    expect(agents).toHaveLength(1);
    expect((agents as unknown as { skippedNonAgentFiles?: number }).skippedNonAgentFiles).toBe(1);
    const errors = warnSpy.mock.calls.map((c) => c[0] as string).join('\n');
    expect(errors).toMatch(/skipped 1 non-agent markdown file/i);
    expect(warnSpy).toHaveBeenCalledTimes(1);
    warnSpy.mockRestore();
  });

  it('includes the subdir in sourceLabel when one is used', async () => {
    fetchMock.mockImplementation(async (url: string) => {
      if (url.includes('/git/trees/')) {
        return jsonResponse({ tree: [{ path: 'agents/remote.md', type: 'blob' }], truncated: false });
      }
      return textResponse(AGENT_MD);
    });

    const agents = await githubSource.load({ repo: 'acme/agents@main:agents' });
    expect(agents[0].sourceLabel).toBe('github:acme/agents@main:agents');
  });
});

// Real-network smoke test — skipped unless explicitly opted in, to keep the unit
// suite hermetic and CI-safe by default (no flakiness from live GitHub API calls).
describe.skipIf(process.env.ROSTER_NET_TEST !== '1')('githubSource (real network, opt-in)', () => {
  it('loads agents from a real small public repo without tar extraction', async () => {
    // A tiny, stable public repo path is intentionally avoided here since we don't
    // control an external fixture repo; this test exists as a documented opt-in seam
    // for maintainers to point at a known-good repo via ROSTER_NET_TEST_REPO.
    const repo = process.env.ROSTER_NET_TEST_REPO;
    if (!repo) {
      throw new Error('ROSTER_NET_TEST=1 requires ROSTER_NET_TEST_REPO=owner/name[@ref] to be set');
    }
    const agents = await githubSource.load({ repo });
    expect(Array.isArray(agents)).toBe(true);
  });
});
