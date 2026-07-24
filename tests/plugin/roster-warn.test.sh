#!/usr/bin/env bash
# tests/plugin/roster-warn.test.sh
# Standalone bash test for hooks/roster-warn.sh — run directly, not via npm test:
#   bash tests/plugin/roster-warn.test.sh
set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
HOOK="${REPO_ROOT}/hooks/roster-warn.sh"

pass=0
fail=0

assert_equal() {
  local actual="$1" expected="$2" msg="$3"
  if [[ "$actual" == "$expected" ]]; then
    echo "  ok: $msg"
    pass=$((pass + 1))
  else
    echo "  FAIL: $msg"
    echo "    expected: $expected"
    echo "    got: $actual"
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

echo "=== roster-warn.sh tests ==="

# 1. ROSTER_WARN_DISABLE=1 -> no output, exit 0
out1="$(echo '{}' | ROSTER_WARN_DISABLE=1 CLAUDE_PLUGIN_ROOT="${REPO_ROOT}" bash "$HOOK" 2>&1)"
code1=$?
assert_exit_zero "$code1" "ROSTER_WARN_DISABLE=1: exit 0"
assert_empty "$out1" "ROSTER_WARN_DISABLE=1: no output"

# 2. CLAUDE_PLUGIN_ROOT unset -> no output, exit 0
out2="$(echo '{}' | env -u CLAUDE_PLUGIN_ROOT bash "$HOOK" 2>&1)"
code2=$?
assert_exit_zero "$code2" "CLAUDE_PLUGIN_ROOT unset: exit 0"
assert_empty "$out2" "CLAUDE_PLUGIN_ROOT unset: no output"

# 3. dist/cli.js absent -> no output, exit 0
tmp3="$(mktemp -d)"
out3="$(echo '{}' | CLAUDE_PLUGIN_ROOT="$tmp3" bash "$HOOK" 2>&1)"
code3=$?
assert_exit_zero "$code3" "dist/cli.js absent: exit 0"
assert_empty "$out3" "dist/cli.js absent: no output"
rm -rf "$tmp3"

# 4. ROSTER_WARN_CMD substitution -> stdin passthrough, fake stdout emitted
tmp4="$(mktemp -d)"
cat > "${tmp4}/fake.sh" <<'EOF'
#!/usr/bin/env bash
cat
echo '{"fake":true}'
EOF
chmod +x "${tmp4}/fake.sh"
in4='{"tool_name":"Task"}'
out4="$(printf '%s' "$in4" | ROSTER_WARN_CMD="${tmp4}/fake.sh" CLAUDE_PLUGIN_ROOT="${REPO_ROOT}" bash "$HOOK" 2>&1)"
code4=$?
assert_exit_zero "$code4" "ROSTER_WARN_CMD: exit 0"
assert_equal "$out4" "${in4}{\"fake\":true}" "ROSTER_WARN_CMD: stdin passthrough + fake stdout"
rm -rf "$tmp4"

# 5. stdout carries only what the substituted command wrote — no hook-added noise
tmp5="$(mktemp -d)"
cat > "${tmp5}/fake.sh" <<'EOF'
#!/usr/bin/env bash
cat >/dev/null
printf '{"ok":true}'
EOF
chmod +x "${tmp5}/fake.sh"
out5="$(echo '{}' | ROSTER_WARN_CMD="${tmp5}/fake.sh" CLAUDE_PLUGIN_ROOT="${REPO_ROOT}" bash "$HOOK")"
code5=$?
assert_exit_zero "$code5" "no stdout noise: exit 0"
assert_equal "$out5" '{"ok":true}' "no stdout noise: stdout is exactly the substituted command's JSON"
rm -rf "$tmp5"

echo ""
echo "=== summary: ${pass} passed, ${fail} failed ==="
if [[ "$fail" -gt 0 ]]; then
  exit 1
fi
exit 0
