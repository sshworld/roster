import type { Rule } from '../core/types.js';
import { overlapRule } from './overlap.js';
import { harnessRule } from './harness.js';
import { routingRule } from './routing.js';
import { costRule } from './cost.js';
import { fluffRule } from './fluff.js';

export type RegisteredRule = Rule & { stub?: boolean };

export const rules: Record<string, RegisteredRule> = {
  overlap: overlapRule,
  harness: harnessRule,
  routing: routingRule,
  cost: costRule,
  fluff: fluffRule,
};
