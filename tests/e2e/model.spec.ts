import { test, expect } from "@playwright/test";
import { chromium } from "@playwright/test";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { DIST, seed } from "./helpers";

test.skip(!process.env.RUN_MODEL_TEST, "Set RUN_MODEL_TEST=1 to download a model and run it");
test.setTimeout(900_000);

test("local model answers from the profile and refuses to invent", async () => {
  const context = await chromium.launchPersistentContext(join(tmpdir(), "applyfill-model-cache"), {
    channel: "chromium",
    headless: true,
    args: [`--disable-extensions-except=${DIST}`, `--load-extension=${DIST}`, "--enable-unsafe-webgpu"],
  });
  let [sw] = context.serviceWorkers();
  if (!sw) sw = await context.waitForEvent("serviceworker");
  const id = new URL(sw.url()).host;
  const seeded = await seed(context, id);
  await seeded.close();

  const page = await context.newPage();
  await page.goto(`chrome-extension://${id}/src/options/index.html`);
  await page.getByRole("tab", { name: "Model" }).click();
  await page.getByLabel("Model").selectOption("Qwen2.5-0.5B-Instruct-q4f16_1-MLC");
  const approve = page.getByRole("button", { name: "Approve download" });
  if (await approve.isVisible()) await approve.click();
  await expect(page.getByText("Model loaded.")).toBeVisible({ timeout: 800_000 });

  const ask = (request: object) =>
    page.evaluate(
      (r) => new Promise((res) => chrome.runtime.sendMessage({ type: "ai:ask", request: r }, res)),
      request,
    ) as Promise<{ ok: boolean; data: { answer: string } | null }>;

  const choice = await ask({ question: "What is your strongest programming language?", options: ["Go", "TypeScript", "Rust"], kind: "choice" });
  expect(choice.ok).toBe(true);
  if (choice.data) expect(["Go", "TypeScript", "Rust"]).toContain(choice.data.answer);

  const sensitive = await ask({ question: "What is your gender?", options: ["Male", "Female"], kind: "choice" });
  expect(sensitive.data).toBeNull();

  const free = await ask({ question: "Briefly describe your professional background", options: [], kind: "textarea" });
  expect(free.ok).toBe(true);
  if (free.data) expect(free.data.answer).not.toMatch(/Initech|Hooli|Google/);
  await context.close();
});
