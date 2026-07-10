---
name: roster-cleanup
description: Use when the user asks to clean up, prune, merge, or consolidate their agent roster — "delete unused agents", "merge overlapping agents", "clean up my agents/plugins". Runs an audit, classifies findings into concrete actions, and asks the user to approve each destructive step before executing.
---

Turn roster audit findings into an interactive cleanup: classify → propose →
**ask the user** → execute → verify. Never delete, merge, or uninstall
anything without an explicit user decision.

## Step 1 — Audit

Run the CLI with JSON output over every source the user cares about
(see roster-audit skill for the dist/npx fallback chain):

```sh
node "${CLAUDE_PLUGIN_ROOT}/dist/cli.js" audit <dir> --user --plugin --json --no-fail
```

## Step 2 — Classify findings into action candidates

Sort each finding into one of these buckets. Investigate before proposing —
read the actual agent files; scores alone are not evidence enough.

| Bucket | Signal | Proposed action |
| --- | --- | --- |
| **True duplicate** | Same name, ~1.0 similarity, different sources — often a repo that is also installed as its own plugin | Usually *keep* (expected); flag only if one copy is stale |
| **Merge candidate** | Different names, similarity ≥ 0.85, same responsibility on manual read | Merge into one agent; keep the better description/tools |
| **Not routable** | Missing frontmatter or `description` — can never be selected by the router | Move content elsewhere (user CLAUDE.md, docs) or delete |
| **Name collision** | Same name across two *enabled* plugins | Rename one (it's the user's plugin) or disable one pack |
| **Unused pack** | Plugin/agents the user no longer uses (ask — usage is not in the data) | `claude plugin uninstall` (note: local-scope installs need `--scope local` from that project's directory) |
| **Unrestricted tools** | No `tools:` declaration on an advisory/persona agent | Narrow to `Read, Grep` etc. |

## Step 3 — Ask, don't act

Present the candidates with AskUserQuestion (one question per decision,
concrete options like "delete", "move to CLAUDE.md", "keep"). Include
*why* — the score, the cost, what breaks if removed. Group related items,
but never bundle a destructive action inside a default.

## Step 4 — Execute approved actions only

- Delete/move files exactly as approved; for merges, write the merged agent
  first, show it, then remove the originals.
- Plugin uninstalls: user scope from anywhere; local scope from each pinned
  project directory.

## Step 5 — Verify

Re-run the same audit command and report the delta (agents scanned,
warnings resolved, remaining known-good findings). If a warning survived
that the user expected gone, say so — don't paper over it.
