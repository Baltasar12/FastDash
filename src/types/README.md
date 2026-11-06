# Shared types

Phase 00.6 introduces normalized contract revision `F1_CONTRACT_VERSION = 1`:

- `f1.ts`: domain entities, explicit field availability, dates and units.
- `f1-identifiers.ts`: validated event/session identity constructors.
- `f1-provider.ts`: replaceable seven-operation interface and serializable outcomes.

Import specific modules with `import type`; no global barrel. The integration coordinator owns changes after this phase. Feature-only types remain inside their feature. These are application contracts, not verified external schemas or publication rights. Adapters must validate actual source responses and map canonical identities before returning them. See [API contracts](../../docs/API_CONTRACTS.md) and [handoff](../../docs/CONTRACTS_HANDOFF.md).
