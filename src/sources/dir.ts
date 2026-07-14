import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import type { AgentDef, RosterSource } from '../core/types.js';
import { isAgentShaped, parseAgentMarkdown } from '../parse/agent-md.js';

// R0: well-known non-agent documentation basenames (extension stripped, case-insensitive).
// Recursive scans previously misdetected these as "agents" and produced spurious overlap
// findings between unrelated projects' README/CONTRIBUTING/etc files.
const EXCLUDED_DOC_BASENAMES = new Set([
  'readme',
  'contributing',
  'license',
  'security',
  'changelog',
  'quickstart',
  'install',
  'code_of_conduct',
]);

export function isExcludedDocFile(filePath: string): boolean {
  const base = path.basename(filePath, path.extname(filePath)).toLowerCase();
  return EXCLUDED_DOC_BASENAMES.has(base);
}

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

export const dirSource: RosterSource = {
  id: 'dir',
  description: 'Recursively scans a local directory for agent markdown files.',
  async load(opts): Promise<AgentDef[]> {
    const dir = opts?.dir as string | undefined;
    if (!dir) {
      throw new Error('sources/dir: opts.dir is required');
    }

    let files: string[];
    try {
      files = await collectMarkdownFiles(dir);
    } catch (err) {
      const code = (err as NodeJS.ErrnoException).code;
      if (code === 'ENOENT' || code === 'ENOTDIR') {
        throw new Error(`sources/dir: "${dir}" is not a readable directory`);
      }
      throw err;
    }
    const sourceLabel = `dir:${dir}`;
    const read = await Promise.all(
      files.map(async (filePath) => ({ raw: await readFile(filePath, 'utf8'), filePath }))
    );

    let skippedNonAgentFiles = 0;
    const agents: AgentDef[] & { skippedNonAgentFiles?: number } = [];
    for (const { raw, filePath } of read) {
      if (!isAgentShaped(raw, filePath)) {
        skippedNonAgentFiles++;
        continue;
      }
      agents.push(parseAgentMarkdown(raw, filePath, sourceLabel));
    }

    if (skippedNonAgentFiles > 0) {
      console.error(
        `roster: skipped ${skippedNonAgentFiles} non-agent markdown file(s) (no name frontmatter or excluded basename)`
      );
    }
    agents.skippedNonAgentFiles = skippedNonAgentFiles;

    return agents;
  },
};
