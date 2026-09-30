// POST /api/understand (Vercel variant)
// { mode: "request" | "next", text?, audio?: { mime, data(base64) }, history: [{role, text}], context }
import { API, GEMINI_MODEL as DEFAULT_MODEL, readUnderstand, understandBody } from '../app/prompt.js';
import { apiKey, denied, googleError, json, missingKey } from './_lib.js';

const GEMINI_MODEL = process.env.GEMINI_MODEL || DEFAULT_MODEL;

export async function POST(request) {
  const no = denied(request);
  if (no) return no;
  if (!apiKey()) return missingKey();

  let body, payload;
  try { body = await request.json(); } catch { return json({ error: 'Ungültige Anfrage.' }, 400); }
  try { payload = understandBody(body); } catch (e) { return json({ error: e.message }, 400); }

  const started = Date.now();
  const res = await fetch(`${API}/${GEMINI_MODEL}:generateContent`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-goog-api-key': apiKey() },
    body: JSON.stringify(payload),
  });
  const raw = await res.text();
  if (!res.ok) return googleError(res.status, raw);

  let data, result;
  try { data = JSON.parse(raw); result = readUnderstand(data); }
  catch { return json({ error: 'Gemini hat keine lesbare Antwort geliefert. Bitte nochmal versuchen.' }, 502); }
  return json({ result, usage: data.usageMetadata || null, model: GEMINI_MODEL, ms: Date.now() - started });
}
