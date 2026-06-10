// Voice layer for the APEX chat tab.
//
// Two halves, different availability:
//   • Text-to-speech — expo-speech, works everywhere including Expo Go.
//   • Speech-to-text — expo-speech-recognition, a native module that needs a
//     dev/EAS build (it is NOT inside Expo Go). We load it lazily and degrade
//     gracefully: in Expo Go the mic button explains how to enable it instead
//     of crashing at import time.

import * as Speech from "expo-speech";

// ---------------------------------------------------------------------------
// Text-to-speech
// ---------------------------------------------------------------------------

// Strip emoji/markdown noise so APEX doesn't read "asterisk asterisk" aloud.
let emojiRe: RegExp | null = null;
try {
  emojiRe = new RegExp("\\p{Extended_Pictographic}", "gu");
} catch {
  emojiRe = null; // engine without Unicode property escapes — emojis get read, fine
}

function speakable(text: string): string {
  let out = text.replace(/[*_`#>]/g, "");
  if (emojiRe) out = out.replace(emojiRe, "");
  return out.replace(/\s+/g, " ").trim();
}

export function speak(text: string, onDone?: () => void) {
  const clean = speakable(text);
  if (!clean) {
    onDone?.();
    return;
  }
  Speech.stop();
  Speech.speak(clean, {
    language: "en",
    rate: 1.0,
    pitch: 1.0,
    onDone,
    onStopped: onDone,
    onError: onDone,
  });
}

export function stopSpeaking() {
  Speech.stop();
}

// ---------------------------------------------------------------------------
// Speech-to-text (native module — guarded)
// ---------------------------------------------------------------------------

type RecognitionModule = {
  requestPermissionsAsync: () => Promise<{ granted: boolean }>;
  start: (options: Record<string, unknown>) => void;
  stop: () => void;
  abort: () => void;
  addListener: (event: string, handler: (e: any) => void) => { remove: () => void };
};

let recognition: RecognitionModule | null | undefined;

function getRecognition(): RecognitionModule | null {
  if (recognition !== undefined) return recognition;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require("expo-speech-recognition");
    recognition = (mod.ExpoSpeechRecognitionModule as RecognitionModule) ?? null;
  } catch {
    recognition = null; // Expo Go / module not in this build
  }
  return recognition;
}

export function speechRecognitionAvailable(): boolean {
  return getRecognition() != null;
}

export interface ListenCallbacks {
  // Fires with the running transcript; isFinal=true on the last result.
  onResult: (transcript: string, isFinal: boolean) => void;
  onEnd: () => void;
  onError: (message: string) => void;
}

// Starts a one-shot dictation session. Returns a stop function, or null if
// recognition isn't available in this build or the mic permission was denied.
export async function startListening(
  cb: ListenCallbacks
): Promise<(() => void) | null> {
  const rec = getRecognition();
  if (!rec) return null;

  const perm = await rec.requestPermissionsAsync();
  if (!perm.granted) {
    cb.onError("Microphone permission denied.");
    return null;
  }

  const subs = [
    rec.addListener("result", (e: any) => {
      const transcript = e?.results?.[0]?.transcript ?? "";
      cb.onResult(transcript, !!e?.isFinal);
    }),
    rec.addListener("error", (e: any) => {
      cb.onError(e?.message ?? "Speech recognition error.");
    }),
    rec.addListener("end", () => {
      subs.forEach((s) => s.remove());
      cb.onEnd();
    }),
  ];

  rec.start({
    lang: "en-US",
    interimResults: true,
    continuous: false,
  });

  return () => rec.stop();
}
