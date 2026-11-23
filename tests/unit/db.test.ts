import { db, loadProfile, saveProfile, questionKey, rememberAnswer, recallAnswer, loadSettings, saveSettings, eraseAll } from "@/shared/db";
import { emptyProfile } from "@/shared/schema";

beforeEach(async () => {
  await eraseAll();
});

describe("storage", () => {
  it("round-trips a profile", async () => {
    const p = emptyProfile();
    p.personal.firstName = "Ada";
    await saveProfile(p);
    expect((await loadProfile()).personal.firstName).toBe("Ada");
  });

  it("returns an empty profile when nothing is stored", async () => {
    expect((await loadProfile()).personal.email).toBe("");
  });

  it("normalizes question keys", () => {
    expect(questionKey("Are you authorized to work? *")).toBe(questionKey("are you authorized to work"));
    expect(questionKey("Q", ["B", "A"])).toBe(questionKey("Q", ["A", "B"]));
  });

  it("remembers and replaces corrections", async () => {
    await rememberAnswer("Preferred pronouns", "she/her");
    await rememberAnswer("Preferred pronouns", "they/them");
    const hit = await recallAnswer("preferred pronouns");
    expect(hit?.answer).toBe("they/them");
    expect(await db.answers.count()).toBe(1);
  });

  it("merges settings over defaults", async () => {
    await saveSettings({ overwrite: true });
    const s = await loadSettings();
    expect(s.overwrite).toBe(true);
    expect(s.showChip).toBe(true);
  });
});
