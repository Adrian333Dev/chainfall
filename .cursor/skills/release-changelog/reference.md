# Release Changelog — Reference

## Conventional commit mapping

Map commit types to changelog sections:

| Commit type     | Changelog section | Notes                                   |
| --------------- | ----------------- | --------------------------------------- |
| `feat`          | Added             | New feature                             |
| `fix`           | Fixed             | Bug fix                                 |
| `perf`          | Changed           | Performance improvement                 |
| `refactor`      | Changed           | Code refactor (no API change)           |
| `docs`          | Omit or Changed   | Doc-only rarely in user changelog       |
| `style`         | Omit              | Formatting only                         |
| `test`          | Omit              | Tests only                              |
| `chore`         | Omit              | Build/tooling unless user-facing        |
| `ci`            | Omit              | CI only                                 |
| Breaking footer | Breaking          | Commit body contains `BREAKING CHANGE:` |

**Scope** (e.g. `feat(auth):`) can be used in the line as **Area** for Breaking, or omitted for short entries.

## Semantic versioning

- **MAJOR**: Breaking changes.
- **MINOR**: New features, backward compatible.
- **PATCH**: Bug fixes, backward compatible.

When in doubt, suggest the smallest version bump that fits the changes.

## Quality rules

- **One idea per bullet**: Do not combine unrelated changes.
- **User-facing wording**: Prefer "Add login retry" over "Implement retry logic in AuthService."
- **No internal refs**: Avoid "PR #123" or "Commit abc" in the final changelog unless the project standard requires it.
- **Breaking section**: Always include a short migration or upgrade hint when listing breaking changes.
