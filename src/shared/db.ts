import Dexie, { type Table } from "dexie";
import { emptyProfile, profileSchema, type Profile } from "./schema";
import { questionKey } from "./text";

export { questionKey, normalizeText } from "./text";

export interface StoredAnswer {
  key: string;
  question: string;
  answer: string;
  options: string[];
  updatedAt: number;
  uses: number;
}

export interface ResumeFile {
  id: "resume";
  name: string;
  type: string;
  data: ArrayBuffer;
  updatedAt: number;
}

export interface ProfileRow {
  id: "profile";
  data: Profile;
  updatedAt: number;
}

export interface Settings {
  id: "settings";
  overwrite: boolean;
  showChip: boolean;
  useModel: boolean;
  modelId: string;
  modelApproved: boolean;
}

export const defaultSettings: Settings = {
  id: "settings",
  overwrite: false,
  showChip: true,
  useModel: false,
  modelId: "Qwen2.5-1.5B-Instruct-q4f16_1-MLC",
  modelApproved: false,
};

class AppDb extends Dexie {
  profile!: Table<ProfileRow, string>;
  answers!: Table<StoredAnswer, string>;
  resume!: Table<ResumeFile, string>;
  settings!: Table<Settings, string>;

  constructor(name = "applyfill") {
    super(name);
    this.version(1).stores({
      profile: "id",
      answers: "key, updatedAt",
      resume: "id",
      settings: "id",
    });
  }
}

export const db = new AppDb();

export async function loadProfile(): Promise<Profile> {
  const row = await db.profile.get("profile");
  if (!row) return emptyProfile();
  const parsed = profileSchema.safeParse(row.data);
  return parsed.success ? parsed.data : emptyProfile();
}

export async function saveProfile(profile: Profile): Promise<Profile> {
  const data = profileSchema.parse(profile);
  await db.profile.put({ id: "profile", data, updatedAt: Date.now() });
  return data;
}

export async function loadSettings(): Promise<Settings> {
  const row = await db.settings.get("settings");
  return { ...defaultSettings, ...row };
}

export async function saveSettings(patch: Partial<Settings>): Promise<Settings> {
  const next = { ...(await loadSettings()), ...patch, id: "settings" as const };
  await db.settings.put(next);
  return next;
}

export async function rememberAnswer(
  question: string,
  answer: string,
  options: string[] = [],
): Promise<void> {
  const key = questionKey(question, options);
  if (!key || !answer.trim()) return;
  const existing = await db.answers.get(key);
  await db.answers.put({
    key,
    question,
    answer,
    options,
    updatedAt: Date.now(),
    uses: existing?.uses ?? 0,
  });
}

export async function recallAnswer(
  question: string,
  options: string[] = [],
): Promise<StoredAnswer | undefined> {
  const hit = await db.answers.get(questionKey(question, options));
  if (hit) await db.answers.update(hit.key, { uses: hit.uses + 1 });
  return hit;
}

export async function forgetAnswer(key: string): Promise<void> {
  await db.answers.delete(key);
}

export async function saveResume(file: File): Promise<void> {
  await db.resume.put({
    id: "resume",
    name: file.name,
    type: file.type,
    data: await file.arrayBuffer(),
    updatedAt: Date.now(),
  });
}

export async function eraseAll(): Promise<void> {
  await Promise.all([
    db.profile.clear(),
    db.answers.clear(),
    db.resume.clear(),
    db.settings.clear(),
  ]);
}

export async function exportAll() {
  return {
    exportedAt: new Date().toISOString(),
    profile: await loadProfile(),
    answers: await db.answers.toArray(),
    settings: await loadSettings(),
  };
}
