# ultra-cc-init — Pantheon Export

> Exported from open-pantheon | 2026-02-22T21:30:00+09:00

---

## Architecture

### Overview

Claude Code를 위한 토큰 최적화 개발 워크플로우 프레임워크 -- cc-initializer(v4.5)에서 진화하여 세션 초기화 토큰을 97% 절감(~38K -> ~1.1K)하면서 25 agents, 27 skills, 6 commands, 6 hooks의 전체 기능을 유지하는 **Configuration-as-Code** 기반 AI 에이전트 오케스트레이션 시스템.

### Tech Stack

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

### Architecture

#### Style: Event-Driven Plugin Architecture + Configuration-as-Code

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

### Module Structure

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

### Data Flow

#### 1. Session Initialization (Incremental Loading Protocol)

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

#### 2. Project Initialization Flow (/init --full)

```
Framework Setup (.claude/ copy) ──→ Project Repo Detection (git remote)
    ──→ project-discovery agent ──→ DISCOVERY.md
    ──→ Document Generation Preview (user confirmation)
    ──→ dev-docs-writer ──→ PRD.md + TECH-SPEC.md + PROGRESS.md + CONTEXT.md
    ──→ [if HIGH complexity] doc-splitter ──→ docs/phases/phase-N/
    ──→ phase-tracker activation
```

Evidence: `init/references/DETAIL.md:12-88`

#### 3. Hook Automation Chain (Every Tool Use)

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

#### 4. Feature Development Flow

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

#### 5. Analytics Pipeline

```
post-tool-use-tracker.sh
  ──→ session.log (human-readable, last 100 entries)
  ──→ changes.log (file modifications, last 50 entries)
  ──→ metrics.jsonl (structured JSONL, 30-day retention, 10MB rotation)
      ──→ analytics-visualizer.sh (CLI charts: bar, sparkline, percentage)
      ──→ analytics-reporter agent (통계 리포트)
```

Evidence: `post-tool-use-tracker.sh:50-64,67-136`, `analytics-visualizer.sh:470-502`

### Design Decisions

#### Decision 1: MANIFEST-Based Agent Routing (Lazy Loading)

**Context**: cc-initializer v4.5는 세션 시작 시 25개 agent 파일 전체를 로드하여 ~38,000 토큰을 소비함. Claude Code의 컨텍스트 윈도우 예산 대부분을 프레임워크 자체가 소비하는 비효율 발생.

**Decision**: 단일 MANIFEST.md 파일(~500 토큰)에 25개 agent의 키워드-라우팅 테이블을 정의하고, 사용자 의도에 매칭되는 agent만 on-demand로 로드하는 lazy-loading 패턴 도입.

**Rationale**: 모든 agent 정보를 한 번에 로드하는 대신 routing index만 로드하면 97% 토큰 절감(38K -> 500). 사용자 의도 감지 후 필요한 agent 1개만 추가 로드(~100-300 tokens). 총 비용 ~800 vs ~38,000.

**Alternatives Considered**:
- **Category-based grouping**: Agent를 카테고리별 파일로 그룹화. 장점은 관련 agent 동시 로드이나 불필요한 agent도 함께 로드되는 낭비 존재.
- **LLM-native routing**: Claude에게 agent 선택을 위임. 추가 토큰과 latency 소비, 일관성 문제.
- **Embedding-based semantic search**: 의미 기반 검색. 인프라 의존성 추가, Markdown-only 프레임워크 철학에 부합하지 않음.

**Evidence**: `agents/MANIFEST.md:1-32` -- 25 agents x 1 row 라우팅 테이블; `context-optimizer/SKILL.md:149-158` -- MANIFEST 로딩 비용 분석; `README.md:50-53` -- "38K -> 500 tokens"

#### Decision 2: 2-Tier Document Split (Header + Detail)

**Context**: 대형 agent/skill 파일들(init: 880 lines, github-manager: 488 lines 등)이 로드 시 불필요한 상세 내용까지 포함하여 토큰을 낭비함. 대부분의 상호작용에서 전체 레퍼런스는 필요 없고 핵심 인터페이스만 필요.

**Decision**: 모든 대형 파일을 **Header** (always loaded, ~40-65 lines) + **Detail** (on-demand, `references/DETAIL.md` 또는 `details/*-detail.md`)로 분리. Header에는 Usage, 핵심 테이블, 링크만 포함. Detail은 "Full implementation" 링크로 참조.

**Rationale**: 8개 대형 파일에 대해 평균 89% header 토큰 절감. init.md: 880 -> 40 lines (95%), github-manager.md: 488 -> 50 lines (90%). Agent는 `agents/details/` 디렉토리, Skill은 `skills/*/references/DETAIL.md` 경로 규칙으로 일관성 유지.

**Alternatives Considered**:
- **Single-file with sections**: 파일을 유지하되 접기(folding) 마커로 구분. Claude Code가 마커를 해석하지 않으므로 효과 없음.
- **JSON schema definition**: 구조화된 데이터로 변환. 사람의 가독성/편집성 저하.
- **Dynamic summarization**: 로드 시 LLM이 요약. 추가 토큰 비용과 정보 손실 위험.

