#!/usr/bin/env node
/**
 * Static site generator. Zero dependencies: reads the JSON content files,
 * renders templates, bundles CSS, copies JS modules and images, and emits
 * manifest / service worker / sitemap / robots.
 *
 *   node scripts/build.mjs [--strict] [--base-url https://example.com]
 */
import { readFileSync, writeFileSync, mkdirSync, cpSync, rmSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

import { layout } from '../src/templates/layout.js';
import { homePage } from '../src/templates/home.js';
import { privacyPage } from '../src/templates/privacy.js';
import { offlinePage } from '../src/templates/offline.js';
import { buildJsonLd } from '../src/lib/jsonld.js';
import { validateContent } from './validate-content.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const ROOT = join(here, '..');
const SRC = join(ROOT, 'src');
const DIST = join(ROOT, 'dist');

const argv = process.argv.slice(2);
const STRICT = argv.includes('--strict');
const baseUrlArg = argv.indexOf('--base-url');
const flagValue = (name) => {
  const i = argv.indexOf(`--${name}`);
  return i === -1 ? null : argv[i + 1];
};

const LOCALES = [
  { code: 'ru', file: 'site.ru.json', dir: '', label: 'EN', altCode: 'en' },
  { code: 'en', file: 'site.en.json', dir: 'en', label: 'RU', altCode: 'ru' },
];

const read = (p) => readFileSync(p, 'utf8');
const loadContent = (file) => JSON.parse(read(join(ROOT, 'content', file)));

const emit = (relPath, data) => {
  const target = join(DIST, relPath);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, data);
  return target;
};

/** Light CSS bundling: concatenate in filename order, strip comments. */
function bundleCss() {
  const dir = join(SRC, 'assets', 'css');
  const files = readdirSync(dir).filter((f) => f.endsWith('.css')).sort();
  const header = `/* Chinar — bundled from ${files.join(', ')}. Edit the sources, not this file. */\n`;
  const body = files
    .map((f) => read(join(dir, f)))
    .join('\n')
    .replace(/\/\*(?!!)[\s\S]*?\*\//g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  return { css: header + body + '\n', files };
}

function walk(dir, base = dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, base, out);
    else out.push(relative(base, full));
  }
  return out;
}

