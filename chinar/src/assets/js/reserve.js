import { validateReservation, normalizePhone } from './lib/validate.js';

/**
 * Reservation form. Works without JS (native required/min attributes and a
 * real POST target when one is configured); JS adds inline messages and an
 * async submit so the page does not reload.
 */
export function initReservation() {
  const form = document.querySelector('[data-reserve-form]');
  if (!form) return;

  const status = form.querySelector('[data-form-status]');
  const submit = form.querySelector('[type="submit"]');
  const endpoint = form.dataset.endpoint || '';
  const maxGuests = Number(form.dataset.maxGuests || 20);
  const messages = JSON.parse(form.dataset.messages || '{}');

  const setError = (name, key) => {
    const field = form.querySelector(`[name="${name}"]`);
    const slot = form.querySelector(`[data-error-for="${name}"]`);
    if (!field) return;
    if (key) {
      field.setAttribute('aria-invalid', 'true');
      if (slot) slot.textContent = messages[key] || key;
    } else {
      field.removeAttribute('aria-invalid');
      if (slot) slot.textContent = '';
    }
  };

  const showStatus = (tone, title, text) => {
    if (!status) return;
    status.dataset.tone = tone;
    status.hidden = false;
    status.innerHTML = '';
    const h = document.createElement('strong');
    h.textContent = title;
    const p = document.createElement('p');
    p.textContent = text;
    status.append(h, p);
    status.focus?.();
  };

  const collect = () => Object.fromEntries(new FormData(form).entries());

  form.addEventListener('input', (e) => {
    const target = e.target;
    if (target instanceof HTMLElement && target.getAttribute('aria-invalid') === 'true') {
      setError(target.getAttribute('name'), null);
    }
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const data = collect();

    // Honeypot: silently accept, never send.
    if (data.company) { form.reset(); return; }

    const errors = validateReservation(data, { maxGuests });
    ['name', 'phone', 'date', 'time', 'guests'].forEach((f) => setError(f, errors[f] || null));
    if (Object.keys(errors).length) {
      const first = form.querySelector('[aria-invalid="true"]');
      if (first instanceof HTMLElement) first.focus();
      return;
    }

    const payload = {
      ...data,
      phone: normalizePhone(data.phone),
      submittedAt: new Date().toISOString(),
      page: location.href,
    };
    delete payload.company;

    submit.disabled = true;
    const original = submit.textContent;
    submit.textContent = messages.sending || '…';

    try {
      if (!endpoint) {
        // Demo mode: nothing to post to yet.
        console.info('[chinar] reservation (demo mode, no endpoint configured)', payload);
        await new Promise((r) => setTimeout(r, 350));
      } else {
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
      }
      showStatus('ok', messages.successTitle || 'OK', messages.successText || '');
      form.reset();
    } catch (error) {
      console.error('[chinar] reservation failed', error);
      showStatus('error', messages.errorTitle || 'Error', messages.errorText || '');
    } finally {
      submit.disabled = false;
      submit.textContent = original;
    }
  });
}
