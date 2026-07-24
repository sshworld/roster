#!/usr/bin/env bash
# hooks/roster-warn.sh — PostToolUse overlap-on-invocation advisory.
#
# Passes the PostToolUse hook JSON (stdin) straight through to
# `roster warn --hook`, which decides whether an overlap advisory is due and
# emits a single JSON object on stdout (always exit 0). This script does no
# JSON parsing itself (node side owns that) — bash here only decides whether
# node is reachable at all, and always exits 0 either way.
#
# Bypass: ROSTER_WARN_DISABLE=1 <session> — suppresses the hook entirely.
# Test hook: ROSTER_WARN_CMD overrides the node invocation with an arbitrary
# command (same substitution convention as ROSTER_DRIFT_DIR in roster-drift.sh).
set -uo pipefail

[ -n "${ROSTER_WARN_DISABLE:-}" ] && exit 0

if [ -n "${ROSTER_WARN_CMD:-}" ]; then
  exec ${ROSTER_WARN_CMD}
fi

command -v node >/dev/null 2>&1 || exit 0
[ -n "${CLAUDE_PLUGIN_ROOT:-}" ] || exit 0
[ -f "${CLAUDE_PLUGIN_ROOT}/dist/cli.js" ] || exit 0

exec node "${CLAUDE_PLUGIN_ROOT}/dist/cli.js" warn --hook
