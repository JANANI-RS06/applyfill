import { useEffect, useState } from "react";
import { loadProfile, saveProfile } from "@/shared/db";
import { emptyProfile, type Profile } from "@/shared/schema";
import { AnswersPanel } from "./AnswersPanel";
import { DataPanel } from "./DataPanel";
import { ModelPanel } from "./ModelPanel";
import { ProfileEditor } from "./ProfileEditor";
import { ResumePanel } from "./ResumePanel";

const TABS = ["Profile", "Resume", "Answers", "Model", "Settings"] as const;
type Tab = (typeof TABS)[number];

export function App() {
  const [tab, setTab] = useState<Tab>("Profile");
  const [profile, setProfile] = useState<Profile>(emptyProfile());
  const [saved, setSaved] = useState<string>("");
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    loadProfile().then((p) => {
      setProfile(p);
      setSaved(JSON.stringify(p));
      setReady(true);
    });
  }, []);

  useEffect(() => {
    setDirty(ready && JSON.stringify(profile) !== saved);
  }, [profile, saved, ready]);

  useEffect(() => {
    if (!dirty) return;
    const h = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [dirty]);

  async function save() {
    try {
      const next = await saveProfile(profile);
      setProfile(next);
      setSaved(JSON.stringify(next));
      setError("");
    } catch (e) {
      setError(e instanceof Error && /date/i.test(e.message) ? "A date is not in YYYY or YYYY-MM format." : "Could not save. Check the dates.");
    }
  }

  if (!ready) return null;

  return (
    <div className="mx-auto max-w-3xl px-4 pb-24 pt-6">
      <header className="mb-4 flex items-center justify-between">
        <h1 className="text-lg font-semibold">ApplyFill</h1>
        <span className="text-xs text-gray-500">All data stays on this device</span>
      </header>
      <nav className="mb-4 flex gap-1 border-b border-gray-200 dark:border-gray-700" role="tablist">
        {TABS.map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={`-mb-px border-b-2 px-3 py-2 text-sm ${tab === t ? "border-brand-500 font-medium text-brand-600" : "border-transparent text-gray-600 hover:text-gray-900 dark:text-gray-300"}`}
          >
            {t}
          </button>
        ))}
      </nav>

      {tab === "Profile" && notice && (
        <p className="mb-4 rounded-md bg-brand-50 p-3 text-sm text-brand-700" role="status">{notice}</p>
      )}
      {tab === "Profile" && <ProfileEditor profile={profile} onChange={setProfile} />}
      {tab === "Resume" && (
        <ResumePanel
          profile={profile}
          onDraft={(p, note) => {
            setProfile(p);
            setNotice(note);
            setTab("Profile");
          }}
        />
      )}
      {tab === "Answers" && <AnswersPanel />}
      {tab === "Model" && <ModelPanel />}
      {tab === "Settings" && (
        <DataPanel
          onImported={(p) => {
            setProfile(p);
            setSaved(JSON.stringify(p));
          }}
        />
      )}

      {(dirty || error) && (
        <div className="fixed inset-x-0 bottom-0 border-t border-gray-200 bg-white/95 py-3 dark:border-gray-700 dark:bg-gray-900/95">
          <div className="mx-auto flex max-w-3xl items-center justify-between px-4">
            <span className={`text-sm ${error ? "text-red-600" : "text-gray-600 dark:text-gray-300"}`} role="status">
              {error || "Unsaved changes"}
            </span>
            <div className="flex gap-2">
              <button className="btn-ghost" onClick={() => setProfile(JSON.parse(saved))}>Discard</button>
              <button className="btn" onClick={save}>Save profile</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
