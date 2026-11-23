import { mergeProfiles, parseResumeText, toYearMonth } from "@/parsing/resume";
import { emptyProfile } from "@/shared/schema";

const SAMPLE = `
Ada Lovelace
Baltimore, MD 21201 | (555) 123-4567 | ada@example.com
linkedin.com/in/adalovelace | github.com/ada | ada.dev

SUMMARY
Backend engineer focused on data systems.

EXPERIENCE
Senior Engineer - Acme Corp    June 2020 - Present
• Built ingestion pipelines processing events daily
• Led migration to Postgres

Globex Inc
Software Engineer    Jan 2018 - May 2020
• Wrote internal tooling

EDUCATION
University of Maryland, College Park    2014 - 2018
B.S. in Computer Science, GPA: 3.8

SKILLS
Languages: TypeScript, Python, Go
Tools: Postgres, Docker

CERTIFICATIONS
AWS Certified Developer
`;

describe("parseResumeText", () => {
  const p = parseResumeText(SAMPLE);

  it("extracts contact details", () => {
    expect(p.personal.firstName).toBe("Ada");
    expect(p.personal.lastName).toBe("Lovelace");
    expect(p.personal.email).toBe("ada@example.com");
    expect(p.personal.phone).toBe("5551234567");
    expect(p.personal.city).toBe("Baltimore");
    expect(p.personal.state).toBe("MD");
    expect(p.personal.postalCode).toBe("21201");
    expect(p.personal.linkedin).toBe("https://linkedin.com/in/adalovelace");
    expect(p.personal.github).toBe("https://github.com/ada");
    expect(p.personal.website).toBe("https://ada.dev");
  });

  it("extracts jobs with dates and bullets", () => {
    expect(p.employment).toHaveLength(2);
    expect(p.employment[0]).toMatchObject({ company: "Acme Corp", title: "Senior Engineer", startDate: "2020-06", current: true });
    expect(p.employment[0]!.description).toContain("Postgres");
    expect(p.employment[1]).toMatchObject({ company: "Globex Inc", title: "Software Engineer", startDate: "2018-01", endDate: "2020-05" });
  });

  it("extracts education", () => {
    expect(p.education).toHaveLength(1);
    expect(p.education[0]).toMatchObject({ school: "University of Maryland, College Park", degree: "B.S.", field: "Computer Science", gpa: "3.8", endDate: "2018" });
  });

  it("extracts skills and certifications", () => {
    expect(p.skills).toEqual(expect.arrayContaining(["TypeScript", "Python", "Postgres"]));
    expect(p.certifications).toContain("AWS Certified Developer");
    expect(p.summary).toContain("Backend");
  });

  it("returns an empty profile for empty text", () => {
    expect(parseResumeText("").employment).toEqual([]);
  });
});

describe("toYearMonth", () => {
  it("handles common formats", () => {
    expect(toYearMonth("Sept 2021")).toBe("2021-09");
    expect(toYearMonth("03/2019")).toBe("2019-03");
    expect(toYearMonth("2017")).toBe("2017");
    expect(toYearMonth("soon")).toBe("");
  });
});

describe("mergeProfiles", () => {
  it("only fills empty values in fill mode", () => {
    const base = emptyProfile();
    base.personal.firstName = "Grace";
    const inc = parseResumeText(SAMPLE);
    const merged = mergeProfiles(base, inc, "fill");
    expect(merged.personal.firstName).toBe("Grace");
    expect(merged.personal.email).toBe("ada@example.com");
    expect(merged.employment).toHaveLength(2);
  });
  it("replaces in replace mode", () => {
    const base = emptyProfile();
    base.personal.firstName = "Grace";
    expect(mergeProfiles(base, parseResumeText(SAMPLE), "replace").personal.firstName).toBe("Ada");
  });
});
