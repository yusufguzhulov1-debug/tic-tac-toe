/* ==========================================================================
   Chinar — рендер разметки из контентной модели.
   Вёрстка не знает о данных, данные не знают о вёрстке: при переезде на
   Next.js эти функции заменяются одноимёнными React-компонентами.
   ========================================================================== */

const esc = (s) =>
  String(s).replace(/[&<>"']/g, (ch) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch])
  );

/**
 * Медиа-слот.
 * Принимает и одиночный файл, и адаптивный набор:
 *   { src, srcset: "photo-800.avif 800w, photo-1600.avif 1600w", sizes, alt, focal, eager }
 * `focal` — точка кадрирования ("50% 35%"), чтобы главный объект не срезался
 * при кропе под разные пропорции. Пока src пуст — заглушка с подписью.
 */
function media(item, extraClass = "") {
  const label = esc(item.alt || item.label || "Фото");
  if (!item.src) {
    return `<div class="ph ${extraClass}" data-label="${esc(item.label || "Фото")}" role="img" aria-label="${label}"></div>`;
  }
  const attrs = [
    `class="${extraClass}"`,
    `src="${esc(item.src)}"`,
    `alt="${label}"`,
    item.srcset ? `srcset="${esc(item.srcset)}"` : "",
    item.sizes ? `sizes="${esc(item.sizes)}"` : "",
    item.focal ? `style="object-position:${esc(item.focal)}"` : "",
    // Кадр первого экрана грузится сразу, остальные — лениво
    item.eager ? 'loading="eager" fetchpriority="high"' : 'loading="lazy"',
    'decoding="async"'
  ].filter(Boolean).join(" ");
  return `<img ${attrs}>`;
}

export function renderHeader() {
  return `
    <div class="header__cta">
      <a class="btn btn--ghost" data-magnetic href="#booking"><span class="btn__label">Бронь стола</span></a>
    </div>
    <a class="header__logo" href="#top">CHI<span>N</span>AR</a>
    <button class="burger" type="button" aria-expanded="false" aria-controls="navmenu" aria-label="Открыть меню">
      <span></span><span></span>
    </button>`;
}

export function renderMenuOverlay(c) {
  const items = c.nav
    .map(
      (n) => `<li class="navmenu__item"><a href="${esc(n.href)}"><i>${esc(n.index)}</i>${esc(n.label)}</a></li>`
    )
    .join("");
  const socials = c.brand.socials
    .map((s) => `<a href="${esc(s.href)}">${esc(s.label)}</a>`)
    .join("");
  return `
    <nav aria-label="Основная навигация"><ul class="navmenu__list">${items}</ul></nav>
    <div class="navmenu__foot">
      <a href="${esc(c.brand.phoneHref)}">${esc(c.brand.phone)}</a>
      <span>${esc(c.brand.address)}</span>
      ${socials}
    </div>`;
}

export function renderHero(h, brand) {
  const lines = h.titleLines
    .map((l, i) => `<span class="mask-line" style="--reveal-delay:${i * 0.09}s"><span>${l}</span></span>`)
    .join("");
  return `
    <div class="hero__media">
      ${media(h.poster, "hero__poster")}
      <div class="hero__embers" aria-hidden="true"></div>
      <video playsinline muted loop preload="none"
             data-src-desktop="${esc(h.video.desktop)}"
             data-src-mobile="${esc(h.video.mobile)}"></video>
    </div>
    <div class="hero__scrim" aria-hidden="true"></div>
    <div class="shell">
      <p class="t-caption reveal">${esc(brand.descriptor)}</p>
      <h1 class="hero__title">${lines}</h1>
      <div class="hero__row">
        <p class="t-lead reveal" style="--reveal-delay:.15s">${esc(h.lead)}</p>
        <div class="reveal" style="--reveal-delay:.25s">
          <a class="btn btn--primary" data-magnetic href="${esc(h.cta.href)}"><span class="btn__label">${esc(h.cta.label)}</span></a>
        </div>
      </div>
    </div>
    <a class="hero__scroll" href="#concept" aria-label="К следующей секции">
      <i aria-hidden="true"></i>
      <span class="t-caption">Скролл</span>
    </a>`;
}
export function renderConcept(c) {
  const [a, b] = c.media;
  const body = c.body.map((p) => `<p class="t-lead">${esc(p)}</p>`).join("");
  const facts = c.facts
    .map(
      (f, i) =>
        `<div class="reveal" style="--reveal-delay:${i * 0.08}s"><b>${esc(f.value)}</b><span class="t-caption">${esc(f.label)}</span></div>`
    )
    .join("");
  return `
    <div class="shell">
      <div class="concept__grid">
        <figure class="concept__media concept__media--a reveal" data-parallax="0.12">${media(a)}</figure>
        <div class="concept__text glass reveal" style="--reveal-delay:.1s">
          <p class="t-caption">${esc(c.caption)}</p>
          <h2>${esc(c.title)}</h2>
          ${body}
        </div>
        <figure class="concept__media concept__media--b reveal" data-parallax="-0.08" style="--reveal-delay:.2s">${media(b)}</figure>
      </div>
      <div class="concept__facts">${facts}</div>
    </div>`;
}

export function renderMenu(m) {
  const catLabel = Object.fromEntries(m.categories.map((c) => [c.id, c.label]));
  const chips = m.categories
    .map(
      (c, i) =>
        `<button class="chip${i === 0 ? " is-active" : ""}" type="button" data-filter="${esc(c.id)}">${esc(c.label)}</button>`
    )
    .join("");
  const cards = m.dishes
    .map(
      (d, i) => `
      <article class="dish reveal" data-size="${esc(d.size)}" data-cat="${esc(d.cat)}" style="--reveal-delay:${(i % 4) * 0.07}s">
        <div class="dish__media">${media(d)}</div>
        <div class="dish__scrim" aria-hidden="true"></div>
        <div class="dish__body">
          <h3 class="dish__name">${esc(d.name)}</h3>
          <p class="dish__desc">${esc(d.desc)}</p>
          <div class="dish__meta">
            <span class="t-caption">${esc(catLabel[d.cat] || d.cat)}</span>
            <span class="dish__price">${esc(d.price)}</span>
          </div>
        </div>
      </article>`
    )
    .join("");
  return `
    <div class="shell">
      <header class="section__head">
        <div>
          <p class="t-caption reveal">${esc(m.caption)}</p>
          <h2 class="section__title reveal" style="--reveal-delay:.08s">${esc(m.title)}</h2>
        </div>
        <div class="menu__filters reveal" style="--reveal-delay:.16s" role="group" aria-label="Категории меню">${chips}</div>
      </header>
      <div class="bento">${cards}</div>
    </div>`;
}

export function renderInterior(i) {
  const slides = i.slides
    .map(
      (s) => `
      <figure class="interior__slide">
        ${media(s)}
        <figcaption class="glass t-caption">${esc(s.caption)}</figcaption>
      </figure>`
    )
    .join("");
  return `
    <div class="interior__pin">
      <div class="interior__intro">
        <p class="t-caption">${esc(i.caption)}</p>
        <h2 class="section__title">${esc(i.title)}</h2>
      </div>
      <div class="interior__track">${slides}</div>
      <div class="interior__progress" aria-hidden="true"><i></i></div>
    </div>`;
}

export function renderBooking(b, brand) {
  const slots = b.slots
    .map((s) => `<button class="slot" type="button" data-slot="${esc(s)}">${esc(s)}</button>`)
    .join("");
  return `
    <div class="shell">
      <header class="section__head">
        <div>
          <p class="t-caption reveal">${esc(b.caption)}</p>
          <h2 class="section__title reveal" style="--reveal-delay:.08s">${esc(b.title)}</h2>
        </div>
        <p class="t-lead reveal" style="--reveal-delay:.16s">${esc(b.lead)}</p>
      </header>
      <div class="booking__grid">
        <div class="picker glass reveal" aria-label="Выбор даты и времени">
          <div class="picker__head">
            <button class="picker__nav" type="button" data-month="-1" aria-label="Предыдущий месяц">‹</button>
            <b data-month-label></b>
            <button class="picker__nav" type="button" data-month="1" aria-label="Следующий месяц">›</button>
          </div>
          <div class="picker__grid" data-calendar role="grid"></div>
          <div>
            <p class="t-caption" style="margin:.4rem 0 .6rem">Время</p>
            <div class="picker__slots" role="group" aria-label="Время визита">${slots}</div>
          </div>
        </div>

        <form class="form glass reveal" style="--reveal-delay:.1s" novalidate>
          <div class="field">
            <label for="bk-name">Имя</label>
            <input id="bk-name" name="name" type="text" autocomplete="name" placeholder="Как к вам обращаться" required>
          </div>
          <div class="field">
            <label for="bk-phone">Телефон</label>
            <input id="bk-phone" name="phone" type="tel" autocomplete="tel" placeholder="+7 (___) ___-__-__" required>
          </div>
          <div class="field">
            <label>Гостей</label>
            <div class="stepper">
              <button type="button" data-guests="-1" aria-label="Меньше гостей">−</button>
              <output data-guests-value>2</output>
              <button type="button" data-guests="1" aria-label="Больше гостей">+</button>
            </div>
          </div>
          <div class="field">
            <label for="bk-note">Пожелания</label>
            <input id="bk-note" name="note" type="text" placeholder="Столик у окна, детский стул…">
          </div>
          <label class="consent">
            <input type="checkbox" name="consent" required>
            <span>Согласен на обработку персональных данных</span>
          </label>
          <p class="field__error" data-error role="alert"></p>
          <button class="btn btn--primary btn--block" data-magnetic type="submit"><span class="btn__label">Забронировать</span></button>
          <p class="form__status" data-status role="status"></p>
        </form>
      </div>
    </div>`;
}

export function renderFooter(c) {
  const nav = c.nav.map((n) => `<li><a href="${esc(n.href)}">${esc(n.label)}</a></li>`).join("");
  const socials = c.brand.socials.map((s) => `<li><a href="${esc(s.href)}">${esc(s.label)}</a></li>`).join("");
  return `
    <div class="shell">
      <div class="footer__grid">
        <div>
          <p class="footer__logo">Chinar</p>
          <p class="t-lead">${esc(c.brand.descriptor)}</p>
        </div>
        <div>
          <h4>Навигация</h4>
          <ul>${nav}</ul>
        </div>
        <div>
          <h4>Контакты</h4>
          <ul>
            <li><a href="${esc(c.brand.phoneHref)}">${esc(c.brand.phone)}</a></li>
            <li><a href="${esc(c.brand.addressMapUrl)}">${esc(c.brand.address)}</a></li>
            <li>${esc(c.brand.hours)}</li>
          </ul>
          <h4 style="margin-top:1.5rem">Соцсети</h4>
          <ul>${socials}</ul>
        </div>
      </div>
      <div class="footer__bottom">
        <span>© ${esc(c.footer.year)} Chinar. ${esc(c.footer.legal)}</span>
        <span>Дизайн-концепт редизайна</span>
      </div>
    </div>`;
}
