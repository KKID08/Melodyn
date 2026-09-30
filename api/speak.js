// POST /api/speak  { text }  (Vercel variant of the DJ voice)
import { API, TTS_MODEL, speakBody } from '../app/prompt.js';
import { apiKey, denied, googleError, json, missingKey } from './_lib.js';

export async function POST(request) {
  const no = denied(request);
  if (no) return no;
  if (!apiKey()) return missingKey();
  let body;
  try { body = await request.json(); } catch { return json({ error: 'Ungültige Anfrage.' }, 400); }
  const text = String(body.text || '').trim();
  if (!text) return json({ error: 'Kein Text.' }, 400);
  const res = await fetch(`${API}/${TTS_MODEL}:generateContent`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-goog-api-key': apiKey() },
    body: JSON.stringify(speakBody(text)),
  });
  if (!res.ok) return googleError(res.status, await res.text());
  return new Response(res.body, { status: 200, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
}
