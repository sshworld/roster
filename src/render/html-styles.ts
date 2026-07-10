export function htmlStyles(): string {
  return `
    :root {
      color-scheme: light;
      --bg: #f7f7f9;
      --card-bg: #ffffff;
      --border: #e2e2e8;
      --text: #1c1c22;
      --muted: #6b6b76;
      --accent: #3a5fd9;
      --critical: #c0392b;
      --warning: #b7791f;
      --info: #2c7a4b;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 2rem;
      background: var(--bg);
      color: var(--text);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      line-height: 1.5;
    }
    h1, h2, h3 { margin-top: 0; }
    .card {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 1.25rem 1.5rem;
      margin-bottom: 1.5rem;
    }
    .header-stats {
      display: flex;
      gap: 2rem;
      flex-wrap: wrap;
    }
    .stat { display: flex; flex-direction: column; }
    .stat .value { font-size: 1.75rem; font-weight: 700; }
    .stat .label { font-size: 0.85rem; color: var(--muted); }
    table {
      border-collapse: collapse;
      width: 100%;
    }
    th, td {
      text-align: left;
      padding: 0.5rem 0.75rem;
      border-bottom: 1px solid var(--border);
      font-size: 0.9rem;
    }
    th { color: var(--muted); font-weight: 600; }
    .score-cell {
      font-weight: 600;
      border-radius: 4px;
      padding: 0.15rem 0.5rem;
      display: inline-block;
    }
    .score-strong { background: #fbe4e1; color: var(--critical); }
    .score-mid { background: #fdf0d5; color: var(--warning); }
    .score-low { background: #e3f1e9; color: var(--info); }
    details {
      border: 1px solid var(--border);
      border-radius: 6px;
      padding: 0.5rem 0.75rem;
      margin-bottom: 0.5rem;
    }
    summary {
      cursor: pointer;
      font-weight: 600;
    }
    .finding-row {
      padding: 0.35rem 0;
      border-bottom: 1px solid var(--border);
      font-size: 0.9rem;
    }
    .finding-row:last-child { border-bottom: none; }
    .severity-badge {
      display: inline-block;
      border-radius: 999px;
      padding: 0.05rem 0.55rem;
      font-size: 0.75rem;
      font-weight: 700;
      text-transform: uppercase;
      margin-right: 0.5rem;
    }
    .severity-critical { background: #fbe4e1; color: var(--critical); }
    .severity-warning { background: #fdf0d5; color: var(--warning); }
    .severity-info { background: #e3f1e9; color: var(--info); }
    .empty-note { color: var(--muted); font-style: italic; }
  `.trim();
}
