import { describe, it, expect, vi, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { run } from '../../src/warn.js';

// Two disjoint-vocabulary "clusters" so cosine similarity is exactly 1.0
// (identical text) or exactly 0.0 (no shared terms) — this makes every
// assertion below float-exact instead of depending on hand-computed TF-IDF.
const TEXT_1_DESC = 'creates detailed roadmaps timelines milestones dependencies deliverables schedules';
const TEXT_1_BODY = 'breaks projects into phases tracks owners deadlines coordinates engineering teams delivery velocity metrics';
const TEXT_2_DESC = 'bakes sourdough bread using wild yeast starter culture';
const TEXT_2_BODY = 'kneads dough proofs overnight bulk fermentation shapes loaves scores crust oven steam';

const SKILL_1_DESC = 'reviews pull requests code quality style violations lint checks';
const SKILL_2_DESC = 'bakes sourdough bread wild yeast starter culture kneads dough';
const SHARED_BOILERPLATE =
  'this skill was generated from a template and includes standard setup instructions common to every skill in this roster';

function agentMd(name: string, description: string, body: string): string {
  return `---\nname: ${name}\ndescription: ${description}\n---\n\n${body}\n`;
}

async function writeAgent(dir: string, filename: string, name: string, description: string, body: string) {
  await writeFile(path.join(dir, filename), agentMd(name, description, body), 'utf8');
}

describe('warn', () => {
  let home: string;
  let emptyCwd: string;
  let projectDir: string;

  beforeAll(async () => {
    home = await mkdtemp(path.join(tmpdir(), 'roster-warn-home-'));
    emptyCwd = await mkdtemp(path.join(tmpdir(), 'roster-warn-cwd-'));
    projectDir = await mkdtemp(path.join(tmpdir(), 'roster-warn-project-'));

    const agentsDir = path.join(home, '.claude', 'agents');
    await mkdir(agentsDir, { recursive: true });
    await writeAgent(agentsDir, 'planner-a.md', 'planner-a', TEXT_1_DESC, TEXT_1_BODY);
    await writeAgent(agentsDir, 'planner-b.md', 'planner-b', TEXT_1_DESC, TEXT_1_BODY);
    await writeAgent(agentsDir, 'unrelated.md', 'unrelated', TEXT_2_DESC, TEXT_2_BODY);
    await writeAgent(agentsDir, 'short-a.md', 'short-a', 'fix bugs', '');
    await writeAgent(agentsDir, 'short-b.md', 'short-b', 'fix bugs', '');

    const skill1Dir = path.join(home, '.claude', 'skills', 'skill1');
    const skill2Dir = path.join(home, '.claude', 'skills', 'skill2');
    await mkdir(skill1Dir, { recursive: true });
    await mkdir(skill2Dir, { recursive: true });
    await writeAgent(skill1Dir, 'SKILL.md', 'reviewer-checks', SKILL_1_DESC, SHARED_BOILERPLATE);
    await writeAgent(skill2Dir, 'SKILL.md', 'bread-baker', SKILL_2_DESC, SHARED_BOILERPLATE);

    const pluginAgentsDir = path.join(home, '.claude', 'plugins', 'cache', 'marketplace-a', 'demo', '1.0.0', 'agents');
    await mkdir(pluginAgentsDir, { recursive: true });
    await writeAgent(pluginAgentsDir, 'planner-a.md', 'planner-a', TEXT_1_DESC, TEXT_1_BODY);

    await mkdir(path.join(home, '.claude', 'plugins'), { recursive: true });
    await writeFile(
      path.join(home, '.claude', 'plugins', 'installed_plugins.json'),
      JSON.stringify({
        version: 2,
        plugins: {
          'demo@marketplace-a': [
            {
              scope: 'user',
              installPath: path.join(home, '.claude', 'plugins', 'cache', 'marketplace-a', 'demo', '1.0.0'),
              version: '1.0.0',
            },
          ],
        },
      }),
      'utf8'
    );

    const projectAgentsDir = path.join(projectDir, '.claude', 'agents');
    await mkdir(projectAgentsDir, { recursive: true });
    await writeAgent(projectAgentsDir, 'project-only.md', 'project-only', TEXT_1_DESC, TEXT_1_BODY);
  });

  afterAll(async () => {
    await rm(home, { recursive: true, force: true });
    await rm(emptyCwd, { recursive: true, force: true });
    await rm(projectDir, { recursive: true, force: true });
  });

  let logSpy: ReturnType<typeof vi.spyOn>;
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    logSpy.mockRestore();
    errorSpy.mockRestore();
  });

  describe('mode A — --name', () => {
    it('is silent and exits 0 for an unmatched name (e.g. a builtin subagent)', async () => {
      const code = await run(['--name', 'no-such-agent-xyz', '--json'], { home, cwd: emptyCwd });
      expect(code).toBe(0);
      expect(logSpy).not.toHaveBeenCalled();
    });

    it('reports overlapping siblings for a matched agent', async () => {
      const code = await run(['--name', 'planner-a', '--json'], { home, cwd: emptyCwd });
      expect(code).toBe(0);
      expect(logSpy).toHaveBeenCalledTimes(1);
      const output = JSON.parse(logSpy.mock.calls[0][0] as string);
      expect(output.target.name).toBe('planner-a');
      const siblingNames = output.siblings.map((s: { name: string }) => s.name);
      expect(siblingNames).toContain('planner-b');
    });

    it('resolves a bare name to the user/project-scope agent over a same-named plugin agent', async () => {
      const code = await run(['--name', 'planner-a', '--json'], { home, cwd: emptyCwd });
      expect(code).toBe(0);
      const output = JSON.parse(logSpy.mock.calls[0][0] as string);
      expect(output.target.sourceLabel).toBe('user');
    });

    it('resolves a plugin:name namespaced name to the plugin-scoped agent', async () => {
      const code = await run(['--name', 'demo:planner-a', '--json'], { home, cwd: emptyCwd });
      expect(code).toBe(0);
      const output = JSON.parse(logSpy.mock.calls[0][0] as string);
      expect(output.target.sourceLabel).toBe('plugin:demo@1.0.0');
    });

    it('excludes documents under the min-token guard from comparison, even when textually identical', async () => {
      const code = await run(['--name', 'short-a', '--json'], { home, cwd: emptyCwd });
      expect(code).toBe(0);
      expect(logSpy).not.toHaveBeenCalled();
    });

    it('vectorizes skills using name+description only, ignoring boilerplate body', async () => {
      const code = await run(['--name', 'reviewer-checks', '--kind', 'skill', '--json'], { home, cwd: emptyCwd });
      expect(code).toBe(0);
      expect(logSpy).not.toHaveBeenCalled();
    });

    it('applies the --above threshold inclusively (score >= above)', async () => {
      const includeCode = await run(['--name', 'planner-a', '--above', '0', '--json'], { home, cwd: emptyCwd });
      expect(includeCode).toBe(0);
      const included = JSON.parse(logSpy.mock.calls[0][0] as string);
      expect(included.siblings.map((s: { name: string }) => s.name)).toContain('unrelated');

      logSpy.mockClear();

      const excludeCode = await run(['--name', 'planner-a', '--above', '0.001', '--json'], { home, cwd: emptyCwd });
      expect(excludeCode).toBe(0);
      if (logSpy.mock.calls.length > 0) {
        const excluded = JSON.parse(logSpy.mock.calls[0][0] as string);
        expect(excluded.siblings.map((s: { name: string }) => s.name)).not.toContain('unrelated');
      }
    });

    it('includes project-scope agents (cwd .claude/agents) in the corpus', async () => {
      const code = await run(['--name', 'project-only', '--json'], { home, cwd: projectDir });
      expect(code).toBe(0);
      expect(logSpy).toHaveBeenCalledTimes(1);
      const output = JSON.parse(logSpy.mock.calls[0][0] as string);
      expect(output.target.sourceLabel.startsWith('dir:')).toBe(true);
      expect(output.siblings.map((s: { name: string }) => s.name)).toEqual(
        expect.arrayContaining(['planner-a', 'planner-b'])
      );
    });
  });

  describe('mode B — --hook', () => {
    let cacheDir: string;

    beforeEach(async () => {
      cacheDir = await mkdtemp(path.join(tmpdir(), 'roster-warn-cache-'));
    });

    afterEach(async () => {
      await rm(cacheDir, { recursive: true, force: true });
    });

    it('emits a single advisory JSON line on stdout when an overlap is found', async () => {
      const stdin = JSON.stringify({
        tool_name: 'Task',
        tool_input: { subagent_type: 'planner-a' },
        session_id: 'sess-1',
      });
      const code = await run(['--hook'], { home, cwd: emptyCwd, cacheDir, stdin });
      expect(code).toBe(0);
      expect(logSpy).toHaveBeenCalledTimes(1);

      const output = JSON.parse(logSpy.mock.calls[0][0] as string);
      expect(typeof output.systemMessage).toBe('string');
      expect(output.systemMessage).toContain('[roster]');
      expect(output.hookSpecificOutput.hookEventName).toBe('PostToolUse');
      expect(output.hookSpecificOutput.additionalContext).toContain('planner-a');
      expect(output.hookSpecificOutput.additionalContext).toContain('Relay this advisory to the user in one short line.');
    });

    it('dedups within the same session: second call for the same name is silent', async () => {
      const stdin = JSON.stringify({
        tool_name: 'Task',
        tool_input: { subagent_type: 'planner-a' },
        session_id: 'sess-2',
      });
      const first = await run(['--hook'], { home, cwd: emptyCwd, cacheDir, stdin });
      expect(first).toBe(0);
      expect(logSpy).toHaveBeenCalledTimes(1);

      logSpy.mockClear();

      const second = await run(['--hook'], { home, cwd: emptyCwd, cacheDir, stdin });
      expect(second).toBe(0);
      expect(logSpy).not.toHaveBeenCalled();
    });

    it('is silent when the invoked name has no overlapping siblings', async () => {
      const stdin = JSON.stringify({
        tool_name: 'Task',
        tool_input: { subagent_type: 'unrelated' },
        session_id: 'sess-3',
      });
      const code = await run(['--hook'], { home, cwd: emptyCwd, cacheDir, stdin });
      expect(code).toBe(0);
      expect(logSpy).not.toHaveBeenCalled();
    });

    it('is silent when the invoked name does not match anything in the roster', async () => {
      const stdin = JSON.stringify({
        tool_name: 'Task',
        tool_input: { subagent_type: 'no-such-builtin-subagent' },
        session_id: 'sess-4',
      });
      const code = await run(['--hook'], { home, cwd: emptyCwd, cacheDir, stdin });
      expect(code).toBe(0);
      expect(logSpy).not.toHaveBeenCalled();
    });

    it('never throws and always exits 0 on malformed stdin JSON', async () => {
      const code = await run(['--hook'], { home, cwd: emptyCwd, cacheDir, stdin: 'not valid json {{{' });
      expect(code).toBe(0);
      expect(logSpy).not.toHaveBeenCalled();
    });

    it('never throws and always exits 0 when session_id is missing', async () => {
      const stdin = JSON.stringify({ tool_name: 'Task', tool_input: { subagent_type: 'planner-a' } });
      const code = await run(['--hook'], { home, cwd: emptyCwd, cacheDir, stdin });
      expect(code).toBe(0);
      expect(logSpy).not.toHaveBeenCalled();
    });

    it('never throws and always exits 0 even if the cache dir cannot be created', async () => {
      const brokenCacheBase = path.join(cacheDir, 'not-a-dir');
      await writeFile(brokenCacheBase, 'i am a file, not a directory', 'utf8');
      const stdin = JSON.stringify({
        tool_name: 'Task',
        tool_input: { subagent_type: 'planner-a' },
        session_id: 'sess-5',
      });
      const code = await run(['--hook'], { home, cwd: emptyCwd, cacheDir: path.join(brokenCacheBase, 'nested'), stdin });
      expect(code).toBe(0);
    });

    it('reads Skill tool invocations via tool_input.skill with kind skill', async () => {
      const stdin = JSON.stringify({
        tool_name: 'Skill',
        tool_input: { skill: 'reviewer-checks' },
        session_id: 'sess-6',
      });
      const code = await run(['--hook'], { home, cwd: emptyCwd, cacheDir, stdin });
      expect(code).toBe(0);
      expect(logSpy).not.toHaveBeenCalled();
    });

    it('keeps stdout pure JSON — every console.log call parses as JSON', async () => {
      const stdin = JSON.stringify({
        tool_name: 'Task',
        tool_input: { subagent_type: 'planner-a' },
        session_id: 'sess-7',
      });
      await run(['--hook'], { home, cwd: emptyCwd, cacheDir, stdin });
      for (const call of logSpy.mock.calls) {
        expect(() => JSON.parse(call[0] as string)).not.toThrow();
      }
    });
  });
});
