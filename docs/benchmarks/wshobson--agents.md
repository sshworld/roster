# Benchmark — wshobson/agents

- **Repo**: [wshobson/agents](https://github.com/wshobson/agents)
- **Pinned SHA**: `d6837ae274c2cd817acad3fb98f193a4390a4c3e`
- **Generated**: 2026-08-17

## Summary

- Agents scanned: **202**
- Top overlap pair (of top 15): **backend-api-security-backend-security-coder <-> data-validation-suite-backend-security-coder (1.000)**
- No-harness agents (no tool restriction / wildcard tools): **188** (93.1% of roster)
- Roster fixed cost estimate: **~14256 tokens/turn**
- Total findings: **804**

## Top 15 overlapping pairs

| Agent A | Agent B | Similarity |
| --- | --- | --- |
| backend-api-security-backend-security-coder | data-validation-suite-backend-security-coder | 1.000 |
| debugging-toolkit-dx-optimizer | team-collaboration-dx-optimizer | 1.000 |
| agent-orchestration-context-manager | context-management-context-manager | 1.000 |
| api-scaffolding-backend-architect | backend-api-security-backend-architect | 1.000 |
| api-scaffolding-backend-architect | backend-development-backend-architect | 1.000 |
| api-scaffolding-backend-architect | data-engineering-backend-architect | 1.000 |
| api-scaffolding-backend-architect | database-cloud-optimization-backend-architect | 1.000 |
| api-scaffolding-backend-architect | multi-platform-apps-backend-architect | 1.000 |
| api-scaffolding-fastapi-pro | python-development-fastapi-pro | 1.000 |
| api-testing-observability-api-documenter | documentation-generation-api-documenter | 1.000 |
| application-performance-frontend-developer | frontend-mobile-development-frontend-developer | 1.000 |
| application-performance-frontend-developer | frontend-mobile-security-frontend-developer | 1.000 |
| application-performance-frontend-developer | multi-platform-apps-frontend-developer | 1.000 |
| application-performance-performance-engineer | full-stack-orchestration-performance-engineer | 1.000 |
| application-performance-performance-engineer | observability-monitoring-performance-engineer | 1.000 |

## Reproduce

```sh
npm run build
node dist/cli.js audit --repo wshobson/agents@d6837ae274c2cd817acad3fb98f193a4390a4c3e --no-fail --top 15 --json
node dist/cli.js audit --repo wshobson/agents@d6837ae274c2cd817acad3fb98f193a4390a4c3e --no-fail --top 15
```

## CLI output

```
Roster Audit Report
Agents scanned: 202
Sources: github:wshobson/agents@d6837ae274c2cd817acad3fb98f193a4390a4c3e

Top overlapping pairs (15):
  1.000  backend-api-security-backend-security-coder <-> data-validation-suite-backend-security-coder
  1.000  debugging-toolkit-dx-optimizer <-> team-collaboration-dx-optimizer
  1.000  agent-orchestration-context-manager <-> context-management-context-manager
  1.000  api-scaffolding-backend-architect <-> backend-api-security-backend-architect
  1.000  api-scaffolding-backend-architect <-> backend-development-backend-architect
  1.000  api-scaffolding-backend-architect <-> data-engineering-backend-architect
  1.000  api-scaffolding-backend-architect <-> database-cloud-optimization-backend-architect
  1.000  api-scaffolding-backend-architect <-> multi-platform-apps-backend-architect
  1.000  api-scaffolding-fastapi-pro <-> python-development-fastapi-pro
  1.000  api-testing-observability-api-documenter <-> documentation-generation-api-documenter
  1.000  application-performance-frontend-developer <-> frontend-mobile-development-frontend-developer
  1.000  application-performance-frontend-developer <-> frontend-mobile-security-frontend-developer
  1.000  application-performance-frontend-developer <-> multi-platform-apps-frontend-developer
  1.000  application-performance-performance-engineer <-> full-stack-orchestration-performance-engineer
  1.000  application-performance-performance-engineer <-> observability-monitoring-performance-engineer

Findings: 804 total (0 critical, 188 warning)
```

