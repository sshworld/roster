import path from 'node:path';
import type { AgentDef } from '../core/types.js';

interface Frontmatter {
  name?: string;
  description?: string;
  tools?: string;
  model?: string;
}

const KNOWN_KEYS = new Set(['name', 'description', 'tools', 'model']);
function isKnownKey(key: string): key is keyof Frontmatter {
  return KNOWN_KEYS.has(key);
}

// Matches a bare block scalar indicator: `>` `|` `>-` `|-` `>+` `|+`.
// Indentation indicators (e.g. `>2`) and same-line trailing text (e.g. `> text`)
// are intentionally NOT matched here — those fall back to the single-line value
// path below, matching plain-string behavior.
const BLOCK_SCALAR_INDICATOR = /^([>|])([+-])?$/;

/**
 * Renders a hand-rolled subset of YAML block scalars (folded `>` / literal `|`,
 * with `-`/`+` chomping). This intentionally does NOT support YAML's
 * "more-indented lines are preserved verbatim" folding rule — extra-indented
 * lines inside a folded (`>`) block are still space-joined like any other
 * non-blank line. That gap is covered by a dedicated test.
 */
function renderBlockScalar(rawLines: string[], style: '>' | '|', chomp: '-' | '+' | undefined): string {
  const firstContentIndex = rawLines.findIndex((line) => line.trim().length > 0);
  if (firstContentIndex === -1) {
    return '';
  }

  const indentMatch = /^[ \t]*/.exec(rawLines[firstContentIndex]);
  const baseIndent = indentMatch ? indentMatch[0] : '';

  const stripped = rawLines.map((line) => {
    if (line.trim().length === 0) return '';
    return line.startsWith(baseIndent) ? line.slice(baseIndent.length) : line.replace(/^[ \t]+/, '');
  });

  let trailingBlankCount = 0;
  let end = stripped.length;
  while (end > 0 && stripped[end - 1] === '') {
    end--;
    trailingBlankCount++;
  }
  const contentLines = stripped.slice(0, end);
  if (contentLines.length === 0) {
    return '';
  }

  let body: string;
  if (style === '|') {
    body = contentLines.join('\n');
  } else {
    const paragraphs: string[] = [];
    let current: string[] = [];
    for (const line of contentLines) {
      if (line === '') {
        paragraphs.push(current.join(' '));
        current = [];
      } else {
        current.push(line);
      }
    }
    paragraphs.push(current.join(' '));
    body = paragraphs.join('\n');
  }

  if (chomp === '-') return body;
  if (chomp === '+') return body + '\n'.repeat(trailingBlankCount + 1);
  return body + '\n';
}

function splitFrontmatter(raw: string): { frontmatter: Frontmatter; body: string } {
  const normalized = raw.replace(/^﻿/, '').replace(/\r\n/g, '\n');
  if (!normalized.startsWith('---\n') && normalized !== '---') {
    return { frontmatter: {}, body: normalized };
  }

  const closingIndex = normalized.indexOf('\n---', 4);
  if (closingIndex === -1) {
    return { frontmatter: {}, body: normalized };
  }

  const rawFrontmatter = normalized.slice(4, closingIndex);
  const afterClose = normalized.slice(closingIndex + 4);
  const body = afterClose.startsWith('\n') ? afterClose.slice(1) : afterClose;

  const frontmatter: Frontmatter = {};
  const lines = rawFrontmatter.split('\n');

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    // Key lines have no leading whitespace. Blank lines and indented
    // continuation lines outside of a recognized block scalar are ignored
    // (they're never mistaken for a new key).
    if (line.length === 0 || /^[ \t]/.test(line)) {
      i++;
      continue;
    }

    const sepIndex = line.indexOf(':');
    if (sepIndex === -1) {
      i++;
      continue;
    }

    const key = line.slice(0, sepIndex).trim();
    const rawValue = line.slice(sepIndex + 1).trim();
    i++;

    const blockMatch = BLOCK_SCALAR_INDICATOR.exec(rawValue);
    if (blockMatch) {
      const style = blockMatch[1] as '>' | '|';
      const chomp = blockMatch[2] as '-' | '+' | undefined;

      const blockLines: string[] = [];
      while (i < lines.length) {
        const candidate = lines[i];
        if (candidate.length === 0 || /^[ \t]/.test(candidate)) {
          blockLines.push(candidate);
          i++;
        } else {
          break;
        }
      }

      if (isKnownKey(key)) {
        frontmatter[key] = renderBlockScalar(blockLines, style, chomp);
      }
      continue;
    }

    if (isKnownKey(key)) {
      frontmatter[key] = rawValue;
    }
  }

  return { frontmatter, body };
}

function parseTools(raw: string | undefined): string[] | undefined {
  if (raw === undefined || raw === '') return undefined;
  let value = raw.trim();
  if (value.startsWith('[') && value.endsWith(']')) {
    value = value.slice(1, -1);
  }
  const tools = value
    .split(',')
    .map((t) => t.trim().replace(/^['"]|['"]$/g, ''))
    .filter(Boolean);
  return tools.length > 0 ? tools : undefined;
}

function fallbackName(filePath: string): string {
  return path.basename(filePath, path.extname(filePath));
}

const EXCLUDED_AGENT_SHAPED_BASENAMES = new Set(['skill.md', 'claude.md', 'agents.md']);

/**
 * A stricter predicate than parseAgentMarkdown's filename-fallback parsing:
 * true only for files that declare themselves as an agent via an explicit,
 * non-empty `name` frontmatter key, excluding basenames that are agent-shaped
 * by convention but are not themselves agent definitions (skills, project docs).
 */
export function isAgentShaped(raw: string, filePath: string): boolean {
  const { frontmatter } = splitFrontmatter(raw);
  const name = frontmatter.name?.replace(/^['"]|['"]$/g, '').trim();
  if (!name) return false;
  const basename = path.basename(filePath).toLowerCase();
  return !EXCLUDED_AGENT_SHAPED_BASENAMES.has(basename);
}

export function parseAgentMarkdown(raw: string, filePath: string, sourceLabel: string): AgentDef {
  const { frontmatter, body } = splitFrontmatter(raw);

  return {
    name: frontmatter.name?.trim() || fallbackName(filePath),
    description: frontmatter.description?.trim() ?? '',
    tools: parseTools(frontmatter.tools),
    model: frontmatter.model?.trim() || undefined,
    body: body.trim(),
    sourceLabel,
    filePath,
  };
}

/**
 * Parses a SKILL.md file into an AgentDef with kind: 'skill', reusing
 * parseAgentMarkdown for the actual field extraction. Unlike agent parsing,
 * a missing `name` frontmatter key is not backfilled from the filename —
 * SKILL.md with no declared name is skipped entirely (returns undefined).
 */
export function parseSkillMarkdown(raw: string, filePath: string, sourceLabel: string): AgentDef | undefined {
  const { frontmatter } = splitFrontmatter(raw);
  if (!frontmatter.name?.trim()) return undefined;

  return { ...parseAgentMarkdown(raw, filePath, sourceLabel), kind: 'skill' };
}
