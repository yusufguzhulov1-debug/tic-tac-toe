/* ==========================================================================
   Chinar — motion layer.
   Здесь собраны все эффекты из брифа. В Next.js-сборке каждый блок
   заменяется на GSAP ScrollTrigger / Lenis (соответствия — в DESIGN.md),
   поведение и тайминги остаются теми же.
   ========================================================================== */

export const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

/* --------------------------------------------------------------------------
   1. Smooth scroll с инерцией (аналог Lenis).
   Перехватываем колесо, ведём виртуальную позицию и догоняем её липом —
   нативный scrollTop остаётся настоящим, поэтому sticky, якоря,
   IntersectionObserver и доступность продолжают работать как обычно.
   -------------------------------------------------------------------------- */
export function createSmoothScroll({ lerpFactor = 0.095 } = {}) {
  const supportsTouch = window.matchMedia("(pointer: coarse)").matches;
  const state = { target: window.scrollY, current: window.scrollY, active: false };
  const listeners = new Set();

  const maxScroll = () =>
    Math.max(0, document.documentElement.scrollHeight - window.innerHeight);

  function onWheel(e) {
    if (e.ctrlKey) return;            // pinch-zoom не трогаем
    if (document.body.classList.contains("is-locked")) return;
    e.preventDefault();
    state.active = true;
    state.target = clamp(state.target + e.deltaY, 0, maxScroll());
  }

  function syncFromNative() {
    // Клавиатура, скроллбар, якоря — источник истины остаётся нативным
    if (!state.active) {
      state.target = window.scrollY;
      state.current = window.scrollY;
    }
  }

  function frame() {
    if (state.active) {
      state.current = lerp(state.current, state.target, lerpFactor);
      if (Math.abs(state.target - state.current) < 0.15) {
        state.current = state.target;
        state.active = false;
      }
      window.scrollTo(0, state.current);
    }
    listeners.forEach((fn) => fn(window.scrollY));
    requestAnimationFrame(frame);
  }

  if (!reducedMotion && !supportsTouch) {
    window.addEventListener("wheel", onWheel, { passive: false });
  }
  window.addEventListener("scroll", syncFromNative, { passive: true });
  requestAnimationFrame(frame);

  return {
    onFrame: (fn) => listeners.add(fn),
    scrollTo(y) {
      state.target = clamp(y, 0, maxScroll());
      state.current = window.scrollY;
      state.active = !reducedMotion;
      if (reducedMotion) window.scrollTo(0, state.target);
    }
  };
}

/* --------------------------------------------------------------------------
   2. Reveal on scroll — появление снизу вверх с маскировкой строк.
   -------------------------------------------------------------------------- */
export function initReveal(root = document) {
  const targets = root.querySelectorAll(".reveal, .mask-line");
  if (reducedMotion || !("IntersectionObserver" in window)) {
    targets.forEach((el) => el.classList.add("is-in"));
    return;
  }
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-in");
        io.unobserve(entry.target);           // появление — одноразовое
      });
    },
    { rootMargin: "0px 0px -12% 0px", threshold: 0.15 }
  );
  targets.forEach((el) => io.observe(el));
}

/* --------------------------------------------------------------------------
   3. Магнитные кнопки: элемент притягивается к курсору в радиусе действия.
   -------------------------------------------------------------------------- */
export function initMagnetic(root = document, { radius = 90, strength = 0.32 } = {}) {
  if (reducedMotion || window.matchMedia("(pointer: coarse)").matches) return;

  root.querySelectorAll("[data-magnetic]").forEach((el) => {
    const label = el.querySelector(".btn__label");
    let raf = null;
    const pos = { x: 0, y: 0, tx: 0, ty: 0 };

    const run = () => {
      pos.x = lerp(pos.x, pos.tx, 0.18);
      pos.y = lerp(pos.y, pos.ty, 0.18);
      el.style.transform = `translate3d(${pos.x}px, ${pos.y}px, 0)`;
      if (label) label.style.transform = `translate3d(${pos.x * 0.35}px, ${pos.y * 0.35}px, 0)`;
      const still = Math.abs(pos.x - pos.tx) < 0.1 && Math.abs(pos.y - pos.ty) < 0.1;
      raf = still ? null : requestAnimationFrame(run);
    };
    const kick = () => { if (raf === null) raf = requestAnimationFrame(run); };

    const onMove = (e) => {
      const r = el.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width / 2);
      const dy = e.clientY - (r.top + r.height / 2);
      const near = Math.hypot(dx, dy) < Math.max(r.width, r.height) / 2 + radius;
      pos.tx = near ? dx * strength : 0;
      pos.ty = near ? dy * strength : 0;
      kick();
    };

    window.addEventListener("mousemove", onMove, { passive: true });
    el.addEventListener("mouseleave", () => { pos.tx = 0; pos.ty = 0; kick(); });
  });
}

