# Benchmark — wshobson/agents

- **Repo**: [wshobson/agents](https://github.com/wshobson/agents)
- **Pinned SHA**: `1d5175f9053033cea267a4468bf1d1fb3fd57fcc`
- **Generated**: 2026-07-14

## Summary

- Agents scanned: **689**
- Top overlap pair (of top 15): **api-scaffolding-backend-architect <-> backend-api-security-backend-architect (1.000)**
- No-harness agents (no tool restriction / wildcard tools): **674** (97.8% of roster)
- Roster fixed cost estimate: **~26216 tokens/turn**
- Total findings: **2544**

## Top 15 overlapping pairs

| Agent A | Agent B | Similarity |
| --- | --- | --- |
| api-scaffolding-backend-architect | backend-api-security-backend-architect | 1.000 |
| api-scaffolding-backend-architect | backend-development-backend-architect | 1.000 |
| api-scaffolding-backend-architect | data-engineering-backend-architect | 1.000 |
| api-scaffolding-backend-architect | database-cloud-optimization-backend-architect | 1.000 |
| api-scaffolding-backend-architect | multi-platform-apps-backend-architect | 1.000 |
| api-testing-observability-api-documenter | documentation-generation-api-documenter | 1.000 |
| application-performance-frontend-developer | frontend-mobile-development-frontend-developer | 1.000 |
| application-performance-frontend-developer | frontend-mobile-security-frontend-developer | 1.000 |
| application-performance-frontend-developer | multi-platform-apps-frontend-developer | 1.000 |
| backend-api-security-backend-architect | backend-development-backend-architect | 1.000 |
| backend-api-security-backend-architect | data-engineering-backend-architect | 1.000 |
| backend-api-security-backend-architect | database-cloud-optimization-backend-architect | 1.000 |
| backend-api-security-backend-architect | multi-platform-apps-backend-architect | 1.000 |
| backend-development-backend-architect | data-engineering-backend-architect | 1.000 |
| backend-development-backend-architect | database-cloud-optimization-backend-architect | 1.000 |

## Reproduce

```sh
npm run build
node dist/cli.js audit --repo wshobson/agents@1d5175f9053033cea267a4468bf1d1fb3fd57fcc --no-fail --top 15 --json
node dist/cli.js audit --repo wshobson/agents@1d5175f9053033cea267a4468bf1d1fb3fd57fcc --no-fail --top 15
```

## CLI output

```
Roster Audit Report
Agents scanned: 689
Sources: github:wshobson/agents@1d5175f9053033cea267a4468bf1d1fb3fd57fcc

Top overlapping pairs (15):
  1.000  api-scaffolding-backend-architect <-> backend-api-security-backend-architect
  1.000  api-scaffolding-backend-architect <-> backend-development-backend-architect
  1.000  api-scaffolding-backend-architect <-> data-engineering-backend-architect
  1.000  api-scaffolding-backend-architect <-> database-cloud-optimization-backend-architect
  1.000  api-scaffolding-backend-architect <-> multi-platform-apps-backend-architect
  1.000  api-testing-observability-api-documenter <-> documentation-generation-api-documenter
  1.000  application-performance-frontend-developer <-> frontend-mobile-development-frontend-developer
  1.000  application-performance-frontend-developer <-> frontend-mobile-security-frontend-developer
  1.000  application-performance-frontend-developer <-> multi-platform-apps-frontend-developer
  1.000  backend-api-security-backend-architect <-> backend-development-backend-architect
  1.000  backend-api-security-backend-architect <-> data-engineering-backend-architect
  1.000  backend-api-security-backend-architect <-> database-cloud-optimization-backend-architect
  1.000  backend-api-security-backend-architect <-> multi-platform-apps-backend-architect
  1.000  backend-development-backend-architect <-> data-engineering-backend-architect
  1.000  backend-development-backend-architect <-> database-cloud-optimization-backend-architect

Findings: 2544 total (0 critical, 937 warning)
```

