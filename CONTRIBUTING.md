# Contributing

## Setup

```sh
npm ci
npx playwright install chromium
npm run check
npm run build
npm run test:e2e
```

Node 22 or newer.

## Reporting a form that does not fill

Open an issue with:

- The label text and type of the field that was missed or filled wrongly.
- A minimal HTML snippet of the field and its surrounding markup. Remove personal data.
- What you expected and what happened.

Do not paste resumes or profile exports.

## Adding support for a field pattern

1. Reproduce it as a small page in `tests/fixtures/pages`.
2. Add a unit test next to the related ones in `tests/unit`. Classification rules live in `src/content/classify.ts`, option matching in `src/content/match.ts`, and value formatting in `src/content/values.ts`.
3. Make the change. Keep rules specific. A rule that fills the wrong value is worse than one that leaves a field empty.
4. Add an end-to-end case in `tests/e2e/fill.spec.ts` if the behavior depends on real browser events.

## Principles

- No network requests with user data, no analytics, no remote code.
- Never invent values. If the profile has no answer, leave the field alone.
- Never submit a form.
- Verify after filling.

## Pull requests

- One logical change per pull request, with tests.
- `npm run check` and `npm run test:e2e` must pass.
- Keep commits small and messages in the imperative, for example "Match state abbreviations in selects".
- Avoid code comments that restate the code.

## Releases

Bump the version in `package.json`, update `CHANGELOG.md`, tag `vX.Y.Z`, and push the tag. The release workflow builds and attaches the zip.
