# cc-initializer — Pantheon Export

> Exported from open-pantheon | 2026-02-22T21:30:00+09:00

---

## Architecture

### Overview

Claude Code 전용 통합 개발 워크플로우 프레임워크 -- Agents, Skills, Hooks, Commands를 유기적으로 연결하여 AI Native 개발 환경을 자동화하는 "메타 프로젝트" (런타임 소스 코드 없이 Markdown+Shell+JSON 구성만으로 Claude Code의 행동을 정의).

### Tech Stack

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

### Architecture

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

### Module Structure

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

### Data Flow

#### 1. 프로젝트 초기화 흐름

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

#### 2. 개발 실행 흐름

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

#### 3. Hook 이벤트 흐름

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

#### 4. 토큰 최적화 흐름 (Incremental Context Loading)

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

### Design Decisions

#### Decision 1: Declarative Agent Framework (코드 없는 아키텍처)

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

#### Decision 2: MANIFEST 기반 Agent 라우팅 (97% 토큰 절약)

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

#### Decision 3: Event-Driven Hook System (Graceful Degradation)

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

### Code Metrics

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

### Key Files

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

---

## Narrative

### One-liner

Claude Code를 위한 최초의 통합 개발 프레임워크 -- 25개 AI agent, 27개 skill, 6개 hook을 유기적으로 연결하여 프로젝트 초기화부터 릴리스까지 전 개발 라이프사이클을 자동화합니다.

### Problem & Solution

#### Problem

Claude Code는 강력한 AI 코딩 도구이지만, 매 프로젝트마다 동일한 설정을 반복해야 합니다. `.claude/` 디렉토리 구조, agent 정의, hook 설정, skill 파일, 문서 템플릿 등을 처음부터 수동으로 구성해야 하며, 프로젝트 간 일관성이 없고 개발 워크플로우의 자동화가 부재합니다. Phase 관리, Sprint 추적, Quality Gate, 문서 동기화 같은 개발 라이프사이클 요소를 Claude Code 환경에서 체계적으로 운영할 방법이 없었습니다.

#### Solution

cc-initializer는 Claude Code의 `.claude/` 생태계를 완전한 개발 프레임워크로 확장합니다. `/init --full` 한 번으로 25개 전문화된 agent, 27개 skill, 6개 workflow command, 6개 자동화 hook이 포함된 완전한 개발 환경을 구축합니다. Discovery-first 접근으로 프로젝트를 분석한 뒤 PRD, TECH-SPEC, PROGRESS, Phase 구조까지 자동 생성합니다. 이후 `/feature`, `/bugfix`, `/release` 커맨드로 Git-Phase-Sprint-Quality Gate가 통합된 워크플로우를 실행합니다.

#### Why This Approach

Claude Code의 native 확장 메커니즘(agents, skills, hooks, commands)만을 활용하여 외부 런타임이나 의존성 없이 순수 Markdown + Shell + JSON으로 구현합니다. 이 접근법은 이식성(모든 Claude Code 프로젝트에 `/init --sync`로 적용 가능), 투명성(모든 로직이 사람이 읽을 수 있는 형태), 점진적 확장성(필요한 컴포넌트만 선택 사용)을 동시에 달성합니다. 후속 프로젝트인 ultra-cc-init에서는 토큰 최적화를 추가하여 세션 초기화 토큰을 97% 절감(38K -> 1.1K)했으며, open-pantheon으로 진화하면서 포트폴리오 생성 파이프라인과 Multi-CLI 오케스트레이션까지 통합했습니다.

### Milestones

