# ultra-cc-init Architecture Analysis

## Overview

Claude Code를 위한 토큰 최적화 개발 워크플로우 프레임워크 -- cc-initializer(v4.5)에서 진화하여 세션 초기화 토큰을 97% 절감(~38K -> ~1.1K)하면서 25 agents, 27 skills, 6 commands, 6 hooks의 전체 기능을 유지하는 **Configuration-as-Code** 기반 AI 에이전트 오케스트레이션 시스템.

## Tech Stack

| Category | Technology | Version | Notes |
|----------|-----------|---------|-------|
| Runtime | Claude Code (Anthropic) | - | Primary AI agent runtime; Markdown 기반 설정 파싱 (`CLAUDE.md:1-216`) |
| Language (Hooks) | Bash | 4+ | 6개 hook 스크립트, 1개 analytics visualizer (`pre-tool-use-safety.sh:1`) |
| Language (CI) | Python 3 | 3.x | GitHub Actions 내 PROJECTS.json 파싱 (`update-projects.yml:63-136`) |
| Data Format | JSON | - | settings.json (316 lines), metrics.jsonl, PROJECTS.json (`settings.json:1-316`) |
| Data Format | YAML | - | Agent/Skill frontmatter, GitHub Actions workflow (`update-projects.yml:1-227`) |
| Data Format | Markdown | - | Agents, Skills, Commands, 문서 -- 전체의 88% (19,038/21,607 lines) |
| CI/CD | GitHub Actions | v4 | 주간 프로젝트 디스커버리, README 자동 업데이트 (`update-projects.yml:1-227`) |
| External CLI | OpenAI Codex CLI | gpt-5.2-codex | 코드 분석/검증, Dual-AI 루프 (`codex/SKILL.md:1-63`) |
| External CLI | GitHub CLI (gh) | - | 이슈/PR/CI/CD/릴리스 통합 (`github-manager.md:1-52`) |
| Analytics | JSONL + jq | - | 메트릭 수집/시각화, ASCII 차트 (`analytics-visualizer.sh:1-506`) |

## Architecture

### Style: Event-Driven Plugin Architecture + Configuration-as-Code

ultra-cc-init은 **Plugin-Based Modular Architecture**를 채택합니다. 모든 기능이 독립된 Markdown/Shell 파일로 정의되고, `settings.json`이 중앙 설정 허브로 동작하며, Hook 시스템이 이벤트 기반 자동화를 제공합니다. 코드가 아닌 설정 파일(Markdown + JSON + Shell)로 전체 개발 워크플로우를 정의하는 **Configuration-as-Code** 패턴입니다.

```
                    ┌──────────────────────────────────────────────────┐
                    │              Claude Code Runtime                  │
                    │         (Markdown Parser + Tool Executor)        │
                    └───────────────┬──────────────────────────────────┘
                                    │
                    ┌───────────────▼──────────────────────────────────┐
                    │             settings.json                         │
                    │     (17-Section Central Configuration Hub)        │
                    │  hooks | phase | sprint | quality-gate | sync    │
                    │  feedback | context-optimizer | analytics | ...  │
                    └──┬──────┬──────┬──────┬──────────────────────────┘
                       │      │      │      │
            ┌──────────▼┐ ┌──▼──────┐ ┌──▼──────┐ ┌──▼──────────┐
            │  Agents   │ │ Skills  │ │Commands │ │   Hooks     │
            │  (25+3)   │ │  (27)   │ │  (6)    │ │   (6+1)     │
            │ MANIFEST  │ │ SKILL.md│ │ *.md    │ │  *.sh       │
            │  routing  │ │ + refs/ │ │         │ │  Pre/Post   │
            └───────────┘ └─────────┘ └─────────┘ └─────────────┘
                 │              │           │            │
                 └──────────────┴───────────┴────────────┘
                                    │
                    ┌───────────────▼──────────────────────────────────┐
                    │              docs/ Output Layer                   │
                    │  PROGRESS.md | CONTEXT.md | phases/ | sprints/   │
                    │  PRD.md | TECH-SPEC.md | adr/ | feedback/       │
                    └──────────────────────────────────────────────────┘
```

## Module Structure

