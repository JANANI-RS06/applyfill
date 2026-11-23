import { aiAnswerSchema, type AiAnswer, type Profile } from "./schema";
import type { AskRequest } from "./messages";
import { isGrounded, isSensitiveQuestion, profileDigest } from "./grounding";
import { matchOptionLabels } from "./options";

export const SYSTEM_PROMPT = [
  "You complete job application questions for a candidate using only the profile provided.",
  "Never invent employers, titles, dates, degrees, skills, numbers, or personal details.",
  "If the profile does not contain what is needed, answer with an empty string and set confident to false.",
  "For multiple choice questions, answer with exactly one of the given options.",
  "For free text, write in first person, plain language, under 120 words.",
  'Reply with JSON only: {"answer": string, "confident": boolean, "source": "profile" | "unknown"}.',
].join(" ");

export function buildMessages(profile: Profile, req: AskRequest) {
  const options = req.options.length ? `\nOptions: ${req.options.map((o) => `"${o}"`).join(", ")}` : "";
  return [
    { role: "system" as const, content: SYSTEM_PROMPT },
    {
      role: "user" as const,
      content: `Profile:\n${profileDigest(profile)}\n\nQuestion: ${req.question}${options}`,
    },
  ];
}

export function extractJson(raw: string): unknown {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(raw.slice(start, end + 1));
  } catch {
    return null;
  }
}

export function validateAnswer(raw: string, profile: Profile, req: AskRequest): AiAnswer | null {
  const json = extractJson(raw);
  const parsed = aiAnswerSchema.safeParse(json);
  if (!parsed.success) return null;
  const a = parsed.data;
  if (!a.confident || a.source !== "profile" || !a.answer.trim()) return null;
  if (isSensitiveQuestion(req.question)) return null;
  if (req.options.length) {
    const hit = matchOptionLabels(req.options, a.answer);
    return hit ? { ...a, answer: hit } : null;
  }
  if (!isGrounded(a.answer, profile, req.question)) return null;
  return { ...a, answer: a.answer.trim() };
}
