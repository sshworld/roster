# Benchmark — affaan-m/ECC:agents

- **Repo**: [affaan-m/ECC:agents](https://github.com/affaan-m/ECC)
- **Pinned SHA**: `b92f181b3b748d1abbc2afd94af6aa7d8c8fca29`
- **Generated**: 2026-10-12

## Summary

- Agents scanned: **71**
- Top overlap pair (of top 15): **swift-build-resolver <-> swift-reviewer (0.730)**
- No-harness agents (no tool restriction / wildcard tools): **0** (0.0% of roster)
- Roster fixed cost estimate: **~3728 tokens/turn**
- Total findings: **206**

## Top 15 overlapping pairs

| Agent A | Agent B | Similarity |
| --- | --- | --- |
| swift-build-resolver | swift-reviewer | 0.730 |
| react-build-resolver | react-reviewer | 0.681 |
| java-build-resolver | java-reviewer | 0.645 |
| go-build-resolver | go-reviewer | 0.625 |
| csharp-reviewer | fsharp-reviewer | 0.612 |
| react-reviewer | typescript-reviewer | 0.575 |
| rust-build-resolver | rust-reviewer | 0.533 |
| code-reviewer | typescript-reviewer | 0.510 |
| opensource-forker | opensource-sanitizer | 0.509 |
| gan-evaluator | gan-generator | 0.508 |
| django-build-resolver | django-reviewer | 0.494 |
| build-error-resolver | cpp-build-resolver | 0.442 |
| homelab-architect | network-architect | 0.440 |
| django-reviewer | python-reviewer | 0.439 |
| fsharp-reviewer | python-reviewer | 0.429 |

## Reproduce

```sh
npm run build
node dist/cli.js audit --repo affaan-m/ECC@b92f181b3b748d1abbc2afd94af6aa7d8c8fca29:agents --no-fail --top 15 --json
node dist/cli.js audit --repo affaan-m/ECC@b92f181b3b748d1abbc2afd94af6aa7d8c8fca29:agents --no-fail --top 15
```

## CLI output

```
Roster Audit Report
Agents scanned: 71
Sources: github:affaan-m/ECC@b92f181b3b748d1abbc2afd94af6aa7d8c8fca29:agents

Top overlapping pairs (15):
  0.730  swift-build-resolver <-> swift-reviewer
  0.681  react-build-resolver <-> react-reviewer
  0.645  java-build-resolver <-> java-reviewer
  0.625  go-build-resolver <-> go-reviewer
  0.612  csharp-reviewer <-> fsharp-reviewer
  0.575  react-reviewer <-> typescript-reviewer
  0.533  rust-build-resolver <-> rust-reviewer
  0.510  code-reviewer <-> typescript-reviewer
  0.509  opensource-forker <-> opensource-sanitizer
  0.508  gan-evaluator <-> gan-generator
  0.494  django-build-resolver <-> django-reviewer
  0.442  build-error-resolver <-> cpp-build-resolver
  0.440  homelab-architect <-> network-architect
  0.439  django-reviewer <-> python-reviewer
  0.429  fsharp-reviewer <-> python-reviewer

Findings: 206 total (0 critical, 0 warning)
```

