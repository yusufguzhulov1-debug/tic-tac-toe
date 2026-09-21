import { html } from '../lib/html.js';

const RU = (c) => [
  ['Кто обрабатывает данные', `Оператор — ${c.brand.legalName}. Контакт для обращений: ${c.contacts.email || c.contacts.phone}.`],
  ['Какие данные собираются', 'Имя, номер телефона, дата, время и число гостей, а также комментарий, который вы указываете в форме бронирования. Технические данные (тип устройства, язык) сайт не передаёт третьим лицам.'],
  ['Зачем', 'Чтобы подтвердить бронь и связаться с вами. Для рассылок и рекламы данные не используются.'],
  ['Сколько хранятся', 'До 12 месяцев с момента визита, затем удаляются.'],
  ['Передача третьим лицам', 'Данные не продаются и не передаются, кроме случаев, прямо предусмотренных законом.'],
  ['Ваши права', 'Вы можете запросить копию данных, их исправление или удаление — напишите на указанный выше контакт, ответим в течение 30 дней.'],
  ['Cookie и хранилище браузера', 'Сайт хранит в браузере только выбранную тему оформления и факт закрытия служебного баннера. Аналитические cookie не устанавливаются, пока вы не подключите счётчик.'],
];

const EN = (c) => [
  ['Who processes the data', `The operator is ${c.brand.legalName}. Contact: ${c.contacts.email || c.contacts.phone}.`],
  ['What is collected', 'Name, phone number, date, time, party size and the comment you type into the reservation form. Technical data such as device type or language is not shared with third parties.'],
  ['Why', 'To confirm your booking and contact you. The data is not used for marketing.'],
  ['Retention', 'Up to 12 months after the visit, then deleted.'],
  ['Sharing', 'Data is never sold or shared, except where the law requires it.'],
  ['Your rights', 'You may request a copy, a correction or deletion — write to the contact above and we reply within 30 days.'],
  ['Cookies and browser storage', 'The site stores only your chosen colour theme and whether you dismissed the service banner. No analytics cookies are set until you add a counter.'],
];

export function privacyPage(content) {
  const sections = content.locale === 'ru' ? RU(content) : EN(content);
  const updated = new Date().toISOString().slice(0, 10);
  return html`
    <article class="section">
      <div class="shell stack stack--m prose-narrow">
        <p class="eyebrow">${content.brand.name}</p>
        <h1 class="title-4">${content.legal.privacyTitle}</h1>
        <p class="muted">${content.locale === 'ru' ? 'Обновлено' : 'Updated'}: <time datetime="${updated}">${updated}</time></p>
        ${sections.map(
          ([title, text]) => html`<section class="stack">
            <h2 class="title-2">${title}</h2>
            <p>${text}</p>
          </section>`
        )}
        <p class="mt-l"><a class="btn btn--ghost" href="../index.html">${content.locale === 'ru' ? 'На главную' : 'Back home'}</a></p>
      </div>
    </article>
  `;
}
