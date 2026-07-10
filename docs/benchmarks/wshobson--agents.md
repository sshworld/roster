# Benchmark — wshobson/agents

- **Repo**: [wshobson/agents](https://github.com/wshobson/agents)
- **Pinned SHA**: `d7cf7dca8c4c7d0635e284f77204daa85552bfa4`
- **Generated**: 2026-07-10

## Summary

- Agents scanned: **691**
- Top overlap pair (of top 15): **api-scaffolding-backend-architect <-> backend-api-security-backend-architect (1.000)**
- No-harness agents (no tool restriction / wildcard tools): **676** (97.8% of roster)
- Roster fixed cost estimate: **~24853 tokens/turn**
- Total findings: **2561**

## Top 15 overlapping pairs

| Agent A | Agent B | Similarity |
| --- | --- | --- |
| api-scaffolding-backend-architect | backend-api-security-backend-architect | 1.000 |
| api-scaffolding-backend-architect | backend-development-backend-architect | 1.000 |
| api-scaffolding-backend-architect | data-engineering-backend-architect | 1.000 |
| api-scaffolding-backend-architect | database-cloud-optimization-backend-architect | 1.000 |
| api-scaffolding-backend-architect | multi-platform-apps-backend-architect | 1.000 |
| backend-api-security-backend-architect | backend-development-backend-architect | 1.000 |
| backend-api-security-backend-architect | data-engineering-backend-architect | 1.000 |
| backend-api-security-backend-architect | database-cloud-optimization-backend-architect | 1.000 |
| backend-api-security-backend-architect | multi-platform-apps-backend-architect | 1.000 |
| backend-api-security-backend-security-coder | data-validation-suite-backend-security-coder | 1.000 |
| backend-development-backend-architect | data-engineering-backend-architect | 1.000 |
| backend-development-backend-architect | database-cloud-optimization-backend-architect | 1.000 |
| backend-development-backend-architect | multi-platform-apps-backend-architect | 1.000 |
| cloud-infrastructure-network-engineer | observability-monitoring-network-engineer | 1.000 |
| doc-generate | doc-generate | 1.000 |

## Reproduce

```sh
npm run build
node dist/cli.js audit --repo wshobson/agents@d7cf7dca8c4c7d0635e284f77204daa85552bfa4 --no-fail --top 15 --json
node dist/cli.js audit --repo wshobson/agents@d7cf7dca8c4c7d0635e284f77204daa85552bfa4 --no-fail --top 15
```

## CLI output

```
Roster Audit Report
Agents scanned: 691
Sources: github:wshobson/agents@d7cf7dca8c4c7d0635e284f77204daa85552bfa4

Top overlapping pairs (15):
  1.000  api-scaffolding-backend-architect <-> backend-api-security-backend-architect
  1.000  api-scaffolding-backend-architect <-> backend-development-backend-architect
  1.000  api-scaffolding-backend-architect <-> data-engineering-backend-architect
  1.000  api-scaffolding-backend-architect <-> database-cloud-optimization-backend-architect
  1.000  api-scaffolding-backend-architect <-> multi-platform-apps-backend-architect
  1.000  backend-api-security-backend-architect <-> backend-development-backend-architect
  1.000  backend-api-security-backend-architect <-> data-engineering-backend-architect
  1.000  backend-api-security-backend-architect <-> database-cloud-optimization-backend-architect
  1.000  backend-api-security-backend-architect <-> multi-platform-apps-backend-architect
  1.000  backend-api-security-backend-security-coder <-> data-validation-suite-backend-security-coder
  1.000  backend-development-backend-architect <-> data-engineering-backend-architect
  1.000  backend-development-backend-architect <-> database-cloud-optimization-backend-architect
  1.000  backend-development-backend-architect <-> multi-platform-apps-backend-architect
  1.000  cloud-infrastructure-network-engineer <-> observability-monitoring-network-engineer
  1.000  doc-generate <-> doc-generate

Findings: 2561 total (0 critical, 941 warning)
```