| Date | Milestone | Impact | Evidence |
|------|-----------|--------|----------|
| 2026-01 | v1.0 Initial Release -- Claude Code Project Initializer 최초 공개 | Claude Code를 위한 config 프레임워크의 개념 증명. 기본 agent/hook/skill 구조 확립 | commit `c2a5fbf` (2026-01-06) |
| 2026-01 | v2.0-2.1 Agile + Phase-based Development System | Sprint 관리, Phase 기반 개발, doc-splitter 통합으로 단순 초기화 도구에서 개발 라이프사이클 프레임워크로 진화 | commit `8518dd1` (v2.0), commit `bb2c918` (v2.1), commit `4a23532` |
| 2026-01 | v3.0 Discovery First Approach | 대화 기반 프로젝트 요구사항 파악(DISCOVERY.md)을 도입하여 "이해 없이 문서 생성 금지" 원칙 확립. 6개 Medium priority 개선사항(M1-M6) 완료 | commit `1323adc` (2026-01-09) |
| 2026-01 | v4.0-4.5 Framework Setup, Sync, GitHub, Analytics | Framework Setup(`/init --sync`, `--update`), GitHub CLI 통합(`/gh`, github-manager), Analytics CLI 시각화, 커뮤니티 프로젝트 자동 발견(GitHub Topics), readme-helper/agent-writer agent 추가 | commits `ea8ba66` (v4.0), `346a96a` (v4.1), `ebbab27` (v4.2), `ed0146e` (v4.3), tag `v4.4.0`, `9d74566` (v4.5) |
| 2026-01 | ultra-cc-init 토큰 최적화 -- 5 Pillars Architecture | Agent MANIFEST, Lean CLAUDE.md, Incremental Loading, 2-Tier Document, Structured Data 변환으로 세션 초기화 토큰 97% 절감(38K -> 1.1K), 5,400+ 라인 최적화 | commits `dcd5eff`, `9748c5b`, `3a1a5d3` (2026-01-31) |
| 2026-02 | Dual-AI Engineering -- Codex CLI 통합 | Claude + Codex 듀얼 AI 루프 도입. Claude가 설계/구현, Codex가 검증/리뷰하는 교차 검증 패턴으로 코드 품질 극대화 | commit `54c1998` (2026-02-02) |

### Impact Metrics

| Metric | Value | Source |
|--------|-------|--------|
| 전체 커밋 수 | 39 commits (28일간) | `git log --oneline \| wc -l` |
| 전체 파일 수 | 134 files | `find . -type f \| wc -l` (excluding .git) |
| 전체 코드 라인 수 | 21,162 lines | `wc -l` (all files) |
| Markdown 파일 수 | 113 files | `find . -name '*.md' \| wc -l` |
| Shell Hook 수 | 7 scripts | `find . -name '*.sh' \| wc -l` |
| Agent 수 | 25 specialized agents | `.claude/agents/MANIFEST.md` |
| Skill 수 | 27 skills (18 directory + 7 file + 2 Codex) | `CLAUDE.md`, `.claude/skills/` |
| Workflow Command 수 | 6 integrated commands | `.claude/commands/` |
| Hook 수 | 6 automation hooks | `.claude/hooks/` |
| 버전 릴리스 수 | v1.0 -> v5.1.0 (12 versions) | git tags + README changelog |
| 토큰 절감율 (ultra-cc-init) | 97% (38K -> 1.1K tokens) | `README.md:32` |
| CLAUDE.md per-turn 절감 | 82% (1,700 -> 300 tokens/turn) | `README.md:33` |
| 2-Tier Document 절감 | 81-95% header reduction (8 files) | `README.md:162-171` |
| Structured Data 절감 | 39-68% (9 files, ~5,400 lines saved) | `README.md:179-188` |
| 컨트리뷰터 | 2 (tygwan, Yoon Taegwan) + 1 bot | `git shortlog -sn` |
| 가장 활발한 개발일 | 2026-01-09, 2026-01-31 (각 6 commits) | `git log --date=short` |
| 개발 기간 | 28일 (2026-01-06 ~ 2026-02-02) | first/last commit dates |
| 채택 프로젝트 | DXTnavis (tygwan/dxtnavis) | `PROJECTS.json` |
| GitHub Actions 자동화 | Community project discovery workflow | `.github/workflows/update-projects.yml` |

### Hero Content

#### Headline

**"AI Native 개발의 운영체제"** -- Claude Code의 `.claude/` 디렉토리를 25개 AI agent가 협업하는 완전한 개발 프레임워크로 변환

#### Description

cc-initializer는 AI 코딩 도구의 잠재력을 극대화하는 개발 프레임워크입니다. 단순한 설정 초기화 도구로 시작하여, 28일 만에 25개 전문 agent, 27개 자동화 skill, Phase/Sprint 통합 관리, Quality Gate, 듀얼 AI 교차 검증까지 갖춘 완전한 개발 라이프사이클 프레임워크로 진화했습니다. 외부 의존성 없이 Markdown, Shell, JSON만으로 구현되어 어떤 프로젝트에든 `/init --sync` 한 줄로 적용할 수 있습니다. 후속작 ultra-cc-init에서 토큰 97% 절감을 달성하고, open-pantheon으로 확장하며 AI Native 개발 생태계의 3부작을 완성해 나가고 있습니다.

