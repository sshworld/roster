# Benchmark — msitarzewski/agency-agents

- **Repo**: [msitarzewski/agency-agents](https://github.com/msitarzewski/agency-agents)
- **Pinned SHA**: `652b2692f8d8ec2b1f1a38e559073e287dfdc469`
- **Generated**: 2026-10-19

## Summary

- Agents scanned: **283**
- Top overlap pair (of top 15): **Backend Architect (github:msitarzewski/agency-agents@652b2692f8d8ec2b1f1a38e559073e287dfdc469) <-> Backend Architect (github:msitarzewski/agency-agents@652b2692f8d8ec2b1f1a38e559073e287dfdc469) (0.872)**
- No-harness agents (no tool restriction / wildcard tools): **266** (94.0% of roster)
- Roster fixed cost estimate: **~15683 tokens/turn**
- Total findings: **1130**

## Top 15 overlapping pairs

| Agent A | Agent B | Similarity |
| --- | --- | --- |
| Backend Architect (github:msitarzewski/agency-agents@652b2692f8d8ec2b1f1a38e559073e287dfdc469) | Backend Architect (github:msitarzewski/agency-agents@652b2692f8d8ec2b1f1a38e559073e287dfdc469) | 0.872 |
| Evidence Collector | Reality Checker | 0.791 |
| Drupal Shopping Cart Engineer | WordPress Shopping Cart Engineer | 0.676 |
| Section 508 Accessibility Specialist | Accessibility Auditor | 0.661 |
| Drupal Performance Engineer | WordPress Performance Engineer | 0.646 |
| Global Podcast Strategist | Podcast Strategist | 0.610 |
| Clinical Evidence Agent | Healthcare Innovation Strategist | 0.606 |
| Account Strategist | Customer Success Manager | 0.604 |
| Deal Strategist | Sales Engineer | 0.595 |
| Discovery Coach | Sales Engineer | 0.589 |
| Deal Strategist | Discovery Coach | 0.588 |
| DX Engineer | Developer Advocate | 0.582 |
| Financial Analyst | Chief Financial Officer | 0.550 |
| Instagram Curator | Xiaohongshu Specialist | 0.549 |
| Outbound Strategist | Sales Outreach | 0.533 |

## Reproduce

```sh
npm run build
node dist/cli.js audit --repo msitarzewski/agency-agents@652b2692f8d8ec2b1f1a38e559073e287dfdc469 --no-fail --top 15 --json
node dist/cli.js audit --repo msitarzewski/agency-agents@652b2692f8d8ec2b1f1a38e559073e287dfdc469 --no-fail --top 15
```

## CLI output

```
Roster Audit Report
Agents scanned: 283
Sources: github:msitarzewski/agency-agents@652b2692f8d8ec2b1f1a38e559073e287dfdc469

Top overlapping pairs (15):
  0.872  Backend Architect (github:msitarzewski/agency-agents@652b2692f8d8ec2b1f1a38e559073e287dfdc469) <-> Backend Architect (github:msitarzewski/agency-agents@652b2692f8d8ec2b1f1a38e559073e287dfdc469)
  0.791  Evidence Collector <-> Reality Checker
  0.676  Drupal Shopping Cart Engineer <-> WordPress Shopping Cart Engineer
  0.661  Section 508 Accessibility Specialist <-> Accessibility Auditor
  0.646  Drupal Performance Engineer <-> WordPress Performance Engineer
  0.610  Global Podcast Strategist <-> Podcast Strategist
  0.606  Clinical Evidence Agent <-> Healthcare Innovation Strategist
  0.604  Account Strategist <-> Customer Success Manager
  0.595  Deal Strategist <-> Sales Engineer
  0.589  Discovery Coach <-> Sales Engineer
  0.588  Deal Strategist <-> Discovery Coach
  0.582  DX Engineer <-> Developer Advocate
  0.550  Financial Analyst <-> Chief Financial Officer
  0.549  Instagram Curator <-> Xiaohongshu Specialist
  0.533  Outbound Strategist <-> Sales Outreach

Findings: 1130 total (0 critical, 266 warning)
```

