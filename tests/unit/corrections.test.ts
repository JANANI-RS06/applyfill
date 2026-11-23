import { classify } from "@/content/classify";
import { displayValue, shouldRemember } from "@/content/corrections";
import { emptyProfile } from "@/shared/schema";
import { scan } from "./helpers";

const profile = () => {
  const p = emptyProfile();
  p.personal.firstName = "Ada";
  return p;
};

describe("shouldRemember", () => {
  it("remembers answers to unknown questions", () => {
    const f = scan(`<label for="a">Favorite language</label><input id="a">`)[0]!;
    expect(shouldRemember(f, classify(f), "Rust", profile())).toBe(true);
  });
  it("ignores values that match the profile", () => {
    const f = scan(`<label for="a">First name</label><input id="a">`)[0]!;
    expect(shouldRemember(f, classify(f), "Ada", profile())).toBe(false);
  });
  it("remembers a real correction of a profile field", () => {
    const f = scan(`<label for="a">First name</label><input id="a">`)[0]!;
    expect(shouldRemember(f, classify(f), "Ada L.", profile())).toBe(true);
  });
  it("never stores repeated section fields", () => {
    const f = scan(`<section><h3>Experience</h3><label for="a">Company</label><input id="a"></section>`)[0]!;
    expect(shouldRemember(f, classify(f), "Acme", profile())).toBe(false);
  });
  it("never stores sensitive answers or empty values", () => {
    const f = scan(`<label for="a">Social security number</label><input id="a">`)[0]!;
    expect(shouldRemember(f, classify(f), "123", profile())).toBe(false);
    const g = scan(`<label for="a">Anything else</label><input id="a">`)[0]!;
    expect(shouldRemember(g, classify(g), "  ", profile())).toBe(false);
  });
  it("reads display text for selects", () => {
    const f = scan(`<label for="a">Level</label><select id="a"><option value="1">Senior</option></select>`)[0]!;
    expect(displayValue(f, f.el)).toBe("Senior");
  });
});
