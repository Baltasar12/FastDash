# Shared telemetry contracts — sector-telemetry-v1

Phase 03A implements an independent capability, revision `TELEMETRY_CONTRACT_VERSION = 1`. `F1_CONTRACT_VERSION = 1` and all existing F1 provider operations remain unchanged. Source types and pure validators in `src/types/telemetry*.ts` are authoritative. There is no HTTP adapter, route activation, UI migration, cache implementation or production fallback in this change.

## Operations and exhaustive outcomes

`TelemetryProvider` supports `discover({season})`, `getEntries({sessionId})`, `getLaps({sessionId,entryId})`, `getLapTelemetry({...selection,...display})`, and `compare({...display,selections:[A,B]})`. One comparison has exactly two distinct session entries and one lap per entry in one session. The provider composes normalized retrieval internally; consumers must not independently request a second competing comparison implementation.

Every response has `version: 1` and discriminates `success`, `empty`, `unavailable` or `error`. Loading is consumer-only. Exhaustively switch on `status` and use `never` for the default. Partial usable telemetry is successful with independent quality/coverage metadata, never a fabricated complete response. Empty means a valid, verified context with no records. Mapping ambiguity, pre-2023 coverage, unknown identities, not-published, cancellation and budget limits are unavailable, not empty. Operational errors use the existing sanitized `DataError` vocabulary with independent telemetry envelopes and failure metadata. No raw URLs, exception text, response bodies, credentials or provider query expressions cross this boundary.

The first OpenF1 consumer scope is historical race and main qualifying sessions. The canonical kind vocabulary can represent other sessions, but discovery must advertise only actually supported sessions; unsupported kinds return `not-covered`. A year since 2023 is not a claim that any event, session, entry, lap or channel is covered.

## Identity and mapping

Existing event IDs remain validated season/round IDs and session IDs include canonical session kind. OpenF1 meeting/session keys are explicit references, never substitutes for canonical IDs. Meetings can be testing events; do not invent a championship round for a test. Reconcile canonical calendar, session kind, venue/configuration and schedule with curated/corroborated evidence. Names, dates, venue alone and array order are insufficient joins.

A `TelemetryEntry` contains a stable `Driver.id` and a session-specific entry ID. The latter encodes the canonical person ID within the session; racing number is metadata. OpenF1 entry reference contains meeting key, session key and driver number, scoped to that participation. Substitution or number changes require verified person mapping, never global identity by number. Lap ID derives only from entry ID and positive integer lap number; duration, fastest ranking and timestamp never define identity.

`IdentityMapping` explicitly distinguishes verified, ambiguous and unmapped. Every case carries provider reference and mapping revision, method and evidence IDs. Only verified mappings can resolve application requests. Providers must validate positive safe integer provider keys, number ranges, reference ownership, canonical IDs and corroboration before constructing these types; TypeScript alone does not validate network input. Ambiguous candidates remain diagnostics; selecting the first candidate is prohibited. Canonical migration needs a reviewed mapping revision and cache invalidation.

## Measurements, time and missing data

