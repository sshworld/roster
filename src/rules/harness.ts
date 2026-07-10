import type { Rule } from '../core/types.js';
import { NotImplementedError } from '../core/types.js';

export const harnessRule: Rule = {
  id: 'harness',
  description: 'Flags agents that reference tools without a matching harness/permission definition.',
  run() {
    throw new NotImplementedError('rules/harness');
  },
};
