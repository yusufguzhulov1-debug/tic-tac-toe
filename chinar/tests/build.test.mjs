/**
 * Checks run against the real build output: broken links, accessibility
 * basics, structured data and the offline assets. These are the mistakes
 * a static site ships silently, so they are gated in CI.
 */
import { test, describe, before } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = join(ROOT, 'dist');
const PAGES = ['index.html', 'en/index.html', 'privacy/index.html', 'en/privacy/index.html', 'offline.html'];

const read = (p) => readFileSync(join(DIST, p), 'utf8');
const all = (html, re) => [...html.matchAll(re)];

before(() => {
  execFileSync(process.execPath, [join(ROOT, 'scripts', 'build.mjs')], { stdio: 'pipe' });
});

describe('build output', () => {
  test('every expected page exists and is non-trivial', () => {
    for (const page of PAGES) {
      assert.ok(existsSync(join(DIST, page)), `${page} missing`);
      assert.ok(read(page).length > 2000, `${page} looks empty`);
    }
  });

  test('supporting files are emitted', () => {
    for (const file of ['sitemap.xml', 'robots.txt', 'manifest.webmanifest', 'sw.js', '_headers', 'css/styles.css', 'js/app.js']) {
      assert.ok(existsSync(join(DIST, file)), `${file} missing`);
    }
  });

  test('no template leakage in the HTML', () => {
    for (const page of PAGES) {
      const html = read(page);
      assert.ok(!html.includes('[object Object]'), `${page} rendered an object`);
      assert.ok(!html.includes('__PRECACHE__'), `${page} has an unreplaced token`);
      assert.ok(!/undefined|NaN/.test(html.replace(/[\w-]*undefined[\w-]*/g, (m) => (m === 'undefined' ? m : ''))), `${page} contains undefined/NaN`);
    }
  });
});

describe('accessibility basics', () => {
  test('exactly one h1 per page', () => {
    for (const page of PAGES) {
      const count = all(read(page), /<h1[\s>]/g).length;
      assert.equal(count, 1, `${page} has ${count} h1 elements`);
    }
  });

  test('every img has alt and intrinsic dimensions', () => {
    for (const page of PAGES) {
      for (const [tag] of all(read(page), /<img\b[^>]*>/g)) {
        assert.match(tag, /\balt=/, `img without alt in ${page}: ${tag}`);
        assert.match(tag, /\bwidth=/, `img without width in ${page}: ${tag}`);
        assert.match(tag, /\bheight=/, `img without height in ${page}: ${tag}`);
      }
    }
  });

  test('every label points at an existing control', () => {
    for (const page of PAGES) {
      const html = read(page);
      const ids = new Set(all(html, /\bid="([^"]+)"/g).map((m) => m[1]));
      for (const [, forId] of all(html, /<label[^>]*\bfor="([^"]+)"/g)) {
        assert.ok(ids.has(forId), `label for="${forId}" has no control in ${page}`);
      }
    }
  });

  test('aria-labelledby and aria-controls resolve', () => {
    for (const page of PAGES) {
      const html = read(page);
      const ids = new Set(all(html, /\bid="([^"]+)"/g).map((m) => m[1]));
      for (const [, value] of all(html, /\baria-(?:labelledby|controls|describedby)="([^"]+)"/g)) {
        for (const token of value.split(/\s+/)) {
          assert.ok(ids.has(token), `aria reference "${token}" is dangling in ${page}`);
        }
      }
    }
  });

  test('the skip link and main landmark exist', () => {
    for (const page of ['index.html', 'en/index.html']) {
      const html = read(page);
      assert.match(html, /class="skip-link" href="#main"/);
      assert.match(html, /<main id="main">/);
    }
  });

  test('html carries a language', () => {
    for (const page of PAGES) assert.match(read(page), /<html lang="[a-z]{2}(-[A-Z]{2})?"/);
  });
});

describe('links and assets', () => {
  const localTargets = (html) =>
    all(html, /\b(?:href|src)="([^"#][^"]*)"/g)
      .map((m) => m[1])
      .filter((u) => !/^(https?:|mailto:|tel:|data:|\/\/)/.test(u));

  test('every relative href and src resolves inside dist', () => {
    for (const page of PAGES) {
      const pageDir = dirname(join(DIST, page));
      for (const target of localTargets(read(page))) {
        const clean = target.split('?')[0];
        const resolved = resolve(pageDir, clean);
        assert.ok(existsSync(resolved), `${page} → ${target} does not exist (${resolved})`);
      }
    }
  });

  test('in-page anchors point at real ids', () => {
    for (const page of ['index.html', 'en/index.html']) {
      const html = read(page);
      const ids = new Set(all(html, /\bid="([^"]+)"/g).map((m) => m[1]));
      for (const [, hash] of all(html, /href="#([^"]+)"/g)) {
        assert.ok(ids.has(hash), `#${hash} has no target in ${page}`);
      }
    }
  });

  test('nav entries match the rendered sections', () => {
    const html = read('index.html');
    const navIds = all(html, /<nav class="nav-desktop"[\s\S]*?<\/nav>/g)[0][0];
    const hrefs = all(navIds, /href="#([^"]+)"/g).map((m) => m[1]);
    assert.ok(hrefs.length >= 5);
    for (const id of hrefs) assert.ok(html.includes(`id="${id}"`), `nav points at missing section #${id}`);
  });
});

