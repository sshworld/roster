#!/usr/bin/env bash
# hooks/roster-drift.sh — SessionStart resident guard for roster.
#
# Compares the current project's watched agent-md dir(s) file list + size
# fingerprint against a cached snapshot (`~/.cache/roster/drift-<repo-hash>.snap`).
# When drift is detected it prints a short advisory to stdout (SessionStart
# additionalContext) and stderr (user-visible), and refreshes the snapshot. No
# drift -> no output. Always exits 0 (advisory only, never blocks). Uses only
# bash + find/wc/cksum/awk — no node/npx required.
#
# Watched dirs:
#   - ROSTER_DRIFT_DIR set: colon-separated dir list, existing dirs only.
#   - otherwise: `.claude/agents` (if present) + `agents` (if this repo has a
#     `.claude-plugin/plugin.json`, i.e. a plugin-layout repo, and `agents/` exists).
#   - zero watched dirs -> silent exit 0 (unchanged from before).
#
# Bypass: ROSTER_DRIFT_DISABLE=1 <session> — suppresses all output (still exits 0).
set -uo pipefail

[ -n "${ROSTER_DRIFT_DISABLE:-}" ] && exit 0

WATCH_DIRS=""
if [ -n "${ROSTER_DRIFT_DIR:-}" ]; then
  _raw_dirs="$(printf '%s' "$ROSTER_DRIFT_DIR" | tr ':' ' ')"
  for _d in $_raw_dirs; do
    [ -d "$_d" ] && WATCH_DIRS="${WATCH_DIRS}${WATCH_DIRS:+ }${_d}"
  done
else
  [ -d ".claude/agents" ] && WATCH_DIRS=".claude/agents"
  if [ -f ".claude-plugin/plugin.json" ] && [ -d "agents" ]; then
    WATCH_DIRS="${WATCH_DIRS}${WATCH_DIRS:+ }agents"
  fi
fi

[ -n "$WATCH_DIRS" ] || exit 0

HOME_DIR="${HOME:-/tmp}"
CACHE_DIR="${HOME_DIR}/.cache/roster"
mkdir -p "$CACHE_DIR" 2>/dev/null || exit 0

repo_root="$(pwd)"
# Simple portable hash of the repo path for the snapshot filename (no external deps
# beyond cksum, which ships with coreutils on both macOS and Linux).
repo_hash="$(printf '%s' "$repo_root" | cksum | awk '{print $1}')"
SNAPSHOT="${CACHE_DIR}/drift-${repo_hash}.snap"

# Build a fingerprint: one line per agent .md file, "<dir>/<name> <size>", sorted
# per watched dir and concatenated in watch-dir order.
current_fingerprint="$(
  for _d in $WATCH_DIRS; do
    find "$_d" -maxdepth 1 -type f -name '*.md' 2>/dev/null | sort
  done | while IFS= read -r f; do
    size="$(wc -c < "$f" 2>/dev/null | tr -d ' ')"
    printf '%s %s\n' "$f" "$size"
  done
)"
current_count="$(printf '%s\n' "$current_fingerprint" | grep -c . || true)"

write_snapshot() {
  { printf 'v2\n'; printf '%s\n' "$current_fingerprint"; } > "$SNAPSHOT"
}

if [ ! -f "$SNAPSHOT" ]; then
  write_snapshot
  exit 0
fi

snapshot_version="$(head -n 1 "$SNAPSHOT" 2>/dev/null)"
if [ "$snapshot_version" != "v2" ]; then
  # Pre-v2 snapshot format (no version header): upgrade silently, no advisory —
  # otherwise every repo would see a one-time fake drift right after the upgrade.
  write_snapshot
  exit 0
fi

previous_fingerprint="$(tail -n +2 "$SNAPSHOT")"

if [ "$current_fingerprint" = "$previous_fingerprint" ]; then
  exit 0
fi

previous_count="$(printf '%s\n' "$previous_fingerprint" | grep -c . || true)"
delta=$((current_count - previous_count))

dir_display=""
for _d in $WATCH_DIRS; do
  dir_display="${dir_display}${dir_display:+, }${_d}"
done

if [ "$delta" -gt 0 ]; then
  advisory="roster drift: +${delta} agent(s) in ${dir_display} — run \`roster audit ${dir_display}\`"
elif [ "$delta" -lt 0 ]; then
  advisory="roster drift: ${delta} agent(s) in ${dir_display} — run \`roster audit ${dir_display}\`"
else
  advisory="roster drift: agent(s) in ${dir_display} changed — run \`roster audit ${dir_display}\`"
fi

# stdout feeds the model's session context (additionalContext); stderr is what
# the user actually sees in the terminal — emit to both so neither audience
# misses the advisory.
echo "$advisory"
echo "$advisory" >&2

write_snapshot
exit 0
