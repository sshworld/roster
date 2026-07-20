# Benchmark — wshobson/agents

- **Repo**: [wshobson/agents](https://github.com/wshobson/agents)
- **Pinned SHA**: `c4b82b0ad771190355eb8e204b1329732a18449a`
- **Generated**: 2026-07-20

## Summary

- Agents scanned: **204**
- Top overlap pair (of top 15): **api-scaffolding-graphql-architect <-> backend-development-graphql-architect (1.000)**
- No-harness agents (no tool restriction / wildcard tools): **189** (92.6% of roster)
- Roster fixed cost estimate: **~14331 tokens/turn**
- Total findings: **809**

## Top 15 overlapping pairs

| Agent A | Agent B | Similarity |
| --- | --- | --- |
| api-scaffolding-graphql-architect | backend-development-graphql-architect | 1.000 |
| backend-api-security-backend-security-coder | data-validation-suite-backend-security-coder | 1.000 |
| cicd-automation-cloud-architect | cloud-infrastructure-cloud-architect | 1.000 |
| cicd-automation-cloud-architect | database-cloud-optimization-cloud-architect | 1.000 |
| cicd-automation-cloud-architect | deployment-validation-cloud-architect | 1.000 |
| cloud-infrastructure-cloud-architect | database-cloud-optimization-cloud-architect | 1.000 |
| cloud-infrastructure-cloud-architect | deployment-validation-cloud-architect | 1.000 |
| comprehensive-review-architect-review | framework-migration-architect-review | 1.000 |
| database-cloud-optimization-cloud-architect | deployment-validation-cloud-architect | 1.000 |
| database-cloud-optimization-database-optimizer | database-migrations-database-optimizer | 1.000 |
| database-cloud-optimization-database-optimizer | observability-monitoring-database-optimizer | 1.000 |
| database-migrations-database-optimizer | observability-monitoring-database-optimizer | 1.000 |
| distributed-debugging-error-detective | error-debugging-error-detective | 1.000 |
| distributed-debugging-error-detective | error-diagnostics-error-detective | 1.000 |
| error-debugging-error-detective | error-diagnostics-error-detective | 1.000 |

## Reproduce

```sh
npm run build
node dist/cli.js audit --repo wshobson/agents@c4b82b0ad771190355eb8e204b1329732a18449a --no-fail --top 15 --json
node dist/cli.js audit --repo wshobson/agents@c4b82b0ad771190355eb8e204b1329732a18449a --no-fail --top 15
```

## CLI output

```
Roster Audit Report
Agents scanned: 204
Sources: github:wshobson/agents@c4b82b0ad771190355eb8e204b1329732a18449a

Top overlapping pairs (15):
  1.000  api-scaffolding-graphql-architect <-> backend-development-graphql-architect
  1.000  backend-api-security-backend-security-coder <-> data-validation-suite-backend-security-coder
  1.000  cicd-automation-cloud-architect <-> cloud-infrastructure-cloud-architect
  1.000  cicd-automation-cloud-architect <-> database-cloud-optimization-cloud-architect
  1.000  cicd-automation-cloud-architect <-> deployment-validation-cloud-architect
  1.000  cloud-infrastructure-cloud-architect <-> database-cloud-optimization-cloud-architect
  1.000  cloud-infrastructure-cloud-architect <-> deployment-validation-cloud-architect
  1.000  comprehensive-review-architect-review <-> framework-migration-architect-review
  1.000  database-cloud-optimization-cloud-architect <-> deployment-validation-cloud-architect
  1.000  database-cloud-optimization-database-optimizer <-> database-migrations-database-optimizer
  1.000  database-cloud-optimization-database-optimizer <-> observability-monitoring-database-optimizer
  1.000  database-migrations-database-optimizer <-> observability-monitoring-database-optimizer
  1.000  distributed-debugging-error-detective <-> error-debugging-error-detective
  1.000  distributed-debugging-error-detective <-> error-diagnostics-error-detective
  1.000  error-debugging-error-detective <-> error-diagnostics-error-detective

Findings: 809 total (0 critical, 189 warning)
```

