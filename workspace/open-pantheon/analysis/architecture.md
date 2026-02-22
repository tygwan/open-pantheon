# open-pantheon Architecture Analysis

## Overview

Git 레포 분석 -> 포트폴리오 사이트 자동 생성 파이프라인과 개발 라이프사이클 자동화를 하나의 AI 에이전트 생태계로 통합한 Configuration-as-Code 프레임워크. Claude Code를 Lead Orchestrator로, Codex CLI(분석/검증)와 Gemini CLI(디자인/시각화)를 위임 실행기로 활용하는 Multi-CLI 아키텍처를 채택했다.

## Tech Stack

| Category | Technology | Version/Count | Notes |
|----------|-----------|---------------|-------|
| Primary Language | Markdown | 138 files | 에이전트 정의, 커맨드 스펙, 문서 (전체 파일의 ~70%) |
| Configuration | YAML | 19 files | 상태 스키마, 디자인 프리셋, 도메인 프로파일 |
| Automation | Bash Shell | 7 scripts (9 files total) | Hook 파이프라인 (PreToolUse, PostToolUse, Notification) |
| Settings | JSON | 12 files | `settings.json` (334 LoC), analytics metrics (JSONL) |
| Template: Interactive | SvelteKit | `svelte.config.js` + `vite.config.js` | 대시보드형 프로젝트용 (`templates/sveltekit-dashboard/`) |
| Template: Static | Astro | `astro.config.mjs` + `tsconfig.json` | 랜딩페이지형 프로젝트용 (`templates/astro-landing/`) |
| Design Tokens | CSS Custom Properties | `--pn-` prefix | `tokens.css` -> 브라우저 직접 소비 |
| State Machine | YAML (custom schema) | 358 LoC schema | `workspace/.state-schema.yaml` — 12 states, 14 transitions |
| Orchestrator | Claude Code | Lead | 코드 생성, 오케스트레이션, 사용자 대화 |
| Analysis/Validation | Codex CLI | `gpt-5-mini` / `gpt-5-codex` | `--sandbox read-only` 전용, Phase 1 + 3.5 |
| Design/Visualization | Gemini CLI | `gemini-2.5-flash` / `gemini-2.5-pro` | `-y` auto-approve, Phase 2 + 3 |

## Architecture

### Architecture Style: Agent Orchestration + Finite State Machine + Event-Driven Hook Pipeline

open-pantheon은 세 가지 아키텍처 패턴이 레이어로 결합된 구조이다:

```
┌─────────────────────────────────────────────────────────────────────┐
│  Layer 1: Slash Commands (13)                                       │
│  craft, craft-analyze, craft-design, feature, bugfix, release ...   │
├─────────────────────────────────────────────────────────────────────┤
│  Layer 2: Agent Orchestration (29 agents via MANIFEST.md routing)   │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────────┐   │
│  │ Phase 1  │  │ Phase 2  │  │ Phase 3  │  │ Dev Lifecycle    │   │
│  │ code-    │  │ design-  │  │ page-    │  │ commit-helper    │   │
│  │ analyst  │  │ agent    │  │ writer   │  │ pr-creator       │   │
│  │ story-   │  │ (Gemini) │  │ figure-  │  │ code-reviewer    │   │
│  │ analyst  │  │          │  │ designer │  │ progress-tracker │   │
│  │ stack-   │  │          │  │          │  │ ...18 more       │   │
│  │ detector │  │          │  │ validate │  │                  │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────────────┘   │
├─────────────────────────────────────────────────────────────────────┤
│  Layer 3: Skills (23 dirs + 6 legacy) — Reusable capabilities      │
│  codex/ gemini/ quality-gate/ sprint/ init/ feedback-loop/ ...      │
├─────────────────────────────────────────────────────────────────────┤
│  Layer 4: Hook Pipeline (7 hooks)                                   │
│  PreToolUse: safety.sh                                              │
│  PostToolUse: doc-sync, phase-progress, tracker, state-transition,  │
│               craft-progress                                        │
│  Notification: handler                                              │
├─────────────────────────────────────────────────────────────────────┤
│  Layer 5: State Machine (.state.yaml per project)                   │
│  init -> analyzing -> analyzed -> designing -> design_review ->     │
│  building -> validating -> build_review -> deploying -> done        │
│  + paused, failed, cancelled (special states)                       │
└─────────────────────────────────────────────────────────────────────┘
```

