// Tracks which matches the user has set a kickoff reminder for. Persists to
// AsyncStorage so reminders survive restarts, and pairs each match with the
// scheduled notification id so it can be cancelled. Past matches are pruned on
// load to keep the list tidy.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  scheduleKickoffReminder,
  cancelReminder,
  notificationsAvailable,
} from "./notifications";

const KEY = "sportsfusion.matchReminders";

export interface Reminder {
  matchId: string;
  notificationId: string;
  title: string;
  competition?: string;
  kickoffISO: string;
}

interface Value {
  reminders: Record<string, Reminder>;
  available: boolean;
  hasReminder: (matchId: string | number) => boolean;
  // returns "added" | "removed" | "unavailable" | "denied" | "past"
  toggleReminder: (input: {
    matchId: string | number;
    title: string;
    competition?: string;
    kickoffISO: string;
  }) => Promise<"added" | "removed" | "unavailable" | "denied" | "past">;
}

const MatchRemindersContext = createContext<Value>({
  reminders: {},
  available: false,
  hasReminder: () => false,
  toggleReminder: async () => "unavailable",
});

export function MatchRemindersProvider({ children }: { children: ReactNode }) {
  const [reminders, setReminders] = useState<Record<string, Reminder>>({});
  const available = notificationsAvailable();

  // load + prune past matches
  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((raw) => {
        if (!raw) return;
        const parsed: Record<string, Reminder> = JSON.parse(raw);
        const now = Date.now();
        const fresh: Record<string, Reminder> = {};
        for (const [id, r] of Object.entries(parsed)) {
          if (new Date(r.kickoffISO).getTime() > now) fresh[id] = r;
        }
        setReminders(fresh);
        if (Object.keys(fresh).length !== Object.keys(parsed).length) {
          AsyncStorage.setItem(KEY, JSON.stringify(fresh)).catch(() => {});
        }
      })
      .catch(() => {});
  }, []);

  const persist = useCallback((next: Record<string, Reminder>) => {
    setReminders(next);
    AsyncStorage.setItem(KEY, JSON.stringify(next)).catch(() => {});
  }, []);

  const hasReminder = useCallback(
    (matchId: string | number) => !!reminders[String(matchId)],
    [reminders]
  );

  const toggleReminder = useCallback<Value["toggleReminder"]>(
    async (input) => {
      const id = String(input.matchId);
      if (!available) return "unavailable";

      // turning OFF
      const existing = reminders[id];
      if (existing) {
        await cancelReminder(existing.notificationId);
        const { [id]: _, ...rest } = reminders;
        persist(rest);
        return "removed";
      }

      // turning ON
      if (new Date(input.kickoffISO).getTime() <= Date.now()) return "past";
      const notificationId = await scheduleKickoffReminder({
        title: input.title,
        competition: input.competition,
        kickoffISO: input.kickoffISO,
      });
      if (!notificationId) return "denied";

      persist({
        ...reminders,
        [id]: {
          matchId: id,
          notificationId,
          title: input.title,
          competition: input.competition,
          kickoffISO: input.kickoffISO,
        },
      });
      return "added";
    },
    [available, reminders, persist]
  );

  return (
    <MatchRemindersContext.Provider
      value={{ reminders, available, hasReminder, toggleReminder }}
    >
      {children}
    </MatchRemindersContext.Provider>
  );
}

export const useMatchReminders = () => useContext(MatchRemindersContext);
