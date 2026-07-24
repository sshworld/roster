[English](README.md) · **한국어**

# roster

에이전트가 제 컨텍스트 값을 하고 있나요?

<img src="docs/assets/hero.svg" alt="roster audit 터미널 출력" width="720">

`roster audit` 는 `--html` 로 공유 가능한 HTML 리포트도 렌더링합니다 — [라이브 샘플 리포트 보기](https://sshworld.github.io/roster/demo/report.html).

## 철학

대부분의 에이전트 도구는 페르소나(말투, 역할극, 지시문)를 최적화합니다. roster 는 다른 전제에서 출발합니다: **가치를 만드는 것은 페르소나가 아니라 구조다.** 에이전트의 컨텍스트는 의존성이고, 의존성은 변질됩니다 — 서로 겹치고, 라우팅이 어긋나고, 토큰을 먹고, 썩습니다. roster 는 당신의 에이전트 로스터(스킬, 서브에이전트, 툴 설정)를 정적 분석해 이런 문제가 프로덕션에서 컨텍스트를 태우기 전에 드러내는 도구입니다.

## 설치

roster 는 Claude Code 플러그인으로 제공됩니다 — 일회성 리포트가 아니라 상주형 가드입니다.

번들된 마켓플레이스 매니페스트로 설치:

```sh
/plugin marketplace add sshworld/roster
/plugin install roster
```

설치 후:

- **`roster-audit` 스킬** — 에이전트 로스터 감사(겹침, 하네스/툴 누락, 라우팅 모호성, 비용)를 요청하면 발동합니다. 번들된 CLI 를 실행하고 결과 읽는 법을 설명합니다.
- **`roster-cleanup` 스킬** — 에이전트를 정리·솎아내기·병합하려 할 때 발동합니다. 감사 후 결과를 구체적 액션(삭제 / 이동 / 병합 / 이름변경 / 언인스톨 / 툴 축소)으로 분류하고, 파괴적 단계마다 승인을 요청해 승인한 것만 실행한 뒤, 재감사해 변화량을 보고합니다.
- **`roster-usage` 스킬** — 실제로 어떤 에이전트를 쓰는지 물으면 발동합니다. 트랜스크립트 이력을 로스터와 조인해 미사용 에이전트와 유령 호출을 드러내고, dead weight 가 나오면 `/roster-cleanup` 으로 안내합니다.
- **`roster-drift.sh` 훅** (`SessionStart`) — 매 세션마다 감시 대상 agent-md 디렉토리를 캐시된 스냅샷과 재귀적으로 콘텐츠-핑거프린트(크기가 아니라 체크섬)해 에이전트가 추가/삭제/변경됐으면 짧은 권고를 냅니다(`ROSTER_DRIFT_DISABLE=1` 로 해제). 기본적으로 `.claude/agents` 를 감시하며, 플러그인 레이아웃 repo(최상위 `.claude-plugin/plugin.json` 이 있는)에서는 루트 `agents/` 디렉토리도 감시합니다. `ROSTER_DRIFT_DIR`(콜론 구분 디렉토리 목록)로 재정의합니다. 스캔은 심링크를 따라가고 `node_modules`/`.git` 은 제외합니다. 권고는 릴레이 지시문과 함께 Claude 세션 컨텍스트에 주입되어, Claude 가 세션 첫 응답에서 사용자에게 전달합니다. 권고 전용 — 세션을 절대 막지 않습니다.
- **`roster-warn.sh` 훅** (`PostToolUse`) — Claude 가 에이전트(`Task`/`Agent` 툴)나 스킬(`Skill` 툴)을 호출한 직후, 방금 호출된 이름과 로스터의 나머지 모든 형제 항목 사이의 TF-IDF 겹침 점수를 계산합니다. 임계값(훅 기본 0.7, 독립 CLI 기본 0.6 — `--above` 로 재정의) 이상이면 drift 훅과 같은 릴레이 패턴으로 짧은 권고를 Claude 세션 컨텍스트에 주입합니다. 세션당 이름별로 중복 제거되므로(`~/.cache/roster/warn-seen-<session>/` 아래 마커 파일) 반복 호출되는 에이전트는 한 번만 경고합니다. `ROSTER_WARN_DISABLE=1` 로 완전히 해제합니다. 권고 전용 — 툴 호출을 절대 막지 않습니다.

### 독립 실행형 CLI

```sh
npm i -g roster-cli
```

또는 설치 없이 실행:

```sh
npx roster-cli audit <dir>
```

## 사용법

roster 는 네 개의 명령(`audit`, `doccheck`, `usage`, `warn`)을 가진 단일 바이너리입니다. 플러그인은 `audit` 과 `usage` 를 `/roster-audit`·`/roster-usage` 스킬로 감싸고, 둘 위에 얹은 스킬 전용 대화형 워크플로 `/roster-cleanup` 을 추가합니다. `doccheck` 은 CLI 전용입니다. `warn` 은 위의 `roster-warn.sh` `PostToolUse` 훅으로 연결되며, 독립 실행도 가능합니다.

```sh
roster audit <dir>
roster audit <dir> --user
roster audit <dir> --repo owner/name[@ref][:subdir]
roster audit <dir> --html report.html
roster audit --plugin --enabled-only
roster doccheck README.md
roster usage --days 14 --user
roster warn --name my-agent
```

`audit` 의 전체 플래그:

```
roster audit <dir> [--json] [--html <out>] [--user] [--plugin [name]]
                    [--enabled-only] [--repo <owner/name[@ref][:subdir]>] [--top <n>]
                    [--fail-above <s>] [--no-fail]
```

`--enabled-only`(`--plugin` 과 함께)는 플러그인 캐시 소스를 현재 프로젝트에서 활성인 항목으로 제한합니다.[^enabled-only]

[^enabled-only]: 두 필터를 AND 로 결합합니다. **스코프**: user 스코프 항목은 항상 활성이고, local/project 스코프 항목은 cwd 가 그 항목을 고정한 프로젝트 안에 있을 때만 활성입니다. **설정**: `settings.json`/`settings.local.json` 의 `enabledPlugins` 로 명시적으로 비활성화된 플러그인은 제외됩니다 — `<home>/.claude/` 부터, 그다음 cwd 이상에서 `.claude/settings.json` 을 가진 가장 가까운 프로젝트 디렉토리까지 확인하며, 뒤 파일이 우선하고 어느 파일에도 없는 키는 활성으로 취급합니다. 이는 audit 경로 전용입니다 — `usage` 는 `--enabled-only` 를 받지 않습니다.

**무엇을 에이전트로 세는가.** `--repo` 와 `<dir>` 스캔은 프론트매터에 비어있지 않은 `name` 이 있는 마크다운 파일만 수집합니다. `description` 은 권장이지만 필수는 아닙니다. `SKILL.md`, `CLAUDE.md`, `AGENTS.md` 라는 이름의 파일은 `name` 키가 있어도 basename 으로 제외됩니다. 파일명 규칙에만 의존하는(프론트매터에 `name` 키가 없는) 컬렉션은 repo/dir 스윕에서 수집되지 않습니다.

## MCP 서버

`roster mcp` 는 stdio 위에서 [Model Context Protocol](https://modelcontextprotocol.io) 서버를 실행합니다. 그래서 어떤 MCP 클라이언트든 — Claude Code, Cursor, Codex CLI, MCP Inspector — 셸을 거치지 않고 `roster_audit`, `roster_usage`, `roster_doccheck` 를 툴로 직접 호출할 수 있습니다.

```sh
npm i -g roster-cli
claude mcp add roster -- roster mcp
```

npx 대안(전역 설치 없이):

```sh
claude mcp add roster -- npx -y roster-cli mcp
```

Cursor (`.cursor/mcp.json`):

```json
{ "mcpServers": { "roster": { "command": "roster", "args": ["mcp"] } } }
```

Codex CLI (`~/.codex/config.toml`):

```toml
[mcp_servers.roster]
command = "roster"
args = ["mcp"]
```

MCP 클라이언트 설정에서는 `npx` 보다 전역 설치를 권장합니다 — 콜드 `npx` 다운로드가 클라이언트 시작 타임아웃을 초과할 수 있습니다. `ROSTER_CLAUDE_DIR` 같은 환경변수는 `args` 안에 인라인으로 넣지 말고 MCP 설정의 `env` 블록에 넣으세요.

**스코프.** roster 는 마크다운+프론트매터 에이전트 정의(Claude Code 포맷)를 파싱하고, `roster_usage` 는 Claude Code 트랜스크립트 파일을 읽습니다. 다른 에이전트 포맷(Cursor rules, `AGENTS.md` 팩) 어댑터는 로드맵에 있습니다. MCP 서버는 roster 가 이해하는 대상을 바꾸지 않습니다 — 같은 분석을 오늘 어느 MCP 클라이언트에서든 호출 가능하게 만들 뿐입니다.

## doccheck

```sh
roster doccheck README.md
roster doccheck docs/
roster doccheck            # 기본값: README.md + docs/**/*.md
```

마크다운 문서의 펜스된 `sh`/`bash`/`shell` 코드 블록을 스캔해, 독자가 복사-붙여넣기 하면 실패할 명령을 찾습니다: 죽은 상대 경로, 없는 `npm run <script>` 스크립트, 디스크에는 있지만 실행 비트가 없는 스크립트.

오탐을 0 으로 유지하기 위해, 값싸게 검증할 수 없는 것은 건너뜁니다: 절대 경로(`/plugin ...`), `npx ...` 호출, 경로 구분자가 없는 맨 전역 바이너리(`node`, `git`, ...).

결과가 하나라도 보고되면 `1`, 아니면 `0` 으로 종료합니다(기계가 읽을 출력은 `--json`).

## usage

```sh
roster usage
roster usage --days 14
roster usage --user
roster usage --plugin --json
```

`~/.claude` 아래 Claude Code 트랜스크립트 파일들에서(`ROSTER_CLAUDE_DIR` 로 재정의) 각 `subagent_type` 이 (Agent/Task 툴을 통해) 얼마나 자주 호출됐는지를 최근 `--days`(기본 `30`) 안에서 집계합니다.

`--user` 그리고/또는 `--plugin` 과 조인하면 다음도 보고합니다:
- **unused** — 로스터에 있지만 관측된 호출이 0 인 에이전트
- **ghosts** — 호출된 `subagent_type` 값 중 어느 로스터 에이전트와도 매칭되지 않는 것

`--plugin --json` 은 `plugins` 배열도 추가합니다(`--plugin` 이 전달되면 비어 있어도 항상 존재하며 항상 배열) — 설치된 플러그인마다 한 항목:

```json
{ "name": "some-plugin", "scope": "user", "version": "1.2.0",
  "agentCount": 3, "usedCount": 0, "unusedAgents": ["a", "b", "c"],
  "status": "unused" }
```

`status` 는 그 플러그인이 제공하는 모든 에이전트의 관측 호출이 0 이면 `"unused"`(플러그인 단위 **언인스톨 후보** — 사람이 읽을 출력에서 `Fully-unused plugins (uninstall candidates):` 아래에 `claude plugin uninstall <name>` 힌트와 함께 나열), 최소 하나라도 호출됐으면 `"used"`, 에이전트를 하나도 제공하지 않으면 `"no-agents"`(언인스톨 후보 판정에서 제외 — `No agents (usage unknown): ...` 로 별도 나열)입니다.

항상 `0` 으로 종료합니다 — 이것은 게이트가 아니라 리포팅 도구입니다.

## warn

```sh
roster warn --name my-agent
roster warn --name plugin:my-skill --kind skill --above 0.5
roster warn --hook   # PostToolUse 페이로드를 stdin 으로 대신 읽음
```

위 `roster-warn.sh` `PostToolUse` 훅과 같은 겹침 검사를 독립적으로 실행하는 진입점입니다: `--name` 과 로스터의 다른 모든 에이전트/스킬 사이 TF-IDF 코사인 유사도를 계산해 `--above`(기본 `0.6`. 훅 자체 기본값은 `0.7`) 이상인 형제를 보고합니다. `--kind` 로 `agent`/`skill` 매칭을 제한할 수 있습니다.

```
roster warn --name code-reviewer
[roster warn] 'code-reviewer' overlaps with 2 sibling(s):
  - pr-reviewer (agent, dir:.claude/agents) score=0.812
  - security-reviewer (agent, user) score=0.734
```

**한계:**
- 훅은 `Task`/`Agent` 툴 호출(서브에이전트)과 `Skill` 툴 호출만 관측합니다 — `Skill` 툴을 거치지 않는 슬래시 커맨드는 어느 쪽이든 권고를 만들지 않습니다.
- 스킬은 `name + description` 만으로 벡터화됩니다(`SKILL.md` 본문은 신호가 아니라 상투구이므로); 에이전트는 `description + body` 로 벡터화됩니다 — `roster audit` 자체의 overlap 규칙과 동일합니다. 이 비대칭 때문에 `warn` 점수는 `audit` 의 overlap 점수와 직접 비교할 수 없습니다.
- 권고 전용 — `warn` 은 자신이 뒤따르는 툴 호출을 절대 막거나, 재시도하거나, 변경하지 않습니다.

## 규칙

| 규칙 | 설명 | 상태 |
| --- | --- | --- |
| `overlap` | 같은 책임을 다루는 에이전트/스킬 탐지 | stable |
| `harness` | 하네스 비호환 또는 잘못된 설정을 표시 | stable |
| `routing` | 에이전트 간 라우팅/트리거 모호성 검사 | stable |
| `cost` | 로스터의 컨텍스트/토큰 비용 추정 | stable |
| `fluff` | 저신호 필러 지시문을 표시(본문 20줄 초과) | experimental |

## 벤치마크

`roster audit --repo` 를 잘 알려진 공개 에이전트 로스터들에 대해 실행한 결과(SHA 고정, `scripts/bench.sh` 로 재현 가능). 전체 리포트: `docs/benchmarks/`.

주간 cron 이 각 로스터의 최신 upstream HEAD 에 대해 벤치 스위트를 재실행하고 변경이 있으면 곧장 `main` 으로 푸시합니다.[^leaderboard-cron]

> **참고:** 아래 표는 스냅샷입니다. 자동 갱신되는 리더보드는 [영문 README](README.md#benchmarks) 를 기준으로 하므로, 최신 수치는 그쪽에서 확인하세요.

<!-- bench:start -->
| Repo | Agents | Top overlap pair | No-tools % | Fixed cost |
| --- | --- | --- | --- | --- |
| [affaan-m/ECC:agents](https://github.com/affaan-m/ECC) | 67 | swift-build-resolver <-> swift-reviewer (0.726) | 0.0% | ~3488 tokens/turn |
| [contains-studio/agents](https://github.com/contains-studio/agents) | 32 | test-writer-fixer <-> test-results-analyzer (0.475) | 3.1% | ~8421 tokens/turn |
| [msitarzewski/agency-agents](https://github.com/msitarzewski/agency-agents) | 255 | Backend Architect (github:msitarzewski/agency-agents@9f3e401ccd09aa0ee0ef8e015226d0647908e01e) <-> Backend Architect (github:msitarzewski/agency-agents@9f3e401ccd09aa0ee0ef8e015226d0647908e01e) (0.879) | 93.3% | ~14024 tokens/turn |
| [wshobson/agents](https://github.com/wshobson/agents) | 199 | api-scaffolding-backend-architect <-> backend-api-security-backend-architect (1.000) | 92.5% | ~14041 tokens/turn |
<!-- bench:end -->

[^leaderboard-cron]: 매주 월요일 `.github/workflows/leaderboard.yml` 로 실행됩니다. GitHub 은 repo 가 60일간 비활성이면 예약 워크플로를 자동 비활성화합니다 — 그럴 경우 수동 `workflow_dispatch` 실행으로 다시 켜세요.

여러 상위 쌍이 1.000 에 가까운 유사도를 보입니다(예: wshobson/agents 는 완벽한 1.000 쌍이 다섯 개) — 이는 우연한 주제 겹침이 아니라 거의 동일한 에이전트 파일(같은 설명/본문을 여러 역할에 재사용)입니다.

### 표 읽는 법

- **Agents** — 발견된 실제 서브에이전트 정의(프론트매터에 명시적 `name` 이 있는 마크다운. 문서·스킬·커맨드 파일은 세지 않음).
- **Top overlap pair** — 두 에이전트 *설명* 간의 최고 TF-IDF 코사인 유사도. 라우터는 이 설명들을 읽어 서브에이전트를 고르므로, 설명이 비슷하면 라우팅이 동전던지기가 됩니다. 대략의 척도: **1.000** = 사실상 같은 에이전트 둘, **0.7+** = 병합 또는 차별화, **< 0.5** = 건강.
- **No-tools %** — `tools` 선언이 없는 에이전트의 비율. 선언이 없으면 *모든* 툴을 상속하므로, 모델이 그 에이전트의 실제 능력을 추측해야 하고 최소권한 원칙이 사라집니다.
- **Fixed cost** — 어떤 에이전트도 호출되기 전, 로스터를 등록해 둔 것만으로 **매 턴** 컨텍스트에 주입되는 추정 토큰량.

### 어떻게 조치할까

임팩트 순서로:

1. **미사용 에이전트 삭제** — `roster usage` 가 실제 호출 이력을 조인합니다. 등록만 하고 한 번도 호출 안 한 에이전트는 순수한 매-턴 세금입니다. 전부 미사용인 플러그인은 언인스톨 후보입니다(`roster usage --plugin`).
2. **겹치는 쌍을 병합 또는 차별화** — 1.000 쌍은 하나가 dead weight 라는 뜻이고, 0.7–0.9 쌍은 병합하거나 *언제 어느 쪽을 골라야 하는지* 드러나게 설명을 다시 쓰세요. `/roster-cleanup` 스킬이 이 과정을 안내합니다.
3. **`tools` 선언** — 각 에이전트에 실제로 필요한 최소 집합을 주세요(리뷰어는 `Write` 가 아니라 `Read, Grep, Bash` 가 필요).
4. **설명 다이어트** — 라우팅에 필요한 것만 남기세요. 두 문장 설명이 세 문단 자기소개만큼 잘 라우팅되고 비용은 일부에 불과합니다.

## 기여

[CONTRIBUTING.md](./CONTRIBUTING.md) 를 참고하세요.

## 라이선스

[MIT](./LICENSE)
