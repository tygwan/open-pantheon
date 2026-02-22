# cc-initializer Architecture Analysis

## Overview

Claude Code 전용 통합 개발 워크플로우 프레임워크 -- Agents, Skills, Hooks, Commands를 유기적으로 연결하여 AI Native 개발 환경을 자동화하는 "메타 프로젝트" (런타임 소스 코드 없이 Markdown+Shell+JSON 구성만으로 Claude Code의 행동을 정의).

## Tech Stack

| Category | Technology | Version | Notes |
|----------|-----------|---------|-------|
| Runtime | Claude Code | - | AI 에이전트 호스트 플랫폼, `.claude/` 디렉터리 규약 활용 |
| Configuration | JSON | - | `settings.json` 17-section 설정 허브 (`settings.json:1-315`) |
| Agent/Skill 정의 | Markdown (YAML frontmatter) | - | 25 agents + 27 skills, 각각 `name`/`description` frontmatter 필수 |
| Automation | Bash (Shell Scripts) | GNU Bash | 6 hooks (1,031 LoC), event-driven 자동화 |
| CI/CD | GitHub Actions | - | `update-projects.yml` 주간 크론 + Python3 스크립트 (`workflows/update-projects.yml:1-227`) |
| External CLI | Codex CLI | gpt-5 / gpt-5-codex | 코드 분석/리뷰 듀얼 AI (`skills/codex/SKILL.md:1-55`) |
| External CLI | Gemini CLI | gemini-2.5-flash/pro | 디자인/시각화 (open-pantheon 연동 시) |
| Data Format | JSONL | - | 메트릭 데이터, 30일 retention (`analytics/metrics.jsonl`) |
| Project Discovery | GraphQL (GitHub API) | - | `uses-cc-initializer` 토픽 기반 자동 프로젝트 검색 |

## Architecture

**Architecture Style**: Event-Driven Plugin Architecture + Convention over Configuration

이 프로젝트는 전통적인 실행 바이너리가 없는 "Declarative Agent Framework"이다. Claude Code 플랫폼이 런타임이며, `.claude/` 디렉터리 내 Markdown/JSON/Shell 파일들이 에이전트 행동을 선언적으로 정의한다.

