import type { RosterSource } from '../core/types.js';
import { NotImplementedError } from '../core/types.js';

export const pluginCacheSource: RosterSource = {
  id: 'plugin-cache',
  description: 'Loads agents from the installed Claude Code plugin cache.',
  async load() {
    throw new NotImplementedError('sources/plugin-cache');
  },
};
