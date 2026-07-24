import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseSkillMarkdown } from '../../src/parse/agent-md.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixturesDir = path.join(__dirname, '../fixtures/parse');

function load(name: string): string {
  return readFileSync(path.join(fixturesDir, name), 'utf8');
}

describe('parseSkillMarkdown', () => {
  it('parses name/description from SKILL.md frontmatter and tags kind: skill', () => {
    const filePath = path.join(fixturesDir, 'skill-with-name.md');
    const skill = parseSkillMarkdown(load('skill-with-name.md'), filePath, 'test');
    expect(skill?.name).toBe('my-skill');
    expect(skill?.description).toBe('A skill with a proper name and description.');
    expect(skill?.kind).toBe('skill');
    expect(skill?.sourceLabel).toBe('test');
    expect(skill?.filePath).toBe(filePath);
  });

  it('returns undefined when frontmatter has no name key', () => {
    const filePath = path.join(fixturesDir, 'skill-no-name.md');
    const skill = parseSkillMarkdown(load('skill-no-name.md'), filePath, 'test');
    expect(skill).toBeUndefined();
  });
});
