# Benchmark — contains-studio/agents

- **Repo**: [contains-studio/agents](https://github.com/contains-studio/agents)
- **Pinned SHA**: `a5a480c324cac64b9c569bca0b2f297d517240cb`
- **Generated**: 2026-07-10

## Summary

- Agents scanned: **37**
- Top overlap pair (of top 15): **content-creator <-> instagram-curator (0.565)**
- No-harness agents (no tool restriction / wildcard tools): **6** (16.2% of roster)
- Roster fixed cost estimate: **~8421 tokens/turn**
- Total findings: **115**

## Top 15 overlapping pairs

| Agent A | Agent B | Similarity |
| --- | --- | --- |
| content-creator | instagram-curator | 0.565 |
| instagram-curator | twitter-engager | 0.458 |
| test-writer-fixer | test-results-analyzer | 0.455 |
| tiktok-strategist | trend-researcher | 0.429 |
| frontend-developer | mobile-app-builder | 0.406 |
| rapid-prototyper | trend-researcher | 0.398 |
| instagram-curator | tiktok-strategist | 0.391 |
| sprint-prioritizer | studio-producer | 0.379 |
| project-shipper | studio-producer | 0.377 |
| reddit-community-builder | twitter-engager | 0.370 |
| infrastructure-maintainer | performance-benchmarker | 0.369 |
| content-creator | twitter-engager | 0.368 |
| api-tester | performance-benchmarker | 0.365 |
| trend-researcher | project-shipper | 0.360 |
| frontend-developer | rapid-prototyper | 0.359 |

## Reproduce

```sh
npm run build
node dist/cli.js audit --repo contains-studio/agents@a5a480c324cac64b9c569bca0b2f297d517240cb --no-fail --top 15 --json
node dist/cli.js audit --repo contains-studio/agents@a5a480c324cac64b9c569bca0b2f297d517240cb --no-fail --top 15
```

## CLI output

```
Roster Audit Report
Agents scanned: 37
Sources: github:contains-studio/agents@a5a480c324cac64b9c569bca0b2f297d517240cb

Top overlapping pairs (15):
  0.565  content-creator <-> instagram-curator
  0.458  instagram-curator <-> twitter-engager
  0.455  test-writer-fixer <-> test-results-analyzer
  0.429  tiktok-strategist <-> trend-researcher
  0.406  frontend-developer <-> mobile-app-builder
  0.398  rapid-prototyper <-> trend-researcher
  0.391  instagram-curator <-> tiktok-strategist
  0.379  sprint-prioritizer <-> studio-producer
  0.377  project-shipper <-> studio-producer
  0.370  reddit-community-builder <-> twitter-engager
  0.369  infrastructure-maintainer <-> performance-benchmarker
  0.368  content-creator <-> twitter-engager
  0.365  api-tester <-> performance-benchmarker
  0.360  trend-researcher <-> project-shipper
  0.359  frontend-developer <-> rapid-prototyper

Findings: 115 total (0 critical, 11 warning)
```

