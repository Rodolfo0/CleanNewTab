# Copilot instructions

## Commit messages

Always generate commit messages using the Conventional Commits specification. This repository uses commit messages to determine releases and changelog entries.

Use this format:

```text
<type>(<optional-scope>): <description>

<optional-body>

<optional-footer>
```

Rules:

- Choose the message from the actual staged changes. Do not claim changes that are not present.
- Use a lowercase Conventional Commit type.
- Write the description in English, in the imperative mood, without a trailing period.
- Keep the subject concise, preferably no longer than 72 characters.
- Use a scope only when it adds useful context, for example `firefox`, `chrome`, `drive`, `ui`, `release`, or `ci`.
- Describe the user-visible outcome or the reason for the change, rather than listing edited files.
- Use a body when the motivation, behavior, or an important implementation decision needs clarification.
- Do not include Markdown formatting in the subject.

Allowed types:

- `feat`: adds or changes user-facing functionality; normally triggers a minor release.
- `fix`: corrects faulty behavior; normally triggers a patch release.
- `perf`: improves performance without changing expected behavior.
- `refactor`: restructures code without adding functionality or fixing a bug.
- `docs`: changes documentation only.
- `test`: adds or updates tests only.
- `build`: changes dependencies or the build system.
- `ci`: changes GitHub Actions or other CI/CD configuration.
- `chore`: maintenance that does not fit another type.
- `style`: changes formatting without affecting behavior.
- `revert`: reverts an earlier commit.

For breaking changes, add `!` before the colon and include a `BREAKING CHANGE:` footer:

```text
feat(sync)!: change the Drive workspace format

BREAKING CHANGE: existing version 1 workspace files must be migrated.
```

Examples:

```text
feat(firefox): add Google Drive synchronization
fix(chrome): handle completed uploads during publishing
ci(release): allow manually publishing the current version
docs: document the Drive OAuth setup
```

Avoid vague or non-conventional subjects such as `update files`, `changes`, `bug fixes`, or `WIP`.