| Module | Responsibility | Key Files | LoC |
|--------|---------------|-----------|-----|
| **Agents** | 키워드 매칭 기반 전문 작업 수행 (25 agents). MANIFEST.md가 라우팅 인덱스 역할 | `agents/MANIFEST.md` (32 lines), `agents/*.md` (25 files), `agents/details/*.md` (3 files) | ~3,200 |
| **Skills** | 슬래시 커맨드 기반 워크플로우 자동화. 2-Tier (Header + Detail) 구조 | `skills/*/SKILL.md` (18 dirs), `skills/*.md` (7 files), `skills/*/references/DETAIL.md` | ~8,400 |
| **Commands** | 통합 개발 워크플로우 (feature/bugfix/release/phase 등) | `commands/feature.md`, `commands/bugfix.md`, `commands/release.md` 등 6 files | ~1,200 |
| **Hooks** | 이벤트 기반 자동화 (PreToolUse, PostToolUse, Notification) | `hooks/pre-tool-use-safety.sh`, `hooks/phase-progress.sh`, `hooks/post-tool-use-tracker.sh` 등 6 files | ~1,000 |
| **Templates** | Lean CLAUDE.md 템플릿, Phase 문서 템플릿 | `templates/CLAUDE.lean.md` (28 lines), `templates/phase/*.md` | ~200 |
| **Scripts** | 유틸리티 (analytics CLI 시각화) | `scripts/analytics-visualizer.sh` (506 lines) | ~506 |
| **Docs** | 프레임워크 아키텍처 문서 | `docs/ARCHITECTURE.md`, `docs/DOCUMENT-STRUCTURE.md` 등 6 files | ~1,500 |
| **Config** | 중앙 설정, 프로젝트 등록, CI/CD | `settings.json` (316 lines), `PROJECTS.json`, `.github/workflows/update-projects.yml` | ~560 |
| **Root** | 프로젝트 컨텍스트, 사용자 가이드 | `CLAUDE.md` (216 lines), `README.md` (358 lines) | ~574 |

## Data Flow

### 1. Session Initialization (Incremental Loading Protocol)

```
Turn 1 (~1.1K tokens):
  CLAUDE.lean.md (300 tokens) ──→ 프로젝트 컨텍스트 스냅샷
  agents/MANIFEST.md (500 tokens) ──→ 25 agent 라우팅 인덱스
  docs/CONTEXT.md (300 tokens) ──→ 아키텍처 + 현재 상태

Turn 2 (On-demand +2-5K tokens):
  User Intent ──→ MANIFEST keyword matching ──→ Agent Header (~100 tokens)
  Task-specific files ──→ TASKS.md row + source files (~2K)

Turn 3+ (Expansion Triggers):
  Phase work ──→ +SPEC.md +TASKS.md (+2-3K)
  Architecture ──→ +TECH-SPEC +adjacent SPECs (+5-8K)
  Review ──→ +PRD +CHECKLIST (+3-5K)
```

Evidence: `context-optimizer/SKILL.md:55-63`, `CLAUDE.lean.md:1-28`

### 2. Project Initialization Flow (/init --full)

```
Framework Setup (.claude/ copy) ──→ Project Repo Detection (git remote)
    ──→ project-discovery agent ──→ DISCOVERY.md
    ──→ Document Generation Preview (user confirmation)
    ──→ dev-docs-writer ──→ PRD.md + TECH-SPEC.md + PROGRESS.md + CONTEXT.md
    ──→ [if HIGH complexity] doc-splitter ──→ docs/phases/phase-N/
    ──→ phase-tracker activation
```

Evidence: `init/references/DETAIL.md:12-88`

### 3. Hook Automation Chain (Every Tool Use)

```
[PreToolUse] ──→ pre-tool-use-safety.sh
  Bash: 위험 명령 차단 (rm -rf, force push 등)
  Write/Edit: 민감 파일 경고 (.env, credentials 등)

[Tool Execution]

[PostToolUse] ──→ phase-progress.sh (TASKS.md 변경 → PROGRESS.md 업데이트)
              ──→ auto-doc-sync.sh (git commit → CHANGELOG + README 통계)
              ──→ post-tool-use-tracker.sh (JSONL 메트릭 + session.log)

[Notification] ──→ notification-handler.sh (유형별 색상 출력)
```

