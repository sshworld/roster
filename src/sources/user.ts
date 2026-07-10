import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import type { AgentDef, RosterSource } from '../core/types.js';
import { parseAgentMarkdown } from '../parse/agent-md.js';
import { isExcludedDocFile } from './dir.js';

async function collectMarkdownFiles(root: string): Promise<string[]> {
  const entries = await readdir(root, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(root, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectMarkdownFiles(fullPath)));
    } else if (entry.isFile() && entry.name.endsWith('.md') && !isExcludedDocFile(fullPath)) {
      files.push(fullPath);
    }
  }

  return files;
}

async function exists(dir: string): Promise<boolean> {
  try {
    const s = await stat(dir);
    return s.isDirectory();
  } catch {
    return false;
  }
}

export const userSource: RosterSource = {
  id: 'user',
  description: 'Loads agents from the user-level Claude Code agent directory (~/.claude/agents).',
  async load(opts): Promise<AgentDef[]> {
    const home = (opts?.home as string | undefined) ?? process.env.HOME;
    if (!home) {
      console.error('sources/user: HOME is not set, no opts.home override provided — returning empty roster');
      return [];
    }

    const agentsDir = path.join(home, '.claude', 'agents');
    if (!(await exists(agentsDir))) {
      console.error(`sources/user: ${agentsDir} does not exist — returning empty roster`);
      return [];
    }

    const files = await collectMarkdownFiles(agentsDir);
    const agents = await Promise.all(
      files.map(async (filePath) => {
        const raw = await readFile(filePath, 'utf8');
        return parseAgentMarkdown(raw, filePath, 'user');
      })
    );

    return agents;
  },
};
