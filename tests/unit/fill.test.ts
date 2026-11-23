import { applyCheck, applyFile, applyText, readField, verify, acceptsFile } from "@/content/fill";
import { scan } from "./helpers";

describe("fill", () => {
  it("fills text and fires framework events", async () => {
    const [f] = scan(`<input id="a">`);
    const events: string[] = [];
    for (const t of ["input", "change", "blur"]) f!.el.addEventListener(t, () => events.push(t));
    await applyText(f!, ["Ada"]);
    expect((f!.el as HTMLInputElement).value).toBe("Ada");
    expect(events).toContain("input");
    expect(events).toContain("change");
    expect(await verify(f!, ["Ada"])).toBe(true);
  });

  it("detects when a controlled input discards the value", async () => {
    const [f] = scan(`<input id="a">`);
    const el = f!.el as HTMLInputElement;
    el.addEventListener("input", () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(el, "");
    });
    await applyText(f!, ["Ada"]);
    expect(await verify(f!, ["Ada"])).toBe(false);
  });

  it("accepts masked phone numbers", async () => {
    const [f] = scan(`<input id="a">`);
    const el = f!.el as HTMLInputElement;
    el.addEventListener("input", () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(el, "(555) 123-4567");
    });
    await applyText(f!, ["5551234567"]);
    expect(await verify(f!, ["5551234567"])).toBe(true);
  });

  it("selects the matching option", async () => {
    const [f] = scan(`<select><option value="">Select</option><option value="us">United States</option><option value="ca">Canada</option></select>`);
    expect(await applyText(f!, ["USA", "United States"])).toBe("verified");
    expect((f!.el as HTMLSelectElement).value).toBe("us");
    expect(await verify(f!, ["USA", "United States"])).toBe(true);
  });

  it("reports no match for selects instead of guessing", async () => {
    const [f] = scan(`<select><option>Red</option><option>Green</option></select>`);
    expect(await applyText(f!, ["Blue"])).toBe("nomatch");
  });

  it("picks a radio option", async () => {
    const [f] = scan(`<fieldset><legend>Authorized?</legend><label><input type="radio" name="r" value="y"> Yes</label><label><input type="radio" name="r" value="n"> No</label></fieldset>`);
    expect(f!.options).toHaveLength(2);
    await applyText(f!, ["No"]);
    expect(readField(f!)).toBe("No");
    expect(await verify(f!, ["No"])).toBe(true);
  });

  it("toggles checkboxes to the requested state", async () => {
    const [f] = scan(`<label><input type="checkbox"> I currently work here</label>`);
    await applyCheck(f!, true);
    expect(await verify(f!, true)).toBe(true);
    await applyCheck(f!, false);
    expect(await verify(f!, false)).toBe(true);
  });

  it("drives a custom combobox", async () => {
    document.body.innerHTML = `
      <label for="c">Country</label>
      <input id="c" role="combobox" aria-controls="lb">
      <ul id="lb" role="listbox" hidden>
        <li role="option">Canada</li>
        <li role="option">United States</li>
      </ul>`;
    const input = document.getElementById("c") as HTMLInputElement;
    const lb = document.getElementById("lb")!;
    input.addEventListener("click", () => (lb.hidden = false));
    lb.querySelectorAll("li").forEach((li) =>
      li.addEventListener("click", () => {
        input.value = li.textContent!;
        lb.hidden = true;
      }),
    );
    const { scanFields } = await import("@/content/fields");
    const [f] = scanFields(document);
    expect(f!.kind).toBe("combobox");
    expect(await applyText(f!, ["United States"])).toBe("verified");
    expect(await verify(f!, ["United States"])).toBe(true);
  });

  it("leaves a combobox empty when no option matches", async () => {
    document.body.innerHTML = `<input id="c" role="combobox" aria-controls="lb"><ul id="lb" role="listbox"><li role="option">Canada</li></ul>`;
    const { scanFields } = await import("@/content/fields");
    const [f] = scanFields(document);
    expect(await applyText(f!, ["Atlantis"])).toBe("nomatch");
    expect((f!.el as HTMLInputElement).value).toBe("");
  });

  it("attaches a file and respects accept", async () => {
    const [f] = scan(`<input type="file" accept=".pdf">`);
    let held: FileList | null = null;
    Object.defineProperty(f!.el, "files", { get: () => held, set: (v) => (held = v) });
    const data = new TextEncoder().encode("x").buffer as ArrayBuffer;
    expect(await applyFile(f!, { name: "cv.pdf", type: "application/pdf", data })).toBe("verified");
    expect((f!.el as HTMLInputElement).files).toHaveLength(1);
    expect(acceptsFile(".pdf,.docx", { name: "cv.txt", type: "text/plain" })).toBe(false);
    expect(acceptsFile("application/*", { name: "cv.pdf", type: "application/pdf" })).toBe(true);
  });
});
