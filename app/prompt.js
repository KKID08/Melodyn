// Melodyn prompt engine: shared by the browser (GitHub Pages) and the Vercel function.
// Gemini translates what the user says into a structured Music-Spec. It does not compose.

export const GEMINI_MODEL = 'gemini-2.5-flash';
export const LYRIA_FULL = 'lyria-3.5';
export const LYRIA_CLIP = 'lyria-3-clip-preview';
export const TTS_MODEL = 'gemini-2.5-flash-preview-tts';
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
- Nennt der Nutzer Künstler, Songs oder Vergleiche ("so wie X", "klingt wie Y"), schreib sie wörtlich in "spec.references" (nur intern, geht nie an das Musikmodell). Alle anderen Spec-Felder enthalten keine Namen. Wähle Genre, Tempo, Stimmung und Energie nach dem typischen, bekanntesten Sound dieser Referenz, also nach dem, was ein normaler Hörer damit meint, nicht nach Randwerken oder den härtesten Tracks. Beispiel: "90s Hip-Hop wie Tupac" meint entspannten, melodischen West-Coast-Sound um 90 BPM, nicht schnellen Battle-Rap.
- "spec.vibe": ein kurzer englischer Satz, wie es sich anfühlen soll (z. B. "slow, chill, sunny West Coast cruising with a reflective edge").
- Beachte die Regeln des Nutzers aus dem Kontext (z. B. "Kein Autotune") und trage sie in "avoid" ein. Neue Wünsche wie "nie wieder Autotune" oder "heute bitte instrumental" gehören zusätzlich in "new_rules" ("Immer" bei immer/nie wieder/generell, sonst "Nur heute").
- Folgewünsche ("schneller", "mehr Gitarren", "ruhiger", "nochmal sowas") beziehen sich auf die aktuelle Spec im Kontext: passe sie gezielt an und setze "new_session": false. Ein neuer Anlass, ein neues Genre oder ein neues Gefühl bedeutet "new_session": true.
- Wenn wenig gesagt wird, orientiere dich am Geschmacksprofil.
- "understood": 3 bis 4 kurze Zeilen dafür, was du verstanden hast (label max. 12 Zeichen, value max. 26 Zeichen), z. B. Situation, Stimmung, Genre, Tempo, Länge, Vermeiden. Wenn eine Regel des Nutzers greift, eine Zeile mit label "Deine Regel".
- "station": kurzer deutscher Name für diesen Moment, z. B. "Heimfahrt, nachts", "Sonntags kochen", "Heute Abend".
- "title": ein eigenständiger, schöner Songtitel (Deutsch oder Englisch, passend zur Sprache des Songs), nicht generisch.
- "palette" wählt das Farbbild: night (nächtlich, urban, blau-orange), tunnel (dunkel, Nachtfahrt, blau-bernstein), kitchen (warm, gesellig, rot-orange-oliv), brass (Hip-Hop, Soul, Gold-Braun), focus (ruhig, konzentriert, grün-grau), dusk (traurig, zart, violett-rosa), run (Sport, Energie, Neon), morning (hoffnungsvoll, hell, gelb-pfirsich), rain (melancholisch, grau-blau).
- "spec.genre" auf Englisch und so genau wie möglich. Übernimm jede Angabe des Nutzers zu Subgenre, Ära, Region und Szene wörtlich und verallgemeinere nie: "Hip-Hop, 90s, Westside" wird "1990s West Coast G-funk hip-hop", nicht "hip-hop"; "Hyperpop" bleibt "hyperpop", nicht "pop". "spec.genre_de" kurz auf Deutsch für die Anzeige, mit Ära und Region, wenn genannt (z. B. "90er West Coast", "Hyperpop", "Synthwave").
- "spec.tempo_bpm" realistisch für das Genre. "energy" und "valence" zwischen 0 und 1.
- "spec.vocals": none, male, female oder duet. Instrumental bei Fokus/Arbeit oder wenn gewünscht.
- "spec.lyrics_language": de, wenn der Nutzer Deutsch spricht, außer er wünscht Englisch. "spec.lyrics_theme" kurz, konkret und passend zum Moment.
- "spec.instruments": 3 bis 5 konkrete Instrumente oder Klangfarben auf Englisch. "spec.mood": 2 bis 4 englische Adjektive. "spec.avoid": englische Stichworte.
- "dj_line": ein kurzer Satz auf Deutsch (höchstens 14 Wörter), den die Melodyn-DJ-Stimme sagt, bevor der Song startet. Warm und locker wie Radio, nennt den Songtitel und knüpft an den Moment an. Keine Fragen, keine Emojis, keine Anführungszeichen. Bei "ask": true leer lassen.
- Modus "next": erzeuge den nächsten Song derselben Session. Gleiche Richtung, aber hörbar andere Variation (Tempo leicht verschieben, andere Instrumente betonen, neues Textthema, neuer Titel). Keine Rückfrage, "new_session": false, "reply" leer lassen. "dj_line" ist dann eine kurze Überleitung zum neuen Titel (höchstens 10 Wörter).`;

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
    dj_line: S('STRING'),
    new_session: S('BOOLEAN'),
    new_rules: S('ARRAY', { items: S('OBJECT', { properties: { text: S('STRING'), scope: S('STRING', { enum: ['Immer', 'Nur heute'] }) }, required: ['text', 'scope'] }) }),
    spec: S('OBJECT', {
      properties: {
        genre: S('STRING'), genre_de: S('STRING'), tempo_bpm: S('INTEGER'),
        mood: S('ARRAY', { items: S('STRING') }), energy: S('NUMBER'), valence: S('NUMBER'),
        vocals: S('STRING', { enum: ['none', 'male', 'female', 'duet'] }),
        lyrics_language: S('STRING', { enum: ['de', 'en'] }), lyrics_theme: S('STRING'),
        instruments: S('ARRAY', { items: S('STRING') }), avoid: S('ARRAY', { items: S('STRING') }),
        references: S('STRING'), vibe: S('STRING'),
      },
      required: ['genre', 'genre_de', 'tempo_bpm', 'mood', 'energy', 'valence', 'vocals', 'lyrics_language', 'lyrics_theme', 'instruments', 'avoid'],
    }),
  },
  required: ['transcript', 'ask', 'reply', 'understood', 'station', 'palette', 'title', 'dj_line', 'new_session', 'new_rules', 'spec'],
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

// DJ voice: Gemini text-to-speech, returns 24 kHz PCM
export function speakBody(text, voice = 'Charon') {
  return {
    contents: [{ parts: [{ text: `Say in a warm, relaxed, confident German radio DJ voice, natural pace, no pauses at the start: ${String(text).slice(0, 300)}` }] }],
    generationConfig: { responseModalities: ['AUDIO'], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } } } },
  };
}

// ------------------------------------------------------------ producer
// Second step: a producer model turns the spec plus the listener's own words into a detailed Lyria prompt.
// Lyria follows concrete sonic descriptions far better than genre labels, and drifts to mainstream pop when
// the prompt is vague. So the producer spells out what makes the genre unmistakable and what it must not become.
export const PRODUCER_FAST = 'gemini-3.8-flash';
export const PRODUCER_DEEP = 'gemini-3.1-pro-preview';

export const PRODUCER_SYSTEM = `You are a senior record producer and the prompt writer for Google Lyria 3.5, a text-to-music model.
You receive the listener's own words, a structured music spec (spec.references holds named artists or songs, spec.vibe the intended feel), the session's earlier wishes and the listener's rules.
First fill "listener_intent" (what they really mean, in one or two sentences) and "reference_translation" (what any named artist, song or era sounds like in musical terms; "none" if there is none). Then write the prompt from that understanding.
You write the prompt that makes Lyria produce exactly the requested style. Genre fidelity matters more than anything else.

