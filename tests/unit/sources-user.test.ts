import { describe, it, expect, vi, afterEach } from 'vitest';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { userSource } from '../../src/sources/user.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fakeHome = path.join(__dirname, '../fixtures/user-home');
const emptyHome = path.join(__dirname, '../fixtures/user-home-empty');

describe('userSource', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('recursively loads agents from <home>/.claude/agents via opts.home override', async () => {
    const agents = await userSource.load({ home: fakeHome });
    const names = agents.map((a) => a.name).sort();
    expect(names).toEqual(['planner', 'reviewer']);
  });

  it('tags every loaded agent with sourceLabel "user"', async () => {
    const agents = await userSource.load({ home: fakeHome });
    expect(agents.every((a) => a.sourceLabel === 'user')).toBe(true);
  });

  it('falls back to process.env.HOME when opts.home is not provided', async () => {
    vi.stubEnv('HOME', fakeHome);
    const agents = await userSource.load();
    const names = agents.map((a) => a.name).sort();
    expect(names).toEqual(['planner', 'reviewer']);
  });

  it('returns an empty array (not an error) when ~/.claude/agents does not exist', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const agents = await userSource.load({ home: emptyHome });
    expect(agents).toEqual([]);
    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });
});
