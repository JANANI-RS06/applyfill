import { fillPage, summarize, looksLikeApplication } from "@/content/engine";
import { defaultSettings, type StoredAnswer } from "@/shared/db";
import { blankEducation, blankEmployment, emptyProfile } from "@/shared/schema";
import { mount } from "./helpers";

const FORM = `
<form>
  <label for="fn">First name</label><input id="fn">
  <label for="ln">Last name</label><input id="ln">
  <label for="em">Email</label><input id="em" type="email">
  <label for="li">LinkedIn URL</label><input id="li">
  <label for="co">Country</label>
  <select id="co"><option value="">Select</option><option>Canada</option><option>United States</option></select>
  <fieldset><legend>Are you legally authorized to work in the US?</legend>
    <label><input type="radio" name="auth" value="y"> Yes</label>
    <label><input type="radio" name="auth" value="n"> No</label>
  </fieldset>
  <fieldset><legend>Will you require sponsorship?</legend>
    <label><input type="radio" name="sp" value="y"> Yes</label>
    <label><input type="radio" name="sp" value="n"> No</label>
  </fieldset>
  <section><h3>Work Experience</h3>
    <label for="c1">Company</label><input id="c1">
    <label for="t1">Job title</label><input id="t1">
    <label for="s1">Start date</label><input id="s1" placeholder="MM/YYYY">
    <label for="e1">End date</label><input id="e1" placeholder="MM/YYYY">
  </section>
  <section><h3>Work Experience</h3>
    <label for="c2">Company</label><input id="c2">
    <label for="t2">Job title</label><input id="t2">
    <label><input id="cur2" type="checkbox"> I currently work here</label>
    <label for="e2">End date</label><input id="e2" placeholder="MM/YYYY">
  </section>
  <label for="fav">What is your favorite color?</label><input id="fav">
</form>`;

const deps = (extra: Partial<Parameters<typeof fillPage>[1]> = {}) => {
  const profile = emptyProfile();
  profile.personal = { ...profile.personal, firstName: "Ada", lastName: "Lovelace", email: "ada@example.com", linkedin: "https://linkedin.com/in/ada", country: "USA" };
  profile.preferences.authorizedToWork = "yes";
  profile.preferences.requiresSponsorship = "no";
  profile.employment = [
    { ...blankEmployment(), company: "Acme", title: "Engineer", startDate: "2020-06", endDate: "2022-03" },
    { ...blankEmployment(), company: "Globex", title: "Lead", startDate: "2022-04", current: true },
  ];
  profile.education = [blankEducation()];
  return {
    profile,
    settings: { ...defaultSettings },
    answers: [] as StoredAnswer[],
    loadResume: async () => null,
    ask: async () => null,
    ...extra,
  };
};

const val = (id: string) => (document.getElementById(id) as HTMLInputElement).value;

describe("fillPage", () => {
  beforeEach(() => mount(FORM));

  it("fills the whole form and verifies every value", async () => {
    const report = await fillPage(document, deps());
    expect(val("fn")).toBe("Ada");
    expect(val("em")).toBe("ada@example.com");
    expect(val("co")).toBe("United States");
    expect((document.querySelector('input[name="auth"][value="y"]') as HTMLInputElement).checked).toBe(true);
    expect((document.querySelector('input[name="sp"][value="n"]') as HTMLInputElement).checked).toBe(true);
    expect(val("c1")).toBe("Acme");
    expect(val("s1")).toBe("06/2020");
    expect(val("e1")).toBe("03/2022");
    expect(val("c2")).toBe("Globex");
    expect((document.getElementById("cur2") as HTMLInputElement).checked).toBe(true);
    expect(val("e2")).toBe("");
    expect(report.fields.every((f) => f.status !== "unverified")).toBe(true);
    expect(summarize(report).verified).toBeGreaterThan(10);
  });

  it("leaves unknown questions empty", async () => {
    await fillPage(document, deps());
    expect(val("fav")).toBe("");
  });

  it("does not overwrite what the user already typed", async () => {
    (document.getElementById("fn") as HTMLInputElement).value = "Grace";
    await fillPage(document, deps());
    expect(val("fn")).toBe("Grace");
  });

  it("overwrites when asked", async () => {
    (document.getElementById("fn") as HTMLInputElement).value = "Grace";
    await fillPage(document, deps(), { overwrite: true });
    expect(val("fn")).toBe("Ada");
  });

  it("uses remembered answers for unclassified questions", async () => {
    const answers: StoredAnswer[] = [{ key: "what is your favorite color", question: "What is your favorite color?", answer: "Green", options: [], updatedAt: 1, uses: 0 }];
    await fillPage(document, deps({ answers }));
    expect(val("fav")).toBe("Green");
  });

  it("lets a remembered correction beat the profile", async () => {
    const answers: StoredAnswer[] = [{ key: "first name", question: "First name", answer: "Augusta", options: [], updatedAt: 1, uses: 0 }];
    await fillPage(document, deps({ answers }));
    expect(val("fn")).toBe("Augusta");
  });

  it("asks the model only when enabled and approved", async () => {
    mount(`<label for="q">Describe a project you are proud of</label><textarea id="q"></textarea>`);
    let calls = 0;
    const ask = async () => { calls++; return "I built data tooling."; };
    await fillPage(document, deps({ ask }));
    expect(calls).toBe(0);
    const on = deps({ ask });
    on.settings = { ...on.settings, useModel: true, modelApproved: true };
    await fillPage(document, on);
    expect(calls).toBe(1);
    expect(val("q")).toBe("I built data tooling.");
  });

  it("never sends sensitive questions to the model", async () => {
    mount(`<label for="q">Have you ever been convicted of a crime?</label><input id="q">`);
    let calls = 0;
    const on = deps({ ask: async () => { calls++; return "No"; } });
    on.settings = { ...on.settings, useModel: true, modelApproved: true };
    await fillPage(document, on);
    expect(calls).toBe(0);
  });

  it("attaches the stored resume", async () => {
    mount(`<label for="r">Resume</label><input id="r" type="file">`);
    const input = document.getElementById("r") as HTMLInputElement;
    let held: FileList | null = null;
    Object.defineProperty(input, "files", { get: () => held, set: (v) => (held = v) });
    const data = new TextEncoder().encode("pdf").buffer as ArrayBuffer;
    const r = await fillPage(document, deps({ loadResume: async () => ({ name: "cv.pdf", type: "application/pdf", data }) }));
    expect(r.fields[0]!.status).toBe("verified");
    expect(held).not.toBeNull();
  });

  it("recognizes application pages", () => {
    expect(looksLikeApplication(document)).toBe(true);
    mount(`<input name="q" placeholder="Search"><button>Go</button>`);
    expect(looksLikeApplication(document)).toBe(false);
  });
});