How Lyria behaves:
- It follows concrete sonic descriptions (drum machines, grooves, synth types, vocal delivery, mix aesthetics) much better than genre labels.
- With vague prompts it drifts toward polished mainstream pop. Every prompt must actively prevent that drift.
- It refuses prompts that name real artists, bands, songs, producers or labels. Never name any. Describe the sound instead.
- It accepts exact BPM, key, and a timestamped structure like "[0:00-0:12] Intro: ...".

Read the vibe like a friend with great taste:
- Ask yourself what a typical listener pictures when they say these words. Aim for the iconic, most-loved sound of a genre, era or named reference, not its edge cases, its hardest tracks or a modern reinterpretation.
- Named artists or songs in listener_words or spec.references are the strongest signal of all. Translate them into their typical tempo, groove, flow, vocal tone, emotional colour and production, then never mention the names.
- Feel words ("chillig", "entspannt", "cruisen", "krass", "düster", "zum Tanzen") override genre defaults.

Method:
1. Pin down the exact target: micro-genre, era, region or scene. The listener's own qualifiers win over the spec (e.g. "90s", "West Coast", "hyper", "underground", "lo-fi"). Never widen them.
2. Describe the signature of that style concretely and era-accurately:
   drums (specific machines or break styles, swing, hi-hat patterns, kick character), bass (instrument, playing style),
   harmony and leads (instruments, synth types, sampling style), sound design and effects, vocal delivery and processing
   (rap flow vs singing, tone, ad-libs, pitch effects), arrangement habits, mix and master aesthetic (tape, grit, loudness, stereo width).
