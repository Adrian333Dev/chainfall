# Release Changelog — Examples

## Example 1: Conventional commits → Changelog

**Input (git log since last tag):**

```
feat(auth): add optional 2FA
fix(api): prevent null in /users response
chore(deps): bump lodash
feat(ui): dark mode toggle
fix(auth): correct token expiry check
```

**Output:**

```markdown
## [1.3.0] - 2025-02-14

### Added
- Auth: optional two-factor authentication
- UI: dark mode toggle

### Fixed
- API: prevent null in /users response
- Auth: correct token expiry check
```

(`chore(deps)` omitted as not user-facing.)

---

## Example 2: With breaking change

**Input:**

```
feat(config): require config file path (BREAKING)
fix(log): truncate long messages
```

**Output:**

```markdown
## [2.0.0] - 2025-02-14

### Breaking
- **Config:** Config file path is now required. Pass `--config path/to/config.json` or set `CONFIG_PATH`.

### Fixed
- Log: truncate long messages to avoid overflow
```

---

## Example 3: Minimal release (fixes only)

**Input:** User provides: "Fixed login redirect, fixed typo in error message."

**Output:**

```markdown
## [1.0.1] - 2025-02-14

### Fixed
- Login redirect after successful auth
- Typo in error message
```

---

## Example 4: Inserting into existing CHANGELOG.md

**Existing file start:**

```markdown
# Changelog

## [1.0.0] - 2025-01-01
...
```

**Insert new release after the title:**

```markdown
# Changelog

## [1.1.0] - 2025-02-14

### Added
- Feature X

### Fixed
- Bug Y

## [1.0.0] - 2025-01-01
...
```