#### Key Achievements

1. **Discovery-First 패러다임**: 코드 생성 전 대화 기반 요구사항 파악을 강제하여 AI의 맹목적 코드 생성 문제를 해결 (`v3.0`, commit `1323adc`)
2. **Zero-Dependency Framework**: 런타임 의존성 없이 Markdown + Shell + JSON만으로 25 agents + 27 skills + 6 hooks 생태계 구현 (134 files, 21K+ lines)
3. **97% Token Optimization**: ultra-cc-init 진화에서 MANIFEST routing, 2-Tier Document, Incremental Loading으로 세션 초기화 토큰을 38K에서 1.1K로 절감 (commits `dcd5eff`, `9748c5b`, `3a1a5d3`)
4. **Dual-AI Engineering Loop**: Claude(설계/구현) + Codex(검증/리뷰) 교차 검증 패턴으로 AI 코딩의 품질 보증 문제를 구조적으로 해결 (commit `54c1998`)

### Story Arc

cc-initializer의 여정은 AI Native 개발이라는 새로운 패러다임의 탄생 과정입니다.

**Act 1: 탄생 (v1.0, 2026-01-06)**
Claude Code의 반복적인 설정 문제를 해결하려는 단순한 초기화 도구로 시작했습니다. `.claude/` 디렉토리에 agent, hook, skill을 미리 구성해두고 새 프로젝트에 복사하는 것이 전부였습니다. 그러나 이 단순한 시작점에는 더 큰 비전의 씨앗이 있었습니다 -- AI 코딩 도구에도 "프레임워크"가 필요하다는 통찰입니다.

**Act 2: 확장 (v2.0-v3.0, 2026-01-07 ~ 2026-01-09)**
단 3일 만에 프레임워크의 핵심 아키텍처가 완성됩니다. Agile 자동화(v2.0), Phase 기반 개발 시스템(v2.1), doc-splitter 통합, 그리고 "Discovery First" 접근법(v3.0)이 연이어 도입됩니다. 특히 v3.0의 Discovery First는 프로젝트의 철학적 전환점입니다 -- "AI가 코드를 생성하기 전에, 먼저 프로젝트를 이해해야 한다"는 원칙의 확립입니다. 이 시기에 6개의 Medium priority 개선사항(M1-M6)을 동시에 완료하며 폭발적인 개발 속도를 보여줍니다.

**Act 3: 성숙 (v4.0-v4.5, 2026-01-11 ~ 2026-01-24)**
프레임워크의 적용 범위가 단일 프로젝트에서 생태계로 확장됩니다. Framework Setup과 `--sync` 옵션(v4.0)으로 기존 프로젝트에 적용 가능해졌고, GitHub CLI 통합(v4.3), Analytics 시각화(v4.2), 커뮤니티 프로젝트 자동 발견(v4.4) 등이 추가됩니다. DXTnavis 프로젝트가 실제 채택 사례로 등장하며 프레임워크의 실용성이 검증됩니다.

**Act 4: 최적화와 진화 (v5.0-5.1 + Dual-AI, 2026-01-31 ~ 2026-02-02)**
cc-initializer의 개념이 ultra-cc-init으로 재탄생합니다. Five Pillars 아키텍처(MANIFEST, Lean CLAUDE.md, Incremental Loading, 2-Tier Documents, Structured Data)를 통해 동일한 25개 agent를 유지하면서 토큰 사용량을 97% 절감합니다. Codex 듀얼 AI 통합은 단일 AI의 한계를 돌파하는 시도입니다. 이 모든 혁신은 최종적으로 open-pantheon이라는 통합 AI agent 생태계로 수렴합니다.

**에필로그: 3부작의 의미**
cc-initializer(초기화) -> ultra-cc-init(최적화) -> open-pantheon(통합)의 진화는 AI Native 개발 도구가 어떻게 성장하는지를 보여주는 하나의 사례 연구입니다. 28일간의 39개 커밋이 만들어낸 것은 단순한 도구가 아니라, "AI와 개발자가 함께 일하는 방식"에 대한 하나의 답안입니다.

### Technical Challenges

#### Challenge 1: Claude Code 세션의 토큰 폭발 문제

