import type { RosterSource } from '../core/types.js';
import { dirSource } from './dir.js';
import { userSource } from './user.js';
import { pluginCacheSource } from './plugin-cache.js';
import { githubSource } from './github.js';

export type RegisteredSource = RosterSource & { stub?: boolean };

export const sources: Record<string, RegisteredSource> = {
  dir: dirSource,
  user: { ...userSource, stub: true },
  'plugin-cache': { ...pluginCacheSource, stub: true },
  github: { ...githubSource, stub: true },
};
