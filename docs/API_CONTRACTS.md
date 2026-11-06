# Shared F1 contracts — sector-f1-v1

Phase 00.6 defines provider-independent, serializable contracts and synthetic development fixtures. It implements no HTTP adapter, external schema, cache service or product UI. Source code under `src/types/` is authoritative; the revision is `F1_CONTRACT_VERSION = 1`. See [CONTRACTS_HANDOFF.md](CONTRACTS_HANDOFF.md) for imports and [WORKSTREAMS.md](WORKSTREAMS.md) for exclusive ownership.

## Domain and identity

- Season: year, available events and explicitly available/unavailable championship metadata. Do not infer a complete calendar or completed championship from a short list.
- Driver: stable identity/name/nationality. Racing number, code and constructor association belong to an entry with season context, never an immutable driver identity. Standings can associate multiple constructors with a driver who changes teams.
- Constructor: stable identity/name, optional nationality and optional original visual metadata. A display color is not a license to use a team logo.
- Grand Prix: deterministic season/round identity, official event name, circuit, location/country, date and authoritative session list. Session types include practice 1–3, qualifying, sprint qualifying, sprint and race. Historical Sprint Shootout maps to sprint qualifying; preserve source meaning in the adapter. No fixed weekend template or assumed session coverage.
- Driver/constructor standings: season and classification, points and wins. Preserve source round/as-of context on each standings row. Missing scores or wins must remain explicitly absent.
- Race results: context, entry, grid, classification/position text, points, laps, finish status, elapsed time/gap/laps-down and optional fastest lap. Non-numeric classification is legal; a classified retired driver is possible. Grid pit-lane starts and unknown grids must not become a fabricated zero position.
- Qualifying: context, entry, classification and recorded stage list, including Q1/Q2/Q3 when known. A stage that was not run is different from an unavailable recorded time. Other formats retain explicit stage identifiers; never manufacture three-stage times.

Event IDs derive only from validated season and round: `f1:<year>:<round>`. A reschedule does not change identity; a corrected source round requires explicit identity migration. Session IDs append the normalized session kind. Use constructors in `f1-identifiers.ts`; do not construct IDs from event names, dates or UI indexes. Driver/constructor/circuit IDs are canonical opaque IDs, mapped by each adapter; do not assume provider IDs match or join on display names. Adapter mapping changes require coordination. Qualifying stage IDs remain stable within their session.

## Missing fields, dates and units

Fields that may be absent use a discriminated value: available value, source missing, unavailable (with reason), or not applicable. An optional property denotes optional enrichment only; consumers must not interpret omission as zero or a result of no participation. Never substitute `0`, empty time strings or `NaN`. Compile-time contracts do not validate untrusted JSON; future adapters must validate before constructing them.

Calendar dates use Gregorian `YYYY-MM-DD` in source calendar context, without inferring midnight UTC. Known instants use ISO 8601 UTC `YYYY-MM-DDTHH:mm:ss[.fraction]Z`; preserve supplied precision and any known source timezone/context. A date without a time is still a useful date. Scheduling is distinct from actual timing and canceled/unknown sessions. Do not invent an IANA timezone from a circuit name or an actual start from a planned start.

Durations are numeric milliseconds with explicit `milliseconds` property names; gaps are milliseconds or whole laps, never mixed numeric columns. Points may be fractional; lap counts, round, positions and wins are integer counts when available. Durations are nonnegative and finite. Preserve source precision when converting (a whole-second source does not gain millisecond precision merely by multiplication). Fastest-lap average speed uses `kilometersPerHour` when supplied. No telemetry signal models are introduced in v1.

## Provider boundary and consumption

`F1DataProvider` exposes seven asynchronous, typed object-request operations: supported seasons, season calendar, driver standings, constructor standings, event details, race results and qualifying results. A complete logical collection is returned; internal upstream pagination must be exhausted or explicitly reported incomplete, never silently truncated. Each row carries its domain context. Standings expose `asOfRound: FieldValue<number>`; `sourceUpdatedAt` is optional genuine source update time. Neither is inferred from retrieval time.

The interface and result types are safe type-only imports for features. Concrete HTTP adapters belong in server-only modules under `src/data/providers/`; wire schemas stay beside them. Introduce server-only enforcement when an adapter exists. No frontend component imports adapter internals, handles provider exception strings or receives credentials. Compose a provider at a server query boundary and pass serializable data to a small client island only when interaction requires one.

Expected operational failures resolve to typed results; adapters catch and sanitize upstream errors. Programming defects may still throw and should reach application error handling. No raw response bodies, URLs with tokens or stack traces belong in public error metadata.

## Result, error and consumer states

A discriminated result distinguishes:

| State       | Meaning                                                                                                                                                                           |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| success     | A known dataset/entity, with provenance, completeness, publication status and cache metadata.                                                                                     |
| empty       | The query is valid and the provider has confirmed there are no matching records. It is not shorthand for an unknown season, unrun session or unpublished results.                 |
| unavailable | Unknown season/event, not published, unsupported coverage, canceled session. Reason is explicit; never a successful empty array.                                                  |
| error       | Operational failure: network, timeout, rate limit, invalid upstream response or provider unavailability. Stable application code, retryability and optional retry-after guidance. |

