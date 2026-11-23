import { useEffect, useRef, useState } from "react";
import { db, saveResume } from "@/shared/db";
import { extractText } from "@/parsing/extract";
import { mergeProfiles, parseResumeText } from "@/parsing/resume";
import type { Profile } from "@/shared/schema";
import { Section } from "@/ui/components";

type Props = { profile: Profile; onDraft: (p: Profile) => void };

export function ResumePanel({ profile, onDraft }: Props) {
  const [stored, setStored] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const [mode, setMode] = useState<"fill" | "replace">("fill");
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    db.resume.get("resume").then((r) => setStored(r?.name ?? ""));
  }, []);

  async function onFile(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setNote("");
    try {
      await saveResume(file);
      setStored(file.name);
      const text = await extractText(file);
      const parsed = parseResumeText(text);
      const found =
        parsed.employment.length + parsed.education.length + parsed.skills.length +
        Object.values(parsed.personal).filter(Boolean).length;
      if (!found) {
        setNote("The file was saved for uploads, but no profile details could be read from it.");
      } else {
        onDraft(mergeProfiles(profile, parsed, mode));
        setNote(
          `Read ${parsed.employment.length} jobs, ${parsed.education.length} schools, and ${parsed.skills.length} skills. Review them in the Profile tab, then save.`,
        );
      }
    } catch (e) {
      setNote(e instanceof Error ? e.message : "Could not read that file.");
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  async function remove() {
    await db.resume.delete("resume");
    setStored("");
  }

  return (
    <Section title="Resume">
      <p className="mb-3 text-sm text-gray-600 dark:text-gray-300">
        The file stays in this browser. It is attached to resume upload fields and read locally to draft your profile.
      </p>
      <div className="mb-3 flex gap-4 text-sm">
        <label className="flex items-center gap-1.5">
          <input type="radio" checked={mode === "fill"} onChange={() => setMode("fill")} />
          Fill empty fields only
        </label>
        <label className="flex items-center gap-1.5">
          <input type="radio" checked={mode === "replace"} onChange={() => setMode("replace")} />
          Replace profile
        </label>
      </div>
      <div className="flex items-center gap-3">
        <input ref={input} type="file" accept=".pdf,.docx,.txt" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
        <button className="btn" disabled={busy} onClick={() => input.current?.click()}>
          {busy ? "Reading..." : stored ? "Replace resume" : "Upload resume"}
        </button>
        {stored && (
          <>
            <span className="truncate text-sm">{stored}</span>
            <button className="btn-ghost" onClick={remove}>Remove</button>
          </>
        )}
      </div>
      {note && <p className="mt-3 text-sm" role="status">{note}</p>}
    </Section>
  );
}
