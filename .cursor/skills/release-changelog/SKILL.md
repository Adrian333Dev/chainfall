---
name: release-changelog
description: Generates release notes and changelog entries from git history using conventional commits or manual curation. Use when drafting release notes, writing CHANGELOG entries, preparing a new version, or when the user asks for release notes or changelog generation.
---

# Release Changelog

Generates structured release notes from git history. Supports conventional commits (auto-categorize) or manual curation.

## Workflow

Copy this checklist and track progress:

```
Task Progress:
- [ ] Step 1: Determine input source
- [ ] Step 2: Gather changes
- [ ] Step 3: Categorize and draft
- [ ] Step 4: Apply template
- [ ] Step 5: Validate output
```

---

## Step 1: Determine input source

**Repo uses conventional commits** (feat:, fix:, chore:, etc.)  
→ Use [scripts/parse-commits.sh](scripts/parse-commits.sh) or equivalent; follow "Conventional workflow" below.

**Mixed or non-conventional commits**  
→ Use git log / diff manually; follow "Manual workflow" below.

**User provides a list of changes**  
→ Skip gathering; go to Step 3 and categorize from the list.

---

## Step 2: Gather changes

**Conventional workflow**

From repo root:

```bash
# Commits since last tag (recommended)
git log $(git describe --tags --abbrev=0 2>/dev/null || echo "HEAD")..HEAD --pretty=format:"%s" --no-merges

# Or since a date
git log --since="2025-01-01" --pretty=format:"%s" --no-merges
```

Optionally run the parser script (if present):

```bash
./.cursor/skills/release-changelog/scripts/parse-commits.sh v1.0.0..HEAD
```

**Manual workflow**

```bash
git log --oneline -n 50
# Or: git diff v1.0.0..HEAD --stat
```

Review output and note breaking changes, features, and fixes.

---

## Step 3: Categorize and draft

Group items into:

| Section   | Use for |
|----------|---------|
| **Breaking** | Breaking API or behavior changes |
| **Added**    | New features |
| **Changed**  | Changes in existing behavior (non-breaking) |
| **Fixed**    | Bug fixes |
| **Security** | Security-related changes |
| **Deprecated** | Deprecations (optional section) |
| **Removed**  | Removed features (optional) |

- One line per change; start with a verb (Add, Fix, Change, Remove).
- Strip commit hash and scope from the line shown to users; keep the message clear.
- Merge duplicate or overlapping items into a single entry.

---

## Step 4: Apply template

Use this structure for the release block:

```markdown
## [Version] - YYYY-MM-DD

### Breaking
- **Area:** Description of breaking change and migration hint if applicable.

### Added
- Feature or capability in one short line.

### Changed
- What changed and why (brief).

### Fixed
- Bug or issue that was fixed.

### Security
- Security fix or hardening (if any).
```

- Omit any section that has no items.
- **Version** is the release version (e.g. `1.2.0`). Use semantic versioning when applicable.
- Date is the release or changelog date in `YYYY-MM-DD`.

For a **single changelog file** (e.g. `CHANGELOG.md`), prepend this block at the top under the title, with one blank line after the title.

---

## Step 5: Validate output

Before returning the changelog:

- [ ] Every listed change is from the requested range or provided list.
- [ ] No empty sections (sections with no items removed).
- [ ] Version and date are filled; format is consistent.
- [ ] Lines are concise and user-facing (no raw commit hashes in the body).

For strict conventional-commit mapping, see [reference.md](reference.md).

---

## Optional: Append to CHANGELOG.md

If the project has an existing `CHANGELOG.md`:

1. Read the file and find the heading level used for releases (usually `##`).
2. Insert the new release block **after** the top-of-file title/description and **before** the previous release.
3. Keep the existing "Unreleased" section if present; only add the new version when cutting a release.

---

## Additional resources

- For conventional commit types and scopes, see [reference.md](reference.md).
- For before/after examples, see [examples.md](examples.md).
