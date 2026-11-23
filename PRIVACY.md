# Privacy Policy

ApplyFill does not collect, transmit, or sell personal data. It has no server and no accounts.

## What is stored

Stored in this browser's IndexedDB, on your device only:

- Your profile: contact details, work history, education, preferences, and any voluntary self-identification answers you enter.
- Your resume file, if you upload one.
- Answers you type or correct on application forms, with the question text.
- Extension settings.

You can edit all of it in the settings page, export it as JSON, or delete everything from the Settings tab. Removing the extension also removes the data.

## What leaves your device

Nothing, with one exception. If you approve the local model, the extension downloads:

- Model weights from `huggingface.co`.
- The model runtime library from `raw.githubusercontent.com`.

These are plain file downloads. They contain none of your data. Those hosts see your IP address and the files requested, as with any download.

## Page access

A content script runs on web pages to find form fields. It reads field labels and values on the page you are filling, and writes values into fields when you ask. Page content is not stored, except the question text and your answer for questions you answered yourself. Page content is never sent off your device.

## Permissions

| Permission | Why |
| --- | --- |
| `storage`, `unlimitedStorage` | Profile, resume, answers, and model cache |
| `activeTab`, `scripting` | Fill the current page from the popup or shortcut |
| Content script on http and https pages | Detect and fill application forms |

## Changes

Changes to this policy are recorded in the repository history.
