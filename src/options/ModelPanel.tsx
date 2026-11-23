import { useEffect, useState } from "react";
import { loadSettings, saveSettings, type Settings } from "@/shared/db";
import type { AiStatus, Reply } from "@/shared/messages";
import { Check, Section } from "@/ui/components";

const MODELS = [
  { id: "Qwen2.5-0.5B-Instruct-q4f16_1-MLC", label: "Qwen2.5 0.5B (about 0.4 GB, fastest)" },
  { id: "Qwen2.5-1.5B-Instruct-q4f16_1-MLC", label: "Qwen2.5 1.5B (about 1 GB, recommended)" },
  { id: "Qwen2.5-3B-Instruct-q4f16_1-MLC", label: "Qwen2.5 3B (about 2 GB, best quality)" },
];

function call(type: "ai:status" | "ai:load" | "ai:unload"): Promise<AiStatus> {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ type }, (r: Reply<AiStatus>) => {
      if (chrome.runtime.lastError || !r) return reject(new Error(chrome.runtime.lastError?.message));
      r.ok ? resolve(r.data) : reject(new Error(r.error));
    });
  });
}

export function ModelPanel() {
  const [s, setS] = useState<Settings | null>(null);
  const [st, setSt] = useState<AiStatus | null>(null);

  useEffect(() => {
    loadSettings().then(setS);
    call("ai:status").then(setSt).catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!st?.loading) return;
    const t = setInterval(() => call("ai:status").then(setSt).catch(() => undefined), 700);
    return () => clearInterval(t);
  }, [st?.loading]);

  if (!s) return null;
  const patch = async (p: Partial<Settings>) => setS(await saveSettings(p));

  async function approve() {
    await patch({ modelApproved: true, useModel: true });
    setSt(await call("ai:load"));
  }

  async function remove() {
    setSt(await call("ai:unload"));
    await patch({ modelApproved: false, useModel: false });
    if ("caches" in window) {
      for (const k of await caches.keys()) if (/webllm|mlc/i.test(k)) await caches.delete(k);
    }
  }

  return (
    <Section title="Local model">
      <p className="mb-3 text-sm text-gray-600 dark:text-gray-300">
        The model answers open-ended questions your profile cannot resolve. It runs in your browser with WebGPU.
        Your profile and the page are never sent anywhere. Answers are checked against your profile and discarded if they add facts you did not provide.
      </p>
      {st && !st.webgpu && (
        <p className="mb-3 rounded-md bg-amber-50 p-2 text-sm text-amber-900 dark:bg-amber-900/30 dark:text-amber-100">
          WebGPU is not available here. Autofill from your profile and saved answers still works without the model.
        </p>
      )}
      <label className="mb-3 block">
        <span className="label">Model</span>
        <select className="input" value={s.modelId} onChange={(e) => patch({ modelId: e.target.value, modelApproved: false, useModel: false })}>
          {MODELS.map((m) => (
            <option key={m.id} value={m.id}>{m.label}</option>
          ))}
        </select>
      </label>
      {!s.modelApproved ? (
        <div>
          <p className="mb-2 text-xs text-gray-500">
            Approving downloads the model weights once from huggingface.co and the runtime library from raw.githubusercontent.com, then caches them in this browser. No personal data is included in these requests.
          </p>
          <button className="btn" disabled={!st?.webgpu} onClick={approve}>Approve download</button>
        </div>
      ) : (
        <div className="space-y-3">
          <Check label="Use the model when filling" checked={s.useModel} onChange={(v) => patch({ useModel: v })} />
          {st?.loading && (
            <div>
              <div className="h-2 overflow-hidden rounded bg-gray-200 dark:bg-gray-700">
                <div className="h-full bg-brand-500" style={{ width: `${Math.round(st.progress * 100)}%` }} />
              </div>
              <p className="mt-1 text-xs text-gray-500">{st.text}</p>
            </div>
          )}
          {st?.loaded && <p className="text-sm text-green-700 dark:text-green-400">Model loaded.</p>}
          {st?.error && <p className="text-sm text-red-600">{st.error}</p>}
          <div className="flex gap-2">
            {!st?.loaded && !st?.loading && <button className="btn" onClick={async () => setSt(await call("ai:load"))}>Load model</button>}
            <button className="btn-ghost" onClick={remove}>Remove model</button>
          </div>
        </div>
      )}
    </Section>
  );
}
