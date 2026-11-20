# Existing-agent continuity implementation plan

> **For agentic workers:** Use superpowers:executing-plans for inline implementation. Keep the running integration unchanged.

**Goal:** Maintain the tested default-conversation and server-model policies as configurable source changes in Cyan Society's fork.

**Architecture:** Typed config controls the existing session lifecycle and model entry points. A small history helper uses the public SDK command API to qualify App Server default reads.

**Tech Stack:** TypeScript, Bun tests, Letta ACP 0.1.11, SDK 0.7.2.

**Spec:** `docs/superpowers/specs/2026-11-20-openbot-continuity-design.md`.

## Global constraints

- Opt-in behavior; no live agent mutation, new credentials, or runtime migration.
- Pin SDK 0.7.2 and retain locked dependency installation.
- Publish a branch and draft PR in `Cyan-Society/letta-acp`; do not merge.

## Review focus

- Direct typed configuration must receive the same preflight validation as environment configuration.
- Failed default history reads and malformed runtime identity must fail without a replacement thread or leaked session.
- Cached model aliases cannot become effective model or effort writes, including after permission changes.
- Explicit historical loads keep their initialized conversation identity and normal upstream behavior remains available.
- An empty tool budget must remain an explicit empty array, not silently become unrestricted.

### Task 1: Configuration and continuity policies

Files: `src/config.ts`, `src/agent.ts`, `src/default-history.ts`, `test/config.test.ts`, `test/agent-integration.test.ts`, `package.json`, `bun.lock`.

- [x] Add config and real-SDK transport tests with generic agent fixtures; run and observe missing-policy failures.
- [x] Implement typed opt-in routing/model/tool policies, qualified history, validation, and cleanup; pin SDK.
- [x] Run focused tests, full suite, typecheck, and build; resolve failures.

### Task 2: Documentation, package, and review

Files: `README.md`, `docs/openbot-integration.md`, CI configuration if deterministic fork checks need adjustment.

- [x] Document environment switches, compatibility aliases, known backend scope, and exact installation/verification limits.
- [x] Pack and exercise the built adapter with ACP initialize; review the complete diff with a fresh reviewer. Review fixes verified RED-to-GREEN; final suite 89 pass. Direct programmatic tool-array validation is a documented deferred minor.
- [ ] Commit with OpenBot attribution, create the authorized organization fork, publish the branch and draft PR, verify remote contents, and report checks and remaining limits.
