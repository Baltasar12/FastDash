# Phase 00.5 validation record

Validated on 2026-11-05 (America/Argentina/Buenos_Aires) in `E:/CODIGO/FastDash`, branch `codex/phase-00-5-agent-infrastructure`, based on Foundation commit `2b2625e84683843e8ca6d88dc4d62db405706fe3`. Changes remain uncommitted. The checkout was clean before this phase; its latest Conventional Commits rule was preserved. No additional worktree, application feature, dependency, backend, deployment, merge or push was created.

## Configuration evidence

- Installed CLI: `codex-cli 0.162.1`; Node `v24.15.0`, pnpm `11.25.0`.
- The requested keys and standalone agent fields were checked against the official [subagent documentation](https://learn.chatgpt.com/docs/agent-configuration/subagents) and [configuration reference](https://learn.chatgpt.com/docs/config-file/config-reference).
- Python 3.14's standard-library `tomllib` parsed the config and all eight definitions. Required nonempty string fields, unique identifiers and underscore/hyphen filename mapping passed. Python was used only as an available inspection tool; no Python application dependency or service was added.
- A temporary `codex app-server --strict-config` process accepted initialization and `config/read` for this repository. Its response showed an enabled project layer (`disabledReason: null`) at `E:/CODIGO/FastDash/.codex`, `agents.enabled: true` and `agents.max_concurrent_threads_per_session: 4`. No error appeared on stderr. Only allowlisted fields were printed; global credentials/configuration were not published or changed.
- The runtime schema used for that read was generated with `codex app-server generate-json-schema` into the OS temporary directory, outside the repository. This validates project config loading, not execution of each custom role.
- Local Markdown links and documentation references in agent instructions were checked for existing targets. Future code directories are explicitly marked as future; they are not asserted to exist.

The configured limit excludes the coordinator; this active session exposes only four total execution slots. The lower runtime limit wins. No model is forced. No unsupported per-agent sandbox or approval key was added. `codex --strict-config features list` rejected the flag for that subcommand; strict validation was instead performed through the supported app-server command.

## Safe orchestration smoke test

The coordinator spawned two native subagents concurrently, explicitly handed them the code/UX reviewer definitions, waited for both reports and consolidated them. They inspected the same immutable Foundation SHA above through `git show`/`git ls-tree`. They were instructed not to edit files, mutate Git, run builds or use the browser.

| Reviewer              | Narrow scope                                                                                    | Result                                         |
| --------------------- | ----------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| `code_reviewer_smoke` | Foundation directories, feature/route boundaries, documented architecture and sample disclosure | PASS; no confirmed structural defect           |
| `ux_reviewer_smoke`   | Foundation design/product/accessibility documentation and static source evidence                | PASS; no confirmed documentation inconsistency |

Both reported actual evidence and their limits. The UX report did not claim visual/browser verification. These are smoke-test recommendations only, not a full tribunal approval of application UX or release authorization. No application-source changes were introduced.

## Independent infrastructure tribunal

After the smoke test and application checks, three separate native reviewers inspected the same frozen 20-file infrastructure candidate: `architecture_tribunal`, `ux_tribunal` and `security_tribunal`. Each verified its SHA-256 manifest before and after inspection and returned PASS with no confirmed defects. The coordinator collected all three reports. Their scope covered architecture/ownership/contracts, workflow usability/design preservation, and permissions/Git safety/reliability respectively. The manifest and tracked patch were stored in the OS temporary directory; the baseline remained the Foundation SHA above.

This was static review of infrastructure, not new visual testing of the application. Reviewers did not repeat application checks, modify files or authorize integration. This validation-record update was made after those reports and submitted as a targeted correction-diff re-review; the reports remain available in the coordinating chat. No Critical/High findings or user risk acceptances were required.

## Application regression checks

| Check                            | Result                                           |
| -------------------------------- | ------------------------------------------------ |
| `pnpm format:check`              | PASS after formatting the new Markdown documents |
| `pnpm typecheck`                 | PASS                                             |
| `pnpm lint`                      | PASS, no warnings                                |
| `pnpm test`                      | PASS, 2 files / 4 tests                          |
| `pnpm build`                     | PASS, existing static routes preserved           |
| `pnpm test:e2e` after that build | PASS, 10 Chromium desktop/mobile tests           |

E2E ran with `CI=1` in the validation process, preventing reuse of an existing server. Coverage includes navigation, sample disclosure, focus/Escape, skip navigation, reduced motion, 404 and overflow across the existing 320–1440px viewport checks. Nonblocking Node warnings concerned `NO_COLOR`/`FORCE_COLOR`. No test artifacts or generated builds are included in the change.

## Reproduce the static checks

From the repository root, use an available Python 3.11+ interpreter for this optional maintainer check (not required for normal Next.js development):

```powershell
@'
import pathlib, re, tomllib
root = pathlib.Path.cwd()
config = tomllib.loads((root / '.codex/config.toml').read_text())
assert config == {'agents': {'enabled': True, 'max_concurrent_threads_per_session': 4}}
files = sorted((root / '.codex/agents').glob('*.toml'))
assert len(files) == 8
names = set()
for file in files:
    agent = tomllib.loads(file.read_text())
    assert set(agent) == {'name', 'description', 'developer_instructions'}
    assert all(isinstance(value, str) and value.strip() for value in agent.values())
    assert agent['name'] == file.stem.replace('-', '_')
    assert agent['name'] not in names
    names.add(agent['name'])
    for target in re.findall(r'\b(?:AGENTS\.md|docs/[A-Z_]+\.md)\b', agent['developer_instructions']):
        assert (root / target).is_file(), target
documents = [root / 'AGENTS.md', root / 'README.md', *root.glob('docs/*.md'), *root.glob('prompts/*.md')]
for document in documents:
    for target in re.findall(r'(?<!!)\[[^\]]+\]\(([^)]+)\)', document.read_text(encoding='utf-8')):
        if '://' not in target and not target.startswith('#'):
            assert (document.parent / target.split('#')[0]).resolve().exists(), (document, target)
print('PASS: TOML, fields, identifiers, agent documentation paths and local Markdown links')
'@ | python -
```

For the native loader check, initialize a temporary `codex app-server --strict-config` over stdio and request `config/read` with this repository's `cwd` and `includeLayers: true`; verify the project layer is enabled and inspect only `agents`/layer origin fields. This is a read-only configuration inspection, not a model run. The app-server API is experimental; regenerate its local schema/help after upgrades. Then run the standard pnpm checks in [AGENT_WORKFLOW.md](AGENT_WORKFLOW.md).

## Limits and follow-up

- Native spawn/result collection was exercised by the smoke test and the full three-reviewer infrastructure tribunal. The validation-record update also exercised a follow-up re-review handoff. Implementation correction loops and actual integration remain untested.
- The active spawn tool does not expose custom-role selection by name. Definitions were handed off explicitly. Automatic discovery/selection of all eight TOML roles in a new session remains unverified. A `codex debug prompt-input` diagnostic did not list their identifiers; it is not proof that runtime role discovery fails. Open a new project-root session and request a named reviewer to verify discovery before relying on it.
- Custom agents inherit parent permissions. Behavioral review-only instructions were used; no separate read-only sandbox was enforced or claimed. A separately restricted review parent can be used when the client supports it; tool-specific permissions still apply.
- No actual multi-worktree implementation, conflict resolution, merge, deployment, provider integration or live-data licensing check was performed. The procedures and ownership boundaries are prepared; Data Layer, Overview enhancements and Race Center remain future work.
- Foundation remains authoritative. The broad visual ambition for smooth scrolling does not authorize Lenis or scroll hijacking; native scroll/reduced-motion requirements remain. Integration can be prepared autonomously, but this project's explicit user-approval requirement covers any merge or push, not only main/release operations.
- Start the next streams only after the infrastructure is committed with user authorization and shared provider/consumer contracts are agreed and validated, as described in [WORKSTREAMS.md](WORKSTREAMS.md).
