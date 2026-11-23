import { test, expect, type BrowserContext } from "@playwright/test";
import { launch } from "./helpers";
import { makePdf } from "./pdf";

let context: BrowserContext;
let extensionId: string;

test.beforeEach(async () => {
  ({ context, extensionId } = await launch());
});
test.afterEach(async () => {
  await context.close();
});

const open = async () => {
  const page = await context.newPage();
  await page.goto(`chrome-extension://${extensionId}/src/options/index.html`);
  return page;
};

test("saves and restores a profile", async () => {
  const page = await open();
  await page.getByLabel("First name").fill("Ada");
  await page.getByLabel("Last name").fill("Lovelace");
  await page.getByLabel("Email").fill("ada@example.com");
  await page.getByRole("button", { name: "Add job" }).click();
  await page.getByLabel("Company").fill("Acme");
  await page.getByRole("button", { name: "Save profile" }).click();
  await expect(page.getByText("Unsaved changes")).toBeHidden();
  await page.reload();
  await expect(page.getByLabel("First name")).toHaveValue("Ada");
  await expect(page.getByLabel("Company")).toHaveValue("Acme");
});

test("rejects malformed dates without losing edits", async () => {
  const page = await open();
  await page.getByRole("button", { name: "Add job" }).click();
  await page.getByLabel("Start (YYYY-MM)").fill("June 2020");
  await page.getByRole("button", { name: "Save profile" }).click();
  await expect(page.getByText(/not in YYYY/)).toBeVisible();
  await expect(page.getByLabel("Start (YYYY-MM)")).toHaveValue("June 2020");
});

test("imports a PDF resume into a reviewable draft", async () => {
  const page = await open();
  await page.getByRole("tab", { name: "Resume" }).click();
  const pdf = makePdf([
    "Ada Lovelace",
    "Baltimore, MD 21201 | (555) 123-4567 | ada@example.com",
    "EXPERIENCE",
    "Senior Engineer - Acme Corp June 2020 - Present",
    "- Built ingestion pipelines",
    "EDUCATION",
    "University of Maryland 2014 - 2018",
    "B.S. in Computer Science",
    "SKILLS",
    "TypeScript, Python",
  ]);
  await page.locator('input[type="file"]').setInputFiles({ name: "ada.pdf", mimeType: "application/pdf", buffer: pdf });
  await expect(page.getByLabel("First name")).toHaveValue("Ada", { timeout: 20_000 });
  await expect(page.getByLabel("Email")).toHaveValue("ada@example.com");
  await expect(page.getByLabel("Company")).toHaveValue("Acme Corp");
  await expect(page.getByText("Unsaved changes")).toBeVisible();
});

test("popup prompts for a profile when none exists", async () => {
  const page = await context.newPage();
  await page.goto(`chrome-extension://${extensionId}/src/popup/index.html`);
  await expect(page.getByText(/Add your name and email/)).toBeVisible();
});

test("model panel explains the fallback and never downloads without approval", async () => {
  const page = await open();
  await page.getByRole("tab", { name: "Model" }).click();
  await expect(page.getByRole("heading", { name: "Local model" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Approve download" })).toBeVisible();
});
