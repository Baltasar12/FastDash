# Overview — Phase 01B design handoff

Baseline: `7f63a8c353e44594aa05889d670b0f708d81b227`, branch
`codex/feature-overview`. This specification owns only the Overview feature. Routes,
navigation, shared tokens, provider implementations and contracts remain with their
assigned owners. The existing Foundation landing remains intact until integration.

## Direction and reference evidence

The dashboard is an editorial race briefing: a large opening statement, one dark
event feature, then precise championship and results ledgers. Hierarchy comes from
scale, alignment, whitespace and fine rules. It does not use a grid of rounded
metric cards, photography, team logos, decorative charts or fabricated telemetry.

[MECHA](https://mecha-xyz.webflow.io/) was inspected in headless Chromium at
1440 × 1000 on 2026-11-06. Its loaded opening uses an asymmetric one-third/two-thirds
composition, a persistent thin vertical rule, extensive whitespace, small utility
navigation and large tightly led display text. Browser-computed headings were
60/55.2px and 80/73.6px, weight 400, with negative tracking. A 900px wheel gesture
produced `scrollY = 899`; the page retained native scrolling. Scrolling revealed
large titles followed by ruled factual rows. A navigation-link hover changed its
text from dark to light with a computed 0.6s color transition and no element
translation. SECTOR keeps faster token-based feedback appropriate to data use.
Its initial loading screen delayed
the content; SECTOR must render essential content immediately. SECTOR translates
the useful principles into its own Geist/IBM Plex Mono language and its existing
warm canvas, dark panel and lime accent. It does not reproduce MECHA's typefaces,
assets, layout, loading sequence or fixed elements.

[Obys Grids S03](https://grids03.obys.agency/) returned `403 Forbidden - Nginx` in
Chromium. The web reader exposed only the project title and grid education summary.
Its actual typography, scroll behavior and interactions could not be verified in
this session. The project's supplied emphasis on geometric composition and grid
rhythm informs the direction; no unseen behavior is claimed as inspected.

Reference screenshots are temporary inspection artifacts outside the repository,
not SECTOR product assets. Browser accessibility, mobile behavior and keyboard
behavior of the references were not audited.

## Composition

1. **Opening briefing.** A thin top line reads `OVERVIEW / SEASON BRIEFING` and
   displays the dataset label. A single h1, `Season in focus.`, occupies the wider
   left column. Set it in Geist medium, tightly tracked, approximately 80–112px on
   large desktop, 60–76px on tablet and 44–52px at 320px. Keep line height near 1.0,
   with enough room for font ascenders and descenders. The right column contains a
   visible `Season` label, native select and `View season` submit control. Display
   the selected year as a strong numeric anchor. Supporting copy explains the
   available dataset in one or two lines. A ruled context strip can show reported
   event count, championship state and standings round when known. Say `events in
dataset`, never imply a complete season from a short calendar.
2. **Next Grand Prix.** One full-width `--panel` surface, with 32–48px desktop and
   20px mobile padding. Small indexed label `01 / NEXT GRAND PRIX`; large event
   name at left, a restrained oversized round index at right, actual circuit and
   locality below the name. The round index repeats a known value and is
   decorative for assistive technology. A date block and actual reported sessions
   form a lower ruled band. A single lime-backed, dark-text link opens Race
   Center with explicit event context. No track illustration unless it is clearly
   labeled an imaginary illustration; a schematic provides no necessary value
   here. The panel's contrast and type hierarchy supply the visual identity.
3. **Championship briefing.** Paired driver and constructor ledgers at desktop,
   divided by a rule rather than enclosed in cards. Each has an index, h2, visible
   snapshot/as-of context and point-of-display provenance. A leader's points may
   be larger, but do not duplicate a row into a misleading global metric. Rows
   align position, identity, constructors where supplied, points and wins.
   Preserve multi-constructor associations. Use restrained accent only for the
   first reported position, and always retain the numeric position.
4. **Most recent race.** Full-width light ledger with index, h2, event name, season,
   round and race context. Explicitly label this the most recent **available**
   race classification; do not imply the provider covers every real race or that
   a calendar date confirms completion. Rows show
   classification, full driver name, constructor, finish status, race time/gap and
   points. Preserve elapsed time, time gap and laps-down as distinct units. Show
   retirement/DNS/DSQ text rather than assigning numeric positions. An event-specific
   `Open … in Race Center` link supplies the main next action.
5. **Closing source note.** A quiet rule and compact text preserve the independent
   project notice and state that synthetic values describe invented people,
   season and results. This supplements, never replaces, per-module labeling.

The event panel may use a subtle accent line or a small geometric index motif.
Do not add racing stripes, flags, pulsing live dots or graphics that suggest
unknown provider coverage or live timing.

## State and data behavior

State belongs to each query-backed section so one failed resource does not erase
other useful data. Preserve section heading, layout rhythm and source context.

| State       | Required presentation                                                                                                                                                                                                                                        |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Loading     | Stable neutral line skeletons matching the heading/rows, plus one accessible loading status; no invented numbers or hidden essential instructions. Avoid a full-screen loader.                                                                               |
| Success     | Render only known values. Show the source name, retrieval timestamp and source attribution. For synthetic provenance, display `SYNTHETIC SAMPLE` beside the section's heading/content.                                                                       |
| Empty       | `No entries were returned for this dataset.` Explain the affected resource. Do not equate empty with not-yet-published or season completion. Offer season selection or existing relevant content.                                                            |
| Unavailable | Use reason-specific text: not published, not covered, canceled, unknown season or unknown event. No retry button for a permanently unsupported resource.                                                                                                     |
| Error       | Calm, specific application-owned copy. Offer retry only when the integration supplies a meaningful retry action and the result is retryable; otherwise point to season selection. Respect Retry-After where provided. Do not expose raw provider exceptions. |
| Stale       | Visible `STALE` plus the last successful retrieval time. State that refresh failed when revalidation metadata says so. Never label stale as live.                                                                                                            |
| Partial     | Visible `PARTIAL DATA`; qualify counts as available entries. Do not imply that a preview slice is provider incompleteness; say `Showing N of M available entries` separately.                                                                                |
| Provisional | Visible `PROVISIONAL`; finality is independent of freshness and completeness. Unknown finality must not become `FINAL`.                                                                                                                                      |

Missing fields read `Not reported`, unavailable fields read `Unavailable`, and
not-applicable values read `Not applicable` where this distinction matters. A
genuine reported zero remains `0`. Never use a bare dash as the only explanation
for unknown scores. Date-only session starts retain the calendar date and say
`Time not reported`; known UTC instants include `UTC`. Do not invent midnight,
local timezone or a countdown from date-only values.

The shared sample season has only completed race sessions. Its honest default
next-event state is `No scheduled race in the available calendar`. This does not
prove the season is complete. An explicit feature-local synthetic scenario may
derive a scheduled event from shared fixtures to exercise the next-event success
layout; it must not mutate the shared fixtures or silently serve as a production
fallback. Selected season and event context must travel through the injected
server query and navigation link.

Phase 01D: an unknown-status event with a reported upcoming calendar date uses
`Next on calendar` and `RACE STATUS NOT REPORTED`. Keep reported sessions untouched.
Past calendar dates only identify candidates to ask for race classifications;
they never establish that a race completed or that results were published.

## Responsive rules

Use existing `--gutter`, `--space-*`, type, color and duration tokens. Styles remain
feature-local and component-scoped, ideally a CSS module imported by the feature.
Do not change globals to make the feature work.

| Width      | Behavior                                                                                                                                                                                                                                                                                                                                                                                                                       |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 320–639px  | Single column, 20px external gutter. H1 wraps naturally. Season controls use available width and retain 44px targets. Event title wraps; the large round index becomes a compact labeled value. Session rows stack label/date. Championship ledgers stack. Result identities and secondary context wrap inside each row; points/classification remain aligned. No page-level horizontal scrolling or hidden essential columns. |
| 640–899px  | Opening can use two columns only when content fits. Event details use a two-column lower band. Championship sections remain stacked if full names and metadata need space.                                                                                                                                                                                                                                                     |
| 900–1199px | Two championship columns, proportionally balanced event header, full results ledger. Use `minmax(0, …)` for grid columns.                                                                                                                                                                                                                                                                                                      |
| 1200px+    | Larger opening type and whitespace; content follows the shared 1600px maximum. Event header roughly two-thirds/one-third. Keep line lengths intentional rather than stretching all text.                                                                                                                                                                                                                                       |

Do not truncate full names, event names or constructor associations with ellipses.
Use `min-width: 0` and `overflow-wrap: anywhere` for unusually long identifiers.
Table headers remain programmatically associated with data on narrow screens;
if a ledger uses stacked descriptions, retain semantic row/context relationships.

## Interaction and accessibility

The shared shell supplies header, navigation, skip link, main and footer. The
exported dashboard supplies one h1 and h2 section headings without introducing a
second main landmark. Each section has a unique accessible name. Navigation uses
anchors; selecting a season uses a labeled GET form or an explicitly injected
integration callback. A control must not appear functional before an actual
action exists. An unavailable season list explains why selection is unavailable.

Keep a minimum 44px target and visible focus. On dark panels, use the accent focus
outline; on canvas preserve the existing strong dark-green focus treatment. Hover
can translate a link arrow 2–3px and change a restrained rule/underline over
`--duration-fast`. Do not animate table positions, page layout, or data values.
Use Motion only if a small isolated interaction benefits; CSS is sufficient for
link feedback. Reduced motion removes translations/transitions and skeleton
animation. Native scrolling remains available throughout.

Body copy and unknown-field labels should be at least 14px where space allows;
technical labels may be 11–12px. Small canvas text uses `--muted-ink`, dark
supplemental text uses `--panel-muted`; never use accent text on canvas. Status
meaning is written explicitly, never color-only. Keep all content readable at
200% zoom and ensure focus is not clipped by panel overflow.

## Verification handoff

Frontend and QA should inspect actual rendered states at 320, 768 and 1440px, plus
long names, multi-constructor driver rows, reported zero, missing points,
retirement/DNS/DSQ, date-only times, canceled sessions and no scheduled race.
Check keyboard season selection/submission, contextual link destinations, visible
focus, reduced motion and document overflow. Verify independent combinations of
stale, partial and provisional metadata. Browser tests for the feature need an
isolated preview harness or integration-owned route; the Overview stream must
not edit global routes to manufacture a preview.

This document is a design specification, not a claim that the implementation or
its responsive/accessibility behavior has already passed verification.
