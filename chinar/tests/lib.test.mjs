import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import { normalize, matchesQuery, filterMenu, formatPrice } from '../src/assets/js/lib/menu-search.js';
import { getOpenState, toSchemaHours, DAY_CODES } from '../src/assets/js/lib/hours.js';
import {
  normalizePhone, isValidPhone, isValidDate, isValidGuests, validateReservation,
} from '../src/assets/js/lib/validate.js';

describe('menu search', () => {
  const categories = [
    { id: 'mangal', title: 'Мангал', items: [
      { name: 'Люля-кебаб из баранины', description: 'Рубленая баранина', tags: ['хит'] },
      { name: 'Шашлык из куриного бедра', description: 'Маринад на кефире', tags: [] },
    ] },
    { id: 'drinks', title: 'Напитки', items: [
      { name: 'Чай с чабрецом', description: 'Армуды', tags: [] },
    ] },
  ];

  test('normalize folds case and ё', () => {
    assert.equal(normalize('  Ёлка  ЁЖ '), 'елка еж');
    assert.equal(normalize(null), '');
  });

  test('empty query matches everything', () => {
    assert.equal(matchesQuery(categories[0].items[0], '   '), true);
  });

  test('all tokens must match', () => {
    const item = categories[0].items[0];
    assert.equal(matchesQuery(item, 'люля баранина'), true);
    assert.equal(matchesQuery(item, 'люля форель'), false);
  });

  test('tags are searchable', () => {
    assert.equal(matchesQuery(categories[0].items[0], 'хит'), true);
  });

  test('filterMenu narrows by category and drops empty groups', () => {
    const byCategory = filterMenu(categories, { category: 'drinks' });
    assert.equal(byCategory.categories.length, 1);
    assert.equal(byCategory.total, 1);

    const byQuery = filterMenu(categories, { query: 'шашлык' });
    assert.equal(byQuery.categories.length, 1);
    assert.equal(byQuery.categories[0].id, 'mangal');
    assert.equal(byQuery.total, 1);

    const nothing = filterMenu(categories, { query: 'суши' });
    assert.equal(nothing.total, 0);
    assert.deepEqual(nothing.categories, []);
  });

  test('filterMenu does not mutate the source', () => {
    const before = JSON.stringify(categories);
    filterMenu(categories, { query: 'чай' });
    assert.equal(JSON.stringify(categories), before);
  });

  test('formatPrice groups digits and handles blanks', () => {
    assert.equal(formatPrice(1290, { symbol: '₽', locale: 'ru-RU' }), '1 290 ₽');
    assert.equal(formatPrice(null), '—');
    assert.equal(formatPrice(undefined), '—');
  });
});

describe('opening hours', () => {
  const schedule = [
    { days: ['Mo', 'Tu', 'We', 'Th'], opens: '11:00', closes: '23:00' },
    { days: ['Fr', 'Sa'], opens: '11:00', closes: '01:00' },
    { days: ['Su'], opens: '11:00', closes: '23:00' },
  ];
  // 2026-09-21 is a Monday.
  const at = (iso) => new Date(iso);

  test('open during a normal shift', () => {
    const state = getOpenState(schedule, at('2026-09-21T15:00:00'));
    assert.equal(state.open, true);
    assert.equal(state.until, '23:00');
  });

  test('closed before opening, and reports today opening time', () => {
    const state = getOpenState(schedule, at('2026-09-21T09:30:00'));
    assert.equal(state.open, false);
    assert.deepEqual(state.next, { day: 'Mo', opens: '11:00' });
  });

  test('closed after opening hours rolls over to the next day', () => {
    const state = getOpenState(schedule, at('2026-09-21T23:30:00'));
    assert.equal(state.open, false);
    assert.equal(state.next.day, 'Tu');
  });

  test('overnight shift keeps Saturday open past midnight', () => {
    // 2026-09-26 is a Saturday; 00:30 on Sunday belongs to Saturday's shift.
    const state = getOpenState(schedule, at('2026-09-27T00:30:00'));
    assert.equal(state.open, true, 'Sunday 00:30 is still Saturday night');
    assert.equal(state.until, '01:00');
  });

  test('Friday 23:30 is inside the late shift', () => {
    const state = getOpenState(schedule, at('2026-09-25T23:30:00'));
    assert.equal(state.open, true);
  });

  test('a schedule with no slots never claims to be open', () => {
    const state = getOpenState([], at('2026-09-21T15:00:00'));
    assert.deepEqual(state, { open: false, until: null, next: null });
  });

  test('day codes map to schema.org names', () => {
    const spec = toSchemaHours(schedule);
    assert.equal(spec.length, 3);
    assert.deepEqual(spec[2].dayOfWeek, ['Sunday']);
    assert.equal(spec[1].closes, '01:00');
    assert.equal(DAY_CODES.length, 7);
  });
});

describe('reservation validation', () => {
  const today = new Date('2026-09-21T12:00:00');

  test('phone normalisation keeps a leading plus', () => {
    assert.equal(normalizePhone(' +7 (999) 123-45-67 '), '+79991234567');
    assert.equal(normalizePhone('8 999 123 45 67'), '89991234567');
  });

  test('phone length bounds', () => {
    assert.equal(isValidPhone('+7 999 123-45-67'), true);
    assert.equal(isValidPhone('12345'), false);
    assert.equal(isValidPhone('+7999123456789012'), false);
  });

  test('dates must be well formed and not in the past', () => {
    assert.equal(isValidDate('2026-09-21', today), true);
    assert.equal(isValidDate('2026-09-22', today), true);
    assert.equal(isValidDate('2026-09-20', today), false);
    assert.equal(isValidDate('2026-02-30', today), false);
    assert.equal(isValidDate('21.09.2026', today), false);
  });

  test('guest count bounds', () => {
    assert.equal(isValidGuests(1), true);
    assert.equal(isValidGuests('20'), true);
    assert.equal(isValidGuests(0), false);
    assert.equal(isValidGuests(21), false);
    assert.equal(isValidGuests(2.5), false);
  });

  test('a complete booking passes', () => {
    const errors = validateReservation(
      { name: 'Иван', phone: '+79991234567', date: '2026-09-22', time: '19:00', guests: '4' },
      { today }
    );
    assert.deepEqual(errors, {});
  });

  test('every missing field is reported at once', () => {
    const errors = validateReservation({}, { today });
    assert.deepEqual(Object.keys(errors).sort(), ['date', 'guests', 'name', 'phone', 'time']);
    assert.equal(errors.name, 'required');
    assert.equal(errors.guests, 'invalidGuests');
  });

  test('a bad phone is distinguished from a missing one', () => {
    const errors = validateReservation(
      { name: 'A', phone: '123', date: '2026-09-22', time: '19:00', guests: 2 },
      { today }
    );
    assert.equal(errors.phone, 'invalidPhone');
  });
});
