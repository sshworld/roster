import path from 'node:path';
import type { AgentDef } from '../core/types.js';

interface Frontmatter {
  name?: string;
  description?: string;
  tools?: string;
  model?: string;
}

function splitFrontmatter(raw: string): { frontmatter: Frontmatter; body: string } {
  const normalized = raw.replace(/\r\n/g, '\n');
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
  for (const line of rawFrontmatter.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const sepIndex = trimmed.indexOf(':');
    if (sepIndex === -1) continue;
    const key = trimmed.slice(0, sepIndex).trim();
    const value = trimmed.slice(sepIndex + 1).trim();
    if (key === 'name' || key === 'description' || key === 'tools' || key === 'model') {
      frontmatter[key] = value;
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
