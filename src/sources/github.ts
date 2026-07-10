import type { RosterSource } from '../core/types.js';
import { NotImplementedError } from '../core/types.js';

export const githubSource: RosterSource = {
  id: 'github',
  description: 'Loads agents from a GitHub repository (owner/name[@ref]).',
  async load() {
    throw new NotImplementedError('sources/github');
  },
};
