# Agent workflow

Phase 00.5 configures development infrastructure only. Read [PRODUCT.md](PRODUCT.md), [ARCHITECTURE.md](ARCHITECTURE.md), [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md), [API_CONTRACTS.md](API_CONTRACTS.md) and [engineering rules](../AGENTS.md) before implementation. Foundation's modular monolith, native scroll, samples and independent-project notice remain authoritative.

## Runtime and roles

The main session coordinates and the user is Product Owner. Project configuration is [config.toml](../.codex/config.toml); definitions are standalone TOML files. The `name` field is the identifier; filenames replace underscores with hyphens.

| Identifier           | Definition                                                          | Responsibility and default boundary                                                              |
| -------------------- | ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `ui_designer`        | [ui-designer.toml](../.codex/agents/ui-designer.toml)               | Design behavior/states and assigned specifications; shared tokens only with exclusive assignment |
| `frontend_developer` | [frontend-developer.toml](../.codex/agents/frontend-developer.toml) | Assigned feature UI and route composition; no unilateral contract/token changes                  |
| `backend_developer`  | [backend-developer.toml](../.codex/agents/backend-developer.toml)   | Assigned server adapters, validation, normalized contracts and caching                           |
| `qa_engineer`        | [qa-engineer.toml](../.codex/agents/qa-engineer.toml)               | Assigned behavioral tests/fixtures; no production fixes                                          |
| `code_reviewer`      | [code-reviewer.toml](../.codex/agents/code-reviewer.toml)           | Independent architecture, types, contracts and correctness review                                |
| `ux_reviewer`        | [ux-reviewer.toml](../.codex/agents/ux-reviewer.toml)               | Independent visual, responsive, interaction and accessibility review                             |
| `security_reviewer`  | [security-reviewer.toml](../.codex/agents/security-reviewer.toml)   | Independent security, reliability, QA and performance review                                     |
| `integrator`         | [integrator.toml](../.codex/agents/integrator.toml)                 | Inspect branches, propose assembly, validate compatibility and release readiness                 |

Ownership is assigned per task, never inferred from this table as permission to edit an entire directory. Shared contracts, globals, package/lockfile, navigation, test configuration and coordination records have one explicit writer. A backend author cannot independently review their own changes under a reviewer name. Reviewers have no file ownership and return reports to the coordinator.

The project uses `[agents] enabled = true` and `max_concurrent_threads_per_session = 4`, with no model, permission, approval, authentication or provider overrides. The configured limit covers spawned threads, excluding the coordinator. Normally use at most three implementation agents; drain implementation work before the tribunal. Effective runtime limits may be lower (this setup session exposes four total slots, including the coordinator). Batch work accordingly and close finished threads through the runtime when supported; never assume idle threads free a configured slot.

