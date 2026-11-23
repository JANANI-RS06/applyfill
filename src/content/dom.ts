export type Root = Document | ShadowRoot;

export const clean = (s: string | null | undefined): string =>
  (s ?? "")
    .replace(/\s+/g, " ")
    .replace(/\(?\brequired\b\)?/gi, "")
    .replace(/[*✱]/g, "")
    .trim();

export function isVisible(el: Element): boolean {
  const win = el.ownerDocument.defaultView;
  if (!win) return false;
  let node: Element | null = el;
  while (node) {
    if ((node as HTMLElement).hidden) return false;
    const cs = win.getComputedStyle(node);
    if (cs.display === "none" || cs.visibility === "hidden") return false;
    if (node.getAttribute("aria-hidden") === "true" && !isFormControl(node)) return false;
    const root = node.getRootNode();
    node = node.parentElement ?? (root instanceof ShadowRoot ? root.host : null);
  }
  return true;
}

export function isFormControl(el: Element): boolean {
  return /^(input|select|textarea)$/i.test(el.tagName);
}

export function queryAllDeep<T extends Element>(root: Root, selector: string): T[] {
  const out: T[] = [];
  const walk = (r: Root) => {
    out.push(...Array.from(r.querySelectorAll<T>(selector)));
    for (const el of Array.from(r.querySelectorAll("*"))) {
      if (el.shadowRoot) walk(el.shadowRoot);
    }
  };
  walk(root);
  return out;
}

export function byIdIn(el: Element, id: string): HTMLElement | null {
  const root = el.getRootNode() as Document | ShadowRoot;
  return root.getElementById ? root.getElementById(id) : null;
}

export const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export function nextFrame(): Promise<void> {
  return new Promise((r) => {
    if (typeof requestAnimationFrame === "function") requestAnimationFrame(() => r());
    else setTimeout(r, 16);
  });
}

export async function waitFor<T>(
  fn: () => T | null | undefined | false,
  timeout = 1500,
  step = 40,
): Promise<T | null> {
  const end = Date.now() + timeout;
  for (;;) {
    const v = fn();
    if (v) return v;
    if (Date.now() > end) return null;
    await sleep(step);
  }
}
