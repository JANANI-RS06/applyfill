export function normalizeText(s: string): string {
  return s
    .toLowerCase()
    .replace(/[*:()?•]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function questionKey(question: string, options: string[] = []): string {
  const q = normalizeText(question);
  const o = options.map(normalizeText).filter(Boolean).sort().join("|");
  return o ? `${q}::${o}` : q;
}
