# Benchmark — wshobson/agents

- **Repo**: [wshobson/agents](https://github.com/wshobson/agents)
- **Pinned SHA**: `d7cf7dca8c4c7d0635e284f77204daa85552bfa4`
- **Generated**: 2026-07-14

## Summary

- Agents scanned: **199**
- Top overlap pair (of top 15): **api-scaffolding-backend-architect <-> backend-api-security-backend-architect (1.000)**
- No-harness agents (no tool restriction / wildcard tools): **184** (92.5% of roster)
- Roster fixed cost estimate: **~14041 tokens/turn**
- Total findings: **792**

## Top 15 overlapping pairs

| Agent A | Agent B | Similarity |
| --- | --- | --- |
| api-scaffolding-backend-architect | backend-api-security-backend-architect | 1.000 |
| api-scaffolding-backend-architect | backend-development-backend-architect | 1.000 |
| api-scaffolding-backend-architect | data-engineering-backend-architect | 1.000 |
| api-scaffolding-backend-architect | database-cloud-optimization-backend-architect | 1.000 |
| api-scaffolding-backend-architect | multi-platform-apps-backend-architect | 1.000 |
| api-scaffolding-fastapi-pro | python-development-fastapi-pro | 1.000 |
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
node dist/cli.js audit --repo wshobson/agents@d7cf7dca8c4c7d0635e284f77204daa85552bfa4 --no-fail --top 15 --json
node dist/cli.js audit --repo wshobson/agents@d7cf7dca8c4c7d0635e284f77204daa85552bfa4 --no-fail --top 15
```

## CLI output

```
Roster Audit Report
Agents scanned: 199
Sources: github:wshobson/agents@d7cf7dca8c4c7d0635e284f77204daa85552bfa4

Top overlapping pairs (15):
  1.000  api-scaffolding-backend-architect <-> backend-api-security-backend-architect
  1.000  api-scaffolding-backend-architect <-> backend-development-backend-architect
  1.000  api-scaffolding-backend-architect <-> data-engineering-backend-architect
  1.000  api-scaffolding-backend-architect <-> database-cloud-optimization-backend-architect
  1.000  api-scaffolding-backend-architect <-> multi-platform-apps-backend-architect
  1.000  api-scaffolding-fastapi-pro <-> python-development-fastapi-pro
  1.000  application-performance-performance-engineer <-> full-stack-orchestration-performance-engineer
  1.000  application-performance-performance-engineer <-> observability-monitoring-performance-engineer
  1.000  application-performance-performance-engineer <-> performance-testing-review-performance-engineer
  1.000  backend-api-security-backend-architect <-> backend-development-backend-architect
  1.000  backend-api-security-backend-architect <-> data-engineering-backend-architect
  1.000  backend-api-security-backend-architect <-> database-cloud-optimization-backend-architect
  1.000  backend-api-security-backend-architect <-> multi-platform-apps-backend-architect
  1.000  backend-development-backend-architect <-> data-engineering-backend-architect
  1.000  backend-development-backend-architect <-> database-cloud-optimization-backend-architect

Findings: 792 total (0 critical, 184 warning)
```

