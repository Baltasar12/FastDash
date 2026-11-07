# Race Center — Phase 01C design handoff

Baseline: `7f63a8c353e44594aa05889d670b0f708d81b227`, shared contracts v1.
Ownership: this specification and `race-center.module.css`; no global or shared UI changes.

## Experience

Move from season to event to reported session to classification. Use native labeled selectors for season and Grand Prix; reset dependent selections when their context changes. The event overview retains circuit, location, reported date and round context. Show only sessions supplied by the event, with visible session status and an explicit active state. Sprint and practice selection explains that result coverage is unavailable; neither substitutes main-race results.

An explicit qualifying-results URL may address a dataset that is absent from the
reported schedule. Display provider-confirmed results under "Independent result
dataset" and "Qualifying results"; unavailable/error responses identify an
independent request. Explain that no session time or weekend format is inferred.
Keep reported-session controls unchanged, and do not create a qualifying session
or promise qualifying coverage before the provider confirms it.

The warm canvas carries the editorial masthead and event context. A precise dark panel gives classifications their own visual hierarchy. Large Geist event typography and IBM Plex Mono round/timing values establish rhythm without illustrations, branding or dashboard cards. Thin rules, disciplined spacing and sharp geometry come from SECTOR's established tokens. The Obys and MECHA reference pages were unavailable to the coordinator; their documented grid, typography and editorial direction informed the design, with no copied assets or layout.

## Components and states

- Masthead: one meaningful page h1, eyebrow and short exploration guide. Integration owns the page landmark and existing skip link.
- Filters: visible labels, native controls, 44px minimum height, constrained widths and wrapping layout. Active selections stay readable without truncation.
- Event overview: clear event name with round index and a semantic definition list for circuit, location and date. Missing fields retain meaningful unavailable/missing labels.
- Sessions: wrapping buttons with accessible names, visible text status and `aria-pressed` active state. Selection follows browser-native GET navigation; the new document exposes the existing skip link and clearly identifies its active session. Focus restoration across documents is not promised. An unknown or absent session list receives an explanation.
- Results: semantic captioned table, scoped headers, text classifications and driver/constructor context. Keep all data columns available through a labeled, keyboard-focusable local scroll region. No content is removed at narrow widths.
- Provenance: sample labels at display, source/attribution and retrieval context; stale, provisional and partial warnings remain independent. No live-feed decoration.
- Loading: concise accessible status and stable panel space; no artificial delay or hidden essential content.
- Empty: explain confirmed no records and provide a relevant next step. Filter-empty state identifies the filter and offers reset.
- Unavailable: distinguish unsupported type, unpublished, canceled and missing coverage. Error messages are application-owned, with an explicit retry only where supported; no retry loop.

## Responsive and accessible behavior

At 320px, all major sections stack, title text wraps, native fields fill their available width and session buttons wrap. The results table scrolls within its panel; the document itself must not overflow. At tablet widths, selectors and event facts gain columns while maintaining readable line lengths. Desktop uses asymmetric masthead/event rhythm and generous spacing, with a maximum content width matching Foundation.

Use existing `--canvas`, `--ink`, `--panel`, `--accent`, `--muted-ink`, `--panel-muted`, `--line` and `--panel-line`. Small secondary text uses accessible ink tokens. Active state includes border/weight and text semantics in addition to color. Focus uses the existing canvas outline and accent on dark. Native scrolling, keyboard selection and touch behavior stay intact.

Feedback uses only short transform/opacity transitions at the existing fast duration; no entrance sequence. Reduced motion removes transitions and transforms. Essential content is immediately visible.

## Validation ownership and limits

The coordinator owns full validation and browser capture after the feature is composed in a bounded preview. CSS/source inspection is not evidence of a browser pass. Check 320px, tablet and desktop for page overflow, local table scrolling, readable controls, keyboard focus and reduced motion. The feature leaves application routes, navigation, globals and Foundation unchanged for the integration coordinator.
