# Independent review tribunal

Use for substantial changes. Read [engineering rules](../AGENTS.md), [architecture](ARCHITECTURE.md), [design system](DESIGN_SYSTEM.md), [API contracts](API_CONTRACTS.md) and [workflow](AGENT_WORKFLOW.md). A trivial documentation correction may use a proportionate check; substantive cross-module, data, interaction or security work requires all three lenses.

## Independence and baseline

Assign fresh `code_reviewer`, `ux_reviewer` and `security_reviewer` instances that did not author the implementation or tests being reviewed. They inspect architecture/correctness, UX/accessibility, and security/QA/performance respectively. Reviewers return reports only, never fixes or source/config/test/Git edits. The coordinator runs checks that write artifacts. When available, use a separately restricted read-only parent session; custom TOML instructions cannot override inherited sandbox/approvals. Check the before/after diff for boundary violations.

Freeze writes first. Supply the same full base SHA and candidate head SHA, exact `git diff <base> <head>` scope, acceptance criteria and test evidence to all reviewers. Record `git merge-base` when branches diverge and explain which baseline is used. Do not review three moving branch tips or include changes outside the stated diff accidentally.

For uncommitted work, record HEAD plus a snapshot manifest: `git diff --binary HEAD` for tracked changes, an explicit untracked file list and SHA-256 for every included file. The tracked diff alone omits new files. Freeze these files until all reports return, verify hashes afterward and restart affected review if they changed. This is a clearly identified frozen snapshot, not an immutable Git commit. Do not commit merely to make a review convenient without user permission.

Run the three reviews in parallel if capacity supports it, otherwise independently in batches. Wait for every requested report. A missing report is unverified, not approval. A UX review without browser access may assess static evidence but must mark visual/behavioral checks unverified. A lens with no applicable changes should give a reasoned scope statement rather than invent issues.

## Findings and evidence

Each report identifies baseline, scope, actual commands/inspection, limitations and PASS/FAIL recommendation. Every finding includes:

- Stable ID and severity: Critical, High, Medium or Low.
- Classification: confirmed defect or hypothesis requiring verification.
- File and relevant line/symbol (or route/state/viewport for UX).
- Evidence: code path, reproduction steps, expected versus actual behavior, test output or measured observation.
- Technical/user/security impact and a recommended correction.

Do not report speculation as verified failure, browser observations without inspection, or performance regressions without evidence. Do not expose secrets in findings. Relevant tests are evidence, not proof of universal correctness.

| Severity | Meaning                                                                                                       |
| -------- | ------------------------------------------------------------------------------------------------------------- |
| Critical | Confirmed exposure, data loss/corruption or similarly severe release-blocking failure                         |
| High     | Major functional, security, data-integrity, accessibility or architectural defect affecting required behavior |
| Medium   | Material bounded defect with limited impact or a workable alternative                                         |
| Low      | Minor maintainability, consistency or usability issue                                                         |

Severity follows impact and reachable conditions, not reviewer count. One confirmed critical security finding blocks integration unless the user explicitly accepts that specific risk with reasons; it is never outvoted.

## Consolidation and corrections

The coordinator collects all reports and deduplicates common root causes while retaining original IDs, evidence and valid dissent. Record each finding's disposition, owner, correction or acceptance reason and verification status. Hypotheses get a bounded verification task; a potentially serious unresolved hypothesis remains an explicit blocker until evidence resolves it or the user accepts the uncertainty.

Assign confirmed defects to the owning implementer. Freeze a new candidate after corrections, run relevant tests and return the changed areas plus affected regression paths to independent reviewers. All final reports must identify the current candidate; unaffected reviewers may confirm carried-forward conclusions after inspecting the correction diff. A broader semantic/contract change requires broader re-review. Do not reuse a PASS for an older candidate silently.

Use one targeted correction/re-review cycle first. If the issue persists without new evidence/progress, report the concrete blocker and required decision rather than looping indefinitely. Never dismiss a technically valid finding through majority voting.

## PASS / FAIL and integration gates

The consolidated recommendation is **PASS** only when scope/ownership/contracts are satisfied, all required reviews are complete for the final candidate, required validations pass, and no confirmed Critical/High findings remain unresolved without explicit user acceptance and rationale. Record Medium/Low dispositions and any accepted residual risks. Unperformed required checks block readiness unless explicitly accepted by the user with the limitation recorded. **FAIL** means a gate remains unsatisfied; name it and the next action.

One validation owner runs format, strict typecheck, lint, unit/integration tests and a production build using the scripts in [README.md](../README.md). Route/interaction changes also require Playwright against the fresh production build, with 320px/mobile/tablet/desktop, keyboard and reduced-motion coverage as applicable. External dependencies use permitted deterministic fixtures. Do not weaken checks or hide unavailable results. Revalidate combined changes after authorized integration and re-review material conflict resolutions.

PASS means a technical recommendation only. The user must explicitly authorize any commit, merge, push, modification of main or deployment as applicable. Prepare the exact Git state, included commits/diff, validation results and conflict plan before requesting approval. No deployment, merge to main or cleanup follows automatically from a review result.
