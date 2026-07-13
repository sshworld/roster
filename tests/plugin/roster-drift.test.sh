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

# 4. add an agent -> advisory + relay directive on stdout (model context), bare
# advisory duplicated on stderr (harmless, not user-visible from an exit-0
# SessionStart hook, but costs nothing to keep)
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
assert_contains "$out4" "Relay the advisory" "agent added: relay directive on stdout"
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

# 7. plugin layout: no .claude/agents, but .claude-plugin/plugin.json + root agents/
# -> agents/ is watched
tmp7="$(mktemp -d)"
mkdir -p "${tmp7}/project/.claude-plugin" "${tmp7}/project/agents" "${tmp7}/home"
printf '{"name":"fixture"}' > "${tmp7}/project/.claude-plugin/plugin.json"
cat > "${tmp7}/project/agents/helper.md" <<'EOF'
---
name: helper
description: helps
---
body
EOF
out7a="$(cd "${tmp7}/project" && HOME="${tmp7}/home" bash "$HOOK" 2>&1)"
code7a=$?
assert_exit_zero "$code7a" "plugin layout: first run exit 0"
assert_empty "$out7a" "plugin layout: first run no advisory"

cat > "${tmp7}/project/agents/extra.md" <<'EOF'
---
name: extra
description: extra agent
---
body
EOF
out7b="$(cd "${tmp7}/project" && HOME="${tmp7}/home" bash "$HOOK" 2>&1)"
code7b=$?
assert_exit_zero "$code7b" "plugin layout: after add exit 0"
assert_contains "$out7b" "roster drift" "plugin layout: advisory on add"
assert_contains "$out7b" "agents" "plugin layout: advisory names agents dir"
rm -rf "$tmp7"

# 8. ROSTER_DRIFT_DIR override: only the specified dir(s) are watched, colon-separated
tmp8="$(mktemp -d)"
mkdir -p "${tmp8}/project/.claude/agents" "${tmp8}/project/watched" "${tmp8}/home"
cat > "${tmp8}/project/.claude/agents/ignored.md" <<'EOF'
---
name: ignored
description: should not be watched
---
body
EOF
cat > "${tmp8}/project/watched/one.md" <<'EOF'
---
name: one
description: watched agent
---
body
EOF
out8a="$(cd "${tmp8}/project" && HOME="${tmp8}/home" ROSTER_DRIFT_DIR="watched" bash "$HOOK" 2>&1)"
code8a=$?
assert_exit_zero "$code8a" "override: first run exit 0"
assert_empty "$out8a" "override: first run no advisory"

# change in the non-watched default dir -> no advisory
cat > "${tmp8}/project/.claude/agents/ignored2.md" <<'EOF'
---
name: ignored2
description: still should not be watched
---
body
EOF
out8b="$(cd "${tmp8}/project" && HOME="${tmp8}/home" ROSTER_DRIFT_DIR="watched" bash "$HOOK" 2>&1)"
code8b=$?
assert_exit_zero "$code8b" "override: unrelated dir change exit 0"
assert_empty "$out8b" "override: unrelated dir change no advisory"

# change in the watched dir -> advisory naming it
cat > "${tmp8}/project/watched/two.md" <<'EOF'
---
name: two
description: newly watched agent
---
body
EOF
out8c="$(cd "${tmp8}/project" && HOME="${tmp8}/home" ROSTER_DRIFT_DIR="watched" bash "$HOOK" 2>&1)"
code8c=$?
assert_exit_zero "$code8c" "override: watched dir change exit 0"
assert_contains "$out8c" "roster drift" "override: advisory on watched dir change"
assert_contains "$out8c" "watched" "override: advisory names watched dir"
rm -rf "$tmp8"

