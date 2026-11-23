# Architecture

## Processes

- **Content script** (`src/content`) runs in every frame of http and https pages. It scans for fields, classifies them, fills them, and verifies the result. It has no direct access to stored data.
- **Service worker** (`src/background`) owns IndexedDB access and the local model. The content script asks it for data through `chrome.runtime.sendMessage`.
- **Options page and popup** (`src/options`, `src/popup`) are React apps that read and write storage directly.

## Fill pipeline

1. `scanFields` walks the document and open shadow roots and returns `Field` records: kind, label, name, options, current state.
2. `classify` maps each field to a profile key using autocomplete tokens, then label, name, id, placeholder, and surrounding headings. Education and employment fields are told apart by context.
3. `assignSections` advances the job or school index each time a section's keys repeat, so the second job block receives the second job.
4. For each field the engine picks a source in this order: remembered answer, profile value, model answer.
5. `fill` writes through native property setters, dispatches the events frameworks listen to, and drives ARIA listboxes by opening them, typing, and clicking the matching option.
6. `verify` reads the value back after a short delay. A field that did not keep its value is retried once, then reported as not accepted.

Existing values are left alone unless overwrite is enabled. Fields the user edits are tracked and skipped.

## Dynamic pages

A debounced `MutationObserver` shows the chip when the page looks like an application. After the user fills once, new fields that appear are filled with the same pipeline.

## Local model

`src/background/llm.ts` loads a WebLLM engine in the service worker after the user approves the download. `src/shared/ai.ts` builds the prompt from a digest of the profile and validates the reply with Zod. `src/shared/grounding.ts` rejects answers that contain numbers or proper nouns absent from the profile and blocks sensitive question topics before the model is called.

## Data

Dexie tables: `profile`, `answers`, `resume`, `settings`. Answer keys are the normalized question text plus the sorted option labels, so the same question with different options does not collide.

## Build

`scripts/build.mjs` runs three Vite builds: HTML pages as ES modules, the service worker as a single ES file, and the content script as a self-contained IIFE. The manifest version comes from `package.json`.
