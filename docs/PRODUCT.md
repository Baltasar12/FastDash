# SECTOR product

SECTOR is a public, free, independent Formula 1 analytics platform and portfolio project. It makes complex motorsport information approachable through precise visual storytelling, useful comparisons and transparent data provenance. It is not affiliated with Formula 1, the FIA or any team.

## Audience and experience

Curious casual fans need understandable explanations, clear units and intuitive navigation. Enthusiasts need contextual comparisons, historical depth and eventually detailed telemetry. Both deserve a fast, accessible experience on desktop and mobile, without a generic SaaS dashboard aesthetic.

## Platform modules

| Module        | Intended purpose                                                                         |
| ------------- | ---------------------------------------------------------------------------------------- |
| Overview      | Product introduction; eventually a useful entry into the latest available season/session |
| Calendar      | Race weekends, sessions and circuit context                                              |
| Championship  | Driver and constructor standings and progression                                         |
| Race Center   | Session results, race pace, strategy and comparisons                                     |
| Telemetry Lab | Lap and driver telemetry comparisons with explicit coverage limits                       |

## Phase 00: delivered foundation

Responsive landing, original sample analytics specimen, shared shell, navigation, placeholder module routes, design tokens, metadata, loading/empty/not-found states, tooling, tests and architecture documentation. The specimen is static, illustrative and unrelated to real race results.

## Proposed MVP

Begin with one season of calendar, championship standings and session results, supported by verified providers and clear unavailable/error states. Add basic driver comparisons once canonical identifiers and consistent session context exist. Keep this free and usable without accounts. Confirm provider coverage and licensing before promising live or historical capabilities.

## Roadmap

1. **Data foundation:** verify Jolpica-F1 and OpenF1 documentation, identifier mapping, licensing, quotas and coverage; implement validated server adapters and recorded fixtures.
2. **Season essentials:** calendar, session context and championship standings with loading, empty and failure behavior.
3. **Race understanding:** results, pace comparisons and strategy; add ECharts only with a concrete accessible chart feature.
4. **Telemetry exploration:** validate OpenF1 coverage, sampling and units; compare laps without implying missing signals exist.
5. **Historical depth:** evaluate an optional separate Python/FastF1 adapter with explicit computation and caching boundaries.
6. **Motion refinement:** consider GSAP/ScrollTrigger or Lenis only if a demonstrated interaction needs them, with native scroll and reduced-motion fallbacks.

Authentication, a database, paid infrastructure, live-data promises and deployment are outside Phase 00.
