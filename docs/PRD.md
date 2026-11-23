# Product Requirements

## Problem

Job applications repeat the same fields across hundreds of sites: contact details, work history, education, links, work authorization, and free-text questions. Existing autofill tools either miss fields on dynamic forms, send personal data to a server, or fill values the site silently rejects.

## Product

ApplyFill is a Chrome extension that fills job application forms from a structured local profile. Everything runs on the user's device. There is no backend, account, analytics, or remote API.

## Users

- Job seekers applying to many roles through applicant tracking systems and company career pages.
- Privacy-conscious users who do not want resume data stored by a third party.

## Goals

1. Fill common application fields accurately, including multi-step and dynamically rendered forms.
2. Keep all data local, including resume parsing and model inference.
3. Confirm every fill by reading the value back after the site's framework has processed it.
4. Learn from corrections without guessing at facts the user never provided.
5. Stay out of the way: no popups on page load, no automatic submission.

## Non-goals

- Automatic submission of applications.
- Job search, tracking boards, or cover letter generation beyond answering fields on the current form.
- Cloud sync.

## Functional requirements

### Profile

- Personal: first, middle, last, preferred name, email, phone with country code, address, links (LinkedIn, GitHub, portfolio, website).
- Employment history: company, title, employment type, start and end dates, current flag, location, description.
- Education: school, degree, field, dates, GPA, location.
- Skills, languages, and certifications.
- Work authorization, sponsorship need, relocation, notice period, salary expectation, start date.
- Optional voluntary self-identification answers, never filled unless the user supplies them.
- Resume file stored locally and attached to file inputs on request.

### Resume import

- Parse PDF and DOCX locally into a draft profile.
- The user reviews and edits the draft before it is saved.
- A local model improves extraction when available; a deterministic parser works without it.

### Autofill

- Detect inputs, textareas, selects, radio groups, checkboxes, and ARIA custom dropdowns, including those inside open shadow roots.
- Map fields to profile values using label, name, id, placeholder, autocomplete, and ARIA text.
- Repeatable sections (multiple jobs or schools) are filled in order.
- Re-scan when the page adds fields or moves to the next step.
- Dispatch the events frameworks require, then verify the value stuck. Report fields that did not.
- Skip fields that already have a user-entered value unless the user chooses to overwrite.

### Answer memory

- Store answers the user types or corrects, keyed by normalized question text and option set.
- Reuse them on later forms. Corrections replace earlier answers.

### Local model

- Used only for fields the deterministic matcher cannot resolve: open-ended questions and unusual option lists.
- Model output is validated against a schema and the profile. Answers that introduce facts absent from the profile are rejected.
- Weights download after explicit user approval and are cached locally. No personal data is sent during download.
- When WebGPU is unavailable, the deterministic path and saved answers still work.

### Interface

- Toolbar popup: fill the page, fill status, and a link to settings.
- A small in-page chip appears only on pages that look like application forms, and only while filling.
- Options page: profile editor, resume import, answers, model, and data export or deletion.

## Non-functional requirements

- Manifest V3, strict TypeScript, no remotely hosted code.
- No telemetry. Network access only for the optional model download.
- Permissions limited to storage, activeTab, scripting, and the content script match set.
- Unit and browser integration tests run in CI.

## Success metrics

- Fill rate on the fixture suite of at least 90 percent of mappable fields.
- Zero fabricated values in the safety test set.
- Verification catches every rejected value in the test fixtures.

## Release criteria

- All tests pass in CI.
- Production build loads in Chrome with no manifest warnings.
- Privacy policy and store listing text complete.