**Evidence**: `README.md:137-171` -- 8개 파일의 Before/Header/Detail/Savings 테이블; `agents/details/` 디렉토리 -- 3개 detail 파일; `skills/init/SKILL.md:46` -- Detail 링크 패턴; `github-manager.md:51` -- Detail 참조 패턴

#### Decision 3: Graceful Degradation with Critical/Non-Critical Hook Classification

**Context**: Hook 시스템(5-6개 스크립트)이 모든 도구 사용 시 자동 실행됨. Hook 실패 시 전체 작업이 중단되면 개발 경험이 크게 저하됨. 그러나 보안 관련 hook(pre-tool-use-safety.sh)의 실패는 무시하면 안 됨.

**Decision**: Hook을 **Critical** (pre-tool-use-safety.sh)과 **Non-Critical** (phase-progress.sh, auto-doc-sync.sh, post-tool-use-tracker.sh, notification-handler.sh)로 분류. Critical hook 실패 시 작업 차단(exit 1), Non-Critical hook 실패 시 경고 로깅 후 계속 진행(exit 0).

**Rationale**: 보안 검증(위험 명령 차단)은 반드시 실행되어야 하므로 critical로 분류. 진행률 업데이트, 문서 동기화, 메트릭 수집은 실패해도 핵심 작업에 영향 없으므로 non-critical로 분류. `error-recovery.sh`가 hook wrapper로 동작하며, 실패 시 자동 복구 시도 후 로깅.

**Alternatives Considered**:
- **All-or-nothing**: 모든 hook 실패를 동일하게 처리. 비핵심 hook 실패로 인한 불필요한 작업 중단 발생.
- **Retry-only**: 실패 시 재시도만 수행. Critical hook에 대한 즉시 차단이 불가능.
- **User-configurable criticality**: 사용자가 각 hook의 criticality를 설정. 설정 복잡도 증가, 보안 hook을 실수로 non-critical로 설정할 위험.

**Evidence**: `settings.json:254-269` -- `critical_hooks` vs `non_critical_hooks` 분류; `error-recovery.sh:96-145` -- hook별 복구 전략; `phase-progress.sh:9-11` -- `set +e` + trap으로 graceful 처리

### Code Metrics

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

### Key Files

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

---

## Narrative

### One-liner

Claude Code 개발 프레임워크의 토큰 사용량을 97% 절감하면서 25개 agent, 27개 skill을 유지하는 극한 최적화 시스템 — AI Native 생태계의 기반 인프라.

### Problem & Solution

#### Problem

Claude Code는 세션 시작 시 CLAUDE.md, agent 파일, skill 정의 등을 모두 로드합니다. cc-initializer v4.5 기준으로 25개 agent, 27개 skill, 6개 hook을 포함한 프레임워크는 세션 초기화에 **~38,000 토큰**을 소비했습니다. 매 턴마다 CLAUDE.md만 **~1,700 토큰**이 반복 투입되었고, 실제 작업에 필요한 agent는 1-2개뿐인데 25개 전체가 로드되었습니다. 이는 Claude Code의 context window를 빠르게 소진시키고, 복잡한 멀티페이즈 프로젝트에서 맥락 유실로 이어졌습니다.

#### Solution

**Five Pillars** 전략으로 기능 손실 없이 토큰 소비를 극한까지 줄였습니다:

1. **Agent MANIFEST** — 25개 agent를 31줄 라우팅 테이블로 압축. 키워드 매칭으로 필요한 agent만 lazy-load (`MANIFEST.md:1-31`)
2. **Lean CLAUDE.md** — 1,700 토큰 CLAUDE.md를 300 토큰 템플릿으로 교체. 8개 변수만 유지 (`.claude/templates/CLAUDE.lean.md`)
3. **Incremental Loading** — 4-tier 토큰 예산 (2K/10K/30K/50K)으로 턴별 점진적 로딩 (`settings.json:context-optimizer`)
4. **2-Tier Document** — 대형 파일을 Header(~50줄) + Detail(on-demand) 구조로 분리. 8개 파일에서 평균 90% 절감 (`agents/details/`)
5. **Structured Data** — 모든 산문을 테이블로 변환. 9개 파일에서 73% 라인 절감

#### Why This Approach

토큰은 AI agent의 "작업 메모리"입니다. 프레임워크가 컨텍스트를 소비하면 실제 작업(코드 분석, 생성)에 쓸 수 있는 용량이 줄어듭니다. ultra-cc-init은 "프레임워크의 오버헤드를 0에 수렴시키면서 기능은 100% 보존"이라는 원칙을 추구합니다. Database의 인덱스 패턴과 OS의 demand paging에서 영감을 받아, lazy-load + keyword routing 아키텍처를 채택했습니다.

### Milestones

