import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { themes, DEFAULT_THEME, type Theme, type ThemeName } from "./themes";
import { usePreferences, resolveFonts, FONT_SCALE } from "./preferences-context";

const STORAGE_KEY = "sportsfusion.theme";

interface ThemeContextValue {
  theme: Theme;
  themeName: ThemeName;
  setThemeName: (name: ThemeName) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: themes[DEFAULT_THEME],
  themeName: DEFAULT_THEME,
  setThemeName: () => {},
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [name, setName] = useState<ThemeName>(DEFAULT_THEME);

  // restore the saved theme (no-op if storage is unavailable)
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((v) => {
        if (v && v in themes) setName(v as ThemeName);
      })
      .catch(() => {});
  }, []);

  const setThemeName = useCallback((next: ThemeName) => {
    setName(next);
    AsyncStorage.setItem(STORAGE_KEY, next).catch(() => {});
  }, []);

  return (
    <ThemeContext.Provider value={{ theme: themes[name], themeName: name, setThemeName }}>
      {children}
    </ThemeContext.Provider>
  );
}

// Most components just need the palette — now blended with the user's font
// preferences (type propagates app-wide via the font tokens; scale is exposed
// as theme.fontScale for components that opt into it).
export const useTheme = (): Theme => {
  const base = useContext(ThemeContext).theme;
  const { fontChoice, fontSize } = usePreferences();
  return useMemo(
    () => ({
      ...base,
      font: resolveFonts(fontChoice, base.font),
      fontScale: FONT_SCALE[fontSize],
    }),
    [base, fontChoice, fontSize]
  );
};
// The switcher needs the setter too:
export const useThemeControls = () => useContext(ThemeContext);
