import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseAgentMarkdown } from '../../src/parse/agent-md.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixturesDir = path.join(__dirname, '../fixtures/parse');

function load(name: string): string {
  return readFileSync(path.join(fixturesDir, name), 'utf8');
}

describe('parseAgentMarkdown', () => {
  it('parses normal frontmatter', () => {
    const filePath = path.join(fixturesDir, 'normal.md');
    const agent = parseAgentMarkdown(load('normal.md'), filePath, 'test');
    expect(agent.name).toBe('normal-agent');
    expect(agent.description).toBe('A normal agent with full frontmatter.');
    expect(agent.tools).toEqual(['Read', 'Grep', 'Bash']);
    expect(agent.model).toBe('sonnet');
    expect(agent.body).toContain('This is the body');
    expect(agent.sourceLabel).toBe('test');
    expect(agent.filePath).toBe(filePath);
  });

  it('parses tools given as a bracketed array', () => {
    const filePath = path.join(fixturesDir, 'tools-array.md');
    const agent = parseAgentMarkdown(load('tools-array.md'), filePath, 'test');
    expect(agent.tools).toEqual(['Read', 'Write', 'Bash']);
  });

  it('falls back to the file name when frontmatter is missing entirely', () => {
    const filePath = path.join(fixturesDir, 'no-frontmatter.md');
    const agent = parseAgentMarkdown(load('no-frontmatter.md'), filePath, 'test');
    expect(agent.name).toBe('no-frontmatter');
    expect(agent.description).toBe('');
    expect(agent.body).toContain('Just a plain markdown body');
  });

  it('tolerates frontmatter missing the name and tools fields', () => {
    const filePath = path.join(fixturesDir, 'weird.md');
    const agent = parseAgentMarkdown(load('weird.md'), filePath, 'test');
    expect(agent.name).toBe('weird');
    expect(agent.description).toContain('Frontmatter present');
    expect(agent.tools).toBeUndefined();
  });
});