### Agent Routing

에이전트 라우팅은 `MANIFEST.md` (`.claude/agents/MANIFEST.md:3-39`) 기반 키워드 매칭으로 동작한다. 33개 에이전트가 한국어/영어 듀얼 키워드로 인덱싱되어 있으며, lazy-load 방식으로 필요한 에이전트만 로드된다.

Evidence: `.claude/agents/MANIFEST.md:3` — `> Compact routing index for 33 agents. Load individual agent files only when matched.`

### State Machine

12개 상태와 14개 전이 규칙으로 구성된 Finite State Machine이 각 프로젝트의 파이프라인 진행을 추적한다. 모든 전이에는 guard condition이 존재한다.

Evidence: `workspace/.state-schema.yaml:19-37` — `current_state` enum: `init`, `analyzing`, `analyzed`, `designing`, `design_review`, `building`, `validating`, `build_review`, `deploying`, `done`, `paused`, `failed`, `cancelled`

Evidence: `workspace/.state-schema.yaml:293-358` — 14개 transition rules (guard 조건 포함)

### Hook Pipeline

`settings.json` (`.claude/settings.json:1-52`)이 hook 실행 순서를 정의한다. Write/Edit 도구 호출 시 최대 5개 PostToolUse hook이 순차 실행된다:

1. `auto-doc-sync.sh` — CHANGELOG/README 동기화
2. `phase-progress.sh` — Phase TASKS.md 업데이트
3. `post-tool-use-tracker.sh` — JSONL 메트릭 기록
4. `state-transition.sh` — State Machine 브릿지
5. `craft-progress.sh` — Craft 파이프라인 진행률 동기화

Evidence: `.claude/settings.json:26-44` — PostToolUse matcher for "Write" with 5 hook commands

### Multi-CLI Distribution

| Phase | Primary CLI | Sandbox/Flag | Fallback |
|-------|-------------|-------------|----------|
| 1 (Analyze) | Codex CLI | `--sandbox read-only` | Claude 내장 도구 |
| 2 (Design) | Gemini CLI | `-y` (auto-approve) | Claude |
| 3 (Build) | Claude (Lead) | - | - |
| 3 (Visuals) | Gemini CLI | `-y` | Claude |
| 3.5 (Validate) | Codex CLI | `--sandbox read-only` | Claude 내장 도구 |
| 4 (Deploy) | Claude (Lead) | - | - |

Evidence: `.claude/settings.json:320-333` — `craft.cli_distribution` 설정
Evidence: `.claude/skills/codex/SKILL.md:87-99` — Codex는 항상 `read-only` sandbox
Evidence: `.claude/skills/gemini/SKILL.md:41` — Gemini는 항상 `-y` (비대화형)

## Module Structure

### Agents (29 definitions + MANIFEST)

| Module | Responsibility | Key Files | LoC (approx) |
|--------|---------------|-----------|--------------|
| Craft Pipeline Agents (8) | Phase 1-3.5 파이프라인 실행 | `code-analyst.md`, `story-analyst.md`, `stack-detector.md`, `design-agent.md`, `page-writer.md`, `figure-designer.md`, `validation-agent.md`, `experience-interviewer.md` | ~3,000 |
| Dev Lifecycle Agents (21) | 커밋, PR, 브랜치, 리뷰, 테스트, 문서 등 | `commit-helper.md`, `pr-creator.md`, `code-reviewer.md`, `progress-tracker.md`, etc. | ~5,500 |
| MANIFEST | 키워드 라우팅 인덱스 | `MANIFEST.md` | 39 |

