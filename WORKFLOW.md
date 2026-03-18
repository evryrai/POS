# Git Workflow Policy (Required)

## Branching
- Never push directly to `main`.
- Use role-based branch prefixes:
  - `feat/joker-*` for implementation
  - `sec/sherlock-*` for security/QA
  - `pm/atlas-*` for PM/planning docs
  - `chore/chief-*` for governance/repo ops

## Commit Identity (Per Agent)
Set local repo identity before commit based on role:
- chief <chief@openclaw.local>
- joker <joker@openclaw.local>
- sherlock <sherlock@openclaw.local>
- atlas <atlas@openclaw.local>

## Pull Request Flow
1. Create Issue first (except emergency hotfix).
2. Create branch from `main`.
3. Implement and reference issue in commits/PR.
4. Open PR to `main`.
5. Sherlock security/QA gate must return PASS/PASS_WITH_CONDITIONS.
6. Merge only after review approval.

## Merge Rules
- No self-merge without Sherlock gate.
- Squash merge preferred for clean history.
- PR title format: `[role] <scope>: <summary>`

## Required Checks (minimum)
- Build/test pass
- No secret exposure in code/logs
- Scope aligns with issue acceptance criteria