Evidence: `settings.json:3-48`, `pre-tool-use-safety.sh:100-113`, `phase-progress.sh:134-141`

### 4. Feature Development Flow

```
/feature start ──→ branch-manager (Git branch)
               ──→ phase-tracker (TASKS.md 연결)
               ──→ /sprint add (Sprint backlog)
               ──→ progress-tracker (PROGRESS.md)
               ──→ context-optimizer (관련 파일 로드)

/feature complete ──→ quality-gate (lint, test, coverage)
                  ──→ phase-tracker (Task 완료)
                  ──→ commit-helper (커밋 메시지)
                  ──→ pr-creator (GitHub PR)
                  ──→ agile-sync (CHANGELOG, PROGRESS)
```

Evidence: `commands/feature.md:30-53`, `commands/feature.md:126-151`

### 5. Analytics Pipeline

```
post-tool-use-tracker.sh
  ──→ session.log (human-readable, last 100 entries)
  ──→ changes.log (file modifications, last 50 entries)
  ──→ metrics.jsonl (structured JSONL, 30-day retention, 10MB rotation)
      ──→ analytics-visualizer.sh (CLI charts: bar, sparkline, percentage)
      ──→ analytics-reporter agent (통계 리포트)
```

Evidence: `post-tool-use-tracker.sh:50-64,67-136`, `analytics-visualizer.sh:470-502`

## Design Decisions

### Decision 1: MANIFEST-Based Agent Routing (Lazy Loading)

**Context**: cc-initializer v4.5는 세션 시작 시 25개 agent 파일 전체를 로드하여 ~38,000 토큰을 소비함. Claude Code의 컨텍스트 윈도우 예산 대부분을 프레임워크 자체가 소비하는 비효율 발생.

**Decision**: 단일 MANIFEST.md 파일(~500 토큰)에 25개 agent의 키워드-라우팅 테이블을 정의하고, 사용자 의도에 매칭되는 agent만 on-demand로 로드하는 lazy-loading 패턴 도입.

**Rationale**: 모든 agent 정보를 한 번에 로드하는 대신 routing index만 로드하면 97% 토큰 절감(38K -> 500). 사용자 의도 감지 후 필요한 agent 1개만 추가 로드(~100-300 tokens). 총 비용 ~800 vs ~38,000.

**Alternatives Considered**:
- **Category-based grouping**: Agent를 카테고리별 파일로 그룹화. 장점은 관련 agent 동시 로드이나 불필요한 agent도 함께 로드되는 낭비 존재.
- **LLM-native routing**: Claude에게 agent 선택을 위임. 추가 토큰과 latency 소비, 일관성 문제.
- **Embedding-based semantic search**: 의미 기반 검색. 인프라 의존성 추가, Markdown-only 프레임워크 철학에 부합하지 않음.

**Evidence**: `agents/MANIFEST.md:1-32` -- 25 agents x 1 row 라우팅 테이블; `context-optimizer/SKILL.md:149-158` -- MANIFEST 로딩 비용 분석; `README.md:50-53` -- "38K -> 500 tokens"

### Decision 2: 2-Tier Document Split (Header + Detail)

**Context**: 대형 agent/skill 파일들(init: 880 lines, github-manager: 488 lines 등)이 로드 시 불필요한 상세 내용까지 포함하여 토큰을 낭비함. 대부분의 상호작용에서 전체 레퍼런스는 필요 없고 핵심 인터페이스만 필요.

**Decision**: 모든 대형 파일을 **Header** (always loaded, ~40-65 lines) + **Detail** (on-demand, `references/DETAIL.md` 또는 `details/*-detail.md`)로 분리. Header에는 Usage, 핵심 테이블, 링크만 포함. Detail은 "Full implementation" 링크로 참조.

**Rationale**: 8개 대형 파일에 대해 평균 89% header 토큰 절감. init.md: 880 -> 40 lines (95%), github-manager.md: 488 -> 50 lines (90%). Agent는 `agents/details/` 디렉토리, Skill은 `skills/*/references/DETAIL.md` 경로 규칙으로 일관성 유지.

**Alternatives Considered**:
- **Single-file with sections**: 파일을 유지하되 접기(folding) 마커로 구분. Claude Code가 마커를 해석하지 않으므로 효과 없음.
- **JSON schema definition**: 구조화된 데이터로 변환. 사람의 가독성/편집성 저하.
- **Dynamic summarization**: 로드 시 LLM이 요약. 추가 토큰 비용과 정보 손실 위험.