**Problem**: cc-initializer가 25개 agent, 27개 skill, 6개 command를 보유하면서, Claude Code 세션 시작 시 모든 `.claude/` 파일이 로드되어 초기화 토큰이 ~38,000에 달했습니다. 매 턴마다 CLAUDE.md만으로도 ~1,700 토큰이 소비되어 실질적인 작업 컨텍스트가 압박받았습니다.

**Impact**: 대규모 프레임워크의 실용성 자체가 위협받았습니다. 토큰 예산의 상당 부분이 프레임워크 메타데이터에 소비되어, 실제 코드 분석과 생성에 사용할 수 있는 컨텍스트 윈도우가 줄어들었습니다. "더 많은 기능을 추가할수록 성능이 저하되는" 역설적 상황이었습니다.

**Solution**: Five Pillars 아키텍처로 근본적으로 재설계했습니다. (1) Agent MANIFEST -- 25개 agent를 500 토큰 라우팅 테이블로 압축, 키워드 매칭으로 필요한 agent만 lazy-load. (2) Lean CLAUDE.md -- 8개 변수 템플릿으로 per-turn 토큰을 300으로 축소. (3) Incremental Loading -- 4-tier 토큰 예산(quick 2K / standard 10K / deep 30K / full 50K)으로 필요한 만큼만 로드. (4) 2-Tier Document -- 모든 대형 파일을 Header(~50 lines) + Detail(on-demand)로 분리하여 평균 90% 절감. (5) Structured Data -- 모든 prose를 table로 변환하여 73% 절감.

**Evidence**: commit `dcd5eff` (MANIFEST + Lean CLAUDE.md + Incremental), commit `9748c5b` (2-Tier Document), commit `3a1a5d3` (Structured Data), `README.md:29-37` (Before & After 비교표)

#### Challenge 2: 단일 AI의 자기 검증 한계

**Problem**: Claude Code가 코드를 작성한 뒤 스스로 리뷰하는 구조는 본질적인 한계가 있습니다. 동일한 모델이 생성한 코드를 동일한 모델이 검증하면 같은 blind spot을 공유하게 되어, 특정 유형의 버그나 아키텍처 결함을 체계적으로 놓칠 수 있습니다.

**Impact**: AI 생성 코드의 품질에 대한 신뢰 문제가 발생합니다. 특히 보안 취약점, 엣지 케이스, 아키텍처 수준의 결함은 단일 AI 리뷰로는 발견하기 어렵습니다. context-optimizer에서 Codex가 실제로 6개의 내부 불일치를 발견한 사례(commit `adb3d11`)가 이 문제의 실재를 증명합니다.

**Solution**: Claude + Codex 듀얼 AI 엔지니어링 루프를 도입했습니다. Plan(Claude) -> Validate(Codex) -> Feedback -> Implement(Claude) -> Review(Codex) -> Fix(Claude) -> Re-validate(Codex)의 6단계 교차 검증 프로세스를 구축했습니다. 각 AI가 서로 다른 모델 아키텍처(Claude vs GPT-5-codex)를 사용하므로 blind spot이 중첩되지 않습니다. `--sandbox read-only`로 Codex의 검증을 안전하게 수행하고, `resume --last`로 세션 컨텍스트를 유지합니다.

**Evidence**: commit `54c1998` (Codex dual-AI skills), `.claude/skills/codex-claude-loop/SKILL.md` (6-phase loop 설계), commit `adb3d11` (Codex가 6개 불일치 발견한 실제 사례)

#### Challenge 3: 프레임워크 동기화와 격리의 딜레마

**Problem**: cc-initializer는 "프레임워크"이면서 동시에 "프로젝트별 설정"이어야 합니다. 프레임워크를 업데이트하면 기존 프로젝트의 커스터마이징이 덮어씌워질 수 있고, 프로젝트별 설정을 우선하면 프레임워크 개선이 전파되지 않습니다. 또한 cc-initializer 자체의 git repository와 적용 대상 프로젝트의 git repository가 분리되어야 하는 이중 관리 문제가 있었습니다.

**Impact**: 초기에는 cc-initializer를 적용한 프로젝트에서 프레임워크를 업데이트할 방법이 없었고, 여러 프로젝트에 걸쳐 일관된 설정을 유지하는 것이 불가능했습니다.

