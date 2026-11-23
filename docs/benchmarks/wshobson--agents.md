# Benchmark — wshobson/agents

- **Repo**: [wshobson/agents](https://github.com/wshobson/agents)
- **Pinned SHA**: `51b9ae3ac68d9c236549a9b57f5dca7e6c0c168c`
- **Generated**: 2026-11-23

## Summary

- Agents scanned: **199**
- Top overlap pair (of top 15): **api-scaffolding-fastapi-pro <-> python-development-fastapi-pro (1.000)**
- No-harness agents (no tool restriction / wildcard tools): **187** (94.0% of roster)
- Roster fixed cost estimate: **~14063 tokens/turn**
- Total findings: **794**

## Top 15 overlapping pairs

| Agent A | Agent B | Similarity |
| --- | --- | --- |
| api-scaffolding-fastapi-pro | python-development-fastapi-pro | 1.000 |
| application-performance-observability-engineer | observability-monitoring-observability-engineer | 1.000 |
| cicd-automation-terraform-specialist | cloud-infrastructure-terraform-specialist | 1.000 |
| cicd-automation-terraform-specialist | deployment-strategies-terraform-specialist | 1.000 |
| cloud-infrastructure-terraform-specialist | deployment-strategies-terraform-specialist | 1.000 |
| code-refactoring-legacy-modernizer | dependency-management-legacy-modernizer | 1.000 |
| code-refactoring-legacy-modernizer | framework-migration-legacy-modernizer | 1.000 |
| dependency-management-legacy-modernizer | framework-migration-legacy-modernizer | 1.000 |
| distributed-debugging-error-detective | error-debugging-error-detective | 1.000 |
| distributed-debugging-error-detective | error-diagnostics-error-detective | 1.000 |
| error-debugging-error-detective | error-diagnostics-error-detective | 1.000 |
| frontend-mobile-development-mobile-developer | multi-platform-apps-mobile-developer | 1.000 |
| api-scaffolding-graphql-architect | backend-development-graphql-architect | 1.000 |
| api-testing-observability-api-documenter | documentation-generation-api-documenter | 1.000 |
| application-performance-frontend-developer | frontend-mobile-development-frontend-developer | 1.000 |

## Reproduce

```sh
npm run build
node dist/cli.js audit --repo wshobson/agents@51b9ae3ac68d9c236549a9b57f5dca7e6c0c168c --no-fail --top 15 --json
node dist/cli.js audit --repo wshobson/agents@51b9ae3ac68d9c236549a9b57f5dca7e6c0c168c --no-fail --top 15
```

## CLI output

```
Roster Audit Report
Agents scanned: 199
Sources: github:wshobson/agents@51b9ae3ac68d9c236549a9b57f5dca7e6c0c168c

Top overlapping pairs (15):
  1.000  api-scaffolding-fastapi-pro <-> python-development-fastapi-pro
  1.000  application-performance-observability-engineer <-> observability-monitoring-observability-engineer
  1.000  cicd-automation-terraform-specialist <-> cloud-infrastructure-terraform-specialist
  1.000  cicd-automation-terraform-specialist <-> deployment-strategies-terraform-specialist
  1.000  cloud-infrastructure-terraform-specialist <-> deployment-strategies-terraform-specialist
  1.000  code-refactoring-legacy-modernizer <-> dependency-management-legacy-modernizer
  1.000  code-refactoring-legacy-modernizer <-> framework-migration-legacy-modernizer
  1.000  dependency-management-legacy-modernizer <-> framework-migration-legacy-modernizer
  1.000  distributed-debugging-error-detective <-> error-debugging-error-detective
  1.000  distributed-debugging-error-detective <-> error-diagnostics-error-detective
  1.000  error-debugging-error-detective <-> error-diagnostics-error-detective
  1.000  frontend-mobile-development-mobile-developer <-> multi-platform-apps-mobile-developer
  1.000  api-scaffolding-graphql-architect <-> backend-development-graphql-architect
  1.000  api-testing-observability-api-documenter <-> documentation-generation-api-documenter
  1.000  application-performance-frontend-developer <-> frontend-mobile-development-frontend-developer

Findings: 794 total (0 critical, 187 warning)
```

