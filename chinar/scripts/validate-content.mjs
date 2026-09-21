#!/usr/bin/env node
/**
 * Content gatekeeper.
 *
 *  • errors   — structural problems that would produce a broken page.
 *  • warnings — real data that is still a placeholder (phone, address, map…).
 *
 * `node scripts/validate-content.mjs` prints a report; `--strict` makes
 * warnings fail too, which is what the release build uses.
 */
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

const REQUIRED_SECTIONS = [
  'brand', 'contacts', 'hours', 'nav', 'hero', 'about', 'menu',
  'banquet', 'gallery', 'reviews', 'reservation', 'delivery', 'seo', 'legal', 'ui',
];

const PLACEHOLDER_PATTERNS = [
  /укажите/i, /замените/i, /^replace /i, /placeholder/i, /example\.com/i,
  /chinar\.example/i, /000-00-00/, /отзыв \d/i, /^review \d/i,
];

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const DAY_CODES = new Set(['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']);

function walkStrings(value, path, visit) {
  if (typeof value === 'string') { visit(value, path); return; }
  if (Array.isArray(value)) { value.forEach((v, i) => walkStrings(v, `${path}[${i}]`, visit)); return; }
  if (value && typeof value === 'object') {
    for (const [k, v] of Object.entries(value)) walkStrings(v, path ? `${path}.${k}` : k, visit);
  }
}

function checkLocale(content, locale, errors, warnings) {
  const at = (p) => `${locale}: ${p}`;

  for (const key of REQUIRED_SECTIONS) {
    if (!content[key]) errors.push(at(`missing section "${key}"`));
  }
  if (errors.length) return;

  if (!content.langTag) errors.push(at('missing langTag'));

  // --- hours ---------------------------------------------------------
  if (!Array.isArray(content.hours) || content.hours.length === 0) {
    errors.push(at('hours must be a non-empty array'));
  } else {
    const seen = new Set();
    content.hours.forEach((slot, i) => {
      if (!TIME_RE.test(slot.opens)) errors.push(at(`hours[${i}].opens must be HH:MM, got "${slot.opens}"`));
      if (!TIME_RE.test(slot.closes)) errors.push(at(`hours[${i}].closes must be HH:MM, got "${slot.closes}"`));
      if (!Array.isArray(slot.days) || !slot.days.length) errors.push(at(`hours[${i}].days is empty`));
      for (const day of slot.days || []) {
        if (!DAY_CODES.has(day)) errors.push(at(`hours[${i}] unknown day code "${day}"`));
        if (seen.has(day)) errors.push(at(`day "${day}" appears in more than one hours slot`));
        seen.add(day);
      }
    });
    for (const day of DAY_CODES) {
      if (!seen.has(day)) warnings.push(at(`no opening hours declared for "${day}"`));
    }
  }

  // --- menu ----------------------------------------------------------
  const ids = new Set();
  content.menu.categories.forEach((cat, ci) => {
    if (!cat.id) errors.push(at(`menu.categories[${ci}] has no id`));
    if (ids.has(cat.id)) errors.push(at(`duplicate menu category id "${cat.id}"`));
    ids.add(cat.id);
    if (!Array.isArray(cat.items) || !cat.items.length) {
      errors.push(at(`menu category "${cat.id}" has no items`));
      return;
    }
    cat.items.forEach((item, ii) => {
      const where = `menu.${cat.id}[${ii}]`;
      if (!item.name) errors.push(at(`${where} has no name`));
      if (item.price !== null && item.price !== undefined) {
        if (typeof item.price !== 'number' || !Number.isFinite(item.price) || item.price < 0) {
          errors.push(at(`${where}.price must be a non-negative number or null, got ${JSON.stringify(item.price)}`));
        }
      } else {
        warnings.push(at(`${where}.price is not set`));
      }
      if (item.tags && !Array.isArray(item.tags)) errors.push(at(`${where}.tags must be an array`));
    });
  });

  // --- nav -----------------------------------------------------------
  const SECTION_IDS = new Set(['about', 'menu', 'banquet', 'delivery', 'gallery', 'reviews', 'reserve', 'contacts']);
  content.nav.forEach((item, i) => {
    if (!SECTION_IDS.has(item.id)) errors.push(at(`nav[${i}].id "${item.id}" does not match any rendered section`));
    if (!item.label) errors.push(at(`nav[${i}] has no label`));
  });

  // --- contacts ------------------------------------------------------
  const digits = String(content.contacts.phoneHref || '').replace(/\D/g, '');
  if (digits.length < 10 || digits.length > 15) {
    errors.push(at(`contacts.phoneHref must hold 10–15 digits, got "${content.contacts.phoneHref}"`));
  }
  const geo = content.contacts.geo || {};
  if (geo.lat === null || geo.lng === null) warnings.push(at('contacts.geo is empty — schema.org GeoCoordinates will be omitted'));
  if (!content.contacts.mapEmbedUrl) warnings.push(at('contacts.mapEmbedUrl is empty — the map block shows a hint instead'));
  if (!(content.contacts.socials || []).some((s) => s.url)) warnings.push(at('no social links filled in'));

  // --- reservation ---------------------------------------------------
  if (!content.reservation.endpoint) {
    warnings.push(at('reservation.endpoint is empty — the form runs in demo mode and sends nothing'));
  } else if (!/^https:\/\//.test(content.reservation.endpoint)) {
    errors.push(at('reservation.endpoint must be an https URL'));
  }

  // --- seo -----------------------------------------------------------
  if ((content.seo.title || '').length > 65) warnings.push(at(`seo.title is ${content.seo.title.length} characters; search results cut around 60`));
  if ((content.seo.description || '').length > 165) warnings.push(at(`seo.description is ${content.seo.description.length} characters; aim for under 160`));
  if (/^https?:\/\/example\.com/.test(content.seo.siteUrl || '')) warnings.push(at('seo.siteUrl is still example.com — canonical URLs and the sitemap will be wrong'));

  // --- leftover placeholder copy --------------------------------------
  walkStrings(content, '', (value, path) => {
    // UI strings legitimately contain imperative wording ("укажите…").
    if (path.startsWith('meta.') || path.startsWith('ui.') || path.endsWith('Note')) return;
    if (path === 'gallery.subtitle' || path === 'reviews.subtitle') return;
    if (PLACEHOLDER_PATTERNS.some((re) => re.test(value))) {
      warnings.push(at(`${path} still reads like a placeholder: "${value.slice(0, 60)}"`));
    }
  });

  if (content.meta?.dataStatus !== 'verified') {
    warnings.push(at('meta.dataStatus is not "verified" — the demo banner is shown on every page'));
  }
}