3. Give tempo as exact BPM with the genre's feel (half-time, swing, straight), and a fitting key or mode.
4. Vocals: gender, language, delivery, and the lyrical theme in a few words. Do not write full lyrics.
   For rap always state the flow explicitly: speed (for example "relaxed, unhurried flow, about two syllables per beat, lots of space between lines" or "fast double-time flow"), rhythm (on the beat, behind the beat, triplets), tone (smooth, gritty, melodic, conversational) and whether hooks are sung. If the vibe is chill or laid-back, "fast double-time rap" and "rapid-fire chopper flow" belong in "avoid".
5. "avoid": 4 to 8 short English phrases naming the styles and production traits this genre typically drifts into and must not become.
6. English only. "core": 70 to 140 words describing the sound, without timeline. Its first sentence states the vibe in plain words (for example "Slow, chill, sunny West Coast cruising track with a reflective edge."), because Lyria weighs the opening most. "structure": a timestamped arrangement for a full song of about 2:50 to 3:10, 5 to 7 sections, each with what enters or changes.
7. The listener's rules always win over genre conventions (for example "no autotune" in a hyperpop song means natural, unprocessed vocals). Put rules that forbid something into "avoid".
8. In mode "next", keep the same genre identity but make a clearly different song: new hook idea, shifted instrumentation focus, tempo within ±6 BPM.

Example (listener said "Hyperpop, richtig drüber"):
target: 2020s hyperpop, maximalist internet-underground sound
core: Hyperpop at 158 BPM in F# major, maximalist and abrasive but sugary. Blown-out distorted 808 kicks and clipped snares, bitcrushed supersaw chords, sparkling glassy arpeggios and chiptune squares. Lead vocal pitched up a few semitones with hard, obvious autotune, playful and breathless, stacked chipmunk harmonies and glitchy vocal chops. Sudden stutter edits, tape-stop drops, one abrupt switch into a double-time breakcore section. Crushed, loud, deliberately clipping master with wide stereo glitter.
avoid: polite radio pop, clean natural vocals, acoustic guitar, restrained dynamics, soft piano ballad, generic EDM build and drop