### Skills (23 directories + 6 legacy files)

| Module | Responsibility | Key Files | LoC (approx) |
|--------|---------------|-----------|--------------|
| CLI Skills (2) | 외부 CLI 위임 (Codex, Gemini) | `codex/SKILL.md`, `gemini/SKILL.md` | ~380 |
| Lifecycle Skills (21) | 초기화, 스프린트, 품질, 피드백 등 | `init/`, `sprint/`, `quality-gate/`, `feedback-loop/` | ~3,000 |
| Legacy Skills (6) | 단일 파일 스킬 (커밋, 리뷰, 테스트 등) | `commit.md`, `review.md`, `test.md`, `doc.md`, `refactor.md`, `phase-development.md` | ~700 |

### Hooks (7 scripts)

| Module | Event | Key Files | LoC |
|--------|-------|-----------|-----|
| Safety Guard | PreToolUse | `pre-tool-use-safety.sh` | 114 |
| Doc Sync | PostToolUse (Bash) | `auto-doc-sync.sh` | 203 |
| Phase Progress | PostToolUse (Write/Edit) | `phase-progress.sh` | ~110 |
| Analytics Tracker | PostToolUse (all) | `post-tool-use-tracker.sh` | 197 |
| State Bridge | PostToolUse (Write/Edit) | `state-transition.sh` | 89 |
| Craft Progress | PostToolUse (Write/Edit) | `craft-progress.sh` | 85 |
| Notification | Notification (*) | `notification-handler.sh` | ~60 |

### Commands (14 files)

| Module | Responsibility | Key Files |
|--------|---------------|-----------|
| Craft Pipeline (8) | 파이프라인 실행/제어 | `craft.md`, `craft-analyze.md`, `craft-design.md`, `craft-preview.md`, `craft-deploy.md`, `craft-sync.md`, `craft-state.md`, `craft-export.md` |
| Dev Lifecycle (6) | 기능/버그/릴리스 워크플로우 | `feature.md`, `bugfix.md`, `release.md`, `phase.md`, `dev-doc-planner.md`, `git-workflow.md` |

### Templates (2 stacks)

| Module | Stack | Key Files |
|--------|-------|-----------|
| SvelteKit Dashboard | SvelteKit + Vite | `templates/sveltekit-dashboard/` (package.json, svelte.config.js, src/) |
| Astro Landing | Astro | `templates/astro-landing/` (package.json, astro.config.mjs, src/) |
| Token Schema | YAML | `templates/_tokens/content.schema.yaml`, `tokens.schema.yaml` |

### Design Presets

| Module | Contents | Key Files |
|--------|----------|-----------|
| Domain Profiles | 8개 도메인 -> 디자인 프리셋 매핑 | `design/domain-profiles/index.yaml` |
| Palettes | 4개 컬러 팔레트 | `design/palettes/*.yaml` (automation, plugin-tool, ai-ml, terminal) |
| Typography | 프리셋별 타이포그래피 | `design/typography/*.yaml` |
| Layouts | 레이아웃 아키타입 | `design/layouts/*.yaml` |

## Data Flow

### Phase 1->2->3->4 Pipeline

