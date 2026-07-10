import type { Renderer } from '../core/types.js';
import { cliRenderer } from './cli.js';
import { jsonRenderer } from './json.js';
import { htmlRenderer } from './html.js';

export type RegisteredRenderer = Renderer & { stub?: boolean };

export const renderers: Record<string, RegisteredRenderer> = {
  cli: cliRenderer,
  json: { ...jsonRenderer, stub: true },
  html: { ...htmlRenderer, stub: true },
};
