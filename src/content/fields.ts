import { byIdIn, clean, isVisible, queryAllDeep, type Root } from "./dom";

export type FieldKind =
  | "text"
  | "textarea"
  | "select"
  | "radio"
  | "checkbox"
  | "combobox"
  | "file"
  | "date";

export interface FieldOption {
  label: string;
  value: string;
  el: HTMLElement;
}

export interface Field {
  id: string;
  kind: FieldKind;
  el: HTMLElement;
  group: HTMLElement[];
  label: string;
  context: string;
  name: string;
  attrId: string;
  placeholder: string;
  autocomplete: string;
  inputType: string;
  required: boolean;
  options: FieldOption[];
  filled: boolean;
}

const SKIP_TYPES = new Set([
  "hidden",
  "submit",
  "button",
  "reset",
  "image",
  "password",
  "search",
  "range",
  "color",
]);

const SELECTOR = [
  "input",
  "textarea",
  "select",
  "[role=combobox]",
  "[aria-haspopup=listbox]",
].join(",");

let counter = 0;
const ids = new WeakMap<Element, string>();
const idFor = (el: Element) => {
  let v = ids.get(el);
  if (!v) {
    v = `af-${++counter}`;
    ids.set(el, v);
  }
  return v;
};

function textOfIds(el: Element, attr: string): string {
  const raw = el.getAttribute(attr);
  if (!raw) return "";
  return raw
    .split(/\s+/)
    .map((id) => clean(byIdIn(el, id)?.textContent))
    .filter(Boolean)
    .join(" ");
}

function labelFor(el: HTMLElement): string {
  const aria = textOfIds(el, "aria-labelledby");
  if (aria) return aria;
  const al = clean(el.getAttribute("aria-label"));
  if (al) return al;

  const labels = (el as HTMLInputElement).labels;
  if (labels && labels.length) {
    const t = clean(Array.from(labels).map((l) => l.textContent).join(" "));
    if (t) return t;
  }
  const id = el.getAttribute("id");
  if (id) {
    const root = el.getRootNode() as Document | ShadowRoot;
    const l = root.querySelector?.(`label[for="${CSS.escape(id)}"]`);
    if (l) {
      const t = clean(l.textContent);
      if (t) return t;
    }
  }
  const wrap = el.closest("label");
  if (wrap) {
    const t = clean(wrap.textContent);
    if (t) return t;
  }
  return nearbyText(el);
}

function nearbyText(el: HTMLElement): string {
  let node: HTMLElement | null = el;
  for (let depth = 0; node && depth < 4; depth++) {
    let prev = node.previousElementSibling;
    while (prev) {
      if (!prev.querySelector("input,select,textarea")) {
        const t = clean(prev.textContent);
        if (t && t.length < 200) return t;
      }
      prev = prev.previousElementSibling;
    }
    node = node.parentElement;
    if (node) {
      const heading = node.querySelector(":scope > label, :scope > legend, :scope > [class*=label i]");
      if (heading && !heading.contains(el)) {
        const t = clean(heading.textContent);
        if (t && t.length < 200) return t;
      }
    }
  }
  return "";
}

function groupLabel(el: HTMLElement): string {
  const fs = el.closest("fieldset");
  const legend = fs?.querySelector(":scope > legend");
  if (legend) return clean(legend.textContent);
  const rg = el.closest("[role=radiogroup],[role=group]");
  if (rg) {
    const l = textOfIds(rg, "aria-labelledby") || clean(rg.getAttribute("aria-label"));
    if (l) return l;
    const prev = rg.previousElementSibling;
    if (prev) return clean(prev.textContent);
  }
  return "";
}

function sectionContext(el: HTMLElement): string {
  const parts: string[] = [];
  let node: HTMLElement | null = el.parentElement;
  for (let i = 0; node && i < 6; i++, node = node.parentElement) {
    const h = node.querySelector(":scope > h1,:scope > h2,:scope > h3,:scope > h4,:scope > legend");
    if (h) parts.push(clean(h.textContent));
    const al = node.getAttribute("aria-label");
    if (al) parts.push(clean(al));
    if (node.tagName === "FORM") break;
  }
  return parts.join(" | ");
}