```
┌─────────────────────────────────────────────────────────────────┐
│                    Claude Code Runtime (Host)                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  User Input (slash commands, natural language)                   │
│       │                                                          │
│       ▼                                                          │
│  ┌──────────┐   keyword    ┌──────────────┐                     │
│  │ MANIFEST │──matching──▶│ Agent (1 of 25)│                    │
│  │ (Router) │              └───────┬──────┘                     │
│  └──────────┘                      │                             │
│       │                            ▼                             │
│  ┌────┴─────┐              ┌──────────────┐                     │
│  │ Commands │──────────────│  Skills (27)  │                    │
│  │   (6)    │  orchestrate │  (workflows)  │                    │
│  └──────────┘              └───────┬──────┘                     │
│                                    │                             │
│  ┌─────────────────────────────────┼───────────────────────┐    │
│  │            Event Bus            │                        │    │
│  │  PreToolUse ──▶ safety.sh      ▼                        │    │
│  │  PostToolUse ──▶ progress.sh + tracker.sh + sync.sh     │    │
│  │  Notification ──▶ notification.sh                       │    │
│  └─────────────────────────────────────────────────────────┘    │
│                            │                                     │
│                            ▼                                     │
│                   ┌──────────────┐                               │
│                   │ settings.json│ ◀─ 전체 동작 제어             │
│                   └──────┬───────┘                               │
│                          ▼                                       │
│                   ┌──────────────┐                               │
│                   │   docs/      │ ◀─ 표준화된 문서 산출물       │
│                   └──────────────┘                               │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**핵심 패턴**:
- **MANIFEST Router**: 25개 agent를 ~500 토큰 라우팅 테이블로 압축, keyword 매칭으로 1개만 lazy-load (`agents/MANIFEST.md:1-32`)
- **2-Tier Document Split**: Header (~50 lines, always loaded) + Detail (on-demand) 분리로 90%+ 토큰 절약 (`README.md:137-171`)
- **Event-Driven Hooks**: Claude Code의 PreToolUse/PostToolUse/Notification 이벤트에 Shell 스크립트 바인딩 (`settings.json:1-48`)

## Module Structure

| Module | Responsibility | Key Files | LoC |
|--------|---------------|-----------|-----|
| Agents | 전문화된 작업 수행 (25개), MANIFEST 기반 keyword 라우팅 | `agents/MANIFEST.md`, `agents/*.md`, `agents/details/*.md` | 3,784 |
| Skills | 워크플로우 자동화 (27개), `/slash-command` 인터페이스 | `skills/*/SKILL.md`, `skills/*.md` | 4,272 |
| Commands | 통합 개발 플로우 (6개), 다중 Agent/Skill 오케스트레이션 | `commands/*.md`, `commands/*/` | 1,948 |
| Hooks | Event-driven 자동화 (6개), PreToolUse/PostToolUse/Notification | `hooks/*.sh` | 1,031 |
| Settings | 17-section 통합 설정 허브, 모든 컴포넌트 동작 제어 | `settings.json` | 315 |
| Templates | CLAUDE.lean.md 템플릿, Phase 구조 템플릿 | `templates/*.md`, `templates/phase/*.md` | ~200 |
| Docs | 프레임워크 아키텍처 문서, 통합 가이드 | `docs/*.md` | ~1,600 |
| Analytics | JSONL 메트릭 수집, 시각화 | `analytics/metrics.jsonl`, `scripts/analytics-visualizer.sh` | ~100 |
| CI/CD | GitHub Actions 기반 프로젝트 디스커버리 자동화 | `.github/workflows/update-projects.yml`, `PROJECTS.json` | ~240 |

**Total**: ~134 files, ~20,568 LoC (Markdown: 18,660 / Shell: 1,031 / JSON: 372 / YAML: 88 / JSONL: variable)

## Data Flow

### 1. 프로젝트 초기화 흐름

```
/init --full
    │
    ▼
Framework Setup (.claude/ 전체 복사)
    │
    ▼
project-discovery agent ──▶ DISCOVERY.md
    │
    ▼
dev-docs-writer agent ──▶ PRD.md + TECH-SPEC.md + PROGRESS.md + CONTEXT.md
    │
    ▼
Complexity Score > 6? ──▶ doc-splitter agent ──▶ docs/phases/phase-N/{SPEC,TASKS,CHECKLIST}.md
    │
    ▼
CLAUDE.lean.md 템플릿 변수 자동 채움 ({{PROJECT_NAME}}, {{TECH_STACK}}, ...)
```
Evidence: `docs/ARCHITECTURE.md:217-270`, `skills/init/SKILL.md:36-38`

### 2. 개발 실행 흐름

```
/feature start "기능명"
    │
    ├──▶ branch-manager ──▶ git checkout -b feature/xxx
    ├──▶ phase-tracker ──▶ TASKS.md에 Task 추가
    ├──▶ /sprint add ──▶ Sprint Backlog 연결
    └──▶ context-optimizer ──▶ 관련 파일 자동 로드
         │
         ▼ [개발 진행 중]
         │
/feature complete
    │
    ├──▶ quality-gate ──▶ lint/test/coverage 검증
    ├──▶ phase-tracker ──▶ Task 완료 표시
    ├──▶ commit-helper ──▶ Conventional Commits 메시지
    ├──▶ pr-creator ──▶ GitHub PR 생성
    └──▶ agile-sync ──▶ CHANGELOG + PROGRESS 동기화
```
Evidence: `commands/feature.md:30-53`, `commands/feature.md:126-151`

### 3. Hook 이벤트 흐름

```
Tool 사용 요청
    │
    ▼ [PreToolUse]
pre-tool-use-safety.sh ──▶ 위험 명령 차단 (rm -rf /, force push 등)
    │                       민감 파일 경고 (.env, credentials)
    ▼ [Tool 실행]
    │
    ▼ [PostToolUse]
    ├──▶ phase-progress.sh ──▶ TASKS.md 변경 감지 → 진행률 계산 → PROGRESS.md 업데이트
    ├──▶ auto-doc-sync.sh ──▶ git commit 감지 → CHANGELOG 자동 갱신 + README 통계 업데이트
    └──▶ post-tool-use-tracker.sh ──▶ session.log + changes.log + metrics.jsonl 기록
```
Evidence: `settings.json:3-47`, `hooks/pre-tool-use-safety.sh:26-45`, `hooks/phase-progress.sh:52-68`

### 4. 토큰 최적화 흐름 (Incremental Context Loading)

```
Turn 1 (~1.1K tokens)
├── CLAUDE.lean.md (~300)    ──▶ 프로젝트 컨텍스트 스냅샷
├── MANIFEST.md (~500)       ──▶ 25-agent 라우팅 인덱스
└── CONTEXT.md (~300)        ──▶ 아키텍처 + 현재 상태

Turn 2 (+2-5K tokens)       ──▶ Intent 감지 후 확장
├── Matched Agent Header     ──▶ 2-Tier Header (~50 lines)만 로드
├── TASKS.md row             ──▶ 단일 Task 행만 추출
└── Source files             ──▶ 관련 코드

Turn 3+ (on-demand)          ──▶ 참조 시에만 추가 로드
└── SPEC.md, PRD.md 등       ──▶ 필요 시 Detail 파일 로드
```
Evidence: `skills/context-optimizer/SKILL.md:56-62`, `README.md:118-133`

## Design Decisions

### Decision 1: Declarative Agent Framework (코드 없는 아키텍처)

**Context**: Claude Code 위에서 동작하는 개발 자동화 프레임워크를 구축해야 했다. 전통적 접근은 TypeScript/Python 코드로 에이전트 로직을 구현하는 것이지만, Claude Code 플랫폼은 `.claude/` 디렉터리의 Markdown/JSON/Shell 파일만으로 에이전트 행동을 정의할 수 있다.

**Decision**: 런타임 소스 코드를 작성하지 않고, Markdown (에이전트 프롬프트 + YAML frontmatter), JSON (설정), Shell Script (이벤트 훅)만으로 전체 프레임워크를 구성한다.

**Rationale**:
- Claude Code 런타임이 이미 Markdown 파일을 에이전트 프롬프트로 해석하므로 별도 런타임 불필요
- `.claude/` 디렉터리를 통째로 복사하면 어떤 프로젝트에나 즉시 적용 가능 (`/init --full`, `/init --sync`)
- 빌드 스텝, 의존성 설치, 컴파일 없이 동작 -- zero-dependency
- Markdown은 비개발자도 읽고 수정 가능

**Alternatives**:
1. TypeScript SDK 기반 에이전트 구현 -- 빌드/배포 복잡도 증가, 타겟 프로젝트 의존성 오염
2. Python 기반 CLI 도구 -- 런타임 환경 의존, venv 관리 필요
3. YAML DSL 정의 -- 표현력 부족, 프롬프트 작성에 부적합

**Evidence**:
- `CLAUDE.md:29-30` -- "Stack: Markdown + Shell + JSON"
- `settings.json:176-215` -- `sync.core_components`로 `.claude/` 하위 컴포넌트를 선언적 관리
- `skills/init/SKILL.md:17-18` -- `--full` 모드에서 `.claude/` 전체 복사 + Discovery + Docs 생성

### Decision 2: MANIFEST 기반 Agent 라우팅 (97% 토큰 절약)

**Context**: 25개 에이전트가 전부 로드되면 세션 초기화에 ~38,000 토큰이 소비된다. Claude Code의 컨텍스트 윈도우는 유한하며, 대부분의 턴에서 1-2개 에이전트만 필요하다.

**Decision**: `agents/MANIFEST.md`에 25개 에이전트의 keyword(KO+EN) + 한 줄 목적을 집약한 라우팅 테이블(~500 tokens)을 만들고, 사용자 입력과 keyword 매칭으로 해당 에이전트 파일 1개만 lazy-load한다.

**Rationale**:
- 세션 초기화: ~38,000 → ~1,100 토큰 (97% 절약)
- 한국어 + 영어 이중 키워드로 다국어 사용자 지원
- 매칭 실패 시에도 MANIFEST 자체가 에이전트 목록 역할
- 2-Tier Document Split과 결합: Agent Header(~50 lines)만 우선 로드, Detail은 on-demand

**Alternatives**:
1. 모든 에이전트 전량 로드 -- 단순하지만 토큰 낭비 심각
2. 사용자가 에이전트명 직접 지정 -- UX 저하, 에이전트 이름 암기 필요
3. 임베딩 기반 시맨틱 라우팅 -- 외부 서비스 의존, 오프라인 불가

**Evidence**:
- `agents/MANIFEST.md:1-32` -- 25-row 라우팅 테이블 (Keywords KO/EN + Purpose)
- `README.md:29-37` -- Before/After 비교 (38K → 1.1K tokens)
- `skills/context-optimizer/SKILL.md:149-158` -- MANIFEST 패턴 상세 설명

### Decision 3: Event-Driven Hook System (Graceful Degradation)

**Context**: 개발 과정의 반복 작업(진행률 업데이트, 문서 동기화, 변경 추적)을 자동화해야 하지만, 자동화 실패가 핵심 개발 흐름을 차단해서는 안 된다.

**Decision**: Claude Code의 PreToolUse/PostToolUse/Notification 이벤트에 Shell 스크립트를 바인딩하되, 안전 검사(pre-tool-use-safety.sh)만 Critical으로 분류하고 나머지는 Non-Critical로 처리. 실패 시 error-recovery.sh가 graceful degradation을 보장한다.

**Rationale**:
- Critical hook(`pre-tool-use-safety.sh`) 실패 → 실행 차단 (return 1), 보안 보장
- Non-critical hook 실패 → 로그 기록 후 계속 진행 (return 0), 개발 흐름 보존
- 각 hook은 독립적으로 동작하며, 하나의 실패가 다른 hook에 전파되지 않음
- 로그 자동 rotation (1MB 초과 시, 5개 파일 보관)

**Alternatives**:
1. 모든 hook을 Critical로 처리 -- 비필수 작업 실패 시 개발 중단
2. Hook 없이 수동 실행 -- 반복 작업 누락 가능
3. 데이터베이스 기반 이벤트 시스템 -- 과도한 인프라, zero-dependency 철학 위반

**Evidence**:
- `hooks/error-recovery.sh:96-145` -- hook별 Critical/Non-Critical 분류 및 recovery 로직
- `settings.json:246-275` -- `recovery` 설정: `critical_hooks` vs `non_critical_hooks`
- `hooks/phase-progress.sh:9-11` -- `set +e` + `trap` 으로 graceful error handling

## Code Metrics

| Metric | Value | Notes |
|--------|-------|-------|
| Total Files | 134 | `.git/` 제외 |
| Total LoC | ~20,568 | Markdown: 18,660 / Shell: 1,031 / JSON: 372 |
| Markdown Files | 113 | 전체 파일의 84.3% |
| Shell Scripts | 7 (6 hooks + 1 visualizer) | 평균 172 LoC/hook |
| JSON Files | 7 | settings.json(315 LoC), PROJECTS.json, plugin.json x4 등 |
| Agents | 25 + MANIFEST + 3 Detail | 평균 130 LoC/agent (Header 기준) |
| Skills | 27 (21 directory + 6 file-based) | 평균 158 LoC/skill |
| Commands | 6 + 6 sub-templates | 평균 163 LoC/command |
| Hooks | 6 Shell scripts | 평균 172 LoC/hook |
| Total Commits | 38 | 2026-01-06 ~ 2026-02-02 (28일간) |
| Contributors | 1 (+ GitHub Actions bot) | `tygwan` + `github-actions[bot]` |
| CI Workflows | 1 | 주간 프로젝트 디스커버리 (`update-projects.yml`) |
| Version | 5.1.0 | ultra-cc-init (base: cc-initializer 4.5) |
| Token Optimization | 97% | 세션 초기화 38K → 1.1K tokens |
| 2-Tier Split | 8 files | 평균 89% header 토큰 절약 |
| Structured Conversion | 9 files | 평균 53% prose-to-table 절약 |

## Key Files

| File | Role | Notable |
|------|------|---------|
| `CLAUDE.md` | 프로젝트 개요 + 컴포넌트 맵 + Quick Reference | 216 LoC, 에이전트/스킬/커맨드 전체 색인 포함 (`CLAUDE.md:1-216`) |
| `.claude/settings.json` | 17-section 통합 설정 허브 | 315 LoC, hooks/phase/sprint/quality-gate/sync/recovery 등 전체 동작 제어 (`settings.json:1-315`) |
| `.claude/agents/MANIFEST.md` | 25-agent keyword 라우팅 테이블 | 31 LoC, KO+EN 이중 키워드, 97% 토큰 절약의 핵심 (`MANIFEST.md:1-32`) |
| `.claude/skills/init/SKILL.md` | 프로젝트 초기화 스킬 (6 modes) | 46 LoC Header + Detail, `--full/--sync/--update/--discover/--generate/--quick` (`init/SKILL.md:1-47`) |
| `.claude/hooks/pre-tool-use-safety.sh` | 위험 명령 차단 (PreToolUse) | 114 LoC, 14개 위험 패턴 + 9개 보호 파일 패턴 (`pre-tool-use-safety.sh:26-58`) |
| `.claude/hooks/post-tool-use-tracker.sh` | JSONL 메트릭 수집 (PostToolUse) | 197 LoC, 8개 카테고리 분류, 10MB 자동 rotation (`post-tool-use-tracker.sh:76-98`) |
| `.claude/hooks/error-recovery.sh` | 장애 복구 및 자동 수정 | 295 LoC, hook별 Critical/Non-Critical 분류, 로그 rotation, 시스템 헬스 체크 (`error-recovery.sh:96-145`) |
| `.claude/skills/context-optimizer/SKILL.md` | 4-tier 토큰 예산 + Incremental Loading | 171 LoC, Context Scoring/Boundary/Checkpoint 프로토콜 정의 (`context-optimizer/SKILL.md:1-171`) |
| `.claude/commands/feature.md` | 통합 기능 개발 워크플로우 | 198 LoC, 8개 Agent/Skill 오케스트레이션 체인 (`feature.md:30-53`) |
| `.claude/docs/ARCHITECTURE.md` | 전체 시스템 아키텍처 문서 | 561 LoC, 4개 워크플로우 체인 다이어그램, 컴포넌트 상세 (`ARCHITECTURE.md:1-561`) |
| `.claude/templates/CLAUDE.lean.md` | 토큰 최적화 CLAUDE.md 템플릿 | 28 LoC, 4개 변수 + 8개 변수 슬롯, 1,700 → 300 tokens/turn (`CLAUDE.lean.md:1-28`) |
| `.github/workflows/update-projects.yml` | 프로젝트 자동 디스커버리 CI | 227 LoC, GraphQL GitHub API + Python3 파싱 + README 자동 갱신 (`update-projects.yml:1-227`) |