| Date | Milestone | Impact | Evidence |
|------|-----------|--------|----------|
| 2026-01-06 | **v1.0 — Initial Release** (cc-initializer) | Claude Code 프로젝트 초기화 자동화 시작. Agent 기반 개발 워크플로우의 첫 구현 | `c2a5fbf feat: Initial release of Claude Code Project Initializer` |
| 2026-01-07 | **v2.0 — Agile Automation** | Sprint/Phase 통합 개발 시스템 도입. hook 기반 자동화 파이프라인 완성 | `8518dd1 feat(agile): add agile development automation v2.0` |
| 2026-01-09 | **v3.0 — Discovery First** | 대화 기반 요구사항 파악(`project-discovery`) → 문서 자동 생성 파이프라인 구축 | `1323adc feat(cc-initializer): implement Discovery First approach v3.0` |
| 2026-01-11 | **v4.0 — Framework Setup & Sync** | `.claude/` 전체를 다른 프로젝트로 복사/동기화하는 프레임워크 배포 체계 확립. `--sync`, `--update` 옵션 추가 | `ea8ba66 feat(cc-initializer): add Framework Setup and --sync option v4.0` |
| 2026-01-21 | **v4.3 — GitHub & Analytics** | `github-manager` agent + `/gh` skill로 이슈/PR/CI/CD/릴리스를 CLI에서 통합 관리. Analytics 시각화 추가 | `ed0146e feat(github): add github-manager agent and /gh skill v4.3.0` |
| 2026-01-31 | **v5.0 — Ultra Optimization** | Five Pillars 도입. 세션 토큰 38K→1.1K (97% 절감). Agent MANIFEST, Lean CLAUDE.md, Incremental Loading 구현 | `dcd5eff feat(token-optimization): add Agent MANIFEST, lean CLAUDE.md template, and incremental context loading` |
| 2026-01-31 | **v5.1 — 2-Tier + Structured** | 8개 대형 파일을 Header/Detail 분리 (평균 90% 절감). 9개 파일을 산문→테이블 변환 (73% 절감). 총 5,400+ 라인 최적화 | `9748c5b feat(token-optimization): implement 2-Tier Document structure (P1-1)` |
| 2026-02-02 | **v5.1+ — Dual AI Skills** | Codex CLI 연동 및 Claude+Codex 듀얼 AI 루프 스킬 추가. 멀티 LLM 오케스트레이션 시작 | `54c1998 feat: add Codex dual-AI skills to project (codex, codex-claude-loop)` |

### Impact Metrics

| Metric | Value | Source |
|--------|-------|--------|
| 세션 초기화 토큰 절감 | 38,000 → 1,100 (**97% 감소**) | `README.md:32` — Before & After 섹션 |
| CLAUDE.md 턴당 토큰 | 1,700 → 300 (**82% 감소**) | `README.md:33` — Before & After 섹션 |
| Agent 라우팅 토큰 | 38,000 → 500 (**97% 감소**) | `README.md:34`, `MANIFEST.md` (31줄 × ~16 tokens/줄) |
| 총 코드 라인 최적화 | **5,400+ 라인** 절감 | `README.md:23` — Lines Saved 배지 |
| 프레임워크 컴포넌트 | 25 agents, 27 skills, 6 commands, 6 hooks | `README.md:18-22` — 배지 |
| 프레임워크 총 파일 수 | **126개** 파일 (`.claude/` 디렉토리) | `find .claude -type f \|wc -l` |
| 프레임워크 총 라인 수 | **20,043줄** (md + sh + json) | `find .claude -type f \|xargs wc -l` |
| 2-Tier 평균 Header 절감 | **90%** (8개 파일 대상) | `README.md:162-171` — 2-Tier Document Architecture |
| Structured Data 평균 절감 | **52%** (9개 파일 대상) | `README.md:179-189` — Structured Data Format |
| Git 커밋 수 | **36개** (약 1개월 개발) | `git log --oneline\|wc -l` |
| 총 코드 변경량 | 29,519 insertions / 8,403 deletions | `git log --numstat` 집계 |
| 버전 반복 | v1.0 → v5.1+ (**8개 major/minor 릴리스**, 31일간) | `git log` 버전 태그 커밋 |
| 실사용 프로젝트 | DXTnavis (등록) | `PROJECTS.json` |

### Hero Content

#### Headline

**97% 토큰 절감, 기능 손실 Zero — AI 개발 프레임워크의 극한 최적화**

#### Description

ultra-cc-init은 Claude Code를 위한 통합 개발 워크플로우 프레임워크입니다. 25개 전문 agent, 27개 skill, 6개 자동화 hook을 하나의 생태계로 통합하면서, 세션 초기화 토큰을 38,000에서 1,100으로 줄였습니다. Agent MANIFEST 라우팅, 2-Tier Document 분리, Incremental Context Loading이라는 세 가지 핵심 패턴은 AI agent 프레임워크의 새로운 설계 원칙을 제시합니다. cc-initializer(v1-v4)의 기능 확장기를 거쳐, ultra(v5+)에서 성능 최적화로 전환한 이 프로젝트는 "기능을 추가할수록 비용은 줄어들 수 있다"는 역설적 진화를 실현했습니다.

#### Key Achievements

1. **97% Token Reduction** — 세션 초기화 38K→1.1K, 매 턴 1,700→300 토큰
2. **Five Pillars Architecture** — MANIFEST routing, Lean template, Incremental loading, 2-Tier docs, Structured data
3. **31일간 8회 릴리스** — v1.0(초기화)→v5.1(극한 최적화), 주 2회 이상 릴리스
4. **Dual AI Orchestration** — Claude + Codex CLI 연동, 멀티 LLM 듀얼 엔지니어링 루프

