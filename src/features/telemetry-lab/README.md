# Telemetry Lab — Phase 02C

An isolated interactive frontend prototype. All numerical values, driver
identities, lap lists and traces are deterministic **synthetic examples**.
Silverstone 2024 and Monza 2023 are historical context labels only; no displayed
result claims to describe those events. No provider is queried.

## Feature entry and behavior

`index.ts` exports `TelemetryLab`. The feature renders one h1 and expects a host
main landmark, skip link and fonts/global tokens. It keeps all selection state
locally, with no URL persistence, request, artificial loading timer or polling.

- Select historical context, session, two distinct fictional drivers and one lap
  per driver. Changing a driver selects a valid lap for that driver.
- Inspect synthetic lap/sector timings, sampled speed maxima and four SVG traces.
  Independent elapsed seconds share a chart domain; they do not share track
  position. Missing intervals break traces. Continuous lines are visual guides;
  braking and gear are discrete display steps.
- Open each native data-table disclosure for the full local sample values and
  per-driver elapsed timestamps. Missing data remains unavailable.
- Use the explicitly labeled state preview for loading, unavailable and error;
  return to samples or reset. The Race fixture is intentionally unavailable,
  which says nothing about actual coverage of a historical race.
- Track-distance delta stays unavailable because no reliable distance alignment
  is implemented. A scalar synthetic lap-duration difference is separate.

Read [DESIGN.md](DESIGN.md) for behavior/layout and
[CONTRACT_PROPOSAL.md](CONTRACT_PROPOSAL.md) for the future adapter handoff.

## Local preview and verification

The main application's Telemetry Lab placeholder remains unchanged. A guarded,
feature-local Next.js host exists solely for review. From the repository root:

```powershell
$env:SECTOR_TELEMETRY_PREVIEW = '1'
pnpm exec next build src/features/telemetry-lab/validation
pnpm exec playwright test --config src/features/telemetry-lab/validation/playwright.config.ts
pnpm exec next start src/features/telemetry-lab/validation --hostname 127.0.0.1 --port 3102
# Open http://127.0.0.1:3102; stop the server after inspecting it.
Remove-Item Env:SECTOR_TELEMETRY_PREVIEW
```

The environment variable must be set for both preview build and start. Without
it the host must return 404. Build the main application first; its build may
clean `.next`. Preview builds and screenshots live in ignored `.next` and
`test-results` locations. Do not commit generated files.

The normal completion suite is `pnpm format:check`, `pnpm typecheck`, `pnpm lint`,
`pnpm test`, `pnpm build`, then `pnpm test:e2e` against that fresh production build.
Feature-local Playwright separately exercises the exported prototype. See
[HANDOFF.md](HANDOFF.md) for actual run evidence and limitations.

## Eventual route integration — separate authorized task

1. The route owner replaces the existing placeholder composition with
   `import { TelemetryLab } from "@/features/telemetry-lab"` and renders
   `<TelemetryLab />` inside the existing shell's main. Keep one h1, skip link,
   metadata and independent-project notice. Do not import the validation app.
2. For a synthetic prototype route, preserve every synthetic label and use no
   provider. Route visibility, navigation wording and release are separate
   Product Owner decisions. Run route/mobile/keyboard regressions after wiring.
3. For real telemetry, first agree the proposal's canonical mappings, typed
   result/quality states and approved server-only adapter. Introduce a reviewed
   server query/presentation boundary; replace this generator intentionally.
   Do not pass local `Selection`/`SyntheticLap` as shared contracts or accept
   provider JSON in the component. Keep operational failure distinct from samples.
4. Derive supported sessions/drivers/laps from validated capability data rather
   than the prototype constants; reconcile dependent selections and preserve
   missing values, source units, timing uncertainty and payload budgets.
5. Add reliable distance alignment as its own reviewed capability. Retain the
   delta unavailable state until it exists. Require fresh independent reviews
   and explicit integration/release approval before merging or publishing.
