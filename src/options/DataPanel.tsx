import { useEffect, useState } from "react";
import { eraseAll, exportAll, loadSettings, saveSettings, saveProfile, type Settings } from "@/shared/db";
import { profileSchema, type Profile } from "@/shared/schema";
import { Check, Section } from "@/ui/components";

export function DataPanel({ onImported }: { onImported: (p: Profile) => void }) {
  const [s, setS] = useState<Settings | null>(null);
  const [note, setNote] = useState("");
  useEffect(() => void loadSettings().then(setS), []);
  if (!s) return null;
  const patch = async (p: Partial<Settings>) => setS(await saveSettings(p));

  async function download() {
    const blob = new Blob([JSON.stringify(await exportAll(), null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "applyfill-export.json";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  async function upload(file: File | undefined) {
    if (!file) return;
    try {
      const json = JSON.parse(await file.text());
      const parsed = profileSchema.parse(json.profile ?? json);
      onImported(await saveProfile(parsed));
      setNote("Profile imported.");
    } catch {
      setNote("That file is not a valid export.");
    }
  }

  async function wipe() {
    if (!confirm("Delete your profile, resume, saved answers, and settings from this browser?")) return;
    await eraseAll();
    location.reload();
  }

  return (
    <div className="space-y-4">
      <Section title="Behavior">
        <div className="space-y-2">
          <Check label="Show the Fill chip on pages that look like applications" checked={s.showChip} onChange={(v) => patch({ showChip: v })} />
          <Check label="Overwrite fields that already have a value" checked={s.overwrite} onChange={(v) => patch({ overwrite: v })} />
        </div>
      </Section>
      <Section title="Your data">
        <p className="mb-3 text-sm text-gray-600 dark:text-gray-300">Everything is stored in this browser. Nothing is uploaded.</p>
        <div className="flex flex-wrap items-center gap-2">
          <button className="btn-ghost" onClick={download}>Export JSON</button>
          <label className="btn-ghost cursor-pointer">
            Import JSON
            <input type="file" accept="application/json" className="hidden" onChange={(e) => upload(e.target.files?.[0])} />
          </label>
          <button className="btn-ghost !text-red-600" onClick={wipe}>Delete everything</button>
        </div>
        {note && <p className="mt-2 text-sm" role="status">{note}</p>}
      </Section>
    </div>
  );
}
