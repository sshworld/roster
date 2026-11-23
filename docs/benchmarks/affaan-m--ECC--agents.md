# Benchmark — affaan-m/ECC:agents

- **Repo**: [affaan-m/ECC:agents](https://github.com/affaan-m/ECC)
- **Pinned SHA**: `4adeee6732a12d1540f49a4d50a38ce8c97f9a53`
- **Generated**: 2026-11-23

## Summary

- Agents scanned: **72**
- Top overlap pair (of top 15): **swift-build-resolver <-> swift-reviewer (0.732)**
- No-harness agents (no tool restriction / wildcard tools): **0** (0.0% of roster)
- Roster fixed cost estimate: **~3782 tokens/turn**
- Total findings: **209**

## Top 15 overlapping pairs

| Agent A | Agent B | Similarity |
| --- | --- | --- |
| swift-build-resolver | swift-reviewer | 0.732 |
| react-build-resolver | react-reviewer | 0.683 |
| java-build-resolver | java-reviewer | 0.646 |
| go-build-resolver | go-reviewer | 0.627 |
| csharp-reviewer | fsharp-reviewer | 0.611 |
| react-reviewer | typescript-reviewer | 0.575 |
| rust-build-resolver | rust-reviewer | 0.535 |
| opensource-forker | opensource-sanitizer | 0.515 |
| code-reviewer | typescript-reviewer | 0.511 |
| gan-evaluator | gan-generator | 0.508 |
| django-build-resolver | django-reviewer | 0.496 |
| django-reviewer | python-reviewer | 0.440 |
| build-error-resolver | cpp-build-resolver | 0.440 |
| homelab-architect | network-architect | 0.439 |
| fsharp-reviewer | python-reviewer | 0.428 |

## Reproduce

```sh
npm run build
node dist/cli.js audit --repo affaan-m/ECC@4adeee6732a12d1540f49a4d50a38ce8c97f9a53:agents --no-fail --top 15 --json
node dist/cli.js audit --repo affaan-m/ECC@4adeee6732a12d1540f49a4d50a38ce8c97f9a53:agents --no-fail --top 15
```

## CLI output

```
Roster Audit Report
Agents scanned: 72
Sources: github:affaan-m/ECC@4adeee6732a12d1540f49a4d50a38ce8c97f9a53:agents

Top overlapping pairs (15):
  0.732  swift-build-resolver <-> swift-reviewer
  0.683  react-build-resolver <-> react-reviewer
  0.646  java-build-resolver <-> java-reviewer
  0.627  go-build-resolver <-> go-reviewer
  0.611  csharp-reviewer <-> fsharp-reviewer
  0.575  react-reviewer <-> typescript-reviewer
  0.535  rust-build-resolver <-> rust-reviewer
  0.515  opensource-forker <-> opensource-sanitizer
  0.511  code-reviewer <-> typescript-reviewer
  0.508  gan-evaluator <-> gan-generator
  0.496  django-build-resolver <-> django-reviewer
  0.440  django-reviewer <-> python-reviewer
  0.440  build-error-resolver <-> cpp-build-resolver
  0.439  homelab-architect <-> network-architect
  0.428  fsharp-reviewer <-> python-reviewer

Findings: 209 total (0 critical, 0 warning)
```

