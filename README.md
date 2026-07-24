**English** · [한국어](README.ko.md)

# roster

Does your agent earn its context?

<img src="docs/assets/hero.svg" alt="roster audit terminal output" width="720">

`roster audit` also renders a shareable HTML report with `--html` — [view a live sample report](https://sshworld.github.io/roster/demo/report.html).

## Philosophy

Most agent tooling optimizes personas — tone, role-play, instructions. roster
starts from a different premise: **structure earns value, not persona**. An
agent's context is a dependency, and dependencies churn — they overlap,
route badly, cost tokens, and rot. roster is a static analyzer for your agent
roster (skills, subagents, tool configs) that surfaces those problems before
they burn context in production.

## Install

roster ships as a Claude Code plugin — a resident guard instead of a
one-off report.

Install via the bundled marketplace manifest:

```sh
/plugin marketplace add sshworld/roster
/plugin install roster
```

Once installed:

- **`roster-audit` skill** — triggers when you ask to audit an agent roster
  (overlap, missing harness/tools, routing ambiguity, cost); runs the bundled
  CLI and explains how to read the findings.
- **`roster-cleanup` skill** — triggers when you ask to clean up, prune, or
  merge agents. Audits, classifies findings into concrete actions (delete /
  move / merge / rename / uninstall / narrow tools), asks you to approve each
  destructive step, executes only what you approved, then re-audits and
  reports the delta.
- **`roster-usage` skill** — triggers when you ask which agents you actually
  use. Joins your transcript history against the roster to surface unused
  agents and ghost invocations, and points you at `/roster-cleanup` when
  dead weight shows up.
- **`roster-drift.sh` hook** (`SessionStart`) — on each session, content-
  fingerprints (checksum, not just size) the watched agent-md dir(s)
  recursively against a cached snapshot and emits a short advisory if agents
  were added/removed/changed (`ROSTER_DRIFT_DISABLE=1` to opt out). By
  default it watches `.claude/agents` plus, in a plugin-layout repo (one with
  a top-level `.claude-plugin/plugin.json`), the root `agents/` dir; override
  with `ROSTER_DRIFT_DIR` (colon-separated dir list). The scan follows
  symlinks and prunes `node_modules`/`.git`. The advisory is injected into
  Claude's session context along with a relay directive, so Claude surfaces
  it to you in its first response of the session. Advisory only — never
  blocks a session.
- **`roster-warn.sh` hook** (`PostToolUse`) — right after Claude invokes an
  agent (`Task`/`Agent` tool) or a skill (`Skill` tool), scores the TF-IDF
  overlap between the just-invoked name and every sibling already in the
  roster; above threshold (default 0.7 for the hook, 0.6 for the standalone
  CLI — `--above` overrides either), it injects a short advisory into
  Claude's session context, same relay pattern as the drift hook. Deduped
  per name per session (a marker file under
  `~/.cache/roster/warn-seen-<session>/`), so a repeatedly-invoked agent
  only warns once. `ROSTER_WARN_DISABLE=1` opts out entirely. Advisory
  only — never blocks the tool call.

### Standalone CLI

```sh
npm i -g roster-cli
```

or run it without installing:

```sh
npx roster-cli audit <dir>
```

## Usage

roster is one binary with four commands: `audit`, `doccheck`, `usage`, and
`warn`. The plugin wraps `audit` and `usage` as the `/roster-audit` and
`/roster-usage` skills, and adds `/roster-cleanup` — a skill-only
interactive workflow built on top of both. `doccheck` is CLI-only. `warn`
is wired as the `roster-warn.sh` `PostToolUse` hook above, plus available
standalone.

```sh
roster audit <dir>
roster audit <dir> --user
roster audit <dir> --repo owner/name[@ref][:subdir]
roster audit <dir> --html report.html
roster audit --plugin --enabled-only
roster doccheck README.md
roster usage --days 14 --user
roster warn --name my-agent
```

Full flag surface for `audit`:

```
roster audit <dir> [--json] [--html <out>] [--user] [--plugin [name]]
                    [--enabled-only] [--repo <owner/name[@ref][:subdir]>] [--top <n>]
                    [--fail-above <s>] [--no-fail]
```

`--enabled-only` (with `--plugin`) restricts the plugin-cache source to entries
active for the current project.[^enabled-only]

[^enabled-only]: Two filters, AND-combined. **Scope**: user-scope entries are
    always active; local/project-scope entries are active only when the cwd is
    inside the pinning project. **Settings**: a plugin explicitly disabled via
    `enabledPlugins` in `settings.json`/`settings.local.json` is excluded —
    checked across `<home>/.claude/`, then the nearest project directory
    at-or-above cwd that has a `.claude/settings.json`, with later files
    winning and a key absent from all of them treated as enabled. This is
    audit-path only — `usage` does not take `--enabled-only`.

**What counts as an agent.** `--repo` and `<dir>` scans ingest a markdown
file only if it has frontmatter with a non-empty `name`; `description` is
recommended but not required. Files named `SKILL.md`, `CLAUDE.md`, or
`AGENTS.md` are excluded by basename even if they carry a `name` key.
Collections that rely on a filename-only naming convention (no `name` key
in frontmatter) are not ingested by repo/dir sweeps.

## MCP server

`roster mcp` runs a [Model Context Protocol](https://modelcontextprotocol.io)
server on stdio, so any MCP client — Claude Code, Cursor, Codex CLI, MCP
Inspector — can call `roster_audit`, `roster_usage`, and `roster_doccheck`
directly as tools, without shelling out.

```sh
npm i -g roster-cli
claude mcp add roster -- roster mcp
```

npx alternative (no global install):

```sh
claude mcp add roster -- npx -y roster-cli mcp
```

Cursor (`.cursor/mcp.json`):

```json
{ "mcpServers": { "roster": { "command": "roster", "args": ["mcp"] } } }
```

Codex CLI (`~/.codex/config.toml`):

```toml
[mcp_servers.roster]
command = "roster"
args = ["mcp"]
```

Prefer a global install over `npx` in MCP client configs — a cold `npx`
download can exceed the client's startup timeout. Env vars like
`ROSTER_CLAUDE_DIR` go in the MCP config's `env` block, not inline in `args`.

**Scope.** roster parses markdown+frontmatter agent definitions (the Claude
Code format), and `roster_usage` reads Claude Code transcript files.
Adapters for other agent formats (Cursor rules, `AGENTS.md` packs) are on the
roadmap. The MCP server doesn't change what roster understands — it makes
that same analysis callable from any MCP client today.

## doccheck

```sh
roster doccheck README.md
roster doccheck docs/
roster doccheck            # defaults to README.md + docs/**/*.md
```

Scans fenced `sh`/`bash`/`shell` code blocks in markdown docs for commands
that would fail if a reader copy-pasted them: dead relative paths, missing
`npm run <script>` scripts, and scripts that exist on disk but lack the
executable bit.

To keep false positives at zero, it skips anything it can't verify cheaply:
absolute paths (`/plugin ...`), `npx ...` invocations, and bare global
binaries (`node`, `git`, ...) with no path separator.

Exits `1` if any finding is reported, `0` otherwise (`--json` for machine-
readable output).

## usage

```sh
roster usage
roster usage --days 14
roster usage --user
roster usage --plugin --json
```

Aggregates how often each `subagent_type` was invoked (via the Agent/Task
tool) across Claude Code transcript files under `~/.claude` (override with
`ROSTER_CLAUDE_DIR`), within the last `--days` (default `30`).

Joining with `--user` and/or `--plugin` also reports:
- **unused** — agents present in the roster with zero observed invocations
- **ghosts** — invoked `subagent_type` values that don't match any roster agent

`--plugin --json` additionally adds a `plugins` array (always present and
always an array when `--plugin` is passed, even if empty) — one entry per
installed plugin:

```json
{ "name": "some-plugin", "scope": "user", "version": "1.2.0",
  "agentCount": 3, "usedCount": 0, "unusedAgents": ["a", "b", "c"],
  "status": "unused" }
```

`status` is `"unused"` when every agent that plugin ships has zero observed
invocations (a plugin-level **uninstall candidate** — human output lists
these under `Fully-unused plugins (uninstall candidates):` with a
`claude plugin uninstall <name>` hint), `"used"` when at least one agent was
invoked, or `"no-agents"` when the plugin ships zero agents (excluded from
the uninstall-candidate judgement — listed separately as
`No agents (usage unknown): ...`).

Always exits `0` — this is a reporting tool, not a gate.

## warn

```sh
roster warn --name my-agent
roster warn --name plugin:my-skill --kind skill --above 0.5
roster warn --hook   # reads a PostToolUse payload from stdin instead
```

Standalone entry point for the same overlap check the `roster-warn.sh`
`PostToolUse` hook runs above: scores TF-IDF cosine similarity between
`--name` and every other agent/skill in the roster, and reports siblings
scoring at or above `--above` (default `0.6`; the hook itself defaults to
`0.7`). `--kind` restricts matching to `agent` or `skill`.

```
roster warn --name code-reviewer
[roster warn] 'code-reviewer' overlaps with 2 sibling(s):
  - pr-reviewer (agent, dir:.claude/agents) score=0.812
  - security-reviewer (agent, user) score=0.734
```

**Limits:**
- Only `Task`/`Agent` tool calls (subagents) and `Skill` tool calls are
  observed by the hook — a slash command that never routes through the
  `Skill` tool produces no advisory either way.
- A skill is vectorized as `name + description` only (a `SKILL.md` body is
  boilerplate, not signal); an agent is vectorized as `description + body`,
  matching `roster audit`'s own overlap rule. Because of that asymmetry,
  `warn` scores are not directly comparable to `audit`'s overlap scores.
- Advisory only — `warn` never blocks, retries, or modifies the tool call
  it fires after.

**Quiet by default — that's the point.** A healthy roster produces no
warnings: in typical setups the highest sibling scores sit far below the
hook's `0.7` threshold, so silence means "no risky overlap", not "the hook
is broken". To check what your roster actually scores, lower the bar:

```sh
roster warn --name <your-agent-or-plugin:skill> --above 0.1 --json
```

To watch the hook fire end-to-end, give it something to warn about — two
near-duplicate agents in a scratch project:

```sh
mkdir -p /tmp/warn-demo/.claude/agents && cd /tmp/warn-demo
printf -- '---\nname: deploy-helper\ndescription: Deploys the app to production kubernetes, checks rollout status, rolls back on failure, notifies the team channel\n---\nProduction deploy workflow.\n' > .claude/agents/deploy-helper.md
sed 's/deploy-helper/release-deployer/' .claude/agents/deploy-helper.md > .claude/agents/release-deployer.md
claude   # then ask it to invoke the deploy-helper subagent
```

The tool result gains a `PostToolUse:Agent says: [roster] 'deploy-helper'
overlaps with: release-deployer (0.89)` line. Even when no warning fires,
marker files under `~/.cache/roster/warn-seen-<session>/` prove the hook
ran for each invoked name.

## Rules

| Rule | Description | Status |
| --- | --- | --- |
| `overlap` | Detects agents/skills covering the same responsibility | stable |
| `harness` | Flags harness-incompatible or malformed configs | stable |
| `routing` | Checks routing/trigger ambiguity between agents | stable |
| `cost` | Estimates context/token cost of a roster | stable |
| `fluff` | Flags low-signal, filler instructions (bodies >20 lines) | experimental |

## Benchmarks

`roster audit --repo` run against well-known public agent rosters (SHA-pinned,
reproducible via `scripts/bench.sh`). Full reports: `docs/benchmarks/`.

A weekly cron re-runs the benchmark suite against each roster's latest
upstream HEAD and pushes any changes straight to `main`.[^leaderboard-cron]

<!-- bench:start -->
| Repo | Agents | Top overlap pair | No-tools % | Fixed cost |
| --- | --- | --- | --- | --- |
| [affaan-m/ECC:agents](https://github.com/affaan-m/ECC) | 67 | swift-build-resolver <-> swift-reviewer (0.726) | 0.0% | ~3488 tokens/turn |
| [contains-studio/agents](https://github.com/contains-studio/agents) | 32 | test-writer-fixer <-> test-results-analyzer (0.475) | 3.1% | ~8421 tokens/turn |
| [msitarzewski/agency-agents](https://github.com/msitarzewski/agency-agents) | 264 | Backend Architect (github:msitarzewski/agency-agents@459dce837db3bdfdc4763d3fefd1fd854e73c8f1) <-> Backend Architect (github:msitarzewski/agency-agents@459dce837db3bdfdc4763d3fefd1fd854e73c8f1) (0.877) | 93.6% | ~14627 tokens/turn |
| [wshobson/agents](https://github.com/wshobson/agents) | 204 | api-scaffolding-graphql-architect <-> backend-development-graphql-architect (1.000) | 92.6% | ~14331 tokens/turn |
<!-- bench:end -->

[^leaderboard-cron]: Runs every Monday via `.github/workflows/leaderboard.yml`.
    GitHub automatically disables scheduled workflows after 60 days of repo
    inactivity — re-enable with a manual `workflow_dispatch` run if that
    happens.

Several top pairs score at or near 1.000 similarity (e.g. wshobson/agents has
five pairs at a perfect 1.000) — these are near-duplicate agent files (same
description/body reused across roles), not incidental topic overlap.

### Reading the table

- **Agents** — real subagent definitions found (markdown with an explicit
  frontmatter `name`; docs, skills, and command files are not counted).
- **Top overlap pair** — highest TF-IDF cosine similarity between two agent
  *descriptions*. The router picks a subagent by reading these descriptions,
  so similar descriptions make routing a coin flip. Rough scale: **1.000** =
  literally the same agent twice, **0.7+** = merge or differentiate,
  **< 0.5** = healthy.
- **No-tools %** — share of agents with no `tools` declaration. An agent
  without one inherits *every* tool, so the model must guess its actual
  capabilities and least-privilege is gone.
- **Fixed cost** — estimated tokens injected into context **every turn** just
  by having the roster registered, before any agent is invoked.

### What to do about it

In order of impact:

1. **Delete unused agents** — `roster usage` joins your real invocation
   history; agents you registered but never invoke are pure per-turn tax.
   Fully-unused plugins are uninstall candidates (`roster usage --plugin`).
2. **Merge or differentiate overlapping pairs** — a 1.000 pair means one is
   dead weight; for 0.7–0.9 pairs, either merge them or rewrite the
   descriptions so it's obvious *when to pick which one*. The
   `/roster-cleanup` skill walks through this.
3. **Declare `tools`** — give each agent the minimal set it actually needs
   (a reviewer needs `Read, Grep, Bash`, not `Write`).
4. **Diet the descriptions** — keep only what routing needs; a two-sentence
   description routes as well as a three-paragraph bio and costs a fraction.

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md).

## License

[MIT](./LICENSE)
