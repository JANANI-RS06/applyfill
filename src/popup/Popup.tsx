import { useEffect, useState } from "react";
import { loadProfile } from "@/shared/db";
import type { FieldReport, FillReport, Reply } from "@/shared/messages";
import type { Profile } from "@/shared/schema";

function hasBasics(p: Profile): boolean {
  return !!(p.personal.firstName && p.personal.lastName && p.personal.email);
}

function getReports(tabId: number): Promise<Record<string, FillReport>> {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: "report:get", tabId }, (r: Reply<Record<string, FillReport>>) => {
      resolve(r && r.ok ? r.data : {});
    });
  });
}

function flatten(reports: Record<string, FillReport>): FieldReport[] {
  return Object.values(reports).flatMap((r) => r.fields);
}

const LABEL: Record<FieldReport["status"], string> = {
  verified: "Filled",
  unverified: "Not accepted by the site",
  unresolved: "No value in profile",
  nomatch: "No matching option",
  skipped: "Skipped",
};

export function Popup() {
  const [ready, setReady] = useState(false);
  const [ok, setOk] = useState(true);
  const [busy, setBusy] = useState(false);
  const [rows, setRows] = useState<FieldReport[]>([]);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    loadProfile().then((p) => {
      setOk(hasBasics(p));
      setReady(true);
    });
    chrome.tabs.query({ active: true, currentWindow: true }).then(async ([tab]) => {
      if (tab?.id !== undefined) setRows(flatten(await getReports(tab.id)));
    });
  }, []);

  async function fill() {
    setBusy(true);
    setMsg("");
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) {
      setBusy(false);
      return;
    }
    try {
      await chrome.storage.session.remove(`report:${tab.id}`);
      await chrome.tabs.sendMessage(tab.id, { type: "fill" });
    } catch {
      setMsg("No application fields found. If you just installed the extension, reload the page.");
    }
    await new Promise((r) => setTimeout(r, 300));
    const next = flatten(await getReports(tab.id));
    setRows(next);
    if (!next.length && !msg) setMsg("No application fields found on this page.");
    setBusy(false);
  }

  if (!ready) return null;

  const shown = rows.filter((r) => r.status !== "skipped");
  const verified = shown.filter((r) => r.status === "verified").length;
  const review = shown.filter((r) => r.status !== "verified");

  return (
    <div className="w-80 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h1 className="text-sm font-semibold">ApplyFill</h1>
        <button className="text-xs text-brand-600 underline" onClick={() => chrome.runtime.openOptionsPage()}>
          Settings
        </button>
      </div>

      {!ok ? (
        <div>
          <p className="mb-3 text-sm text-gray-600 dark:text-gray-300">
            Add your name and email to your profile before filling.
          </p>
          <button className="btn w-full" onClick={() => chrome.runtime.openOptionsPage()}>Set up profile</button>
        </div>
      ) : (
        <button className="btn w-full" disabled={busy} onClick={fill}>
          {busy ? "Filling..." : "Fill this page"}
        </button>
      )}

      {msg && <p className="mt-3 text-sm text-gray-600 dark:text-gray-300" role="status">{msg}</p>}

      {shown.length > 0 && (
        <div className="mt-3" role="status">
          <p className="text-sm">
            Filled {verified} of {shown.length} fields.
          </p>
          {review.length > 0 && (
            <ul className="mt-2 max-h-40 space-y-1 overflow-auto text-xs">
              {review.map((r, i) => (
                <li key={i} className="flex justify-between gap-2">
                  <span className="truncate">{r.label}</span>
                  <span className="shrink-0 text-gray-500">{LABEL[r.status]}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      <p className="mt-3 text-xs text-gray-500">Nothing is submitted. Review each field before you apply.</p>
    </div>
  );
}
