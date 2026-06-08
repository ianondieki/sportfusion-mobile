import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { themes, DEFAULT_THEME, type Theme, type ThemeName } from "./themes";

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

// Most components just need the palette:
export const useTheme = (): Theme => useContext(ThemeContext).theme;
// The switcher needs the setter too:
export const useThemeControls = () => useContext(ThemeContext);
