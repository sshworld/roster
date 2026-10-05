# Benchmark — wshobson/agents

- **Repo**: [wshobson/agents](https://github.com/wshobson/agents)
- **Pinned SHA**: `46891e7e60da0e52baf1050b7b6391b64e84c6d9`
- **Generated**: 2026-10-05

## Summary

- Agents scanned: **202**
- Top overlap pair (of top 15): **api-scaffolding-backend-architect <-> backend-api-security-backend-architect (1.000)**
- No-harness agents (no tool restriction / wildcard tools): **188** (93.1% of roster)
- Roster fixed cost estimate: **~14253 tokens/turn**
- Total findings: **804**

## Top 15 overlapping pairs

| Agent A | Agent B | Similarity |
| --- | --- | --- |
| api-scaffolding-backend-architect | backend-api-security-backend-architect | 1.000 |
| api-scaffolding-backend-architect | backend-development-backend-architect | 1.000 |
| api-scaffolding-backend-architect | data-engineering-backend-architect | 1.000 |
| api-scaffolding-backend-architect | database-cloud-optimization-backend-architect | 1.000 |
| api-scaffolding-backend-architect | multi-platform-apps-backend-architect | 1.000 |
| api-scaffolding-django-pro | python-development-django-pro | 1.000 |
| backend-api-security-backend-architect | backend-development-backend-architect | 1.000 |
| backend-api-security-backend-architect | data-engineering-backend-architect | 1.000 |
| backend-api-security-backend-architect | database-cloud-optimization-backend-architect | 1.000 |
| backend-api-security-backend-architect | multi-platform-apps-backend-architect | 1.000 |
| backend-development-backend-architect | data-engineering-backend-architect | 1.000 |
| backend-development-backend-architect | database-cloud-optimization-backend-architect | 1.000 |
| backend-development-backend-architect | multi-platform-apps-backend-architect | 1.000 |
| backend-development-tdd-orchestrator | tdd-workflows-tdd-orchestrator | 1.000 |
| cicd-automation-cloud-architect | cloud-infrastructure-cloud-architect | 1.000 |

## Reproduce

```sh
npm run build
node dist/cli.js audit --repo wshobson/agents@46891e7e60da0e52baf1050b7b6391b64e84c6d9 --no-fail --top 15 --json
node dist/cli.js audit --repo wshobson/agents@46891e7e60da0e52baf1050b7b6391b64e84c6d9 --no-fail --top 15
```

## CLI output

```
Roster Audit Report
Agents scanned: 202
Sources: github:wshobson/agents@46891e7e60da0e52baf1050b7b6391b64e84c6d9

Top overlapping pairs (15):
  1.000  api-scaffolding-backend-architect <-> backend-api-security-backend-architect
  1.000  api-scaffolding-backend-architect <-> backend-development-backend-architect
  1.000  api-scaffolding-backend-architect <-> data-engineering-backend-architect
  1.000  api-scaffolding-backend-architect <-> database-cloud-optimization-backend-architect
  1.000  api-scaffolding-backend-architect <-> multi-platform-apps-backend-architect
  1.000  api-scaffolding-django-pro <-> python-development-django-pro
  1.000  backend-api-security-backend-architect <-> backend-development-backend-architect
  1.000  backend-api-security-backend-architect <-> data-engineering-backend-architect
  1.000  backend-api-security-backend-architect <-> database-cloud-optimization-backend-architect
  1.000  backend-api-security-backend-architect <-> multi-platform-apps-backend-architect
  1.000  backend-development-backend-architect <-> data-engineering-backend-architect
  1.000  backend-development-backend-architect <-> database-cloud-optimization-backend-architect
  1.000  backend-development-backend-architect <-> multi-platform-apps-backend-architect
  1.000  backend-development-tdd-orchestrator <-> tdd-workflows-tdd-orchestrator
  1.000  cicd-automation-cloud-architect <-> cloud-infrastructure-cloud-architect

Findings: 804 total (0 critical, 188 warning)
```

