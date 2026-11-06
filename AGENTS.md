# SECTOR engineering rules

SECTOR is a free, public, independent Formula 1 analytics project. Preserve Foundation and the approved phase; the Product Owner decides scope, major architecture changes and release approval.

## Scope and architecture

- Read `docs/PRODUCT.md` and `docs/ARCHITECTURE.md` before feature work. Keep changes within the requested phase.
- Use a modular monolith with Next.js App Router under `src/`. Route files compose features; domain logic lives in `features/<feature>/`.
- Shared components must be domain independent. Features may import shared code, never the reverse. Avoid cross-feature implementation imports.
- Use Server Components by default. Add `"use client"` at the smallest interactive boundary. Never ship provider credentials or server-only logic to clients.
- TypeScript is strict. Do not use `any`, disable checks to hide failures, or add unjustified assertions. Prefer explicit domain types and narrowing.
- Do not add authentication, databases, paid services, deployments or external data integrations without task scope requiring them.

## Accessibility and interaction

- Use semantic landmarks, one meaningful page h1, logical heading order and descriptive link names.
- Every interaction must work with keyboard and touch. Preserve visible focus, a skip link and accessible form labels.
- Prefer Radix primitives for complex interaction patterns. Preserve dialog focus trapping, Escape dismissal, return focus and accessible names.
- Respect reduced motion in CSS and Motion. Preserve native scrolling; no scroll hijacking or custom cursor by default.
- Use transforms and opacity for motion. Avoid artificial delays, layout shifts and hidden essential content during loading or animation.
- Check at 320px mobile, tablet and desktop widths; prevent horizontal overflow. Do not hide necessary information only to fit a viewport.

## Styling

- Reuse tokens in `src/app/globals.css`; expose reusable utility values through Tailwind 4 `@theme`. Use `cn()` for conditional classes.
- Keep the editorial light/dark identity, sharp geometry and numeric hierarchy. Avoid generic dashboard cards, gradients and glass effects.
- Use Geist for interface and headings, IBM Plex Mono for technical data. Fonts are optimized and self-hosted through Next.js.
- Use accessible ink tokens for small text: the supplied secondary color is not the default for small text on canvas. Test contrast when adding combinations.
- Keep CSS selectors component scoped by name. No extra styling framework. The Button follows the shadcn/ui Slot + CVA pattern; `components.json` enables future additions.

## Data integrity

- Clearly identify sample data at the point of display. Never blend samples with real results, imply a live feed, or present unknown values as zero.
- Provider responses belong behind server-side adapters and runtime validation. Do not invent external schemas. Follow `docs/API_CONTRACTS.md`.
- Verify official provider terms, redistribution rights, attribution, coverage and quotas before integrations; public accessibility is not permission to redistribute.
- Preserve source, units, timestamp, session context and missing-data meaning. Distinguish provisional, unavailable and final results.
- Never use unlicensed photographs, official logos or team branding. Maintain the independent-project notice.

## Dependencies and verification

- Use pnpm, exact direct versions and the committed lockfile. Check stable versions, engines and peer compatibility before adding dependencies.
- Keep dependency additions task driven. ECharts, GSAP, Lenis, TanStack Query and Zod are deferred until a feature needs them.
- ESLint 9 is currently required by the React/accessibility plugins in eslint-config-next; TypeScript 6.0 is within the parser's supported range. Recheck these boundaries during upgrades.
- Run `pnpm format:check`, `pnpm typecheck`, `pnpm lint`, `pnpm test` and `pnpm build` for feature completion. Run `pnpm test:e2e` after a fresh build for route/interaction changes.
- Test observable behavior and data integrity. Use RTL for interactive components and Playwright for routing, mobile navigation and integration behavior. Do not add tests that mirror trivial implementation details.
- Never weaken checks to make them pass. Document unavailable checks and material limitations.

## Git and secrets

- Always use Conventional Commits: `<type>[optional scope][!]: <description>`. Choose a meaningful type such as `feat`, `fix`, `docs`, `refactor`, `test`, `chore`, `build`, `ci`, `perf` or `style`; identify breaking changes with `!` or a `BREAKING CHANGE:` footer.
- Inspect status and existing instructions before editing. Preserve unrelated work.
- Work on a feature branch or worktree; never modify `main` directly when isolated.
- Do not reset, force push, delete branches or discard user changes without explicit authorization. Do not commit or push unless requested.
- Never commit credentials, `.env` files, generated builds, browser reports or test artifacts. Only expose intentionally public environment variables with `NEXT_PUBLIC_`.

## Agent coordination and integration

- Before implementation, read relevant product, architecture, design and API documentation, then [agent workflow](docs/AGENT_WORKFLOW.md), [ownership/workstreams](docs/WORKSTREAMS.md) and [review process](docs/REVIEW_PROCESS.md).
- The main session orchestrates. Delegate genuinely independent substantial tasks to specialized native subagents with explicit file ownership, acceptance criteria and a common baseline; normally at most three active implementers. Keep trivial work local and dependent work sequential. Agree shared contracts first.
- Native subagents share the checkout unless explicitly isolated. Separate long-running sessions use feature branches/worktrees and explicit handoffs; they are not automatically supervised. Never allow simultaneous ownership of a file; serialize shared tokens, contracts and configuration.
- For substantial work, obtain fresh independent code, UX and security/QA/performance reviews of the same frozen diff. Reviewers do not edit files or review their own changes. Their instructions do not enforce a read-only sandbox; respect inherited permissions and report enforcement limits.
- Consolidate evidence, preserve dissent, fix confirmed defects and re-review corrections. Critical/High findings block readiness unless explicitly accepted by the user with reasons. A review PASS never authorizes integration or release.
- Inspect branch/detached state, status and worktrees before integration. Never delete a worktree containing unintegrated work. Obtain explicit user approval before any merge, push, main modification or deployment; do not commit unless requested. Prepare a concrete diff and validation report first.
