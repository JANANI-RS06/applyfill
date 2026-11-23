import { byIdIn, nextFrame, queryAllDeep, isVisible, sleep, waitFor } from "./dom";
import type { Field, FieldOption } from "./fields";
import { matchOption, norm } from "./match";

export type FillOutcome = "verified" | "failed" | "nomatch";

export interface FileSource {
  name: string;
  type: string;
  data: ArrayBuffer;
}

function fire(el: Element, type: string, init: EventInit = {}) {
  el.dispatchEvent(new Event(type, { bubbles: true, cancelable: true, ...init }));
}

function fireInput(el: HTMLElement, data: string) {
  el.dispatchEvent(
    new InputEvent("input", { bubbles: true, cancelable: true, data, inputType: "insertText" }),
  );
}

export function setNativeValue(el: HTMLInputElement | HTMLTextAreaElement, value: string) {
  const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(proto, "value")?.set;
  if (setter) setter.call(el, value);
  else el.value = value;
}

export async function typeInto(el: HTMLInputElement | HTMLTextAreaElement, value: string) {
  el.focus();
  fire(el, "focus", { bubbles: false });
  fire(el, "focusin");
  setNativeValue(el, "");
  fireInput(el, "");
  setNativeValue(el, value);
  fireInput(el, value);
  fire(el, "change");
  await nextFrame();
  fire(el, "blur", { bubbles: false });
  fire(el, "focusout");
}

function clickLike(el: HTMLElement) {
  const opts = { bubbles: true, cancelable: true };
  const Ptr = typeof PointerEvent === "function" ? PointerEvent : MouseEvent;
  el.dispatchEvent(new Ptr("pointerdown", opts));
  el.dispatchEvent(new MouseEvent("mousedown", opts));
  el.dispatchEvent(new Ptr("pointerup", opts));
  el.dispatchEvent(new MouseEvent("mouseup", opts));
  el.dispatchEvent(new MouseEvent("click", opts));
}

function visibleOptions(field: Field): HTMLElement[] {
  const root = field.el.getRootNode() as Document | ShadowRoot;
  const ref = field.el.getAttribute("aria-controls") || field.el.getAttribute("aria-owns");
  if (ref) {
    const lb = byIdIn(field.el, ref);
    if (lb) {
      const own = queryAllDeep<HTMLElement>(lb as unknown as Document, "[role=option]");
      if (own.length) return own.filter(isVisible);
    }
  }
  const local = queryAllDeep<HTMLElement>(root, "[role=option]").filter(isVisible);
  if (local.length) return local;
  return queryAllDeep<HTMLElement>(field.el.ownerDocument, "[role=option]").filter(isVisible);
}

const toOptions = (els: HTMLElement[]): FieldOption[] =>
  els.map((el) => ({ label: (el.textContent ?? "").replace(/\s+/g, " ").trim(), value: el.getAttribute("data-value") ?? "", el }));

function openCombo(field: Field) {
  field.el.focus();
  clickLike(field.el);
  if (field.el instanceof HTMLInputElement) fire(field.el, "focus", { bubbles: false });
  field.el.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }));
}

async function fillCombo(field: Field, candidates: string[]): Promise<FillOutcome> {
  const input = field.el instanceof HTMLInputElement ? field.el : null;
  openCombo(field);
  let opts = await waitFor(() => {
    const o = visibleOptions(field);
    return o.length ? o : null;
  }, 700);

  let match = opts ? matchOption(toOptions(opts), candidates) : null;

  if (!match && input) {
    for (const c of candidates.slice(0, 3)) {
      await typeInto(input, c);
      opts = await waitFor(() => {
        const o = visibleOptions(field);
        return o.length ? o : null;
      }, 900);
      if (opts) match = matchOption(toOptions(opts), [c, ...candidates]);
      if (match) break;
    }
  }

  if (!match) {
    if (input) {
      await typeInto(input, "");
    }
    field.el.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    return "nomatch";
  }
  clickLike(match.el);
  await sleep(60);
  return "verified";
}

function readCombo(field: Field): string {
  const el = field.el;
  if (el instanceof HTMLInputElement && el.value) return el.value;
  const container = el.closest("[class*=select i],[class*=dropdown i],[class*=combobox i]") ?? el.parentElement ?? el;
  return (container.textContent ?? "").replace(/\s+/g, " ").trim();
}

