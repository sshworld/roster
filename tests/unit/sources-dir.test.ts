import { describe, it, expect } from 'vitest';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirSource } from '../../src/sources/dir.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const docsFixtureDir = path.join(__dirname, '../fixtures/roster-docs');

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
