import type { Profile, AiAnswer } from "./schema";
import type { Settings, StoredAnswer } from "./db";

export interface FillData {
  profile: Profile;
  settings: Settings;
  answers: StoredAnswer[];
  hasResume: boolean;
}

export interface AskRequest {
  question: string;
  options: string[];
  kind: "text" | "textarea" | "choice";
}

export type FieldStatus =
  | "verified"
  | "unverified"
  | "skipped"
  | "unresolved"
  | "nomatch";

export interface FieldReport {
  label: string;
  key: string | null;
  status: FieldStatus;
  source: "profile" | "memory" | "model" | "none";
}

export interface FillReport {
  fields: FieldReport[];
  at: number;
}

export type ToBackground =
  | { type: "fill:data" }
  | { type: "fill:resume" }
  | { type: "answer:remember"; question: string; options: string[]; answer: string }
  | { type: "ai:ask"; request: AskRequest }
  | { type: "ai:status" }
  | { type: "ai:load" }
  | { type: "ai:unload" }
  | { type: "report:update"; report: FillReport }
  | { type: "report:get"; tabId: number };

export type ToContent = { type: "fill"; overwrite?: boolean } | { type: "ping" };

export interface AiStatus {
  webgpu: boolean;
  loaded: boolean;
  loading: boolean;
  progress: number;
  text: string;
  error: string;
  modelId: string;
}

export type Reply<T> = { ok: true; data: T } | { ok: false; error: string };

export type AskResult = AiAnswer | null;

export function toBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(bin);
}

export function fromBase64(b64: string): ArrayBuffer {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out.buffer;
}
