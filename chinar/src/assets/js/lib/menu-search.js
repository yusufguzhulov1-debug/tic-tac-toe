/** Pure helpers for menu filtering — shared by the browser and the tests. */

/** Normalise for accent/case-insensitive comparison, incl. Cyrillic ё → е. */
export function normalize(value) {
  return String(value ?? '')
    .toLowerCase()
    .replaceAll('ё', 'е')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Text that a dish is searchable by. */
export function haystack(item) {
  return normalize([item.name, item.description, ...(item.tags ?? [])].filter(Boolean).join(' '));
}

/** True when the dish matches every whitespace-separated token of the query. */
export function matchesQuery(item, query) {
  const tokens = normalize(query).split(' ').filter(Boolean);
  if (!tokens.length) return true;
  const text = haystack(item);
  return tokens.every((token) => text.includes(token));
}

/**
 * Filter whole categories.
 * @returns {{categories: Array, total: number}} categories keep their shape,
 *   with `items` narrowed; empty categories are dropped.
 */
export function filterMenu(categories, { category = 'all', query = '' } = {}) {
  const scoped = category === 'all' ? categories : categories.filter((c) => c.id === category);
  const result = [];
  let total = 0;
  for (const cat of scoped) {
    const items = cat.items.filter((item) => matchesQuery(item, query));
    if (!items.length) continue;
    total += items.length;
    result.push({ ...cat, items });
  }
  return { categories: result, total };
}

/** Format a price with a thin no-break space as the group separator. */
export function formatPrice(value, { symbol = '₽', locale = 'ru-RU' } = {}) {
  if (value === null || value === undefined || value === '') return '—';
  const n = Number(value);
  if (!Number.isFinite(n)) return String(value);
  return `${n.toLocaleString(locale).replace(/ /g, ' ')} ${symbol}`;
}
