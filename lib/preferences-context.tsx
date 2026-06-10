import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type FontChoice = "default" | "system" | "serif" | "mono";
export type FontSize = "s" | "m" | "l" | "xl";

const FONT_KEY = "sportsfusion.fontChoice";
const SIZE_KEY = "sportsfusion.fontSize";

export const FONT_SCALE: Record<FontSize, number> = {
  s: 0.9,
  m: 1,
  l: 1.12,
  xl: 1.25,
};

// Maps a font choice to a platform-appropriate family. "default" keeps the
// app's Saira tokens (handled by the caller passing the base font set).
export function resolveFonts<T extends Record<string, string>>(
  choice: FontChoice,
  base: T
): T {
  if (choice === "default") return base;
  const fam =
    choice === "serif"
      ? Platform.select({ ios: "Georgia", android: "serif", default: "serif" })
      : choice === "mono"
      ? Platform.select({ ios: "Courier New", android: "monospace", default: "monospace" })
      : Platform.select({ ios: "System", android: "sans-serif", default: "System" });
  const out: Record<string, string> = {};
  for (const k of Object.keys(base)) out[k] = fam as string;
  return out as T;
}

interface PrefsValue {
  fontChoice: FontChoice;
  fontSize: FontSize;
  setFontChoice: (c: FontChoice) => void;
  setFontSize: (s: FontSize) => void;
}

const PreferencesContext = createContext<PrefsValue>({
  fontChoice: "default",
  fontSize: "m",
  setFontChoice: () => {},
  setFontSize: () => {},
});

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [fontChoice, setFC] = useState<FontChoice>("default");
  const [fontSize, setFS] = useState<FontSize>("m");

  useEffect(() => {
    AsyncStorage.multiGet([FONT_KEY, SIZE_KEY])
      .then((pairs) => {
        const map = Object.fromEntries(pairs);
        const fc = map[FONT_KEY];
        const fs = map[SIZE_KEY];
        if (fc === "default" || fc === "system" || fc === "serif" || fc === "mono")
          setFC(fc);
        if (fs === "s" || fs === "m" || fs === "l" || fs === "xl") setFS(fs);
      })
      .catch(() => {});
  }, []);

  const setFontChoice = useCallback((c: FontChoice) => {
    setFC(c);
    AsyncStorage.setItem(FONT_KEY, c).catch(() => {});
  }, []);

  const setFontSize = useCallback((s: FontSize) => {
    setFS(s);
    AsyncStorage.setItem(SIZE_KEY, s).catch(() => {});
  }, []);

  return (
    <PreferencesContext.Provider
      value={{ fontChoice, fontSize, setFontChoice, setFontSize }}
    >
      {children}
    </PreferencesContext.Provider>
  );
}

export const usePreferences = () => useContext(PreferencesContext);