```
Source Git Repo
     │
     ▼
Phase 1: ANALYZE (3 agents parallel + experience-interviewer)
┌─────────────────────────────────────────────────────┐
│                                                     │
│  code-analyst ──► analysis/architecture.md           │
│  (Codex opt.)    (기술스택, 아키텍처, 설계 의사결정)  │
│                                                     │
│  story-analyst ──► analysis/narrative.md             │
│  (Claude)        (내러티브, 마일스톤, 임팩트)         │
│                                                     │
│  stack-detector ──► analysis/stack-profile.md        │
│  (Codex opt.)    (프레임워크, 템플릿 추천)            │
│                                                     │
│  Lead ──► analysis/SUMMARY.md                       │
│           (3개 산출물 종합 인사이트)                  │
│                                                     │
│  experience-interviewer ──► analysis/experience-     │
│  (Claude + AskUserQuestion)   blocks.md (선택적)    │
│  (6블록 갭 분석 -> 사용자 인터뷰 -> 경험 구조화)     │
└─────────────────────────────────────────────────────┘
     │ Markdown (사람이 검토 가능한 서술형)
     ▼
Phase 2: DESIGN (design-agent via Gemini)
┌─────────────────────────────────────────────────────┐
│  SUMMARY.md + stack-profile.md                      │
│  + design/domain-profiles/index.yaml                │
│  + design/palettes/*.yaml                           │
│  + design/typography/*.yaml                         │
│  + design/layouts/*.yaml                            │
│         │                                           │
│         ▼                                           │
│  design-agent (Gemini) ──► design-profile.yaml      │
│         │                                           │
│         ▼                                           │
│  [사용자 검토] ── approved ──►                       │
│        │                                            │
│        └── revision ──► (re-enter designing)        │
└─────────────────────────────────────────────────────┘
     │ YAML (사람이 수정 가능, 주석 지원)
     ▼
Phase 3: BUILD (page-writer via Claude, figure-designer via Gemini)
┌─────────────────────────────────────────────────────┐
│  design-profile.yaml + analysis/*.md                │
│  + templates/{template}/                            │
│         │                                           │
│         ▼                                           │
│  page-writer (Claude):                              │
│    ├── content.json   (콘텐츠 데이터, 기계 소비용)   │
│    ├── tokens.css     (--pn-* CSS custom props)     │
│    └── site/          (빌드 가능한 정적 사이트)       │
│                                                     │
│  figure-designer (Gemini):                          │
│    └── diagrams/      (Mermaid .mmd + SVG)          │
└─────────────────────────────────────────────────────┘
     │ JSON + CSS + HTML/JS (기계 소비용)
     ▼
Phase 3.5: VALIDATE (validation-agent via Codex)
┌─────────────────────────────────────────────────────┐
│  5가지 검증:                                         │
│  1. Schema validation (content.json)                │
│  2. Token integrity (tokens.css --pn-* props)       │
│  3. Content quality (PLACEHOLDER 잔존 검사)          │
│  4. Build integrity (package.json, imports)          │
│  5. Cross-reference (template refs vs content keys)  │
│         │                                           │
│    error found? ──YES──► feedback to page-writer     │
│         │                  (re-build + re-validate)  │
│         NO                                          │
│         ▼                                           │
│  [사용자 프리뷰 승인]                                │
└─────────────────────────────────────────────────────┘
     │
     ▼
Phase 4: DEPLOY
┌─────────────────────────────────────────────────────┐
│  site/ ──► GitHub Pages / Vercel / Netlify          │
│         │                                           │
│         ▼                                           │
│  deploy.yaml 생성 (url, target, status)              │
│         │                                           │
│         ▼                                           │
│  /craft-sync ──► portfolio 데이터 동기화             │
│  (content.json -> projects.ts)                      │
└─────────────────────────────────────────────────────┘
```

### Phase별 산출물 형식 전이

```
Markdown (Phase 1, 사람 읽기) -> YAML (Phase 2, 사람 수정) -> JSON+CSS (Phase 3, 기계 소비)
```

Evidence: `CLAUDE.md:28-34` — Phase별 산출물 형식 및 이유 테이블

### Feedback Loops

1. **Validation -> Page-Writer Loop** (Phase 3 <-> 3.5):
   - validation-agent가 error-level 이슈 발견 시 page-writer에게 피드백
   - page-writer가 수정 후 validation.status를 "pending"으로 리셋하여 재검증 트리거
   - Evidence: `.claude/agents/page-writer.md:96-101` — `Validation Awareness` 섹션

2. **Design Review Loop** (Phase 2):
   - design_review에서 사용자가 revision 요청 시 designing 상태로 복귀
   - Evidence: `workspace/.state-schema.yaml:315-317` — `design_review -> designing` (guard: user requested revision)

