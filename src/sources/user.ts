import type { RosterSource } from '../core/types.js';
import { NotImplementedError } from '../core/types.js';

export const userSource: RosterSource = {
  id: 'user',
  description: 'Loads agents from the user-level Claude Code agent directory (~/.claude/agents).',
  async load() {
    throw new NotImplementedError('sources/user');
  },
};