# 9. v1 snapshot (no version header) -> upgraded silently, no advisory, rewritten as v3
tmp9="$(mktemp -d)"
mkdir -p "${tmp9}/project/.claude/agents" "${tmp9}/home/.cache/roster"
cat > "${tmp9}/project/.claude/agents/one.md" <<'EOF'
---
name: one
description: pre-existing agent
---
body
EOF
repo_hash9="$(printf '%s' "${tmp9}/project" | cksum | awk '{print $1}')"
snap9="${tmp9}/home/.cache/roster/drift-${repo_hash9}.snap"
size9="$(wc -c < "${tmp9}/project/.claude/agents/one.md" | tr -d ' ')"
printf 'one.md %s\n' "$size9" > "$snap9"
out9="$(cd "${tmp9}/project" && HOME="${tmp9}/home" bash "$HOOK" 2>&1)"
code9=$?
assert_exit_zero "$code9" "v1 snapshot upgrade: exit 0"
assert_empty "$out9" "v1 snapshot upgrade: no advisory"
version_line9="$(head -n 1 "$snap9")"
assert_contains "$version_line9" "v3" "v1 snapshot upgrade: snapshot rewritten as v3"
rm -rf "$tmp9"

# 10. same-size content edit -> advisory (content fingerprint, not just byte size)
tmp10="$(setup_project)"
cat > "${tmp10}/project/.claude/agents/same-size.md" <<'EOF'
---
name: same-size
description: aaaa
---
body
EOF
out10a="$(cd "${tmp10}/project" && HOME="${tmp10}/home" bash "$HOOK" 2>&1)"
code10a=$?
assert_exit_zero "$code10a" "same-size edit: first run exit 0"
out10b="$(cd "${tmp10}/project" && HOME="${tmp10}/home" bash "$HOOK" 2>&1)"
code10b=$?
assert_exit_zero "$code10b" "same-size edit: settle run exit 0"
assert_empty "$out10b" "same-size edit: settle run no advisory"
# same byte count, different content ("aaaa" -> "bbbb")
sed -i.bak 's/aaaa/bbbb/' "${tmp10}/project/.claude/agents/same-size.md"
rm -f "${tmp10}/project/.claude/agents/same-size.md.bak"
out10c="$(cd "${tmp10}/project" && HOME="${tmp10}/home" bash "$HOOK" 2>&1)"
code10c=$?
assert_exit_zero "$code10c" "same-size edit: after edit exit 0"
assert_contains "$out10c" "roster drift" "same-size edit: advisory on content-only change"
rm -rf "$tmp10"

# 11. nested subdir add -> advisory (recursive watch, not just -maxdepth 1)
tmp11="$(setup_project)"
cat > "${tmp11}/project/.claude/agents/top.md" <<'EOF'
---
name: top
description: top-level agent
---
body
EOF
out11a="$(cd "${tmp11}/project" && HOME="${tmp11}/home" bash "$HOOK" 2>&1)"
code11a=$?
assert_exit_zero "$code11a" "nested add: first run exit 0"
out11b="$(cd "${tmp11}/project" && HOME="${tmp11}/home" bash "$HOOK" 2>&1)"
code11b=$?
assert_exit_zero "$code11b" "nested add: settle run exit 0"
assert_empty "$out11b" "nested add: settle run no advisory"
mkdir -p "${tmp11}/project/.claude/agents/sub"
cat > "${tmp11}/project/.claude/agents/sub/nested.md" <<'EOF'
---
name: nested
description: nested agent
---
body
EOF
out11c="$(cd "${tmp11}/project" && HOME="${tmp11}/home" bash "$HOOK" 2>&1)"
code11c=$?
assert_exit_zero "$code11c" "nested add: after add exit 0"
assert_contains "$out11c" "roster drift" "nested add: advisory on nested subdir add"
rm -rf "$tmp11"