3. **Pipeline Completion -> Feedback Loop**:
   - `done` 상태 진입 시 learnings capture, ADR 생성, retro 프롬프트
   - Evidence: `.claude/docs/INTEGRATION-MAP.md:80-83` — On Pipeline Completion 섹션

### Hook-Driven Event Flow

```
Tool 호출 (Write/Edit)
  │
  ├── [PreToolUse] pre-tool-use-safety.sh
  │     위험 명령 차단, 민감 파일 경고
  │
  ├── [Tool 실행]
  │
  └── [PostToolUse] 5개 hook 순차 실행
        ├── auto-doc-sync.sh ── CHANGELOG + README 통계
        ├── phase-progress.sh ── Phase TASKS.md 업데이트
        ├── post-tool-use-tracker.sh ── JSONL 메트릭
        ├── state-transition.sh ── State Machine 전이 감지 + Quality Gate
        └── craft-progress.sh ── docs/PROGRESS.md 재생성
```

Evidence: `.claude/docs/INTEGRATION-MAP.md:92-101` — Hook Execution Order

## Design Decisions

### Decision 1: Multi-CLI Distribution (Claude Lead + Codex/Gemini Delegate)

- **Context**: 포트폴리오 생성 파이프라인은 코드 분석, 디자인 생성, 사이트 빌드, 검증이라는 이질적인 작업을 포함한다. 단일 LLM으로 모든 작업을 수행하면 각 작업에 최적화된 모델을 활용할 수 없다.
- **Decision**: Claude Code를 오케스트레이터(Lead)로, Codex CLI를 코드 분석/검증 전용으로, Gemini CLI를 디자인/시각화 전용으로 분리 배치했다. Codex는 항상 `--sandbox read-only`로 실행하여 분석만 수행하고, 모든 파일 수정은 Claude가 담당한다.
- **Rationale**: 각 CLI의 강점을 극대화한다. Codex는 코드 이해/패턴 분석에 특화, Gemini는 시각적 디자인 생성에 특화, Claude는 종합 판단/코드 생성/사용자 대화에 특화되어 있다. Read-only sandbox는 분석/검증 단계에서의 안전성을 보장한다.
- **Alternatives considered**:
  - (A) Claude 단독 실행: 가능하지만 디자인 생성/코드 분석에서 특화 모델 대비 품질 저하
  - (B) 각 CLI에 쓰기 권한 부여: 산출물 일관성 제어 어려움, 충돌 위험
  - (C) API 직접 호출: CLI 래퍼 대비 통합 복잡도 증가, 비용 관리 어려움
- **Evidence**:
  - `.claude/settings.json:324-327` — `codex: { sandbox: "read-only" }`, `gemini: { auto_accept: true }`
  - `.claude/skills/codex/SKILL.md:87-99` — "foliocraft는 Codex CLI를 통해 절대 파일을 쓰지 않습니다"
  - `.claude/settings.json:328` — `fallback_strategy: "cli_fail_retry_once_then_claude"`

### Decision 2: Configuration-as-Markdown Agent Ecosystem (코드 없는 프레임워크)

- **Context**: 26개 에이전트, 29개 스킬, 13개 커맨드를 정의하고 라우팅해야 한다. 전통적 접근은 코드로 에이전트를 구현하고 레지스트리에 등록하는 방식이지만, Claude Code는 Markdown 기반 에이전트/스킬 시스템을 네이티브로 지원한다.
- **Decision**: 모든 에이전트, 스킬, 커맨드를 Markdown 파일로 정의했다. MANIFEST.md가 키워드 라우팅 인덱스 역할을 하며, 각 에이전트 파일의 MANIFEST 주석(HTML comment)이 키워드를 선언한다. 실행 가능한 자동화는 7개의 Bash shell hook으로 제한했다.
- **Rationale**: (1) 사람이 직접 읽고 수정할 수 있는 투명한 시스템 — 에이전트 행동을 코드 디버깅 없이 Markdown 편집으로 변경 가능. (2) Claude Code의 네이티브 에이전트/스킬 로딩 메커니즘과 완벽 호환. (3) 토큰 최적화 — MANIFEST.md(39 LoC)만 먼저 로드하고, 매칭된 에이전트 파일만 lazy-load.
- **Alternatives considered**:
  - (A) TypeScript/Python 에이전트 프레임워크: 타입 안전성 확보 가능하지만, Claude Code 외부에서 별도 런타임 필요
  - (B) JSON 기반 정의: 기계 파싱 용이하지만 주석 불가, 사람이 편집하기 어려움
  - (C) YAML 기반 정의: 주석 가능하지만 서술형 프로세스 기술에 부적합
