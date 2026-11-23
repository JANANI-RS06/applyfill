import { chromium, type BrowserContext, type Page } from "@playwright/test";
import { join } from "node:path";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";

export const DIST = join(import.meta.dirname, "..", "..", "dist");

export async function launch(): Promise<{ context: BrowserContext; extensionId: string }> {
  const context = await chromium.launchPersistentContext(mkdtempSync(join(tmpdir(), "applyfill-")), {
    channel: "chromium",
    headless: true,
    args: [`--disable-extensions-except=${DIST}`, `--load-extension=${DIST}`],
  });
  let [worker] = context.serviceWorkers();
  if (!worker) worker = await context.waitForEvent("serviceworker");
  const extensionId = new URL(worker.url()).host;
  return { context, extensionId };
}

export const PROFILE = {
  version: 1,
  personal: {
    firstName: "Ada", middleName: "", lastName: "Lovelace", preferredName: "",
    email: "ada@example.com", phoneCountryCode: "+1", phone: "5551234567",
    address1: "1 Main St", address2: "", city: "Baltimore", state: "MD",
    postalCode: "21201", country: "United States",
    linkedin: "https://linkedin.com/in/ada", github: "", portfolio: "", website: "",
  },
  employment: [
    { id: "j1", company: "Acme Corp", title: "Senior Engineer", employmentType: "full-time", startDate: "2020-06", endDate: "2023-08", current: false, location: "Baltimore, MD", description: "" },
    { id: "j2", company: "Globex", title: "Engineer", employmentType: "", startDate: "2018-01", endDate: "2020-05", current: false, location: "", description: "" },
  ],
  education: [
    { id: "e1", school: "University of Maryland", degree: "B.S.", field: "Computer Science", startDate: "2014", endDate: "2018", current: false, gpa: "3.8", location: "" },
  ],
  skills: ["TypeScript"], languages: [], certifications: [], summary: "",
  preferences: { authorizedToWork: "yes", requiresSponsorship: "no", willingToRelocate: "", over18: "", noticePeriod: "", salaryExpectation: "", availableStartDate: "", workAuthorizationNote: "", referral: "" },
  demographics: { gender: "", ethnicity: "", veteranStatus: "", disabilityStatus: "", pronouns: "" },
};

export async function seed(
  context: BrowserContext,
  extensionId: string,
  opts: { profile?: object; answers?: object[]; resume?: { name: string; type: string; bytes: number[] } } = {},
): Promise<Page> {
  const page = await context.newPage();
  await page.goto(`chrome-extension://${extensionId}/src/options/index.html`);
  await page.getByRole("heading", { name: "ApplyFill" }).waitFor();
  await page.evaluate(
    async ({ profile, answers, resume }) => {
      const db: IDBDatabase = await new Promise((res, rej) => {
        const r = indexedDB.open("applyfill");
        r.onsuccess = () => res(r.result);
        r.onerror = () => rej(r.error);
      });
      const put = (store: string, value: unknown) =>
        new Promise<void>((res, rej) => {
          const tx = db.transaction(store, "readwrite");
          tx.objectStore(store).put(value);
          tx.oncomplete = () => res();
          tx.onerror = () => rej(tx.error);
        });
      await put("profile", { id: "profile", data: profile, updatedAt: Date.now() });
      for (const a of answers) await put("answers", a);
      if (resume) {
        await put("resume", {
          id: "resume", name: resume.name, type: resume.type,
          data: new Uint8Array(resume.bytes).buffer, updatedAt: Date.now(),
        });
      }
      db.close();
    },
    { profile: opts.profile ?? PROFILE, answers: opts.answers ?? [], resume: opts.resume ?? null },
  );
  return page;
}
