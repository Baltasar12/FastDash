# SECTOR

An independent, free Formula 1 analytics project. Phase 00 establishes a polished editorial landing, application shell and modular foundation. It includes no real race data, API integrations, authentication or database. All analytics shown are labeled sample data.

## Prerequisites and installation

- Node.js **24+** (Node 24.15.0 used for validation).
- pnpm **11.25.0**, pinned in `package.json`. With Corepack installed: `corepack enable` then `corepack prepare pnpm@11.25.0 --activate`. Alternatively install the exact pnpm version through your preferred Node tooling.
- Internet access for initial dependency/browser installation and the first Next.js font build. No environment variables, keys, paid services or Python required.

```sh
pnpm install --frozen-lockfile
pnpm dev
```

Open [localhost:3000](http://localhost:3000). Stop with Ctrl+C.

## Commands

| Command                             | Purpose                                                      |
| ----------------------------------- | ------------------------------------------------------------ |
| `pnpm dev`                          | Local Next.js development server                             |
| `pnpm typecheck`                    | Generate route types and run strict TypeScript               |
| `pnpm lint`                         | ESLint including Next.js and accessibility rules             |
| `pnpm format` / `pnpm format:check` | Write / verify Prettier formatting                           |
| `pnpm test` / `pnpm test:watch`     | Vitest and React Testing Library                             |
| `pnpm build`                        | Optimized production build                                   |
| `pnpm start`                        | Serve a completed production build                           |
| `pnpm test:e2e`                     | Playwright desktop and mobile smoke tests against production |

For browser tests, install Chromium once, build, then run the suite:

```sh
pnpm exec playwright install chromium
pnpm build
pnpm test:e2e
```

Playwright starts/stops a fresh production server on port 3107 and refuses to reuse an existing server. Its child process alone preloads `tests/e2e/mock-jolpica.mjs` to intercept Jolpica requests with deterministic synthetic wire responses. Normal `pnpm start` and `pnpm dev` use the real server adapter; they never load this test transport or substitute sample data after failures. Browser screenshots and failure traces are written to ignored `test-results/`.

## Project structure

```text
src/app/                  App Router, global styling and metadata
src/components/{ui,layout} Reusable primitives and shell
src/features/overview/    Preserved landing specimen and season dashboard
src/features/race-center/ Event/session results explorer
src/config/               Typed navigation/module configuration
src/data/providers/       Server-only Jolpica adapter and application composition
src/{types,schemas}/      Shared F1 v1 contracts and runtime validation boundary
src/{lib,hooks}/          Shared utilities and future hooks
src/tests/                Unit-test setup
tests/e2e/                Production browser smoke tests
docs/                     Product and engineering documentation
```

Routes: `/` retains the editorial landing; `/overview` shows season calendar context, standings and recent published race results; `/race-center` explores event, reported sessions and available race/qualifying datasets. Calendar, Championship and Telemetry Lab remain placeholders. Unknown paths return a custom 404.

Share URLs such as `/overview?season=2026` and `/race-center?season=2026&round=1&session=qualifying`. Repeated or invalid selectors are rejected. A qualifying dataset can exist without a reported calendar session; the explorer identifies this distinction without inventing a schedule. Date-based Overview selection says “Next on calendar” when session status is unknown. Recent-result discovery checks at most three relevant events and stops on operational failure.

Source, retrieval time, stale/partial/publication context and Jolpica attribution remain visible. No live feed is promised. The bounded cache and quota are process-local; coordinated public-hosting quota management, license/usage review and Product Owner approval remain publication gates. See [Phase 01D evidence](docs/PHASE_01D_INTEGRATION.md).

## Stack and conventions

Next.js 16, React 19, strict TypeScript, Tailwind 4, a shadcn/ui-compatible Button, Radix Dialog/Slot, Lucide and a small Motion microinteraction. Geist and IBM Plex Mono are locally served with `next/font`. Exact versions and a frozen pnpm lockfile make installation repeatable. TypeScript 6.0 and ESLint 9 are pinned for the current parser/React plugin peer compatibility; upgrade them together when upstream support changes.

No production origin or hosting is configured. Canonicals, sitemap and absolute social images should be added when an authorized production domain exists. No deployment was performed in Phase 00.

Read [engineering rules](AGENTS.md), [product](docs/PRODUCT.md), [architecture](docs/ARCHITECTURE.md), [design system](docs/DESIGN_SYSTEM.md) and [API conventions](docs/API_CONTRACTS.md) before feature work. Future work should validate provider contracts first, then implement independent calendar, championship and race-result features. ECharts, GSAP, Lenis, TanStack Query, Zod and FastF1 are intentionally deferred.

## Multi-agent development (Phase 00.5)

Project-scoped Codex configuration and eight agent definitions live in `.codex/`. Start with the [agent workflow](docs/AGENT_WORKFLOW.md), [ownership/workstreams](docs/WORKSTREAMS.md), [independent review process](docs/REVIEW_PROCESS.md) and [validation record](docs/AGENT_VALIDATION.md).

Reuse the [feature](prompts/feature.md), [review](prompts/review.md), [integration](prompts/integration.md) and [status](prompts/status.md) prompts in a new session rooted in this repository. Native subagents share the checkout by default; independent long-running sessions need explicitly assigned feature worktrees. Contracts precede parallel implementation. Reviews do not authorize Git merges or deployment. No application feature or provider integration is added in Phase 00.5.
