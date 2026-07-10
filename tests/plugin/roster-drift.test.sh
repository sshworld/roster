#!/usr/bin/env bash
# tests/plugin/roster-drift.test.sh
# Standalone bash test for hooks/roster-drift.sh — run directly, not via npm test:
#   bash tests/plugin/roster-drift.test.sh
set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
HOOK="${REPO_ROOT}/hooks/roster-drift.sh"

pass=0
fail=0

assert_contains() {
  local haystack="$1" needle="$2" msg="$3"
  if [[ "$haystack" == *"$needle"* ]]; then
    echo "  ok: $msg"
    pass=$((pass + 1))
  else
    echo "  FAIL: $msg"
    echo "    expected to contain: $needle"
    echo "    got: $haystack"
    fail=$((fail + 1))
  fi
}

assert_empty() {
  local haystack="$1" msg="$2"
  if [[ -z "$haystack" ]]; then
    echo "  ok: $msg"
    pass=$((pass + 1))
  else
    echo "  FAIL: $msg"
    echo "    expected empty output, got: $haystack"
    fail=$((fail + 1))
  fi
}

assert_exit_zero() {
  local code="$1" msg="$2"
  if [[ "$code" -eq 0 ]]; then
    echo "  ok: $msg"
    pass=$((pass + 1))
  else
    echo "  FAIL: $msg (exit code $code)"
    fail=$((fail + 1))
  fi
}

setup_project() {
  local tmp
  tmp="$(mktemp -d)"
  mkdir -p "${tmp}/project/.claude/agents"
  mkdir -p "${tmp}/home"
  echo "$tmp"
}

echo "=== roster-drift.sh tests ==="

# 1. no .claude/agents dir -> no-op exit 0, no output
tmp1="$(mktemp -d)"
mkdir -p "${tmp1}/project" "${tmp1}/home"
out1="$(cd "${tmp1}/project" && HOME="${tmp1}/home" bash "$HOOK" 2>&1)"
code1=$?
assert_exit_zero "$code1" "no .claude/agents: exit 0"
assert_empty "$out1" "no .claude/agents: no output"
rm -rf "$tmp1"

# 2. first run creates snapshot; no crash, exit 0
tmp2="$(setup_project)"
cat > "${tmp2}/project/.claude/agents/writer.md" <<'EOF'
---
name: writer
description: writes stuff
---
body
EOF
out2="$(cd "${tmp2}/project" && HOME="${tmp2}/home" bash "$HOOK" 2>&1)"
code2=$?
assert_exit_zero "$code2" "first run: exit 0"
snap_found=0
if find "${tmp2}/home" -name '*.snap' 2>/dev/null | grep -q .; then
  snap_found=1
fi
if [[ "$snap_found" -eq 1 ]]; then
  echo "  ok: first run: snapshot file created"
  pass=$((pass + 1))
else
  echo "  FAIL: first run: snapshot file created"
  fail=$((fail + 1))
fi

# 3. second run, no changes -> no output
out3="$(cd "${tmp2}/project" && HOME="${tmp2}/home" bash "$HOOK" 2>&1)"
code3=$?
assert_exit_zero "$code3" "no changes: exit 0"
assert_empty "$out3" "no changes: no output"

# 4. add an agent -> advisory output on BOTH stdout (model context) and stderr
# (user-visible in the TUI)
cat > "${tmp2}/project/.claude/agents/researcher.md" <<'EOF'
---
name: researcher
description: does research
---
body
EOF
# One invocation, streams captured separately — the hook refreshes its snapshot
# on each run, so running twice would see no drift the second time.
(cd "${tmp2}/project" && HOME="${tmp2}/home" bash "$HOOK" >"${tmp2}/out4" 2>"${tmp2}/err4")
code4=$?
out4="$(cat "${tmp2}/out4")"
err4="$(cat "${tmp2}/err4")"
assert_exit_zero "$code4" "agent added: exit 0"
assert_contains "$out4" "roster drift" "agent added: advisory on stdout"
assert_contains "$err4" "roster drift" "agent added: advisory duplicated on stderr"

# 5. run again after change, no more changes -> no output
out5="$(cd "${tmp2}/project" && HOME="${tmp2}/home" bash "$HOOK" 2>&1)"
code5=$?
assert_exit_zero "$code5" "after advisory, stable: exit 0"
assert_empty "$out5" "after advisory, stable: no output"

# 6. ROSTER_DRIFT_DISABLE=1 -> no output even with a new change
cat > "${tmp2}/project/.claude/agents/planner.md" <<'EOF'
---
name: planner
description: plans stuff
---
body
EOF
out6="$(cd "${tmp2}/project" && HOME="${tmp2}/home" ROSTER_DRIFT_DISABLE=1 bash "$HOOK" 2>&1)"
code6=$?
assert_exit_zero "$code6" "ROSTER_DRIFT_DISABLE=1: exit 0"
assert_empty "$out6" "ROSTER_DRIFT_DISABLE=1: no output"

rm -rf "$tmp2"

echo ""
echo "=== summary: ${pass} passed, ${fail} failed ==="
if [[ "$fail" -gt 0 ]]; then
  exit 1
fi
exit 0
