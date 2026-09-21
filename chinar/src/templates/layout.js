import { html, jsonScript } from '../lib/html.js';
import { icon } from '../lib/icons.js';

const SOCIAL_ICONS = { telegram: 'telegram', whatsapp: 'whatsapp', vk: 'vk', instagram: 'instagram' };

function headerBlock(content, { base, altHref, altLabel }) {
  const { brand, contacts, nav, ui } = content;
  return html`
    <a class="skip-link" href="#main">${ui.skipToContent}</a>
    <header class="site-header">
      <div class="shell shell--wide site-header__inner">
        <a class="logo" href="${base}index.html" aria-label="${brand.name} — ${brand.tagline}">
          <img class="logo__mark" src="${base}img/logo.svg" width="36" height="36" alt="" />
          <span>${brand.name}<span class="logo__sub">${brand.tagline}</span></span>
        </a>

        <nav class="nav-desktop" aria-label="${brand.name}">
          ${nav.map((item) => html`<a href="#${item.id}">${item.label}</a>`)}
        </nav>

        <div class="header-actions">
          <a class="btn btn--quiet header-phone" href="tel:${contacts.phoneHref}">
            ${icon('phone', { size: 18 })}<span>${contacts.phone}</span>
          </a>
          <a class="btn btn--quiet" href="${altHref}" hreflang="${altLabel.toLowerCase()}" lang="${altLabel.toLowerCase()}">${altLabel}</a>
          <button class="icon-btn theme-toggle" type="button" data-theme-toggle aria-pressed="false" title="${ui.themeToggle}">
            <span class="visually-hidden">${ui.themeToggle}</span>
            <span data-theme-icon="moon">${icon('moon', { size: 20 })}</span>
            <span data-theme-icon="sun">${icon('sun', { size: 20 })}</span>
          </button>
          <button class="icon-btn nav-toggle" type="button" data-nav-open aria-expanded="false" aria-controls="nav-drawer">
            <span class="visually-hidden">${ui.menuOpen}</span>${icon('burger', { size: 22 })}
          </button>
          <a class="btn header-cta" href="#reserve">${content.hero.primaryCta.label}</a>
        </div>
      </div>
    </header>

    <div class="nav-drawer" id="nav-drawer" data-open="false" inert>
      <div class="nav-drawer__top">
        <span class="logo"><img class="logo__mark" src="${base}img/logo.svg" width="36" height="36" alt="" />${brand.name}</span>
        <button class="icon-btn" type="button" data-nav-close>
          <span class="visually-hidden">${ui.menuClose}</span>${icon('close', { size: 22 })}
        </button>
      </div>
      <nav class="nav-drawer__links" aria-label="${ui.menuOpen}">
        ${nav.map((item) => html`<a href="#${item.id}">${item.label}</a>`)}
      </nav>
      <div class="stack">
        <a class="btn btn--block btn--large" href="#reserve">${content.hero.primaryCta.label}</a>
        <a class="btn btn--ghost btn--block" href="tel:${contacts.phoneHref}">${icon('phone', { size: 18 })} ${contacts.phone}</a>
      </div>
    </div>
  `;
}

function footerBlock(content, { base, year }) {
  const { brand, contacts, hours, nav, legal, ui } = content;
  const socials = (contacts.socials || []).filter((s) => s.url);
  return html`
    <footer class="site-footer">
      <div class="shell">
        <div class="footer-grid">
          <div>
            <h3>${brand.name}</h3>
            <p class="muted">${brand.description}</p>
            ${socials.length
              ? html`<ul class="social-list mt-l">
                  ${socials.map(
                    (s) => html`<li><a href="${s.url}" rel="me noopener" target="_blank">
                      <span class="visually-hidden">${s.name}</span>${icon(SOCIAL_ICONS[s.icon] || 'mail', { size: 18 })}
                    </a></li>`
                  )}
                </ul>`
              : ''}
          </div>

          <div>
            <h3>${nav.find((n) => n.id === 'contacts')?.label ?? 'Contacts'}</h3>
            <ul class="stack">
              <li><a href="tel:${contacts.phoneHref}">${contacts.phone}</a></li>
              ${contacts.email ? html`<li><a href="mailto:${contacts.email}">${contacts.email}</a></li>` : ''}
              <li class="muted">${contacts.address.full}</li>
            </ul>
          </div>

          <div>
            <h3>${ui.callUs}</h3>
            <table class="hours-table">
              <tbody>
                ${hours.map(
                  (slot) => html`<tr data-days="${slot.days.join(',')}">
                    <th scope="row">${slot.label}</th>
                    <td>${slot.opens}—${slot.closes}</td>
                  </tr>`
                )}
              </tbody>
            </table>
          </div>

          <div>
            <h3>${nav.find((n) => n.id === 'menu')?.label ?? 'Menu'}</h3>
            <ul class="stack">
              ${nav.map((item) => html`<li><a href="#${item.id}">${item.label}</a></li>`)}
              <li><a href="${base}privacy/index.html">${legal.privacyTitle}</a></li>
            </ul>
          </div>
        </div>

        <div class="footer-bottom">
          <span>© ${year} ${brand.legalName}. ${legal.copyright}.</span>
          ${legal.credits ? html`<span>${legal.credits}</span>` : ''}
        </div>
      </div>
    </footer>

    <a class="icon-btn to-top" href="#top" title="${ui.backToTop}">
      <span class="visually-hidden">${ui.backToTop}</span>${icon('arrowUp', { size: 20 })}
    </a>
  `;
}

