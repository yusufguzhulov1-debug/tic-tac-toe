import { html } from '../lib/html.js';

export function offlinePage(content) {
  const ru = content.locale === 'ru';
  return html`
    <section class="section centered-pane">
      <div class="shell stack stack--m text-center prose-tight">
        <h1 class="title-4">${ru ? 'Нет соединения' : 'You are offline'}</h1>
        <p class="lede mx-auto">
          ${ru
            ? 'Страница недоступна без интернета. Меню и контакты, которые вы уже открывали, сохранены в кэше.'
            : 'This page needs a connection. The menu and contacts you already opened are kept in the cache.'}
        </p>
        <p class="cluster cluster--center">
          <a class="btn" href="index.html">${ru ? 'На главную' : 'Go home'}</a>
          <a class="btn btn--ghost" href="tel:${content.contacts.phoneHref}">${content.contacts.phone}</a>
        </p>
      </div>
    </section>
  `;
}
