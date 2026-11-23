import { emptyProfile, profileSchema, employmentSchema, blankEmployment } from "@/shared/schema";

describe("profile schema", () => {
  it("builds an empty profile with defaults", () => {
    const p = emptyProfile();
    expect(p.personal.firstName).toBe("");
    expect(p.employment).toEqual([]);
    expect(p.preferences.authorizedToWork).toBe("");
  });

  it("trims strings", () => {
    const p = profileSchema.parse({ personal: { firstName: "  Ada " } });
    expect(p.personal.firstName).toBe("Ada");
  });

  it("rejects malformed dates", () => {
    const r = employmentSchema.safeParse({ ...blankEmployment(), startDate: "June 2020" });
    expect(r.success).toBe(false);
  });

  it("accepts year and year-month", () => {
    expect(employmentSchema.safeParse({ ...blankEmployment(), startDate: "2020" }).success).toBe(true);
    expect(employmentSchema.safeParse({ ...blankEmployment(), startDate: "2020-06" }).success).toBe(true);
  });
});
