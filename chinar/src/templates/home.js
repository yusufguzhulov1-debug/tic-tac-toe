import { html, jsonAttr } from '../lib/html.js';
import { icon } from '../lib/icons.js';
import { formatPrice } from '../assets/js/lib/menu-search.js';

const sectionHead = (id, eyebrow, title, subtitle) => html`
  <div class="section-head reveal">
    <p class="eyebrow">${eyebrow}</p>
    <h2 id="${id}">${title}</h2>
    ${subtitle ? html`<p class="lede">${subtitle}</p>` : ''}
  </div>
`;

function hero(content, base) {
  const h = content.hero;
  return html`
    <section class="hero" aria-labelledby="hero-title">
      <img class="hero__bg" src="${base}img/hero.svg" alt="" width="1600" height="900" fetchpriority="high" decoding="async" />
      <div class="shell hero__inner">
        <span class="status-pill" data-open-state data-labels="${jsonAttr({
          openUntil: content.locale === 'ru' ? 'Открыто до {time}' : 'Open until {time}',
          opensAt: content.locale === 'ru' ? 'Откроется в {time}' : 'Opens at {time}',
          closed: content.locale === 'ru' ? 'Закрыто' : 'Closed',
        })}">${content.locale === 'ru' ? 'Часы работы' : 'Opening hours'}</span>
        <p class="eyebrow">${h.eyebrow}</p>
        <h1 id="hero-title">${h.title}</h1>
        <p class="hero__sub">${h.subtitle}</p>
        <div class="hero__actions">
          <a class="btn btn--large" href="${h.primaryCta.href}">${h.primaryCta.label}</a>
          <a class="btn btn--ghost btn--large" href="${h.secondaryCta.href}">${h.secondaryCta.label}</a>
        </div>
        <dl class="hero__stats">
          ${h.highlights.map(
            (s) => html`<div class="stat"><dt class="stat__label">${s.label}</dt><dd class="stat__value">${s.value}</dd></div>`
          )}
        </dl>
      </div>
    </section>
  `;
}

function about(content, base) {
  const a = content.about;
  return html`
    <section class="section" id="about" aria-labelledby="about-title">
      <div class="shell split split--about">
        <div class="stack stack--m reveal">
          <p class="eyebrow">${a.eyebrow}</p>
          <h2 id="about-title">${a.title}</h2>
          ${a.paragraphs.map((p) => html`<p class="lede">${p}</p>`)}
          <ul class="grid-auto grid-auto--sm mt-l">
            ${a.features.map(
              (f) => html`<li class="card">
                <span class="card__icon">${icon(f.icon, { size: 24 })}</span>
                <h3>${f.title}</h3>
                <p class="muted">${f.text}</p>
              </li>`
            )}
          </ul>
        </div>
        <div class="about__media reveal">
          <img src="${base}img/about-1.svg" alt="" width="600" height="800" loading="lazy" decoding="async" />
          <img src="${base}img/about-2.svg" alt="" width="600" height="800" loading="lazy" decoding="async" />
        </div>
      </div>
    </section>
  `;
}

function menu(content) {
  const m = content.menu;
  const { ui } = content;
  const priceOpts = { symbol: m.currencySymbol, locale: content.langTag };
  return html`
    <section class="section section--alt" id="menu" aria-labelledby="menu-title" data-menu>
      <div class="shell">
        ${sectionHead('menu-title', m.eyebrow, m.title, m.subtitle)}

        <div class="menu-toolbar">
          <div class="menu-filters" role="group" aria-label="${m.title}">
            <button class="chip" type="button" data-menu-filter="all" aria-pressed="true">${ui.allCategories}</button>
            ${m.categories.map(
              (c) => html`<button class="chip" type="button" data-menu-filter="${c.id}" aria-pressed="false">${c.title}</button>`
            )}
          </div>
          <div class="search-field">
            ${icon('search', { size: 18 })}
            <label class="visually-hidden" for="menu-search">${ui.searchMenu}</label>
            <input id="menu-search" type="search" data-menu-search placeholder="${ui.searchPlaceholder}" autocomplete="off" />
          </div>
          <p class="visually-hidden" role="status" aria-live="polite">
            <span data-menu-live></span>
          </p>
        </div>

        ${m.categories.map(
          (cat) => html`
            <div class="menu-group" data-menu-group="${cat.id}" id="menu-${cat.id}">
              <div class="menu-group__head">
                <h3>${cat.title}</h3>
                ${cat.description ? html`<p class="muted">${cat.description}</p>` : ''}
              </div>
              <ul class="menu-list">
                ${cat.items.map(
                  (item) => html`<li class="menu-item" data-item
                      data-name="${item.name}"
                      data-description="${item.description || ''}"
                      data-tags="${(item.tags || []).join('|')}">
                    <p class="menu-item__name">${item.name}${(item.tags || []).map((t) => html`<span class="tag">${t}</span>`)}</p>
                    <p class="menu-item__price">${formatPrice(item.price, priceOpts)}</p>
                    ${item.description ? html`<p class="menu-item__desc">${item.description}</p>` : ''}
                    ${item.weight ? html`<p class="menu-item__meta">${item.weight}</p>` : ''}
                  </li>`
                )}
              </ul>
            </div>
          `
        )}

        <p class="empty-state" data-menu-empty hidden>${ui.nothingFound}</p>
      </div>
    </section>
  `;
}

