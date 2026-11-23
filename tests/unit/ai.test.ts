import { validateAnswer, extractJson, buildMessages } from "@/shared/ai";
import { isGrounded, isSensitiveQuestion } from "@/shared/grounding";
import { blankEmployment, emptyProfile } from "@/shared/schema";

const profile = () => {
  const p = emptyProfile();
  p.personal.firstName = "Ada";
  p.skills = ["TypeScript", "Postgres"];
  p.employment = [{ ...blankEmployment(), company: "Acme", title: "Engineer", startDate: "2020-06" }];
  p.summary = "Backend engineer focused on data systems.";
  return p;
};

const reply = (o: object) => JSON.stringify(o);
const text = { question: "Describe your background", options: [], kind: "textarea" as const };

describe("grounding", () => {
  it("accepts answers made of profile facts", () => {
    expect(isGrounded("I work at Acme as an Engineer using TypeScript.", profile())).toBe(true);
  });
  it("rejects invented employers and numbers", () => {
    expect(isGrounded("I worked at Initech for 12 years.", profile())).toBe(false);
    expect(isGrounded("I led a team of 40 at Acme.", profile())).toBe(false);
  });
  it("flags sensitive questions", () => {
    expect(isSensitiveQuestion("Have you ever been convicted of a felony?")).toBe(true);
    expect(isSensitiveQuestion("Describe your background")).toBe(false);
  });
});

describe("validateAnswer", () => {
  it("accepts a grounded confident answer", () => {
    const r = validateAnswer(reply({ answer: "I build data systems at Acme.", confident: true, source: "profile" }), profile(), text);
    expect(r?.answer).toContain("Acme");
  });
  it("rejects low confidence and unknown sources", () => {
    expect(validateAnswer(reply({ answer: "x", confident: false, source: "profile" }), profile(), text)).toBeNull();
    expect(validateAnswer(reply({ answer: "x", confident: true, source: "unknown" }), profile(), text)).toBeNull();
  });
  it("rejects fabricated facts", () => {
    const r = validateAnswer(reply({ answer: "I spent 9 years at Hooli.", confident: true, source: "profile" }), profile(), text);
    expect(r).toBeNull();
  });
  it("requires choice answers to be one of the options", () => {
    const req = { question: "Primary language", options: ["TypeScript", "Go"], kind: "choice" as const };
    expect(validateAnswer(reply({ answer: "typescript", confident: true, source: "profile" }), profile(), req)?.answer).toBe("TypeScript");
    expect(validateAnswer(reply({ answer: "Rust", confident: true, source: "profile" }), profile(), req)).toBeNull();
  });
  it("never answers sensitive questions", () => {
    const req = { question: "What is your gender?", options: ["Male", "Female"], kind: "choice" as const };
    expect(validateAnswer(reply({ answer: "Male", confident: true, source: "profile" }), profile(), req)).toBeNull();
  });
  it("tolerates prose around the JSON and rejects garbage", () => {
    expect(extractJson('Sure! {"answer":"a"} done')).toEqual({ answer: "a" });
    expect(extractJson("no json")).toBeNull();
    expect(validateAnswer("nope", profile(), text)).toBeNull();
  });
  it("builds a prompt that contains the profile and options", () => {
    const m = buildMessages(profile(), { question: "Q?", options: ["A", "B"], kind: "choice" });
    expect(m[1]!.content).toContain("Acme");
    expect(m[1]!.content).toContain('"A", "B"');
  });
});
