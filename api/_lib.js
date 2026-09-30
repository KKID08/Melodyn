// Shared helpers for the Melodyn serverless functions.
// Files starting with "_" are not exposed as routes by Vercel.

import { API, LYRIA_CLIP, LYRIA_FULL as DEFAULT_FULL } from '../app/prompt.js';

export { API, LYRIA_CLIP };
export const LYRIA_FULL = process.env.LYRIA_MODEL || DEFAULT_FULL;

export function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });
}

export function apiKey() {
  return process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '';
}

// Optional access code so a public link cannot spend the key owner's money.
export function denied(request) {
  const code = process.env.APP_CODE;
  if (!code) return null;
  if ((request.headers.get('x-melodyn-code') || '') === code) return null;
  return json({ error: 'Zugangscode fehlt oder ist falsch.', code: 'auth' }, 401);
}

export function missingKey() {
  return json({ error: 'Auf dem Server ist kein GEMINI_API_KEY eingetragen.', code: 'nokey' }, 500);
}

export function googleError(status, text) {
  let msg = text;
  try { msg = JSON.parse(text).error.message; } catch { /* keep raw text */ }
  return json({ error: String(msg || 'Unbekannter Fehler bei Google.').slice(0, 400), code: status === 429 ? 'rate' : 'google' }, status === 429 ? 429 : 502);
}
