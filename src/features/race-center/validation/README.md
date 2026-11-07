# Race Center validation host

This feature-local Next.js host validates the exported server component without
changing SECTOR routes. It is not linked from the application. It requires
`SECTOR_RACE_CENTER_PREVIEW=1` and explicitly injects the shared synthetic fixture
provider. With the variable absent the preview page responds with 404. Never use
this host or its provider as a production fallback.

From the repository root, after the normal production build and root E2E suite:

```powershell
$env:SECTOR_RACE_CENTER_PREVIEW = '1'
pnpm exec next build src/features/race-center/validation
pnpm exec playwright test --config src/features/race-center/validation/playwright.config.ts
Remove-Item Env:SECTOR_RACE_CENTER_PREVIEW
```

The isolated preview build writes to `.next/race-center-preview`, and browser
artifacts write to `test-results/race-center-preview`. Both are ignored. Build the
main application first because its build can clean `.next`. The host's generated
`next-env.d.ts` and TypeScript build information are also ignored.

Playwright exercises event/session navigation, sprint unavailability, result
filtering, semantic columns, 320/768/1440px overflow, keyboard focus and skip
navigation, touch targets, reduced motion and provider states. Screenshots are
captured at all three viewport widths. No external racing data is requested.

Queries can also be varied directly with `?scenario=stale`, `partial`, `empty`,
`not-published`, `not-covered`, `cancelled`, `missing-qualifying` or `error`.
Scenario is a validation-host control and resets to success on selector
navigation; it is not a production feature parameter.
