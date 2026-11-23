import type { FieldOption } from "./fields";

export const norm = (s: string): string =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/['’.]/g, "")
    .replace(/[^a-z0-9+]+/g, " ")
    .trim();

const GROUPS: string[][] = [
  ["united states", "united states of america", "usa", "us", "u s", "u s a", "america"],
  ["united kingdom", "uk", "u k", "great britain", "gb", "england"],
  ["yes", "y", "true"],
  ["no", "n", "false"],
  ["male", "man"],
  ["female", "woman"],
  ["non binary", "nonbinary", "non-binary", "genderqueer"],
  ["full time", "fulltime", "full-time", "permanent"],
  ["part time", "parttime", "part-time"],
  ["intern", "internship"],
  ["contract", "contractor", "contractual"],
  ["decline", "prefer not to say", "prefer not to answer", "i dont wish to answer", "decline to self identify", "choose not to disclose"],
];

const synonymMap = new Map<string, Set<string>>();
for (const g of GROUPS) {
  const set = new Set(g.map(norm));
  for (const t of set) synonymMap.set(t, set);
}

export const STATES: Record<string, string> = {
  al: "alabama", ak: "alaska", az: "arizona", ar: "arkansas", ca: "california", co: "colorado",
  ct: "connecticut", de: "delaware", dc: "district of columbia", fl: "florida", ga: "georgia",
  hi: "hawaii", id: "idaho", il: "illinois", in: "indiana", ia: "iowa", ks: "kansas",
  ky: "kentucky", la: "louisiana", me: "maine", md: "maryland", ma: "massachusetts",
  mi: "michigan", mn: "minnesota", ms: "mississippi", mo: "missouri", mt: "montana",
  ne: "nebraska", nv: "nevada", nh: "new hampshire", nj: "new jersey", nm: "new mexico",
  ny: "new york", nc: "north carolina", nd: "north dakota", oh: "ohio", ok: "oklahoma",
  or: "oregon", pa: "pennsylvania", ri: "rhode island", sc: "south carolina", sd: "south dakota",
  tn: "tennessee", tx: "texas", ut: "utah", vt: "vermont", va: "virginia", wa: "washington",
  wv: "west virginia", wi: "wisconsin", wy: "wyoming",
};

export function stateVariants(value: string): string[] {
  const n = norm(value);
  if (STATES[n]) return [value, STATES[n]!];
  const abbr = Object.entries(STATES).find(([, full]) => full === n)?.[0];
  return abbr ? [value, abbr.toUpperCase()] : [value];
}

export function degreeVariants(value: string): string[] {
  const n = norm(value);
  const out = [value];
  if (/\b(bachelor|bs|bsc|ba|undergraduate|btech|be)\b/.test(n)) out.push("Bachelor's Degree", "Bachelors", "Bachelor");
  else if (/\b(master|ms|msc|ma|mba|mtech|me)\b/.test(n)) out.push("Master's Degree", "Masters", "Master");
  else if (/\b(phd|doctor|doctorate|dphil)\b/.test(n)) out.push("Doctorate", "PhD", "Doctoral");
  else if (/\b(associate|aa|as)\b/.test(n)) out.push("Associate's Degree", "Associate");
  else if (/\b(high school|ged|secondary)\b/.test(n)) out.push("High School", "GED");
  return out;
}

export const MONTHS = [
  "january", "february", "march", "april", "may", "june",
  "july", "august", "september", "october", "november", "december",
];

const sameConcept = (a: string, b: string): boolean => {
  if (a === b) return true;
  const set = synonymMap.get(a);
  return !!set && set.has(b);
};

function tokens(s: string): string[] {
  return norm(s).split(" ").filter((t) => t.length > 1);
}

function overlap(a: string, b: string): number {
  const ta = tokens(a);
  const tb = new Set(tokens(b));
  if (!ta.length || !tb.size) return 0;
  const hit = ta.filter((t) => tb.has(t)).length;
  return hit / Math.max(ta.length, tb.size);
}

const PLACEHOLDER = /^(select|choose|please|pick|--|none|\s*$)/i;

export function matchOption(
  options: FieldOption[],
  candidates: string[],
): FieldOption | null {
  const usable = options.filter((o) => !PLACEHOLDER.test(o.label.trim()) || o.label.trim() === "");
  const real = usable.filter((o) => o.label.trim() !== "" || o.value.trim() !== "");
  const wants = candidates.map(norm).filter(Boolean);
  if (!wants.length) return null;

  for (const want of wants) {
    for (const o of real) {
      const l = norm(o.label);
      const v = norm(o.value);
      if (l === want || v === want) return o;
    }
  }
  for (const want of wants) {
    for (const o of real) {
      const l = norm(o.label);
      if (sameConcept(l, want)) return o;
    }
  }
  for (const want of wants) {
    const yesNo = want === "yes" || want === "no";
    for (const o of real) {
      const l = norm(o.label);
      if (yesNo) {
        const first = l.split(" ")[0] ?? "";
        if (first === want) return o;
        continue;
      }
      if (want.length >= 3 && (l.startsWith(want + " ") || l.endsWith(" " + want))) return o;
    }
  }
  for (const want of wants) {
    if (want === "yes" || want === "no" || want.length < 4) continue;
    for (const o of real) {
      const l = norm(o.label);
      if (l.includes(want) || (l.length >= 4 && want.includes(l))) return o;
    }
  }
  let best: { o: FieldOption; s: number } | null = null;
  for (const want of wants) {
    if (want === "yes" || want === "no") continue;
    for (const o of real) {
      const s = overlap(want, o.label);
      if (s >= 0.6 && (!best || s > best.s)) best = { o, s };
    }
  }
  return best ? best.o : null;
}
