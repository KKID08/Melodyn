# Melodyn

Voice-first Musikstream: Du sagst, wonach dir ist, Melodyn erzeugt passende Songs und lernt aus deinem Feedback.

## Was hier liegt

| Ordner | Inhalt |
|---|---|
| `index.html`, `app/`, `api/` | **Live-Prototyp**: echtes Mikrofon, Gemini versteht den Wunsch, Lyria komponiert echte Songs |
| `prototype/` | Klickbarer Design-Prototyp (App und Website, alles simuliert) |
| `design/` | Screen-Designs als HTML, `node design/render.js` erzeugt die Screenshots in `design/shots/` |
| `web/` | Erster, einfacher Web-Prototyp |

## So funktioniert der Live-Prototyp

1. Du tippst auf die Kugel und sprichst (oder schreibst).
2. `api/understand.js` schickt Aufnahme, Chat-Verlauf, Geschmack und Regeln an **Gemini 2.5 Flash**. Zurück kommt eine Music-Spec als JSON.
3. Ein **Produzenten-Modell** schreibt daraus den eigentlichen Musik-Prompt: typische Drums, Bass, Synths, Gesang und Mix des Genres, Tempo, Tonart, Songaufbau mit Zeitmarken und eine Liste, was der Song nicht werden darf (z. B. „kein 2010er Pop-Rap“). Es bekommt dafür auch die wörtlichen Worte des Nutzers, damit „90s Westside“ nicht zu „Hip-Hop“ verwässert. Nennt der Nutzer Künstler („so wie Tupac“), übersetzt der Produzent zuerst, was ein normaler Hörer damit meint (Tempo, Groove, Flow, Stimmung), und schreibt die Namen nie in den Lyria-Prompt. Bei Rap legt er immer das Flow-Tempo fest. Gemini 3.1 Pro schreibt die Prompts; beim ersten Song läuft parallel Gemini 3.8 Flash und springt ein, wenn Pro länger als etwa 7 Sekunden braucht. Fällt ein Modell aus, springt das nächste ein.
4. `api/compose.js` bestellt den Song bei **Lyria 3.5** (voll, ca. 3 Min.) oder **Lyria Clip** (30 s).
5. Die MP3 läuft im Player. Während sie läuft, wird der nächste Song vorbereitet und im Takt übergeblendet (ohne DJ-Ansage). Die DJ-Stimme kommt nur bei einem neuen Wunsch oder Richtungswechsel.

Was die App mitdenkt:
- **Wartezeit:** Erst ein 30-Sekunden-Clip plus DJ-Ansage, der volle Song übernimmt im Takt. Die Einstellungen zeigen die gemessene „Zeit bis Musik“.
- **Kosten:** Der nächste Song wird erst nach 15 Sekunden Hören geplant. So fließen schnelles Skippen und „Nicht mein Ding“ noch ein, und bei einem Richtungswechsel ist nichts umsonst bezahlt. Gespeicherte Songs laufen kostenlos der Reihe nach, mit denselben Übergängen.
- **Zuhören:** Laufende Musik wird leiser, solange Melodyn zuhört.
- **Stabilität:** Überlastet Google kurz (Fehler 5xx), versucht die App es einmal automatisch neu.
- **Tastatur (Desktop):** Leertaste Play/Pause, Pfeiltasten Skip/Zurück, Esc schließt.

Der Google-Schlüssel liegt nur auf dem Server (Vercel). Im Browser und im Repo taucht er nie auf.

## Demo-Modus (kostenlos)

In den Einstellungen unter **Modus** auf **Demo** stellen, oder auf dem Schlüssel-Bildschirm „Erst mal ohne Schlüssel ausprobieren“ tippen. Dann geht keine einzige Anfrage an Google: Wünsche werden mit einfachen Stichwort-Regeln verstanden, es laufen echte, vorab erzeugte Lyria-Songs aus dem Ordner `demo/`, und die DJ-Stimme kommt aus der Sprachausgabe des Browsers. Clip, voller Song, Übergänge, Bibliothek und alle Menüs funktionieren wie im echten Modus. Gut zum Arbeiten am Design.

## Auf GitHub Pages nutzen

Der Branch `gh-pages` wird als Seite veröffentlicht: **https://kkid08.github.io/Melodyn/**

Beim ersten Öffnen fragt die App nach einem Google API-Schlüssel aus [Google AI Studio](https://aistudio.google.com/apikey). Der Schlüssel wird nur im eigenen Browser gespeichert und geht direkt an Google, er landet nie im Repo. Wer die Seite öffnet, braucht einen eigenen Schlüssel.

## Alternativ: auf Vercel veröffentlichen

1. Auf [vercel.com](https://vercel.com) mit dem GitHub-Konto anmelden.
2. **Add New → Project**, das Repo `KKID08/Melodyn` auswählen, **Import**.
3. Framework Preset: **Other**. Build- und Output-Einstellungen leer lassen.
4. Unter **Environment Variables** eintragen:
   - `GEMINI_API_KEY` = dein Schlüssel aus Google AI Studio
   - `APP_CODE` = ein selbst ausgedachter Zugangscode (empfohlen, damit Fremde mit dem Link nicht auf deine Kosten Songs erzeugen)
5. **Deploy**. Danach bekommst du einen Link wie `melodyn-xyz.vercel.app`.

Der Live-Prototyp liegt im Branch `claude/melodyn-prototype`. Entweder diesen Branch in `main` übernehmen, oder in Vercel unter **Settings → Git → Production Branch** den Branch eintragen und neu deployen.

Optionale Variablen: `GEMINI_MODEL` (Standard `gemini-2.5-flash`), `LYRIA_MODEL` (Standard `lyria-3.5`).

## Kosten (Stand September 2026, laut öffentlichen Preislisten)

| Schritt | Preis | Gemessen im Test |
|---|---|---|
| Gemini versteht Sprache oder Text | 0,30 $ je 1 Mio. Text-Tokens, 1,00 $ je 1 Mio. Audio-Tokens, 2,50 $ je 1 Mio. Antwort-Tokens | ca. 0,001 $ pro Wunsch, ca. 2 s |
| Produzent (Musik-Prompt) | Gemini 3.8 Flash 0,75 $ / 3,75 $ je 1 Mio. Tokens, Gemini 3.1 Pro 2 $ / 12 $ | ca. 0,005 $ (Flash) bzw. 0,015 $ (Pro) pro Song, 1 bis 3 s |
| Lyria 3.5, voller Song | 0,08 $ pro Song | ca. 2:50 Min. Musik, 34 bis 45 s Wartezeit |
| Lyria Clip | 0,04 $ pro Clip | 30 s Musik, ca. 8 s Wartezeit |

Hochgerechnet: etwa **1,70 $ pro Stunde neu erzeugter Musik** mit vollen Songs, etwa 4,80 $ mit Clips. Die App zeigt die laufenden Kosten live an. Die verbindliche Abrechnung steht in Google AI Studio.