### Story Arc

#### Act 1: Genesis — "하나의 초기화 스크립트에서 시작" (2026-01-06 ~ 01-07)

cc-initializer는 Claude Code 프로젝트를 시작할 때 필요한 boilerplate를 자동 생성하는 도구로 탄생했습니다. 첫 커밋에서 agent 기반 구조, hook 시스템, 기본 스킬이 한꺼번에 추가되었습니다. 이틀 만에 v2.0으로 올라가며 Agile 자동화(Sprint/Phase tracking)가 도입되었고, 단순한 초기화 도구를 넘어 **개발 생명주기 관리 프레임워크**로 방향을 잡았습니다.

#### Act 2: Expansion — "기능의 폭발적 성장" (2026-01-09 ~ 01-22)

v3.0에서 Discovery First 접근법이 도입되면서, 프레임워크는 대화 기반 요구사항 파악 → 문서 자동 생성이라는 고유한 워크플로우를 갖게 되었습니다. v4.0에서는 `--sync`, `--update`로 프레임워크 자체를 다른 프로젝트에 배포하는 메커니즘이 완성되었습니다. GitHub 통합(v4.3), Analytics(v4.2), 커뮤니티 프로젝트 발견(v4.4), README 도우미(v4.5)가 빠르게 추가되면서 agent 수는 25개, 스킬은 27개로 팽창했습니다. 그러나 이 성장은 비용을 수반했습니다 — 세션 초기화에만 **38,000 토큰**을 소비하게 된 것입니다.

#### Act 3: Compression — "적을수록 강하다" (2026-01-31)

v5.0은 프로젝트의 결정적 전환점입니다. 기능을 추가하는 대신 **기존 기능의 토큰 비용을 극한까지 줄이는** 작업이 하루 만에 집중 수행되었습니다. 5개의 커밋으로 Five Pillars가 구현되었고, Codex CLI로 6개의 내부 비일관성이 발견/수정되었습니다. 30개 파일에서 2,843줄이 추가되고 5,277줄이 삭제되어, 순 2,434줄 감소라는 드문 "역성장 릴리스"가 완성되었습니다. 결과: 기능 100%, 비용 3%.

#### Act 4: Orchestration — "멀티 AI 시대" (2026-02-01 ~ 현재)

Codex CLI 통합과 듀얼 AI 루프 스킬 추가로, 단일 Claude 프레임워크에서 **멀티 LLM 오케스트레이션 플랫폼**으로 진화했습니다. Claude가 구현하고 Codex가 검증하는 교차 검증 루프는 open-pantheon의 Multi-CLI Distribution 패턴의 원형이 되었습니다. 이 레포는 cc-initializer → ultra-cc-init → open-pantheon으로 이어지는 AI Native 생태계 삼부작의 두 번째 작품입니다.

### Technical Challenges

#### Challenge 1: Agent Routing Without Loading All Files

**Problem**: 25개 agent 파일을 세션 시작 시 모두 로드하면 ~38,000 토큰이 소비됩니다. 사용자가 "커밋해줘"라고 말했을 때 실제 필요한 것은 `commit-helper` 하나뿐인데, 나머지 24개 agent 정의도 컨텍스트에 올라가 있었습니다.

**Impact**: Context window의 약 38%가 프레임워크 오버헤드로 낭비되어, 복잡한 멀티파일 작업에서 맥락 유실과 응답 품질 저하가 발생했습니다.

**Solution**: `MANIFEST.md` 패턴 — 25개 agent를 31줄 라우팅 테이블(~500 토큰)로 압축하고, 한국어/영어 키워드 컬럼으로 intent matching 후 해당 agent 파일만 lazy-load합니다. Database의 인덱스가 전체 테이블 스캔을 피하듯, MANIFEST가 전체 agent 로드를 피합니다.

**Evidence**: `MANIFEST.md:1-31` (라우팅 테이블), `README.md:34` ("Agent routing: load all 25 → MANIFEST → 1, -97%"), `settings.json:126` ("agent_manifest": ".claude/agents/MANIFEST.md")

#### Challenge 2: Framework Overhead vs. Working Memory Trade-off

**Problem**: CLAUDE.md가 매 턴마다 ~1,700 토큰을 소비했습니다. 프레임워크의 전체 구조, 컨벤션, 설정을 설명하는 산문형 문서가 Claude의 시스템 프롬프트에 항상 포함되었습니다. 이는 누적적으로 세션당 수만 토큰의 "고정 비용"을 발생시켰습니다.

**Impact**: 긴 대화에서 실제 코드를 다룰 수 있는 컨텍스트 여유가 크게 줄었고, `context > 80%` 경고가 빈번하게 발생했습니다.

**Solution**: 3중 전략 적용: (1) Lean CLAUDE.md 템플릿(8개 변수, ~300 토큰)으로 교체 (2) 모든 산문을 테이블/구조화 데이터로 변환 (3) 4-tier 토큰 예산 시스템(Quick 2K / Standard 10K / Deep 30K / Full 50K)으로 세션 유형에 맞는 컨텍스트만 로드. Session Checkpoint 프로토콜로 80% 임계치 초과 시 자동 저장 후 `/clear` → ~2K로 즉시 복구.