/**
 * Compare locales so the language switcher does not land on a different
 * menu. Reported as warnings: importing one locale legitimately puts the
 * other behind until it is translated.
 */
function checkParity(contents, warnings) {
  const [base, ...rest] = Object.entries(contents);
  const [baseCode, baseContent] = base;
  for (const [code, content] of rest) {
    const a = baseContent.menu.categories.map((c) => c.id).join(',');
    const b = content.menu.categories.map((c) => c.id).join(',');
    if (a !== b) errors.push(`menu category ids differ between ${baseCode} (${a}) and ${code} (${b})`);
    for (const cat of baseContent.menu.categories) {
      const other = content.menu.categories.find((c) => c.id === cat.id);
      if (other && other.items.length !== cat.items.length) {
        warnings.push(`menu "${cat.id}" has ${cat.items.length} items in ${baseCode} but ${other.items.length} in ${code}`);
      }
    }
    const navA = baseContent.nav.map((n) => n.id).join(',');
    const navB = content.nav.map((n) => n.id).join(',');
    if (navA !== navB) errors.push(`nav ids differ between ${baseCode} and ${code}`);
  }
}

export function validateContent(contents) {
  const errors = [];
  const warnings = [];
  for (const [locale, content] of Object.entries(contents)) checkLocale(content, locale, errors, warnings);
  if (!errors.length) checkParity(contents, warnings);
  return { errors, warnings, ok: errors.length === 0 };
}

export function loadAll() {
  return {
    ru: JSON.parse(readFileSync(join(ROOT, 'content', 'site.ru.json'), 'utf8')),
    en: JSON.parse(readFileSync(join(ROOT, 'content', 'site.en.json'), 'utf8')),
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const strict = process.argv.includes('--strict');
  const { errors, warnings } = validateContent(loadAll());
  for (const e of errors) console.error(`✗ ${e}`);
  for (const w of warnings) console.warn(`! ${w}`);
  if (!errors.length && !warnings.length) console.log('✓ content is complete and structurally valid');
  else console.log(`\n${errors.length} error(s), ${warnings.length} warning(s)`);
  process.exitCode = errors.length || (strict && warnings.length) ? 1 : 0;
}
