# Design system

SECTOR pairs a warm editorial canvas with precise dark analysis surfaces. Oversized typography, fine rules and disciplined whitespace establish hierarchy. Data receives visual priority. The original circuit and trace are a product specimen, not a functioning analytics tool.

The creative references are [Obys Grids S03](https://grids03.obys.agency/) (grid rhythm, scale, geometry) and [MECHA](https://mecha-xyz.webflow.io/) (editorial restraint, spacing and hierarchy). MECHA could not be fetched during Phase 00, so the supplied reference guidance informed the direction. No source code, layout, illustration or animation was copied.

## Tokens

Tokens live in `src/app/globals.css`; Tailwind 4 exposes matching color/font utilities through `@theme inline`.

| Purpose              | Token           | Value     |
| -------------------- | --------------- | --------- |
| Canvas               | `--canvas`      | `#F2F0E9` |
| Ink                  | `--ink`         | `#151719` |
| Analytical panel     | `--panel`       | `#111518` |
| Accent               | `--accent`      | `#C6FA65` |
| Supplied secondary   | `--secondary`   | `#747772` |
| Small secondary copy | `--muted-ink`   | `#5D615B` |
| Secondary on dark    | `--panel-muted` | `#A5AFA8` |
| Light border         | `--line`        | `#D4D4CB` |
| Dark border          | `--panel-line`  | `#303738` |

Use the darker muted-ink token for small canvas text; the supplied secondary is retained as a palette token, not used indiscriminately. Use accent on dark or as a background with dark text. It is not readable as small text on canvas. Borders are decorative separators, not the sole signal of a control's state. Focus uses a strong green outline on light and accent on dark. Do not rely on color alone for changes or sample status.

## Typography and layout

- Geist: headings, prose and controls. Headings use medium weight, tight tracking and short line lengths.
- IBM Plex Mono: lap times, deltas, sector values, technical labels and indexes. Use tabular numbers for comparable values.
- `--text-display`: responsive 3.4–8rem desktop scale, adjusted for narrow screens. `--text-heading`: 2.2–3.75rem. Body defaults to 1rem; compact captions are reserved for supplemental information.
- `Container`: 1600px maximum including fluid gutters, 20px minimum gutter. Mobile first; primary breakpoints are 640, 900 and 1200px.
- Spacing tokens use a 4px base: 4, 8, 12, 16, 24, 32, 48, 64 and 96px. Prefer these over ad hoc spacing.
- Radius is 2px. Thin borders and a very subtle panel shadow define surfaces. Avoid excessive rounded cards or ornamental effects.

## Components and interaction

`Button` offers default and outline variants, a small size and `asChild` composition. Use anchors for navigation and buttons for actions. Preserve 44px targets on interactive controls, visible focus, labels and disabled semantics. Navigation indicates the active route with both an underline and `aria-current`. Mobile navigation is a labeled Radix dialog.

`SectionHeading`, `LoadingState` and `EmptyState` establish reusable patterns. Empty states explain what is missing and provide a relevant next step. Loading states expose an accessible status. Every page includes a skip link, shared landmarks and a single meaningful h1.

## Motion

Fast feedback: 160ms. Standard transitions: 240ms. Easing: `cubic-bezier(0.22, 1, 0.36, 1)`. Motion for React provides a 3px hover lift and a subtle press on Explore. Navigation and module arrows use short CSS feedback. No entrance delay, custom cursor, scroll hijacking, WebGL or large animation runtime.

`prefers-reduced-motion` disables CSS animation/transitions and smooth scrolling; the Motion component also reads the preference and removes transforms. Essential content is server-rendered and visible without an entrance animation. Preserve native touch, focus and scroll behavior in future additions.
