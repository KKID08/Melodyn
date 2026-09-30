// POST /api/understand
// { mode: "request" | "next", text?, audio?: { mime, data(base64) }, history: [{role, text}], context }
// Gemini listens (audio) or reads (text), keeps the chat history in mind and answers with a
// structured Music-Spec. It translates, it does not compose.
import { API, GEMINI_MODEL, apiKey, denied, googleError, json, missingKey } from './_lib.js';

const PALETTES = ['night', 'tunnel', 'kitchen', 'brass', 'focus', 'dusk', 'run', 'morning', 'rain'];

const SYSTEM = `Du bist die Prompt Engine von Melodyn, einem voice-first Musikstreamingdienst, der Songs für den Moment des Nutzers erzeugen lässt.
Du komponierst nicht selbst. Du übersetzt, was der Nutzer sagt, in eine präzise Music-Spec für das Musikmodell.

Regeln:
- Antworte ausschließlich im vorgegebenen JSON-Schema.
- "transcript": bei Audio die genauen gesprochenen Worte (in der gesprochenen Sprache, mit Satzzeichen). Bei Text den Text unverändert.
- "reply": höchstens zwei kurze, natürliche Sätze auf Deutsch, wie ein Freund mit gutem Musikgeschmack. Keine Emojis, keine Aufzählungen.
- Stelle nur dann eine Rückfrage ("ask": true), wenn der Nutzer ein belastendes Gefühl äußert (z. B. Trennung, Trauer, Wut) und nicht klar ist, ob er sich reinfühlen oder rauskommen will. Dann genau eine Frage und genau zwei Optionen. Frage nie zweimal hintereinander: Wenn deine letzte Nachricht eine Frage war, triff eine Entscheidung.
- Keine psychologischen Diagnosen. Stimmungen werden nur in Musik übersetzt.
- Keine Künstler- oder Songnamen in der Spec. Übersetze Vergleiche wie "klingt wie X" in Eigenschaften (Genre, Ära, Instrumente, Gesangsstil).
- Beachte die Regeln des Nutzers aus dem Kontext (z. B. "Kein Autotune") und trage sie in "avoid" ein. Neue Wünsche wie "nie wieder Autotune" oder "heute bitte instrumental" gehören zusätzlich in "new_rules" ("Immer" bei immer/nie wieder/generell, sonst "Nur heute").
- Folgewünsche ("schneller", "mehr Gitarren", "ruhiger", "nochmal sowas") beziehen sich auf die aktuelle Spec im Kontext: passe sie gezielt an und setze "new_session": false. Ein neuer Anlass, ein neues Genre oder ein neues Gefühl bedeutet "new_session": true.
- Wenn wenig gesagt wird, orientiere dich am Geschmacksprofil.
- "understood": 3 bis 4 kurze Zeilen dafür, was du verstanden hast (label max. 12 Zeichen, value max. 26 Zeichen), z. B. Situation, Stimmung, Genre, Tempo, Länge, Vermeiden. Wenn eine Regel des Nutzers greift, eine Zeile mit label "Deine Regel".
- "station": kurzer deutscher Name für diesen Moment, z. B. "Heimfahrt, nachts", "Sonntags kochen", "Heute Abend".
- "title": ein eigenständiger, schöner Songtitel (Deutsch oder Englisch, passend zur Sprache des Songs), nicht generisch.
- "palette" wählt das Farbbild: night (nächtlich, urban, blau-orange), tunnel (dunkel, Nachtfahrt, blau-bernstein), kitchen (warm, gesellig, rot-orange-oliv), brass (Hip-Hop, Soul, Gold-Braun), focus (ruhig, konzentriert, grün-grau), dusk (traurig, zart, violett-rosa), run (Sport, Energie, Neon), morning (hoffnungsvoll, hell, gelb-pfirsich), rain (melancholisch, grau-blau).
- "spec.genre" auf Englisch und präzise (z. B. "90s boom bap hip-hop", "nocturnal synthwave"), "spec.genre_de" kurz auf Deutsch für die Anzeige (z. B. "Boom Bap", "Synthwave").
- "spec.tempo_bpm" realistisch für das Genre. "energy" und "valence" zwischen 0 und 1.
- "spec.vocals": none, male, female oder duet. Instrumental bei Fokus/Arbeit oder wenn gewünscht.
- "spec.lyrics_language": de, wenn der Nutzer Deutsch spricht, außer er wünscht Englisch. "spec.lyrics_theme" kurz, konkret und passend zum Moment.
- "spec.instruments": 3 bis 5 konkrete Instrumente oder Klangfarben auf Englisch. "spec.mood": 2 bis 4 englische Adjektive. "spec.avoid": englische Stichworte.
- Modus "next": erzeuge den nächsten Song derselben Session. Gleiche Richtung, aber hörbar andere Variation (Tempo leicht verschieben, andere Instrumente betonen, neues Textthema, neuer Titel). Keine Rückfrage, "new_session": false, "reply" leer lassen.`;

