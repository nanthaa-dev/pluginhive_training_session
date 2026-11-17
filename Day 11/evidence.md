# Day 11 — Optional delivery note

## Implementation and API behavior

The order form uses the shared `FieldShell`, `TextField`, and `TextAreaField`
components. Because the current REST API does not accept or persist a note,
form submissions use the in-memory fake API in `shiphub-web/src/fakeApi.ts`.
The fake API demonstrates delay, field-level 400 errors, and idempotent retries;
the note is not stored in MongoDB.

In development, append `?demo=retry` to the web URL to make the fake API fail
once per idempotency key. A subsequent Try Again succeeds with the original
values and key. This mode is only for demonstrating the retry UI.

## Verification

Command:

```text
npm run check
```

Result: TypeScript build and all 8 form tests passed, including validation
boundaries, correction behavior, server `fields.note` errors, retry/key
preservation, duplicate-submit protection, and an axe accessibility check.

Keyboard and screen-reader test observations are in
[`keyboard-log.md`](./keyboard-log.md).

## Screenshots

- Invalid note: [`screenshots/invalid-note.png`](./screenshots/invalid-note.png)
- Saving: [`screenshots/saving.png`](./screenshots/saving.png)
- Failed save with preserved values: [`screenshots/failed-save.png`](./screenshots/failed-save.png)
- Successful save: [`screenshots/successful-save.png`](./screenshots/successful-save.png)
