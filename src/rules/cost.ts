import type { Rule } from '../core/types.js';
import { NotImplementedError } from '../core/types.js';

export const costRule: Rule = {
  id: 'cost',
  description: 'Estimates the context-window cost of loading the full agent roster.',
  run() {
    throw new NotImplementedError('rules/cost');
  },
};
