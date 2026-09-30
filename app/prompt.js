// Melodyn prompt engine: shared by the browser (GitHub Pages) and the Vercel function.
// Gemini translates what the user says into a structured Music-Spec. It does not compose.

export const GEMINI_MODEL = 'gemini-2.5-flash';
export const LYRIA_FULL = 'lyria-3.5';
export const LYRIA_CLIP = 'lyria-3-clip-preview';
export const API = 'https://generativelanguage.googleapis.com/v1beta/models';
export const PALETTES = ['night', 'tunnel', 'kitchen', 'brass', 'focus', 'dusk', 'run', 'morning', 'rain'];

export const SYSTEM = `Du bist die Prompt Engine von Melodyn, einem voice-first Musikstreamingdienst, der Songs für den Moment des Nutzers erzeugen lässt.
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
export const SCHEMA = S('OBJECT', {
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

// Build the generateContent body. Throws an Error with a German message on bad input.
export function understandBody({ mode, text, audio, history, context }) {
  mode = mode === 'next' ? 'next' : 'request';
  const contents = [];
  for (const h of (Array.isArray(history) ? history.slice(-12) : [])) {
    const t = String(h.text || '').slice(0, 1200);
    if (t) contents.push({ role: h.role === 'model' ? 'model' : 'user', parts: [{ text: t }] });
  }
  const ctx = context && typeof context === 'object' ? context : {};
  const parts = [{ text: `Modus: ${mode}\nKontext (JSON): ${JSON.stringify(ctx).slice(0, 6000)}` }];
  if (mode === 'next') {
    parts.push({ text: 'Erzeuge die Spec für den nächsten Song dieser Session.' });
  } else if (audio && audio.data) {
    if (String(audio.data).length > MAX_AUDIO_B64) throw new Error('Die Aufnahme ist zu lang.');
    parts.push({ text: 'Der Nutzer hat gerade Folgendes gesagt:' });
    parts.push({ inlineData: { mimeType: audio.mime || 'audio/wav', data: audio.data } });
  } else {
    const t = String(text || '').trim().slice(0, 1000);
    if (!t) throw new Error('Es fehlt ein Wunsch.');
    parts.push({ text: `Der Nutzer schreibt: ${t}` });
  }
  contents.push({ role: 'user', parts });
  return {
    systemInstruction: { parts: [{ text: SYSTEM }] },
    contents,
    generationConfig: { responseMimeType: 'application/json', responseSchema: SCHEMA, temperature: 0.9, thinkingConfig: { thinkingBudget: 0 } },
  };
}

// Pull the JSON result out of a Gemini response
export function readUnderstand(data) {
  const text = (data.candidates?.[0]?.content?.parts || []).map(p => p.text || '').join('');
  return JSON.parse(text);
}
