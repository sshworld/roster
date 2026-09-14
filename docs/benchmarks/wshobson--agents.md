# Benchmark — wshobson/agents

- **Repo**: [wshobson/agents](https://github.com/wshobson/agents)
- **Pinned SHA**: `4236bb91f8395b0435f1d8b8baf9e8e4c69a8620`
- **Generated**: 2026-09-14

## Summary

- Agents scanned: **202**
- Top overlap pair (of top 15): **api-scaffolding-backend-architect <-> backend-api-security-backend-architect (1.000)**
- No-harness agents (no tool restriction / wildcard tools): **188** (93.1% of roster)
- Roster fixed cost estimate: **~14256 tokens/turn**
- Total findings: **804**

## Top 15 overlapping pairs

| Agent A | Agent B | Similarity |
| --- | --- | --- |
| api-scaffolding-backend-architect | backend-api-security-backend-architect | 1.000 |
| api-scaffolding-backend-architect | backend-development-backend-architect | 1.000 |
| api-scaffolding-backend-architect | data-engineering-backend-architect | 1.000 |
| api-scaffolding-backend-architect | database-cloud-optimization-backend-architect | 1.000 |
| api-scaffolding-backend-architect | multi-platform-apps-backend-architect | 1.000 |
| api-testing-observability-api-documenter | documentation-generation-api-documenter | 1.000 |
| application-performance-performance-engineer | full-stack-orchestration-performance-engineer | 1.000 |
| application-performance-performance-engineer | observability-monitoring-performance-engineer | 1.000 |
| application-performance-performance-engineer | performance-testing-review-performance-engineer | 1.000 |
| backend-api-security-backend-architect | backend-development-backend-architect | 1.000 |
| backend-api-security-backend-architect | data-engineering-backend-architect | 1.000 |
| backend-api-security-backend-architect | database-cloud-optimization-backend-architect | 1.000 |
| backend-api-security-backend-architect | multi-platform-apps-backend-architect | 1.000 |
| backend-development-backend-architect | data-engineering-backend-architect | 1.000 |
| backend-development-backend-architect | database-cloud-optimization-backend-architect | 1.000 |

## Reproduce

```sh
npm run build
node dist/cli.js audit --repo wshobson/agents@4236bb91f8395b0435f1d8b8baf9e8e4c69a8620 --no-fail --top 15 --json
node dist/cli.js audit --repo wshobson/agents@4236bb91f8395b0435f1d8b8baf9e8e4c69a8620 --no-fail --top 15
```

## CLI output

```
Roster Audit Report
Agents scanned: 202
Sources: github:wshobson/agents@4236bb91f8395b0435f1d8b8baf9e8e4c69a8620

Top overlapping pairs (15):
  1.000  api-scaffolding-backend-architect <-> backend-api-security-backend-architect
  1.000  api-scaffolding-backend-architect <-> backend-development-backend-architect
  1.000  api-scaffolding-backend-architect <-> data-engineering-backend-architect
  1.000  api-scaffolding-backend-architect <-> database-cloud-optimization-backend-architect
  1.000  api-scaffolding-backend-architect <-> multi-platform-apps-backend-architect
  1.000  api-testing-observability-api-documenter <-> documentation-generation-api-documenter
  1.000  application-performance-performance-engineer <-> full-stack-orchestration-performance-engineer
  1.000  application-performance-performance-engineer <-> observability-monitoring-performance-engineer
  1.000  application-performance-performance-engineer <-> performance-testing-review-performance-engineer
  1.000  backend-api-security-backend-architect <-> backend-development-backend-architect
  1.000  backend-api-security-backend-architect <-> data-engineering-backend-architect
  1.000  backend-api-security-backend-architect <-> database-cloud-optimization-backend-architect
  1.000  backend-api-security-backend-architect <-> multi-platform-apps-backend-architect
  1.000  backend-development-backend-architect <-> data-engineering-backend-architect
  1.000  backend-development-backend-architect <-> database-cloud-optimization-backend-architect

Findings: 804 total (0 critical, 188 warning)
```

