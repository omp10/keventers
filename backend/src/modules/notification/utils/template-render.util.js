/**
 * Minimal, dependency-free template renderer. Substitutes `{{ var }}` (and dotted
 * paths `{{ order.number }}`) from a flat/nested variables object. Unknown
 * variables render as empty strings (never leak `{{…}}` to a customer). This is
 * pure + synchronous so rendering is fast and fully unit-testable.
 */
const TOKEN = /\{\{\s*([\w.]+)\s*\}\}/g;

function lookup(vars, path) {
  return path.split('.').reduce((acc, key) => (acc == null ? undefined : acc[key]), vars);
}

/** Render a single string template against variables. */
export function renderString(template, variables = {}) {
  if (template == null) return '';
  return String(template).replace(TOKEN, (_m, path) => {
    const v = lookup(variables, path);
    return v == null ? '' : String(v);
  });
}

/**
 * Render a template document into a channel-ready message part.
 * @returns {{ subject: string|null, body: string }}
 */
export function renderTemplate(template, variables = {}) {
  return {
    subject: template?.subject != null ? renderString(template.subject, variables) : null,
    body: renderString(template?.body ?? '', variables),
  };
}

/** The variable names referenced by a template (for validation / previews). */
export function extractVariables(template) {
  const found = new Set();
  for (const field of [template?.subject, template?.body]) {
    if (!field) continue;
    let m;
    const re = new RegExp(TOKEN.source, 'g');
    while ((m = re.exec(String(field)))) found.add(m[1]);
  }
  return [...found];
}
