# Branch Protection Setup

> This is a manual setup guide, not enforced code. GitHub branch protection
> rules live in repo settings (or via the GitHub API) — they cannot be
> committed as a file in this repository. A maintainer must apply these
> settings through the GitHub UI or API after the repo is created/transferred.

## Goal

Only maintainers can merge to `main`, and every merge must pass CI and review.

## Steps (GitHub UI)

1. Go to **Settings → Branches** in the repository.
2. Click **Add branch protection rule** (or edit the existing one for `main`).
3. Branch name pattern: `main`.
4. Enable **Require a pull request before merging**.
   - **Require approvals**: 1.
5. Enable **Require status checks to pass before merging**.
   - Select the `test` job (from `.github/workflows/ci.yml`) as a required
     check for both Node matrix entries.
6. Enable **Do not allow force pushes**.
7. Enable **Do not allow deletions**.
8. (Recommended) Enable **Require branches to be up to date before merging**.
9. Save changes.

## Equivalent (GitHub API / gh CLI)

```sh
gh api -X PUT repos/{owner}/{repo}/branches/main/protection \
  -f required_status_checks='{"strict":true,"contexts":["test (20)","test (22)"]}' \
  -f enforce_admins=true \
  -f required_pull_request_reviews='{"required_approving_review_count":1}' \
  -f restrictions=null \
  -f allow_force_pushes=false \
  -f allow_deletions=false
```

Adjust `{owner}/{repo}` and status check context names to match the actual
CI job names.

## Note: leaderboard workflow pushes to main

`.github/workflows/leaderboard.yml` commits benchmark refreshes directly to
`main` (no PR). If you enable branch protection as above, that push will be
blocked. Either use a ruleset with a bypass entry for GitHub Actions, or
switch the workflow back to a PR flow before enabling protection.