**Evidence**: `README.md:137-171` -- 8개 파일의 Before/Header/Detail/Savings 테이블; `agents/details/` 디렉토리 -- 3개 detail 파일; `skills/init/SKILL.md:46` -- Detail 링크 패턴; `github-manager.md:51` -- Detail 참조 패턴

### Decision 3: Graceful Degradation with Critical/Non-Critical Hook Classification

**Context**: Hook 시스템(5-6개 스크립트)이 모든 도구 사용 시 자동 실행됨. Hook 실패 시 전체 작업이 중단되면 개발 경험이 크게 저하됨. 그러나 보안 관련 hook(pre-tool-use-safety.sh)의 실패는 무시하면 안 됨.

**Decision**: Hook을 **Critical** (pre-tool-use-safety.sh)과 **Non-Critical** (phase-progress.sh, auto-doc-sync.sh, post-tool-use-tracker.sh, notification-handler.sh)로 분류. Critical hook 실패 시 작업 차단(exit 1), Non-Critical hook 실패 시 경고 로깅 후 계속 진행(exit 0).

**Rationale**: 보안 검증(위험 명령 차단)은 반드시 실행되어야 하므로 critical로 분류. 진행률 업데이트, 문서 동기화, 메트릭 수집은 실패해도 핵심 작업에 영향 없으므로 non-critical로 분류. `error-recovery.sh`가 hook wrapper로 동작하며, 실패 시 자동 복구 시도 후 로깅.

**Alternatives Considered**:
- **All-or-nothing**: 모든 hook 실패를 동일하게 처리. 비핵심 hook 실패로 인한 불필요한 작업 중단 발생.
- **Retry-only**: 실패 시 재시도만 수행. Critical hook에 대한 즉시 차단이 불가능.
- **User-configurable criticality**: 사용자가 각 hook의 criticality를 설정. 설정 복잡도 증가, 보안 hook을 실수로 non-critical로 설정할 위험.

**Evidence**: `settings.json:254-269` -- `critical_hooks` vs `non_critical_hooks` 분류; `error-recovery.sh:96-145` -- hook별 복구 전략; `phase-progress.sh:9-11` -- `set +e` + trap으로 graceful 처리

## Code Metrics

| Metric | Value | Notes |
|--------|-------|-------|
| Total Files | 139 | .git 제외 |
| Total Lines | 21,607 | 모든 소스 파일 합계 |
| Markdown Files | 117 (84%) | Agents + Skills + Commands + Docs |
| Markdown Lines | 19,038 (88%) | 프레임워크의 핵심 -- Configuration-as-Code |
| Shell Scripts | 8 (6%) | Hooks (6) + Error Recovery (1) + Analytics Visualizer (1) |
| Shell Lines | 1,699 (8%) | 자동화 로직 |
| JSON Files | 7 (5%) | settings.json + plugin.json files + PROJECTS.json |
| JSON Lines | 373 (2%) | 설정 데이터 |
| YAML Files | 1 | GitHub Actions workflow |
| YAML Lines | 226 (1%) | CI/CD 파이프라인 |
| Agents | 25 + MANIFEST | 2-Tier: 25 headers + 3 detail files |
| Skills | 27 (18 dir + 7 file + 2 external CLI) | Directory-based: SKILL.md + references/ |
| Commands | 6 | Integrated workflows (feature, bugfix, release, phase, dev-doc-planner, git-workflow) |
| Hooks | 6 + 1 utility | 3 PreToolUse + 3 PostToolUse + 1 Notification + error-recovery |
| settings.json Sections | 17 | hooks, agile, phase, sprint, quality-gate, feedback, context-optimizer, documents, discovery, sync, project, update, safety, validation, recovery, analytics, github |
| Git Commits | 20+ | Conventional Commits (feat/fix/docs) |
| Token Savings vs Predecessor | 97% session init, 82% per-turn, 90% avg header | ~38K -> ~1.1K initial, ~1,700 -> ~300 per turn |

## Key Files

