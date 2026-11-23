import type { MLCEngine } from "@mlc-ai/web-llm";
import { buildMessages, validateAnswer } from "@/shared/ai";
import { loadProfile, loadSettings } from "@/shared/db";
import type { AiStatus, AskRequest } from "@/shared/messages";
import type { AiAnswer } from "@/shared/schema";

let engine: MLCEngine | null = null;
let loadedId = "";
let pending: Promise<void> | null = null;

const status: AiStatus = {
  webgpu: false,
  loaded: false,
  loading: false,
  progress: 0,
  text: "",
  error: "",
  modelId: "",
};

async function hasWebGpu(): Promise<boolean> {
  const gpu = (navigator as Navigator & { gpu?: { requestAdapter(): Promise<unknown> } }).gpu;
  if (!gpu) return false;
  try {
    return !!(await gpu.requestAdapter());
  } catch {
    return false;
  }
}

export async function getStatus(): Promise<AiStatus> {
  status.webgpu = await hasWebGpu();
  const s = await loadSettings();
  status.modelId = s.modelId;
  return { ...status };
}

function keepAlive() {
  const t = setInterval(() => void chrome.runtime.getPlatformInfo(), 20000);
  return () => clearInterval(t);
}

export async function loadModel(): Promise<void> {
  const settings = await loadSettings();
  if (!settings.modelApproved) throw new Error("Model download has not been approved");
  if (!(await hasWebGpu())) {
    status.error = "WebGPU is not available in this browser";
    throw new Error(status.error);
  }
  if (engine && loadedId === settings.modelId) return;
  if (pending) return pending;

  pending = (async () => {
    const stop = keepAlive();
    status.loading = true;
    status.error = "";
    status.progress = 0;
    status.text = "Starting";
    try {
      const { MLCEngine } = await import("@mlc-ai/web-llm");
      const e = new MLCEngine({
        initProgressCallback: (r) => {
          status.progress = r.progress;
          status.text = r.text;
        },
      });
      await e.reload(settings.modelId);
      engine = e;
      loadedId = settings.modelId;
      status.loaded = true;
    } catch (err) {
      status.error = err instanceof Error ? err.message : String(err);
      throw err;
    } finally {
      status.loading = false;
      stop();
      pending = null;
    }
  })();
  return pending;
}

export async function unloadModel(): Promise<void> {
  if (engine) await engine.unload();
  engine = null;
  loadedId = "";
  status.loaded = false;
}

export async function ask(req: AskRequest): Promise<AiAnswer | null> {
  const settings = await loadSettings();
  if (!settings.useModel || !settings.modelApproved) return null;
  if (!engine) {
    try {
      await loadModel();
    } catch {
      return null;
    }
  }
  if (!engine) return null;
  const profile = await loadProfile();
  const stop = keepAlive();
  try {
    const res = await engine.chat.completions.create({
      messages: buildMessages(profile, req),
      temperature: 0.2,
      max_tokens: req.kind === "textarea" ? 260 : 80,
    });
    const raw = res.choices[0]?.message?.content ?? "";
    return validateAnswer(raw, profile, req);
  } catch {
    return null;
  } finally {
    stop();
  }
}
