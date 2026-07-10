# roster

Does your agent earn its context?

## Philosophy

Most agent tooling optimizes personas — tone, role-play, instructions. roster
starts from a different premise: **structure earns value, not persona**. An
agent's context is a dependency, and dependencies churn — they overlap,
route badly, cost tokens, and rot. roster is a static analyzer for your agent
roster (skills, subagents, tool configs) that surfaces those problems before
they burn context in production.

## Install

```sh
npm i -g roster-cli
```

or run it without installing:

```sh
npx roster-cli audit <dir>
```

## Usage

```sh
roster audit <dir>
roster audit <dir> --user
roster audit <dir> --repo owner/name
roster audit <dir> --html report.html
```

Full flag surface:

```
roster audit <dir> [--json] [--html <out>] [--user] [--plugin [name]]
                    [--repo <owner/name[@ref]>] [--top <n>]
                    [--fail-above <s>] [--no-fail]
```

## Rules

| Rule | Description | Status |
| --- | --- | --- |
| `overlap` | Detects agents/skills covering the same responsibility | stable |
| `harness` | Flags harness-incompatible or malformed configs | stable |
| `routing` | Checks routing/trigger ambiguity between agents | stable |
| `cost` | Estimates context/token cost of a roster | stable |
| `fluff` | Flags low-signal, filler instructions | experimental |

## Benchmarks

`roster audit --repo` run against well-known public agent rosters (SHA-pinned,
reproducible via `scripts/bench.sh`). Full reports: `docs/benchmarks/`.

| roster | agents | top overlap pair (score) | no-tools % | fixed cost (est. tokens/turn) |
| --- | --- | --- | --- | --- |
| [msitarzewski/agency-agents](./docs/benchmarks/msitarzewski--agency-agents.md) | 277 | Backend Architect ↔ Backend Architect (0.878) | 93.9% | ~14024 |
| [wshobson/agents](./docs/benchmarks/wshobson--agents.md) | 691 | api-scaffolding-backend-architect ↔ backend-api-security-backend-architect (1.000) | 97.8% | ~24853 |
| [contains-studio/agents](./docs/benchmarks/contains-studio--agents.md) | 37 | content-creator ↔ instagram-curator (0.565) | 16.2% | ~8421 |

Several top pairs score at or near 1.000 similarity (e.g. wshobson/agents has
five pairs at a perfect 1.000) — these are near-duplicate agent files (same
description/body reused across roles), not incidental topic overlap.

## Use as a Claude Code plugin

roster also ships as a Claude Code plugin — a resident guard instead of a
one-off report.

Install locally (before this is registered in a marketplace), from the
repo root:

```sh
/plugin install /path/to/roster
```

Once installed:

- **`roster-audit` skill** — triggers when you ask to audit an agent roster
  (overlap, missing harness/tools, routing ambiguity, cost); runs the bundled
  CLI and explains how to read the findings.
- **`roster-drift.sh` hook** (`SessionStart`) — on each session, diffs
  `.claude/agents/` against a cached snapshot and prints a short advisory if
  agents were added/removed/changed (`ROSTER_DRIFT_DISABLE=1` to opt out).
  Advisory only — never blocks a session.

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md).

## License

[MIT](./LICENSE)
