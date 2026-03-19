# Ops Notes

## 2026-03-19 — GitHub CLI auth blocker on host

### Symptom
- `gh` commands for PR operations fail with `HTTP 401: Bad credentials`.
- `gh auth status` indicates token in `/root/.config/gh/hosts.yml` is invalid.

### Impact
- Cannot post PR review comments and cannot merge PRs from this host until re-auth is completed.

### Fix
```bash
gh auth logout -h github.com
gh auth login -h github.com
```

### Verification
```bash
gh auth status
gh pr view 7
```