/* --------------------------------------------------------------------------
   4. Параллакс: медиа внутри маски двигаются с разной скоростью.
   -------------------------------------------------------------------------- */
export function initParallax(scroller, root = document) {
  if (reducedMotion) return;
  const items = [...root.querySelectorAll("[data-parallax]")].map((el) => ({
    el,
    inner: el.firstElementChild,
    speed: parseFloat(el.dataset.parallax) || 0.1
  }));
  if (!items.length) return;

  scroller.onFrame(() => {
    const vh = window.innerHeight;
    items.forEach(({ el, inner, speed }) => {
      if (!inner) return;
      const r = el.getBoundingClientRect();
      if (r.bottom < -vh * 0.5 || r.top > vh * 1.5) return;   // вне зоны — не считаем
      const progress = (r.top + r.height / 2 - vh / 2) / vh;  // -1 … 1
      inner.style.transform = `scale(1.18) translate3d(0, ${(progress * speed * 100).toFixed(2)}px, 0)`;
    });
  });
}

/* --------------------------------------------------------------------------
   5. Горизонтальная прокрутка секции интерьера.
   Высота секции = ширина трека, вертикальный прогресс переводится в translateX.
   -------------------------------------------------------------------------- */
export function initHorizontal(scroller, section) {
  if (!section) return;
  const pin = section.querySelector(".interior__pin");
  const track = section.querySelector(".interior__track");
  const bar = section.querySelector(".interior__progress i");
  if (!pin || !track) return;

  let distance = 0;

  const measure = () => {
    distance = Math.max(0, track.scrollWidth - window.innerWidth);
    // Длина вертикального «разгона» равна горизонтальной дистанции
    section.style.height = `${window.innerHeight + distance}px`;
    update();
  };

  const update = () => {
    const r = section.getBoundingClientRect();
    const total = section.offsetHeight - window.innerHeight;
    if (total <= 0) return;
    const progress = clamp(-r.top / total, 0, 1);
    track.style.transform = `translate3d(${-progress * distance}px, 0, 0)`;
    if (bar) bar.style.width = `${(progress * 100).toFixed(2)}%`;
  };

  // На узких экранах горизонтальный пин не нужен — отдаём нативный свайп
  const mqNarrow = window.matchMedia("(max-width: 720px)");
  const apply = () => {
    if (mqNarrow.matches || reducedMotion) {
      section.style.height = "";
      track.style.transform = "";
      pin.style.position = "static";
      pin.style.height = "auto";
      track.style.overflowX = "auto";
      return;
    }
    pin.style.position = "";
    pin.style.height = "";
    track.style.overflowX = "";
    measure();
  };

  apply();
  scroller.onFrame(() => { if (!mqNarrow.matches && !reducedMotion) update(); });
  window.addEventListener("resize", apply);
  mqNarrow.addEventListener("change", apply);
}

/* --------------------------------------------------------------------------
   6. Курсор-компаньон: мягкое кольцо, раздувающееся над интерактивом.
   -------------------------------------------------------------------------- */
export function initCursor() {
  if (reducedMotion || window.matchMedia("(pointer: coarse)").matches) return;
  const dot = document.createElement("div");
  dot.className = "cursor";
  document.body.appendChild(dot);

  const p = { x: innerWidth / 2, y: innerHeight / 2, tx: innerWidth / 2, ty: innerHeight / 2 };
  window.addEventListener("mousemove", (e) => {
    p.tx = e.clientX; p.ty = e.clientY;
    dot.classList.add("is-visible");
    const hot = e.target.closest("a, button, .dish, .chip, .slot, .picker__day");
    dot.classList.toggle("is-hot", Boolean(hot));
  }, { passive: true });
  window.addEventListener("mouseleave", () => dot.classList.remove("is-visible"));

  (function loop() {
    p.x = lerp(p.x, p.tx, 0.18);
    p.y = lerp(p.y, p.ty, 0.18);
    const size = dot.offsetWidth / 2;
    dot.style.transform = `translate3d(${p.x - size}px, ${p.y - size}px, 0)`;
    requestAnimationFrame(loop);
  })();
}
