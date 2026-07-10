import type { Rule } from '../core/types.js';
import { NotImplementedError } from '../core/types.js';

export const fluffRule: Rule = {
  id: 'fluff',
  description: 'Flags agent definitions with low information density (filler prose, vague instructions).',
  run() {
    throw new NotImplementedError('rules/fluff');
  },
};
