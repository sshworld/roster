import type { Rule } from '../core/types.js';
import { NotImplementedError } from '../core/types.js';

export const routingRule: Rule = {
  id: 'routing',
  description: 'Flags ambiguous routing between agents with overlapping trigger descriptions.',
  run() {
    throw new NotImplementedError('rules/routing');
  },
};
