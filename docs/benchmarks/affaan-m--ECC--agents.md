# Benchmark — affaan-m/ECC:agents

- **Repo**: [affaan-m/ECC:agents](https://github.com/affaan-m/ECC)
- **Pinned SHA**: `8321021c54d670126ce3b2969d5deb880b4b0c2a`
- **Generated**: 2026-09-14

## Summary

- Agents scanned: **68**
- Top overlap pair (of top 15): **swift-build-resolver <-> swift-reviewer (0.727)**
- No-harness agents (no tool restriction / wildcard tools): **0** (0.0% of roster)
- Roster fixed cost estimate: **~3569 tokens/turn**
- Total findings: **198**

## Top 15 overlapping pairs

| Agent A | Agent B | Similarity |
| --- | --- | --- |
| swift-build-resolver | swift-reviewer | 0.727 |
| opensource-forker | opensource-sanitizer | 0.718 |
| react-build-resolver | react-reviewer | 0.675 |
| java-build-resolver | java-reviewer | 0.642 |
| go-build-resolver | go-reviewer | 0.633 |
| csharp-reviewer | fsharp-reviewer | 0.613 |
| react-reviewer | typescript-reviewer | 0.575 |
| rust-build-resolver | rust-reviewer | 0.531 |
| code-reviewer | typescript-reviewer | 0.510 |
| gan-evaluator | gan-generator | 0.506 |
| django-build-resolver | django-reviewer | 0.493 |
| build-error-resolver | cpp-build-resolver | 0.448 |
| homelab-architect | network-architect | 0.444 |
| django-reviewer | python-reviewer | 0.442 |
| fsharp-reviewer | python-reviewer | 0.431 |

## Reproduce

```sh
npm run build
node dist/cli.js audit --repo affaan-m/ECC@8321021c54d670126ce3b2969d5deb880b4b0c2a:agents --no-fail --top 15 --json
node dist/cli.js audit --repo affaan-m/ECC@8321021c54d670126ce3b2969d5deb880b4b0c2a:agents --no-fail --top 15
```

## CLI output

```
Roster Audit Report
Agents scanned: 68
Sources: github:affaan-m/ECC@8321021c54d670126ce3b2969d5deb880b4b0c2a:agents

Top overlapping pairs (15):
  0.727  swift-build-resolver <-> swift-reviewer
  0.718  opensource-forker <-> opensource-sanitizer
  0.675  react-build-resolver <-> react-reviewer
  0.642  java-build-resolver <-> java-reviewer
  0.633  go-build-resolver <-> go-reviewer
  0.613  csharp-reviewer <-> fsharp-reviewer
  0.575  react-reviewer <-> typescript-reviewer
  0.531  rust-build-resolver <-> rust-reviewer
  0.510  code-reviewer <-> typescript-reviewer
  0.506  gan-evaluator <-> gan-generator
  0.493  django-build-resolver <-> django-reviewer
  0.448  build-error-resolver <-> cpp-build-resolver
  0.444  homelab-architect <-> network-architect
  0.442  django-reviewer <-> python-reviewer
  0.431  fsharp-reviewer <-> python-reviewer

Findings: 198 total (0 critical, 0 warning)
```

