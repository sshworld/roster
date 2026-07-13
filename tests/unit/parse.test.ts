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

  it('parses a folded (>) block scalar description followed by another key', () => {
    const filePath = path.join(fixturesDir, 'block-folded.md');
    const agent = parseAgentMarkdown(load('block-folded.md'), filePath, 'test');
    expect(agent.description).toBe('This is a multi-line description written caveman style.');
    expect(agent.description).not.toContain('>');
    expect(agent.model).toBe('sonnet');
  });

  it('parses a literal (|) block scalar description preserving newlines', () => {
    const filePath = path.join(fixturesDir, 'block-literal.md');
    const agent = parseAgentMarkdown(load('block-literal.md'), filePath, 'test');
    expect(agent.description).toBe('Line one.\nLine two.');
    expect(agent.model).toBe('sonnet');
  });

  it('parses >- and |- chomping variants', () => {
    const filePath = path.join(fixturesDir, 'block-chomping.md');
    const agent = parseAgentMarkdown(load('block-chomping.md'), filePath, 'test');
    expect(agent.description).toBe('folded strip chomp test');
    expect(agent.model).toBe('literal\nstrip');
  });

  it('parses a block scalar that is the last key in frontmatter', () => {
    const filePath = path.join(fixturesDir, 'block-last-key.md');
    const agent = parseAgentMarkdown(load('block-last-key.md'), filePath, 'test');
    expect(agent.name).toBe('last-key-agent');
    expect(agent.model).toBe('sonnet');
    expect(agent.description).toBe('This description is the last key in frontmatter.');
  });

  it('normalizes CRLF line endings in block scalars', () => {
    const raw =
      '---\r\nname: crlf-agent\r\ndescription: >\r\n  line one\r\n  line two\r\nmodel: sonnet\r\n---\r\nbody\r\n';
    const agent = parseAgentMarkdown(raw, 'crlf.md', 'test');
    expect(agent.description).toBe('line one line two');
    expect(agent.model).toBe('sonnet');
  });

  it('falls back to a literal single-line value for same-line block scalar text', () => {
    const filePath = path.join(fixturesDir, 'block-fallback-inline.md');
    const agent = parseAgentMarkdown(load('block-fallback-inline.md'), filePath, 'test');
    expect(agent.description).toBe('> text');
  });

  it('falls back to a literal single-line value for an indentation-indicator block scalar', () => {
    const filePath = path.join(fixturesDir, 'block-fallback-indent.md');
    const agent = parseAgentMarkdown(load('block-fallback-indent.md'), filePath, 'test');
    expect(agent.description).toBe('>2');
  });
});
