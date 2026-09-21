/* ==========================================================================
   Chinar — бронирование: кастомный календарь, слоты, счётчик гостей,
   валидация и отправка. Никаких редиректов на сторонние сервисы.
   ========================================================================== */

const DOW = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
const MONTHS = [
  "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
  "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"
];

const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const sameDay = (a, b) => a && b && a.getTime() === b.getTime();
const fmt = (d) => `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}.${d.getFullYear()}`;

export function initBooking(section, config) {
  if (!section) return;

  const calendar = section.querySelector("[data-calendar]");
  const monthLabel = section.querySelector("[data-month-label]");
  const form = section.querySelector("form");
  const errorBox = section.querySelector("[data-error]");
  const statusBox = section.querySelector("[data-status]");
  const guestsOut = section.querySelector("[data-guests-value]");

  const today = startOfDay(new Date());
  const last = startOfDay(new Date(Date.now() + config.daysAhead * 86400000));

  const state = { view: new Date(today.getFullYear(), today.getMonth(), 1), date: null, time: null, guests: 2 };

  /* --------------------------------- Календарь -------------------------- */
  function drawCalendar() {
    const y = state.view.getFullYear();
    const m = state.view.getMonth();
    monthLabel.textContent = `${MONTHS[m]} ${y}`;

    const first = new Date(y, m, 1);
    const offset = (first.getDay() + 6) % 7;              // неделя с понедельника
    const days = new Date(y, m + 1, 0).getDate();

    const cells = DOW.map((d) => `<span class="picker__dow">${d}</span>`);
    for (let i = 0; i < offset; i += 1) cells.push("<span></span>");

    for (let d = 1; d <= days; d += 1) {
      const date = new Date(y, m, d);
      const disabled = date < today || date > last;
      const selected = sameDay(date, state.date);
      cells.push(
        `<button type="button" class="picker__day${selected ? " is-selected" : ""}" ` +
        `data-date="${date.toISOString()}"${disabled ? " disabled" : ""} ` +
        `aria-pressed="${selected}" aria-label="${fmt(date)}">${d}</button>`
      );
    }
    calendar.innerHTML = cells.join("");

    // Границы горизонта бронирования
    section.querySelector('[data-month="-1"]').disabled =
      y === today.getFullYear() && m === today.getMonth();
    section.querySelector('[data-month="1"]').disabled =
      y === last.getFullYear() && m === last.getMonth();
  }

  section.querySelectorAll("[data-month]").forEach((btn) =>
    btn.addEventListener("click", () => {
      state.view = new Date(state.view.getFullYear(), state.view.getMonth() + Number(btn.dataset.month), 1);
      drawCalendar();
    })
  );

  calendar.addEventListener("click", (e) => {
    const cell = e.target.closest("[data-date]");
    if (!cell) return;
    state.date = startOfDay(new Date(cell.dataset.date));
    drawCalendar();
    clearError();
  });

  /* ----------------------------------- Слоты ---------------------------- */
  section.querySelectorAll("[data-slot]").forEach((btn) =>
    btn.addEventListener("click", () => {
      state.time = btn.dataset.slot;
      section.querySelectorAll("[data-slot]").forEach((b) => {
        const on = b === btn;
        b.classList.toggle("is-selected", on);
        b.setAttribute("aria-pressed", String(on));
      });
      clearError();
    })
  );

  /* ---------------------------------- Гости ----------------------------- */
  section.querySelectorAll("[data-guests]").forEach((btn) =>
    btn.addEventListener("click", () => {
      const next = state.guests + Number(btn.dataset.guests);
      state.guests = Math.min(config.maxGuests, Math.max(1, next));
      guestsOut.textContent = String(state.guests);
    })
  );

  /* -------------------------------- Отправка ---------------------------- */
  const clearError = () => { errorBox.textContent = ""; };

  function validate(data) {
    if (!data.name.trim()) return "Укажите имя.";
    // 10+ цифр — российский номер с кодом; маску не навязываем
    if (data.phone.replace(/\D/g, "").length < 10) return "Укажите корректный телефон.";
    if (!state.date) return "Выберите дату визита.";
    if (!state.time) return "Выберите время визита.";
    if (!data.consent) return "Нужно согласие на обработку персональных данных.";
    return null;
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const payload = {
      name: String(fd.get("name") || ""),
      phone: String(fd.get("phone") || ""),
      note: String(fd.get("note") || ""),
      consent: fd.get("consent") === "on",
      date: state.date ? fmt(state.date) : null,
      time: state.time,
      guests: state.guests
    };

    const problem = validate(payload);
    if (problem) { errorBox.textContent = problem; return; }
    clearError();

    const summary = `${payload.date}, ${payload.time}, гостей: ${payload.guests}`;

    if (!config.endpoint) {
      // Честное поведение демо-сборки: ничего не отправляем и говорим об этом
      statusBox.textContent =
        `Демо-режим: заявка не отправлена (endpoint не настроен). Собранные данные — ${summary}.`;
      return;
    }

    const submit = form.querySelector('button[type="submit"]');
    submit.disabled = true;
    statusBox.textContent = "Отправляем заявку…";
    try {
      const res = await fetch(config.endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      statusBox.textContent = `Заявка принята: ${summary}. Мы позвоним для подтверждения.`;
      form.reset();
    } catch (err) {
      statusBox.textContent = "";
      errorBox.textContent = "Не удалось отправить заявку. Позвоните нам — подтвердим бронь голосом.";
    } finally {
      submit.disabled = false;
    }
  });

  drawCalendar();
}
