#!/usr/bin/env bash
# scripts/bench.sh — Runs `roster audit --repo` against a fixed set of
# well-known OSS agent rosters and writes reproducible markdown reports to
# docs/benchmarks/. Requires `npm run build` (dist/cli.js) to exist.
#
# Targets are pinned to a specific commit SHA (captured via `git ls-remote`
# at the time this script was authored/updated) so re-running the script
# later reproduces the exact same input, not whatever HEAD has drifted to.
#
# Usage:
#   npm run build
#   scripts/bench.sh
#
# Env:
#   GITHUB_TOKEN   optional — raises GitHub API rate limits. Not required;
#                  the github source only makes one Trees API call per repo
#                  plus raw.githubusercontent.com fetches (served by CDN,
#                  not subject to the same rate limit).
#   BENCH_LATEST   optional — when set to 1, re-resolves each target's SHA to
#                  its current HEAD via `git ls-remote` (no GitHub API call,
#                  avoids rate limits) instead of using the pinned SHA below.
#                  Unset/0: existing pinned-SHA behavior, unchanged.

set -uo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CLI="$ROOT_DIR/dist/cli.js"
OUT_DIR="$ROOT_DIR/docs/benchmarks"
TOP_N=15

# owner/name@sha[:subdir] — SHA pinned via `git ls-remote https://github.com/<owner>/<name> HEAD`.
# Optional :subdir scopes the audit to one directory (mixed repos where only a
# subtree holds agent definitions — e.g. ECC keeps skills/docs alongside agents/).
TARGETS=(
  "msitarzewski/agency-agents@9f3e401ccd09aa0ee0ef8e015226d0647908e01e"
  "wshobson/agents@d7cf7dca8c4c7d0635e284f77204daa85552bfa4"
  "contains-studio/agents@a5a480c324cac64b9c569bca0b2f297d517240cb"
  "affaan-m/ECC@ed387446052dfbc6b52de149406b70efa65edc59:agents"
)

if [ ! -f "$CLI" ]; then
  echo "bench.sh: $CLI not found — run 'npm run build' first" >&2
  exit 1
fi

mkdir -p "$OUT_DIR"

TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

generated_date="$(date -u +%Y-%m-%d)"

