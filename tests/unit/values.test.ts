import { classify } from "@/content/classify";
import { assignSections, formatDate, resolveValue } from "@/content/values";
import { blankEducation, blankEmployment, emptyProfile } from "@/shared/schema";
import { scan } from "./helpers";

const profile = () => {
  const p = emptyProfile();
  p.personal.firstName = "Ada";
  p.personal.lastName = "Lovelace";
  p.personal.state = "MD";
  p.preferences.authorizedToWork = "yes";
  p.employment = [
    { ...blankEmployment(), company: "Acme", title: "Engineer", startDate: "2020-06", endDate: "2022-03" },
    { ...blankEmployment(), company: "Globex", title: "Lead", startDate: "2022-04", current: true },
  ];
  p.education = [{ ...blankEducation(), school: "UMD", degree: "B.S.", endDate: "2019-05" }];
  return p;
};

describe("formatDate", () => {
  const [f] = scan(`<input type="text" placeholder="MM/YYYY">`);
  it("follows placeholder hints", () => {
    expect(formatDate("2020-06", "full", f!)).toEqual(["06/2020", "June 2020", "2020-06"]);
  });
  it("formats native date and month inputs", () => {
    const [d] = scan(`<input type="date">`);
    const [m] = scan(`<input type="month">`);
    expect(formatDate("2020-06", "full", d!)).toEqual(["2020-06-01"]);
    expect(formatDate("2020-06", "full", m!)).toEqual(["2020-06"]);
  });
  it("splits months and years", () => {
    expect(formatDate("2020-06", "month", f!)[0]).toBe("June");
    expect(formatDate("2020-06", "year", f!)).toEqual(["2020"]);
  });
  it("rejects invalid input", () => {
    expect(formatDate("June 2020", "full", f!)).toEqual([]);
  });
});

describe("resolveValue", () => {
  it("returns the full name from parts", () => {
    const f = scan(`<label for="a">Full name</label><input id="a">`)[0]!;
    const r = resolveValue(classify(f)!, f, profile(), { employment: 0, education: 0 });
    expect(r).toEqual({ type: "text", candidates: ["Ada Lovelace"] });
  });

  it("returns null for empty profile values", () => {
    const f = scan(`<label for="a">Email</label><input id="a">`)[0]!;
    expect(resolveValue(classify(f)!, f, profile(), { employment: 0, education: 0 })).toBeNull();
  });

  it("skips the end date for a current job", () => {
    const f = scan(`<section><h3>Experience</h3><label for="a">End date</label><input id="a"></section>`)[0]!;
    const c = classify(f)!;
    expect(resolveValue(c, f, profile(), { employment: 1, education: 0 })).toBeNull();
  });

  it("never invents values not in the profile", () => {
    const f = scan(`<label for="a">Salary expectation</label><input id="a">`)[0]!;
    expect(resolveValue(classify(f)!, f, profile(), { employment: 0, education: 0 })).toBeNull();
  });
});

describe("assignSections", () => {
  it("advances the index when a section repeats", () => {
    const fields = scan(`
      <section><h3>Work Experience</h3>
        <label for="c1">Company</label><input id="c1">
        <label for="t1">Job title</label><input id="t1">
      </section>
      <section><h3>Work Experience</h3>
        <label for="c2">Company</label><input id="c2">
        <label for="t2">Job title</label><input id="t2">
      </section>`);
    const items = fields.map((f) => ({ f, c: classify(f) }));
    const map = assignSections(items);
    expect(map.get(fields[0]!.id)?.employment).toBe(0);
    expect(map.get(fields[1]!.id)?.employment).toBe(0);
    expect(map.get(fields[2]!.id)?.employment).toBe(1);
    expect(map.get(fields[3]!.id)?.employment).toBe(1);
  });
});
