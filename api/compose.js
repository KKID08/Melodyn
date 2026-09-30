// POST /api/compose  { prompt, length: "full" | "clip" }
// Asks Lyria for a song and streams Google's JSON answer (base64 MP3 + lyrics) straight
// through to the browser, so large songs never have to be buffered in the function.
import { API, LYRIA_CLIP, LYRIA_FULL, apiKey, denied, googleError, json, missingKey } from './_lib.js';

export async function POST(request) {
  const no = denied(request);
  if (no) return no;
  if (!apiKey()) return missingKey();

  let body;
  try { body = await request.json(); } catch { return json({ error: 'Ungültige Anfrage.' }, 400); }
  const prompt = String(body.prompt || '').trim();
  if (!prompt || prompt.length > 2500) return json({ error: 'Der Musik-Prompt fehlt oder ist zu lang.' }, 400);
  const model = body.length === 'clip' ? LYRIA_CLIP : LYRIA_FULL;

  const upstream = await fetch(`${API}/${model}:generateContent`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-goog-api-key': apiKey() },
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
  });
  if (!upstream.ok) return googleError(upstream.status, await upstream.text());

  return new Response(upstream.body, {
    status: 200,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store', 'x-lyria-model': model },
  });
}
