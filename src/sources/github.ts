import type { AgentDef, RosterSource } from '../core/types.js';
import { parseAgentMarkdown } from '../parse/agent-md.js';
import { isExcludedDocFile } from './dir.js';

// R3 — no tar extraction. We use the Git Trees API (recursive listing of paths only)
// plus raw.githubusercontent.com fetches for the handful of matching .md blobs. This
// avoids downloading/extracting a full repo tarball just to find agent markdown files.

interface ParsedRepo {
  owner: string;
  name: string;
  ref?: string;
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
  const atIndex = repo.lastIndexOf('@');
  const withoutRef = atIndex === -1 ? repo : repo.slice(0, atIndex);
  const ref = atIndex === -1 ? undefined : repo.slice(atIndex + 1);

  const slashIndex = withoutRef.indexOf('/');
  if (slashIndex === -1) {
    throw new Error(`sources/github: invalid repo spec "${repo}", expected owner/name[@ref]`);
  }

  return {
    owner: withoutRef.slice(0, slashIndex),
    name: withoutRef.slice(slashIndex + 1),
    ref,
  };
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

function isCandidateMarkdownBlob(entry: TreeEntry): boolean {
  return entry.type === 'blob' && entry.path.endsWith('.md') && !isExcludedDocFile(entry.path);
}

export const githubSource: RosterSource = {
  id: 'github',
  description: 'Loads agents from a GitHub repository (owner/name[@ref]).',
  async load(opts): Promise<AgentDef[]> {
    const repoSpec = opts?.repo as string | undefined;
    if (!repoSpec) {
      throw new Error('sources/github: opts.repo is required (owner/name[@ref])');
    }

    const { owner, name, ref: pinnedRef } = parseRepoSpec(repoSpec);
    const ref = pinnedRef ?? (await resolveDefaultBranch(owner, name));

    const treeUrl = `https://api.github.com/repos/${owner}/${name}/git/trees/${ref}?recursive=1`;
    const tree = (await githubJsonFetch(treeUrl)) as TreeResponse;

    if (tree.truncated) {
      console.warn(
        `sources/github: tree listing for ${owner}/${name}@${ref} was truncated by the GitHub API — some agent files may be missing`
      );
    }

    const sourceLabel = `github:${owner}/${name}@${ref}`;
    const candidates = (tree.tree ?? []).filter(isCandidateMarkdownBlob);

    const agents = await Promise.all(
      candidates.map(async (entry) => {
        const rawUrl = `https://raw.githubusercontent.com/${owner}/${name}/${ref}/${entry.path}`;
        const res = await fetch(rawUrl, { headers: authHeaders() });
        if (!res.ok) {
          throw new Error(`sources/github: failed to fetch ${rawUrl} (${res.status})`);
        }
        const raw = await res.text();
        return parseAgentMarkdown(raw, entry.path, sourceLabel);
      })
    );

    return agents;
  },
};
