# Contributing

Thanks for considering contributing to roster.

## Workflow

1. Fork the repository.
2. Create a branch off `main` (e.g. `feat/my-change`, `fix/my-bug`).
3. Make your change, with tests.
4. Open a pull request against `main`.

## Requirements for a PR to be merged

- Tests are required for any behavior change or bug fix.
- CI must be green (`npm run build` + `npm test` on Node 20 and 22).
- At least **1 maintainer approval** is required.
- Commit messages must follow [Conventional Commits](https://www.conventionalcommits.org/)
  — a `type:` prefix is required (`feat`, `fix`, `docs`, `chore`, `refactor`,
  `test`, ...). Either English or Korean descriptions are fine, as long as the
  type prefix is present (e.g. `fix: 오탐 수정` or `fix: correct false positive`).
- **Breaking changes** must be discussed in an issue before a PR is opened.

## Reporting bugs / requesting features

Use the issue templates (`bug_report.yml` / `feature_request.yml`).
