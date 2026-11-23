import { test, expect, type BrowserContext } from "@playwright/test";
import { launch, seed } from "./helpers";

let context: BrowserContext;
let extensionId: string;

test.beforeEach(async () => {
  ({ context, extensionId } = await launch());
});
test.afterEach(async () => {
  await context.close();
});

const seeded = async () => {
  const opts = await seed(context, extensionId);
  await opts.close();
};

test("fills a standard application form and verifies the result", async () => {
  const pdf = Array.from(new TextEncoder().encode("%PDF-1.4 test"));
  const opts = await seed(context, extensionId, { resume: { name: "ada.pdf", type: "application/pdf", bytes: pdf } });
  await opts.close();

  const page = await context.newPage();
  await page.goto("/basic.html");
  await page.getByRole("button", { name: "Fill application" }).click();
  await expect(page.getByText(/Filled \d+/)).toBeVisible({ timeout: 15_000 });

  await expect(page.locator("#first_name")).toHaveValue("Ada");
  await expect(page.locator("#last_name")).toHaveValue("Lovelace");
  await expect(page.locator("#email")).toHaveValue("ada@example.com");
  await expect(page.locator("#phone")).toHaveValue("5551234567");
  await expect(page.locator("#linkedin")).toHaveValue("https://linkedin.com/in/ada");
  await expect(page.locator("#country")).toHaveValue("United States");
  await expect(page.locator('input[name="auth"][value="yes"]')).toBeChecked();
  await expect(page.locator('input[name="sponsor"][value="no"]')).toBeChecked();
  await expect(page.locator("#school")).toHaveValue("University of Maryland");
  await expect(page.locator("#degree")).toHaveValue("Bachelor's Degree");
  await expect(page.locator("#fav")).toHaveValue("");
  expect(await page.locator("#resume").evaluate((el: HTMLInputElement) => el.files?.[0]?.name)).toBe("ada.pdf");
  await page.close();
});

test("remembers an answer typed by the user and reuses it", async () => {
  await seeded();
  const page = await context.newPage();
  await page.goto("/basic.html");
  await page.getByRole("button", { name: "Fill application" }).waitFor();
  await page.locator("#fav").click();
  await page.keyboard.type("functional");
  await page.keyboard.press("Tab");
  await page.waitForTimeout(500);
  await page.reload();
  await page.getByRole("button", { name: "Fill application" }).click();
  await expect(page.locator("#fav")).toHaveValue("functional", { timeout: 15_000 });
  await page.close();
});

test("does not overwrite values the user typed", async () => {
  await seeded();
  const page = await context.newPage();
  await page.goto("/basic.html");
  await page.locator("#first_name").fill("Grace");
  await page.getByRole("button", { name: "Fill application" }).click();
  await expect(page.locator("#last_name")).toHaveValue("Lovelace", { timeout: 15_000 });
  await expect(page.locator("#first_name")).toHaveValue("Grace");
  await page.close();
});

test("handles custom dropdowns, controlled inputs, and later steps", async () => {
  await seeded();
  const page = await context.newPage();
  await page.goto("/dynamic.html");
  await page.getByRole("button", { name: "Fill application" }).click();
  await expect(page.locator("#fn")).toHaveValue("Ada", { timeout: 15_000 });
  await expect(page.locator("#ph")).toHaveValue("5551234567");
  await expect(page.locator("#cb")).toHaveValue("United States of America");

  await page.locator("#next").click();
  await expect(page.locator("#co1")).toHaveValue("Acme Corp", { timeout: 15_000 });
  await expect(page.locator("#ti1")).toHaveValue("Senior Engineer");
  await expect(page.locator("#sd1")).toHaveValue("06/2020");
  await expect(page.locator("#co2")).toHaveValue("Globex");
  await expect(page.locator("#ed2")).toHaveValue("05/2020");
  await expect(page.locator("#locked")).toHaveValue("");
  await page.close();
});

test("fills fields inside open shadow roots", async () => {
  await seeded();
  const page = await context.newPage();
  await page.goto("/shadow.html");
  await page.getByRole("button", { name: "Fill application" }).click();
  await expect(page.locator("#a")).toHaveValue("Ada", { timeout: 15_000 });
  await expect(page.locator("#c")).toHaveValue("ada@example.com");
  await page.close();
});

test("never submits the form", async () => {
  await seeded();
  const page = await context.newPage();
  await page.goto("/basic.html");
  let submitted = false;
  await page.exposeFunction("markSubmit", () => (submitted = true));
  await page.evaluate(() => document.getElementById("app")!.addEventListener("submit", () => (window as any).markSubmit()));
  await page.getByRole("button", { name: "Fill application" }).click();
  await expect(page.locator("#first_name")).toHaveValue("Ada", { timeout: 15_000 });
  expect(submitted).toBe(false);
  await page.close();
});

test("fills the active tab when asked from the extension and reports the result", async () => {
  await seeded();
  const page = await context.newPage();
  await page.goto("/basic.html");
  await page.getByRole("button", { name: "Fill application" }).waitFor();
  const ext = await context.newPage();
  await ext.goto(`chrome-extension://${extensionId}/src/popup/index.html`);
  const tabId = await ext.evaluate(async () => {
    for (const t of await chrome.tabs.query({})) {
      const alive = await chrome.tabs.sendMessage(t.id!, { type: "ping" }).catch(() => null);
      if (!alive) continue;
      await chrome.tabs.sendMessage(t.id!, { type: "fill" });
      return t.id!;
    }
    throw new Error("no tab with the content script");
  });
  await expect(page.locator("#first_name")).toHaveValue("Ada");
  const reports = await ext.evaluate(
    (id) => new Promise<Record<string, { fields: { status: string }[] }>>((res) =>
      chrome.runtime.sendMessage({ type: "report:get", tabId: id }, (r) => res(r.data))),
    tabId,
  );
  const fields = Object.values(reports).flatMap((r) => r.fields);
  expect(fields.filter((f) => f.status === "verified").length).toBeGreaterThan(8);
  await page.close();
});
