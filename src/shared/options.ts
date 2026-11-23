export function matchOptionLabels(options: string[], answer: string): string | null {
  const a = answer.trim().toLowerCase();
  const exact = options.find((o) => o.trim().toLowerCase() === a);
  return exact ?? null;
}
