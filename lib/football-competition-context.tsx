import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { COMPETITIONS, DEFAULT_COMPETITION } from "./competitions";

const STORAGE_KEY = "sportsfusion.competition";

interface Ctx {
  competition: string; // code, e.g. "PL"
  setCompetition: (code: string) => void;
}

const CompetitionContext = createContext<Ctx>({
  competition: DEFAULT_COMPETITION,
  setCompetition: () => {},
});

export function CompetitionProvider({ children }: { children: ReactNode }) {
  const [competition, setState] = useState<string>(DEFAULT_COMPETITION);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((v) => {
        if (v && COMPETITIONS.some((c) => c.code === v)) setState(v);
      })
      .catch(() => {});
  }, []);

  const setCompetition = useCallback((code: string) => {
    setState(code);
    AsyncStorage.setItem(STORAGE_KEY, code).catch(() => {});
  }, []);

  return (
    <CompetitionContext.Provider value={{ competition, setCompetition }}>
      {children}
    </CompetitionContext.Provider>
  );
}

export const useCompetition = () => useContext(CompetitionContext);
