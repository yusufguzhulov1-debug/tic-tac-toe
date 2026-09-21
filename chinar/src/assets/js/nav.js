/** Mobile drawer with focus trap, plus scroll-spy for the desktop nav. */
export function initNav() {
  const drawer = document.getElementById('nav-drawer');
  const openers = document.querySelectorAll('[data-nav-open]');
  const closers = document.querySelectorAll('[data-nav-close]');
  if (!drawer) return;

  let lastFocused = null;
  const focusables = () =>
    [...drawer.querySelectorAll('a[href], button:not([disabled])')].filter((el) => el.offsetParent !== null);

  const open = () => {
    lastFocused = document.activeElement;
    drawer.dataset.open = 'true';
    drawer.removeAttribute('inert');
    openers.forEach((b) => b.setAttribute('aria-expanded', 'true'));
    focusables()[0]?.focus();
  };

  const close = () => {
    drawer.dataset.open = 'false';
    drawer.setAttribute('inert', '');
    openers.forEach((b) => b.setAttribute('aria-expanded', 'false'));
    if (lastFocused instanceof HTMLElement) lastFocused.focus();
  };

  drawer.setAttribute('inert', '');
  openers.forEach((b) => b.addEventListener('click', open));
  closers.forEach((b) => b.addEventListener('click', close));
  drawer.addEventListener('click', (e) => {
    if (e.target instanceof HTMLElement && e.target.closest('a')) close();
  });

  document.addEventListener('keydown', (e) => {
    if (drawer.dataset.open !== 'true') return;
    if (e.key === 'Escape') { e.preventDefault(); close(); return; }
    if (e.key !== 'Tab') return;
    const items = focusables();
    if (!items.length) return;
    const first = items[0];
    const last = items.at(-1);
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });

  matchMedia('(min-width: 72rem)').addEventListener('change', (e) => {
    if (e.matches && drawer.dataset.open === 'true') close();
  });
}

export function initScrollSpy() {
  const links = [...document.querySelectorAll('.nav-desktop a[href^="#"]')];
  const sections = links
    .map((a) => document.getElementById(decodeURIComponent(a.hash.slice(1))))
    .filter(Boolean);
  if (!sections.length || !('IntersectionObserver' in window)) return;

  const observer = new IntersectionObserver(
    (entries) => {
      const visible = entries
        .filter((e) => e.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (!visible) return;
      links.forEach((a) => {
        const active = a.hash.slice(1) === visible.target.id;
        if (active) a.setAttribute('aria-current', 'true');
        else a.removeAttribute('aria-current');
      });
    },
    { rootMargin: '-45% 0px -50% 0px', threshold: [0, 0.25, 0.6] }
  );
  sections.forEach((s) => observer.observe(s));
}

export function initHeaderState() {
  const header = document.querySelector('.site-header');
  const toTop = document.querySelector('.to-top');
  if (!header && !toTop) return;
  let ticking = false;
  const update = () => {
    const y = window.scrollY;
    if (header) header.dataset.scrolled = String(y > 8);
    if (toTop) toTop.dataset.visible = String(y > window.innerHeight * 0.8);
    ticking = false;
  };
  addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(update);
  }, { passive: true });
  update();
}
