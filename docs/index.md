---
title: roster
---

# roster

Does your agent earn its context? roster is a static analyzer for Claude Code
agent rosters — skills, subagents, tool configs — that surfaces overlap,
harness gaps, routing ambiguity, and context/token cost before they burn
context in production.

- [Live sample report](demo/report.html)
- Weekly benchmark reports:
  - [contains-studio/agents](https://github.com/sshworld/roster/blob/main/docs/benchmarks/contains-studio--agents.md)
  - [msitarzewski/agency-agents](https://github.com/sshworld/roster/blob/main/docs/benchmarks/msitarzewski--agency-agents.md)
  - [wshobson/agents](https://github.com/sshworld/roster/blob/main/docs/benchmarks/wshobson--agents.md)

## Install

```sh
npm i -g roster-cli
```

## Commands

One binary, four commands — `audit`, `doccheck`, `usage`, `warn`. Full flag
reference: [README](https://github.com/sshworld/roster#usage).

- `roster audit <dir>` — overlap, harness, routing, and cost findings for a
  roster.
- `roster doccheck README.md` — flags markdown code-block commands that
  would fail if copy-pasted.
- `roster usage --days 14` — joins Claude Code transcript history to surface
  unused agents and ghost invocations.
- `roster warn --name <invoked>` — checks one agent/skill name for overlap
  against the rest of the roster; also runs as a `PostToolUse` hook,
  advisory only.

## Repo

[github.com/sshworld/roster](https://github.com/sshworld/roster)
