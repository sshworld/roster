# Benchmark — msitarzewski/agency-agents

- **Repo**: [msitarzewski/agency-agents](https://github.com/msitarzewski/agency-agents)
- **Pinned SHA**: `459dce837db3bdfdc4763d3fefd1fd854e73c8f1`
- **Generated**: 2026-07-20

## Summary

- Agents scanned: **264**
- Top overlap pair (of top 15): **Backend Architect (github:msitarzewski/agency-agents@459dce837db3bdfdc4763d3fefd1fd854e73c8f1) <-> Backend Architect (github:msitarzewski/agency-agents@459dce837db3bdfdc4763d3fefd1fd854e73c8f1) (0.877)**
- No-harness agents (no tool restriction / wildcard tools): **247** (93.6% of roster)
- Roster fixed cost estimate: **~14627 tokens/turn**
- Total findings: **1053**

## Top 15 overlapping pairs

| Agent A | Agent B | Similarity |
| --- | --- | --- |
| Backend Architect (github:msitarzewski/agency-agents@459dce837db3bdfdc4763d3fefd1fd854e73c8f1) | Backend Architect (github:msitarzewski/agency-agents@459dce837db3bdfdc4763d3fefd1fd854e73c8f1) | 0.877 |
| Evidence Collector | Reality Checker | 0.818 |
| Drupal Shopping Cart Engineer | WordPress Shopping Cart Engineer | 0.678 |
| Drupal Performance Engineer | WordPress Performance Engineer | 0.645 |
| Section 508 Accessibility Specialist | Accessibility Auditor | 0.629 |
| Clinical Evidence Agent | Healthcare Innovation Strategist | 0.614 |
| Global Podcast Strategist | Podcast Strategist | 0.610 |
| Account Strategist | Customer Success Manager | 0.604 |
| Deal Strategist | Sales Engineer | 0.597 |
| Discovery Coach | Sales Engineer | 0.592 |
| Deal Strategist | Discovery Coach | 0.592 |
| Instagram Curator | Xiaohongshu Specialist | 0.551 |
| Financial Analyst | Chief Financial Officer | 0.549 |
| Application Security Engineer | Security Architect | 0.539 |
| Outbound Strategist | Sales Outreach | 0.536 |

## Reproduce

```sh
npm run build
node dist/cli.js audit --repo msitarzewski/agency-agents@459dce837db3bdfdc4763d3fefd1fd854e73c8f1 --no-fail --top 15 --json
node dist/cli.js audit --repo msitarzewski/agency-agents@459dce837db3bdfdc4763d3fefd1fd854e73c8f1 --no-fail --top 15
```

## CLI output

```
Roster Audit Report
Agents scanned: 264
Sources: github:msitarzewski/agency-agents@459dce837db3bdfdc4763d3fefd1fd854e73c8f1

Top overlapping pairs (15):
  0.877  Backend Architect (github:msitarzewski/agency-agents@459dce837db3bdfdc4763d3fefd1fd854e73c8f1) <-> Backend Architect (github:msitarzewski/agency-agents@459dce837db3bdfdc4763d3fefd1fd854e73c8f1)
  0.818  Evidence Collector <-> Reality Checker
  0.678  Drupal Shopping Cart Engineer <-> WordPress Shopping Cart Engineer
  0.645  Drupal Performance Engineer <-> WordPress Performance Engineer
  0.629  Section 508 Accessibility Specialist <-> Accessibility Auditor
  0.614  Clinical Evidence Agent <-> Healthcare Innovation Strategist
  0.610  Global Podcast Strategist <-> Podcast Strategist
  0.604  Account Strategist <-> Customer Success Manager
  0.597  Deal Strategist <-> Sales Engineer
  0.592  Discovery Coach <-> Sales Engineer
  0.592  Deal Strategist <-> Discovery Coach
  0.551  Instagram Curator <-> Xiaohongshu Specialist
  0.549  Financial Analyst <-> Chief Financial Officer
  0.539  Application Security Engineer <-> Security Architect
  0.536  Outbound Strategist <-> Sales Outreach

Findings: 1053 total (0 critical, 247 warning)
```

