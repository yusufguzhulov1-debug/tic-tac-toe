import { getOpenState } from './lib/hours.js';

/** Paint the "open now / opens at" pill and highlight today's row. */
export function initHours() {
  const pill = document.querySelector('[data-open-state]');
  const schedule = (() => {
    const el = document.getElementById('opening-hours-data');
    if (!el) return null;
    try { return JSON.parse(el.textContent); } catch { return null; }
  })();
  if (!schedule) return;

  const labels = JSON.parse(pill?.dataset.labels || '{}');

  const paint = () => {
    const now = new Date();
    const state = getOpenState(schedule, now);
    if (pill) {
      pill.dataset.open = String(state.open);
      pill.textContent = state.open
        ? (labels.openUntil || 'Open until {time}').replace('{time}', state.until)
        : state.next
          ? (labels.opensAt || 'Opens at {time}').replace('{time}', state.next.opens)
          : (labels.closed || 'Closed');
    }
    const codes = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
    const today = codes[now.getDay()];
    document.querySelectorAll('[data-days]').forEach((row) => {
      row.dataset.today = String((row.dataset.days || '').split(',').includes(today));
    });
  };

  paint();
  setInterval(paint, 60_000);
}
