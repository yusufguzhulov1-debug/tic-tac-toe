import { matchesQuery } from './lib/menu-search.js';

/**
 * Category chips + live search over the server-rendered menu.
 * The markup is complete without JS; this only hides what does not match.
 */
export function initMenu() {
  const root = document.querySelector('[data-menu]');
  if (!root) return;

  const chips = [...root.querySelectorAll('[data-menu-filter]')];
  const search = root.querySelector('[data-menu-search]');
  const groups = [...root.querySelectorAll('[data-menu-group]')];
  const empty = root.querySelector('[data-menu-empty]');
  const live = root.querySelector('[data-menu-live]');

  let category = 'all';
  let query = '';

  const apply = () => {
    let visible = 0;
    for (const group of groups) {
      const inCategory = category === 'all' || group.dataset.menuGroup === category;
      let shown = 0;
      for (const li of group.querySelectorAll('[data-item]')) {
        const item = {
          name: li.dataset.name,
          description: li.dataset.description,
          tags: (li.dataset.tags || '').split('|').filter(Boolean),
        };
        const ok = inCategory && matchesQuery(item, query);
        li.hidden = !ok;
        if (ok) shown += 1;
      }
      group.hidden = shown === 0;
      visible += shown;
    }
    if (empty) empty.hidden = visible > 0;
    if (live) live.textContent = String(visible);
    try {
      const url = new URL(location.href);
      if (category === 'all') url.searchParams.delete('cat');
      else url.searchParams.set('cat', category);
      if (query) url.searchParams.set('q', query);
      else url.searchParams.delete('q');
      history.replaceState(null, '', url);
    } catch { /* ignore */ }
  };

  chips.forEach((chip) => {
    chip.addEventListener('click', () => {
      category = chip.dataset.menuFilter;
      chips.forEach((c) => c.setAttribute('aria-pressed', String(c === chip)));
      apply();
    });
  });

  if (search) {
    let timer;
    search.addEventListener('input', () => {
      clearTimeout(timer);
      timer = setTimeout(() => { query = search.value; apply(); }, 120);
    });
    search.addEventListener('search', () => { query = search.value; apply(); });
  }

  // Restore state from the URL so a filtered menu can be shared.
  try {
    const params = new URLSearchParams(location.search);
    const cat = params.get('cat');
    const q = params.get('q');
    if (cat && chips.some((c) => c.dataset.menuFilter === cat)) {
      category = cat;
      chips.forEach((c) => c.setAttribute('aria-pressed', String(c.dataset.menuFilter === cat)));
    }
    if (q && search) { query = q; search.value = q; }
  } catch { /* ignore */ }

  apply();
}
