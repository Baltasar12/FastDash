# Integration preparation request

Feature / task IDs: <scope>
Source branches/worktrees: <verified paths, refs and expected SHAs>
Integration baseline / target: <full SHA / feature integration branch>
Shared contracts: <revision and symbols>
Tribunal reports: <candidate and finding dispositions>
Acceptance criteria: <combined observable behavior>

Use .codex/agents/integrator.toml and read AGENTS.md, docs/AGENT_WORKFLOW.md, docs/WORKSTREAMS.md, docs/REVIEW_PROCESS.md and docs/API_CONTRACTS.md. Inspect status, attached/detached state, worktrees, actual HEADs, commits, merge bases and diffs in each source and target. Preserve unrelated, untracked and uncommitted changes. A branch does not include uncommitted work; identify it explicitly.

Check ownership, contracts, test/review evidence and integration order. Prepare a concrete reviewable plan, included/excluded diffs, expected conflicts and proposed resolutions before asking permission. Do not merge any branch or commit without explicit user authorization. If authorization is already explicit for a specific operation, continue within it without asking again. Never modify main without explicit permission; normally assemble on a feature integration branch/worktree.

After authorized assembly, verify data/UI compatibility, run all AGENTS.md completion checks and Playwright after a fresh build for route/interaction changes. Re-review material integration/conflict edits. Report exact initial/final Git state, SHAs, conflicts, commands/results, remaining findings and release readiness. Escalate complex conflicts with evidence; never silently discard work. No force-push, reset, destructive cleanup, worktree deletion with unintegrated work, push or deployment without the applicable explicit user authorization.