function banquet(content) {
  const b = content.banquet;
  return html`
    <section class="section" id="banquet" aria-labelledby="banquet-title">
      <div class="shell">
        <div class="section-head reveal">
          <p class="eyebrow">${b.eyebrow}</p>
          <h2 id="banquet-title">${b.title}</h2>
          <p class="lede">${b.text}</p>
        </div>
        <ul class="grid-auto grid-auto--md">
          ${b.halls.map(
            (hall) => html`<li class="card hall-card reveal">
              <h3>${hall.name}</h3>
              <p class="hall-card__capacity">${hall.capacity}</p>
              <ul>${hall.features.map((f) => html`<li>${f}</li>`)}</ul>
            </li>`
          )}
        </ul>
        <p class="mt-xl"><a class="btn btn--large" href="${b.cta.href}">${b.cta.label}</a></p>
      </div>
    </section>
  `;
}

function delivery(content) {
  const d = content.delivery;
  return html`
    <section class="section section--tight" id="delivery" aria-labelledby="delivery-title">
      <div class="shell">
        <div class="delivery-strip reveal">
          <div>
            <p class="eyebrow">${d.eyebrow}</p>
            <h2 id="delivery-title" class="title-3">${d.title}</h2>
            <p class="muted mt-l">${d.text}</p>
            <ul>${d.points.map((p) => html`<li>${p}</li>`)}</ul>
          </div>
          <a class="btn btn--large" href="tel:${content.contacts.phoneHref}">
            ${icon('phone', { size: 20 })} ${content.contacts.phone}
          </a>
        </div>
      </div>
    </section>
  `;
}

function gallery(content, base) {
  const g = content.gallery;
  return html`
    <section class="section section--alt" id="gallery" aria-labelledby="gallery-title">
      <div class="shell shell--wide">
        ${sectionHead('gallery-title', g.eyebrow, g.title, g.subtitle)}
        <div class="gallery-grid">
          ${g.items.map(
            (item) => html`<figure class="gallery-item reveal">
              <img src="${base}${item.src}" alt="${item.alt}" width="${item.width}" height="${item.height}"
                   loading="lazy" decoding="async" />
              <figcaption>${item.alt}</figcaption>
            </figure>`
          )}
        </div>
      </div>
    </section>
  `;
}

function reviews(content) {
  const r = content.reviews;
  return html`
    <section class="section" id="reviews" aria-labelledby="reviews-title">
      <div class="shell">
        ${sectionHead('reviews-title', r.eyebrow, r.title, r.subtitle)}
        <ul class="grid-auto grid-auto--lg">
          ${r.items.map(
            (item) => html`<li class="review reveal">
              <span class="rating" role="img" aria-label="${item.rating} / 5">
                ${Array.from({ length: Math.max(0, Math.min(5, Number(item.rating) || 0)) }, () => icon('star', { size: 16 }))}
              </span>
              <figure class="stack">
                <blockquote>${item.text}</blockquote>
                <figcaption>${item.author}${item.source ? html` · <span class="muted">${item.source}</span>` : ''}</figcaption>
              </figure>
            </li>`
          )}
        </ul>
      </div>
    </section>
  `;
}

