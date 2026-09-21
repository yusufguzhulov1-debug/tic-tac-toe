#!/usr/bin/env node
/**
 * Pull the live Tilda page into content/site.<locale>.json.
 *
 *   node scripts/import-tilda.mjs https://chinar-restaurant.tilda.ws/
 *   node scripts/import-tilda.mjs <url> --merge          # apply to the content file
 *   node scripts/import-tilda.mjs --from-file page.html  # no network needed
 *
 * Without --merge nothing is overwritten: the extraction is written to
 * content/imported/ and printed as a report, so the result can be reviewed
 * before it becomes the site's content.
 */
import { readFileSync, writeFileSync, mkdirSync, copyFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { extractFromTilda, parseSchedule } from '../src/lib/tilda-parse.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

const argv = process.argv.slice(2);
const flag = (name, fallback = null) => {
  const i = argv.indexOf(`--${name}`);
  return i === -1 ? fallback : argv[i + 1];
};
const has = (name) => argv.includes(`--${name}`);

const url = argv.find((a) => /^https?:\/\//.test(a));
const fromFile = flag('from-file');
const locale = flag('locale', 'ru');
const MERGE = has('merge');

if (!url && !fromFile) {
  console.error(`Usage:
  node scripts/import-tilda.mjs <url> [--merge] [--locale ru]
  node scripts/import-tilda.mjs --from-file <path> [--merge] [--locale ru] [--base-url <url>]`);
  process.exit(2);
}

async function loadHtml() {
  if (fromFile) return readFileSync(fromFile, 'utf8');
  const response = await fetch(url, {
    redirect: 'follow',
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; chinar-site-importer/1.0)',
      'Accept-Language': 'ru,en;q=0.8',
    },
  });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText} for ${url}`);
  return response.text();
}

const preview = (list, n = 6) => list.slice(0, n).map((x) => `      · ${typeof x === 'string' ? x : JSON.stringify(x)}`).join('\n');

function mergeIntoContent(data, target) {
  const file = join(ROOT, 'content', `site.${locale}.json`);
  const content = JSON.parse(readFileSync(file, 'utf8'));
  const changed = [];
  const set = (path, value) => {
    if (value === undefined || value === null || value === '' || (Array.isArray(value) && !value.length)) return;
    const keys = path.split('.');
    let node = content;
    for (const key of keys.slice(0, -1)) node = node[key];
    const last = keys.at(-1);
    if (JSON.stringify(node[last]) === JSON.stringify(value)) return;
    node[last] = value;
    changed.push(path);
  };

  const heroTitle = data.headings.find((h) => h.level === 1)?.text;
  set('seo.title', data.title);
  set('seo.description', data.description);
  set('hero.title', heroTitle);

  if (data.phones[0]) {
    set('contacts.phoneHref', data.phones[0].replace(/[^\d+]/g, ''));
    set('contacts.phone', data.phonesDisplay?.[0] || data.phones[0]);
  }
  if (data.phones[1]) set('contacts.phoneSecondary', data.phonesDisplay?.[1] || data.phones[1]);
  set('contacts.email', data.emails[0]);
  set('contacts.socials', data.socials.length ? data.socials : undefined);
  if (data.addresses[0]) set('contacts.address.full', data.addresses[0]);

  const schedule = parseSchedule(data.hours);
  if (schedule.length) set('hours', schedule);

  if (data.menu.length) {
    const slug = (title, i) =>
      (title || `cat-${i + 1}`)
        .toLowerCase()
        .replace(/[^a-zа-яё0-9]+/gi, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 32) || `cat-${i + 1}`;
    set(
      'menu.categories',
      data.menu.map((cat, i) => ({
        id: slug(cat.title, i),
        title: cat.title || `Раздел ${i + 1}`,
        description: '',
        items: cat.items,
      }))
    );
  }

  const paragraphs = data.paragraphs.filter((p) => p.length > 80).slice(0, 3);
  if (paragraphs.length) set('about.paragraphs', paragraphs);

  content.meta.sourceUrl = url || fromFile;
  content.meta.importedAt = new Date().toISOString();
  changed.push('meta.importedAt');

  const backup = `${file}.bak`;
  copyFileSync(file, backup);
  writeFileSync(file, `${JSON.stringify(content, null, 2)}\n`, 'utf8');
  return { file, backup, changed };
}

const html = await loadHtml();
const baseUrl = url || flag('base-url', 'https://chinar-restaurant.tilda.ws/');
const data = extractFromTilda(html, { baseUrl });

const outDir = join(ROOT, 'content', 'imported');
mkdirSync(outDir, { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const rawPath = join(outDir, `extract-${stamp}.json`);
writeFileSync(rawPath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');

const dishes = data.menu.reduce((n, c) => n + c.items.length, 0);
console.log(`
  Source      ${baseUrl}
  HTML        ${(html.length / 1024).toFixed(0)} kB, ${data.nodeCount} text nodes

  Headings    ${data.headings.length}
${preview(data.headings.map((h) => `h${h.level}: ${h.text}`))}
  Menu        ${data.menu.length} categories / ${dishes} dishes
${preview(data.menu.map((c) => `${c.title || '(no title)'} — ${c.items.length}`))}
  Phones      ${data.phones.join(', ') || '—'}
  E-mail      ${data.emails.join(', ') || '—'}
  Socials     ${data.socials.map((s) => s.name).join(', ') || '—'}
  Address     ${data.addresses[0] ?? '—'}
  Hours       ${data.hours.length} line(s)
${preview(data.hours)}
  Images      ${data.images.length}
${preview(data.images.map((i) => i.src), 4)}

  Extraction saved to content/imported/${rawPath.split('/').pop()}`);

if (!dishes) console.warn('\n  ! No prices were found. The page may render its menu with JavaScript — save it from the browser and re-run with --from-file.');

if (MERGE) {
  const { file, backup, changed } = mergeIntoContent(data, locale);
  console.log(`\n  Merged into ${file.replace(`${ROOT}/`, '')} (backup: ${backup.split('/').pop()})`);
  console.log(`  Fields updated: ${changed.join(', ')}`);
  console.log('\n  Next: review the diff, download the photographs listed above into src/assets/img,');
  console.log('        set meta.dataStatus to "verified", then run `npm run check && npm run build`.');
} else {
  console.log('\n  Nothing was overwritten. Re-run with --merge to apply this to the content file.');
}
