# Independent tribunal request

Scope / acceptance criteria: <feature and expected behavior>
Base SHA: <full SHA>
Candidate head SHA: <full SHA, or HEAD + frozen snapshot manifest>
Test evidence: <commands/results and revision>
Preview: <local URL if available; build revision>

Read AGENTS.md, docs/REVIEW_PROCESS.md and relevant design/architecture/API documents. Inspect status and freeze the candidate. For uncommitted work include the tracked binary diff, explicit untracked file inventory and SHA-256 hashes; verify the snapshot remains unchanged afterward. Do not commit to obtain a snapshot without authorization.

Explicitly spawn three independent agents using .codex/agents/code-reviewer.toml, ux-reviewer.toml and security-reviewer.toml, respecting available capacity. If the runtime cannot select registered roles, read and hand off each definition explicitly and report that limitation. Use fresh reviewers who did not author the changes. Reviewers inspect only and do not write project files or mutate Git. Do not claim that instructions enforce a read-only sandbox. If spawn is unavailable, report it and arrange separate independent review sessions; do not fabricate execution.

Wait for all three reports. Require severity (Critical/High/Medium/Low), confirmed/hypothesis, path/line/symbol, evidence/reproduction, impact and correction for each finding. Mark absent browser or test evidence unverified. Deduplicate root causes, retain dissent and assign confirmed defects to owners; never vote away valid findings. Run relevant checks and request targeted re-review of the new candidate after corrections. Stop repeated unresolved cycles with a concrete blocker.

Return consolidated PASS/FAIL per docs/REVIEW_PROCESS.md. Critical/High issues must be resolved or explicitly accepted by the user with reasons; missing required reviews/checks are not PASS. Include exact baseline, checks, limitations, dispositions and blockers. PASS does not authorize a commit, merge, push, main change or deployment.
