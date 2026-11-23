# Chrome Web Store listing

**Name:** ApplyFill

**Summary (132 characters max):** Fill job applications from a private profile that stays on your device. No account, no server, nothing submitted for you.

**Description**

ApplyFill fills the repetitive parts of job applications: contact details, links, work history, education, work authorization, and common screening questions.

- Your profile and resume are stored only in your browser.
- Works with standard forms, custom dropdowns, multi-step flows, and embedded forms.
- Checks each field after filling and lists the ones the site did not accept.
- Remembers answers you give and reuses them.
- Imports a PDF or DOCX resume locally to draft your profile.
- Optional on-device AI for open-ended questions, downloaded only after you approve. Answers that add facts not in your profile are discarded.
- Never submits an application.

Open source: https://github.com/aprameyak/applyfill

**Category:** Productivity

**Single purpose:** Fill job application forms using data the user stored in the extension.

**Permission justifications**

- `storage`, `unlimitedStorage`: store the profile, resume, saved answers, and the cached model on the device.
- `activeTab`, `scripting`: fill the current tab when the user clicks the toolbar button or uses the shortcut.
- Host access through the content script on http and https pages: application forms are on arbitrary employer and applicant tracking domains. The script reads field labels and writes values.

**Data usage disclosure:** The extension handles personally identifiable information, work history, and website content. None of it is collected by the developer or transmitted off the device. Model weights are the only downloads.

**Privacy policy URL:** https://github.com/aprameyak/applyfill/blob/main/PRIVACY.md