function selectOptions(sel: HTMLSelectElement): FieldOption[] {
  return Array.from(sel.options)
    .filter((o) => o.value !== "" || clean(o.textContent) !== "")
    .map((o) => ({ label: clean(o.textContent), value: o.value, el: o }));
}

function base(el: HTMLElement, kind: FieldKind): Field {
  const input = el as HTMLInputElement;
  return {
    id: idFor(el),
    kind,
    el,
    group: [el],
    label: labelFor(el),
    context: sectionContext(el),
    name: input.name ?? el.getAttribute("name") ?? "",
    attrId: el.getAttribute("id") ?? "",
    placeholder: el.getAttribute("placeholder") ?? "",
    autocomplete: el.getAttribute("autocomplete") ?? "",
    inputType: (input.type ?? "").toLowerCase(),
    required: input.required === true || el.getAttribute("aria-required") === "true",
    options: [],
    filled: false,
  };
}

export function scanFields(root: Root = document): Field[] {
  const els = queryAllDeep<HTMLElement>(root, SELECTOR).filter(
    (el) => !el.closest("[data-applyfill]"),
  );
  const fields: Field[] = [];
  const radios = new Map<string, Field>();
  const seen = new Set<Element>();

  for (const el of els) {
    if (seen.has(el)) continue;
    const tag = el.tagName.toLowerCase();
    const input = el as HTMLInputElement;
    const type = (input.type ?? "").toLowerCase();

    if (tag === "input" && SKIP_TYPES.has(type)) continue;
    if (input.disabled) continue;

    const role = el.getAttribute("role");
    const isCombo =
      role === "combobox" || el.getAttribute("aria-haspopup") === "listbox";

    if (type === "file") {
      fields.push(base(el, "file"));
      continue;
    }
    if (!isVisible(el)) continue;

    if (tag === "select") {
      const f = base(el, "select");
      f.options = selectOptions(el as HTMLSelectElement);
      f.filled = !!(el as HTMLSelectElement).value && (el as HTMLSelectElement).selectedIndex > 0;
      fields.push(f);
      continue;
    }

    if (type === "radio") {
      const key = `${(el.getRootNode() as Node).nodeType}:${input.name || groupLabel(el)}`;
      let f = radios.get(key);
      if (!f) {
        f = base(el, "radio");
        f.label = groupLabel(el) || labelFor(el) || input.name;
        f.group = [];
        radios.set(key, f);
        fields.push(f);
      }
      f.group.push(el);
      f.options.push({
        label: labelFor(el) || input.value,
        value: input.value,
        el,
      });
      f.filled = f.filled || input.checked;
      continue;
    }

    if (type === "checkbox") {
      const f = base(el, "checkbox");
      const gl = groupLabel(el);
      f.context = [gl, f.context].filter(Boolean).join(" | ");
      f.filled = input.checked;
      fields.push(f);
      continue;
    }

    if (tag === "textarea") {
      const f = base(el, "textarea");
      f.filled = !!(el as HTMLTextAreaElement).value.trim();
      fields.push(f);
      continue;
    }

    if (isCombo) {
      const f = base(el, "combobox");
      const host = el.tagName === "INPUT" ? input : null;
      f.filled = !!(host?.value || (!host && clean(el.textContent) && !/select|choose/i.test(el.textContent ?? "")));
      fields.push(f);
      continue;
    }

    if (tag === "input") {
      const kind: FieldKind = type === "date" || type === "month" ? "date" : "text";
      const f = base(el, kind);
      f.filled = !!input.value.trim();
      fields.push(f);
    }
  }
  return fields;
}

export function signature(f: Field): string {
  return [f.autocomplete, f.label, f.name, f.attrId, f.placeholder, f.context]
    .join(" ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .toLowerCase()
    .replace(/[_\-.[\]]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