**Evidence**: `.claude/templates/CLAUDE.lean.md` (27줄 템플릿), `README.md:30-37` (Before & After), `settings.json:121-151` (context-optimizer 전체 설정), `context-optimizer/SKILL.md:46-49` (Token Budget Guidelines)

#### Challenge 3: Framework Distribution and Sync Integrity

**Problem**: cc-initializer를 여러 프로젝트에 배포할 때, 각 프로젝트가 자체적으로 커스터마이징한 agent/skill과 프레임워크 원본의 업데이트 사이에 충돌이 발생했습니다. 단순 복사는 프로젝트 고유 설정을 덮어쓰고, 수동 병합은 누락을 발생시켰습니다.

**Impact**: 프레임워크 업데이트 시 각 프로젝트에서 개별 diff/merge가 필요했고, 에러가 잦았습니다.

**Solution**: `settings.json`의 `sync` 섹션에 컴포넌트별 merge strategy를 정의했습니다. agents/skills/commands/hooks는 `add_missing` 전략(기존 파일 유지, 새 파일만 추가)을 사용하고, settings는 `deep_merge`(키 단위 병합)를 적용합니다. `preserve_project_customizations: true`로 프로젝트 고유 설정을 보호하며, `backup_before_sync: true`로 롤백 안전망을 제공합니다. `/init --update`로 원격 레포에서 최신 버전을 pull → sync → validate까지 원커맨드로 완료됩니다.

**Evidence**: `settings.json:178-216` (sync 전체 설정), `CLAUDE.md:84-89` (sync 워크플로우), `346a96a feat(cc-initializer): add --update option for GitHub sync v4.1`

---

## Stack Profile

> **Repo**: https://github.com/tygwan/ultra-cc-init
> **Version**: 5.1.0
> **Base**: cc-initializer 4.5
> **Analyzed**: 2026-02-22

---

### Detected Stack

| Layer | Technology | Version/Detail | Confidence | Evidence |
|-------|-----------|----------------|:----------:|----------|
| **Primary Language** | Markdown | CommonMark + Frontmatter | **99%** | 117/139 파일이 `.md` (`CLAUDE.md:1`, `README.md:1`, `.claude/agents/*.md`) |
| **Scripting** | Bash/Shell | POSIX + Bash 4+ | **99%** | 8개 `.sh` 파일 — hooks, scripts, ccusage (`pre-tool-use-safety.sh:1`, `phase-progress.sh:1`, `analytics-visualizer.sh:1`) |
| **Configuration** | JSON | settings.json + plugin.json + PROJECTS.json | **99%** | 7개 `.json` 파일 (`settings.json:1` — 316줄 17-section config hub) |
| **CI/CD** | GitHub Actions | `actions/checkout@v4`, `ubuntu-latest` | **99%** | `.github/workflows/update-projects.yml:1` — GraphQL + Python3 자동화 |
| **Embedded Runtime** | Python 3 | CI 파이프라인 내 inline script | **85%** | `update-projects.yml:63` — JSON 파싱, README 업데이트 로직 |
| **Embedded Runtime** | Node.js | ccusage 리포팅 inline script | **85%** | `ccusage-manual.sh:55` — `node -` heredoc, `npx -y @ccusage/codex@latest` |
| **Data Format** | JSONL | JSONL metrics for analytics | **99%** | `settings.json:283` — `metrics_file: ".claude/analytics/metrics.jsonl"` |
| **Data Format** | YAML | Workflow definitions | **90%** | `.github/workflows/update-projects.yml:1`, `.gitattributes:1` |
| **External CLI** | Codex CLI | `gpt-5.2-codex` / `gpt-5.1-codex-mini` / `gpt-5.1-codex-max` | **99%** | `.claude/skills/codex/SKILL.md:14-16` |
| **External CLI** | Claude Code | Lead orchestrator | **99%** | `CLAUDE.md:9` — "Claude Code를 위한 통합 개발 워크플로우 프레임워크" |
| **External CLI** | gh CLI | GitHub API integration | **99%** | `.claude/skills/gh/SKILL.md`, `settings.json:291` |
| **External CLI** | jq | JSON processing (optional) | **75%** | `analytics-visualizer.sh:49` — fallback 파싱 패턴 포함 |
| **Package Manager** | npx | ccusage 패키지 실행 | **90%** | `ccusage-manual.sh:37` — `npx -y @ccusage/codex@latest` |
| **Line Normalization** | `.gitattributes` | LF 강제 (`.sh`, `.md`, `.json`) | **99%** | `.gitattributes:1-13` |

#### Stack Summary

```
Primary:   Markdown (84%) + Shell (6%) + JSON (5%)
Secondary: Python3 (CI inline) + Node.js (ccusage inline)
External:  Claude Code + Codex CLI + gh CLI + jq
Data:      JSONL (metrics) + JSON (config) + Frontmatter YAML (agents/skills)
CI/CD:     GitHub Actions (weekly cron + manual dispatch)
```

---

### Domain Classification

