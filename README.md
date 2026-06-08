# SportsFusion Mobile

F1 live race companion — the mobile client for the SportsFusion backend.
Built with Expo (React Native) + TypeScript + Expo Router + Reanimated.

## Run it

```bash
npm install
npx expo install   # realigns native/expo deps to your SDK (recommended)
npm start
```

Scan the QR with **Expo Go**, or press `w` for the browser. The **Standings**
tab pulls live current-season F1 data on first load — pull down to refresh.

## Themes (live switcher)

Five complete, intentional themes — tap the swatches at the top of the Standings
tab and the entire app recolours instantly (and remembers your choice):

| Theme | Direction |
|-------|-----------|
| **Carbon** | Carbon-black + F1 red (default) |
| **Monaco** | Midnight navy + champagne gold — luxury |
| **Apex** | Pure black + acid lime — brutalist, high-contrast |
| **Paddock** | Warm paper + crimson — editorial light theme |
| **Heritage** | Espresso + British racing green — vintage motorsport |

Themes flow through React context (`lib/theme-context.tsx`) and a palette
registry (`lib/themes.ts`). Each screen builds its styles with `makeStyles(t)`,
so switching is instant app-wide. Add a new theme by adding one entry to
`themes` — no other changes needed. Selection persists via AsyncStorage.

## Design & motion

Broadcast-grade aesthetic with condensed motorsport type (Saira Condensed) and
Reanimated motion:

- **Championship-leader hero card** with a team-colour gradient wash.
- **Staggered row entrances** — drivers spring up in sequence.
- **Animated points bars** — a team-coloured fill grows relative to the leader.
- **Press micro-interactions** — rows spring-scale on touch.
- **Shimmer skeleton** while loading.
- **Layout transitions** — rows animate into place on refresh.
- **Pulsing LIVE signal** on the Live tab.

## Structure

```
app/
  _layout.tsx          ThemeProvider, fonts, ambient gradient
  (tabs)/
    _layout.tsx        themed tab navigator
    index.tsx          Live  (placeholder, pulsing badge)
    standings.tsx      Standings (functional + animated + themed)
    schedule.tsx       Schedule (placeholder)
components/
  ThemePicker.tsx      live theme switcher
lib/
  themes.ts            the five theme palettes
  theme-context.tsx    provider + useTheme()/useThemeControls()
  config.ts            API_BASE — swap to your backend here
  teamColors.ts        constructorId -> brand colour
  types.ts             response types
  api/standings.ts     fetch + parse (the only place the network lives)
```

## Swapping in your SportsFusion backend

Ships pointed at the public Jolpica F1 API so it works with zero setup. When
your backend exposes a standings route: edit `API_BASE` in `lib/config.ts`, then
map your response into `DriverStanding[]` in `lib/api/standings.ts`. Screens
never change — all network + parsing is isolated in `lib/api`.

## Next: the Live screen (SSE)

React Native's `fetch` has **no native `EventSource`**. To reuse your existing
SportsFusion SSE stream: `npm install react-native-sse`, then consume the same
stream. (Or add a WebSocket endpoint — more idiomatic for RN.)

---

### If `npm install` complains about versions

SDK pins drift. Guaranteed-clean path — scaffold fresh and drop these files in:

```bash
npx create-expo-app@latest sportsfusion-mobile
# pick the default template, then copy app/ + components/ + lib/ + babel.config.js,
# then:
npx expo install react-native-reanimated expo-linear-gradient expo-font \
  expo-splash-screen @react-native-async-storage/async-storage \
  @expo-google-fonts/saira @expo-google-fonts/saira-condensed
```

> `babel.config.js` includes the Reanimated plugin (must be last). If animations
> don't run or themes look off, clear the cache: `npx expo start -c`.
"# sportfusion-mobile" 
