import type { FillData, FillReport, ToContent, AskRequest } from "@/shared/messages";
import { fromBase64 } from "@/shared/messages";
import { classify } from "./classify";
import { mountChip, type Chip } from "./chip";
import { displayValue, shouldRemember } from "./corrections";
import { fillPage, looksLikeApplication, summarize, type EngineDeps } from "./engine";
import { scanFields } from "./fields";
import { send } from "./messaging";

const touched = new WeakSet<Element>();
const handled = new WeakSet<Element>();
let chip: Chip | null = null;
let dismissed = false;
let armed = false;
let running = false;
let cached: FillData | null = null;

async function loadData(): Promise<FillData> {
  cached = await send<FillData>({ type: "fill:data" });
  return cached;
}

async function buildDeps(): Promise<EngineDeps> {
  const data = await loadData();
  return {
    profile: data.profile,
    settings: data.settings,
    answers: data.answers,
    loadResume: async () => {
      const r = await send<{ name: string; type: string; data: string } | null>({ type: "fill:resume" });
      return r ? { name: r.name, type: r.type, data: fromBase64(r.data) } : null;
    },
    ask: async (request: AskRequest) => {
      try {
        const a = await send<{ answer: string } | null>({ type: "ai:ask", request });
        return a?.answer ?? null;
      } catch {
        return null;
      }
    },
  };
}

async function run(overwrite?: boolean): Promise<FillReport | null> {
  if (running) return null;
  running = true;
  chip?.setBusy(true);
  try {
    const deps = await buildDeps();
    const report = await fillPage(document, deps, { overwrite, touched });
    for (const f of scanFields(document)) handled.add(f.el);
    armed = true;
    if (report.fields.some((f) => f.status !== "skipped")) {
      await send({ type: "report:update", report }).catch(() => undefined);
    }
    const s = summarize(report);
    if (s.verified + s.unverified + s.unresolved > 0) {
      const review = s.unverified + s.unresolved;
      chip?.say(review ? `Filled ${s.verified}. ${review} need review.` : `Filled ${s.verified} fields.`);
    } else {
      chip?.say("Nothing to fill here.");
    }
    return report;
  } catch {
    chip?.say("Could not reach the extension. Reload the page.");
    return null;
  } finally {
    running = false;
    chip?.setBusy(false);
  }
}

function hasNewFillable(): boolean {
  for (const f of scanFields(document)) {
    if (handled.has(f.el) || f.filled) continue;
    const c = classify(f);
    if (c) return true;
  }
  return false;
}

let timer: number | undefined;
function onMutation() {
  window.clearTimeout(timer);
  timer = window.setTimeout(async () => {
    if (running) return;
    if (!chip && !dismissed && looksLikeApplication()) await showChip();
    if (armed && hasNewFillable()) await run(false);
  }, 700);
}

async function showChip() {
  if (chip || dismissed) return;
  try {
    const data = cached ?? (await loadData());
    if (!data.settings.showChip) return;
  } catch {
    return;
  }
  chip = mountChip(() => void run(), () => {
    dismissed = true;
    chip = null;
  });
}

function trackCorrections() {
  document.addEventListener(
    "change",
    (e) => {
      if (!e.isTrusted) return;
      const target = e.target as HTMLElement | null;
      if (!target) return;
      touched.add(target);
      if (!cached) return;
      const field = scanFields(document).find((f) => f.group.includes(target));
      if (!field) return;
      const value = displayValue(field, target);
      if (!shouldRemember(field, classify(field), value, cached.profile)) return;
      const options = field.options.map((o) => o.label).filter(Boolean);
      send({ type: "answer:remember", question: field.label, options, answer: value }).catch(() => undefined);
    },
    true,
  );
}

chrome.runtime.onMessage.addListener((msg: ToContent, _sender, sendResponse) => {
  if (msg.type === "ping") {
    sendResponse({ ok: true });
    return false;
  }
  if (msg.type === "fill") {
    const fields = scanFields(document);
    if (!fields.some((f) => classify(f))) return false;
    run(msg.overwrite).then(() => sendResponse({ ok: true }));
    return true;
  }
  return false;
});

trackCorrections();
new MutationObserver(onMutation).observe(document.documentElement, {
  childList: true,
  subtree: true,
});
onMutation();

