// POST /api/produce (Vercel variant)
// { model, input: { mode, words, spec, rules, previous } } -> detailed Lyria prompt from the producer model
import { API, GEMINI_MODEL, PRODUCER_DEEP, PRODUCER_FAST, producerBody, readProducer } from '../app/prompt.js';
import { apiKey, denied, googleError, json, missingKey } from './_lib.js';

const ALLOWED = new Set([PRODUCER_FAST, PRODUCER_DEEP, GEMINI_MODEL]);

export async function POST(request) {
  const no = denied(request);
  if (no) return no;
  if (!apiKey()) return missingKey();

  let body;
  try { body = await request.json(); } catch { return json({ error: 'Ungültige Anfrage.' }, 400); }
  const model = ALLOWED.has(body.model) ? body.model : PRODUCER_FAST;

  const res = await fetch(`${API}/${model}:generateContent`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-goog-api-key': apiKey() },
    body: JSON.stringify(producerBody(body.input, model)),
  });
  const raw = await res.text();
  if (!res.ok) return googleError(res.status, raw);

  let data, result;
  try { data = JSON.parse(raw); result = readProducer(data); }
  catch { return json({ error: 'Der Produzent hat keinen lesbaren Prompt geliefert.' }, 502); }
  return json({ result, usage: data.usageMetadata || null, model });
}
