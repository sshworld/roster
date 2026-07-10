export interface AgentDef {
  name: string;
  description: string;
  tools?: string[];
  model?: string;
  body: string;
  sourceLabel: string;
  filePath: string;
}

export type Severity = 'info' | 'warning' | 'critical';

export interface Finding {
  ruleId: string;
  severity: Severity;
  agent?: string;
  pair?: [string, string];
  score?: number;
  message: string;
}

export interface Report {
  agents: AgentDef[];
  findings: Finding[];
  meta: {
    sourceLabels: string[];
  };
}

export interface RosterSourceLoadOptions {
  [key: string]: unknown;
}

export interface RosterSource {
  id: string;
  description: string;
  load(opts?: RosterSourceLoadOptions): Promise<AgentDef[]>;
}

export interface RuleRunOptions {
  top?: number;
  failAbove?: number;
  [key: string]: unknown;
}

export interface Rule {
  id: string;
  description: string;
  run(agents: AgentDef[], opts?: RuleRunOptions): Finding[];
}

export interface RendererOptions {
  [key: string]: unknown;
}

export interface Renderer {
  id: string;
  render(report: Report, opts?: RendererOptions): string;
}

export class NotImplementedError extends Error {
  constructor(id: string) {
    super(`not implemented: ${id}`);
    this.name = 'NotImplementedError';
  }
}
