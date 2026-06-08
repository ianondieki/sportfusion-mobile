// Five world-class, intentional themes. Each is a complete, cohesive palette —
// not a hue swap. Shared spacing/radius/type; colour is the lever.

export type ThemeName = "carbon" | "monaco" | "apex" | "paddock" | "heritage";

const space = (n: number) => n * 4;
const radius = { sm: 8, md: 16, lg: 22, pill: 999 };
const font = {
  display: "SairaCondensed_800ExtraBold",
  displayBold: "SairaCondensed_700Bold",
  body: "Saira_400Regular",
  bodyMed: "Saira_600SemiBold",
};

export interface Theme {
  name: ThemeName;
  label: string;
  mode: "dark" | "light";
  statusBar: "light" | "dark";
  swatch: [string, string];
  color: {
    bg: string;
    bgTint: string;
    surface: string;
    surfaceAlt: string;
    borderSolid: string;
    text: string;
    textDim: string;
    textFaint: string;
    accent: string;
    onAccent: string;
    accentGlow: string;
    gold: string;
    live: string;
  };
  radius: typeof radius;
  space: typeof space;
  font: typeof font;
}

const base = { radius, space, font };

export const themes: Record<ThemeName, Theme> = {
  carbon: {
    name: "carbon",
    label: "Carbon",
    mode: "dark",
    statusBar: "light",
    swatch: ["#E10600", "#15151F"],
    color: {
      bg: "#08080C",
      bgTint: "#120A0E",
      surface: "#15151F",
      surfaceAlt: "#1D1D2A",
      borderSolid: "#262634",
      text: "#F5F5FA",
      textDim: "#8C8C9E",
      textFaint: "#55556A",
      accent: "#E10600",
      onAccent: "#FFFFFF",
      accentGlow: "rgba(225,6,0,0.35)",
      gold: "#E7C66B",
      live: "#22D366",
    },
    ...base,
  },
  monaco: {
    name: "monaco",
    label: "Monaco",
    mode: "dark",
    statusBar: "light",
    swatch: ["#D9B85C", "#0A1020"],
    color: {
      bg: "#0A1020",
      bgTint: "#0E1730",
      surface: "#131C33",
      surfaceAlt: "#1B2745",
      borderSolid: "#26345A",
      text: "#F2F4FA",
      textDim: "#8893AE",
      textFaint: "#4E5A78",
      accent: "#D9B85C",
      onAccent: "#0A1020",
      accentGlow: "rgba(217,184,92,0.30)",
      gold: "#F0D98A",
      live: "#3FD2A0",
    },
    ...base,
  },
  apex: {
    name: "apex",
    label: "Apex",
    mode: "dark",
    statusBar: "light",
    swatch: ["#C6FF00", "#000000"],
    color: {
      bg: "#000000",
      bgTint: "#0A0A00",
      surface: "#0E0E0E",
      surfaceAlt: "#171717",
      borderSolid: "#2A2A2A",
      text: "#FFFFFF",
      textDim: "#9A9A9A",
      textFaint: "#5A5A5A",
      accent: "#C6FF00",
      onAccent: "#000000",
      accentGlow: "rgba(198,255,0,0.25)",
      gold: "#C6FF00",
      live: "#00E5FF",
    },
    ...base,
  },
  paddock: {
    name: "paddock",
    label: "Paddock",
    mode: "light",
    statusBar: "dark",
    swatch: ["#C8102E", "#F4F1EA"],
    color: {
      bg: "#F4F1EA",
      bgTint: "#FBF8F1",
      surface: "#FFFFFF",
      surfaceAlt: "#ECE7DC",
      borderSolid: "#DCD5C7",
      text: "#1A1916",
      textDim: "#6B6457",
      textFaint: "#A39B8B",
      accent: "#C8102E",
      onAccent: "#FFFFFF",
      accentGlow: "rgba(200,16,46,0.16)",
      gold: "#B8860B",
      live: "#1B8A4B",
    },
    ...base,
  },
  heritage: {
    name: "heritage",
    label: "Heritage",
    mode: "dark",
    statusBar: "light",
    swatch: ["#2E7D52", "#1C1A14"],
    color: {
      bg: "#1C1A14",
      bgTint: "#211E16",
      surface: "#262219",
      surfaceAlt: "#322C20",
      borderSolid: "#3E3729",
      text: "#EFE7D2",
      textDim: "#B0A488",
      textFaint: "#6F6650",
      accent: "#2E7D52",
      onAccent: "#FFFFFF",
      accentGlow: "rgba(46,125,82,0.30)",
      gold: "#C8A24B",
      live: "#6FB98F",
    },
    ...base,
  },
};

export const DEFAULT_THEME: ThemeName = "carbon";
export const THEME_LIST: Theme[] = Object.values(themes);
