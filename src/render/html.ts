import type { Renderer } from '../core/types.js';
import { renderHtmlTemplate } from './html-template.js';

export const htmlRenderer: Renderer = {
  id: 'html',
  render(report): string {
    return renderHtmlTemplate(report);
  },
};
