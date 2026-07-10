---
name: roster-audit
description: Use when the user asks to audit an agent roster for overlap, missing harness/tools, routing ambiguity, or context/token cost — or generally asks "audit my agents/skills".
---

Run the roster CLI to statically audit a Claude Code agent roster (agents,
skills, subagents, tool configs) and interpret the results.

## Running the CLI

Prefer the plugin's bundled build when available (no install/network needed):

```sh
node "${CLAUDE_PLUGIN_ROOT}/dist/cli.js" audit <dir>
```

If the plugin root isn't set (e.g. running standalone outside the plugin),
fall back to npx:

```sh
npx roster-cli audit <dir>
```

## Choosing a source

- **Project agents**: `audit .claude/agents` (or wherever the project's agent
  `.md` files live) — the common case.
- **User-level agents**: add `--user` to also scan `~/.claude/agents`.
- **Installed plugin agents**: add `--plugin [name]` to scan the plugin cache
  (all installed plugins, or a single one by name).
- **A public GitHub repo of agents**: `--repo <owner/name[@ref]>` to audit a
  roster you don't have checked out locally (e.g. for due diligence before
  adopting a third-party agent pack).
- Multiple sources can be combined in one run — each finding is tagged with
  its `sourceLabel` so mixed-origin audits stay attributable.

## Interpreting results

- **`overlap` findings, score >= 0.6`**: two agents/skills likely cover the
  same responsibility — treat as a signal to merge, split trigger conditions,
  or route explicitly. Scores at or near 1.0 usually mean near-duplicate
  files (same description/body reused), not just topical overlap.
- **`harness` findings with "no tools"**: an agent that declares no tools is
  "a hat with no hands" — it can describe work but can't execute it. Usually
  either a misconfiguration or a purely advisory/persona agent; confirm intent.
- **`routing` findings**: ambiguous or missing triggers/descriptions that make
  it hard for the router (or a human) to pick the right agent — tighten the
  `description` field.
- **`cost` findings**: estimated fixed token cost per turn for the roster as
  configured — useful for spotting rosters that are bloated before they ever
  run.
- **`fluff` findings** (experimental): low-signal, filler instructions that
  add tokens without adding behavior.

## HTML dashboard

For a shareable, browsable report instead of terminal output:

```sh
node "${CLAUDE_PLUGIN_ROOT}/dist/cli.js" audit <dir> --html report.html
```

Open `report.html` in a browser — it groups findings by rule and severity and
links back to the offending agent files.