# 12. agent removal -> advisory (delta -lt 0 branch)
tmp12="$(setup_project)"
cat > "${tmp12}/project/.claude/agents/keep.md" <<'EOF'
---
name: keep
description: stays
---
body
EOF
cat > "${tmp12}/project/.claude/agents/remove-me.md" <<'EOF'
---
name: remove-me
description: goes away
---
body
EOF
out12a="$(cd "${tmp12}/project" && HOME="${tmp12}/home" bash "$HOOK" 2>&1)"
code12a=$?
assert_exit_zero "$code12a" "removal: first run exit 0"
out12b="$(cd "${tmp12}/project" && HOME="${tmp12}/home" bash "$HOOK" 2>&1)"
code12b=$?
assert_exit_zero "$code12b" "removal: settle run exit 0"
assert_empty "$out12b" "removal: settle run no advisory"
rm -f "${tmp12}/project/.claude/agents/remove-me.md"
out12c="$(cd "${tmp12}/project" && HOME="${tmp12}/home" bash "$HOOK" 2>&1)"
code12c=$?
assert_exit_zero "$code12c" "removal: after remove exit 0"
assert_contains "$out12c" "roster drift" "removal: advisory on agent removal"
rm -rf "$tmp12"

# 13. filename with spaces -> no false advisory unchanged, real advisory when changed
tmp13="$(setup_project)"
cat > "${tmp13}/project/.claude/agents/my agent.md" <<'EOF'
---
name: my-agent
description: has a space in its filename
---
body
EOF
out13a="$(cd "${tmp13}/project" && HOME="${tmp13}/home" bash "$HOOK" 2>&1)"
code13a=$?
assert_exit_zero "$code13a" "spaced filename: first run exit 0"
out13b="$(cd "${tmp13}/project" && HOME="${tmp13}/home" bash "$HOOK" 2>&1)"
code13b=$?
assert_exit_zero "$code13b" "spaced filename: settle run exit 0"
assert_empty "$out13b" "spaced filename: unchanged no advisory"
cat > "${tmp13}/project/.claude/agents/my agent.md" <<'EOF'
---
name: my-agent
description: has a space in its filename, now edited
---
body
EOF
out13c="$(cd "${tmp13}/project" && HOME="${tmp13}/home" bash "$HOOK" 2>&1)"
code13c=$?
assert_exit_zero "$code13c" "spaced filename: after edit exit 0"
assert_contains "$out13c" "roster drift" "spaced filename: advisory on real change"
rm -rf "$tmp13"

# 14. v2 snapshot (header "v2", old "<path> <size>" lines) -> silent upgrade to v3,
# no advisory; then a real change afterwards produces a normal advisory
# (upgrade leaves the snapshot functional for future drift detection).
tmp14="$(setup_project)"
cat > "${tmp14}/project/.claude/agents/one.md" <<'EOF'
---
name: one
description: pre-existing agent
---
body
EOF
repo_hash14="$(printf '%s' "${tmp14}/project" | cksum | awk '{print $1}')"
snap14="${tmp14}/home/.cache/roster/drift-${repo_hash14}.snap"
mkdir -p "${tmp14}/home/.cache/roster"
size14="$(wc -c < "${tmp14}/project/.claude/agents/one.md" | tr -d ' ')"
{ printf 'v2\n'; printf '.claude/agents/one.md %s\n' "$size14"; } > "$snap14"
out14a="$(cd "${tmp14}/project" && HOME="${tmp14}/home" bash "$HOOK" 2>&1)"
code14a=$?
assert_exit_zero "$code14a" "v2 snapshot upgrade: exit 0"
assert_empty "$out14a" "v2 snapshot upgrade: no advisory"
version_line14="$(head -n 1 "$snap14")"
assert_contains "$version_line14" "v3" "v2 snapshot upgrade: snapshot rewritten as v3"
cat > "${tmp14}/project/.claude/agents/one.md" <<'EOF'
---
name: one
description: pre-existing agent, now changed
---
body
EOF
out14b="$(cd "${tmp14}/project" && HOME="${tmp14}/home" bash "$HOOK" 2>&1)"
code14b=$?
assert_exit_zero "$code14b" "v2 snapshot upgrade: after real change exit 0"
assert_contains "$out14b" "roster drift" "v2 snapshot upgrade: normal advisory after upgrade"
rm -rf "$tmp14"

echo ""
echo "=== summary: ${pass} passed, ${fail} failed ==="
if [[ "$fail" -gt 0 ]]; then
  exit 1
fi
exit 0