| File | Role | Notable |
|------|------|---------|
| `.claude/settings.json` | 17-section 중앙 설정 허브 | 316 lines. hooks, phase, sprint, quality-gate, sync, recovery 등 모든 시스템 설정을 단일 JSON으로 통합. `settings.json:1-316` |
| `.claude/agents/MANIFEST.md` | 25 Agent 라우팅 인덱스 | 32 lines, ~500 tokens. KO/EN 키워드 매칭으로 intent -> agent 매핑. `MANIFEST.md:1-32` |
| `.claude/templates/CLAUDE.lean.md` | 토큰 최적화 CLAUDE.md 템플릿 | 28 lines, ~300 tokens. 8개 변수 치환 (`{{PROJECT_NAME}}` 등). 기존 대비 82% 절감. `CLAUDE.lean.md:1-28` |
| `.claude/hooks/pre-tool-use-safety.sh` | PreToolUse 보안 게이트 | 114 lines. 18개 위험 명령 패턴 + 9개 보호 파일 패턴. 유일한 critical hook. `pre-tool-use-safety.sh:26-58` |
| `.claude/hooks/post-tool-use-tracker.sh` | JSONL 메트릭 수집기 | 197 lines. 모든 도구 사용을 session.log + changes.log + metrics.jsonl에 기록. 7개 카테고리 분류. `post-tool-use-tracker.sh:76-98` |
| `.claude/hooks/phase-progress.sh` | Phase 진행률 자동 업데이트 | 145 lines. TASKS.md 변경 감지 -> 완료율 계산 -> PROGRESS.md 업데이트. ASCII 프로그레스 바 생성. `phase-progress.sh:52-68` |
| `.claude/hooks/error-recovery.sh` | Graceful Degradation 엔진 | 295 lines. Hook별 복구 전략, 로그 로테이션, 시스템 헬스 체크, 자동 수정(permissions, directories). `error-recovery.sh:96-145` |
| `.claude/skills/context-optimizer/SKILL.md` | 토큰 예산 관리 시스템 | 171 lines. 4-tier budget(2K/10K/30K/50K), 3-level context boundary, incremental loading protocol, session checkpoint. `context-optimizer/SKILL.md:1-171` |
| `.claude/skills/init/SKILL.md` + `references/DETAIL.md` | 프로젝트 초기화 (6 modes) | Header 46 lines + Detail 413 lines. --full/--discover/--generate/--sync/--update/--quick. Framework copy + discovery + doc generation 체인. `init/SKILL.md:1-46`, `init/references/DETAIL.md:1-413` |
| `.claude/commands/feature.md` | 통합 기능 개발 워크플로우 | 199 lines. start/progress/complete 3-phase 워크플로우. 8개 agent/skill 연계 (branch-manager -> phase-tracker -> sprint -> quality-gate -> pr-creator -> agile-sync). `feature.md:1-199` |
| `.claude/scripts/analytics-visualizer.sh` | CLI 메트릭 시각화 | 506 lines. jq + fallback parsing. Bar chart, sparkline, percentage bar. 7개 리포트 모드 (summary/tools/errors/activity/agents/categories/full). `analytics-visualizer.sh:1-506` |
| `.claude/docs/ARCHITECTURE.md` | 프레임워크 아키텍처 문서 | 561 lines. ASCII 다이어그램으로 전체 시스템(Skills/Commands/Agents/Hooks), 워크플로우 체인 4개, 설정 구조 시각화. `ARCHITECTURE.md:1-561` |
| `.github/workflows/update-projects.yml` | 커뮤니티 프로젝트 자동 발견 | 227 lines. GitHub GraphQL API로 `uses-cc-initializer` topic 검색 -> PROJECTS_SECTION.md 생성 -> README.md 자동 업데이트. 주간 cron 실행. `update-projects.yml:1-227` |
| `CLAUDE.md` | 프로젝트 컨텍스트 파일 | 216 lines. Component Structure, Integration Map, Quick Reference 제공. cc-initializer 이름으로 self-reference (ultra-cc-init은 최적화 레이어). `CLAUDE.md:1-216` |
| `README.md` | Five Pillars 토큰 최적화 쇼케이스 | 358 lines. Before/After 비교, 2-Tier Document Architecture, Token Budget, vs cc-initializer 비교표. v5.1.0. `README.md:1-358` |