Current official guidance: [subagents](https://learn.chatgpt.com/docs/agent-configuration/subagents) and [configuration reference](https://learn.chatgpt.com/docs/config-file/config-reference). Version-specific observations and test results are in [AGENT_VALIDATION.md](AGENT_VALIDATION.md). Recheck compatibility after upgrading Codex. Start a new session from the project root to load project definitions; do not assume an existing session hot-reloads them. If role selection is exposed, request the exact identifier. Otherwise read the definition and explicitly hand its instructions to a native subagent, and disclose that automatic role discovery was not tested. If no spawn tool exists, report the limitation and use sequential independent sessions; do not simulate parallel agents in prose.

## Two execution models

**Native subagents:** the coordinator explicitly spawns, sends follow-ups, waits for every requested result and consolidates them. They normally share this checkout, tools and parent permissions. They do not automatically get worktrees. Use disjoint ownership for genuinely independent bounded tasks; use sequential handoffs for dependencies or trivial changes.

**Separate sessions/worktrees:** independent long-running Codex sessions each use an isolated checkout and feature branch. A separate chat is not automatically a child of a master chat. The coordinator must receive a deliberate handoff with task ID, SHA/diff, status, checks and blockers. Without a connection/tool for that session, do not claim to monitor or supervise it. Isolation does not reconcile incompatible contracts.

Custom agents cannot impose a separate sandbox or approval policy. Review instructions alone are not permission enforcement. When enforcement is needed and supported, start a separate parent review session with the CLI's `codex --sandbox read-only` (verify local help) or the equivalent user-selected permission control. This restricts the review session instead of changing global/project policy. Native reviewers in a writable session remain behaviorally read-only; the coordinator must not assign mutations and must check the diff afterward. Other tools/connectors retain their own permissions. No per-agent permission guarantee is made here.

## Task lifecycle

1. Use [feature prompt](../prompts/feature.md). Inspect Git/instructions and relevant docs. Establish scope, acceptance criteria and a common validated commit baseline.
2. Record tasks using [WORKSTREAMS.md](WORKSTREAMS.md). Identify dependencies, contract owner and exact files. Agree provider-independent contracts and fixture semantics before UI/data parallelism. Route/config/token edits get a single owner and a serialized handoff.
3. Request component behavior and responsive/state specifications when applicable. Delegate independent substantial tasks, normally up to three implementers; no agents for trivial work. Dependent tasks wait for accepted deliverables.
4. Each agent reports files, baseline, behavior/contracts, commands with results, limitations and blockers. The coordinator checks actual diffs, ownership and acceptance criteria. Transfer a file only after the previous owner stops editing.
5. Finish writes, freeze the same base/head or snapshot for all reviewers and run the [tribunal](REVIEW_PROCESS.md) with [review prompt](../prompts/review.md). Collect all reports before consolidating; return confirmed defects to their implementers, verify fixes and re-review the new baseline.
6. Prepare a concrete integration plan/diff using [integration prompt](../prompts/integration.md). Obtain user permission before any merge; assemble approved branches in an integration feature branch/worktree. Recheck contracts and review material integration edits.
7. One validation owner runs `pnpm format:check`, `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build`; run `pnpm test:e2e` after a fresh build for route/interaction changes. Do not run build and type generation concurrently in one checkout. Browser tests must target that production build, not a reused dev server.
8. Report exact Git state, diff, reviews, checks, limitations and readiness. User approval is required for commits, merges, pushes, main changes and deployment as applicable; readiness is not authorization. Use Conventional Commits only when committing is authorized.

## Worktree procedure

Before starting, inspect `git status --short`, `git branch --show-current`, `git rev-parse HEAD` and `git worktree list --porcelain`. An empty branch name can mean detached HEAD. Preserve dirty/untracked work and stop dependent operations rather than stashing/resetting it automatically.

Choose a full validated baseline SHA containing required contracts and this infrastructure. Uncommitted configuration does not appear in new worktrees: ask the user to authorize a commit when needed. Inspect the actual target branch; Phase 00.6 contracts are integrated into `main`, and [CONTRACTS_HANDOFF.md](CONTRACTS_HANDOFF.md) defines how to select the final common development baseline. Then run the following PowerShell example **only when starting an assigned stream**, with real values and unused target/branch names:

```powershell
$baseline = '<validated-full-commit-sha>'
git show --no-patch --oneline $baseline
git worktree add -b codex/data-layer ../FastDash-data-layer $baseline
git -C ../FastDash-data-layer status --short
git -C ../FastDash-data-layer branch --show-current
git -C ../FastDash-data-layer rev-parse HEAD
```

Use equivalent distinct paths/branches for Overview and Race Center as assigned in [WORKSTREAMS.md](WORKSTREAMS.md). Open each session in its worktree root, run `pnpm install --frozen-lockfile`, and provide its task/ownership record. Shared-checkout subagents need no additional worktree. Do not create unused worktrees, reuse an attached branch, or copy secrets/build outputs between checkouts.

Return a handoff with actual HEAD, clean/dirty status, uncommitted diff if present, baseline, owned files, tests and review outcome. A branch name alone does not contain uncommitted changes; do not claim those are ready to merge. Inspect `git log`, `git diff` and merge bases before proposing ordered integration. Never delete worktrees with unintegrated commits or changes; cleanup/reset/branch deletion requires explicit approval. No force-push.

## Failures and blockers

When a contract, provider right, ownership conflict or architecture decision is unresolved, pause affected tasks and continue only independent work. Record owner, evidence, impact and the precise decision/input needed. Blocked is an attribute on the lifecycle status, not a claim of completion. Do not invent data, bypass checks or silently discard work. A missing runtime capability or browser is reported as unverified, with a concrete follow-up. After a targeted fix and re-review, escalate repeated unresolved findings with new evidence instead of unbounded retries. Use [status prompt](../prompts/status.md) to inspect local evidence.
