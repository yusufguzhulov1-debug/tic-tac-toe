/**
 * The importer is the piece that turns the real Tilda page into content.
 * It is verified here against a fixture that mirrors Tilda's real output
 * (t-name / t-descr class soup, protocol-relative CDN URLs, lazy images).
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { extractFromTilda, parsePrice, decodeEntities, toNodes } from '../src/lib/tilda-parse.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const html = readFileSync(join(HERE, 'fixtures', 'tilda-page.html'), 'utf8');
const data = extractFromTilda(html, { baseUrl: 'https://primer.tilda.ws/' });

describe('helpers', () => {
  test('entities decode, including numeric ones', () => {
    assert.equal(decodeEntities('1&nbsp;290 &laquo;&amp;&raquo; &#1071; &#x42F;'), '1 290 «&» Я Я');
  });

  test('prices parse across separators and currencies', () => {
    assert.equal(parsePrice('690 ₽'), 690);
    assert.equal(parsePrice('1 290 ₽'), 1290);
    assert.equal(parsePrice('1 290 ₽'), 1290);
    assert.equal(parsePrice('от 390 руб.'), 390);
    assert.equal(parsePrice('Люля-кебаб'), null);
    assert.equal(parsePrice('200 г'), null);
  });

  test('scripts and styles never reach the text', () => {
    const nodes = toNodes(html);
    assert.ok(nodes.length > 10);
    assert.ok(!nodes.some((n) => n.text.includes('tilda-blocks')), 'script content leaked');
    assert.ok(!nodes.some((n) => n.text.includes('margin:0')), 'style content leaked');
  });
});

describe('page metadata', () => {
  test('title and description', () => {
    assert.equal(data.title, 'Ресторан «Пример» — кавказская кухня');
    assert.equal(data.description, 'Ресторан с мангалом, банкетным залом и доставкой.');
    assert.equal(data.ogTitle, 'Ресторан «Пример»');
  });

  test('protocol-relative URLs are made absolute', () => {
    assert.equal(data.ogImage, 'https://static.tildacdn.com/tild1234/og.jpg');
  });

  test('the h1 is found', () => {
    const h1 = data.headings.find((h) => h.level === 1);
    assert.equal(h1.text, 'Вкус Кавказа в центре города');
  });
});

describe('contacts', () => {
  test('phone comes back in a dialable form', () => {
    assert.ok(data.phones.includes('+74951234567'), `phones: ${data.phones}`);
  });

  test('email is found and image files are not mistaken for one', () => {
    assert.deepEqual(data.emails, ['info@primer-rest.ru']);
  });

  test('social networks are recognised by host', () => {
    const icons = data.socials.map((s) => s.icon).sort();
    assert.deepEqual(icons, ['telegram', 'vk', 'whatsapp']);
    assert.equal(data.socials.find((s) => s.icon === 'telegram').url, 'https://t.me/primer_rest');
  });

  test('the street address is picked out', () => {
    assert.ok(data.addresses.some((a) => a.includes('ул. Примерная')), `addresses: ${data.addresses}`);
  });

  test('opening hours lines are collected', () => {
    assert.equal(data.hours.length, 3);
    assert.ok(data.hours[0].includes('11:00'));
  });
});

describe('menu', () => {
  test('categories follow the headings', () => {
    assert.deepEqual(data.menu.map((c) => c.title), ['Мангал', 'Напитки']);
  });

  test('dishes keep name, description, weight and price', () => {
    const [mangal] = data.menu;
    assert.equal(mangal.items.length, 2);
    assert.deepEqual(mangal.items[0], {
      name: 'Люля-кебаб из баранины',
      description: 'Рубленая баранина, лук, курдюк, сумах',
      weight: '200 г',
      price: 690,
      tags: [],
    });
    assert.equal(mangal.items[1].price, 1290, 'non-breaking space in the price');
  });

  test('"от 390 руб." is read as 390', () => {
    assert.equal(data.menu[1].items[0].price, 390);
  });

  test('a weight is never mistaken for a dish name', () => {
    for (const cat of data.menu) {
      for (const item of cat.items) assert.ok(!/^\d+\s*(г|мл)$/.test(item.name), `bad name: ${item.name}`);
    }
  });
});

describe('media', () => {
  test('lazy images use data-original, not the base64 stub', () => {
    const srcs = data.images.map((i) => i.src);
    assert.ok(srcs.includes('https://static.tildacdn.com/tild9999/mangal.jpg'));
    assert.ok(!srcs.some((s) => s.startsWith('data:')), 'placeholder data URI was imported');
  });

  test('CSS background images are collected too', () => {
    assert.ok(data.images.some((i) => i.src.endsWith('/hall-1920.jpg')));
  });

  test('alt text is preserved', () => {
    const mangal = data.images.find((i) => i.src.endsWith('mangal.jpg'));
    assert.equal(mangal.alt, 'Мангал на живом огне');
  });
});

describe('prose', () => {
  test('long paragraphs are captured for the about section', () => {
    assert.ok(data.paragraphs.some((p) => p.startsWith('Мы работаем с 2014 года')), `paragraphs: ${data.paragraphs.length}`);
  });
});

describe('opening-hours parsing', async () => {
  const { parseHoursLine, parseSchedule } = await import('../src/lib/tilda-parse.js');

  test('a day range expands', () => {
    assert.deepEqual(parseHoursLine('Пн — Чт: 11:00 — 23:00'), {
      days: ['Mo', 'Tu', 'We', 'Th'], label: 'Пн — Чт', opens: '11:00', closes: '23:00',
    });
  });

  test('a range that wraps past Sunday still works', () => {
    assert.deepEqual(parseHoursLine('Сб-Вт 10:00-20:00').days, ['Sa', 'Su', 'Mo', 'Tu']);
  });

  test('"ежедневно" covers the whole week and pads the hour', () => {
    const slot = parseHoursLine('Ежедневно с 9:00 до 22:00');
    assert.equal(slot.days.length, 7);
    assert.equal(slot.opens, '09:00');
  });

  test('a single day and a comma list', () => {
    assert.deepEqual(parseHoursLine('Вс: 11:00 — 23:00').days, ['Su']);
    assert.deepEqual(parseHoursLine('Пн, Ср, Пт 12:00-18:00').days, ['Mo', 'We', 'Fr']);
  });

  test('lines without two times are rejected', () => {
    assert.equal(parseHoursLine('Пн — Чт'), null);
    assert.equal(parseHoursLine('Телефон +7 495 123-45-67'), null);
  });

  test('a full schedule covers each day exactly once', () => {
    const schedule = parseSchedule(['Пн — Чт: 11:00 — 23:00', 'Пт — Сб: 11:00 — 01:00', 'Вс: 11:00 — 23:00']);
    const days = schedule.flatMap((s) => s.days);
    assert.equal(days.length, 7);
    assert.equal(new Set(days).size, 7);
    assert.equal(schedule[1].closes, '01:00');
  });

  test('a repeated day is not double-booked', () => {
    const schedule = parseSchedule(['Ежедневно 11:00-23:00', 'Пт 11:00-02:00']);
    assert.equal(schedule.length, 1, 'the later line adds nothing new');
  });
});
