import { classify } from "@/content/classify";
import { scan } from "./helpers";

const key = (html: string) => classify(scan(html)[0]!)?.key ?? null;

describe("classify", () => {
  it("uses autocomplete first", () => {
    expect(key(`<input autocomplete="given-name" aria-label="Whatever">`)).toBe("personal.firstName");
  });

  it("maps common personal labels", () => {
    expect(key(`<label for="a">First Name *</label><input id="a">`)).toBe("personal.firstName");
    expect(key(`<label for="a">Last name</label><input id="a">`)).toBe("personal.lastName");
    expect(key(`<label for="a">Email Address</label><input id="a">`)).toBe("personal.email");
    expect(key(`<label for="a">Mobile phone</label><input id="a">`)).toBe("personal.phone");
    expect(key(`<label for="a">LinkedIn Profile</label><input id="a">`)).toBe("personal.linkedin");
    expect(key(`<label for="a">ZIP / Postal code</label><input id="a">`)).toBe("personal.postalCode");
  });

  it("reads names from attributes when no label exists", () => {
    expect(key(`<input name="firstName">`)).toBe("personal.firstName");
    expect(key(`<input name="user_email">`)).toBe("personal.email");
  });

  it("does not confuse company name with a person name", () => {
    expect(key(`<label for="a">Company name</label><input id="a">`)).toBe("employment.company");
    expect(key(`<label for="a">Full name</label><input id="a">`)).toBe("personal.fullName");
  });

  it("separates education from employment by context", () => {
    expect(key(`<section><h3>Education</h3><label for="a">School</label><input id="a"></section>`)).toBe("education.school");
    expect(key(`<section><h3>Work Experience</h3><label for="a">Title</label><input id="a"></section>`)).toBe("employment.title");
    expect(key(`<section><h3>Education</h3><label for="a">Start date</label><input id="a"></section>`)).toBe("education.startDate");
  });

  it("detects month and year parts", () => {
    const f = scan(`<section><h3>Experience</h3><label for="a">Start Month</label><input id="a"></section>`)[0]!;
    expect(classify(f)).toMatchObject({ key: "employment.startDate", part: "month" });
    const g = scan(`<section><h3>Experience</h3><label for="a">End Year</label><input id="a"></section>`)[0]!;
    expect(classify(g)).toMatchObject({ key: "employment.endDate", part: "year" });
  });

  it("maps work authorization and sponsorship", () => {
    expect(key(`<label for="a">Are you legally authorized to work in the United States?</label><select id="a"><option>Yes</option></select>`)).toBe("pref.authorizedToWork");
    expect(key(`<label for="a">Will you now or in the future require visa sponsorship?</label><select id="a"><option>Yes</option></select>`)).toBe("pref.requiresSponsorship");
  });

  it("maps resume uploads", () => {
    expect(key(`<label for="a">Resume/CV</label><input id="a" type="file">`)).toBe("file.resume");
    expect(key(`<label for="a">Cover letter</label><input id="a" type="file">`)).toBe("file.coverLetter");
  });

  it("returns null for unknown questions", () => {
    expect(key(`<label for="a">What is your favorite color?</label><input id="a">`)).toBeNull();
  });
});