function fillSelect(field: Field, candidates: string[]): FillOutcome {
  const sel = field.el as HTMLSelectElement;
  const match = matchOption(field.options, candidates);
  if (!match) return "nomatch";
  sel.focus();
  const opt = match.el as HTMLOptionElement;
  const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value")?.set;
  if (setter) setter.call(sel, opt.value);
  else sel.value = opt.value;
  opt.selected = true;
  fireInput(sel, "");
  fire(sel, "change");
  fire(sel, "blur", { bubbles: false });
  return "verified";
}

function fillRadio(field: Field, candidates: string[]): FillOutcome {
  const match = matchOption(field.options, candidates);
  if (!match) return "nomatch";
  const radio = match.el as HTMLInputElement;
  if (!radio.checked) {
    radio.click();
    if (!radio.checked) {
      radio.checked = true;
      fire(radio, "input");
      fire(radio, "change");
    }
  }
  return "verified";
}

function fillCheckbox(field: Field, value: boolean): FillOutcome {
  const box = field.el as HTMLInputElement;
  if (box.checked !== value) {
    box.click();
    if (box.checked !== value) {
      box.checked = value;
      fire(box, "input");
      fire(box, "change");
    }
  }
  return "verified";
}

async function fillFile(field: Field, src: FileSource): Promise<FillOutcome> {
  const input = field.el as HTMLInputElement;
  const accept = (input.accept || "").toLowerCase();
  if (accept && !acceptsFile(accept, src)) return "nomatch";
  const dt = new DataTransfer();
  dt.items.add(new File([src.data], src.name, { type: src.type }));
  input.files = dt.files;
  fire(input, "input");
  fire(input, "change");
  return "verified";
}

export function acceptsFile(accept: string, src: { name: string; type: string }): boolean {
  const parts = accept.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
  if (!parts.length) return true;
  const ext = "." + (src.name.split(".").pop() ?? "").toLowerCase();
  return parts.some(
    (p) => p === ext || p === src.type.toLowerCase() || (p.endsWith("/*") && src.type.startsWith(p.slice(0, -1))),
  );
}

export function readField(field: Field): string {
  switch (field.kind) {
    case "select": {
      const s = field.el as HTMLSelectElement;
      return s.selectedOptions[0]?.textContent?.trim() ?? "";
    }
    case "radio": {
      const r = field.group.find((g) => (g as HTMLInputElement).checked) as HTMLInputElement | undefined;
      if (!r) return "";
      return field.options.find((o) => o.el === r)?.label ?? r.value;
    }
    case "checkbox":
      return (field.el as HTMLInputElement).checked ? "true" : "false";
    case "file":
      return String((field.el as HTMLInputElement).files?.length ?? 0);
    case "combobox":
      return readCombo(field);
    default:
      return (field.el as HTMLInputElement).value ?? "";
  }
}

export function accepted(field: Field, wanted: string[] | boolean): boolean {
  const actual = readField(field);
  if (field.kind === "checkbox") return actual === String(wanted);
  if (field.kind === "file") return Number(actual) > 0;
  const a = norm(actual);
  if (!a) return false;
  const list = wanted as string[];
  if (field.kind === "select" || field.kind === "radio") {
    const m = matchOption(field.options, list);
    return !!m && norm(m.label) === a;
  }
  const squash = (v: string) => v.replace(/ /g, "");
  return list.some((w) => {
    const n = squash(norm(w));
    const sa = squash(a);
    return sa === n || sa.includes(n) || (sa.length > 2 && n.includes(sa));
  });
}

export async function applyText(field: Field, candidates: string[]): Promise<FillOutcome> {
  switch (field.kind) {
    case "select":
      return fillSelect(field, candidates);
    case "radio":
      return fillRadio(field, candidates);
    case "combobox":
      return fillCombo(field, candidates);
    case "text":
    case "textarea":
    case "date": {
      await typeInto(field.el as HTMLInputElement, candidates[0] ?? "");
      return "verified";
    }
    default:
      return "nomatch";
  }
}

export async function applyCheck(field: Field, value: boolean): Promise<FillOutcome> {
  if (field.kind !== "checkbox") return "nomatch";
  return fillCheckbox(field, value);
}

export async function applyFile(field: Field, src: FileSource): Promise<FillOutcome> {
  return fillFile(field, src);
}

export async function verify(field: Field, wanted: string[] | boolean): Promise<boolean> {
  await sleep(80);
  if (accepted(field, wanted)) return true;
  return false;
}
