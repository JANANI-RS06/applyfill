import { matchOption, norm, stateVariants, degreeVariants } from "@/content/match";
import type { FieldOption } from "@/content/fields";

const opts = (...labels: string[]): FieldOption[] =>
  labels.map((label) => ({ label, value: label, el: document.createElement("option") }));

describe("matchOption", () => {
  it("matches exact labels case-insensitively", () => {
    expect(matchOption(opts("Canada", "Mexico"), ["canada"])?.label).toBe("Canada");
  });

  it("treats country aliases as equal", () => {
    expect(matchOption(opts("Canada", "United States of America"), ["USA", "United States"])?.label).toBe("United States of America");
  });

  it("answers yes and no without matching 'not'", () => {
    const o = opts("Yes, I am authorized", "No, I am not authorized");
    expect(matchOption(o, ["Yes"])?.label).toBe("Yes, I am authorized");
    expect(matchOption(o, ["No"])?.label).toBe("No, I am not authorized");
    expect(matchOption(opts("Not sure", "Maybe"), ["No"])).toBeNull();
  });

  it("never guesses when nothing is close", () => {
    expect(matchOption(opts("Red", "Green"), ["Blue"])).toBeNull();
  });

  it("matches degree levels", () => {
    const o = opts("High School", "Bachelor's Degree", "Master's Degree");
    expect(matchOption(o, degreeVariants("B.S. Computer Science"))?.label).toBe("Bachelor's Degree");
    expect(matchOption(o, degreeVariants("MS"))?.label).toBe("Master's Degree");
  });

  it("expands state abbreviations both ways", () => {
    expect(stateVariants("MD")).toContain("maryland");
    expect(stateVariants("Maryland")).toContain("MD");
    expect(matchOption(opts("Maryland", "Virginia"), stateVariants("MD"))?.label).toBe("Maryland");
  });

  it("ignores placeholder options", () => {
    expect(matchOption(opts("Select...", "Male", "Female"), ["Female"])?.label).toBe("Female");
  });

  it("maps gender synonyms", () => {
    expect(matchOption(opts("Man", "Woman"), ["Female"])?.label).toBe("Woman");
  });

  it("normalizes text", () => {
    expect(norm("  O’Brien, Jr. ")).toBe("obrien jr");
  });
});