/**
 * Full document shell.
 * @param {object} o
 * @param {object} o.content locale content bundle
 * @param {{title:string,description:string,path:string,base:string,noindex?:boolean}} o.page
 * @param {import('../lib/html.js').Raw} o.body
 * @param {object|null} o.jsonld
 * @param {{siteUrl:string, altHref:string, altLabel:string, altLang:string, canonicalPath:string, year:number, buildId:string}} o.site
 */
export function layout({ content, page, body, jsonld, site, chrome = true }) {
  const { seo, ui, meta, brand } = content;
  const canonical = `${site.siteUrl}${site.canonicalPath}`;
  const ogImage = `${site.siteUrl}/${seo.ogImage}`;

  return `<!doctype html>
<html lang="${content.langTag}" data-build="${site.buildId}">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
<title>${page.title}</title>
<meta name="description" content="${page.description}" />
${page.noindex ? '<meta name="robots" content="noindex, follow" />' : '<meta name="robots" content="index, follow, max-image-preview:large" />'}
<link rel="canonical" href="${canonical}" />
<link rel="alternate" hreflang="${content.langTag}" href="${canonical}" />
<link rel="alternate" hreflang="${site.altLang}" href="${site.siteUrl}${site.altCanonicalPath}" />
<link rel="alternate" hreflang="x-default" href="${site.siteUrl}/" />
<meta name="theme-color" content="#1a1310" media="(prefers-color-scheme: dark)" />
<meta name="theme-color" content="#fbf8f4" media="(prefers-color-scheme: light)" />
<meta name="color-scheme" content="light dark" />
<meta property="og:type" content="restaurant" />
<meta property="og:site_name" content="${brand.name}" />
<meta property="og:locale" content="${content.langTag.replace('-', '_')}" />
<meta property="og:title" content="${page.title}" />
<meta property="og:description" content="${page.description}" />
<meta property="og:url" content="${canonical}" />
<meta property="og:image" content="${ogImage}" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${page.title}" />
<meta name="twitter:description" content="${page.description}" />
<meta name="twitter:image" content="${ogImage}" />
<link rel="icon" href="${page.base}img/logo.svg" type="image/svg+xml" />
<link rel="apple-touch-icon" href="${page.base}img/apple-touch-icon.png" />
<link rel="manifest" href="${page.base}manifest.webmanifest" />
<link rel="stylesheet" href="${page.base}css/styles.css?v=${site.buildId}" />
<script src="${page.base}js/theme-boot.js?v=${site.buildId}"></script>
${jsonld ? `<script type="application/ld+json">${jsonScript(jsonld)}</script>` : ''}
<script type="application/json" id="opening-hours-data">${jsonScript(content.hours)}</script>
</head>
<body id="top">
${
  chrome && meta.dataStatus !== 'verified'
    ? `<div class="notice-bar" data-notice="demo" hidden>
  <div class="shell notice-bar__inner">
    <p>${ui.demoBanner}</p>
    <button type="button" data-notice-dismiss>${ui.demoBannerDismiss}</button>
  </div>
</div>`
    : ''
}
${chrome ? headerBlock(content, { base: page.base, altHref: site.altHref, altLabel: site.altLabel }) : ''}
<main id="main">
${body}
</main>
${chrome ? footerBlock(content, { base: page.base, year: site.year }) : ''}
<script type="module" src="${page.base}js/app.js?v=${site.buildId}"></script>
</body>
</html>
`;
}