| Criteria | Assessment |
|----------|-----------|
| **Primary Domain** | **devtool** |
| **Sub-domain** | AI Agent Orchestration Framework / CLI Configuration System |
| **Confidence** | **97%** |
| **Rationale** | Claude Code의 개발 워크플로우를 자동화하는 설정 프레임워크. 25 agents, 27 skills, 6 commands, 6 hooks를 오케스트레이션하여 프로젝트 초기화, Phase/Sprint 관리, 품질 게이트, 문서 동기화를 자동화 |

#### Domain Evidence

| Signal | Evidence | Weight |
|--------|----------|:------:|
| Developer tooling | `CLAUDE.md:9` — "통합 개발 워크플로우 프레임워크" | High |
| CLI orchestration | Codex CLI + Claude Code + gh CLI 통합 (`settings.json`, `codex/SKILL.md`, `codex-claude-loop/SKILL.md`) | High |
| Configuration-as-Code | `.claude/settings.json` 316줄 — hooks, phase, sprint, quality-gate, analytics 등 17개 섹션 | High |
| Token optimization | `README.md:29-37` — 97% 토큰 절감 (38K → 1.1K), MANIFEST 라우팅, 2-Tier Docs | High |
| Automation hooks | 6개 shell hooks: safety, progress, doc-sync, tracker, notification, error-recovery | High |
| Project management | Phase + Sprint 통합, quality gates, feedback loops | Medium |
| Analytics | JSONL 메트릭 수집 + CLI 시각화 (`analytics-visualizer.sh`) | Medium |

#### Alternative Domain Consideration

| Domain | Fit | Reason |
|--------|:---:|--------|
| devtool | **Best** | 개발 도구/프레임워크의 정의에 완벽 부합 |
| automation | Partial | 자동화 요소 강하나, 범용 자동화가 아닌 개발 특화 |
| ai-ml | Partial | AI CLI를 사용하지만, ML 모델 학습/추론이 아닌 도구 오케스트레이션 |
| plugin-tool | Partial | 플러그인 시스템 특성이 있으나 독립 프레임워크에 더 가까움 |

---

### Template Recommendation

| Criteria | Recommendation | Rationale |
|----------|:--------------:|-----------|
| **Primary** | **astro-landing** | CLI 도구 특성상 정적 콘텐츠 중심. 인터랙티브 요소 불필요. 0KB JS 기본값이 devtool 포트폴리오에 최적 |
| **Alternative** | sveltekit-dashboard | Token budget 시각화, agent routing 다이어그램 등 인터랙티브 요소 포함 시 |

#### Template Selection Logic

```
Q1: 인터랙티브 대시보드가 핵심인가?
    → NO: CLI 프레임워크, 설정 파일 기반. 런타임 UI 없음

Q2: 정적 콘텐츠로 프로젝트를 충분히 설명 가능한가?
    → YES: Five Pillars, Before/After 비교, Component 테이블, Token Budget 등 구조화된 데이터

Q3: 사용자가 사이트에서 무언가를 '조작'하는가?
    → NO: 읽기 전용 쇼케이스

Q4: 기존 프론트엔드 프레임워크 사용하는가?
    → NO: 순수 Markdown + Shell + JSON

결론: astro-landing (정적 제품 랜딩, GitHub Pages 최적)
```

#### Visualization Opportunities

| Element | Type | Source |
|---------|------|--------|
| Before/After 비교 | 정적 테이블 + CSS 바 차트 | `README.md:29-37` — 토큰 절감 수치 |
| Five Pillars | 카드 레이아웃 | `README.md:41-111` — 5개 최적화 기둥 |
| Architecture Diagram | Mermaid/SVG | `.claude/docs/ARCHITECTURE.md` — 시스템 흐름도 |
| Component Count | 배지/통계 카드 | 25 agents, 27 skills, 6 commands, 6 hooks |
| Token Budget Tiers | 정적 그래프 | 4-tier budget system (2K/10K/30K/50K) |
| 2-Tier Docs Savings | 비교 테이블 | `README.md:162-171` — 81-95% 절감률 |

---

### Existing Site

| Item | Status |
|------|--------|
| **Live site** | None detected |
| **GitHub Pages** | 미설정 (`.github/workflows/`에 배포 workflow 없음) |
| **Homepage URL** | 미설정 |
| **Deploy config** | 없음 |
| **README badges** | 있음 — version 5.1.0, base cc-initializer 4.5, MIT license (`README.md:2-14`) |
| **Package registry** | 미등록 (npm, PyPI 등 없음) |

---

### Build & Deploy Profile

| Item | Current Status | Recommendation |
|------|---------------|----------------|
| **Build tool** | 없음 (빌드 불필요한 config-only 프로젝트) | Astro `astro build` |
| **Package manager** | npx only (ccusage) | npm/pnpm (site 빌드용) |
| **Test framework** | 없음 | 없음 (config 프로젝트 특성) |
| **Linter** | 없음 (Markdown/Shell 프로젝트) | markdownlint, shellcheck |
| **CI/CD** | GitHub Actions — `update-projects.yml` (weekly cron) | + deploy workflow 추가 |
| **Deploy target** | 미설정 | GitHub Pages (기본) |
| **Static assets** | 없음 | 생성 필요 (hero image, architecture SVG) |
| **Bundle size concern** | N/A | 0KB JS (Astro 기본값 활용) |

