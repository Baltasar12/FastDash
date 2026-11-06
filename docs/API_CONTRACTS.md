# Future API contracts

Phase 00 has no external integrations, external-response schemas or production domain models. This document sets conventions; it does not claim provider payload shapes, endpoints, availability or quotas have been verified.

## Adapter responsibilities

Create a server-only adapter per provider under `src/data/providers/`. Fetch and validate untrusted responses at the boundary. Add Zod only when this work starts. Separate provider wire types/schemas from canonical domain types and feature view models. Components must never interpret raw provider responses.

Before implementation, verify official Jolpica-F1 and OpenF1 documentation, terms, attribution, rate limits, pagination, timestamps, field units and available seasons/sessions. Save representative, permitted fixtures and test normalization against them. Do not infer response schemas from examples in this repository.

## Canonical conventions

- Use explicit identifiers with provider-to-domain mapping. Do not assume two providers share IDs or join on display names.
- Use unambiguous UTC ISO 8601 timestamps for instants; keep source timezone/context for user display. Distinguish scheduled, actual and provisional times.
- Store duration as numeric milliseconds and attach units at the domain boundary; format lap times only in presentation code. Verify source precision before conversion.
- Give speed, distance, temperature and telemetry signals documented units. Preserve original precision; never manufacture extra precision.
- Represent unavailable data explicitly. Missing is not zero, a retired driver is not a slow lap, and a canceled session is not an empty successful race.
- Keep race/session/season identifiers with measurements. Define canonical types only after reviewing real provider semantics.
- Preserve provenance: provider, retrieval time, source reference where permitted, freshness and provisional/final status. Validate and normalize those fields without fabricating them.

## Results, failures and caching

Use a discriminated typed result that distinguishes success, unavailable coverage and operational failure. Agree the concrete model when the first adapter is built. Errors should carry a stable application code and retryability; never leak tokens or raw upstream exceptions to UI.

Handle timeouts, cancellation, rate limiting and bounded retries in the server data layer. Distinguish a failed fetch from an empty valid result. Define caching and revalidation per resource, respecting upstream quotas and corrections. Samples must remain in feature-local demo files with visible labels and must never be a silent production fallback.

## Optional Python/FastF1 boundary

If needed later, use a versioned interface to a separate optional Python runtime. Validate returned artifacts like every other provider, document sampling and computation provenance, and keep the standard Next.js development environment independent of Python.
