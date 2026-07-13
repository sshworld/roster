---
name: roster-usage
description: Use when the user asks which agents they actually use, about unused agents, ghost invocations, or wants agent usage stats from their Claude Code transcripts.
---

Run the roster CLI to report how often each subagent_type has actually been
invoked (via the Agent/Task tool) across Claude Code transcript files, then
join those counts against the user's roster to surface unused agents and
ghost invocations.

## Running the CLI

The canonical invocation always joins against the roster — without
`--user`/`--plugin` the unused/ghost computation has nothing to join against:

```sh
node "${CLAUDE_PLUGIN_ROOT}/dist/cli.js" usage --user --plugin
```

If `dist/cli.js` does not exist yet, or the plugin root isn't set at all
(running standalone), see the dist-missing/self-heal/npx fallback chain in
the roster-audit skill — the same recovery steps apply here.

## Options

- `--days <n>` — only count invocations from the last `<n>` days (default 30);
  widen the window for sparse usage, narrow it to focus on recent behavior.
- `--json` — machine-readable output for programmatic parsing.
- `ROSTER_CLAUDE_DIR` env — point at a different transcripts root (default
  `~/.claude`) when auditing another machine's exported transcripts.
- `usage` always exits 0 — it's a reporting tool, not a gate, so don't treat
  a non-zero exit as a signal (there isn't one).

## Interpreting results

- **Top-invoked list**: sorted by count, descending — this is what earns its
  context in day-to-day work.
- **Unused**: in the roster, but zero invocations in the window. Alias-aware
  for `<plugin>:<agent>` names, so a plugin-sourced agent invoked under its
  qualified name still counts against the bare roster entry.
- **Ghost**: an invoked `subagent_type` that isn't in the roster at all.
  Ghosts are often built-in agent types (`Explore`, `Plan`, `general-purpose`)
  — that's expected, not a problem, unless a custom agent name shows up here.

## Per-plugin rollup (`--plugin`)

`--plugin --json` adds a `plugins` array — one entry per installed plugin,
each with `agentCount`, `usedCount`, `unusedAgents`, and a `status`:

- `plugins[].status == "unused"` — every agent that plugin ships has zero
  observed invocations. These are **uninstall candidates**: surface them and,
  if the user agrees, hand off to `/roster-cleanup` to run the actual
  `claude plugin uninstall`.
- `plugins[].status == "used"` — at least one of its agents was invoked
  (directly or via its `<plugin>:<name>` alias) — keep.
- `plugins[].status == "no-agents"` — the plugin ships zero agents, so there's
  nothing to judge; **excluded** from the uninstall-candidate judgement, don't
  propose uninstalling on usage data alone.
- A disabled-but-still-installed plugin can still show up as an uninstall
  candidate here — `usage` has no `--enabled-only` flag, so it doesn't filter
  by enabled state the way `audit --enabled-only` does.

## Follow-up

If several unused agents (or fully-unused plugins) show up, suggest running
`/roster-cleanup` to turn that list into a concrete, user-approved cleanup.

## Three traps

- `--enabled-only` does **not** exist on `usage` — that's an audit-only flag.
- `--plugin` is a bare boolean here (no `[name]` argument), unlike `audit`
  where `--plugin [name]` can target one plugin.
- `usage` takes **no** `<dir>` positional — it always reads transcripts, not
  a directory of agent files.
