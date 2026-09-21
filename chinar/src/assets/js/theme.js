/** Theme switch: OS preference by default, explicit choice persisted. */
const KEY = 'chinar:theme';
const root = document.documentElement;

export function initTheme() {
  const toggle = document.querySelector('[data-theme-toggle]');
  if (!toggle) return;

  toggle.addEventListener('click', () => {
    const prefersDark = matchMedia('(prefers-color-scheme: dark)').matches;
    const current = root.dataset.theme || (prefersDark ? 'dark' : 'light');
    const next = current === 'dark' ? 'light' : 'dark';
    root.dataset.theme = next;
    toggle.setAttribute('aria-pressed', String(next === 'dark'));
    try { localStorage.setItem(KEY, next); } catch { /* private mode */ }
  });

  const prefersDark = matchMedia('(prefers-color-scheme: dark)').matches;
  toggle.setAttribute('aria-pressed', String((root.dataset.theme || (prefersDark ? 'dark' : 'light')) === 'dark'));
}
