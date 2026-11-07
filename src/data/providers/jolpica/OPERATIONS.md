# Phase 02B — operating boundary and integration handoff

This is implementation evidence and a proposed operating design, not deployment approval. Scope remains `src/data/providers/jolpica/**`; `F1DataProvider` v1 and application composition are unchanged.

## Official verification — 2026-11-07

The official repository `main` resolved via `git ls-remote` to `0fdc5a2584d6aae670d7b7b0188542493de2e437`. The following published documents were reread before implementation:

- [Rate limits](https://github.com/jolpica/jolpica-f1/blob/0fdc5a2584d6aae670d7b7b0188542493de2e437/docs/rate_limits.md): unauthenticated 4 requests/second and 500/hour; other clients sharing an IP can consume the same allowance. Limits can change, including decreases.
- [API documentation](https://github.com/jolpica/jolpica-f1/blob/0fdc5a2584d6aae670d7b7b0188542493de2e437/docs/README.md): identifying application/version User-Agent is required. The adapter preserves `SECTOR/0.1.0 (independent F1 analytics)` and JSON pagination.
- [Terms](https://github.com/jolpica/jolpica-f1/blob/0fdc5a2584d6aae670d7b7b0188542493de2e437/TERMS.md), last updated 2025-08-27: non-commercial data use under CC BY-NC-SA 4.0; commercial use requires contacting the provider; no uptime or correctness guarantee.
- [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/): credit, license link, modification notices, non-commercial use and applicable ShareAlike obligations; retain supplied notices and avoid implying endorsement. Assess other rights separately.

The software repository's Apache-2.0 license is not the data license. Access to an endpoint alone grants no unrestricted redistribution right. This review does not establish legal clearance for public launch or chain of title for every underlying source.

## Audit and intended improvements

The baseline already validated every page, bounded response size and pagination, froze normalized values, deduplicated identical logical calls, counted retries against rolling quotas, and used explicit stale metadata. Its shortcomings were insertion-order eviction of frequently read historical data, redundant event-details requests after calendar retrieval, repeated retries by sequential callers during outages, early truncation of long Retry-After values to 24 hours, and failure to honor a 503 Retry-After.

Historical reuse must respect the existing contract: old year alone is not evidence of source finality or completed standings. Keep current conservative TTLs until verified completion evidence and an agreed policy exist. LRU retention and reuse of a fresh calendar reduce traffic without implying final results or renewing retrieval timestamps. Empty/unavailable outcomes remain distinct from errors and stale successful data. Neither negative cache entries nor failures provide stale sporting records.

## Deployment scenarios and release blockers

| Scenario                                                                            | What the current implementation can guarantee                                        | Required action before release                                                                                          |
| ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------- |
| Genuinely one process, one module instance, stable fetch identity, exclusive egress | Local rolling budget, cooldown and bounded caches coordinate that process's requests | Prove topology and that no other process/client uses the IP allowance; account for restart history and traffic demand   |
| Node cluster, multiple containers/replicas, rolling deployment overlap              | Each process has independent memory; aggregate requests can exceed both windows      | Route all upstream traffic through one proven coordinator, or provide atomic shared quota admission and shared cooldown |
| Independently scaling serverless instances                                          | Cold starts lose counters/cache; concurrent instances multiply requests              | Shared coordination is a release blocker; limiting per-instance concurrency alone is insufficient                       |
| Shared data cache without atomic quota coordination                                 | Can improve reuse, but simultaneous misses and retries can still exceed quota        | Add coordinated miss ownership and request admission; cache alone is insufficient                                       |

[Node documents that cluster workers are separate processes](https://nodejs.org/api/cluster.html#how-it-works). [AWS documents independent execution environments and concurrency scaling](https://docs.aws.amazon.com/lambda/latest/dg/lambda-concurrency.html). The implications above are engineering deductions from that isolation and Jolpica's IP scope; no hosting account or topology was inspected.

The in-memory limiter coordinates only callers sharing the same fetch function identity in the same loaded module/process. A wrapper, hot reload, separate module runtime, process restart, build worker or another application may have independent counters. A single process cannot observe unrelated traffic behind NAT. A restart must not automatically be treated as a fresh upstream allowance: retain externally verified quota history or enforce a full sustained-window quiet period for all users of that egress before enabling requests. No startup persistence or deployment guard is installed here.

Public multi-instance/serverless production remains **blocked** in this ownership scope. Even a proposed single-process release needs an approved exclusive-egress/restart plan and measured traffic budget. The adapter degrades to eligible explicitly stale success, or a typed failure, when admission is denied. It never switches to synthetic records.

## Bounded shared coordination proposal — design only

The integration coordinator should choose the simplest verified topology first. A single upstream gateway may be sufficient if its lifecycle, all egress users and durable quota state are controlled. Otherwise an infrastructure adapter can implement the following internal interface; it would not expand `F1DataProvider`:

```ts
interface SharedJolpicaQuota {
  // Atomically reserve one HTTP attempt across both rolling windows and cooldown.
  // Use coordinator time; count reservations even if the requester later fails.
  reserve(
    scope: string,
  ): Promise<
    | { readonly allowed: true }
    | { readonly allowed: false; readonly retryAt: string }
  >;
  // Atomically extend only; never shorten an existing upstream cooldown.
  extendCooldown(scope: string, until: string): Promise<void>;
}
```

The scope must identify the real egress/quota group, not a replica ID. Reserve every page and retry immediately before HTTP, with atomic check-and-record across both windows. Coordinator time, durable reservation retention for at least an hour, bounded storage and bounded call deadlines are required. An uncertain reservation consumes a slot; never refund an attempt merely because the response failed. If coordination is unavailable or ambiguous, fail closed and use only eligible local stale data. If publishing an upstream cooldown fails, all clients must fail closed until synchronization is restored. No fallback to uncoordinated local allowance.

A separately bounded shared normalized cache must preserve contract/provider namespace, original retrieval/expiry, provenance, validation and stale ceilings. Use TTL-limited miss leases with ownership tokens/fencing and recheck the cache after acquiring a lease. A lease is not quota admission. Expired leases may duplicate work, so each HTTP attempt still reserves quota. Persist cooldowns for their actual duration. Test cross-instance races, coordinator outages, unknown reservation outcomes, lease expiry, restarts and shared-IP interference before enabling production. No infrastructure backend, credentials, paid service, dependencies or runtime interface is added by this proposal.

## Handoff to the integration coordinator

- Verify every real-data view/export visibly identifies Jolpica-F1, links the source and CC BY-NC-SA 4.0, and identifies SECTOR normalization/modifications. `metadata.source.attribution` already carries these notices; metadata alone does not prove the consuming UI displays them.
- Preserve supplied license/copyright/disclaimer notices and assess ShareAlike obligations for distributed adaptations; retain the independent-project notice without implying provider, F1, FIA or team endorsement.
- Present freshness, original retrieval/expiry and revalidation errors appropriately; never label retrieval as live timing or source finality. Evaluate non-commercial eligibility separately if advertising, sponsorship or the use model changes.
- Reverify terms and quotas before release. Decide rights/compliance and quota topology with the Product Owner; any necessary shared UI/routes/infrastructure changes belong to the integration coordinator under separate scope.
- Carry forward the accepted v1 standings classification limitation documented in README. No additional public API surface or missing-value substitution is introduced.

## Task record

Task `SECTOR-02B-JOLPICA-HARDENING`; baseline `0a2d30a7e198d9f5dd3b2511d3620bdc0be2c061`; branch `codex/phase02-jolpica-hardening`; contract revision 1. Backend owns production adapter files, QA owns co-located behavioral tests, and the main session owns documentation, validation and review coordination. Independent reviewers return reports without edits; their inherited writable permissions are not a read-only sandbox.

The user authorizes a local Conventional Commit after validation. Push, PR, merge and deployment remain unauthorized. Final validation and frozen-diff review evidence are delivered by the coordinator; tests use fake clocks and mocked/synthetic HTTP data and do not establish live availability or distributed coordination.
