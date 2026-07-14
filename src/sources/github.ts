import type { AgentDef, RosterSource } from '../core/types.js';
import { isAgentShaped, parseAgentMarkdown } from '../parse/agent-md.js';
import { isExcludedDocFile } from './dir.js';

// R3 — no tar extraction. We use the Git Trees API (recursive listing of paths only)
// plus raw.githubusercontent.com fetches for the handful of matching .md blobs. This
// avoids downloading/extracting a full repo tarball just to find agent markdown files.

const REPO_SPEC_RE = /^([^/]+)\/([^/@:]+)(?:@([^:]+))?(?::(.+))?$/;

interface ParsedRepo {
  owner: string;
  name: string;
  ref?: string;
  subdir?: string;
}

interface TreeEntry {
  path: string;
  type: string;
}

interface TreeResponse {
  tree: TreeEntry[];
  truncated?: boolean;
}

function parseRepoSpec(repo: string): ParsedRepo {
  const match = REPO_SPEC_RE.exec(repo);
  if (!match) {
    throw new Error(`sources/github: invalid repo spec "${repo}", expected owner/name[@ref][:subdir]`);
  }

  const [, owner, name, ref, rawSubdir] = match;
  const subdir = rawSubdir?.replace(/^\/+|\/+$/g, '') || undefined;

  return { owner, name, ref, subdir };
}

function authHeaders(): Record<string, string> {
  const token = process.env.GITHUB_TOKEN;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function githubJsonFetch(url: string): Promise<unknown> {
  const res = await fetch(url, { headers: { Accept: 'application/vnd.github+json', ...authHeaders() } });
  if (!res.ok) {
    if (res.status === 404) {
      throw new Error(`sources/github: 404 not found — ${url}`);
    }
    if (res.status === 403) {
      throw new Error(`sources/github: 403 rate-limit (or forbidden) — ${url}. Set GITHUB_TOKEN to raise limits.`);
    }
    throw new Error(`sources/github: request failed (${res.status}) — ${url}`);
  }
  return res.json();
}

async function resolveDefaultBranch(owner: string, name: string): Promise<string> {
  const data = (await githubJsonFetch(`https://api.github.com/repos/${owner}/${name}`)) as {
    default_branch?: string;
  };
  if (!data.default_branch) {
    throw new Error(`sources/github: could not resolve default branch for ${owner}/${name}`);
  }
  return data.default_branch;
}

function isCandidateMarkdownBlob(entry: TreeEntry, subdir: string | undefined): boolean {
  if (entry.type !== 'blob' || !entry.path.endsWith('.md') || isExcludedDocFile(entry.path)) return false;
  if (subdir === undefined) return true;
  return entry.path === subdir || entry.path.startsWith(`${subdir}/`);
}

export const githubSource: RosterSource = {
  id: 'github',
  description: 'Loads agents from a GitHub repository (owner/name[@ref][:subdir]).',
  async load(opts): Promise<AgentDef[]> {
    const repoSpec = opts?.repo as string | undefined;
    if (!repoSpec) {
      throw new Error('sources/github: opts.repo is required (owner/name[@ref][:subdir])');
    }

    const { owner, name, ref: pinnedRef, subdir } = parseRepoSpec(repoSpec);
    const ref = pinnedRef ?? (await resolveDefaultBranch(owner, name));

    const treeUrl = `https://api.github.com/repos/${owner}/${name}/git/trees/${ref}?recursive=1`;
    const tree = (await githubJsonFetch(treeUrl)) as TreeResponse;

    if (tree.truncated) {
      console.warn(
        `sources/github: tree listing for ${owner}/${name}@${ref} was truncated by the GitHub API — some agent files may be missing`
      );
    }

    const sourceLabel = `github:${owner}/${name}@${ref}${subdir ? `:${subdir}` : ''}`;
    const candidates = (tree.tree ?? []).filter((entry) => isCandidateMarkdownBlob(entry, subdir));

    const fetched = await Promise.all(
      candidates.map(async (entry) => {
        const rawUrl = `https://raw.githubusercontent.com/${owner}/${name}/${ref}/${entry.path}`;
        const res = await fetch(rawUrl, { headers: authHeaders() });
        if (!res.ok) {
          throw new Error(`sources/github: failed to fetch ${rawUrl} (${res.status})`);
        }
        const raw = await res.text();
        return { raw, path: entry.path };
      })
    );

    let skippedNonAgentFiles = 0;
    const agents: AgentDef[] & { skippedNonAgentFiles?: number } = [];
    for (const { raw, path: filePath } of fetched) {
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