describe('SEO and structured data', () => {
  test('JSON-LD parses and describes a Restaurant with a menu', () => {
    const html = read('index.html');
    const block = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1];
    const data = JSON.parse(block);
    const restaurant = data['@graph'].find((n) => n['@type'] === 'Restaurant');
    assert.ok(restaurant, 'no Restaurant node');
    assert.ok(restaurant.hasMenu.hasMenuSection.length >= 4);
    assert.ok(restaurant.openingHoursSpecification.length >= 1);
    assert.equal(restaurant.acceptsReservations, true);
    // Unfilled data must be omitted, never invented.
    assert.equal('geo' in restaurant, false, 'geo should be dropped while coordinates are unset');
  });

  test('canonical, alternates and Open Graph are present', () => {
    for (const page of ['index.html', 'en/index.html']) {
      const html = read(page);
      assert.equal(all(html, /<link rel="canonical"/g).length, 1);
      assert.ok(all(html, /<link rel="alternate" hreflang=/g).length >= 3);
      assert.match(html, /<meta property="og:image" content="https?:[^"]+\.png"/, 'OG image should be a raster crawlers can read');
    }
  });

  test('private pages are excluded from indexing and the sitemap', () => {
    const sitemap = read('sitemap.xml');
    assert.ok(!sitemap.includes('/privacy/'), 'privacy page leaked into the sitemap');
    assert.ok(!sitemap.includes('offline'), 'offline shell leaked into the sitemap');
    assert.match(read('privacy/index.html'), /<meta name="robots" content="noindex/);
    assert.match(read('robots.txt'), /Sitemap: https?:\/\//);
  });

  test('sitemap lists both locales', () => {
    const sitemap = read('sitemap.xml');
    assert.ok(sitemap.includes('<loc>') && sitemap.includes('/en/'));
    assert.equal(all(sitemap, /<url>/g).length, 2);
  });
});

describe('offline and PWA', () => {
  test('manifest is valid JSON with icons and a scope', () => {
    const manifest = JSON.parse(read('manifest.webmanifest'));
    assert.ok(manifest.name && manifest.short_name);
    assert.equal(manifest.display, 'standalone');
    assert.ok(manifest.icons.some((i) => i.sizes === '512x512' && i.purpose === 'maskable'));
    for (const icon of manifest.icons) {
      assert.ok(existsSync(join(DIST, icon.src)), `manifest icon missing: ${icon.src}`);
    }
  });

  test('the service worker precaches files that exist', () => {
    const sw = read('sw.js');
    const list = JSON.parse(sw.match(/const PRECACHE = (\[[\s\S]*?\]);/)[1]);
    assert.ok(list.length > 5);
    for (const entry of list) {
      const path = entry.split('?')[0];
      if (path.endsWith('/')) continue; // directory routes resolve to index.html
      assert.ok(existsSync(join(DIST, path.replace(/^\//, ''))), `precached file missing: ${entry}`);
    }
    assert.match(sw, /caches\.match\(OFFLINE_URL\)/);
  });

  test('CSP headers are emitted and do not allow arbitrary scripts', () => {
    const headers = read('_headers');
    assert.match(headers, /Content-Security-Policy:/);
    assert.match(headers, /object-src 'none'/);
    assert.match(headers, /frame-ancestors 'none'/);
    assert.ok(!/script-src[^\n]*\*/.test(headers), 'script-src must not be a wildcard');
  });
});

describe('payload budget', () => {
  test('the home page and its critical assets stay small', () => {
    const htmlKb = statSync(join(DIST, 'index.html')).size / 1024;
    const cssKb = statSync(join(DIST, 'css', 'styles.css')).size / 1024;
    const jsKb = readdirSync(join(DIST, 'js'), { recursive: true })
      .filter((f) => String(f).endsWith('.js'))
      .reduce((sum, f) => sum + statSync(join(DIST, 'js', String(f))).size, 0) / 1024;

    assert.ok(htmlKb < 120, `index.html is ${htmlKb.toFixed(0)} kB (budget 120 kB)`);
    assert.ok(cssKb < 60, `styles.css is ${cssKb.toFixed(0)} kB (budget 60 kB)`);
    assert.ok(jsKb < 40, `JS bundle is ${jsKb.toFixed(0)} kB (budget 40 kB)`);
  });
});

describe('content security', () => {
  test('no inline scripts and no style attributes are emitted', () => {
    for (const page of PAGES) {
      const html = read(page);
      for (const [tag] of all(html, /<script\b[^>]*>/g)) {
        const isData = /type="application\/(ld\+json|json)"/.test(tag);
        const isExternal = /\bsrc="/.test(tag);
        assert.ok(isData || isExternal, `inline executable script in ${page}: ${tag}`);
      }
      assert.equal(all(html, /\sstyle="/g).length, 0, `${page} still carries a style attribute`);
    }
  });

  test('the CSP does not need unsafe-inline', () => {
    const headers = read('_headers');
    assert.ok(!headers.includes("'unsafe-inline'"), 'CSP fell back to unsafe-inline');
    assert.match(headers, /script-src 'self'/);
    assert.match(headers, /style-src 'self'/);
  });

  test('the theme is applied by a render-blocking module-free script in head', () => {
    const html = read('index.html');
    const head = html.slice(0, html.indexOf('</head>'));
    assert.match(head, /<script src="[^"]*js\/theme-boot\.js/);
    assert.ok(existsSync(join(DIST, 'js', 'theme-boot.js')));
  });
});