#### File Statistics

| Metric | Value |
|--------|-------|
| Total files | 139 |
| Total lines | 21,607 |
| Markdown files | 117 (84%) |
| Shell scripts | 8 (6%) |
| JSON files | 7 (5%) |
| YAML files | 1 (< 1%) |
| Other (.gitkeep, .gitattributes, .gitignore) | 6 (4%) |

#### Key Design Tokens Derivation

| Source Signal | Design Implication |
|--------------|--------------------|
| Token optimization 테마 (97% 절감) | 미니멀리스트 디자인, 공백 활용, "less is more" |
| CLI 도구 + 터미널 출력 | 모노스페이스 타이포그래피, 다크 배경 가능 |
| Before/After 비교 패턴 | 대비 컬러 팔레트 (before: muted, after: vibrant) |
| 5-Pillar 구조 | 카드 그리드 레이아웃, 아이콘 기반 내비게이션 |
| "Ultra" + "97% fewer tokens" | 속도감, 경량화 시각 메타포 (gradient, sharp edges) |
| 오렌지 브랜드 컬러 (`#FF6B35`) | `README.md:2` — 배지 컬러에서 추출, accent 색상 후보 |

---

### Appendix: Detected Components Inventory

#### Agents (25)

| # | Agent | Category |
|---|-------|----------|
| 1 | progress-tracker | Tracking |
| 2 | phase-tracker | Tracking |
| 3 | dev-docs-writer | Docs |
| 4 | project-discovery | Discovery |
| 5 | doc-splitter | Docs |
| 6 | github-manager | GitHub |
| 7 | analytics-reporter | Analytics |
| 8 | config-validator | Config |
| 9 | commit-helper | Git |
| 10 | pr-creator | Git |
| 11 | branch-manager | Git |
| 12 | code-reviewer | Quality |
| 13 | test-helper | Quality |
| 14 | refactor-assistant | Quality |
| 15 | git-troubleshooter | Git |
| 16 | doc-generator | Docs |
| 17 | doc-validator | Docs |
| 18 | readme-helper | Writing |
| 19 | agent-writer | Writing |
| 20 | project-analyzer | Research |
| 21 | prd-writer | Writing |
| 22 | tech-spec-writer | Writing |
| 23 | work-unit-manager | Config |
| 24 | file-explorer | Research |
| 25 | google-searcher | Research |

#### Skills (27 = 23 directory-based + 4 legacy files)

| # | Skill | Type |
|---|-------|------|
| 1 | init | Directory |
| 2 | validate | Directory |
| 3 | repair | Directory |
| 4 | sprint | Directory |
| 5 | agile-sync | Directory |
| 6 | quality-gate | Directory |
| 7 | feedback-loop | Directory |
| 8 | context-optimizer | Directory |
| 9 | dev-doc-system | Directory |
| 10 | prompt-enhancer | Directory |
| 11 | readme-sync | Directory |
| 12 | analytics | Directory |
| 13 | ccusage | Directory |
| 14 | gh | Directory |
| 15 | codex | Directory |
| 16 | codex-claude-loop | Directory |
| 17 | doc-confirm | Directory |
| 18 | skill-creator | Directory |
| 19 | subagent-creator | Directory |
| 20 | hook-creator | Directory |
| 21 | brainstorming | Directory |
| 22 | sync-fix | Directory |
| 23 | devlog | Directory |
| 24 | commit.md | Legacy |
| 25 | doc.md | Legacy |
| 26 | review.md | Legacy |
| 27 | test.md | Legacy |

#### Hooks (7 scripts)

| # | Hook | Event | Purpose |
|---|------|-------|---------|
| 1 | pre-tool-use-safety.sh | PreToolUse | 위험 명령 차단 |
| 2 | phase-progress.sh | PostToolUse | TASKS.md 변경 → 진행률 업데이트 |
| 3 | auto-doc-sync.sh | PostToolUse | Git commit → CHANGELOG/README 동기화 |
| 4 | post-tool-use-tracker.sh | PostToolUse | JSONL 메트릭 + 세션 로깅 |
| 5 | notification-handler.sh | Notification | 알림 처리 |
| 6 | error-recovery.sh | PostToolUse | 에러 복구 |
| 7 | analytics-visualizer.sh | Manual | CLI 차트 시각화 (script/) |

---

## Summary

### Key Insights

