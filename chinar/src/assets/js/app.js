import { initTheme } from './theme.js';
import { initNav, initScrollSpy, initHeaderState } from './nav.js';
import { initMenu } from './menu.js';
import { initReservation } from './reserve.js';
import { initHours } from './hours-ui.js';
import { initBanner } from './banner.js';

const boot = () => {
  for (const init of [initTheme, initNav, initScrollSpy, initHeaderState, initMenu, initReservation, initHours, initBanner]) {
    try { init(); } catch (error) { console.error(`[chinar] ${init.name} failed`, error); }
  }
  document.documentElement.dataset.jsReady = 'true';
};

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
else boot();

if ('serviceWorker' in navigator && location.protocol === 'https:') {
  // This module lives at <root>/js/app.js, so one level up is the site root —
  // which keeps the worker correct when the site is served from a subdirectory.
  const root = new URL('../', import.meta.url);
  addEventListener('load', () => {
    navigator.serviceWorker.register(new URL('sw.js', root), { scope: root.pathname })
      .catch((error) => console.warn('[chinar] service worker not registered', error));
  });
}
