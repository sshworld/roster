import type { RosterSource } from '../core/types.js';
import { dirSource } from './dir.js';
import { userSource } from './user.js';
import { pluginCacheSource } from './plugin-cache.js';
import { githubSource } from './github.js';

export type RegisteredSource = RosterSource & { stub?: boolean };

export const sources: Record<string, RegisteredSource> = {
  dir: dirSource,
  user: userSource,
  'plugin-cache': pluginCacheSource,
  github: githubSource,
};

// Skill loaders (kind: 'skill') are intentionally NOT part of the `sources`
// registry above — the audit/bench default path only ever ingests agents.
export { loadUserSkills, loadPluginSkills, loadProjectSkills } from './skills.js';
