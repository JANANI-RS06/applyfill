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

test("imports a DOCX resume", async () => {
  const JSZip = (await import("jszip")).default;
  const zip = new JSZip();
  zip.file("[Content_Types].xml", `<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>`);
  zip.file("_rels/.rels", `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`);
  const para = (t: string) => `<w:p><w:r><w:t>${t}</w:t></w:r></w:p>`;
  const lines = ["Grace Hopper", "Arlington, VA 22201 | grace@example.com", "SKILLS", "COBOL, Compilers"];
  zip.file("word/document.xml", `<?xml version="1.0" encoding="UTF-8"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${lines.map(para).join("")}</w:body></w:document>`);
  const buffer = await zip.generateAsync({ type: "nodebuffer" });

  const page = await open();
  await page.getByRole("tab", { name: "Resume" }).click();
  await page.locator('input[type="file"]').setInputFiles({ name: "grace.docx", mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", buffer });
  await expect(page.getByLabel("First name")).toHaveValue("Grace", { timeout: 20_000 });
  await expect(page.getByLabel("Email")).toHaveValue("grace@example.com");
});