Example (listener said "Hip-Hop, 90s, Westside"):
target: early-to-mid 1990s West Coast G-funk
vibe: laid-back, sunny, cruising, with a menacing undertone
vocal_delivery: smooth, unhurried West Coast rap, mostly on the beat, about two syllables per beat, gang-vocal hooks
core: Laid-back, sunny cruising track with a menacing undertone. 1990s West Coast G-funk hip-hop at 92 BPM in G minor. Swung drum-machine groove with a punchy 808-style kick, crisp snare and relaxed 16th hi-hats, deep rubbery funk bassline, high whining portamento sine lead synth, warm Rhodes and string pads, talk-box ad-libs. Male rap vocal with a smooth, unhurried flow and plenty of space between lines, gang-vocal hooks, occasional sung female chorus. Warm analog mix, tape saturation, spacious low end, no modern sheen.
avoid: trap hi-hat rolls, 2010s pop-rap, glossy EDM synths, auto-tuned melodic rap, fast double-time rapping, boom-bap East Coast grit

Example (listener said "90s Hip-Hop, so wie Tupac"):
listener_intent: The classic mid-90s West Coast feel people picture with that name: slow, chill, soulful and heartfelt, head-nodding while cruising, a confident melodic voice with something to say.
reference_translation: mid-1990s West Coast, soulful G-funk and piano-sample production, 85 to 94 BPM, relaxed swing, passionate but unhurried melodic rap flow, reflective and warm lyrics, sung R&B hooks.
target: mid-1990s soulful West Coast hip-hop
vibe: slow, chill, warm and reflective, sunset cruising
vocal_delivery: passionate but relaxed male rap, melodic and conversational, slightly behind the beat, about two syllables per beat, never rushed; sung soulful female R&B hook
core: Slow, chill, warm and reflective sunset-cruising track. Mid-1990s soulful West Coast hip-hop at 88 BPM in D minor with a relaxed swing. Dusty sampled-sounding piano and Rhodes chords, deep round funk bass, soft whining synth lead in the gaps, laid-back drum-machine beat with a fat kick, snappy snare and sparse hats. Male rap vocal that is passionate yet unhurried, melodic and conversational, riding slightly behind the beat with space between lines. Sung female R&B hook. Warm analog mix with gentle tape saturation.
avoid: fast double-time rapping, rapid-fire chopper flow, aggressive battle rap, trap hi-hat rolls, 2010s pop-rap, EDM synths`;

const P = (type, extra = {}) => ({ type, ...extra });
// Field order matters: the model first says what the listener means, then writes the prompt from that
const ORDER = ['listener_intent', 'reference_translation', 'target', 'vibe', 'vocal_delivery', 'core', 'structure', 'avoid'];
export const PRODUCER_SCHEMA = P('OBJECT', {
  properties: {
    listener_intent: P('STRING'), reference_translation: P('STRING'), target: P('STRING'), vibe: P('STRING'),
    vocal_delivery: P('STRING'), core: P('STRING'), structure: P('STRING'), avoid: P('ARRAY', { items: P('STRING') }),
  },
  required: ORDER,
  propertyOrdering: ORDER,
});

// input: { mode, words: [..], spec, rules: [..], previous }
export function producerBody(input, model) {
  const i = input && typeof input === 'object' ? input : {};
  const brief = {
    mode: i.mode === 'next' ? 'next' : 'first',
    listener_words: (Array.isArray(i.words) ? i.words : []).map(w => String(w).slice(0, 400)).slice(-5),
    spec: i.spec || {},
    listener_rules: (Array.isArray(i.rules) ? i.rules : []).map(r => String(r).slice(0, 120)).slice(0, 12),
    previous_song_prompt: i.previous ? String(i.previous).slice(0, 1500) : null,
  };
  const thinking = /^gemini-2\./.test(model) ? { thinkingBudget: 512 } : { thinkingLevel: 'low' };
  return {
    systemInstruction: { parts: [{ text: PRODUCER_SYSTEM }] },
    contents: [{ role: 'user', parts: [{ text: 'Brief (JSON):\n' + JSON.stringify(brief) }] }],
    generationConfig: { responseMimeType: 'application/json', responseSchema: PRODUCER_SCHEMA, temperature: 0.8, thinkingConfig: thinking },
  };
}
export function readProducer(data) {
  const r = readUnderstand(data);
  if (!r || !String(r.core || '').trim()) throw new Error('empty');
  return r;
}
