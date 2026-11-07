# Phase 02C independent tribunal

## Scope and immutable evidence

Common baseline: `0a2d30a7e198d9f5dd3b2511d3620bdc0be2c061`, branch
`codex/phase02-telemetry-ux`. The initial frozen snapshot comprised 20 new files
under `src/features/telemetry-lab/**`; tracked changes were empty. The explicit
file list and SHA-256 hashes were recorded in the ignored review manifest.

- Initial manifest SHA-256:
  `ca897272ab6ecac8f24c8bcf97485eb609e48008fe79aec0c6bd081b48720a18`.
- Corrected 20-file manifest SHA-256:
  `eb33b20a0d43c7b6d7086a9c75232d64c131aace1b8861260447e3577a02f5de`.
- Manifest files: `test-results/telemetry-review-manifest.json` and
  `test-results/telemetry-review-corrected-manifest.json`.

These are frozen uncommitted snapshots, not invented Git commits. Each reviewer
verified all 20 hashes with zero discrepancies. Six files changed in the
correction cycle: main component, chart component, CSS, RTL test, browser test
and the handoff evidence. The local model and proposal remained unchanged.
This review record and its handoff link were added after the source re-review;
reviewers were asked to confirm the documentation-only addition before commit.

## Independent agents and recommendations

| Lens / native agent                                                                    | Initial recommendation                                     | Corrected recommendation                                             |
| -------------------------------------------------------------------------------------- | ---------------------------------------------------------- | -------------------------------------------------------------------- |
| Code — `/root/review_code`, configured `code_reviewer`                                 | Feature PASS, no confirmed code defects                    | Feature PASS; focus, legend derivation and regression paths reviewed |
| UX — `/root/review_ux`, configured `ux_reviewer`                                       | FAIL pending UX-01; UX-02 also recorded                    | Feature PASS; both findings independently verified resolved          |
| Security, QA and performance — `/root/review_security`, configured `security_reviewer` | Feature PASS, no confirmed security/data-integrity defects | Feature PASS; bounded corrections, no new exposure or findings       |

The reviewers were fresh instances and authored none of this implementation or
its tests. They performed read-only inspections and artifactless production
browser checks; the coordinator owned builds/tests/screenshots. Their inherited
permissions were unrestricted: read-only behavior was procedural, not an
enforced per-agent sandbox. No reviewer source/config/test/Git edits were found.

## Findings and disposition

| ID                 | Severity / evidence                                                                                                                               | Correction and verification                                                                                                                                                                                                                                            | Disposition                                                    |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| UX-01              | Medium, confirmed. Activating Return to sample with Enter unmounted the button and left focus on BODY in loading, unavailable and error previews. | A typed ref focuses the persistent State preview select in the recovery handler. RTL and production Playwright assert keyboard recovery/focus in all three previews and Race reset. UX independently verified at 320/1440px; security independently verified at 320px. | Resolved                                                       |
| UX-02              | Low, confirmed. The global legend was offscreen when reading the deep chart stack, especially on mobile.                                          | Every chart now has a named legend group with solid A / dashed B, full driver names and lap numbers. Legends wrap and update from selected laps. RTL/browser tests and independent UX inspection verify the result.                                                    | Resolved                                                       |
| Evidence gap       | The first root E2E output cleanup removed supplementary contrast/format evidence artifacts.                                                       | Coordinator regenerated the artifacts and preserved them by putting later root E2E output in its own ignored subdirectory. Reviewers confirmed final files exist and match the handoff.                                                                                | Resolved                                                       |
| Global format gate | `pnpm format:check` fails in 128 untouched baseline files with CRLF working-tree endings; index contents have LF.                                 | Feature format passes. In-memory LF checks pass for all 128 warnings without modifying those files. No formatter rule was changed or gate waived. Checkout normalization requires a separate task outside the authorized feature boundary.                             | Unresolved inherited limitation; blocks consolidated readiness |

There were no Critical/High findings, no unresolved feature findings, and no
dissent discarded. The initial UX FAIL is preserved above rather than replaced
by an unqualified historical PASS. The SVG-title hydration defect was found and
fixed during validation before the tribunal; see [HANDOFF.md](HANDOFF.md).

## Validation and limits

Final coordinator evidence: strict typecheck and lint PASS, 276/276 unit tests
(13 feature), main and isolated preview production builds PASS, 22/22 root E2E
and 8/8 feature E2E PASS, feature format PASS. Production browser checks cover
320/768/1440, tables, missing data, keyboard focus, touch, reduced motion and
state recovery. No provider traffic or page errors were observed. All four SVG
titles are also present with JavaScript disabled. The preview without its
explicit environment flag returned HTTP 404.

Code reviewers additionally checked broad synthetic input matrices in memory;
these are supplementary independent checks, not replacements for the recorded
suite. No real-device Safari/Firefox or manual screen-reader audit was performed.
Measured JavaScript numbers include React/Next, not only this feature. No
provider contract, alignment algorithm or real-data publication is approved.

**Consolidated readiness: FAIL only because the global formatting gate remains
unsatisfied. Feature review lenses: PASS after corrections.** A local feature
commit records the requested prototype and its limitation; it is not approval
to integrate or release. No push, PR, merge, main modification or deployment is
authorized by these reviews. The user's Phase 02C instruction authorizes the
local commit only.
