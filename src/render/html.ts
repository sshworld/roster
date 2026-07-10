import type { Renderer } from '../core/types.js';
import { NotImplementedError } from '../core/types.js';

export const htmlRenderer: Renderer = {
  id: 'html',
  render() {
    throw new NotImplementedError('render/html');
  },
};