- **Evidence**:
  - `.claude/agents/MANIFEST.md:3` — `Compact routing index for 33 agents. Load individual agent files only when matched.`
  - `.claude/agents/code-analyst.md:1` — `<!-- MANIFEST: Keywords(KO): 코드 분석, 아키텍처 ... -->` (HTML comment 기반 키워드 선언)
  - `.claude/settings.json:130` — `agent_manifest: ".claude/agents/MANIFEST.md"` (context-optimizer 설정)

### Decision 3: Phase별 산출물 형식 전환 (Markdown -> YAML -> JSON/CSS)

- **Context**: 파이프라인은 분석(사람 검토) -> 디자인(사람 수정) -> 빌드(기계 소비)라는 단계를 거치며, 각 단계의 산출물 소비자가 다르다.
- **Decision**: Phase 1은 Markdown (근거 포함 서술형), Phase 2는 YAML (주석 가능한 구조화 데이터), Phase 3는 JSON+CSS (브라우저/템플릿이 직접 소비)로 형식을 전환했다.
- **Rationale**: 각 단계의 주요 소비자에게 최적화된 형식을 사용한다. 분석 결과는 사람이 검토해야 하므로 서술형 Markdown이 적합하다. 디자인 프로파일은 사람이 palette 색상 등을 직접 수정할 수 있어야 하므로 주석 지원 YAML이 적합하다. 빌드 산출물은 SvelteKit/Astro 컴포넌트가 import해야 하므로 JSON이 적합하다.
- **Alternatives considered**:
  - (A) 전 과정 JSON: 기계 처리 용이하지만 Phase 1 분석을 사람이 검토하기 어려움
  - (B) 전 과정 Markdown: 사람 친화적이지만 Phase 3에서 파싱 복잡도 증가
  - (C) 전 과정 YAML: 중간 타협이지만, Phase 1의 장문 서술과 Phase 3의 엄격한 스키마 모두에 부적합
- **Evidence**:
  - `CLAUDE.md:28-34` — Phase별 산출물 형식 테이블 (형식 + 이유)
  - `.claude/agents/code-analyst.md:12` — `workspace/{project}/analysis/architecture.md (Markdown)`
  - `.claude/agents/design-agent.md:26` — `workspace/{project}/design-profile.yaml`
  - `.claude/agents/page-writer.md:18-20` — `content.json`, `tokens.css`, `site/`

## Code Metrics

| Metric | Value |
|--------|-------|
| Total Files (excl. .git) | ~197 |
| Total LoC (excl. .git) | ~29,490 |
| Markdown Files | 138 (70.1%) |
| YAML Files | 19 (9.6%) |
| Shell Scripts | 9 (4.6%) |
| JSON Files | 12 (6.1%) |
| Agent Definitions | 29 (+ MANIFEST) |
| Skill Definitions | 23 directories + 6 legacy files |
| Hook Scripts | 7 executable (.sh) |
| Slash Commands | 14 files |
| Template Stacks | 2 (SvelteKit, Astro) |
| Design Domain Profiles | 8 domains |
| State Machine States | 12 |
| State Machine Transitions | 14 rules |
| Quality Gates | 6 (pre-commit, pre-merge, pre-build, pre-deploy, pre-release, post-release) |
| Workspace Projects | 6 (DXTnavis, bim-ontology, cc-initializer, open-pantheon, resumely, ultra-cc-init) |
| settings.json LoC | 333 |
| .state-schema.yaml LoC | 358 |
| CLAUDE.md LoC | 447 |