# Renders one markdown report from a JSON report + CLI-text report captured
# on stdin-adjacent files. Kept inline (rather than a separate .mjs file) so
# bench.sh remains the single script file this slice is allowed to touch.
render_report() {
  local json_file="$1" cli_file="$2"
  REPO_SPEC="$repo_spec" SHA="$sha" OWNER="$owner" NAME="$name" SUBDIR="$subdir" \
    GENERATED_DATE="$generated_date" TOP_N="$TOP_N" \
    JSON_FILE="$json_file" CLI_FILE="$cli_file" \
    node --input-type=module -e '
import { readFileSync } from "node:fs";

const report = JSON.parse(readFileSync(process.env.JSON_FILE, "utf8"));
const cliText = readFileSync(process.env.CLI_FILE, "utf8").trimEnd();
const { REPO_SPEC, SHA, OWNER, NAME, SUBDIR, GENERATED_DATE, TOP_N } = process.env;
// Repo label + reproduce commands carry the :subdir suffix so the documented
// numbers are reproducible as written (a subdir-scoped audit of the full repo
// spec would report different counts).
const repoLabel = SUBDIR ? `${OWNER}/${NAME}:${SUBDIR}` : `${OWNER}/${NAME}`;
const repoArg = SUBDIR ? `${OWNER}/${NAME}@${SHA}:${SUBDIR}` : `${OWNER}/${NAME}@${SHA}`;

const findings = report.findings;
const agentCount = report.agents.length;
const overlapFindings = findings.filter((f) => f.ruleId === "overlap");
const harnessFindings = findings.filter((f) => f.ruleId === "harness");
const costFixed = findings.find((f) => f.ruleId === "cost" && f.agent === undefined);

// json renderer sorts findings by severity/ruleId/target (alphabetical), not
// score — re-sort by score descending to find the actual top pair / table order.
const overlapByScore = [...overlapFindings].sort((a, b) => b.score - a.score);

const topPair = overlapByScore[0];
const topPairStr = topPair
  ? `${topPair.pair.join(" <-> ")} (${topPair.score.toFixed(3)})`
  : "(no overlap findings)";

const noToolsPct = agentCount > 0 ? ((harnessFindings.length / agentCount) * 100).toFixed(1) : "0.0";
const fixedCostTokens = costFixed ? costFixed.message.match(/~(\d+) tokens/)?.[1] ?? "?" : "?";

const overlapTableRows = overlapByScore
  .map((f) => `| ${f.pair[0]} | ${f.pair[1]} | ${f.score.toFixed(3)} |`)
  .join("\n");

const lines = [];
lines.push(`# Benchmark — ${repoLabel}`);
lines.push("");
lines.push(`- **Repo**: [${repoLabel}](https://github.com/${OWNER}/${NAME})`);
lines.push(`- **Pinned SHA**: \`${SHA}\``);
lines.push(`- **Generated**: ${GENERATED_DATE}`);
lines.push("");
lines.push("## Summary");
lines.push("");
lines.push(`- Agents scanned: **${agentCount}**`);
lines.push(`- Top overlap pair (of top ${TOP_N}): **${topPairStr}**`);
lines.push(`- No-harness agents (no tool restriction / wildcard tools): **${harnessFindings.length}** (${noToolsPct}% of roster)`);
lines.push(`- Roster fixed cost estimate: **~${fixedCostTokens} tokens/turn**`);
lines.push(`- Total findings: **${findings.length}**`);
lines.push("");
lines.push(`## Top ${TOP_N} overlapping pairs`);
lines.push("");
lines.push("| Agent A | Agent B | Similarity |");
lines.push("| --- | --- | --- |");
lines.push(overlapTableRows || "| (none) | (none) | - |");
lines.push("");
lines.push("## Reproduce");
lines.push("");
lines.push("```sh");
lines.push("npm run build");
lines.push(`node dist/cli.js audit --repo ${repoArg} --no-fail --top ${TOP_N} --json`);
lines.push(`node dist/cli.js audit --repo ${repoArg} --no-fail --top ${TOP_N}`);
lines.push("```");
lines.push("");
lines.push("## CLI output");
lines.push("");
lines.push("```");
lines.push(cliText);
lines.push("```");
lines.push("");

process.stdout.write(lines.join("\n") + "\n");
'
}

for target in "${TARGETS[@]}"; do
  # Split an optional :subdir suffix BEFORE the @sha split — otherwise the
  # sha would be contaminated ("<sha>:agents"). Targets without a colon are
  # untouched by the case guard.
  subdir=""
  spec="$target"
  case "$spec" in
    *:*)
      subdir="${spec#*:}"
      spec="${spec%%:*}"
      ;;
  esac
  repo_spec="${spec%@*}"
  sha="${spec##*@}"
  owner="${repo_spec%%/*}"
  name="${repo_spec##*/}"
  slug="${owner}--${name}${subdir:+--${subdir//\//-}}"

  if [ "${BENCH_LATEST:-0}" = "1" ]; then
    latest_sha="$(git ls-remote "https://github.com/${repo_spec}.git" HEAD | cut -f1)"
    if [ -z "$latest_sha" ]; then
      echo "bench: SKIP ${repo_spec} — could not resolve latest SHA via git ls-remote" >&2
      continue
    fi
    sha="$latest_sha"
  fi

  echo "bench: auditing ${repo_spec}@${sha}${subdir:+:$subdir} ..." >&2

  json_file="$TMP_DIR/${slug}.json"
  cli_file="$TMP_DIR/${slug}.cli.txt"
  err_file="$TMP_DIR/${slug}.err.txt"

  if ! node "$CLI" audit --repo "${repo_spec}@${sha}${subdir:+:$subdir}" --no-fail --top "$TOP_N" --json \
      > "$json_file" 2> "$err_file"; then
    echo "bench: SKIP ${repo_spec} — audit (json) failed:" >&2
    cat "$err_file" >&2
    continue
  fi

  if ! node "$CLI" audit --repo "${repo_spec}@${sha}${subdir:+:$subdir}" --no-fail --top "$TOP_N" \
      > "$cli_file" 2>> "$err_file"; then
    echo "bench: SKIP ${repo_spec} — audit (cli text) failed:" >&2
    cat "$err_file" >&2
    continue
  fi

  render_report "$json_file" "$cli_file" > "$OUT_DIR/${slug}.md"
  echo "bench: wrote docs/benchmarks/${slug}.md" >&2
done

echo "bench: done" >&2