**Solution**: 3단계 동기화 전략을 도입했습니다. (1) `/init --sync` -- 기존 프로젝트의 `.claude/` 분석 후 누락 컴포넌트만 선택적 병합(merge strategy: `add_missing` for agents/skills, `deep_merge` for settings). (2) `/init --update` -- cc-initializer 소스 자동 `git pull` 후 sync 연계. (3) `preserve_project_customizations: true` 설정으로 프로젝트별 수정사항 보존. `backup_before_sync: true`로 동기화 전 백업을 보장하고, `auto_run_validation`으로 동기화 후 무결성을 검증합니다.

**Evidence**: commit `ea8ba66` (v4.0 Framework Setup + --sync), commit `346a96a` (v4.1 --update), commit `291d90f` (project repo separation), `.claude/settings.json:177-216` (sync 설정 전체)

---

## Stack Profile

### Detected Stack

| Category | Detected | Confidence | Evidence |
|----------|----------|:----------:|----------|
| **Primary Language** | Markdown (.md) | high | 113 `.md` files across agents, skills, commands, docs (`CLAUDE.md:1-216`, `README.md:1-358`) |
| **Secondary Language** | Bash/Shell (.sh) | high | 7 `.sh` files — hooks + scripts (`pre-tool-use-safety.sh:1-114`, `auto-doc-sync.sh:1-30`, `analytics-visualizer.sh:1-30`) |
| **Data Format** | JSON | high | 7 `.json` files — `settings.json:1-315` (17-section config hub), `PROJECTS.json:1-12`, 5 `plugin.json` files |
| **CI/CD** | GitHub Actions | high | `.github/workflows/update-projects.yml:1-227` — weekly cron + manual trigger, GraphQL API, Python scripting |
| **Version Control** | Git + GitHub | high | `origin: github.com/tygwan/cc-initializer`, `ultra: github.com/tygwan/ultra-cc-init` — 2 remotes, 3 tags (v4.2.0–v4.4.0) |
| **AI Platform** | Claude Code (primary) | high | `CLAUDE.md:1-3` — "Claude Code Configuration Framework", agents/skills/hooks/commands 전체 구조 |
| **AI Platform** | OpenAI Codex CLI (secondary) | high | `.claude/skills/codex/SKILL.md:1-55` — `codex exec` 명령, `gpt-5`/`gpt-5-codex` 모델 참조 |
| **AI Platform** | Dual AI Loop (Claude + Codex) | high | `.claude/skills/codex-claude-loop/SKILL.md:1-85` — Plan(Claude) + Validate(Codex) 순환 구조 |
| **Configuration** | JSON (settings.json) | high | `.claude/settings.json:1-315` — hooks, agile, phase, sprint, quality-gate, feedback, analytics 등 17개 섹션 |
| **Documentation System** | 2-Tier Architecture | high | `README.md:137-171` — Header(~50 lines) + Detail(on-demand) 패턴, `agents/details/` 디렉토리 |
| **Agent Routing** | MANIFEST.md Keyword Index | high | `.claude/agents/MANIFEST.md:1-32` — 25개 agent 키워드 라우팅 테이블 |
| **Template Engine** | CLAUDE.lean.md | high | `.claude/templates/CLAUDE.lean.md:1-28` — 8-variable Handlebars-style 템플릿 (`{{PROJECT_NAME}}` 등) |
| **Analytics** | JSONL metrics | medium | `.claude/settings.json:277-288` — `metrics.jsonl`, 30일 보존, hourly/daily 집계 |
| **Scripting** | Python 3 (embedded) | medium | `.github/workflows/update-projects.yml:63-136` — CI 내 inline Python으로 JSON 파싱, Markdown 생성 |
| **Line Normalization** | .gitattributes LF | high | `.gitattributes:1-14` — `*.sh`, `*.md`, `*.json` 모두 LF 강제 |
| **Package Manager** | None | high | 루트에 `package.json`, `pyproject.toml`, `Cargo.toml` 등 없음. `.gitignore:22-23` — node_modules, __pycache__ 예비용 |
| **Build System** | None (zero-build) | high | 컴파일/번들링 설정 파일 없음. 순수 텍스트 기반 프레임워크 |
| **Frontend** | None | high | `.html`, `.css`, `.svelte`, `.astro`, `.jsx`, `.tsx` 파일 없음 |

### Domain Classification