## Key Files

| File | Role | Notable |
|------|------|---------|
| `CLAUDE.md` (447 LoC) | 시스템 전체 문서 — 파이프라인, 상태 머신, CLI 분배, 컨벤션 | Claude Code가 세션 시작 시 로드하는 마스터 문서. 전체 아키텍처의 단일 진실 소스 |
| `.claude/settings.json` (333 LoC) | 통합 설정 — hooks, agile, phase, sprint, quality-gate, feedback, context-optimizer, craft | 시스템의 모든 동작을 제어하는 중앙 설정. Hook 실행 순서, 품질 게이트 임계값, CLI 모델 설정 포함 |
| `workspace/.state-schema.yaml` (358 LoC) | State Machine 스키마 — 12 states, 14 transitions, sub-tracking (analysis, design, build, validation, deploy, quality_gate, feedback, log) | 전체 파이프라인의 상태 추적 스키마. Guard 조건과 transition 규칙이 reference로 인코딩됨 |
| `.claude/agents/MANIFEST.md` (39 LoC) | 에이전트 라우팅 인덱스 — 33 agents x (KO + EN keywords) | 토큰 최적화의 핵심. 이 파일만 먼저 로드하고 매칭된 에이전트만 lazy-load |
| `.claude/hooks/state-transition.sh` (89 LoC) | State Machine <-> Quality Gate <-> Feedback 브릿지 | `.state.yaml` 변경 감지 -> 상태별 자동화 트리거 (품질 게이트, 피드백 루프, 에러 복구) |
| `.claude/hooks/pre-tool-use-safety.sh` (114 LoC) | 위험 명령 차단 Guard | 16개 위험 패턴 + 9개 보호 파일 패턴. `rm -rf /`, force push, 비밀키 접근 등 차단 |
| `.claude/hooks/post-tool-use-tracker.sh` (197 LoC) | 분석/메트릭 수집 | 모든 도구 호출을 JSONL로 기록. 카테고리(file, shell, agent, skill, web, planning, interaction) 분류 |
| `.claude/skills/codex/SKILL.md` (153 LoC) | Codex CLI 통합 스킬 | Phase별 모델 선택 로직, sandbox 정책, invocation 패턴, fallback 절차 |
| `.claude/skills/gemini/SKILL.md` (227 LoC) | Gemini CLI 통합 스킬 | 디자인/Mermaid/SVG 생성 프롬프트 템플릿, 출력 검증, fallback 절차 |
| `.claude/agents/validation-agent.md` (199 LoC) | Phase 3.5 빌드 검증 에이전트 | 5가지 검증(스키마, 토큰, 콘텐츠 품질, 빌드, 교차참조) + severity 기반 decision logic |
| `.claude/agents/experience-interviewer.md` (214 LoC) | 6블록 경험 구조화 에이전트 | 분석 결과 갭 식별 -> 사용자 인터뷰 -> 경험 데이터 구조화. 파이프라인에서 유일한 대화형 에이전트 |
| `.claude/commands/craft.md` (116 LoC) | 전체 파이프라인 오케스트레이션 커맨드 | Phase 1->4 순차 실행, CLI 분배, 에러 핸들링, resume 로직 |
| `.claude/docs/INTEGRATION-MAP.md` (121 LoC) | State Machine + Hooks + Quality Gate + Feedback 통합 맵 | Hook 실행 순서, 상태 전이별 hook 매핑, 파일 의존성 다이어그램 |
| `design/domain-profiles/index.yaml` (68 LoC) | 8개 도메인 -> 디자인 프리셋 매핑 | automation, plugin-tool, ai-ml, research, saas, devtool, education, simulation |
