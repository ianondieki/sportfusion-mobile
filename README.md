# SportsFusion

A multi-sport mobile companion — **Formula 1** and **Football** — built with
Expo (React Native) + TypeScript + Expo Router + Reanimated. One sport toggle
swaps every tab between live F1 and football data, with five switchable themes
and animation throughout.

---

## Run it

Requires Expo SDK 54 (matches the Expo Go app). From the project root:

```bash
npm install
npx expo install --fix     # aligns native deps to your SDK
npm run start              # or: npx expo start -c --lan
```

Scan the QR with **Expo Go** on your phone (same Wi-Fi as the laptop). Press
`r` to reload, or restart with `npx expo start -c --lan` to clear the cache
after adding files. The `w` (web) preview is not supported — some data sources
block browser-origin calls; use the native app.

---

## Sports & tabs

A **Formula 1 / Football** switch sits at the top of every tab. Flip it and all
three tabs change what they show:

| Tab | Formula 1 | Football |
|-----|-----------|----------|
| **Live** | Latest session + finishing order | Recent results (LIVE tag on in-play) |
| **Standings** | Drivers' championship | League table / group tables |
| **Schedule** | Race calendar + live countdown | Upcoming fixtures |

For football, a **competition picker** lets you switch between the Premier
League, La Liga, Serie A, Bundesliga, Ligue 1, Champions League, and World Cup
2026. Cups render as multiple **group tables** and tag fixtures by **stage**
(Group Stage, Round of 16, …). Your sport, competition, and theme all persist.

---

## Data sources

All real data. No backend required.

- **F1 standings** — Jolpica (Ergast-compatible), free, no key.
- **F1 live session + schedule** — OpenF1 (`api.openf1.org`), free historical
  data, no key. Real-time during-race data is paywalled there, so the Live tab
  reflects the most recent completed session and flags one as LIVE if in progress.
- **Football** — football-data.org v4. **Requires a free API key** (see Config).
  Free tier: 12 top competitions, league tables + fixtures, delayed scores,
  10 requests/min.

The football layer is built to stay under the rate limit two ways: a **60-second
response cache** per endpoint (the Live and Schedule tabs share one `/matches`
fetch), and **auto-throttle** that reads the API's rate-limit headers and pauses
new requests when nearly out, instead of getting blocked.

---

## APEX chat, voice & Watch Live

The **Chat** tab hosts APEX, a Gemini-powered sports companion grounded in the
app's real standings/results.

- **Voice replies** — tap the speaker icon in the chat header and APEX reads
  answers aloud (`expo-speech`, works everywhere including Expo Go).
- **Voice input** — tap the mic next to the text box and dictate your question;
  the transcript fills the input live and sends when you finish speaking.
  Uses `expo-speech-recognition`, a native module that is **not in Expo Go** —
  run `npx expo run:android` / `run:ios` or an EAS dev build to enable it
  (in Expo Go the mic explains this instead of crashing).
- **Watch Live** — when a match or F1 session is live right now, a pulsing
  **Watch live** chip appears above the chat input, live football rows get a
  **WATCH** button, and the F1 live header gets **WATCH LIVE**. All of them
  open an in-app HLS player (`expo-video`, fullscreen + picture-in-picture).

**About live sports streams:** there is no free, legal API that serves live
video of top-flight football or F1 — broadcast video rights are licensed per
region (F1 TV, DAZN, Sky, …). So the player is **bring-your-own-stream**: map
competition codes to HLS URLs you're entitled to watch in
`LIVE_STREAM_SOURCES` (`lib/config.ts`), or point an entry at the official
broadcaster page (`kind: "web"`) to hand off legally. Unmapped events fall
back to a free public demo HLS stream so the whole flow works out of the box.

---

## Config

`lib/config.ts` is **gitignored on purpose** — your real API keys live only on
your machine and can never be accidentally committed. First time setup:

```
cp lib/config.example.ts lib/config.ts        # macOS/Linux
copy lib\config.example.ts lib\config.ts      # Windows
```

Then fill in your keys:

