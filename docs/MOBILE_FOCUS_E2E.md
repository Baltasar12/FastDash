# Mobile season focus: wait for streamed content to become visible

Baseline: `3f62cd3f8697d3956e7f1c07dcbaef512cfc03f0`, PR #7.
Scope/owner: coordinating QA session; E2E synchronization, focused component tests
and this report only. Application/provider logic and shared contracts are unchanged.

## Confirmed evidence

[Hosted run 43106703885](https://github.com/Baltasar12/FastDash/actions/runs/43106703885)
passed 377 unit tests, both streaming scenarios and 21/22 E2E scenarios. The mobile
keyboard/layout test failed at the Season focus assertion on all three attempts.
Artifact: `playwright-failure-43106703885-1`, ID `13893957660`. All three traces,
error contexts and final screencast screenshots were inspected independently.

| Attempt | focus call (trace ms) | Snapshot after focus      | Snapshot after assertion timeout |
| ------- | --------------------- | ------------------------- | -------------------------------- |
| Initial | 23916.206             | 23924.559: hidden segment | 28928.780: main content          |
| Retry 1 | 37530.225             | 37538.338: hidden segment | 42543.992: main content          |
| Retry 2 | 50636.912             | 50644.443: hidden segment | 55649.518: main content          |

In all three, `select#overview-season` has no disabled attribute or disabled/inert
ancestor. Its correctly rendered GET form has action `/overview` and accessible
name `Choose overview season`. Four options exist, with 2026 selected. The resolved
dashboard contains successful season/calendar/standings/results data and Cached
provenance, without an error or unavailable message.

At the focus call, the selector is under `<div hidden id="S:0">`, outside `main`.
The visible main still contains the loading boundary. At assertion timeout, the
resolved dashboard is inside `main`. Native `focus()` does not wait for visibility
and is not retried by the subsequent focus assertion.

The hosted traces do not record `document.activeElement`, DOM object identity or
detailed hydration events. They show no additional navigation call between focus
and its assertion; the URL remains `/overview?season=2026#main-content`. They do
not establish whether the original node was moved or replaced.

A controlled Linux/mobile diagnostic held browser animation-frame callbacks until
explicit release, using the unmodified production build. With `readyState` already
`complete`, the enabled selector remained invisible in `S:0`; calling focus left
`document.activeElement` at `main`. After releasing frames and observing the form,
the same DOM object was visible and focusable. This reproduced 3/3 times with two
workers, zero retries and no sleeps. This diagnostic was temporary instrumentation,
not application code or a runtime switch.

## Provider interference audit

The 2025 network-failure scenario still shares the normal E2E application process.
Its cooldown can reject uncached provider requests, as the earlier streaming
incident demonstrated. However, supported-season cache hits are returned before
transport admission/cooldown checks, and every 2025 overview first loads supported
seasons successfully. Those entries remain fresh for 24 hours. The four options
in these traces prove successful discovery at the failing focus call. Cooldown
therefore does not explain this particular failure. No provider policy is relaxed
and the existing fault-injection scenario is preserved.

Playwright uses fully parallel tests and two CI workers. Browser isolation does
not isolate the shared application provider. Streaming continues to use a fresh
application process per test and its explicit response gate. This correction does
not rely on test order, a warmed browser, a changed retry count or fixed timing.

## Correction and validation

The keyboard test now waits for the named form inside accessible `main`, and for
its selector to be visible, enabled and selected to 2026 before calling focus.
The original focus assertion, Tab to View season, skip link, mobile dialog focus
restoration, reduced motion and viewport checks remain. Waiting for enabled alone
would not fix this incident because the hidden selector was already enabled.

Component regression cases verify disabled selector and submit button for error,
unavailable and empty supported-season results, including native focus refusal.
Existing error and unavailable E2E scenarios remain unchanged.

Validation uses Ubuntu 24.04, Node 24, pinned pnpm and a fresh production build:
all format/type/lint/unit/build checks; 20 mobile keyboard/layout repetitions;
20 streaming repetitions per browser project; and three complete desktop/mobile
suites. E2E validation uses two workers and zero retries. Final results and the
independent code/QA/security/UX tribunal are recorded in the task handoff. No push,
merge, rebase or deployment is authorized by this report.
