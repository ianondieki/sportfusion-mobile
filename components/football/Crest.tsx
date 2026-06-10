import { useMemo, useState } from "react";
import { View, Text, Image, StyleSheet } from "react-native";
import { useTheme } from "../../lib/theme-context";
import type { Theme } from "../../lib/themes";

// Crest priority:
//   1) National team  -> flag emoji (built from an ISO code; renders natively)
//   2) Club           -> PNG crest image
//   3) Anything else  -> initials monogram
// Clubs never match the country map, so club badges are unaffected.

export default function Crest({
  uri,
  name,
  size = 26,
}: {
  uri: string | null;
  name: string;
  size?: number;
}) {
  const t = useTheme();
  const styles = useMemo(() => makeStyles(t), [t]);
  const [failed, setFailed] = useState(false);

  const iso = NAME_TO_ISO[normalize(name)];

  // 1) country -> flag emoji
  if (iso) {
    return (
      <View style={[styles.box, { width: size, height: size }]}>
        <Text style={{ fontSize: size * 0.92, lineHeight: size * 1.05 }}>
          {flagEmoji(iso)}
        </Text>
      </View>
    );
  }

  // 2) club -> PNG crest (SVG/other formats fall through to monogram)
  const isPng = !!uri && /\.png(\?|$)/i.test(uri);
  if (uri && isPng && !failed) {
    return (
      <Image
        source={{ uri }}
        style={{ width: size, height: size }}
        resizeMode="contain"
        onError={() => setFailed(true)}
      />
    );
  }

  // 3) fallback monogram
  return (
    <View
      style={[
        styles.monogram,
        { width: size, height: size, borderRadius: size / 2 },
      ]}
    >
      <Text style={styles.monoText}>{initials(name)}</Text>
    </View>
  );
}

function initials(name: string): string {
  const parts = name.split(" ").filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// Build a flag emoji from an ISO 3166-1 alpha-2 code (e.g. "BR" -> regional
// indicators that most platforms render as the Brazil flag).
function flagEmoji(iso2: string): string {
  return iso2
    .toUpperCase()
    .replace(/./g, (c) => String.fromCodePoint(127397 + c.charCodeAt(0)));
}

// Normalize a team name to a lookup key: lowercase, strip accents/punctuation.
function normalize(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z ]/g, "")
    .trim();
}

// Country name (and common aliases football-data uses) -> ISO2.
// Unlisted names simply fall through to the image/monogram path.
const NAME_TO_ISO: Record<string, string> = {
  argentina: "AR", brazil: "BR", uruguay: "UY", paraguay: "PY", chile: "CL",
  colombia: "CO", ecuador: "EC", peru: "PE", venezuela: "VE", bolivia: "BO",
  england: "GB", france: "FR", germany: "DE", spain: "ES", italy: "IT",
  portugal: "PT", netherlands: "NL", belgium: "BE", croatia: "HR", denmark: "DK",
  switzerland: "CH", austria: "AT", poland: "PL", sweden: "SE", norway: "NO",
  serbia: "RS", scotland: "GB", wales: "GB", ukraine: "UA", turkey: "TR",
  turkiye: "TR", "czech republic": "CZ", czechia: "CZ", greece: "GR",
  hungary: "HU", romania: "RO", slovenia: "SI", slovakia: "SK", ireland: "IE",
  "republic of ireland": "IE", "northern ireland": "GB", iceland: "IS",
  finland: "FI", "bosnia and herzegovina": "BA", bosnia: "BA",
  "north macedonia": "MK", albania: "AL", russia: "RU", "united states": "US",
  usa: "US", "united states of america": "US", mexico: "MX", canada: "CA",
  "costa rica": "CR", panama: "PA", honduras: "HN", jamaica: "JM",
  "trinidad and tobago": "TT", curacao: "CW", "el salvador": "SV", haiti: "HT",
  guatemala: "GT", japan: "JP", "korea republic": "KR", "south korea": "KR",
  korea: "KR", "korea dpr": "KP", "north korea": "KP", iran: "IR",
  "ir iran": "IR", "saudi arabia": "SA", australia: "AU", qatar: "QA",
  iraq: "IQ", "united arab emirates": "AE", uae: "AE", uzbekistan: "UZ",
  jordan: "JO", china: "CN", "china pr": "CN", india: "IN", thailand: "TH",
  vietnam: "VN", indonesia: "ID", "new zealand": "NZ", morocco: "MA",
  senegal: "SN", tunisia: "TN", algeria: "DZ", egypt: "EG", nigeria: "NG",
  ghana: "GH", cameroon: "CM", "cote divoire": "CI", "ivory coast": "CI",
  "south africa": "ZA", mali: "ML", "burkina faso": "BF", "cape verde": "CV",
  "cabo verde": "CV", "dr congo": "CD", "congo dr": "CD", angola: "AO",
  "equatorial guinea": "GQ", gabon: "GA", guinea: "GN", zambia: "ZM",
};

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    box: { alignItems: "center", justifyContent: "center" },
    monogram: {
      backgroundColor: t.color.surfaceAlt,
      alignItems: "center",
      justifyContent: "center",
    },
    monoText: { color: t.color.text, fontFamily: t.font.bodyMed, fontSize: 10 },
  });
