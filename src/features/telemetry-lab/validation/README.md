# Telemetry Lab validation host

Isolated production-mode browser host for the feature-local interactive prototype.
This does not modify or replace the application's Telemetry Lab placeholder route.
The preview requires `SECTOR_TELEMETRY_PREVIEW=1`; without it the page returns 404.
Every performance value is synthetic and every driver is fictional. Historical
event names provide context only. No racing API is called.

From the repository root, after the main production build and root E2E suite:

```powershell
$env:SECTOR_TELEMETRY_PREVIEW = '1'
pnpm exec next build src/features/telemetry-lab/validation
pnpm exec playwright test --config src/features/telemetry-lab/validation/playwright.config.ts
Remove-Item Env:SECTOR_TELEMETRY_PREVIEW
```

For manual inspection after the preview build:

```powershell
$env:SECTOR_TELEMETRY_PREVIEW = '1'
pnpm exec next start src/features/telemetry-lab/validation --hostname 127.0.0.1 --port 3102
```

Open <http://127.0.0.1:3102>. Stop the process and remove the environment variable
when finished. Browser tests start and stop their own server and refuse to reuse
an existing server. They write screenshots and failure traces only into ignored
`test-results/telemetry-lab-preview`; the preview build uses ignored
`.next/telemetry-lab-preview`. Generated `next-env.d.ts` and TypeScript build
information are excluded from the feature's commit.

Coverage includes driver/lap/event/session changes, partial synthetic samples,
manual state previews and recovery, chart table alternatives, keyboard/focus,
touch targets, reduced motion and viewport overflow at 320, 768 and 1440px.
Screenshots are evidence from Chromium, not a real-device Safari verification.
