import { raw } from './html.js';

const STROKE = 'fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"';

const PATHS = {
  flame: `<path d="M12 2s4 4.5 4 8a4 4 0 1 1-8 0c0-2 1-3.6 2-4.6 0 1.6.5 2.6 1.5 2.6S12 5.5 12 2Z"/>`,
  leaf: `<path d="M4 20C4 12 10 6 20 6c0 10-6 16-14 14Z"/><path d="M8.5 20c1-4.5 3.2-7.6 6.5-9.5"/>`,
  users: `<circle cx="9" cy="7" r="4"/><path d="M2 21a7 7 0 0 1 14 0"/><path d="M17 3.5a4 4 0 0 1 0 7"/><path d="M18.5 21a7 7 0 0 0-2-4.9"/>`,
  moped: `<circle cx="5.5" cy="16.5" r="2.5"/><circle cx="18" cy="16.5" r="2.5"/><path d="M8 16.5h7.5"/><path d="M15.5 16.5V6.5H18l2.5 5"/><path d="M3 12.5V9h4l3.5 4.5"/>`,
  phone: `<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 2 .7 2.9a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.2-1.2a2 2 0 0 1 2.1-.5c.9.3 1.9.6 2.9.7a2 2 0 0 1 1.7 2Z"/>`,
  mail: `<rect x="2.5" y="4.5" width="19" height="15" rx="2.5"/><path d="m3 7 9 5.5L21 7"/>`,
  pin: `<path d="M20 10.5c0 6-8 11.5-8 11.5S4 16.5 4 10.5a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10.2" r="3"/>`,
  clock: `<circle cx="12" cy="12" r="9"/><path d="M12 7v5.2l3.2 1.9"/>`,
  search: `<circle cx="11" cy="11" r="7"/><path d="m20.5 20.5-4-4"/>`,
  sun: `<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.5 1.5M17.6 17.6l1.5 1.5M2 12h2M20 12h2M4.9 19.1l1.5-1.5M17.6 6.4l1.5-1.5"/>`,
  moon: `<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z"/>`,
  burger: `<path d="M3.5 7h17M3.5 12h17M3.5 17h17"/>`,
  close: `<path d="m6 6 12 12M18 6 6 18"/>`,
  arrowUp: `<path d="M12 19.5V5M5.5 11.5 12 5l6.5 6.5"/>`,
  check: `<path d="m4.5 12.5 5 5 10-11"/>`,
  star: `<path d="m12 3 2.6 5.4 6 .9-4.3 4.2 1 6-5.3-2.8-5.3 2.8 1-6L3.4 9.3l6-.9L12 3Z" fill="currentColor" stroke="none"/>`,
  telegram: `<path d="M21.5 4 2.8 11.2a.5.5 0 0 0 0 .9l4.6 1.5 1.8 5.5a.5.5 0 0 0 .9.1l2.4-2.9 4.6 3.4a.5.5 0 0 0 .8-.3L21.5 4Zm-3.4 2.6-8.6 7.7-.4 3.4"/>`,
  whatsapp: `<path d="M3 21.2 4.5 17A8.6 8.6 0 1 1 8 20.4L3 21.2Z"/><path d="M8.8 8.6c.3-.1.6 0 .8.3l.8 1.3c.1.3.1.6-.1.8l-.5.5a5.8 5.8 0 0 0 2.9 2.9l.5-.6c.2-.2.5-.2.8-.1l1.3.8c.3.2.4.5.3.8-.3.9-1.2 1.4-2.1 1.2a8.3 8.3 0 0 1-6-6c-.2-.9.4-1.8 1.3-1.9Z"/>`,
  vk: `<path d="M4 7.5h2.6c.6 3.4 2 5.6 3 5.6.4 0 .5-.2.5-1V9.6h2.3v3.1c0 .7.2.9.5.9.7 0 1.9-1.6 2.6-4.1h2.4c-.5 2.2-1.5 4-2.6 5 1 .8 2 1.9 2.6 3.5h-2.6c-.5-1.3-1.5-2.3-2.4-2.8-.4.3-.5.7-.5 1.4v1.4h-1.3C7.8 18 5.1 14.9 4 7.5Z"/>`,
  instagram: `<rect x="3.5" y="3.5" width="17" height="17" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.2" cy="6.8" r="1" fill="currentColor" stroke="none"/>`,
};

/**
 * Inline an icon. Decorative by default (aria-hidden); pass a `title` to
 * expose it to assistive technology.
 */
export function icon(name, { size = 24, title = '' } = {}) {
  const body = PATHS[name];
  if (!body) throw new Error(`Unknown icon: ${name}`);
  const a11y = title
    ? `role="img" aria-label="${title.replace(/"/g, '&quot;')}"`
    : 'aria-hidden="true" focusable="false"';
  return raw(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="${size}" height="${size}" ${STROKE} ${a11y}>${body}</svg>`
  );
}

export const iconNames = Object.keys(PATHS);
