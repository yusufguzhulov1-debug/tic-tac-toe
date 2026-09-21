/* ==========================================================================
   Chinar — точка входа: рендер контента, инициализация движения и логики.
   ========================================================================== */

import { CONTENT } from "./content.js";
import * as R from "./render.js";
import {
  createSmoothScroll, initReveal, initMagnetic,
  initParallax, initHorizontal, initCursor, reducedMotion
} from "./motion.js";
import { initBooking } from "./booking.js";

/* ------------------------------- 1. Рендер ------------------------------ */

const mount = (sel, html) => {
  const el = document.querySelector(sel);
  if (el) el.innerHTML = html;
  return el;
};

const header = mount(".header", R.renderHeader());
const navmenu = mount(".navmenu", R.renderMenuOverlay(CONTENT));
mount(".hero", R.renderHero(CONTENT.hero, CONTENT.brand));
mount(".concept", R.renderConcept(CONTENT.concept));
mount(".menu", R.renderMenu(CONTENT.menu));
mount(".interior", R.renderInterior(CONTENT.interior));
const booking = mount(".booking", R.renderBooking(CONTENT.booking, CONTENT.brand));
mount(".footer", R.renderFooter(CONTENT));

document.title = `${CONTENT.brand.name} — ${CONTENT.brand.descriptor}`;

/* ------------------------------- 2. Движение ---------------------------- */

const scroller = createSmoothScroll();
initReveal();
initMagnetic();
initParallax(scroller, document);
initHorizontal(scroller, document.querySelector(".interior"));
initCursor();
initBooking(booking, CONTENT.booking);

/* ----------------------- 3. Hero: видео при наличии --------------------- */
/* Видео не грузится вслепую: источник подключается только если файл реально
   существует, иначе остаётся анимированный фолбэк (никакого битого кадра). */
(function initHeroVideo() {
  const video = document.querySelector(".hero__media video");
  if (!video || reducedMotion) return;
  const mobile = window.matchMedia("(max-width: 720px)").matches;
  const src = mobile ? video.dataset.srcMobile : video.dataset.srcDesktop;
  if (!src) return;

  fetch(src, { method: "HEAD" })
    .then((res) => {
      if (!res.ok) return;
      video.src = src;
      video.play().catch(() => {});      // автоплей может быть запрещён политикой
      video.addEventListener("loadeddata", () => video.classList.add("is-ready"), { once: true });
    })
    .catch(() => {/* файла нет — работает фолбэк */});
})();

/* --------------------------- 4. Шапка и меню ---------------------------- */

const burger = header.querySelector(".burger");
let menuOpen = false;

function setMenu(open) {
  menuOpen = open;
  navmenu.classList.toggle("is-open", open);
  document.body.classList.toggle("is-locked", open);
  burger.setAttribute("aria-expanded", String(open));
  burger.setAttribute("aria-label", open ? "Закрыть меню" : "Открыть меню");
  // Каскад строк меню
  navmenu.querySelectorAll(".navmenu__item a").forEach((a, i) => {
    a.style.transitionDelay = open ? `${0.08 + i * 0.07}s` : "0s";
  });
}

burger.addEventListener("click", () => setMenu(!menuOpen));
document.addEventListener("keydown", (e) => { if (e.key === "Escape" && menuOpen) setMenu(false); });

// Прячем шапку при скролле вниз, возвращаем при скролле вверх
let lastY = window.scrollY;
scroller.onFrame((y) => {
  header.classList.toggle("is-stuck", y > window.innerHeight * 0.6);
  header.classList.toggle("is-hidden", !menuOpen && y > lastY && y > 400);
  lastY = y;
});

/* ------------------- 5. Якоря через инерционный скролл ------------------ */

document.addEventListener("click", (e) => {
  const link = e.target.closest('a[href^="#"]');
  if (!link) return;
  const id = link.getAttribute("href");
  const target = id === "#top" ? document.body : document.querySelector(id);
  if (!target) return;
  e.preventDefault();
  if (menuOpen) setMenu(false);
  // Отступ на высоту плавающей шапки, чтобы капшен секции не уходил под неё
  const offset = header.getBoundingClientRect().height + 32;
  const y = id === "#top" ? 0 : target.getBoundingClientRect().top + window.scrollY - offset;
  scroller.scrollTo(y);
  history.replaceState(null, "", id === "#top" ? location.pathname : id);
});

/* --------------------------- 6. Фильтр меню ----------------------------- */

const menuSection = document.querySelector(".menu");
menuSection.addEventListener("click", (e) => {
  const chip = e.target.closest("[data-filter]");
  if (!chip) return;
  const cat = chip.dataset.filter;
  menuSection.querySelectorAll("[data-filter]").forEach((c) => c.classList.toggle("is-active", c === chip));
  menuSection.querySelectorAll(".dish").forEach((dish) => {
    dish.classList.toggle("is-filtered", cat !== "all" && dish.dataset.cat !== cat);
  });
});
