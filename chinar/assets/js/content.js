/* ==========================================================================
   Chinar — контентная модель сайта.
   ЕДИНСТВЕННОЕ место, где живёт текст, цены и пути к медиа.
   Структура объекта 1:1 повторяет будущие схемы Sanity/Strapi (см. DESIGN.md),
   поэтому перенос в CMS не требует правок вёрстки.

   ВНИМАНИЕ. Сайт-источник (chinar-restaurant.tilda.ws) недоступен из среды
   сборки, поэтому реальные тексты, цены, адрес и телефон НЕ перенесены и
   НЕ придуманы. Все поля, помеченные TODO, обязательны к замене на реальные
   данные ресторана до публикации.
   ========================================================================== */

export const CONTENT = {
  brand: {
    name: "CHINAR",
    // TODO: заменить на реальный дескриптор ресторана
    descriptor: "Кавказская кухня на живом огне",
    // TODO: реальные контакты
    phone: "+7 (000) 000-00-00",
    phoneHref: "tel:+70000000000",
    address: "TODO: город, улица, дом",
    addressMapUrl: "#",
    hours: "TODO: ежедневно 00:00 — 00:00",
    socials: [
      { label: "Telegram", href: "#" },   // TODO
      { label: "WhatsApp", href: "#" },   // TODO
      { label: "VK", href: "#" }          // TODO
    ]
  },

  nav: [
    { label: "Концепция", href: "#concept", index: "01" },
    { label: "Меню", href: "#menu", index: "02" },
    { label: "Интерьер", href: "#interior", index: "03" },
    { label: "Бронирование", href: "#booking", index: "04" }
  ],

  hero: {
    // Синематичное зацикленное макро-видео. Файлы кладутся в assets/media/.
    // Пока файлов нет — работает анимированный фолбэк «угли мангала».
    video: { desktop: "assets/media/hero-16x9.mp4", mobile: "assets/media/hero-9x16.mp4" },
    // Заголовок разбит на строки для маскирующего появления
    titleLines: ["Огонь,", "камень", "и <em>чинара</em>"],
    // TODO: реальный дескриптор
    lead: "Мангал на углях, тесто ручной раскатки и специи, привезённые с южных рынков. Ужин, который начинается с запаха.",
    cta: { label: "Смотреть меню", href: "#menu" },
    secondary: { label: "Забронировать стол", href: "#booking" }
  },

  concept: {
    caption: "Концепция",
    title: "Кухня, где всё решает огонь",
    // TODO: реальный текст «О ресторане»
    body: [
      "Мы строили Chinar вокруг одного центра — открытого мангала. Повар и гость видят друг друга: это не кухня за стеной, а сцена, на которой всё происходит здесь и сейчас.",
      "Тесто раскатывается вручную каждое утро, овощи приходят с рынка, а мясо выдерживается ровно столько, сколько нужно углям."
    ],
    facts: [
      { value: "TODO", label: "лет на одном месте" },   // TODO
      { value: "TODO", label: "позиций в меню" },       // TODO
      { value: "TODO", label: "посадочных мест" }       // TODO
    ],
    media: [
      { src: "", label: "Фото 01 · мангал" },   // TODO: assets/media/concept-1.jpg
      { src: "", label: "Фото 02 · зал" }       // TODO: assets/media/concept-2.jpg
    ]
  },

  menu: {
    caption: "Меню",
    title: "Всё, что рождается на углях",
    note: "TODO: подставить реальные блюда и цены из меню ресторана",
    categories: [
      { id: "all", label: "Всё" },
      { id: "mangal", label: "Мангал" },
      { id: "tandyr", label: "Тандыр" },
      { id: "starters", label: "Закуски" },
      { id: "desserts", label: "Десерты" }
    ],
    // size: lg | wide | tall | sm — модули bento-сетки
    dishes: [
      { id: "d1", cat: "mangal",   size: "lg",   name: "Каре ягнёнка",      desc: "TODO: описание блюда", price: "TODO", src: "", label: "Фото блюда" },
      { id: "d2", cat: "mangal",   size: "sm",   name: "Люля-кебаб",        desc: "TODO: описание блюда", price: "TODO", src: "", label: "Фото блюда" },
      { id: "d3", cat: "starters", size: "tall", name: "Бадриджани",        desc: "TODO: описание блюда", price: "TODO", src: "", label: "Фото блюда" },
      { id: "d4", cat: "tandyr",   size: "sm",   name: "Кутабы",            desc: "TODO: описание блюда", price: "TODO", src: "", label: "Фото блюда" },
      { id: "d5", cat: "mangal",   size: "wide", name: "Шашлык из телятины", desc: "TODO: описание блюда", price: "TODO", src: "", label: "Фото блюда" },
      { id: "d6", cat: "starters", size: "sm",   name: "Долма",             desc: "TODO: описание блюда", price: "TODO", src: "", label: "Фото блюда" },
      { id: "d7", cat: "tandyr",   size: "sm",   name: "Тандырная лепёшка", desc: "TODO: описание блюда", price: "TODO", src: "", label: "Фото блюда" },
      { id: "d8", cat: "desserts", size: "wide", name: "Пахлава",           desc: "TODO: описание блюда", price: "TODO", src: "", label: "Фото блюда" }
    ]
  },

  interior: {
    caption: "Интерьер",
    title: "Три зала — три сценария вечера",
    slides: [
      { src: "", label: "Панорама 01", caption: "TODO: название зала" },
      { src: "", label: "Панорама 02", caption: "TODO: название зала" },
      { src: "", label: "Панорама 03", caption: "TODO: название зала" },
      { src: "", label: "Панорама 04", caption: "TODO: терраса" }
    ]
  },

  booking: {
    caption: "Бронирование",
    title: "Стол за минуту, без переходов",
    lead: "Выберите дату, время и количество гостей — мы подтвердим бронь звонком.",
    // Слоты и горизонт бронирования
    slots: ["12:00", "13:30", "15:00", "17:00", "18:30", "19:00", "20:00", "21:30"],
    maxGuests: 12,
    daysAhead: 60,
    /* Куда уходит заявка. null → демо-режим: форма валидируется,
       но ничего не отправляет и честно сообщает об этом.
       Для продакшена: "/api/booking" (route handler Next.js) или URL CRM. */
    endpoint: null
  },

  footer: {
    // TODO: реальные юридические данные
    legal: "TODO: ООО «…», ИНН 0000000000",
    year: new Date().getFullYear()
  }
};
