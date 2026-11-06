# Synthetic shared fixtures

All people, teams, events and numbers are invented. Display `FIXTURE_LABEL` at the
point of use. These are normalized domain examples, not recorded provider payloads.
Never connect them as a silent production fallback.

Import entities from `@/data/fixtures/f1`, reusable response/error examples from
`@/data/fixtures/results`, or explicitly inject
`createFixtureF1DataProvider` from `@/data/fixtures/fixture-provider` wherever an
`F1DataProvider` is expected. The sample season is `FIXTURE_SEASON` (2099), with
rounds 1 (regular) and 2 (sprint). Result methods always mean main race/qualifying.

```ts
const provider = createFixtureF1DataProvider({ scenario: "not-published" });
const result = await provider.getRaceResults({
  season: FIXTURE_SEASON,
  round: 1,
});
// result.status === "unavailable"; no fabricated successful empty array.
```

Scenarios: `success` (default), `empty`, `not-published`, `not-covered`, `cancelled`,
`partial`, `stale`, `missing-qualifying`, and `error`. For `error`, select `errorCode`
from the shared `DataError` codes (default `network`). Scenarios apply to each method;
`missing-qualifying` removes the calendar session and returns unavailable qualifying.
Invalid input, unknown seasons and unknown events are checked before scenarios.
Metadata dates and retry instants are fixed; no clock, network or randomness is used.
The interface exposes readonly objects and collections; consumers must not mutate
shared fixtures. Synthetic results are examples of states, not a complete simulation
of sporting regulations or a provider coverage guarantee.
