import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type Sport = "f1" | "football";
const STORAGE_KEY = "sportsfusion.sport";

interface SportContextValue {
  sport: Sport;
  setSport: (s: Sport) => void;
}

const SportContext = createContext<SportContextValue>({
  sport: "f1",
  setSport: () => {},
});

export function SportProvider({ children }: { children: ReactNode }) {
  const [sport, setSportState] = useState<Sport>("f1");

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((v) => {
        if (v === "f1" || v === "football") setSportState(v);
      })
      .catch(() => {});
  }, []);

  const setSport = useCallback((s: Sport) => {
    setSportState(s);
    AsyncStorage.setItem(STORAGE_KEY, s).catch(() => {});
  }, []);

  return (
    <SportContext.Provider value={{ sport, setSport }}>
      {children}
    </SportContext.Provider>
  );
}

export const useSport = () => useContext(SportContext);
