#!/usr/bin/env bash
# hooks/roster-drift.sh — SessionStart resident guard for roster.
#
# Compares the current project's `.claude/agents/*.md` file list + size fingerprint
# against a cached snapshot (`~/.cache/roster/drift-<repo-hash>.snap`). When drift is
# detected it prints a short advisory to stdout (SessionStart additionalContext) and
# refreshes the snapshot. No drift -> no output. Always exits 0 (advisory only, never
# blocks). Uses only bash + ls/cksum — no node/npx required.
#
# Bypass: ROSTER_DRIFT_DISABLE=1 <session> — suppresses all output (still exits 0).
set -uo pipefail

[ -n "${ROSTER_DRIFT_DISABLE:-}" ] && exit 0

AGENTS_DIR=".claude/agents"
[ -d "$AGENTS_DIR" ] || exit 0

HOME_DIR="${HOME:-/tmp}"
CACHE_DIR="${HOME_DIR}/.cache/roster"
mkdir -p "$CACHE_DIR" 2>/dev/null || exit 0

repo_root="$(pwd)"
# Simple portable hash of the repo path for the snapshot filename (no external deps
# beyond cksum, which ships with coreutils on both macOS and Linux).
repo_hash="$(printf '%s' "$repo_root" | cksum | awk '{print $1}')"
SNAPSHOT="${CACHE_DIR}/drift-${repo_hash}.snap"

# Build a fingerprint: one line per agent .md file, "name size" sorted.
current_fingerprint="$(
  find "$AGENTS_DIR" -maxdepth 1 -type f -name '*.md' 2>/dev/null \
    | sort \
    | while IFS= read -r f; do
        size="$(wc -c < "$f" 2>/dev/null | tr -d ' ')"
        printf '%s %s\n' "$(basename "$f")" "$size"
      done
)"
current_count="$(printf '%s\n' "$current_fingerprint" | grep -c . || true)"

if [ ! -f "$SNAPSHOT" ]; then
  printf '%s\n' "$current_fingerprint" > "$SNAPSHOT"
  exit 0
fi

previous_fingerprint="$(cat "$SNAPSHOT")"

if [ "$current_fingerprint" = "$previous_fingerprint" ]; then
  exit 0
fi

previous_count="$(printf '%s\n' "$previous_fingerprint" | grep -c . || true)"
delta=$((current_count - previous_count))

if [ "$delta" -gt 0 ]; then
  echo "roster drift: +${delta} agent(s) in ${AGENTS_DIR} — run \`roster audit ${AGENTS_DIR}\`"
elif [ "$delta" -lt 0 ]; then
  echo "roster drift: ${delta} agent(s) in ${AGENTS_DIR} — run \`roster audit ${AGENTS_DIR}\`"
else
  echo "roster drift: agent(s) in ${AGENTS_DIR} changed — run \`roster audit ${AGENTS_DIR}\`"
fi

printf '%s\n' "$current_fingerprint" > "$SNAPSHOT"
exit 0
