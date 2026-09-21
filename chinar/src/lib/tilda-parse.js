/**
 * Extractor for Tilda-published pages.
 *
 * Tilda emits deeply nested <div>s with semantic class names (t-name,
 * t-descr, t-title, t-text …) rather than semantic HTML, so this works on
 * the class names and on the shape of the text instead of on the DOM.
 * It is pure: HTML string in, structured data out, which is what makes it
 * testable without network access.
 */

const PRICE_RE = /^\s*(?:от\s*)?(\d[\d\s  ]{0,9})(?:[.,](\d{2}))?\s*(?:₽|руб\.?|р\.|rub|com|сом|₸|€|\$)\s*$/i;
const WEIGHT_RE = /^\s*\d+(?:[.,]\d+)?\s*(?:г|гр|грамм|кг|мл|л|шт|pcs|g|ml)\.?\s*$/i;
const TIME_RE = /(^|[^\d])([01]?\d|2[0-3])[:.]([0-5]\d)(?!\d)/;
// JS \b is defined on [A-Za-z0-9_], so it never fires next to Cyrillic —
// these use explicit non-letter context instead.
const ADDRESS_RE = /(ул\.|улица|проспект|просп\.|пр-?кт|шоссе|переулок|пер\.|наб\.|набережная|бульвар|мкр\.?|д\.\s*\d|дом\s+\d|street|avenue)/i;
const DAY_RE = /(^|[^a-zа-яё])(пн|вт|ср|чт|пт|сб|вс|ежедневно|круглосуточно|будни|выходные|mon|tue|wed|thu|fri|sat|sun|daily|с\s*\d{1,2}[:.]\d)/i;
const PHONE_RE = /(?:\+?\d[\d\-\s()]{8,16}\d)/g;
const EMAIL_RE = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi;

const SOCIAL_HOSTS = [
  [/(?:^|\.)t\.me$|(?:^|\.)telegram\.me$/i, 'Telegram', 'telegram'],
  [/(?:^|\.)wa\.me$|api\.whatsapp\.com$/i, 'WhatsApp', 'whatsapp'],
  [/(?:^|\.)vk\.com$|(?:^|\.)vk\.ru$/i, 'VK', 'vk'],
  [/(?:^|\.)instagram\.com$/i, 'Instagram', 'instagram'],
  [/(?:^|\.)facebook\.com$/i, 'Facebook', 'facebook'],
  [/(?:^|\.)youtube\.com$|(?:^|\.)youtu\.be$/i, 'YouTube', 'youtube'],
  [/(?:^|\.)ok\.ru$/i, 'OK', 'ok'],
];

const ENTITIES = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
  laquo: '«', raquo: '»', mdash: '—', ndash: '–', hellip: '…', deg: '°', rsquo: '’',
};

export function decodeEntities(input) {
  return String(input)
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(Number(dec)))
    .replace(/&([a-z]+);/gi, (m, name) => ENTITIES[name.toLowerCase()] ?? m);
}

const clean = (text) =>
  decodeEntities(text).replace(/[  ]/g, ' ').replace(/\s+/g, ' ').trim();

const stripNoise = (html) =>
  String(html)
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<(script|style|noscript|template|svg|iframe)\b[\s\S]*?<\/\1>/gi, ' ');

/** Flatten the document into ordered { classes, tag, text } leaf-ish nodes. */
export function toNodes(html) {
  const marked = stripNoise(html)
    .replace(/<(h[1-6]|div|p|span|a|li|td|th|figcaption|strong|em|b)\b([^>]*)>/gi, (_, tag, attrs) => {
      const cls = /class\s*=\s*"([^"]*)"/i.exec(attrs)?.[1] || '';
      const href = /href\s*=\s*"([^"]*)"/i.exec(attrs)?.[1] || '';
      return `\u0001${tag.toLowerCase()}\u0002${cls}\u0002${href}\u0003`;
    })
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, ' ');

  const nodes = [];
  for (const chunk of marked.split('\u0001')) {
    const head = chunk.indexOf('\u0003');
    if (head === -1) continue;
    const [tag, classes, href] = chunk.slice(0, head).split('\u0002');
    const text = clean(chunk.slice(head + 1));
    if (!text && !href) continue;
    nodes.push({ tag, classes: classes || '', href: href || '', text });
  }
  return nodes;
}

const hasClass = (node, ...needles) =>
  needles.some((n) => node.classes.split(/\s+/).some((c) => c === n || c.endsWith(`__${n.replace('t-', '')}`)));

