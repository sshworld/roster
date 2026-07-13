import { describe, it, expect, beforeAll } from 'vitest';
import { execFileSync, execSync } from 'node:child_process';
import { existsSync, mkdtempSync, symlinkSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, '../..');
const distCli = path.join(repoRoot, 'dist/cli.js');

describe('npm bin symlink invocation', () => {
  beforeAll(() => {
    if (!existsSync(distCli)) {
      execSync('npm run build', { cwd: repoRoot });
    }
  });

  it('runs main() when invoked through a symlink (npm bin style)', () => {
    const tmpDir = mkdtempSync(path.join(os.tmpdir(), 'roster-bin-'));
    const link = path.join(tmpDir, 'roster');
    symlinkSync(path.resolve(distCli), link);
    try {
      const out = execFileSync('node', [link, '--help']).toString();
      expect(out).toContain('Usage: roster');
    } finally {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});
