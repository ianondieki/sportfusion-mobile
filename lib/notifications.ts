// Local match reminders — fully serverless. We schedule an on-device
// notification a few minutes before kickoff, so no backend or push token is
// needed. (Remote push would need a server; that's a future step.)
//
// The native module is guarded the same way as voice.ts: in Expo Go on
// Android, scheduled local notifications are limited/removed, so we probe with
// requireOptionalNativeModule and degrade gracefully instead of crashing.

import { Platform } from "react-native";
import { requireOptionalNativeModule } from "expo-modules-core";

const LEAD_MS = 15 * 60 * 1000; // notify 15 min before kickoff

type NotificationsModule = typeof import("expo-notifications");

let mod: NotificationsModule | null | undefined;

function getModule(): NotificationsModule | null {
  if (mod !== undefined) return mod;
  if (!requireOptionalNativeModule("ExpoNotifications")) {
    mod = null;
    return mod;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    mod = require("expo-notifications") as NotificationsModule;
  } catch {
    mod = null;
  }
  return mod;
}

export function notificationsAvailable(): boolean {
  return getModule() != null;
}

let configured = false;

// Call once at app start: foreground display behavior + Android channel.
export async function configureNotifications() {
  const m = getModule();
  if (!m || configured) return;
  configured = true;

  m.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });

  if (Platform.OS === "android") {
    await m
      .setNotificationChannelAsync("match-reminders", {
        name: "Match reminders",
        importance: m.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
      })
      .catch(() => {});
  }
}

export async function ensurePermission(): Promise<boolean> {
  const m = getModule();
  if (!m) return false;
  const current = await m.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;
  const req = await m.requestPermissionsAsync();
  return req.granted;
}

// Schedules a reminder for a match. Returns the notification id, or null if
// notifications aren't available, permission was denied, or kickoff has passed.
export async function scheduleKickoffReminder(input: {
  title: string; // e.g. "Mexico vs South Africa"
  competition?: string;
  kickoffISO: string;
}): Promise<string | null> {
  const m = getModule();
  if (!m) return null;
  if (!(await ensurePermission())) return null;

  const kickoff = new Date(input.kickoffISO).getTime();
  if (Number.isNaN(kickoff)) return null;

  // fire 15 min before, but never in the past — if kickoff is sooner, fire now+5s
  const fireAt = Math.max(kickoff - LEAD_MS, Date.now() + 5000);
  if (kickoff <= Date.now()) return null; // already started

  const minsToKickoff = Math.round((kickoff - fireAt) / 60000);
  const body =
    minsToKickoff >= 1
      ? `Kicks off in ${minsToKickoff} min${input.competition ? ` · ${input.competition}` : ""}`
      : `Kicking off now${input.competition ? ` · ${input.competition}` : ""}`;

  return m.scheduleNotificationAsync({
    content: {
      title: `⚡ ${input.title}`,
      body,
      ...(Platform.OS === "android" ? { channelId: "match-reminders" } : null),
    },
    trigger: {
      type: m.SchedulableTriggerInputTypes.DATE,
      date: new Date(fireAt),
    },
  });
}

export async function cancelReminder(notificationId: string) {
  const m = getModule();
  if (!m) return;
  await m.cancelScheduledNotificationAsync(notificationId).catch(() => {});
}
