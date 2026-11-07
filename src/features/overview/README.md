# Overview — Phase 01B

Task: `SECTOR-01B-OVERVIEW`. Worktree: `E:/CODIGO/FastDash-overview`.
Branch: `codex/feature-overview`. Starting HEAD:
`7f63a8c353e44594aa05889d670b0f708d81b227`. Shared contract: `sector-f1-v1`.
The starting checkout was clean and includes the contract integration and handoff
documentation. This feature owns only `src/features/overview/**`; the existing
Foundation landing remains intact.

## Route integration

The integration coordinator owns the application route, shared navigation and
provider composition. Import the dashboard directly from its component module
and query data through the server entry. Do not import a concrete provider into
the dashboard or any client component.

```tsx
import { OverviewDashboard } from "@/features/overview/components/overview-dashboard";
import { queryOverview } from "@/features/overview/server";
import type { F1DataProvider } from "@/types/f1-provider";

// Call from the integration-owned Server Component with a composed provider.
export async function OverviewContent({
  provider,
  season,
}: {
  provider: F1DataProvider;
  season?: number;
}) {
  const model = await queryOverview(provider, { season });
  return (
    <OverviewDashboard
      model={model}
      seasonAction="/"
      raceCenterHref={({ season, round }) =>
        `/race-center?season=${season}&round=${round}`
      }
    />
  );
}
```

Resolve and validate the route's `season` search parameter before passing it to
the query. The query also rejects invalid numeric seasons. The native GET form
submits `season`; set `seasonAction` to the final Overview route. The Race Center
URL above is a handoff convention: its route owner must implement search-parameter
consumption. Existing placeholder routes do not yet consume this context.

Render one dashboard inside the existing shell's `main` and `Container` (or an
equivalent gutter/max-width wrapper). The dashboard supplies the page's single
`h1`; the shell supplies skip navigation, header, main and independent-project
footer. Use the exported loading component in the route's Suspense/loading
boundary. Import it from
`@/features/overview/components/overview-loading`. Keep concrete providers and
fixture composition in the server graph. The dashboard imports its scoped CSS;
the shell continues to supply the existing global design tokens and font variables.

## Synthetic previews and data semantics

Synthetic previews are explicit opt-in compositions using the shared fixture
provider and typed feature-local variations. They are never a fallback for an
external provider failure. Do not select fixtures from a failed request or silently
enable them in production. An intentionally published synthetic demonstration
must retain all visible sample labels.

An intentional preview can compose the fixture variant explicitly:

```tsx
import {
  createOverviewDemoProvider,
  OVERVIEW_DEMO_NOW,
} from "@/features/overview/data/demo";

const model = await queryOverview(createOverviewDemoProvider(), {
  now: OVERVIEW_DEMO_NOW,
});
```

The preview changes the invented second event to scheduled and identifies the
synthetic championship as in progress. The unmodified shared fixture provider
remains useful for exercising the no-next-event state.

Calendar coverage, source finality and freshness remain independent. A short or
partial calendar does not establish a whole season's schedule or completion.
Reported main-race status remains authoritative. When status is unknown or the
race session is unreported, a known calendar date on or after the reference UTC
day can identify `Next on calendar`; its label explicitly says race status is not
reported. Date-only comparison does not infer an actual start, finish or cancellation.
Unknown-status dates before the reference day are eligible only for result probes.
Qualifying and sprint sessions are not substitutes for the main race. Missing times, points,
positions and wins remain explicitly unknown; an available zero remains zero.
Dates retain source precision and timed sessions state their timezone.

Recent-event selection retains its calendar provenance independently of the race
classification. Differing freshness, completeness and publication indicators stay
visible beside their respective context. If event and classification source kinds
mix synthetic and external data, the feature withholds classification rows and
explains the mismatch; it does not invent a provider failure or combine invented
event details with real results. Reported dates order eligible events; canonical
round ordering is the deterministic fallback when an eligible date is unreported.

Recent classification discovery checks at most three eligible events, newest first,
with sequential `getRaceResults` calls through the injected provider. Only a nonempty
successful dataset establishes available race results; dates alone never do. Absent
or unpublished datasets may lead to the next eligible event; an operational failure
stops discovery immediately and remains visible. If no dataset is published in the
bounded window, the newest query's original `empty`/`unavailable` outcome remains
visible. Provider caches, timeouts and rate-limit cooldowns remain adapter-owned.
The feature does not retry, bypass caches, modify session status or load a synthetic
fallback. Older results outside this recent window may exist in Race Center.

## Verification and ownership

Visual direction is recorded in [DESIGN.md](DESIGN.md). Feature-local query and
component tests use shared synthetic fixtures. The isolated browser harness
verifies the exported feature without changing application routes; route assembly
still requires integration-owner verification against its fresh production build.
The coordinator runs the required repository checks and records actual results
and the independent tribunal outcome in the delivery report. Review snapshots and
browser artifacts are kept outside the tracked source tree.

After a fresh production build, run the isolated responsive/state checks with:

```sh
node src/features/overview/qa/verify-browser.mjs
```

This creates temporary HTML, font/CSS assets, screenshots and an evidence report.
It renders the actual exported components with explicit fixtures; it does not
install or publish an application route. Its development-only SSR loader is a QA
tool, not a product dependency or a provider implementation.

## Phase 01D correction handoff

INT-01 corrects real-provider compatibility without changing `F1_CONTRACT_VERSION = 1`
or the provider interface. Regression tests cover unknown-status upcoming/past events,
same-day uncertainty, independent result availability, unpublished and empty datasets,
network/timeout/rate-limit failures, lookup bounds and visible source/freshness labels.
Cross-module adapter tests and final route/browser validation belong to integration.

Correction validation on 2026-11-07: `pnpm format:check`, `pnpm typecheck`,
`pnpm lint`, `pnpm test` (7 files, 88 tests) and `pnpm build` passed. The corrected
Overview suite contains 54 tests across 5 files. No feature routes were added here;
Playwright against the assembled routes remains the integration owner's check.

No commit, merge, push or deployment is authorized by this handoff; the coordinator
applies the user's explicit operation authorization separately.