- Speed is km/h. Throttle is percentage of maximum engine power per current OpenF1 wording, not a pedal-position or torque claim. Brake is engaged/off boolean, never pressure. OpenF1 0/100 normalizes only after validation; 1, other numbers, strings and non-finite values are rejected. Gear is integer 0 (neutral) through 8.
- Available numeric readings retain source values, including genuine zero; missing readings retain reason. Null/undefined inputs normalize to source-missing, never zero. Invalid channels are rejected independently so valid values in the timestamped row survive; `RejectedSample.channel` identifies this case. Channel descriptor resolution and measurement accuracy stay unknown unless supported. Row origin applies to all available readings in that row; a future mixed-origin channel needs a reviewed per-reading extension rather than mislabelling it.
- Lap and sector durations are numeric milliseconds with original seconds, reported/synthetic origin and explicit source resolution. Conversion does not improve accuracy. Never infer missing sectors from a total. Unknown lap validity, pit-in and stage remain unknown; OpenF1's documented pit-out flag does not imply a general validity or pit-in flag.
- Original timestamp text retains UTC suffix and 0–9 fractional digits. Shared parsing validates Gregorian calendar values. Internal integer nanosecond arithmetic avoids JavaScript Date truncating fractional seconds; output offsets are finite numeric milliseconds and not a claim of nanosecond instrument accuracy. BigInt never appears in a response.
- Source order is retained in zero-based indices. Accepted rows sort chronologically. The first source occurrence of an instant wins deterministically, including equivalent Z/+00:00 timestamps; later duplicates are rejected, never averaged/merged. Reordering and rejection emit stable warnings. Missing/invalid timestamps are rejected with source indices.
- Approximate start, missing/incomplete end and uncertainty are independent of timestamp textual precision. Missing origins yield null offsets in diagnostic fixture series; an elapsed-window provider request without an evidenced origin returns `missing-boundary` because it cannot safely select its window.

## Alignment and timing comparison

Only independently elapsed time from each lap start is supported. It is explicitly not equal track position, synchronized cadence or array-index alignment. Approximate source starts, unknown uncertainty or partial data degrade alignment. Missing or reversed/invalid boundaries, or insufficient valid samples, make it unavailable; usable independent traces need not imply a reliable alignment. Valid intervals exclude declared gaps and never extend beyond observed sample bounds. They are conservative across requested channels; channel-specific quality still controls individual chart gaps.

The scalar difference is **reported duration B minus A**, only for positive finite durations on laps not marked invalid/deleted. No source timing is reconstructed from samples. Source validity may remain unknown and must be displayed. Continuous-distance delta is always unavailable with `validated-distance-alignment-required`.

Future true distance alignment requires circuit configuration/version, independently validated distance units/frame, monotonic mapping, start/finish anchors, pit-lane exclusion, supported overlap, algorithm/version, interpolation policy and measured uncertainty/tolerances. Low-confidence/gap intervals must have no delta. Location x/y/z alone does not satisfy this requirement. That algorithm is outside Phase 03A.

## Quality and display

Coverage exists per session/entry/lap and channels; event support comes from its explicit supported session list. Quality separates collection completeness, lap boundary coverage, source finality, missing intervals, rejected rows/channels, cadence, maximum gap, timestamp uncertainty, coverage method, interpolation and warnings. Old data is not automatically final. Do not calculate coverage percentage from assumed 3.7 Hz cadence. No interpolation or extrapolation is performed by shared normalization or fixtures.

Consumers must visibly identify synthetic, partial, stale, provisional and unavailable values at the point of display, including tables and any future export. Show elapsed seconds and units; retain actual independent sample times. Break lines at declared gaps or invalid spans. Adjacent continuous guides or discrete steps are display conventions, not measured intermediate values; any future visual interpolation must be labelled. Never bridge gaps, smooth traces or carry values beyond observed bounds.

## Budgets and deterministic reduction policy

These are SECTOR limits, not promises made by OpenF1:

| Boundary            | Hard limit                                                                   |
| ------------------- | ---------------------------------------------------------------------------- |
| Selected laps       | 2; one per distinct entry, same session                                      |
| Channels            | Nonempty, unique subset of speed/throttle/brake/gear                         |
| Elapsed window      | Inclusive bounds, 0 <= from < to <= 600,000 ms                               |
| Display rows        | 2–600 per lap, at most 1,200 combined                                        |
| Serialized response | 512 KiB exact UTF-8 JSON, including envelope/metadata                        |
| Compressed target   | 150 KiB; target only, measure transport in 03B                               |
| Source response     | 2 MiB decoded streamed bytes before JSON parse (do not trust Content-Length) |
| Source samples      | 5,000 per selected lap before normalization/reduction                        |
| Catalog collections | 64 events/year, 16 sessions/event, 32 entries/session, 300 laps/entry        |
| Logical operation   | 20 upstream requests, 2 concurrent, 15 s total timeout                       |