async function build() {
  const started = Date.now();
  rmSync(DIST, { recursive: true, force: true });
  mkdirSync(DIST, { recursive: true });

  const contents = Object.fromEntries(LOCALES.map((l) => [l.code, loadContent(l.file)]));

  // ---- content validation -------------------------------------------
  const report = validateContent(contents);
  for (const problem of report.errors) console.error(`  ✗ ${problem}`);
  for (const warning of report.warnings) console.warn(`  ! ${warning}`);
  if (report.errors.length) {
    throw new Error(`${report.errors.length} content error(s). Fix content/*.json and rebuild.`);
  }
  if (STRICT && report.warnings.length) {
    throw new Error(`--strict: ${report.warnings.length} placeholder(s) still in the content files.`);
  }

  // Deploying under a subdirectory (project GitHub Pages, for example) only
  // needs the absolute paths adjusted; page-to-page links are already relative.
  const basePath = `/${(process.env.BASE_PATH || flagValue('base-path') || '').replace(/^\/+|\/+$/g, '')}`
    .replace(/\/$/, '') || '';

  const siteUrl = (
    baseUrlArg !== -1 ? argv[baseUrlArg + 1] : process.env.SITE_URL || contents.ru.seo.siteUrl
  ).replace(/\/+$/, '');

  // ---- assets --------------------------------------------------------
  const { css, files: cssFiles } = bundleCss();
  const buildId = createHash('sha256').update(css).update(read(join(SRC, 'assets', 'js', 'app.js'))).digest('hex').slice(0, 8);
  emit('css/styles.css', css);
  cpSync(join(SRC, 'assets', 'js'), join(DIST, 'js'), { recursive: true });
  cpSync(join(SRC, 'assets', 'img'), join(DIST, 'img'), { recursive: true });

  // ---- pages ---------------------------------------------------------
  const pages = [];
  for (const locale of LOCALES) {
    const content = contents[locale.code];
    const alt = LOCALES.find((l) => l.code === locale.altCode);
    const altContent = contents[alt.code];
    const dirPrefix = locale.dir ? `${locale.dir}/` : '';
    const altDirPrefix = alt.dir ? `${alt.dir}/` : '';

    const site = {
      siteUrl,
      year: new Date().getFullYear(),
      buildId,
      altLabel: locale.label,
      altLang: altContent.langTag,
      altHref: locale.dir ? `../${altDirPrefix}index.html` : `${altDirPrefix}index.html`,
    };

    // home
    const homeBase = locale.dir ? '../' : '';
    const homeCanonical = `/${dirPrefix}`;
    const homeHtml = layout({
      content,
      page: {
        title: content.seo.title,
        description: content.seo.description,
        base: homeBase,
      },
      body: homePage(content, homeBase),
      jsonld: buildJsonLd(content, { siteUrl, pageUrl: `${siteUrl}${homeCanonical}` }),
      site: { ...site, canonicalPath: homeCanonical, altCanonicalPath: `/${altDirPrefix}` },
    });
    pages.push({ path: `${dirPrefix}index.html`, url: homeCanonical, html: homeHtml, priority: locale.dir ? 0.8 : 1.0 });

    // privacy
    const privacyBase = locale.dir ? '../../' : '../';
    const privacyCanonical = `/${dirPrefix}privacy/`;
    const privacyHtml = layout({
      content,
      page: {
        title: `${content.legal.privacyTitle} — ${content.brand.name}`,
        description: content.legal.privacyTitle,
        base: privacyBase,
        noindex: true,
      },
      body: privacyPage(content),
      jsonld: null,
      site: {
        ...site,
        altHref: locale.dir ? `../../${altDirPrefix}privacy/index.html` : `../${altDirPrefix}privacy/index.html`,
        canonicalPath: privacyCanonical,
        altCanonicalPath: `/${altDirPrefix}privacy/`,
      },
    });
    pages.push({ path: `${dirPrefix}privacy/index.html`, url: privacyCanonical, html: privacyHtml, priority: 0.2, noindex: true });
  }

  // offline shell (RU, no chrome, never indexed)
  pages.push({
    path: 'offline.html',
    url: '/offline.html',
    noindex: true,
    html: layout({
      content: contents.ru,
      page: { title: `Офлайн — ${contents.ru.brand.name}`, description: 'Нет соединения', base: '', noindex: true },
      body: offlinePage(contents.ru),
      jsonld: null,
      site: {
        siteUrl, year: new Date().getFullYear(), buildId,
        altLabel: 'EN', altLang: 'en', altHref: 'en/index.html',
        canonicalPath: '/offline.html', altCanonicalPath: '/en/',
      },
      chrome: false,
    }),
  });

  for (const page of pages) emit(page.path, page.html);

  // ---- manifest ------------------------------------------------------
  const ru = contents.ru;
  emit(
    'manifest.webmanifest',
    JSON.stringify(
      {
        name: `${ru.brand.name} — ${ru.brand.tagline}`,
        short_name: ru.brand.name,
        description: ru.brand.description,
        lang: ru.langTag,
        dir: 'ltr',
        start_url: `${basePath}/?source=pwa`,
        scope: `${basePath}/`,
        display: 'standalone',
        orientation: 'portrait-primary',
        background_color: '#1a1310',
        theme_color: '#1a1310',
        categories: ['food', 'lifestyle'],
        icons: [
          { src: 'img/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'img/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'img/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
        shortcuts: [
          { name: ru.menu.title, url: '/#menu' },
          { name: ru.reservation.title, url: '/#reserve' },
        ],
      },
      null,
      2
    )
  );

  // ---- service worker ------------------------------------------------
  const precache = [
    `${basePath}/`, `${basePath}/en/`, `${basePath}/offline.html`, `${basePath}/css/styles.css?v=${buildId}`,
    ...walk(join(DIST, 'js')).map((f) => `${basePath}/js/${f.split('\\').join('/')}`),
    `${basePath}/img/logo.svg`, `${basePath}/img/hero.svg`, `${basePath}/manifest.webmanifest`,
  ];
  const swTemplate = read(join(SRC, 'sw.template.js'));
  emit('sw.js', swTemplate
    .replace('__BUILD_ID__', buildId)
    .replace('__OFFLINE_URL__', `${basePath}/offline.html`)
    .replace('__PRECACHE__', JSON.stringify(precache, null, 2)));

  // ---- sitemap & robots ----------------------------------------------
  const lastmod = new Date().toISOString().slice(0, 10);
  const indexable = pages.filter((p) => !p.noindex);
  emit(
    'sitemap.xml',
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n` +
      indexable
        .map(
          (p) =>
            `  <url>\n    <loc>${siteUrl}${p.url}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <priority>${p.priority.toFixed(1)}</priority>\n` +
            `    <xhtml:link rel="alternate" hreflang="ru" href="${siteUrl}/"/>\n    <xhtml:link rel="alternate" hreflang="en" href="${siteUrl}/en/"/>\n  </url>`
        )
        .join('\n') +
      `\n</urlset>\n`
  );
  emit('robots.txt', `User-agent: *\nAllow: /\nDisallow: /privacy/\nDisallow: /en/privacy/\n\nSitemap: ${siteUrl}/sitemap.xml\n`);

  // ---- host config ---------------------------------------------------
  const csp = [
    "default-src 'self'",
    // No inline <script> and no style attributes are emitted, so neither
    // directive needs 'unsafe-inline'. The JSON-LD blocks are data blocks,
    // which are never executed and so are not covered by script-src.
    "script-src 'self'",
    "style-src 'self'",
    "img-src 'self' data:",
    "font-src 'self'",
    "connect-src 'self' https:",
    "frame-src https:",
    "form-action 'self' https:",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
  ].join('; ');
  emit(
    '_headers',
    `/*\n  Content-Security-Policy: ${csp}\n  Referrer-Policy: strict-origin-when-cross-origin\n` +
      `  X-Content-Type-Options: nosniff\n  Permissions-Policy: geolocation=(), camera=(), microphone=(), interest-cohort=()\n` +
      `  Strict-Transport-Security: max-age=31536000; includeSubDomains\n\n` +
      `/css/*\n  Cache-Control: public, max-age=31536000, immutable\n\n` +
      `/js/*\n  Cache-Control: public, max-age=604800\n\n` +
      `/img/*\n  Cache-Control: public, max-age=31536000, immutable\n\n` +
      `/sw.js\n  Cache-Control: no-cache\n`
  );
  emit('.nojekyll', '');

  // ---- report ---------------------------------------------------------
  const bytes = walk(DIST).reduce((sum, f) => sum + statSync(join(DIST, f)).size, 0);
  console.log(`\n✓ built ${pages.length} pages in ${Date.now() - started} ms  ·  build ${buildId}`);
  console.log(`  css: ${cssFiles.length} files → ${(Buffer.byteLength(css) / 1024).toFixed(1)} kB`);
  console.log(`  dist: ${walk(DIST).length} files, ${(bytes / 1024).toFixed(0)} kB total`);
  console.log(`  base URL: ${siteUrl}${basePath || ''}`);
  if (report.warnings.length) console.log(`  ! ${report.warnings.length} placeholder field(s) still to fill — see npm run check`);
}

build().catch((error) => {
  console.error(`\n✗ build failed: ${error.message}`);
  process.exitCode = 1;
});
