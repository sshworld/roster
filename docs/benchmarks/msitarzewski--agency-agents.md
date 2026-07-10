# Benchmark — msitarzewski/agency-agents

- **Repo**: [msitarzewski/agency-agents](https://github.com/msitarzewski/agency-agents)
- **Pinned SHA**: `9f3e401ccd09aa0ee0ef8e015226d0647908e01e`
- **Generated**: 2026-07-10

## Summary

- Agents scanned: **277**
- Top overlap pair (of top 15): **Backend Architect <-> Backend Architect (0.878)**
- No-harness agents (no tool restriction / wildcard tools): **260** (93.9% of roster)
- Roster fixed cost estimate: **~14024 tokens/turn**
- Total findings: **1099**

## Top 15 overlapping pairs

| Agent A | Agent B | Similarity |
| --- | --- | --- |
| Backend Architect | Backend Architect | 0.878 |
| Evidence Collector | Reality Checker | 0.812 |
| workflow-startup-mvp | workflow-with-memory | 0.740 |
| workflow-book-chapter | Book Co-Author | 0.711 |
| agent-activation-prompts | nexus-strategy | 0.698 |
| nexus-strategy | phase-3-build | 0.679 |
| Drupal Shopping Cart Engineer | WordPress Shopping Cart Engineer | 0.678 |
| nexus-strategy | scenario-enterprise-feature | 0.643 |
| Drupal Performance Engineer | WordPress Performance Engineer | 0.642 |
| Section 508 Accessibility Specialist | Accessibility Auditor | 0.627 |
| nexus-strategy | scenario-startup-mvp | 0.622 |
| Clinical Evidence Agent | Healthcare Innovation Strategist | 0.615 |
| Global Podcast Strategist | Podcast Strategist | 0.611 |
| agent-activation-prompts | phase-3-build | 0.604 |
| Account Strategist | Customer Success Manager | 0.603 |

## Reproduce

```sh
npm run build
node dist/cli.js audit --repo msitarzewski/agency-agents@9f3e401ccd09aa0ee0ef8e015226d0647908e01e --no-fail --top 15 --json
node dist/cli.js audit --repo msitarzewski/agency-agents@9f3e401ccd09aa0ee0ef8e015226d0647908e01e --no-fail --top 15
```

## CLI output

```
Roster Audit Report
Agents scanned: 277
Sources: github:msitarzewski/agency-agents@9f3e401ccd09aa0ee0ef8e015226d0647908e01e

Top overlapping pairs (15):
  0.878  Backend Architect <-> Backend Architect
  0.812  Evidence Collector <-> Reality Checker
  0.740  workflow-startup-mvp <-> workflow-with-memory
  0.711  workflow-book-chapter <-> Book Co-Author
  0.698  agent-activation-prompts <-> nexus-strategy
  0.679  nexus-strategy <-> phase-3-build
  0.678  Drupal Shopping Cart Engineer <-> WordPress Shopping Cart Engineer
  0.643  nexus-strategy <-> scenario-enterprise-feature
  0.642  Drupal Performance Engineer <-> WordPress Performance Engineer
  0.627  Section 508 Accessibility Specialist <-> Accessibility Auditor
  0.622  nexus-strategy <-> scenario-startup-mvp
  0.615  Clinical Evidence Agent <-> Healthcare Innovation Strategist
  0.611  Global Podcast Strategist <-> Podcast Strategist
  0.604  agent-activation-prompts <-> phase-3-build
  0.603  Account Strategist <-> Customer Success Manager

Findings: 1099 total (0 critical, 282 warning)
```

