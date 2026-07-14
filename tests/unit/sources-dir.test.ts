import { describe, it, expect, vi } from 'vitest';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirSource } from '../../src/sources/dir.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const docsFixtureDir = path.join(__dirname, '../fixtures/roster-docs');
const agentShapedFixtureDir = path.join(__dirname, '../fixtures/agent-shaped-dir');

describe('dirSource — R0 doc exclusion regression', () => {
  it('excludes well-known non-agent documentation files by basename', async () => {
    const agents = await dirSource.load({ dir: docsFixtureDir });
    const names = agents.map((a) => a.name);

    expect(names).not.toContain('README');
    expect(names).not.toContain('CONTRIBUTING');
    expect(names).not.toContain('QUICKSTART');
  });

  it('still loads genuine agent markdown files in the same tree', async () => {
    const agents = await dirSource.load({ dir: docsFixtureDir });
    const names = agents.map((a) => a.name);

    expect(names).toContain('doc-fixture-agent');
    expect(agents).toHaveLength(1);
  });

  it('is case-insensitive on the excluded basenames', async () => {
    // README.md above is upper-case; this test just re-asserts the case-insensitive
    // matching intent so a future rename (e.g. Readme.md) doesn't silently regress.
    const agents = await dirSource.load({ dir: docsFixtureDir });
    expect(agents.every((a) => a.name.toLowerCase() !== 'readme')).toBe(true);
  });
});

describe('dirSource — agent-shaped filter', () => {
  it('loads only the real agent, skipping non-agent-shaped markdown and excluded basenames, and counts the skips', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const agents = await dirSource.load({ dir: agentShapedFixtureDir });

    expect(agents).toHaveLength(1);
    expect(agents[0].name).toBe('agent-shaped-dir-agent');
    expect((agents as unknown as { skippedNonAgentFiles?: number }).skippedNonAgentFiles).toBe(2);

    const errors = errorSpy.mock.calls.map((c) => c[0] as string).join('\n');
    expect(errors).toMatch(/skipped 2 non-agent markdown file/i);
    errorSpy.mockRestore();
  });
});
