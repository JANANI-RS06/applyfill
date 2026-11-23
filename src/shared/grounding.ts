import type { Profile } from "./schema";

const SENSITIVE =
  /convict|criminal|felony|background check|drug|disabilit|veteran|ethnic|\brace\b|gender|sexual|religio|pregnan|marital|citizenship status|date of birth|birth date|social security|\bssn\b/i;

export function isSensitiveQuestion(q: string): boolean {
  return SENSITIVE.test(q);
}

export function profileText(profile: Profile): string {
  const parts: string[] = [];
  const walk = (v: unknown) => {
    if (typeof v === "string") parts.push(v);
    else if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === "object") {
      for (const [k, val] of Object.entries(v)) if (k !== "id") walk(val);
    }
  };
  walk(profile);
  return parts.join(" \n ");
}

const STOP = new Set([
  "i", "i'm", "i've", "i'd", "my", "the", "a", "an", "and", "or", "but", "in", "on", "at", "to",
  "with", "for", "of", "as", "is", "am", "are", "was", "were", "have", "has", "had", "this", "that",
  "it", "we", "our", "your", "you", "yes", "no", "thank", "thanks", "dear", "hello", "hi",
  "experience", "skills", "years", "year", "currently", "also", "from", "by",
]);

function properNouns(text: string): string[] {
  const out: string[] = [];
  const sentences = text.split(/(?<=[.!?])\s+|\n+/);
  for (const s of sentences) {
    const words = s.split(/\s+/).filter(Boolean);
    words.forEach((w, i) => {
      const bare = w.replace(/^[^A-Za-z0-9]+|[^A-Za-z0-9+#]+$/g, "");
      if (!bare || i === 0) return;
      if (/^[A-Z][A-Za-z0-9+#.]*$/.test(bare) && !STOP.has(bare.toLowerCase())) out.push(bare);
    });
  }
  return out;
}

export function isGrounded(answer: string, profile: Profile, question = ""): boolean {
  const source = (profileText(profile) + " " + question).toLowerCase();
  const nums = answer.match(/\d[\d,.]*/g) ?? [];
  for (const n of nums) {
    const trimmed = n.replace(/[,.]+$/, "");
    if (!source.includes(trimmed.toLowerCase())) return false;
  }
  for (const noun of properNouns(answer)) {
    if (!source.includes(noun.toLowerCase())) return false;
  }
  return true;
}

export function profileDigest(profile: Profile): string {
  const p = profile.personal;
  const lines: string[] = [];
  const name = [p.firstName, p.lastName].filter(Boolean).join(" ");
  if (name) lines.push(`Name: ${name}`);
  const loc = [p.city, p.state, p.country].filter(Boolean).join(", ");
  if (loc) lines.push(`Location: ${loc}`);
  if (profile.summary) lines.push(`Summary: ${profile.summary}`);
  for (const j of profile.employment) {
    const when = [j.startDate, j.current ? "present" : j.endDate].filter(Boolean).join(" to ");
    lines.push(`Job: ${j.title} at ${j.company}${when ? ` (${when})` : ""}${j.description ? `. ${j.description}` : ""}`);
  }
  for (const e of profile.education) {
    lines.push(`Education: ${[e.degree, e.field].filter(Boolean).join(" in ")} at ${e.school}${e.endDate ? ` (${e.endDate})` : ""}`);
  }
  if (profile.skills.length) lines.push(`Skills: ${profile.skills.join(", ")}`);
  if (profile.languages.length) lines.push(`Languages: ${profile.languages.join(", ")}`);
  if (profile.certifications.length) lines.push(`Certifications: ${profile.certifications.join(", ")}`);
  return lines.join("\n");
}
