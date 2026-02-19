#!/usr/bin/env bash
# Usage: parse-commits.sh [revision-range]
# Example: parse-commits.sh v1.0.0..HEAD
# Outputs conventional-commit lines for changelog categorization.
# Requires: git

set -e
RANGE="${1:-HEAD}"
git log "$RANGE" --pretty=format:"%s" --no-merges | while read -r line; do
  echo "$line"
done
