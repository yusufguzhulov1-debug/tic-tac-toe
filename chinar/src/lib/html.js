/** Tiny, dependency-free HTML templating with escaping by default. */

const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

export function esc(value) {
  if (value === null || value === undefined || value === false) return '';
  return String(value).replace(/[&<>"']/g, (c) => ESCAPES[c]);
}

/** Mark a string as already-safe HTML. */
export class Raw {
  constructor(value) { this.value = String(value); }
  toString() { return this.value; }
}
export const raw = (value) => new Raw(value);

function render(value) {
  if (value === null || value === undefined || value === false || value === true) return '';
  if (value instanceof Raw) return value.value;
  if (Array.isArray(value)) return value.map(render).join('');
  return esc(value);
}

/** html`<p>${userInput}</p>` — interpolations are escaped unless wrapped in raw(). */
export function html(strings, ...values) {
  let out = strings[0];
  for (let i = 0; i < values.length; i += 1) out += render(values[i]) + strings[i + 1];
  return raw(out);
}

/** Render attributes; false/null/undefined drop the attribute entirely. */
export function attrs(map) {
  const parts = [];
  for (const [key, value] of Object.entries(map)) {
    if (value === false || value === null || value === undefined) continue;
    if (value === true) { parts.push(key); continue; }
    parts.push(`${key}="${esc(value)}"`);
  }
  return raw(parts.join(' '));
}

/** JSON safe to embed inside an HTML attribute (escaped exactly once). */
export function jsonAttr(value) {
  return raw(esc(JSON.stringify(value)));
}
export function jsonScript(value) {
  return raw(JSON.stringify(value).replace(/</g, '\\u003c').replace(/-->/g, '--\\u003e'));
}
