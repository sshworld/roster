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

Results live in `docs/benchmarks/` — coming soon.

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md).

## License

[MIT](./LICENSE)