| Aspect | Value |
|--------|-------|
| **Primary Domain** | devtool |
| **Secondary Domain** | automation |
| **Rationale** | cc-initializer는 Claude Code를 위한 개발 워크플로우 프레임워크로, 25개 agent + 27개 skill + 6개 command + 6개 hook으로 구성된 CLI 기반 개발 도구입니다. 코드를 직접 실행하는 런타임이 아닌, AI 에이전트 오케스트레이션을 통한 개발 프로세스 자동화에 초점을 맞추고 있어 devtool(Primary) + automation(Secondary)으로 분류합니다. Phase/Sprint 관리, Quality Gate, Dual AI Loop(Claude+Codex) 등 개발 라이프사이클 전반을 커버합니다. |

### Template Recommendation

| Aspect | Value |
|--------|-------|
| **Recommended** | `astro-landing` |
| **Alternative** | `html-terminal` (planned) |
| **Rationale** | cc-initializer는 런타임 코드나 인터랙티브 대시보드가 없는 순수 텍스트 기반 프레임워크입니다. 제품 소개(25 agents, 27 skills, 97% 토큰 절감 등)와 아키텍처 시각화가 핵심이므로, 0KB JS 기본값과 정적 콘텐츠에 최적화된 `astro-landing`이 가장 적합합니다. 워크플로우 다이어그램(Init flow, Dual AI Loop, 2-Tier Architecture)은 `figure-designer`의 Mermaid/SVG로 충분히 표현 가능하며, SvelteKit의 인터랙티브 기능은 필요하지 않습니다. 추후 `html-terminal`이 구현되면 CLI 도구 특성에 더 부합할 수 있으나, 현재 사용 가능한 옵션 중에서는 `astro-landing`이 최선입니다. |

### Existing Site

| Aspect | Detail |
|--------|--------|
| **Has Existing Site** | No |
| **GitHub Pages** | 미설정 |
| **URL** | N/A |
| **Notes** | GitHub repo README가 유일한 공개 문서. `README.md`에 풍부한 시각적 표현(badges, HTML tables, ASCII diagrams)이 이미 존재하여 포트폴리오 사이트의 콘텐츠 소스로 활용 가능 |

### Build & Deploy Profile

| Aspect | Detail |
|--------|--------|
| **Build Tool** | None (zero-build 프레임워크 — 텍스트 파일만으로 구성) |
| **Package Manager** | None (의존성 없음) |
| **Runtime** | Bash + Claude Code CLI + Codex CLI |
| **Test Framework** | None (Quality Gate가 프로세스 수준 검증 담당: `settings.json:88-111`) |
| **Deployment Target** | Git clone / `cp -r .claude/` (프레임워크 파일 복사 방식) |
| **CI/CD** | GitHub Actions — `update-projects.yml` (주간 community project 자동 수집) |
| **Version Strategy** | Semantic Versioning — v4.2.0 ~ v4.4.0 (tags), README에 v5.1.0 기재 |
| **Repo Structure** | Mono-repo with dual remote: `origin`(cc-initializer) + `ultra`(ultra-cc-init) |
| **Contributors** | 1 primary (tygwan/Yoon Taegwan) + 1 bot (github-actions) |
| **Total Files** | ~127 files (113 `.md` + 7 `.sh` + 7 `.json`) |
| **Lines of Code** | ~8,400 lines (Markdown + Shell + JSON) |
| **License** | MIT |

---

## Summary

### Key Insights

- **Zero-Dependency Declarative Agent Framework**: 런타임 소스 코드 없이 Markdown(113파일) + Shell(7파일) + JSON(7파일)만으로 25 agents, 27 skills, 6 commands, 6 hooks 생태계 구현. `.claude/` 디렉토리를 통째로 복사하면 어떤 프로젝트에나 적용 가능
- **97% 토큰 최적화 (Five Pillars)**: MANIFEST 라우팅(38K→1.1K 세션 초기화), Lean CLAUDE.md(1,700→300/turn), 2-Tier Document(81-95% 절감), Incremental Loading(4-tier 예산), Structured Data(39-68% 절감). "기능을 추가할수록 성능이 저하되는" 역설을 해결
- **Discovery-First 패러다임**: "AI가 코드 생성 전에 먼저 프로젝트를 이해해야 한다" — 대화 기반 요구사항 파악(DISCOVERY.md)을 강제하여 맹목적 코드 생성 방지 (v3.0)
- **Dual-AI Engineering Loop**: Claude(설계/구현) + Codex(검증/리뷰) 교차 검증. 실제 사례에서 Codex가 6개 내부 불일치 발견 (commit `adb3d11`)
- **Event-Driven Hook System**: PreToolUse/PostToolUse/Notification 이벤트에 Critical(safety)과 Non-critical(progress/sync) 분류. Graceful degradation으로 비필수 훅 실패 시에도 개발 흐름 보존
- **28일간 v1.0→v5.1 진화**: 39 commits, 134파일, 21K+ 줄. 단순 초기화 도구 → 개발 라이프사이클 프레임워크 → 토큰 최적화 + 듀얼 AI 생태계
- **3부작 기원**: cc-initializer(초기화) → ultra-cc-init(최적화) → open-pantheon(통합)의 AI Native 개발 진화의 첫 장

