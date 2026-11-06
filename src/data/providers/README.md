# Provider boundary

Reserved for future server-only adapters implementing `F1DataProvider` from `@/types/f1-provider`. Phase 00.6 adds contracts and synthetic fixtures only; there are no HTTP requests, external schemas or cache implementations here.

The Data Layer owns adapters, provider wire validation, identity mapping, normalization, request deduplication and caching within this directory. Use the shared contracts without redefining them. Keep concrete implementations server-only when introduced; frontend code imports interface types and receives normalized serializable outcomes through server feature queries. Do not export raw payloads or provider exceptions.

Follow [API conventions](../../../docs/API_CONTRACTS.md) for coverage, safe errors, freshness, licensing and quota verification before integration. Synthetic fixtures in `src/data/fixtures/` are opt-in development/test data and never a production fallback. Shared contract changes belong to the integration coordinator.
