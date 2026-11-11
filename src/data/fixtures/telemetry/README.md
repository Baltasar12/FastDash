# Synthetic telemetry contract fixtures

Every context, person, source mapping, measurement and timing value here is invented.
The 2024 context exercises historical selection only; it does not describe a real race.
Keep `SYNTHETIC_TELEMETRY_LABEL` visible beside fixture charts and tables. Every result
has `metadata.source.kind = "synthetic"`; every sample has synthetic origin.

Import `createSyntheticTelemetryProvider` explicitly for tests or isolated development.
It performs no HTTP, clock, random, cache or environment lookup. It is never a production
fallback and must not be wired into public routes automatically.

`fixtures.ts` exports a race and qualifying session, two stable fictional drivers with
session-specific entries and laps 10/11, complete series with unequal cadences, gaps,
missing/invalid boundaries, and intentionally invalid normalization inputs. Invalid
inputs containing NaN are diagnostics only, not serializable normalized telemetry.

Provider scenarios: complete, gaps, partial-channels, duplicate-timestamps,
missing-boundary, invalid-boundary, ambiguous-driver, ambiguous-session,
unmapped-driver, timeout, rate-limited, upstream-error and empty. Before 2023 is
unavailable; unknown context, entry and lap are explicit unavailable responses.
Requests are structurally validated before scenario errors. Mappings are resolved
before telemetry retrieval. Elapsed windows without a usable origin are unavailable;
invalid end boundaries retain usable bounded samples with unavailable alignment. The direct missing-boundary fixture preserves independent timestamped samples with
null offsets for alignment tests.

The provider projects requested channels as explicit not-requested readings, clips
windows and gap annotations, preserves source sample indices and flags partial
selection. It does not reduce samples: a budget too small returns budget-exceeded.
The complete response envelope is checked against the shared UTF-8 byte limit.
Scalar difference means reported B minus A milliseconds; continuous distance delta
always remains unavailable. This fixture provider is not an OpenF1 implementation.
