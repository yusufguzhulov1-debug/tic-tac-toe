/** Reservation form validation — pure, reused by the browser and the tests. */

/** Keep leading + and digits only. */
export function normalizePhone(raw) {
  const trimmed = String(raw ?? '').trim();
  const digits = trimmed.replace(/[^\d]/g, '');
  return trimmed.startsWith('+') ? `+${digits}` : digits;
}

/** E.164-ish check: 10–15 digits, optional leading +. */
export function isValidPhone(raw) {
  const normalized = normalizePhone(raw);
  return /^\+?\d{10,15}$/.test(normalized);
}

/** ISO date (YYYY-MM-DD) that is today or later in the visitor's own timezone. */
export function isValidDate(value, today = new Date()) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value ?? ''))) return false;
  const [y, m, d] = value.split('-').map(Number);
  const picked = new Date(y, m - 1, d);
  if (picked.getFullYear() !== y || picked.getMonth() !== m - 1 || picked.getDate() !== d) return false;
  const floor = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return picked >= floor;
}

export function isValidGuests(value, max = 20) {
  const n = Number(value);
  return Number.isInteger(n) && n >= 1 && n <= max;
}

/**
 * Validate the whole reservation payload.
 * @returns {Record<string, string>} field name → message key; empty when valid.
 */
export function validateReservation(data, { maxGuests = 20, today = new Date() } = {}) {
  const errors = {};
  if (!String(data.name ?? '').trim()) errors.name = 'required';
  if (!String(data.phone ?? '').trim()) errors.phone = 'required';
  else if (!isValidPhone(data.phone)) errors.phone = 'invalidPhone';
  if (!String(data.date ?? '').trim()) errors.date = 'required';
  else if (!isValidDate(data.date, today)) errors.date = 'invalidDate';
  if (!String(data.time ?? '').trim()) errors.time = 'required';
  if (!isValidGuests(data.guests, maxGuests)) errors.guests = 'invalidGuests';
  return errors;
}
