import { useEffect, useState } from "react";
import { db, forgetAnswer, rememberAnswer, type StoredAnswer } from "@/shared/db";
import { Section } from "@/ui/components";

export function AnswersPanel() {
  const [rows, setRows] = useState<StoredAnswer[]>([]);
  const refresh = () => db.answers.orderBy("updatedAt").reverse().toArray().then(setRows);
  useEffect(() => void refresh(), []);

  return (
    <Section title="Remembered answers">
      <p className="mb-3 text-sm text-gray-600 dark:text-gray-300">
        Answers you gave on application forms. They are reused when the same question appears again and take priority over your profile.
      </p>
      {rows.length === 0 && <p className="text-sm text-gray-500">Nothing remembered yet.</p>}
      <ul className="space-y-2">
        {rows.map((r) => (
          <li key={r.key} className="rounded-md border border-gray-200 p-2 dark:border-gray-700">
            <div className="mb-1 text-xs text-gray-500">{r.question}</div>
            <div className="flex gap-2">
              <input
                className="input"
                defaultValue={r.answer}
                onBlur={async (e) => {
                  if (e.target.value !== r.answer) {
                    await rememberAnswer(r.question, e.target.value, r.options);
                    refresh();
                  }
                }}
              />
              <button className="btn-ghost" onClick={async () => { await forgetAnswer(r.key); refresh(); }}>
                Forget
              </button>
            </div>
          </li>
        ))}
      </ul>
    </Section>
  );
}
