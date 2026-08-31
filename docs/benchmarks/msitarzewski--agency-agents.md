# Benchmark — msitarzewski/agency-agents

- **Repo**: [msitarzewski/agency-agents](https://github.com/msitarzewski/agency-agents)
- **Pinned SHA**: `3c9588880b7cafaec325a104899fd8bbe27e7d72`
- **Generated**: 2026-08-31

## Summary

- Agents scanned: **274**
- Top overlap pair (of top 15): **Backend Architect (github:msitarzewski/agency-agents@3c9588880b7cafaec325a104899fd8bbe27e7d72) <-> Backend Architect (github:msitarzewski/agency-agents@3c9588880b7cafaec325a104899fd8bbe27e7d72) (0.877)**
- No-harness agents (no tool restriction / wildcard tools): **257** (93.8% of roster)
- Roster fixed cost estimate: **~15161 tokens/turn**
- Total findings: **1093**

## Top 15 overlapping pairs

| Agent A | Agent B | Similarity |
| --- | --- | --- |
| Backend Architect (github:msitarzewski/agency-agents@3c9588880b7cafaec325a104899fd8bbe27e7d72) | Backend Architect (github:msitarzewski/agency-agents@3c9588880b7cafaec325a104899fd8bbe27e7d72) | 0.877 |
| Evidence Collector | Reality Checker | 0.817 |
| Drupal Shopping Cart Engineer | WordPress Shopping Cart Engineer | 0.677 |
| Drupal Performance Engineer | WordPress Performance Engineer | 0.645 |
| Section 508 Accessibility Specialist | Accessibility Auditor | 0.627 |
| Global Podcast Strategist | Podcast Strategist | 0.610 |
| Clinical Evidence Agent | Healthcare Innovation Strategist | 0.610 |
| Account Strategist | Customer Success Manager | 0.604 |
| Deal Strategist | Sales Engineer | 0.597 |
| Discovery Coach | Sales Engineer | 0.591 |
| Deal Strategist | Discovery Coach | 0.591 |
| Instagram Curator | Xiaohongshu Specialist | 0.551 |
| Financial Analyst | Chief Financial Officer | 0.550 |
| Application Security Engineer | Security Architect | 0.539 |
| Outbound Strategist | Sales Outreach | 0.535 |

## Reproduce

```sh
npm run build
node dist/cli.js audit --repo msitarzewski/agency-agents@3c9588880b7cafaec325a104899fd8bbe27e7d72 --no-fail --top 15 --json
node dist/cli.js audit --repo msitarzewski/agency-agents@3c9588880b7cafaec325a104899fd8bbe27e7d72 --no-fail --top 15
```

## CLI output

```
Roster Audit Report
Agents scanned: 274
Sources: github:msitarzewski/agency-agents@3c9588880b7cafaec325a104899fd8bbe27e7d72

Top overlapping pairs (15):
  0.877  Backend Architect (github:msitarzewski/agency-agents@3c9588880b7cafaec325a104899fd8bbe27e7d72) <-> Backend Architect (github:msitarzewski/agency-agents@3c9588880b7cafaec325a104899fd8bbe27e7d72)
  0.817  Evidence Collector <-> Reality Checker
  0.677  Drupal Shopping Cart Engineer <-> WordPress Shopping Cart Engineer
  0.645  Drupal Performance Engineer <-> WordPress Performance Engineer
  0.627  Section 508 Accessibility Specialist <-> Accessibility Auditor
  0.610  Global Podcast Strategist <-> Podcast Strategist
  0.610  Clinical Evidence Agent <-> Healthcare Innovation Strategist
  0.604  Account Strategist <-> Customer Success Manager
  0.597  Deal Strategist <-> Sales Engineer
  0.591  Discovery Coach <-> Sales Engineer
  0.591  Deal Strategist <-> Discovery Coach
  0.551  Instagram Curator <-> Xiaohongshu Specialist
  0.550  Financial Analyst <-> Chief Financial Officer
  0.539  Application Security Engineer <-> Security Architect
  0.535  Outbound Strategist <-> Sales Outreach

Findings: 1093 total (0 critical, 257 warning)
```

