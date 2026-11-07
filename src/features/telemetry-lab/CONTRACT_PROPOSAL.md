# Telemetry contract handoff — proposal, not an implemented API

Status: Phase 02C frontend proposal. The Product Owner and shared-contract owner
must approve a separate implementation task. Nothing in this file extends
`F1DataProvider`, changes `F1_CONTRACT_VERSION`, or defines an OpenF1 wire schema.
`model.ts` is a disposable local presentation model; do not promote it into
`src/types/` or reuse its generator as a real-data fallback.

## Evidence and boundaries

Official documentation checked on 2026-11-07: OpenF1 historical access starts in
2023; completeness must still be checked per session/channel. Car data is sampled
at approximately 3.7 Hz, not a fixed synchronized clock. Speed uses km/h, gear
includes neutral, and the brake field is binary (0/100), not pressure. Lap and
sector durations use seconds; lap start is approximate. UTC timestamps may carry
fractional seconds. Location is approximate with an arbitrary origin, not a
certified track-distance coordinate. See the [OpenF1 API reference](https://openf1.org/docs/).

The [OpenF1 access and usage page](https://openf1.org/) currently lists historical
limits of 3 requests/second and 30/minute and describes non-commercial educational
use; it links [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/).
These observations do not clear third-party rights or approve SECTOR
redistribution. Recheck current terms, caching, publication and attribution with
the provider before implementation/release. No API dataset was requested here.

All requirements below are SECTOR design proposals, not claims that OpenF1
supplies every field. Unsupported fields need explicit absence, never inference.

## Identity mapping

| Entity  | Required normalized identity and context                                                                                | Adapter obligation                                                                                                                                                                                                             |
| ------- | ----------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Event   | Existing canonical season/round event ID, season, round, circuit identity/configuration and source mapping revision     | Map OpenF1 meeting identity explicitly; corroborate season, venue and schedule; distinguish testing from championship events. Do not join only on names, dates, array order or circuit. Ambiguity returns mapping unavailable. |
| Session | Canonical event/session ID, kind, optional qualifying stage, actual/scheduled times separately, original source label   | Map meeting/session keys to the authoritative session list. Handle sprint formats, cancellation, renamed sessions and multiple practice sessions. Never assume keys match Jolpica IDs.                                         |
| Driver  | Stable canonical person ID plus session entry ID, display name, season-specific racing number and source driver mapping | OpenF1's driver number is scoped to its session/season lookup, never the cross-season person key. Keep substitutions and changing entries explicit. Names/acronyms are display metadata, not reliable join keys.               |
| Lap     | Canonical session + entry + positive lap number, stable lap ID, start/end timing fields, revision                       | Keep qualifying stage, pit-in/out and deleted/invalid/partial status where supported. Missing start/end is legal. Never derive identity from duration or fastest ordering.                                                     |

Mapping records should retain provider ID, mapping version, evidence and confidence
(`verified`/`ambiguous`/`unmapped`), with a deterministic rejection path. Do not
fetch driver portraits, flags, team logos or circuit images as part of mapping.

## Suggested service boundary

Introduce a separately reviewed telemetry capability rather than silently adding
methods to v1 `F1DataProvider`. A proposed request contains canonical session ID,
two distinct entry/lap IDs, allowlisted channel IDs, requested coordinate mode and
a bounded display-point budget. The server validates all IDs, ownership and
limits before resolving provider references. A client never supplies an arbitrary
upstream URL, credential, provider query expression or unbounded time range.

A successful envelope should carry a contract version, canonical context,
per-lap series, timing metrics, alignment result, quality summary, reduction
metadata and provenance. Whole-response success may be partial; channel and
alignment availability are independent. Use serializable discriminated values
consistent with existing `FieldValue`/result conventions after contract review.
The following names describe requirements, not finalized TypeScript symbols.

## Samples, units and precision

- Preserve original UTC timestamp text, supplied fractional precision and an
  explicit normalized offset from a documented origin. Proposed browser offset:
  finite numeric milliseconds relative to lap start, retaining submillisecond
  precision if supplied; do not invent precision through padding or rounding.
- Preserve approximate start status and any known uncertainty independently of
  string precision. An ISO timestamp with six decimal places does not establish
  microsecond accuracy. If parsing through JavaScript Date would lose fractions,
  preserve source text and parse the fractional part explicitly on the server.
- Each sample belongs to one session, entry and lap. Keep source order metadata
  and deterministic handling for duplicate/out-of-order timestamps. Reject
  non-finite values and quarantine incompatible units/identities. Expose counts
  and reasons for rejected samples; do not silently repair a series.
- Proposed channel units: `speedKilometersPerHour`, `throttlePercent`,
  `brakeEngaged` (boolean) and `gear` (integer including neutral). Preserve provider
  raw brake semantics on the server and normalize 0/100 only after validation;
  never label the result brake pressure or braking force. Verify the intended
  interpretation of throttle with the provider before using pedal terminology.
- Timing metrics use numeric milliseconds, source precision, availability and
  method (`reported` or `derived`). Retain original seconds when converting if
  needed to audit precision. Sector count/definition comes from context. Do not
  reconstruct a missing sector from a lap total without marking it derived.
- Location, if later requested, needs separately validated coordinate units,
  origin, frame and uncertainty. Do not rename x/y/z to meters of track progress.
- Every channel value needs availability and origin: observed, derived,
  interpolated or synthetic. For compact arrays, a mask/segment metadata may
  encode these states if the contract preserves the same meaning unambiguously.

## Missing samples and completeness

Distinguish source-missing, not recorded, unsupported, rejected-invalid,
outside-lap-window and not applicable. A reported zero throttle, brake-off or
neutral gear remains a valid value. Null must never coerce to zero.

Return missing intervals per channel with start/end offsets and reason. Also
return the expected/observed cadence when known, observed count, dropped count,
first/last valid offsets, maximum gap and coverage calculation/method. Do not
publish a percentage based on an invented fixed expected cadence. Channel
completeness is separate from whether the entire session/lap collection was
retrieved. Partial lap endpoints cannot become a complete lap by extrapolation.

Charts split at declared gaps or invalid spans. Tables show actual sample times
and missing states. Linear guides between adjacent valid continuous samples may
aid reading, but are visual interpolation. Discrete channels use steps only as a
display convention, without asserting exactly when an unsampled transition
occurred. Do not bridge gaps, smooth curves, or extrapolate beyond observations.

## Alignment and delta

Provide an alignment discriminant:

| Mode                                               | Required metadata                                                                                                                                                             | Permitted presentation                                                                |
| -------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| Unavailable                                        | Stable reason code and human explanation                                                                                                                                      | Independent traces/tables; no continuous delta                                        |
| Elapsed from each lap start                        | Origin per lap, approximate boundary flags, valid intervals and timing uncertainty                                                                                            | Compare sample behavior against elapsed seconds; explicitly not synchronized position |
| Normalized lap progress, if later approved         | Normalization method and distortion warning                                                                                                                                   | Descriptive shape comparison only; never true distance delta                          |
| Validated common track distance, future capability | Circuit/configuration reference, distance units, boundary anchors, monotonic mapping, algorithm/version, interpolation rules, tolerance/error estimates and supported overlap | Distance-aligned traces/delta only within reliable overlapping intervals              |

Do not align by equal array index or claim two timestamped feeds are synchronized.
Even independently zeroed elapsed-time series are not at equal track positions.
For true delta, define sign (proposed `time B minus time A` at the same validated
distance), start/finish anchors, pit-lane exclusion, lap validity, uncertainty
threshold and gap propagation. The algorithm and acceptance tolerances need
recorded fixtures and specialist review. Low-confidence intervals must have no
delta; an unknown offset must not become zero.

Subtracting two reported full-lap durations is a scalar timing difference; it is
not evidence for a continuous distance delta. Phase 02C only shows that scalar
for synthetic laps and keeps track-distance delta unavailable.

## Quality metadata

Required independent dimensions: source kind, channel completeness, timing
precision/accuracy, sample validity, lap validity, alignment quality and source
publication finality. Add stable warnings such as `approximate-lap-start`,
`missing-interval`, `partial-boundary`, `identity-unmapped`, `unsynchronized`,
`invalid-lap` and `reduced-for-display`. Unknown finality stays unknown; an old
event is not automatically final. Keep tyre/conditions/traffic context absent
unless supported; never infer why a driver was quicker from two curves alone.

The UI needs concise visible warnings plus fuller accessible explanations. Data
tables and exported views must retain the same quality and provenance context.
Do not hide a partial-data label because the chart can draw some samples.

## Downsampling and client payload budgets

Proposed initial budgets, pending measurement/approval:

- One comparison request: two laps, four allowlisted channels, no whole-session
  telemetry payload. Cap each selected lap window at 10 minutes; longer laps need
  an explicit supported request policy or a bounded unavailable response.
- Start with at most 600 display rows per lap and a hard 1,200-row combined cap.
  Share timestamps across channels only when the source actually shares them.
  Keep four channels on each row where appropriate; do not duplicate the full
  sample object per chart. The current prototype has only 49 rows per lap.
- Target at most 150 KiB compressed and cap normalized serialized JSON at
  512 KiB before delivery. Measure actual wire bytes, not just sample count.
  These are proposed SECTOR budgets, not provider limits or achieved benchmarks.
- Server reduction should preserve extrema, endpoint anchors, missing-interval
  boundaries and discrete transitions. Reduce contiguous valid segments
  independently. Never average binary brake or categorical gear into invented
  intermediate states. If fidelity cannot fit the cap, return an explicit
  budget/coverage limit or request narrower bounds; do not silently truncate.
- Return input/output counts, algorithm/version, budget, reduction ratio,
  per-channel retained features and source-vs-display resolution. Display
  interpolation is separate from downsampling. Table captions must identify
  reduced display samples; a bounded raw-data download is a separate future task.
- Bound adapter response bytes, parse time, concurrency and time window as well
  as the final client payload. Use abortable requests and server-side validation.
  No client polling, chart library or worker is needed for this prototype.

## Provenance, freshness and cache behavior

Preserve provider attribution/source reference (allowlisted, no sensitive query),
source kind, retrieval timestamp, source update timestamp only when actually
known, event/session timing, normalization and alignment revisions, and original
cache retrieval/expiry. Cache hits must not rewrite retrieval timestamps.
Publication finality, collection completeness and freshness remain independent.

Apply existing cache policy only after confirming provider-specific constraints:
versioned canonical keys, bounded TTL, original stale age, in-flight
deduplication, shared request budget, validated Retry-After and no retry storms.
Historical data may be corrected. A stale usable dataset needs a visible label
and bounded last-success time; unavailable/error results must not masquerade as
stale telemetry. Never silently substitute synthetic samples after failure.

## Error and unavailable states

| Result      | Stable proposed reasons / behavior                                                                                                                                               |
| ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Success     | Complete or partial validated data, independent channel/alignment availability, visible quality/provenance                                                                       |
| Empty       | Valid request and verified no matching records; distinguish non-participation from unsupported coverage                                                                          |
| Unavailable | Before 2023, unsupported session/channel, unpublished/cancelled session, unresolved mapping, missing lap boundary, no reliable alignment, insufficient overlap or payload budget |
| Error       | Network, timeout, rate-limited, invalid response or provider unavailable; sanitized code, retryability and bounded retry-after if validated                                      |
| Loading     | Consumer-only state; announce progress without invented metrics; preserve operable selection/recovery                                                                            |

An alignment failure should not discard otherwise usable speed data. An
operational error is not an empty successful array. Never expose raw upstream
responses, stack traces, tokens or arbitrary error messages to the client.

## Required adapter acceptance work

1. Obtain reviewed rights/attribution/redistribution and operational coverage
   evidence. Recheck documentation and actual allowed fixtures when work starts.
2. Agree versioned shared capability with the coordinator; review consumer
   migration impact without modifying the existing results provider implicitly.
3. Validate mappings, sample units/precision, approximate boundaries, duplicate
   times, source gaps, partial laps, unmapped substitutions and every typed state.
4. Verify downsampling preserves gaps/extrema/discrete transitions within byte
   budgets; test timeouts, limits, Retry-After, freshness and no synthetic fallback.
5. Keep true delta disabled until a separately reviewed alignment implementation
   meets its recorded error thresholds. Integrate only after explicit approval.