Consumer loading is a separate `DataState` branch; stale/cached data is metadata on a result, not a contradictory fifth response state. Cache provenance, publication finality and collection completeness are independent. An incomplete successful dataset must expose its warning; final means source finality when supported, not SECTOR guessing from the event date. Retry after an availability change differs from retrying a failed request.

Fixtures provide each case, including incomplete data, for consumer development. See the handoff example for exhaustive narrowing. UI must visibly identify synthetic provenance at the point of display, and identify stale/provisional/partial data when relevant. Loading or errors must never replace unknown metrics with zero.

## Cache and freshness integration policy (future adapters)

These are project defaults, not verified provider quotas or implemented timers. A must confirm official limits before integration; stricter provider requirements override defaults.

| Resource / context                                                 | Fresh TTL          | Stale-if-error ceiling |
| ------------------------------------------------------------------ | ------------------ | ---------------------- |
| Historical race/qualifying results, final completed standings      | 24 hours           | 7 days                 |
| Historical calendar, completed season metadata                     | 24 hours           | 7 days                 |
| Current standings and published current-event results              | 5 minutes          | 1 hour                 |
| Current/upcoming calendar and event details                        | 1 hour             | 24 hours               |
| Supported seasons                                                  | 24 hours           | 7 days                 |
| Not published, temporarily absent or confirmed empty current query | At most 30 seconds | None                   |

Do not infer completion/finality from year alone; choose the conservative current-data policy when unknown. Historical data can be corrected: never cache forever. Track original retrieval time and expiry; a cache hit does not reset either. Expose cache hit/miss/stale with original provenance and a check timestamp if known. Do not serve stale unavailable/error objects as usable data. Stale success requires an explicit freshness label, last successful timestamp and bounded stale-if-error policy; the ceiling is measured from the original `expiresAt` and never extended by failed refreshes. Once it expires return the actual failure/unavailability.

Cache namespace: `sector:f1:v1:<provider-id>:<operation>:<canonical-query>`. Normalize validated integer year/round and documented optional selectors; sort named query fields, omit absent fields consistently, reject unknown/invalid selectors. Encode query values, isolate providers and contract versions, and never include credentials or raw upstream URLs. Collection pagination is internal: key the complete logical query, not an arbitrary source page. Event-details IDs derive from the same normalized year/round as results. Do not key standings with the wall-clock date or unsanitized objects.

Deduplicate identical in-flight requests within a server process/request and use Next.js server cache/revalidation where appropriate. Do not promise cross-process locking or persistence without infrastructure. Use one request budget per provider, bounded pagination/concurrency and abortable timeouts. No scheduled background jobs. Revalidation occurs on demand after TTL; manual invalidation must use the same normalized key/tags. Keep cached values immutable and prevent one consumer mutating another's data.

Network/timeout/invalid-upstream failures must not enter the normal data cache or replace the last valid value. A separate short operational cooldown may prevent retry storms. Honor validated Retry-After (UTC date or bounded seconds), suspend provider-wide requests during rate-limit cooldown, and use bounded jittered retries only for retryable conditions. No immediate recursive retries; frontend components do not implement provider retry loops. Unknown seasons/events may be negatively cached for at most 5 minutes, but never indefinitely; distinguish unsupported coverage from not yet published results.

Provenance includes provider identity, synthetic/real source kind, retrieval instant, permitted source reference, freshness and publication/completeness context. Preserve source update/as-of time only if actually supplied. Retrieval time is not the time the event occurred. Do not imply a live feed from recent retrieval.

## Provider assumptions, rights and future extensions

v1 is a normalized target, not a claim that every source supplies every field. Championship title, visual metadata, detailed status, gaps, fastest lap and stage coverage are optional or explicitly unavailable enrichments. Actual start times are outside v1; `Session.start` is the reported scheduled start. The adapter owns source mapping and uncertainty; no Jolpica JSON schema or endpoint is invented here. Provider response validation and permitted representative source fixtures are future Data Layer work. Shared fixtures are entirely synthetic and do not verify upstream compatibility.

Before any Jolpica/OpenF1 integration, verify official documentation, coverage by season/session, timestamp/unit semantics, pagination, quotas, licensing, attribution and public redistribution conditions. Free access does not confer unlimited redistribution or commercial rights. Phase 00.6 neither verifies nor grants publication rights. Respect request limits; retain required attribution and the independent-project notice. Use no unlicensed F1/team marks, photographs or media. Historical/session data must never be marketed as live timing.

Future OpenF1 integration needs explicit identity mappings, coverage checks and adapter-specific runtime validation; do not join on racing number across seasons, assume session IDs are shared or equate sample frequency with live coverage. Telemetry models, client polling and Python/FastF1 remain outside v1. A later optional Python runtime must return versioned, validated artifacts without becoming a prerequisite for standard Next.js development.

## Contract compatibility

The integration coordinator owns `src/types/**` and shared fixtures after Phase 00.6. Any semantic/shape change needs both consumer impact review and updated fixtures/tests before dependent work resumes. Breaking changes increment `F1_CONTRACT_VERSION` and the cache namespace; additive optional enrichment still requires coordinated review. Each independent session records the same validated contract commit, never just a version label or a moving branch name.
