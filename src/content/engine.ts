import type { Profile } from "@/shared/schema";
import type { Settings, StoredAnswer } from "@/shared/db";
import { questionKey } from "@/shared/db";
import { isSensitiveQuestion } from "@/shared/grounding";
import type { AskRequest, FieldReport, FillReport } from "@/shared/messages";
import { classify, type Classification } from "./classify";
import { scanFields, type Field } from "./fields";
import {
  applyCheck,
  applyFile,
  applyText,
  verify,
  type FileSource,
} from "./fill";
import { assignSections, resolveValue } from "./values";
import type { Root } from "./dom";

export interface EngineDeps {
  profile: Profile;
  settings: Settings;
  answers: StoredAnswer[];
  loadResume: () => Promise<FileSource | null>;
  ask: (req: AskRequest) => Promise<string | null>;
}

export interface RunOptions {
  overwrite?: boolean;
  touched?: WeakSet<Element>;
}

const filledIds = new WeakSet<Element>();

export function wasFilled(el: Element): boolean {
  return filledIds.has(el);
}

function optionLabels(f: Field): string[] {
  return f.options.map((o) => o.label).filter(Boolean);
}

function looksLikeQuestion(f: Field): boolean {
  const l = f.label.trim();
  return l.length >= 12 && (/\?|describe|explain|why|tell us|what|how|please/i.test(l) || f.kind === "textarea");
}

function memoryKey(f: Field): string {
  return questionKey(f.label || f.name, optionLabels(f));
}

async function fillOne(
  f: Field,
  c: Classification | null,
  idx: { employment: number; education: number },
  deps: EngineDeps,
  memory: Map<string, StoredAnswer>,
  resume: { value: FileSource | null | undefined },
): Promise<FieldReport> {
  const label = f.label || f.name || f.placeholder || f.kind;
  const rep = (status: FieldReport["status"], source: FieldReport["source"]): FieldReport => ({
    label,
    key: c?.key ?? null,
    status,
    source,
  });

  if (f.kind === "file") {
    if (!c) return rep("skipped", "none");
    const input = f.el as HTMLInputElement;
    if (input.files && input.files.length > 0) return rep("skipped", "none");
    if (resolveValue(c, f, deps.profile, idx)?.type !== "file") return rep("skipped", "none");
    if (c.key === "file.coverLetter") return rep("skipped", "none");
    if (resume.value === undefined) resume.value = await deps.loadResume();
    if (!resume.value) return rep("unresolved", "none");
    const out = await applyFile(f, resume.value);
    if (out !== "verified") return rep("nomatch", "profile");
    return rep((await verify(f, true)) ? "verified" : "unverified", "profile");
  }

  let candidates: string[] | null = null;
  let checkValue: boolean | null = null;
  let source: FieldReport["source"] = "none";

  const remembered = memory.get(memoryKey(f));
  if (remembered) {
    candidates = [remembered.answer];
    source = "memory";
  } else if (c) {
    const r = resolveValue(c, f, deps.profile, idx);
    if (r?.type === "text") {
      candidates = r.candidates;
      source = "profile";
    } else if (r?.type === "check") {
      checkValue = r.value;
      source = "profile";
    }
  }

  if (f.kind === "checkbox") {
    if (checkValue === null) return rep(c ? "unresolved" : "skipped", source);
    await applyCheck(f, checkValue);
    const ok = await verify(f, checkValue);
    return rep(ok ? "verified" : "unverified", source);
  }

  if (!candidates && !c && deps.settings.useModel && deps.settings.modelApproved) {
    const q = f.label.trim();
    const askable =
      q && looksLikeQuestion(f) && !isSensitiveQuestion(q);
    if (askable) {
      const kind = f.options.length || f.kind === "combobox" ? "choice" : f.kind === "textarea" ? "textarea" : "text";
      const options = optionLabels(f);
      if (kind !== "choice" || options.length) {
        const answer = await deps.ask({ question: q, options, kind });
        if (answer) {
          candidates = [answer];
          source = "model";
        }
      }
    }
  }

  if (!candidates) return rep(c ? "unresolved" : "skipped", source);

  let outcome = await applyText(f, candidates);
  if (outcome === "nomatch") return rep("nomatch", source);
  let ok = await verify(f, candidates);
  if (!ok) {
    outcome = await applyText(f, candidates);
    ok = outcome === "verified" && (await verify(f, candidates));
  }
  return rep(ok ? "verified" : "unverified", source);
}

export async function fillPage(
  root: Root,
  deps: EngineDeps,
  opts: RunOptions = {},
): Promise<FillReport> {
  const fields = scanFields(root);
  const items = fields.map((f) => ({ f, c: classify(f) }));
  const sections = assignSections(items);
  const memory = new Map(deps.answers.map((a) => [a.key, a]));
  const resume: { value: FileSource | null | undefined } = { value: undefined };
  const overwrite = opts.overwrite ?? deps.settings.overwrite;
  const reports: FieldReport[] = [];

  for (const { f, c } of items) {
    const label = f.label || f.name || f.placeholder || f.kind;
    const userTouched = opts.touched?.has(f.el) ?? false;
    if ((f.filled && !overwrite && f.kind !== "file") || userTouched) {
      reports.push({ label, key: c?.key ?? null, status: "skipped", source: "none" });
      continue;
    }
    const idx = sections.get(f.id) ?? { employment: 0, education: 0 };
    try {
      const r = await fillOne(f, c, idx, deps, memory, resume);
      if (r.status === "verified") for (const el of f.group) filledIds.add(el);
      reports.push(r);
    } catch {
      reports.push({ label, key: c?.key ?? null, status: "unverified", source: "none" });
    }
  }
  return { fields: reports, at: Date.now() };
}

export function summarize(report: FillReport) {
  const count = (s: FieldReport["status"]) => report.fields.filter((f) => f.status === s).length;
  return {
    verified: count("verified"),
    unverified: count("unverified"),
    unresolved: count("unresolved") + count("nomatch"),
    skipped: count("skipped"),
  };
}

export function looksLikeApplication(root: Root = document): boolean {
  const fields = scanFields(root);
  let hits = 0;
  for (const f of fields) {
    const c = classify(f);
    if (c && /^(personal|employment|education|file)\./.test(c.key)) hits++;
  }
  return hits >= 3;
}