const S = (type, extra = {}) => ({ type, ...extra });
const SCHEMA = S('OBJECT', {
  properties: {
    transcript: S('STRING'),
    ask: S('BOOLEAN'),
    question: S('STRING'),
    options: S('ARRAY', { items: S('OBJECT', { properties: { label: S('STRING'), description: S('STRING'), palette: S('STRING', { enum: PALETTES }) }, required: ['label', 'description', 'palette'] }) }),
    reply: S('STRING'),
    understood: S('ARRAY', { items: S('OBJECT', { properties: { label: S('STRING'), value: S('STRING') }, required: ['label', 'value'] }) }),
    station: S('STRING'),
    palette: S('STRING', { enum: PALETTES }),
    title: S('STRING'),
    new_session: S('BOOLEAN'),
    new_rules: S('ARRAY', { items: S('OBJECT', { properties: { text: S('STRING'), scope: S('STRING', { enum: ['Immer', 'Nur heute'] }) }, required: ['text', 'scope'] }) }),
    spec: S('OBJECT', {
      properties: {
        genre: S('STRING'), genre_de: S('STRING'), tempo_bpm: S('INTEGER'),
        mood: S('ARRAY', { items: S('STRING') }), energy: S('NUMBER'), valence: S('NUMBER'),
        vocals: S('STRING', { enum: ['none', 'male', 'female', 'duet'] }),
        lyrics_language: S('STRING', { enum: ['de', 'en'] }), lyrics_theme: S('STRING'),
        instruments: S('ARRAY', { items: S('STRING') }), avoid: S('ARRAY', { items: S('STRING') }),
      },
      required: ['genre', 'genre_de', 'tempo_bpm', 'mood', 'energy', 'valence', 'vocals', 'lyrics_language', 'lyrics_theme', 'instruments', 'avoid'],
    }),
  },
  required: ['transcript', 'ask', 'reply', 'understood', 'station', 'palette', 'title', 'new_session', 'new_rules', 'spec'],
});

const MAX_AUDIO_B64 = 3_000_000;

export async function POST(request) {
  const no = denied(request);
  if (no) return no;
  if (!apiKey()) return missingKey();

  let body;
  try { body = await request.json(); } catch { return json({ error: 'Ungültige Anfrage.' }, 400); }
  const mode = body.mode === 'next' ? 'next' : 'request';
  const history = Array.isArray(body.history) ? body.history.slice(-12) : [];
  const context = body.context && typeof body.context === 'object' ? body.context : {};

  const contents = [];
  for (const h of history) {
    const text = String(h.text || '').slice(0, 1200);
    if (!text) continue;
    contents.push({ role: h.role === 'model' ? 'model' : 'user', parts: [{ text }] });
  }
  const parts = [{ text: `Modus: ${mode}\nKontext (JSON): ${JSON.stringify(context).slice(0, 6000)}` }];
  if (mode === 'next') {
    parts.push({ text: 'Erzeuge die Spec für den nächsten Song dieser Session.' });
  } else if (body.audio && body.audio.data) {
    if (String(body.audio.data).length > MAX_AUDIO_B64) return json({ error: 'Die Aufnahme ist zu lang.' }, 413);
    parts.push({ text: 'Der Nutzer hat gerade Folgendes gesagt:' });
    parts.push({ inlineData: { mimeType: body.audio.mime || 'audio/wav', data: body.audio.data } });
  } else {
    const text = String(body.text || '').trim().slice(0, 1000);
    if (!text) return json({ error: 'Es fehlt ein Wunsch.' }, 400);
    parts.push({ text: `Der Nutzer schreibt: ${text}` });
  }
  contents.push({ role: 'user', parts });

  const started = Date.now();
  const res = await fetch(`${API}/${GEMINI_MODEL}:generateContent`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-goog-api-key': apiKey() },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM }] },
      contents,
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: SCHEMA,
        temperature: 0.9,
        thinkingConfig: { thinkingBudget: 0 },
      },
    }),
  });
  const raw = await res.text();
  if (!res.ok) return googleError(res.status, raw);

  let data, result;
  try {
    data = JSON.parse(raw);
    const text = (data.candidates?.[0]?.content?.parts || []).map(p => p.text || '').join('');
    result = JSON.parse(text);
  } catch {
    return json({ error: 'Gemini hat keine lesbare Antwort geliefert. Bitte nochmal versuchen.' }, 502);
  }
  return json({ result, usage: data.usageMetadata || null, model: GEMINI_MODEL, ms: Date.now() - started });
}
