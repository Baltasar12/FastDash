# Architecture

SECTOR is a modular monolith. Next.js 16 App Router and React 19 render the shell and content on the server. Phase 00 is statically renderable and makes no external data requests at runtime.

## Structure

```text
src/
  app/                    Routes, metadata, fonts, global tokens and styles
    [section]/            Allowlisted, statically generated placeholder routes
  components/
    layout/               Shared header, navigation, wordmark and footer
    ui/                   Domain-independent UI primitives and states
  config/                 Typed navigation and module definitions
  features/
    overview/
      components/         Landing composition and original analytics specimen
      data/               Explicitly labeled sample data
  data/providers/         Reserved server-side provider adapters
  types/                  Reserved shared domain contracts
  schemas/                Reserved runtime boundary validation
  lib/                    Small, pure shared utilities
  hooks/                  Reserved reusable client hooks
  tests/                  Unit-test environment setup
tests/e2e/                Browser smoke and interaction tests
docs/                     Product, architecture, design and adapter conventions
```

## Boundaries and rendering

Routes compose feature and shared components. Feature code depends on shared code; shared UI never imports a feature. Avoid a global barrel and premature abstractions. Place feature-specific hooks, types and schemas inside the feature until reuse is established.

Only `Navigation` (pathname, mobile dialog) and `ExploreLink` (Motion hover/press) require client rendering. Radix Dialog owns focus trapping, dismissal and focus restoration. The Button uses the shadcn/ui composition pattern with Radix Slot, CVA and `cn()`. Geist and IBM Plex Mono are fetched at build time through `next/font` and served locally; browsers do not request Google Fonts.

`[section]` enumerates the four known modules with `generateStaticParams` and rejects unknown paths with `dynamicParams = false`. Each route has its own title. Current-page feedback is calculated using the pathname. Placeholder content is honest about development status.

## Future data flow

```text
External provider → server-only adapter → validated provider response
                  → normalized domain model + provenance
                  → server feature/query layer → Server Component
                  → serializable view model → interactive client island (if needed)
```

Read `API_CONTRACTS.md` before implementing an adapter. Add `server-only` enforcement when server data modules exist. Keep HTTP, provider identifiers, credentials and rate-limit handling out of React components. Use server caching with explicit freshness policies; no implicit promise that historical data never changes. TanStack Query is reserved for a feature needing client polling or cache coordination, not initial server rendering.

Charts will use Apache ECharts behind a lazy client boundary with accessible textual summaries and stable dimensions. GSAP, ScrollTrigger and Lenis remain uninstalled. Motion is limited to a small microinteraction; native scrolling remains intact.

FastF1 may later run in an optional Python process/service. The web app must consume its versioned, validated output through the same provider boundary; it must not require Python for standard local development.

## SEO and operations

Root metadata provides title templates, descriptions, Open Graph, Twitter and theme color. No production origin is invented: canonical URLs, sitemap and absolute social images wait for an authorized domain. No hosting, analytics, credentials, auth or database is configured.

Node 24+ and the pinned pnpm version provide a consistent local toolchain. Direct dependencies are exact and the lockfile is authoritative. ESLint 9 is held for upstream React/a11y plugin compatibility; TypeScript 6.0 fits the current parser peer range.

## Verification

Vitest/RTL cover navigation state, accessible dialog lifecycle and sample-data disclosure. Playwright uses the production server and covers landing, anchors, every navigation destination, document titles, mobile dismissal/focus, skip navigation, reduced motion, 404 behavior and overflow at 320–1440px. Desktop and Chromium mobile emulation are configured; real-device Safari remains a future cross-browser check.
