# Telemetry Lab — Phase 02C design specification

## Scope and status

This is a feature-local interactive prototype, built on baseline
`0a2d30a7e198d9f5dd3b2511d3620bdc0be2c061`. It proposes the future analysis
experience without defining shared telemetry contracts or integrating a provider.
All drivers, laps, timings and trace values in the prototype are deterministic
synthetic examples. Historical event names are context, not evidence that the
displayed telemetry was recorded there.

The interface retains SECTOR's English product vocabulary. Delivery notes may be
Spanish. Existing application routes, navigation, global tokens and dependencies
remain outside this feature's ownership.

## Creative direction

Build a motorsport analysis publication that opens into an engineering workbench.
Use a large, calm editorial heading, a precise selection grid, then a continuous
dark analytical surface. Fine rules and section numbers establish structure;
avoid a collection of rounded dashboard cards. Give the speed trace the greatest
visual area, then compress related channels into readable analytical rows.

[Obys Grids S03](https://grids03.obys.agency/) informed grid rhythm and scale.
[MECHA](https://mecha-xyz.webflow.io/) is a supplied direction reference for
restraint and hierarchy; its page could not be fetched by the coordinator during
this task. No third-party source, composition, illustration, logo, asset or motion
sequence is copied. Do not add official Formula 1 or team branding. No track map
is needed: a schematic shape could imply alignment data that this prototype does
not have.

## Information hierarchy

1. **Editorial introduction.** Small module index and prototype label, one h1
   `Telemetry Lab.`, and a short explanation of comparing two laps. Keep a
   prominent `Synthetic data` label beside this introduction.
2. **Session context.** A ruled row containing labeled historical event and
   session selects. Do not introduce an unsupported season picker before 2023.
   Session availability is explicit; unavailable telemetry is never filled with
   example values under a real-data label.
3. **Comparison selection.** Equal driver A and driver B regions, each containing
   a driver select and a lap select. A/B letter markers are more important than
   driver colors. Show the selected fictional driver's name and lap context.
4. **Performance overview.** A compact analytical strip presents selected lap
   times, available sector times and sample-only comparison information. Use
   tabular numerals, clear units and an em dash plus explanation for unknowns.
5. **Trace workbench.** A dominant speed chart, then throttle, braking and gear
   charts. Every chart names its channel and unit and offers its data table.
6. **Timing comparison.** A semantic lap/sector table with A/B columns and
   synthetic provenance in its caption. A whole-lap time difference may be
   labeled as a difference between synthetic lap durations; it must never be
   called a continuous track-distance delta.
7. **Alignment and provenance.** A reserved delta area explains why a true
   distance-aligned comparison is unavailable. A concise provenance section
   describes invented samples, missing data, visualization connections and
   future provider constraints.
8. **Preview states.** Secondary controls explicitly labeled as prototype preview
   controls expose ready, loading, unavailable and error. They do not pretend to
   initiate an external request.

## Selection and feedback

Use native, visibly labeled selects. They support keyboard, touch and platform
assistive technology without a custom combobox dependency. Driver identifiers
are feature-local identities, never racing numbers. A lap belongs to a driver in
one selected session. Changing context must choose a valid dependent selection;
changing a driver must reconcile its lap. Avoid presenting identical A/B drivers
as a meaningful comparison: either select a distinct counterpart or explain the
constraint through visible feedback.

Update the charts directly after a selection changes. Do not insert an artificial
loading delay. Preserve focus on the operated control. Announce a concise
selection/state summary through a polite status region instead of announcing all
chart points. State must be represented by selected option text or pressed state,
not color alone.

Keep scenario controls available while previewing a failure so users can return
to ready. Error recovery means returning to the local example; label it honestly
and do not imply provider retry behavior. A loading preview says it is a preview
and exposes `aria-busy` or a status as appropriate. Unavailable content explains
the missing prerequisite. Error text contains a useful next action, no raw
exception, stack trace or upstream body.

## Chart semantics and accuracy

- The horizontal axis is **elapsed time from each lap's own start**, in seconds.
  It is not synchronized UTC, track position or distance along the circuit.
- Keep both drivers on a common elapsed-time domain so a visual x-coordinate has
  an honest meaning. Never normalize each lap independently to fill the same
  width without labeling that alternate coordinate system.
- Driver A is solid lime using `--accent`; driver B is pale lavender with a
  dashed pattern. A/B letters, names and patterns supplement color. A shared
  visible legend remains available near the traces.
- Use straight sample-to-sample segments for continuous channels, with copy
  explaining that connecting lines are visual guides rather than additional
  observations. Gear and binary braking use steps where supported by the local
  model. Do not imply measured brake pressure from a binary brake signal.
- Break a path at a missing value. Never bridge a missing interval with a smooth
  curve, fill a gap with zero, or join across a lap boundary.
- Label synthetic provenance at the chart group and table point of display,
  including when a table is opened independently of its chart.
- SVGs are lightweight, responsive and have accessible names/descriptions. If the
  numeric alternative supplies equivalent detail, prevent redundant traversal of
  decorative SVG internals. Do not encode essential information in a tooltip
  that requires hover.
- A native `details` disclosure can expose each complete data table. Provide a
  descriptive summary such as `Speed sample table`, column headers, a caption,
  elapsed time, A/B values and units. Missing cells say `Unavailable` or use a
  documented em dash. Keep table controls keyboard operable.
- True track-distance delta remains unavailable until identity, lap boundaries,
  a shared distance coordinate, alignment method and quality threshold have been
  validated. An honest unavailable panel is the intended prototype state.

## Typography, color and spacing

Reuse existing canvas, ink, panel, muted, line and accent tokens. Geist supplies
headings, labels and controls; IBM Plex Mono supplies times, units, A/B labels and
technical annotations. The large heading may approach the existing display scale
on desktop but must wrap intentionally at narrow widths. Body and control labels
remain readable; small metadata uses `--muted-ink` on canvas and `--panel-muted`
on dark. Do not use the lighter supplied secondary token for essential small copy.

The comparison colors are feature-local presentation choices. Lime appears on
dark surfaces or as a dark-text badge; it is not small text on canvas. Pale
lavender on dark supplies a restrained second series. Verify final computed
contrast during implementation/browser QA; this specification does not claim a
measured contrast result for code that has not yet been rendered.

Use the existing spacing rhythm and fluid page gutter. Keep geometry sharp, with
thin rules, no glass, no gradients and no unnecessary shadows. Overview values
have more weight than their labels. Analytical regions have enough internal
spacing to distinguish axes, headings and legends without reducing charts to
thumbnail decoration.

## Responsive behavior

| Viewport            | Expected layout and behavior                                                                                                                                                                           |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Desktop, 1200px+    | Broad editorial introduction; event/session selector row; A/B selectors side by side; wide speed plot; related channels below; timing and alignment areas may form complementary columns.              |
| Tablet, about 768px | Reduced heading scale and gutters; selector grid reflows to available width; A/B regions remain distinguishable; charts use full available width with fewer readable axis labels if needed.            |
| Mobile, 320px+      | Single column; event, session, driver and lap controls stack; no clipped labels or hidden analytical channels; chart titles, units and legends wrap; traces resize rather than forcing the page wider. |

All controls have a minimum 44px target. Grid children use `min-width: 0` where
necessary. Long context labels wrap or remain readable within native selects.
Tables should fit the narrow layout by concise headers and wrapping; if a table
needs local horizontal scrolling, identify its region and keep page-level
overflow absent. Do not hide required information merely to pass an overflow
check. Native vertical scrolling remains untouched.

## Focus, motion and landmarks

Integrate inside the host's existing main landmark; avoid nesting a second main.
The host supplies the skip link and independent-project notice. Keep one h1 and
logical h2/h3 order. Dark surfaces need an explicit visible focus outline using
the accent; canvas uses the established dark-green outline. Do not remove native
select focus.

Transitions are optional and restricted to short opacity or transform feedback.
No entrance delay, chart draw-on animation, automatic scrolling, custom cursor or
scroll hijacking. Respect `prefers-reduced-motion`; a static state is complete.
Avoid continuous shimmer in the loading preview. Changes of selection must not
move keyboard focus or require an animation to finish before data is readable.

## Acceptance evidence and handoff

Implementation acceptance requires selection changes to update trace values,
correct dependent lap selections, explicit missing-data behavior, recoverable
preview states and keyboard-operable numeric alternatives. Browser QA should
capture 320px, tablet and desktop, inspect overflow, focus, touch targets and
reduced motion, and exercise all preview states. The synthetic context must stay
visible after every selection and state transition.

This file is design guidance, not evidence of executed browser verification.
Visual, behavior and contrast claims require the coordinator's final browser/test
record. The frontend owner implements UI files; the coordinator owns the local
model and contract proposal; QA owns assigned tests/preview host. Shared contracts,
route wiring and the OpenF1 adapter require a later explicit integration task.
