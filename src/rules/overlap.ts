import type { AgentDef, Finding, Rule } from '../core/types.js';

const DEFAULT_TOP = 10;

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

export function buildVectors(docs: string[][]): Map<string, number>[] {
  const documentFrequency = new Map<string, number>();
  for (const doc of docs) {
    for (const term of new Set(doc)) {
      documentFrequency.set(term, (documentFrequency.get(term) ?? 0) + 1);
    }
  }

  const n = docs.length;
  const idf = new Map<string, number>();
  for (const [term, df] of documentFrequency) {
    idf.set(term, Math.log((n + 1) / (df + 1)) + 1);
  }

  return docs.map((doc) => {
    const termFrequency = new Map<string, number>();
    for (const term of doc) {
      termFrequency.set(term, (termFrequency.get(term) ?? 0) + 1);
    }

    const vector = new Map<string, number>();
    for (const [term, count] of termFrequency) {
      const weight = (count / doc.length) * (idf.get(term) ?? 0);
      vector.set(term, weight);
    }
    return vector;
  });
}

export function norm(vector: Map<string, number>): number {
  let sumSquares = 0;
  for (const weight of vector.values()) sumSquares += weight * weight;
  return Math.sqrt(sumSquares);
}

export function dotProduct(a: Map<string, number>, b: Map<string, number>): number {
  const [small, large] = a.size <= b.size ? [a, b] : [b, a];
  let dot = 0;
  for (const [term, weight] of small) {
    const other = large.get(term);
    if (other !== undefined) dot += weight * other;
  }
  return dot;
}

export const overlapRule: Rule = {
  id: 'overlap',
  description:
    'Computes TF-IDF cosine similarity between every pair of agents and reports the top-N most similar pairs.',
  run(agents: AgentDef[], opts): Finding[] {
    const top = opts?.top ?? DEFAULT_TOP;
    const failAbove = opts?.failAbove;

    const docs = agents.map((agent) => tokenize(`${agent.description}\n${agent.body}`));
    const vectors = buildVectors(docs);
    const norms = vectors.map(norm);

    const pairs: { i: number; j: number; score: number }[] = [];
    for (let i = 0; i < agents.length; i++) {
      for (let j = i + 1; j < agents.length; j++) {
        if (norms[i] === 0 || norms[j] === 0) continue;
        const score = dotProduct(vectors[i], vectors[j]) / (norms[i] * norms[j]);
        pairs.push({ i, j, score });
      }
    }

    pairs.sort((a, b) => b.score - a.score);
    const topPairs = pairs.slice(0, top);

    return topPairs.map(({ i, j, score }): Finding => {
      // Same name from two sources (e.g. a repo audited via dir that is also
      // installed as a plugin) — disambiguate with the source label so the
      // pair never renders as "x <-> x".
      const sameName = agents[i].name === agents[j].name;
      const a = sameName ? `${agents[i].name} (${agents[i].sourceLabel})` : agents[i].name;
      const b = sameName ? `${agents[j].name} (${agents[j].sourceLabel})` : agents[j].name;
      const critical = failAbove !== undefined && score > failAbove;
      return {
        ruleId: 'overlap',
        severity: critical ? 'critical' : 'info',
        pair: [a, b],
        score,
        message: `${a} and ${b} overlap (similarity ${score.toFixed(3)})`,
      };
    });
  },
};
