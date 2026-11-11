# Streaming dashboard E2E synchronization

Baseline: `ab3ff8df1834d668caeb79fb03706d0561c8d1f9` (origin/main).
Scope: test harness only; no application, provider or telemetry contract changes.
Owner: coordinating QA session; independent reviewers have no file ownership.

## Incident

Run [43102569196](https://github.com/Baltasar12/FastDash/actions/runs/43102569196)
failed the mobile loading assertion on all three attempts. The downloaded traces
show `/overview?season=2023` completing in approximately 19–25 ms. The error
contexts show the network-error state, rather than the expected unavailable state.

The production provider shares a transport budget and circuit cooldown across
seasons. The parallel invalid-selector/network-failure test requests season 2025,
whose mock intentionally throws. An active cooldown rejects subsequent queries
before they reach the mock's 2000 ms calendar delay. Changing the season by browser
project does not isolate this state. Retries reuse the same application server;
provider caches and operational suppression can also survive an attempt.

A fixed delay also creates a second race: `waitUntil: "commit"` observes response
headers, not a particular rendered frame. It cannot guarantee that a transient
loading boundary will remain visible until the assertion runs.

## Correction

The streaming scenario now starts a fresh production Next.js application process
for each test, using the existing build and the same synthetic transport. The
test server binds only to loopback on an OS-assigned port. This isolates caches,
request budgets and cooldowns across projects, repetitions and other E2E tests.
The remaining route/interaction suite still uses the configured `next start`.

The test-only mock holds the calendar response behind an IPC promise. It reports
that the request reached the gate; Playwright observes the accessible loading
status, confirms the unavailable state is absent, then explicitly releases the
response. It checks that loading disappears, the season heading and unavailable
state appear, and no network-error state replaces the expected result. No fixed
sleep or increased assertion timeout is used. Production provider timeouts stay
active, so a broken stream still fails.

The fixture bounds startup, captures child diagnostics, and terminates the child
in teardown. The child exits if its controlling worker disconnects. Neither the
IPC gate nor this server is imported by application code or ordinary startup.

## Verification procedure

Use Node 24 and the pinned pnpm, a fresh `pnpm build`, Chromium, `CI=true`, and two
workers. Run all required format/type/lint/unit/build checks, then:

```sh
pnpm test:e2e streaming.spec.ts --workers=2 --retries=0 --repeat-each=20
pnpm test:e2e --workers=2 --retries=0
```

Both commands include desktop and mobile. Repetitions intentionally create cold
application processes; no cache reset hook or production-only test selector is
needed. Review readiness and final command results are recorded in the incident
handoff; passing review does not authorize push, merge or deployment.