- **97% Token Optimization (Five Pillars)**: MANIFEST 라우팅(38K→500), Lean CLAUDE.md(1,700→300/turn), 2-Tier Document(평균 90% 절감), Incremental Loading(4-tier 예산), Structured Data(73% 라인 절감). "기능을 추가할수록 성능이 저하되는" 역설을 해결
- **Configuration-as-Code 극대화**: 139파일 중 84%가 Markdown(117파일, 19,038줄). 에이전트=MD, 설정=JSON, 훅=Shell. 런타임 소스 코드 없이 개발 워크플로우 전체를 설정 파일로 정의
- **Event-Driven Plugin Architecture**: 25 agents + 27 skills + 6 commands + 6 hooks가 모두 독립 모듈. settings.json(17-section, 316줄)이 중앙 허브. 플러그인 추가/제거가 파일 복사/삭제로 완료
- **31일간 8회 릴리스 (v1.0→v5.1+)**: 초기화 도구 → Agile 자동화 → Discovery First → 프레임워크 배포 → GitHub 통합 → 극한 최적화 → 듀얼 AI. 주 2회 이상 릴리스
- **Dual AI 오케스트레이션 원형**: Claude(구현) + Codex(검증) 듀얼 루프의 첫 구현. Codex가 6개 내부 비일관성 발견(commit `adb3d11`). open-pantheon Multi-CLI Distribution의 원형
- **역성장 릴리스 (v5.0)**: 30파일에서 2,843줄 추가 / 5,277줄 삭제 = 순 2,434줄 감소. 기능 100% 유지하면서 비용 3%로 압축. 하루 만에 5개 커밋으로 완성
- **프레임워크 배포/동기화 체계**: `--sync`(add_missing 병합) + `--update`(git pull) + `preserve_project_customizations`로 프레임워크 업데이트와 프로젝트 격리를 동시 달성. DXTnavis 실사용 검증

### Recommended Template

`astro-landing` -- CLI 도구 특성상 정적 콘텐츠 중심. 인터랙티브 요소 불필요. 0KB JS 기본값이 devtool 포트폴리오에 최적. Five Pillars Before/After 비교, Component 카운트, Token Budget 시각화가 핵심.

**대안**: `sveltekit-dashboard` -- Token budget 인터랙티브 시각화, agent routing 다이어그램 필요 시

### Design Direction

- **Palette**: 다크 터미널 배경(#0d1117) + 브랜드 오렌지(#FF6B35, README 배지 추출). Before(muted) vs After(vibrant) 대비. "Ultra" 속도감 표현
- **Typography**: Monospace 주체 (JetBrains Mono / Fira Code). 터미널 코드 블록 스타일. 헤드라인 Sans-serif 대비
- **Layout**: CLI 도구 랜딩. Hero(97% 토큰 절감 Before/After 바 차트) → Five Pillars(5개 카드 그리드) → Component Inventory(25 agents, 27 skills, 6 hooks 통계 카드) → Architecture(시스템 흐름 다이어그램) → Token Budget(4-tier 시각화) → 2-Tier Docs Savings(비교 테이블) → v1→v5.1 타임라인 → DXTnavis 채택 사례

### Notable

- **cc-initializer의 최적화 레이어**: cc-initializer v4.5의 기능을 100% 유지하면서 토큰 비용만 극한 절감. 별도 레포로 분리되었으나 dual remote 구조(origin/ultra)로 양쪽 관리
- **Database 인덱스 패턴 + OS demand paging 영감**: MANIFEST 라우팅은 DB 인덱스가 full table scan을 피하듯, 전체 agent 로드를 피하는 설계. Incremental Loading은 OS의 demand paging에서 차용
- **Session Checkpoint 프로토콜**: context > 80% 임계치 초과 시 자동 저장 → `/clear` → ~2K로 즉시 복구. 긴 대화 세션의 맥락 유실 방지
- **커뮤니티 자동 발견**: GitHub Topics(`uses-cc-initializer`) + GraphQL API + 주간 크론으로 채택 프로젝트 자동 수집
- **3부작의 두 번째**: cc-initializer(기능 확장) → ultra-cc-init(극한 최적화) → open-pantheon(통합 생태계)의 AI Native 진화 삼부작 중간편

---

## Experience Blocks

> 3부작 통합 인터뷰 결과. 전체 내용은 `workspace/open-pantheon/analysis/experience-blocks.md` 참조.

### 이 프로젝트의 주요 경험

#### Experience 1: 97% 토큰 최적화 — Five Pillars (주도)
4-tier 토큰 예산(2K/10K/30K/50K)은 점진적 실험으로 수렴. Claude와 Codex의 모델별 성능 차이를 확인하고 Codex의 큰 context window를 활용하여 Claude 부담 경감. DB 인덱스 + OS demand paging에서 영감.

#### Experience 2: Multi-CLI 오케스트레이션 (원형)
Claude=코드 작성, Codex=Critical 부분 분석, Gemini=디자인. Codex가 6개 불일치 발견(commit `adb3d11`)이 결정적 계기. 듀얼 AI 루프의 원형 구현.

#### Experience 4: 47일 삼부작 진화 (최적화 편)
ultra-cc-init은 삼부작의 두 번째. 6일 집중 개발, v5.0 "역성장 릴리스"(순 2,434줄 감소, 기능 100%, 비용 3%). 범위 확장(포트폴리오 요구)이 open-pantheon 통합을 촉발.

### 전체 Gap Summary (30/30 블록 해소)

| 경험 | 목표 | 현상 | 가설 | 판단기준 | 실행 | 결과 |
|------|:----:|:----:|:----:|:-------:|:----:|:----:|
| 1. 토큰 최적화 | O | O | O | O | O | O |
| 2. Multi-CLI | O | O | O | O | O | O |
| 4. 삼부작 진화 | O | O | O | O | O | O |
