# Benchmark — msitarzewski/agency-agents

- **Repo**: [msitarzewski/agency-agents](https://github.com/msitarzewski/agency-agents)
- **Pinned SHA**: `ad9264e309bd5e5422c04784372d7841b1e5d604`
- **Generated**: 2026-09-14

## Summary

- Agents scanned: **280**
- Top overlap pair (of top 15): **Backend Architect (github:msitarzewski/agency-agents@ad9264e309bd5e5422c04784372d7841b1e5d604) <-> Backend Architect (github:msitarzewski/agency-agents@ad9264e309bd5e5422c04784372d7841b1e5d604) (0.877)**
- No-harness agents (no tool restriction / wildcard tools): **263** (93.9% of roster)
- Roster fixed cost estimate: **~15519 tokens/turn**
- Total findings: **1118**

## Top 15 overlapping pairs

| Agent A | Agent B | Similarity |
| --- | --- | --- |
| Backend Architect (github:msitarzewski/agency-agents@ad9264e309bd5e5422c04784372d7841b1e5d604) | Backend Architect (github:msitarzewski/agency-agents@ad9264e309bd5e5422c04784372d7841b1e5d604) | 0.877 |
| Evidence Collector | Reality Checker | 0.817 |
| Drupal Shopping Cart Engineer | WordPress Shopping Cart Engineer | 0.676 |
| Drupal Performance Engineer | WordPress Performance Engineer | 0.646 |
| Section 508 Accessibility Specialist | Accessibility Auditor | 0.628 |
| Global Podcast Strategist | Podcast Strategist | 0.611 |
| Clinical Evidence Agent | Healthcare Innovation Strategist | 0.609 |
| Account Strategist | Customer Success Manager | 0.603 |
| Deal Strategist | Sales Engineer | 0.597 |
| Discovery Coach | Sales Engineer | 0.592 |
| Deal Strategist | Discovery Coach | 0.590 |
| Instagram Curator | Xiaohongshu Specialist | 0.551 |
| Financial Analyst | Chief Financial Officer | 0.550 |
| Application Security Engineer | Security Architect | 0.538 |
| Outbound Strategist | Sales Outreach | 0.533 |

## Reproduce

```sh
npm run build
node dist/cli.js audit --repo msitarzewski/agency-agents@ad9264e309bd5e5422c04784372d7841b1e5d604 --no-fail --top 15 --json
node dist/cli.js audit --repo msitarzewski/agency-agents@ad9264e309bd5e5422c04784372d7841b1e5d604 --no-fail --top 15
```

## CLI output

```
Roster Audit Report
Agents scanned: 280
Sources: github:msitarzewski/agency-agents@ad9264e309bd5e5422c04784372d7841b1e5d604

Top overlapping pairs (15):
  0.877  Backend Architect (github:msitarzewski/agency-agents@ad9264e309bd5e5422c04784372d7841b1e5d604) <-> Backend Architect (github:msitarzewski/agency-agents@ad9264e309bd5e5422c04784372d7841b1e5d604)
  0.817  Evidence Collector <-> Reality Checker
  0.676  Drupal Shopping Cart Engineer <-> WordPress Shopping Cart Engineer
  0.646  Drupal Performance Engineer <-> WordPress Performance Engineer
  0.628  Section 508 Accessibility Specialist <-> Accessibility Auditor
  0.611  Global Podcast Strategist <-> Podcast Strategist
  0.609  Clinical Evidence Agent <-> Healthcare Innovation Strategist
  0.603  Account Strategist <-> Customer Success Manager
  0.597  Deal Strategist <-> Sales Engineer
  0.592  Discovery Coach <-> Sales Engineer
  0.590  Deal Strategist <-> Discovery Coach
  0.551  Instagram Curator <-> Xiaohongshu Specialist
  0.550  Financial Analyst <-> Chief Financial Officer
  0.538  Application Security Engineer <-> Security Architect
  0.533  Outbound Strategist <-> Sales Outreach

Findings: 1118 total (0 critical, 263 warning)
```

