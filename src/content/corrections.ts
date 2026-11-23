import type { Profile } from "@/shared/schema";
import { isSensitiveQuestion } from "@/shared/grounding";
import type { Classification } from "./classify";
import type { Field } from "./fields";
import { resolveValue } from "./values";
import { norm } from "./match";

export function shouldRemember(
  field: Field,
  c: Classification | null,
  value: string,
  profile: Profile,
): boolean {
  const label = (field.label || "").trim();
  if (!label || !value.trim()) return false;
  if (field.kind === "file" || field.kind === "checkbox") return false;
  if (isSensitiveQuestion(label)) return false;
  if (!c) return true;
  const group = c.key.split(".")[0];
  if (group === "employment" || group === "education" || group === "file") return false;
  const r = resolveValue(c, field, profile, { employment: 0, education: 0 });
  if (!r || r.type !== "text") return true;
  const mine = norm(value);
  return !r.candidates.some((cand) => norm(cand) === mine);
}

export function displayValue(field: Field, el: HTMLElement): string {
  if (field.kind === "select") {
    return (el as HTMLSelectElement).selectedOptions[0]?.textContent?.trim() ?? "";
  }
  if (field.kind === "radio") {
    const r = el as HTMLInputElement;
    if (!r.checked) return "";
    return field.options.find((o) => o.el === r)?.label ?? r.value;
  }
  return (el as HTMLInputElement).value ?? "";
}