### Recommended Template

`astro-landing` — 런타임 코드나 인터랙티브 대시보드가 없는 순수 텍스트 기반 프레임워크. 제품 소개(25 agents, 97% 토큰 절감)와 아키텍처 시각화가 핵심이므로 Astro의 0KB JS 기본값이 최적.

**대안**: `html-terminal` *(planned)* — CLI 도구 특성에 더 부합하나 미구현

### Design Direction

- **Palette**: DevTool/CLI 특성 반영. 다크 터미널 배경(#0d1117) + 밝은 코드 텍스트. 핵심 강조에 브랜드 오렌지(#FF6B35, README 배지에서 추출). Agent/Skill/Hook 각각 구분 색상
- **Typography**: Monospace 주체 (JetBrains Mono 또는 Fira Code). 터미널 느낌의 코드 블록 스타일. 헤드라인에 Sans-serif 대비
- **Layout**: CLI 도구 랜딩 스타일. Hero(97% 토큰 절감 Before/After) → Five Pillars 시각화 → Agent/Skill/Hook 카탈로그 → 3부작 진화 타임라인 → 워크플로우 다이어그램(Init/Feature/Hook 흐름) → DXTnavis 채택 사례

### Notable

- **자기 자신이 PoC**: cc-initializer는 자기 자신의 개발에 cc-initializer를 사용. 프레임워크 도구성 검증의 재귀적 특성
- **커뮤니티 자동 발견**: GitHub Topics(`uses-cc-initializer`) + GraphQL API + 주간 크론으로 채택 프로젝트 자동 수집 (PROJECTS.json)
- **Dual Remote 구조**: `origin`(cc-initializer) + `ultra`(ultra-cc-init) — 동일 코드베이스에서 두 프로젝트 관리
- **프레임워크 동기화 딜레마 해결**: `/init --sync`(add_missing 병합) + `--update`(git pull 연계) + `preserve_project_customizations`로 프레임워크 업데이트와 프로젝트 격리를 동시 달성
- **No Tests, No CI for Code**: Quality Gate가 프로세스 수준 검증(lint/coverage 체크 자동화)을 담당. 코드 자체가 없으므로 전통적 테스트 불필요

---

## Experience Blocks

> 3부작 통합 인터뷰 결과. 전체 내용은 `workspace/open-pantheon/analysis/experience-blocks.md` 참조.

### 이 프로젝트의 주요 경험

#### Experience 3: Configuration-as-Code (주도)
런타임 소스 코드 없이 Markdown+Shell+JSON만으로 25 agents 생태계 구현. 이식성(.claude/ 복사)이 결정적 판단 기준. JSON write/read 시 토큰 비용이 유일한 trade-off.

#### Experience 4: 47일 삼부작 진화 (기원)
cc-initializer는 삼부작의 첫 장. 초기화 도구로 시작하여 28일간 38커밋, v1.0→v4.5. 기능 확장 중 토큰 폭발 문제가 ultra-cc-init 분기를 촉발.

#### Experience 5: Discovery First (탄생)
v3.0에서 "AI가 코드 생성 전에 먼저 프로젝트를 이해해야 한다" 원칙 확립. project-discovery agent → DISCOVERY.md 대화 기반 요구사항 파악.

### 전체 Gap Summary (30/30 블록 해소)

| 경험 | 목표 | 현상 | 가설 | 판단기준 | 실행 | 결과 |
|------|:----:|:----:|:----:|:-------:|:----:|:----:|
| 3. Config-as-Code | O | O | O | O | O | O |
| 4. 삼부작 진화 | O | O | O | O | O | O |
| 5. Discovery First | O | O | O | O | O | O |
