# Benchmark — msitarzewski/agency-agents

- **Repo**: [msitarzewski/agency-agents](https://github.com/msitarzewski/agency-agents)
- **Pinned SHA**: `ebe9c99acb5c96f9468de368d8bead775387d1a7`
- **Generated**: 2026-08-24

## Summary

- Agents scanned: **271**
- Top overlap pair (of top 15): **Backend Architect (github:msitarzewski/agency-agents@ebe9c99acb5c96f9468de368d8bead775387d1a7) <-> Backend Architect (github:msitarzewski/agency-agents@ebe9c99acb5c96f9468de368d8bead775387d1a7) (0.877)**
- No-harness agents (no tool restriction / wildcard tools): **254** (93.7% of roster)
- Roster fixed cost estimate: **~15000 tokens/turn**
- Total findings: **1081**

## Top 15 overlapping pairs

| Agent A | Agent B | Similarity |
| --- | --- | --- |
| Backend Architect (github:msitarzewski/agency-agents@ebe9c99acb5c96f9468de368d8bead775387d1a7) | Backend Architect (github:msitarzewski/agency-agents@ebe9c99acb5c96f9468de368d8bead775387d1a7) | 0.877 |
| Evidence Collector | Reality Checker | 0.816 |
| Drupal Shopping Cart Engineer | WordPress Shopping Cart Engineer | 0.677 |
| Drupal Performance Engineer | WordPress Performance Engineer | 0.645 |
| Section 508 Accessibility Specialist | Accessibility Auditor | 0.627 |
| Clinical Evidence Agent | Healthcare Innovation Strategist | 0.612 |
| Global Podcast Strategist | Podcast Strategist | 0.610 |
| Account Strategist | Customer Success Manager | 0.604 |
| Deal Strategist | Sales Engineer | 0.597 |
| Discovery Coach | Sales Engineer | 0.592 |
| Deal Strategist | Discovery Coach | 0.591 |
| Instagram Curator | Xiaohongshu Specialist | 0.551 |
| Financial Analyst | Chief Financial Officer | 0.549 |
| Application Security Engineer | Security Architect | 0.540 |
| Outbound Strategist | Sales Outreach | 0.535 |

## Reproduce

```sh
npm run build
node dist/cli.js audit --repo msitarzewski/agency-agents@ebe9c99acb5c96f9468de368d8bead775387d1a7 --no-fail --top 15 --json
node dist/cli.js audit --repo msitarzewski/agency-agents@ebe9c99acb5c96f9468de368d8bead775387d1a7 --no-fail --top 15
```

## CLI output

```
Roster Audit Report
Agents scanned: 271
Sources: github:msitarzewski/agency-agents@ebe9c99acb5c96f9468de368d8bead775387d1a7

Top overlapping pairs (15):
  0.877  Backend Architect (github:msitarzewski/agency-agents@ebe9c99acb5c96f9468de368d8bead775387d1a7) <-> Backend Architect (github:msitarzewski/agency-agents@ebe9c99acb5c96f9468de368d8bead775387d1a7)
  0.816  Evidence Collector <-> Reality Checker
  0.677  Drupal Shopping Cart Engineer <-> WordPress Shopping Cart Engineer
  0.645  Drupal Performance Engineer <-> WordPress Performance Engineer
  0.627  Section 508 Accessibility Specialist <-> Accessibility Auditor
  0.612  Clinical Evidence Agent <-> Healthcare Innovation Strategist
  0.610  Global Podcast Strategist <-> Podcast Strategist
  0.604  Account Strategist <-> Customer Success Manager
  0.597  Deal Strategist <-> Sales Engineer
  0.592  Discovery Coach <-> Sales Engineer
  0.591  Deal Strategist <-> Discovery Coach
  0.551  Instagram Curator <-> Xiaohongshu Specialist
  0.549  Financial Analyst <-> Chief Financial Officer
  0.540  Application Security Engineer <-> Security Architect
  0.535  Outbound Strategist <-> Sales Outreach

Findings: 1081 total (0 critical, 254 warning)
```

