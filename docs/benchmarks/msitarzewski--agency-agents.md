# Benchmark — msitarzewski/agency-agents

- **Repo**: [msitarzewski/agency-agents](https://github.com/msitarzewski/agency-agents)
- **Pinned SHA**: `9f3e401ccd09aa0ee0ef8e015226d0647908e01e`
- **Generated**: 2026-07-14

## Summary

- Agents scanned: **255**
- Top overlap pair (of top 15): **Backend Architect (github:msitarzewski/agency-agents@9f3e401ccd09aa0ee0ef8e015226d0647908e01e) <-> Backend Architect (github:msitarzewski/agency-agents@9f3e401ccd09aa0ee0ef8e015226d0647908e01e) (0.879)**
- No-harness agents (no tool restriction / wildcard tools): **238** (93.3% of roster)
- Roster fixed cost estimate: **~14024 tokens/turn**
- Total findings: **1017**

## Top 15 overlapping pairs

| Agent A | Agent B | Similarity |
| --- | --- | --- |
| Backend Architect (github:msitarzewski/agency-agents@9f3e401ccd09aa0ee0ef8e015226d0647908e01e) | Backend Architect (github:msitarzewski/agency-agents@9f3e401ccd09aa0ee0ef8e015226d0647908e01e) | 0.879 |
| Evidence Collector | Reality Checker | 0.819 |
| Drupal Shopping Cart Engineer | WordPress Shopping Cart Engineer | 0.680 |
| Drupal Performance Engineer | WordPress Performance Engineer | 0.645 |
| Section 508 Accessibility Specialist | Accessibility Auditor | 0.628 |
| Clinical Evidence Agent | Healthcare Innovation Strategist | 0.614 |
| Global Podcast Strategist | Podcast Strategist | 0.610 |
| Account Strategist | Customer Success Manager | 0.603 |
| Deal Strategist | Sales Engineer | 0.596 |
| Discovery Coach | Sales Engineer | 0.592 |
| Deal Strategist | Discovery Coach | 0.592 |
| Instagram Curator | Xiaohongshu Specialist | 0.552 |
| Financial Analyst | Chief Financial Officer | 0.549 |
| Application Security Engineer | Security Architect | 0.540 |
| Outbound Strategist | Sales Outreach | 0.537 |

## Reproduce

```sh
npm run build
node dist/cli.js audit --repo msitarzewski/agency-agents@9f3e401ccd09aa0ee0ef8e015226d0647908e01e --no-fail --top 15 --json
node dist/cli.js audit --repo msitarzewski/agency-agents@9f3e401ccd09aa0ee0ef8e015226d0647908e01e --no-fail --top 15
```

## CLI output

```
Roster Audit Report
Agents scanned: 255
Sources: github:msitarzewski/agency-agents@9f3e401ccd09aa0ee0ef8e015226d0647908e01e

Top overlapping pairs (15):
  0.879  Backend Architect (github:msitarzewski/agency-agents@9f3e401ccd09aa0ee0ef8e015226d0647908e01e) <-> Backend Architect (github:msitarzewski/agency-agents@9f3e401ccd09aa0ee0ef8e015226d0647908e01e)
  0.819  Evidence Collector <-> Reality Checker
  0.680  Drupal Shopping Cart Engineer <-> WordPress Shopping Cart Engineer
  0.645  Drupal Performance Engineer <-> WordPress Performance Engineer
  0.628  Section 508 Accessibility Specialist <-> Accessibility Auditor
  0.614  Clinical Evidence Agent <-> Healthcare Innovation Strategist
  0.610  Global Podcast Strategist <-> Podcast Strategist
  0.603  Account Strategist <-> Customer Success Manager
  0.596  Deal Strategist <-> Sales Engineer
  0.592  Discovery Coach <-> Sales Engineer
  0.592  Deal Strategist <-> Discovery Coach
  0.552  Instagram Curator <-> Xiaohongshu Specialist
  0.549  Financial Analyst <-> Chief Financial Officer
  0.540  Application Security Engineer <-> Security Architect
  0.537  Outbound Strategist <-> Sales Outreach

Findings: 1017 total (0 critical, 238 warning)
```