const looksLikePrice = (text) => PRICE_RE.test(text);
export const parsePrice = (text) => {
  const m = PRICE_RE.exec(text);
  if (!m) return null;
  const value = Number(`${m[1].replace(/[\s  ]/g, '')}.${m[2] ?? '0'}`);
  return Number.isFinite(value) ? Math.round(value * 100) / 100 : null;
};

/** Pair price nodes with the nearest preceding name/description. */
export function extractMenu(nodes) {
  const categories = [];
  let current = null;
  const pushCategory = (title) => {
    current = { title: title || '', items: [] };
    categories.push(current);
  };

  nodes.forEach((node, index) => {
    if (/^h[23]$/.test(node.tag) && node.text.length <= 80 && !looksLikePrice(node.text)) {
      pushCategory(node.text);
      return;
    }
    if (!looksLikePrice(node.text)) return;

    // Collect the nodes belonging to this dish: walk back until the previous
    // price or a heading bounds the block.
    const block = [];
    for (let i = index - 1; i >= Math.max(0, index - 5); i -= 1) {
      const prev = nodes[i];
      if (!prev.text) continue;
      if (looksLikePrice(prev.text) || /^h[1-6]$/.test(prev.tag)) break;
      block.unshift(prev);
    }

    let weight = '';
    const rest = [];
    for (const node2 of block) {
      if (!weight && WEIGHT_RE.test(node2.text)) weight = node2.text;
      else rest.push(node2);
    }

    const nameNode = rest.find((n) => hasClass(n, 't-name', 't-title', 't-heading')) ?? rest[0];
    const name = nameNode?.text ?? '';
    const descNode =
      rest.find((n) => n !== nameNode && hasClass(n, 't-descr', 't-text')) ??
      rest.find((n) => n !== nameNode);
    const description = descNode && descNode.text !== name ? descNode.text : '';

    if (!name) return;
    if (!current) pushCategory('');
    current.items.push({
      name,
      description: description && description !== name ? description : '',
      weight,
      price: parsePrice(node.text),
      tags: [],
    });
  });

  return categories.filter((c) => c.items.length);
}

function absolute(url, baseUrl) {
  if (!url) return '';
  try { return new URL(url, baseUrl).href; } catch { return url; }
}