- `FOOTBALL_API_KEY` — paste a free key from football-data.org/client/register.
  Until it's set, the Football tabs show a friendly setup prompt (no error).
- `GEMINI_API_KEY` — free key from aistudio.google.com/app/apikeys; switches on
  the APEX chatbot. `GEMINI_MODEL` defaults to `gemini-2.5-flash`.
- `APIFOOTBALL_API_KEY` — optional, adds real match stats (possession, shots…).
- `LIVE_STREAM_SOURCES` / `DEMO_STREAM_URL` — Watch Live sources (see above).

`.easignore` ensures your local `lib/config.ts` still uploads to EAS build
servers (gitignored files are otherwise excluded from builds).

> The key in a client app is visible in the bundle and shared across users
> (10 req/min). Fine for a portfolio demo; for production, proxy it through a
> backend and keep the key server-side.

Competitions are listed in `lib/competitions.ts` — add a row to extend the picker.

---

## Themes

Five complete themes, switchable live from swatches on the Standings tab; the
whole app recolours instantly and remembers your choice:

| Theme | Direction |
|-------|-----------|
| **Carbon** | Carbon-black + F1 red (default) |
| **Monaco** | Midnight navy + champagne gold |
| **Apex** | Pure black + acid lime (high-contrast) |
| **Paddock** | Warm paper + crimson (light theme) |
| **Heritage** | Espresso + British racing green |

Themes flow through React context; every screen builds styles via `makeStyles(t)`,
so switching is instant app-wide. Add one entry to `lib/themes.ts` for a new theme.

---

## Motion

Reanimated throughout: a championship-leader hero card, staggered row entrances,
animated points bars (F1 standings), a live ticking countdown (F1 schedule),
press micro-interactions, shimmer skeletons while loading, layout transitions on
refresh, and a pulsing LIVE indicator.

---

## Crests & flags

Football rows show club badges (PNG crests from football-data.org). National
teams show a **flag emoji** built from an ISO country code. Anything that can't
render (SVG crests, unmapped names, TBD knockout slots) falls back to an initials
monogram — so a row never shows a blank. Country names are mapped in
`components/football/Crest.tsx`.

---

## Project structure

```
app/
  _layout.tsx              providers (theme / sport / competition), fonts, gradient
  (tabs)/
    _layout.tsx            themed tab navigator
    index.tsx              Live  -> F1 session  OR  football results
    standings.tsx          F1 drivers table  OR  football league/group table
    schedule.tsx           F1 calendar+countdown  OR  football fixtures
components/
  SportSwitcher.tsx        F1 <-> Football toggle
  ThemePicker.tsx          theme swatches
  football/
    CompetitionPicker.tsx  league/cup selector
    FootballTable.tsx      league + grouped cup tables
    FootballMatches.tsx    results / fixtures (one component, two modes)
    Crest.tsx              flag emoji / crest image / monogram
    SetupCard.tsx          API-key setup prompt
lib/
  config.ts                football API key + notes
  competitions.ts          competition list for the picker
  themes.ts                the five theme palettes
  theme-context.tsx        useTheme / useThemeControls
  sport-context.tsx        useSport (F1 / football)
  football-competition-context.tsx   useCompetition
  teamColors.ts            F1 constructor colours
  types.ts                 F1 standings types
  api/
    standings.ts           F1 standings (Jolpica)
    openf1.ts              F1 session + schedule (OpenF1)
    football.ts            football table + matches, cache + throttle
```

---

## Known limitations

- Football needs a free key; F1 works with none.
- football-data.org free tier is delayed (not real-time) and capped at 10 req/min.
- The web build is unsupported (browser-origin API blocks); use the native app.
- World Cup national-team badges are SVG, so they render as flag emoji rather
  than the federation crest; any country name not in the map shows initials.
- Built and statically checked; the device is the real test. Report any runtime
  error and it can be patched quickly.

---

## Possible next steps

- Shareable standalone build: EAS `preview` APK, or a hosted web version.
- League picker enhancements (more competitions, persisted per sport).
- Wire the F1 Live tab to a custom SSE backend for true real-time timing.