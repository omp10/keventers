import { describe, expect, it } from 'vitest';

import { extractVariables, renderString, renderTemplate } from '../utils/template-render.util.js';
import { TemplateService } from '../services/template.service.js';
import { TEMPLATE_KEY } from '../constants/notification.constants.js';

describe('template renderer', () => {
  it('substitutes {{ vars }} including dotted paths', () => {
    expect(renderString('Hi {{ name }}, order {{ order.number }}', { name: 'Asha', order: { number: 'KEV-1' } })).toBe('Hi Asha, order KEV-1');
  });

  it('renders unknown variables as empty (never leaks {{…}})', () => {
    expect(renderString('Hi {{ missing }}!', {})).toBe('Hi !');
  });

  it('renders subject + body of a template', () => {
    const out = renderTemplate({ subject: 'Order {{ n }}', body: 'Status: {{ s }}' }, { n: '7', s: 'ready' });
    expect(out).toEqual({ subject: 'Order 7', body: 'Status: ready' });
  });

  it('extracts the variable names referenced by a template', () => {
    expect(extractVariables({ subject: '{{ a }}', body: '{{ b.c }} and {{ a }}' }).sort()).toEqual(['a', 'b.c']);
  });
});

describe('TemplateService.render — resolution + fallback', () => {
  it('renders a restaurant/db template when one resolves', async () => {
    const templates = { async resolve() { return { subject: 'Hi {{ name }}', body: 'DB body {{ x }}' }; } };
    const svc = new TemplateService({ templates });
    const out = await svc.render({ organizationId: 'o', restaurantId: 'r' }, TEMPLATE_KEY.WELCOME, 'email', 'en', { name: 'Sam', x: '1' });
    expect(out).toEqual({ subject: 'Hi Sam', body: 'DB body 1', source: 'db' });
  });

  it('falls back to the built-in default when no db template exists', async () => {
    const templates = { async resolve() { return null; } };
    const svc = new TemplateService({ templates });
    const out = await svc.render({ organizationId: 'o', restaurantId: 'r' }, TEMPLATE_KEY.ORDER_READY, 'push', 'en', { orderNumber: 'KEV-9' });
    expect(out.source).toBe('default');
    expect(out.body).toContain('KEV-9'); // rendered from the default template
  });

  it('returns empty content (never throws) for an unknown key with no template', async () => {
    const templates = { async resolve() { return null; } };
    const svc = new TemplateService({ templates });
    const out = await svc.render({}, 'nonexistent_key', 'sms', 'en', {});
    expect(out).toEqual({ subject: null, body: '', source: 'none' });
  });
});
