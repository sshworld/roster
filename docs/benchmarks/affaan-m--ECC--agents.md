# Benchmark — affaan-m/ECC:agents

- **Repo**: [affaan-m/ECC:agents](https://github.com/affaan-m/ECC)
- **Pinned SHA**: `ed387446052dfbc6b52de149406b70efa65edc59`
- **Generated**: 2026-07-14

## Summary

- Agents scanned: **67**
- Top overlap pair (of top 15): **swift-build-resolver <-> swift-reviewer (0.726)**
- No-harness agents (no tool restriction / wildcard tools): **0** (0.0% of roster)
- Roster fixed cost estimate: **~3488 tokens/turn**
- Total findings: **196**

## Top 15 overlapping pairs

| Agent A | Agent B | Similarity |
| --- | --- | --- |
| swift-build-resolver | swift-reviewer | 0.726 |
| opensource-forker | opensource-sanitizer | 0.718 |
| react-build-resolver | react-reviewer | 0.674 |
| java-build-resolver | java-reviewer | 0.641 |
| go-build-resolver | go-reviewer | 0.631 |
| csharp-reviewer | fsharp-reviewer | 0.614 |
| react-reviewer | typescript-reviewer | 0.575 |
| rust-build-resolver | rust-reviewer | 0.530 |
| gan-evaluator | gan-generator | 0.524 |
| code-reviewer | typescript-reviewer | 0.511 |
| django-build-resolver | django-reviewer | 0.492 |
| build-error-resolver | cpp-build-resolver | 0.448 |
| homelab-architect | network-architect | 0.444 |
| django-reviewer | python-reviewer | 0.443 |
| gan-evaluator | gan-planner | 0.441 |

## Reproduce

```sh
npm run build
node dist/cli.js audit --repo affaan-m/ECC@ed387446052dfbc6b52de149406b70efa65edc59:agents --no-fail --top 15 --json
node dist/cli.js audit --repo affaan-m/ECC@ed387446052dfbc6b52de149406b70efa65edc59:agents --no-fail --top 15
```

## CLI output

```
Roster Audit Report
Agents scanned: 67
Sources: github:affaan-m/ECC@ed387446052dfbc6b52de149406b70efa65edc59:agents

Top overlapping pairs (15):
  0.726  swift-build-resolver <-> swift-reviewer
  0.718  opensource-forker <-> opensource-sanitizer
  0.674  react-build-resolver <-> react-reviewer
  0.641  java-build-resolver <-> java-reviewer
  0.631  go-build-resolver <-> go-reviewer
  0.614  csharp-reviewer <-> fsharp-reviewer
  0.575  react-reviewer <-> typescript-reviewer
  0.530  rust-build-resolver <-> rust-reviewer
  0.524  gan-evaluator <-> gan-generator
  0.511  code-reviewer <-> typescript-reviewer
  0.492  django-build-resolver <-> django-reviewer
  0.448  build-error-resolver <-> cpp-build-resolver
  0.444  homelab-architect <-> network-architect
  0.443  django-reviewer <-> python-reviewer
  0.441  gan-evaluator <-> gan-planner

Findings: 196 total (0 critical, 0 warning)
```