function reservation(content) {
  const r = content.reservation;
  const f = content.ui.form;
  const c = content.contacts;
  const messages = {
    required: f.required,
    invalidPhone: f.invalidPhone,
    invalidDate: f.invalidDate,
    invalidGuests: f.invalidGuests,
    sending: f.sending,
    successTitle: r.successTitle,
    successText: r.successText,
    errorTitle: content.locale === 'ru' ? 'Ошибка' : 'Error',
    errorText: r.errorText,
  };
  const guestOptions = Array.from({ length: r.maxGuests }, (_, i) => i + 1);

  return html`
    <section class="section section--alt" id="reserve" aria-labelledby="reserve-title">
      <div class="shell">
        <div class="reserve-panel">
          <div class="reserve-aside">
            <p class="eyebrow">${r.eyebrow}</p>
            <h2 id="reserve-title">${r.title}</h2>
            <p class="muted">${r.text}</p>

            <div class="stack">
              <p class="contact-line">${icon('phone')}<a href="tel:${c.phoneHref}">${c.phone}</a></p>
              ${c.email ? html`<p class="contact-line">${icon('mail')}<a href="mailto:${c.email}">${c.email}</a></p>` : ''}
              <p class="contact-line">${icon('pin')}<span>${c.address.full}</span></p>
              <div class="contact-line">
                ${icon('clock')}
                <table class="hours-table">
                  <caption class="visually-hidden">${content.ui.callUs}</caption>
                  <tbody>
                    ${content.hours.map(
                      (slot) => html`<tr data-days="${slot.days.join(',')}">
                        <th scope="row">${slot.label}</th><td>${slot.opens}—${slot.closes}</td>
                      </tr>`
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <form class="stack stack--m" data-reserve-form novalidate
                method="post"
                action="${r.endpoint || ''}"
                data-endpoint="${r.endpoint || ''}"
                data-max-guests="${r.maxGuests}"
                data-messages="${jsonAttr(messages)}">
            <div class="form-status" data-form-status tabindex="-1" role="status" aria-live="polite" hidden></div>

            <div class="form-grid">
              <p class="field">
                <label for="rf-name">${f.name}</label>
                <input id="rf-name" name="name" type="text" required autocomplete="name" minlength="2" />
                <span class="field__error" data-error-for="name"></span>
              </p>
              <p class="field">
                <label for="rf-phone">${f.phone}</label>
                <input id="rf-phone" name="phone" type="tel" required autocomplete="tel" inputmode="tel"
                       placeholder="+7 999 123-45-67" />
                <span class="field__error" data-error-for="phone"></span>
              </p>
              <p class="field">
                <label for="rf-date">${f.date}</label>
                <input id="rf-date" name="date" type="date" required />
                <span class="field__error" data-error-for="date"></span>
              </p>
              <p class="field">
                <label for="rf-time">${f.time}</label>
                <input id="rf-time" name="time" type="time" required step="900" />
                <span class="field__error" data-error-for="time"></span>
              </p>
              <p class="field">
                <label for="rf-guests">${f.guests}</label>
                <select id="rf-guests" name="guests" required>
                  ${guestOptions.map((n) => html`<option value="${n}"${n === 2 ? ' selected' : ''}>${n}</option>`)}
                </select>
                <span class="field__error" data-error-for="guests"></span>
              </p>
              <p class="field field--full">
                <label for="rf-comment">${f.comment}</label>
                <textarea id="rf-comment" name="comment" rows="3" maxlength="500"></textarea>
                <span class="field__hint">${f.commentHint}</span>
              </p>
            </div>

            <p class="hp" aria-hidden="true">
              <label for="rf-company">Company</label>
              <input id="rf-company" name="company" type="text" tabindex="-1" autocomplete="off" />
            </p>

            <button class="btn btn--large btn--block" type="submit">${f.submit}</button>
            <p class="field__hint">${r.consent}</p>
          </form>
        </div>
      </div>
    </section>
  `;
}

function contacts(content) {
  const c = content.contacts;
  const label = content.nav.find((n) => n.id === 'contacts')?.label ?? 'Contacts';
  return html`
    <section class="section" id="contacts" aria-labelledby="contacts-title">
      <div class="shell">
        <div class="section-head reveal">
          <p class="eyebrow">${label}</p>
          <h2 id="contacts-title">${c.address.full}</h2>
        </div>
        ${c.mapEmbedUrl
          ? html`<iframe class="map-frame" src="${c.mapEmbedUrl}" title="${label}" loading="lazy"
                         referrerpolicy="no-referrer-when-downgrade"></iframe>`
          : html`<p class="empty-state">
              ${content.locale === 'ru'
                ? 'Карта появится здесь: укажите contacts.mapEmbedUrl в content/site.ru.json.'
                : 'The map goes here: set contacts.mapEmbedUrl in content/site.en.json.'}
            </p>`}
        ${c.mapLinkUrl
          ? html`<p class="mt-l"><a class="btn btn--ghost" href="${c.mapLinkUrl}" target="_blank" rel="noopener">
              ${icon('pin', { size: 18 })} ${content.locale === 'ru' ? 'Открыть на карте' : 'Open in maps'}</a></p>`
          : ''}
      </div>
    </section>
  `;
}

export function homePage(content, base) {
  return html`
    ${hero(content, base)}
    ${about(content, base)}
    ${menu(content)}
    ${banquet(content)}
    ${delivery(content)}
    ${gallery(content, base)}
    ${reviews(content)}
    ${reservation(content)}
    ${contacts(content)}
  `;
}
