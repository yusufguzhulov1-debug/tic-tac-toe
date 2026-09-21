/** Opening-hours maths: pure, timezone-agnostic, overnight-aware. */

export const DAY_CODES = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

function toMinutes(hhmm) {
  const [h, m] = String(hhmm).split(':').map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
  return h * 60 + m;
}

/**
 * Is the venue open at a given moment?
 * A `closes` earlier than `opens` means the shift runs past midnight, so a
 * slot opened the previous day can still cover the early hours of today.
 *
 * @param {Array<{days: string[], opens: string, closes: string}>} schedule
 * @param {Date} now
 * @returns {{open: boolean, until: string|null, next: {day: string, opens: string}|null}}
 */
export function getOpenState(schedule, now = new Date()) {
  const dayIndex = now.getDay();
  const minutes = now.getHours() * 60 + now.getMinutes();

  for (const slot of schedule) {
    const opens = toMinutes(slot.opens);
    const closes = toMinutes(slot.closes);
    if (opens === null || closes === null) continue;
    const overnight = closes <= opens;

    if (slot.days.includes(DAY_CODES[dayIndex]) && minutes >= opens && (overnight || minutes < closes)) {
      return { open: true, until: slot.closes, next: null };
    }
    const prevDay = DAY_CODES[(dayIndex + 6) % 7];
    if (overnight && slot.days.includes(prevDay) && minutes < closes) {
      return { open: true, until: slot.closes, next: null };
    }
  }

  for (let offset = 0; offset < 8; offset += 1) {
    const code = DAY_CODES[(dayIndex + offset) % 7];
    const candidates = schedule
      .filter((slot) => slot.days.includes(code))
      .map((slot) => ({ slot, opens: toMinutes(slot.opens) }))
      .filter(({ opens }) => opens !== null && (offset > 0 || opens > minutes))
      .sort((a, b) => a.opens - b.opens);
    if (candidates.length) {
      return { open: false, until: null, next: { day: code, opens: candidates[0].slot.opens } };
    }
  }
  return { open: false, until: null, next: null };
}

/** schema.org openingHoursSpecification entries. */
export function toSchemaHours(schedule) {
  const prefix = { Mo: 'Monday', Tu: 'Tuesday', We: 'Wednesday', Th: 'Thursday', Fr: 'Friday', Sa: 'Saturday', Su: 'Sunday' };
  return schedule.map((slot) => ({
    '@type': 'OpeningHoursSpecification',
    dayOfWeek: slot.days.map((d) => prefix[d]).filter(Boolean),
    opens: slot.opens,
    closes: slot.closes,
  }));
}
