/** Dismissible demo-data notice; the choice is remembered per browser. */
export function initBanner() {
  const bar = document.querySelector('[data-notice]');
  if (!bar) return;
  const key = `chinar:notice:${bar.dataset.notice}`;
  try {
    if (localStorage.getItem(key) === 'dismissed') { bar.hidden = true; return; }
  } catch { /* ignore */ }
  bar.hidden = false;
  bar.querySelector('[data-notice-dismiss]')?.addEventListener('click', () => {
    bar.hidden = true;
    try { localStorage.setItem(key, 'dismissed'); } catch { /* ignore */ }
  });
}
