import type { Renderer } from '../core/types.js';
import { NotImplementedError } from '../core/types.js';

export const jsonRenderer: Renderer = {
  id: 'json',
  render() {
    throw new NotImplementedError('render/json');
  },
};