The 600/1,200 proposal is retained as a ceiling, not a guarantee of fidelity or byte size. A deterministic serialization sizing probe using 1,200 four-channel rows, nine fractional timestamp digits and fractional values measured 448,446 UTF-8 bytes for sample containers alone (75,842 bytes left under the cap); it excludes full context/quality/envelopes and is not a production payload benchmark. Actual serialized bytes override row counts. A mandatory-feature set that cannot fit either budget returns `budget-exceeded` and asks for a narrower request; it must never silently truncate or manufacture values. Shared validation rejects non-finite/non-JSON payloads and measures UTF-8; normalized fixtures enforce budgets. Source streaming, parse/deadline enforcement and operational quotas are 03B obligations.

03B's future deterministic `preserve-features-v1` reducer must work on chronologically ordered valid segments independently. Mandatory retained rows: each segment endpoint, observed rows on both edges of gaps/invalid spans, each gear/brake transition's adjacent observed rows, plus global min/max of each continuous channel within each valid segment. Bucket extrema are added only after the mandatory set and bucket count have been fixed. Define M as the union of mandatory rows, including only global min/max for each continuous-channel segment (ties choose earliest timestamp, then source index). If M exceeds the budget, fail. With R = budget minus size(M), and S = number of requested continuous-channel valid segments, choose K = floor(R / (2 * S)) buckets when S > 0, otherwise K = 0. For K > 0, split the requested elapsed window into K equal-duration buckets anchored to request.from, with only the final bucket inclusive at its end. For each segment/bucket intersection retain its observed min/max using the same tie rule; this adds at most 2 * S * K rows. Fill unused slots from remaining observed rows in ascending timestamp/source-index order. Never share reduction across missing intervals. Retain original observations only. Never average discrete channels, invent timestamps, infer an exact transition time or extrapolate. If mandatory rows exceed budget, return unavailable. Record input/output count, requested budget, algorithm/version and retained feature classes. Require adversarial tests for spikes, flat extrema ties, gaps, transition density and byte overflow before enabling reduction. This task implements metadata and validation, not a production reducer; fixtures use `algorithm: none` and fail narrower caps they cannot satisfy faithfully.

## OpenF1 readiness evidence

Official references checked 2026-11-07: [API reference](https://openf1.org/docs/) and [access, FAQ and footer](https://openf1.org/). No real provider response is stored in synthetic fixtures and no automated test needs external access.

Meetings include GP/testing contexts and sessions carry separate meeting/session keys and source labels. Drivers describe session participants with season racing numbers. Laps document seconds for lap/sector timings, approximate date_start and pit-out boolean. car_data is approximately 3.7 Hz, not synchronized fixed cadence; speed, throttle, brake and neutral gear use the semantics above. Location is approximate with arbitrary origin and no documented true track-distance mapping. Stints can enrich tyre/lap context later but do not establish exact time boundaries or lap validity. No ordering, unique timestamps, universal completeness, pagination or maximum response size guarantee was found; 03B must bound and verify rather than assume.

Historical access since 2023 is free without authentication. Community limits are both 3 req/s and 30/min; local concurrency 2 does not replace a shared quota limiter. The site defines live as 30 minutes before through 30 minutes after a session, requiring paid access. 03B must exclude that window using source session timing and a server clock; unknown timing means conservative unavailable, not guessed historical access. No authentication or paid integration is introduced.

Publication remains conditional: site text describes educational/research/non-commercial fan use, disclaims ownership of underlying data, links CC BY-NC-SA 4.0 in the footer, and separately says credit is not required. This does not establish the license scope or third-party redistribution rights for telemetry datasets. No unrestricted redistribution claim is made. Confirm applicable license, attribution, caching and public-display/redistribution conditions before real-data publication. Source attribution remains in envelopes regardless; contract-only PR publication does not publish a dataset.