/** Everything the importer can read off a Tilda page. */
export function extractFromTilda(html, { baseUrl = 'https://example.com/' } = {}) {
  const raw = stripNoise(html);
  const nodes = toNodes(html);
  const pick = (re) => clean(re.exec(raw)?.[1] ?? '');

  const title = pick(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const description = pick(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i);
  const ogTitle = pick(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']*)["']/i);
  const ogImage = pick(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']*)["']/i);

  const headings = nodes
    .filter((n) => /^h[1-6]$/.test(n.tag) && n.text)
    .map((n) => ({ level: Number(n.tag[1]), text: n.text }));

  const paragraphs = [...new Set(
    nodes.filter((n) => n.text.length >= 60 && !looksLikePrice(n.text)).map((n) => n.text)
  )];

  const hrefs = [...raw.matchAll(/href\s*=\s*["']([^"']+)["']/gi)].map((m) => decodeEntities(m[1]));

  const phones = [...new Set(
    hrefs.filter((h) => h.startsWith('tel:')).map((h) => h.slice(4).replace(/[^\d+]/g, ''))
      .concat((clean(raw.replace(/<[^>]+>/g, ' ')).match(PHONE_RE) || [])
        .map((p) => p.replace(/[^\d+]/g, ''))
        .filter((p) => p.replace(/\D/g, '').length >= 10 && p.replace(/\D/g, '').length <= 15))
  )];

  const emails = [...new Set(
    hrefs.filter((h) => h.toLowerCase().startsWith('mailto:')).map((h) => h.slice(7).split('?')[0])
      .concat(raw.match(EMAIL_RE) || [])
  )].filter((e) => !/\.(png|jpe?g|svg|webp)$/i.test(e));

  // Keep the formatted spelling a visitor sees, keyed by its digits.
  const phoneDisplay = new Map();
  for (const node of nodes) {
    const text = node.text;
    if (!/^\+?[\d\s()\-.]{10,22}$/.test(text)) continue;
    const digits = text.replace(/\D/g, '');
    if (digits.length < 10 || digits.length > 15) continue;
    if (!phoneDisplay.has(digits)) phoneDisplay.set(digits, text);
  }

  const socials = [];
  for (const href of hrefs) {
    let host;
    try { host = new URL(href, baseUrl).hostname; } catch { continue; }
    const hit = SOCIAL_HOSTS.find(([re]) => re.test(host));
    if (hit && !socials.some((s) => s.icon === hit[2])) {
      socials.push({ name: hit[1], url: absolute(href, baseUrl), icon: hit[2] });
    }
  }

  const addresses = [...new Set(
    nodes
      .map((n) => n.text)
      .filter((t) => ADDRESS_RE.test(t) && t.length < 160)
  )];

  const hours = [...new Set(
    nodes
      .map((n) => n.text)
      .filter((t) => TIME_RE.test(t) && DAY_RE.test(t) && t.length < 120)
  )];

  const images = [...new Set(
    [...raw.matchAll(/<img\b[^>]*>/gi)]
      .map((m) => m[0])
      .map((tag) => {
        const src = /(?:data-original|data-src|src)\s*=\s*["']([^"']+)["']/i.exec(tag)?.[1];
        const alt = /alt\s*=\s*["']([^"']*)["']/i.exec(tag)?.[1] ?? '';
        return src ? JSON.stringify({ src: absolute(decodeEntities(src), baseUrl), alt: clean(alt) }) : null;
      })
      .filter(Boolean)
  )].map((s) => JSON.parse(s))
    .concat(
      [...raw.matchAll(/background-image:\s*url\((['"]?)([^)'"]+)\1\)/gi)]
        .map((m) => ({ src: absolute(decodeEntities(m[2]), baseUrl), alt: '' }))
    );

  return {
    sourceUrl: baseUrl,
    title,
    ogTitle,
    description,
    ogImage: absolute(ogImage, baseUrl),
    headings,
    paragraphs,
    phones,
    phonesDisplay: phones.map((p) => phoneDisplay.get(p.replace(/\D/g, '')) || p),
    emails,
    socials,
    addresses,
    hours,
    images: images.filter((i, idx, arr) => arr.findIndex((o) => o.src === i.src) === idx),
    menu: extractMenu(nodes),
    nodeCount: nodes.length,
  };
}

/* ------------------------------------------------------------------ */
/* Opening-hours lines → the structured schedule the site renders from */

const DAY_ALIASES = [
  [/^(пн|понедельник|mon(day)?)$/i, 'Mo'],
  [/^(вт|вторник|tue(s|sday)?)$/i, 'Tu'],
  [/^(ср|среда|wed(nesday)?)$/i, 'We'],
  [/^(чт|четверг|thu(r|rsday)?)$/i, 'Th'],
  [/^(пт|пятница|fri(day)?)$/i, 'Fr'],
  [/^(сб|суббота|sat(urday)?)$/i, 'Sa'],
  [/^(вс|воскресенье|sun(day)?)$/i, 'Su'],
];
const ORDER = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

const dayCode = (token) => DAY_ALIASES.find(([re]) => re.test(token.trim()))?.[1] ?? null;

const pad = (h, m) => `${String(Number(h)).padStart(2, '0')}:${m}`;

/**
 * "Пн — Чт: 11:00 — 23:00" → { days: [Mo,Tu,We,Th], opens, closes }.
 * Returns null when the line does not carry two times.
 */
export function parseHoursLine(text) {
  const line = clean(text);
  const times = [...line.matchAll(/([01]?\d|2[0-3])[:.]([0-5]\d)/g)];
  if (times.length < 2) return null;

  const opens = pad(times[0][1], times[0][2]);
  const closes = pad(times[1][1], times[1][2]);
  const head = line.slice(0, times[0].index);

  let days = [];
  if (/ежедневно|каждый день|daily|все дни|круглосуточно/i.test(head)) {
    days = [...ORDER];
  } else {
    const range = /([а-яёa-z]{2,12})\s*[—–-]\s*([а-яёa-z]{2,12})/i.exec(head);
    const from = range && dayCode(range[1]);
    const to = range && dayCode(range[2]);
    if (from && to) {
      const a = ORDER.indexOf(from);
      const b = ORDER.indexOf(to);
      days = a <= b ? ORDER.slice(a, b + 1) : [...ORDER.slice(a), ...ORDER.slice(0, b + 1)];
    } else {
      // Split on anything that is not a letter, so "Вс:" still resolves.
      days = head
        .split(/[^a-zа-яё]+/i)
        .map(dayCode)
        .filter(Boolean);
    }
  }
  if (!days.length) return null;

  const label = clean(head.replace(/(?:\s+(?:с|от|from))?\s*[:\-—–]?\s*$/i, ''));
  return { days, label: label || days.join(', '), opens, closes };
}

/** Parse every hours line, dropping days that a later line repeats. */
export function parseSchedule(lines) {
  const seen = new Set();
  const schedule = [];
  for (const line of lines) {
    const slot = parseHoursLine(line);
    if (!slot) continue;
    const days = slot.days.filter((d) => !seen.has(d));
    if (!days.length) continue;
    days.forEach((d) => seen.add(d));
    schedule.push({ ...slot, days });
  }
  return schedule;
}
