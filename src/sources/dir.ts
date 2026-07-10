import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import type { AgentDef, RosterSource } from '../core/types.js';
import { parseAgentMarkdown } from '../parse/agent-md.js';

async function collectMarkdownFiles(root: string): Promise<string[]> {
  const entries = await readdir(root, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(root, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectMarkdownFiles(fullPath)));
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      files.push(fullPath);
    }
  }

  return files;
}

export const dirSource: RosterSource = {
  id: 'dir',
  description: 'Recursively scans a local directory for agent markdown files.',
  async load(opts): Promise<AgentDef[]> {
    const dir = opts?.dir as string | undefined;
    if (!dir) {
      throw new Error('sources/dir: opts.dir is required');
    }

    const files = await collectMarkdownFiles(dir);
    const agents = await Promise.all(
      files.map(async (filePath) => {
        const raw = await readFile(filePath, 'utf8');
        return parseAgentMarkdown(raw, filePath, `dir:${dir}`);
      })
    );

    return agents;
  },
};
