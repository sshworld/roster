# Benchmark — contains-studio/agents

- **Repo**: [contains-studio/agents](https://github.com/contains-studio/agents)
- **Pinned SHA**: `a5a480c324cac64b9c569bca0b2f297d517240cb`
- **Generated**: 2026-07-20

## Summary

- Agents scanned: **32**
- Top overlap pair (of top 15): **test-writer-fixer <-> test-results-analyzer (0.475)**
- No-harness agents (no tool restriction / wildcard tools): **1** (3.1% of roster)
- Roster fixed cost estimate: **~8421 tokens/turn**
- Total findings: **95**

## Top 15 overlapping pairs

| Agent A | Agent B | Similarity |
| --- | --- | --- |
| test-writer-fixer | test-results-analyzer | 0.475 |
| tiktok-strategist | trend-researcher | 0.420 |
| frontend-developer | mobile-app-builder | 0.394 |
| rapid-prototyper | trend-researcher | 0.392 |
| sprint-prioritizer | studio-producer | 0.383 |
| project-shipper | studio-producer | 0.375 |
| infrastructure-maintainer | performance-benchmarker | 0.370 |
| api-tester | performance-benchmarker | 0.367 |
| frontend-developer | rapid-prototyper | 0.359 |
| studio-coach | studio-producer | 0.355 |
| trend-researcher | project-shipper | 0.352 |
| rapid-prototyper | experiment-tracker | 0.350 |
| infrastructure-maintainer | api-tester | 0.349 |
| ui-designer | frontend-developer | 0.349 |
| rapid-prototyper | tiktok-strategist | 0.343 |

## Reproduce

```sh
npm run build
node dist/cli.js audit --repo contains-studio/agents@a5a480c324cac64b9c569bca0b2f297d517240cb --no-fail --top 15 --json
node dist/cli.js audit --repo contains-studio/agents@a5a480c324cac64b9c569bca0b2f297d517240cb --no-fail --top 15
```

## CLI output

```
Roster Audit Report
Agents scanned: 32
Sources: github:contains-studio/agents@a5a480c324cac64b9c569bca0b2f297d517240cb

Top overlapping pairs (15):
  0.475  test-writer-fixer <-> test-results-analyzer
  0.420  tiktok-strategist <-> trend-researcher
  0.394  frontend-developer <-> mobile-app-builder
  0.392  rapid-prototyper <-> trend-researcher
  0.383  sprint-prioritizer <-> studio-producer
  0.375  project-shipper <-> studio-producer
  0.370  infrastructure-maintainer <-> performance-benchmarker
  0.367  api-tester <-> performance-benchmarker
  0.359  frontend-developer <-> rapid-prototyper
  0.355  studio-coach <-> studio-producer
  0.352  trend-researcher <-> project-shipper
  0.350  rapid-prototyper <-> experiment-tracker
  0.349  infrastructure-maintainer <-> api-tester
  0.349  ui-designer <-> frontend-developer
  0.343  rapid-prototyper <-> tiktok-strategist

Findings: 95 total (0 critical, 1 warning)
```

