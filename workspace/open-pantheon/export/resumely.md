# open-pantheon — Pantheon Export

> Exported from open-pantheon | 2026-02-22T21:30:00+09:00

---

## Architecture

### Overview

Git 레포 분석 -> 포트폴리오 사이트 자동 생성 파이프라인과 개발 라이프사이클 자동화를 하나의 AI 에이전트 생태계로 통합한 Configuration-as-Code 프레임워크. Claude Code를 Lead Orchestrator로, Codex CLI(분석/검증)와 Gemini CLI(디자인/시각화)를 위임 실행기로 활용하는 Multi-CLI 아키텍처를 채택했다.

### Tech Stack

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

### Architecture

#### Architecture Style: Agent Orchestration + Finite State Machine + Event-Driven Hook Pipeline

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

#### Agent Routing

에이전트 라우팅은 `MANIFEST.md` (`.claude/agents/MANIFEST.md:3-39`) 기반 키워드 매칭으로 동작한다. 33개 에이전트가 한국어/영어 듀얼 키워드로 인덱싱되어 있으며, lazy-load 방식으로 필요한 에이전트만 로드된다.

Evidence: `.claude/agents/MANIFEST.md:3` — `> Compact routing index for 33 agents. Load individual agent files only when matched.`

#### State Machine

12개 상태와 14개 전이 규칙으로 구성된 Finite State Machine이 각 프로젝트의 파이프라인 진행을 추적한다. 모든 전이에는 guard condition이 존재한다.

Evidence: `workspace/.state-schema.yaml:19-37` — `current_state` enum: `init`, `analyzing`, `analyzed`, `designing`, `design_review`, `building`, `validating`, `build_review`, `deploying`, `done`, `paused`, `failed`, `cancelled`

Evidence: `workspace/.state-schema.yaml:293-358` — 14개 transition rules (guard 조건 포함)

#### Hook Pipeline

`settings.json` (`.claude/settings.json:1-52`)이 hook 실행 순서를 정의한다. Write/Edit 도구 호출 시 최대 5개 PostToolUse hook이 순차 실행된다:

1. `auto-doc-sync.sh` — CHANGELOG/README 동기화
2. `phase-progress.sh` — Phase TASKS.md 업데이트
3. `post-tool-use-tracker.sh` — JSONL 메트릭 기록
4. `state-transition.sh` — State Machine 브릿지
5. `craft-progress.sh` — Craft 파이프라인 진행률 동기화

Evidence: `.claude/settings.json:26-44` — PostToolUse matcher for "Write" with 5 hook commands

#### Multi-CLI Distribution

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

### Module Structure

#### Agents (29 definitions + MANIFEST)

| Module | Responsibility | Key Files | LoC (approx) |
|--------|---------------|-----------|--------------|
| Craft Pipeline Agents (8) | Phase 1-3.5 파이프라인 실행 | `code-analyst.md`, `story-analyst.md`, `stack-detector.md`, `design-agent.md`, `page-writer.md`, `figure-designer.md`, `validation-agent.md`, `experience-interviewer.md` | ~3,000 |
| Dev Lifecycle Agents (21) | 커밋, PR, 브랜치, 리뷰, 테스트, 문서 등 | `commit-helper.md`, `pr-creator.md`, `code-reviewer.md`, `progress-tracker.md`, etc. | ~5,500 |
| MANIFEST | 키워드 라우팅 인덱스 | `MANIFEST.md` | 39 |

#### Skills (23 directories + 6 legacy files)

| Module | Responsibility | Key Files | LoC (approx) |
|--------|---------------|-----------|--------------|
| CLI Skills (2) | 외부 CLI 위임 (Codex, Gemini) | `codex/SKILL.md`, `gemini/SKILL.md` | ~380 |
| Lifecycle Skills (21) | 초기화, 스프린트, 품질, 피드백 등 | `init/`, `sprint/`, `quality-gate/`, `feedback-loop/` | ~3,000 |
| Legacy Skills (6) | 단일 파일 스킬 (커밋, 리뷰, 테스트 등) | `commit.md`, `review.md`, `test.md`, `doc.md`, `refactor.md`, `phase-development.md` | ~700 |

#### Hooks (7 scripts)

| Module | Event | Key Files | LoC |
|--------|-------|-----------|-----|
| Safety Guard | PreToolUse | `pre-tool-use-safety.sh` | 114 |
| Doc Sync | PostToolUse (Bash) | `auto-doc-sync.sh` | 203 |
| Phase Progress | PostToolUse (Write/Edit) | `phase-progress.sh` | ~110 |
| Analytics Tracker | PostToolUse (all) | `post-tool-use-tracker.sh` | 197 |
| State Bridge | PostToolUse (Write/Edit) | `state-transition.sh` | 89 |
| Craft Progress | PostToolUse (Write/Edit) | `craft-progress.sh` | 85 |
| Notification | Notification (*) | `notification-handler.sh` | ~60 |

#### Commands (14 files)

| Module | Responsibility | Key Files |
|--------|---------------|-----------|
| Craft Pipeline (8) | 파이프라인 실행/제어 | `craft.md`, `craft-analyze.md`, `craft-design.md`, `craft-preview.md`, `craft-deploy.md`, `craft-sync.md`, `craft-state.md`, `craft-export.md` |
| Dev Lifecycle (6) | 기능/버그/릴리스 워크플로우 | `feature.md`, `bugfix.md`, `release.md`, `phase.md`, `dev-doc-planner.md`, `git-workflow.md` |

#### Templates (2 stacks)

| Module | Stack | Key Files |
|--------|-------|-----------|
| SvelteKit Dashboard | SvelteKit + Vite | `templates/sveltekit-dashboard/` (package.json, svelte.config.js, src/) |
| Astro Landing | Astro | `templates/astro-landing/` (package.json, astro.config.mjs, src/) |
| Token Schema | YAML | `templates/_tokens/content.schema.yaml`, `tokens.schema.yaml` |

#### Design Presets

| Module | Contents | Key Files |
|--------|----------|-----------|
| Domain Profiles | 8개 도메인 -> 디자인 프리셋 매핑 | `design/domain-profiles/index.yaml` |
| Palettes | 4개 컬러 팔레트 | `design/palettes/*.yaml` (automation, plugin-tool, ai-ml, terminal) |
| Typography | 프리셋별 타이포그래피 | `design/typography/*.yaml` |
| Layouts | 레이아웃 아키타입 | `design/layouts/*.yaml` |

### Data Flow

#### Phase 1->2->3->4 Pipeline

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

#### Phase별 산출물 형식 전이

```
Markdown (Phase 1, 사람 읽기) -> YAML (Phase 2, 사람 수정) -> JSON+CSS (Phase 3, 기계 소비)
```

Evidence: `CLAUDE.md:28-34` — Phase별 산출물 형식 및 이유 테이블

#### Feedback Loops

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

#### Hook-Driven Event Flow

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

### Design Decisions

#### Decision 1: Multi-CLI Distribution (Claude Lead + Codex/Gemini Delegate)

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

#### Decision 2: Configuration-as-Markdown Agent Ecosystem (코드 없는 프레임워크)

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

#### Decision 3: Phase별 산출물 형식 전환 (Markdown -> YAML -> JSON/CSS)

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

### Code Metrics

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

### Key Files

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

---

## Narrative

### One-liner
> AI 에이전트 생태계의 진화 삼부작(cc-initializer -> ultra-cc-init -> open-pantheon)의 최종형. Git 레포 분석에서 포트폴리오 사이트 자동 생성까지의 파이프라인과 개발 라이프사이클 자동화를 26개 에이전트, 29개 스킬, 3개 CLI(Claude + Codex + Gemini)로 통합 오케스트레이션하는 AI Native 개발 프레임워크.

### Problem & Solution

#### Problem

AI 코딩 에이전트(Claude Code, Codex CLI, Gemini CLI)는 각각 강력하지만 독립적으로 존재한다. 개발자가 프로젝트를 시작하면 초기화, 문서 생성, Phase 관리, 품질 검증, 배포를 각각 수동으로 설정해야 한다. 더 나아가, 완성된 프로젝트를 포트폴리오로 전환하려면 디자인 결정부터 사이트 빌드까지 전혀 다른 워크플로우가 필요하다.

두 가지 핵심 문제가 존재했다:

1. **포트폴리오 생성의 비효율**: 프로젝트 코드를 분석하고, 디자인을 결정하고, 사이트를 빌드하는 과정이 완전히 수동이었다. 프로젝트마다 고유한 아키텍처와 도메인 특성이 있음에도 불구하고 템플릿 기반의 획일화된 포트폴리오가 생성되었다.

2. **개발 라이프사이클 자동화의 파편화**: Phase 관리, Sprint 추적, Quality Gate, 문서 동기화, Git 워크플로우가 각각 다른 도구와 설정으로 분산되어 있었다. 프로젝트가 늘어날수록 설정의 복잡도가 기하급수적으로 증가했다.

#### Solution

open-pantheon은 3개 AI CLI를 하나의 오케스트레이션 레이어 아래 통합한다:

- **Claude Code** (Lead): 전체 파이프라인 오케스트레이션 + 코드 생성 + 내러티브 추출
- **Codex CLI** (Analyst): 코드 분석, 스택 감지, 빌드 검증 (`--sandbox read-only`)
- **Gemini CLI** (Designer): 디자인 프로파일 생성, SVG/Mermaid 시각화 (`-y` auto-accept)

4-Phase 파이프라인(`Analyze -> Design -> Build -> Deploy`)이 13-state 상태머신으로 추적되며, 각 전이(transition)마다 Quality Gate가 자동으로 적용된다. 실패 시 CLI Fallback(1회 재시도 -> Claude 대체)과 최대 3회 retry가 보장된다.

#### Why This Approach

**"코드가 디자인을 결정한다"** 라는 원칙. 프로젝트의 Git 히스토리, 아키텍처, 도메인 특성을 먼저 분석(Phase 1)한 뒤에야 디자인 프로파일(Phase 2)이 결정된다. automation 도메인은 dark dashboard + neon palette, research 도메인은 clean landing + system typography처럼 프로젝트의 본질이 시각적 정체성을 형성한다. 8개 도메인 프로파일(`design/domain-profiles/index.yaml`)이 이를 자동 매핑한다.

Multi-CLI 아키텍처는 각 AI의 강점을 극대화한다. Codex의 코드 이해력은 분석/검증에, Gemini의 시각적 창의력은 디자인/시각화에, Claude의 종합적 추론력은 오케스트레이션/생성에 배치된다. 단일 AI가 모든 것을 처리하는 대신, 전문화된 역할 분담이 품질과 속도를 모두 향상시킨다.

### Milestones

| Date | Milestone | Impact | Evidence |
|------|-----------|--------|----------|
| 2026-01 | **cc-initializer v1.0 탄생** — Claude Code Project Initializer 최초 릴리스. CLAUDE.md 자동 생성, Phase 관리, Agile 자동화 기초 수립. | 프로젝트 초기화 시간 수동 -> 자동. 초기 agents 5개 + hooks 3개로 시작 | `commit:c2a5fbf` (cc-initializer) 2026-01-06 |
| 2026-01 | **cc-initializer v3.0 Discovery First** — 대화 기반 프로젝트 요구사항 파악 시스템 도입. Phase 기반 개발 워크플로우, doc-splitter 통합 | 프로젝트 분석 -> 문서 생성 -> Phase 분할 자동화 체인 완성 | `commit:1323adc` (cc-initializer) 2026-01-09 |
| 2026-01 | **cc-initializer v4.0-4.5 프레임워크화** — Framework Setup, --sync, --update, GitHub Manager, Analytics 시각화. 26개 agents, 22개 skills로 확장 | 단일 프로젝트 도구 -> 재사용 가능한 프레임워크로 전환 | `commit:ea8ba66` ~ `commit:6222437` (cc-initializer) 2026-01-11 ~ 2026-01-22 |
| 2026-01 ~ 02 | **ultra-cc-init 분기** — Token Optimization(Agent MANIFEST, lean CLAUDE.md, incremental context loading), 2-Tier Document 구조, Codex dual-AI loop 도입 | 토큰 사용량 최적화. 컨텍스트 예산 레벨(2K/10K/30K/50K) 체계화. Multi-AI 협업 패턴 확립 | `commit:dcd5eff` ~ `commit:5d0cfbe` (ultra-cc-init) 2026-01-31 ~ 2026-02-06 |
| 2026-02 | **open-pantheon 통합 탄생** — foliocraft(포트폴리오 파이프라인) + ultra-cc-init(개발 라이프사이클)을 하나의 AI 에이전트 생태계로 합병. 26 agents, 29 skills, 13 commands, 7 hooks, 13-state machine, 3 CLI providers | 두 개의 독립 시스템이 하나의 통합 생태계로. 170개 파일, 22,814줄 단일 초기 커밋 | `commit:a16dc91` (open-pantheon) 2026-02-22 |

### Impact Metrics

| Metric | Value | Source |
|--------|-------|--------|
| 전체 에이전트 수 | 26 (8 craft pipeline + 18 dev lifecycle) | `.claude/agents/MANIFEST.md`: 33행 (일부 미사용 포함, 실제 에이전트 파일 26개) |
| 전체 스킬 수 | 29 (23 directories + 6 legacy files) | `.claude/skills/` 디렉토리: 24 dirs (1 root) + 6 .md files |
| Slash 커맨드 수 | 13 (7 craft + 6 dev lifecycle) | `.claude/commands/`: 14 .md files (dev-doc-planner 포함) |
| Hook 자동화 | 7 (5 ultra 계승 + 2 bridge 신규) | `.claude/hooks/`: 7 .sh files |
| 상태머신 States | 13 (init ~ done + paused/failed/cancelled) | `workspace/.state-schema.yaml`: 23-36행 |
| Quality Gates | 6 (commit, merge, build, deploy, release, post-release) | `.claude/settings.json`: 93-114행 |
| CLI Providers | 3 (Claude Code + Codex CLI + Gemini CLI) | `.claude/settings.json`: 324-327행 |
| 도메인 프로파일 | 8 (automation, plugin-tool, ai-ml, research, saas, devtool, education, simulation) | `design/domain-profiles/index.yaml` |
| 디자인 팔레트 | 4 (automation, plugin-tool, ai-ml, terminal) | `design/palettes/`: 4 .yaml files |
| 템플릿 스택 | 2 active + 4 planned (SvelteKit Dashboard, Astro Landing) | `templates/`: 2 dirs |
| 전체 코드 라인 수 | ~29,500 lines (170 files) | `wc -l` 전체 파일 합계 (`.git` 제외) |
| 진화 과정 총 커밋 | 79 (cc-initializer 38 + ultra-cc-init 40 + open-pantheon 1) | `git log --oneline` 각 레포 |
| 진화 기간 | 47일 (2026-01-06 ~ 2026-02-22) | `git log` 최초 커밋 ~ open-pantheon 초기화 |
| cc-initializer 코드량 | ~21,162 lines | `wc -l` cc-initializer repo |
| ultra-cc-init 코드량 | ~21,607 lines | `wc -l` ultra-cc-init repo |
| open-pantheon 코드량 | ~29,500 lines (통합 후 +37% 증가) | `wc -l` open-pantheon repo |
| Markdown 문서 수 | 138 | `find -name '*.md'` (`.git` 제외) |
| 설정 파일 (JSON) | 12 | `find -name '*.json'` (`.git` 제외) |
| YAML 스키마/프로파일 | 19 | `find -name '*.yaml' -o -name '*.yml'` |

### Hero Content

#### Headline
**Where AI gods forge your projects.**

#### Description
open-pantheon은 3개의 AI CLI(Claude, Codex, Gemini)를 하나의 오케스트레이션 레이어로 통합하여, Git 레포를 분석하면 프로젝트의 본질을 반영한 포트폴리오 사이트를 자동 생성합니다. 동시에 Phase 관리, Sprint 추적, Quality Gate, 자동 문서화까지 개발 라이프사이클 전체를 26개 에이전트가 관리합니다. cc-initializer에서 시작해 ultra-cc-init을 거쳐 open-pantheon으로 완성된, 47일간의 AI Native 개발 생태계 삼부작입니다.

#### Key Achievements
- **Multi-CLI Orchestration**: Claude(오케스트레이션) + Codex(분석/검증) + Gemini(디자인/시각화) — 각 AI의 강점을 극대화하는 역할 분담 아키텍처
- **13-State Machine + Quality Gate 통합**: 모든 파이프라인 전이에 자동 품질 검증. pre-build, pre-deploy, post-release 3중 게이트
- **코드-드리븐 디자인**: 프로젝트 분석 결과가 디자인 결정을 형성. 8개 도메인 프로파일, 4개 팔레트, 3개 타이포그래피가 자동 매핑
- **경험 구조화 (6-Block Thinking)**: experience-interviewer 에이전트가 코드 분석 갭을 식별하고 사용자 인터뷰로 "목표-현상-가설-판단기준-실행-결과" 6블록을 완성
- **47일 삼부작 진화**: cc-initializer(v1~v4.5, 38커밋) -> ultra-cc-init(토큰 최적화, 40커밋) -> open-pantheon(통합 생태계) — 총 79커밋의 연속적 진화

### Technical Challenges

#### 1. Multi-CLI Fallback 전략
**문제**: Codex CLI, Gemini CLI는 외부 의존성이므로 실패 가능성이 상존한다. 네트워크 불안정, 모델 과부하, CLI 미설치 등 다양한 실패 시나리오.
**해결**: 3단계 Fallback — (1) 기본 경량 모델 시도 (gpt-5-mini / gemini-2.5-flash), (2) 1회 재시도, (3) Claude 내장 도구 대체. 모든 fallback은 `.state.yaml` log에 `cli_fallback` 이벤트로 기록. 비필수 hook 실패 시 graceful degradation으로 작업 계속 (`settings.json`: 258-264행).

#### 2. 상태머신과 Hook 브릿지
**문제**: Craft 파이프라인(Phase 1~4 상태 전이)과 Dev Lifecycle(Phase 관리, Sprint, Quality Gate)이 원래 별개 시스템이었다. foliocraft와 ultra-cc-init의 합병 과정에서 두 시스템의 이벤트를 연결해야 했다.
**해결**: `state-transition.sh`와 `craft-progress.sh` 두 개의 bridge hook 신규 도입. `.state.yaml` 변경을 감지하면 Quality Gate 트리거, Feedback Loop 연동, PROGRESS.md 동기화를 자동 실행. Hook 실행 순서가 명확히 정의됨 (`INTEGRATION-MAP.md`).

#### 3. 토큰 컨텍스트 최적화
**문제**: 26개 에이전트, 29개 스킬, 138개 .md 파일을 모두 로드하면 컨텍스트 윈도우를 초과한다. ultra-cc-init 시절부터의 핵심 과제.
**해결**: 4-tier 토큰 예산(quick 2K / standard 10K / deep 30K / full 50K), Agent MANIFEST 키워드 매칭으로 lazy-load, lean CLAUDE.md 템플릿, incremental context loading. 작업 유형에 따라 필요한 에이전트만 선택적으로 활성화 (`settings.json`: 124-155행).

#### 4. 코드에서 디자인까지의 자동 매핑
**문제**: 프로젝트의 도메인 특성을 자동으로 감지하고, 적절한 시각적 정체성(팔레트, 타이포그래피, 레이아웃)을 결정해야 한다.
**해결**: 8개 도메인 프로파일(`design/domain-profiles/index.yaml`)이 프레임워크 감지 결과를 팔레트-타이포-레이아웃-템플릿 조합으로 매핑. 모든 CSS 커스텀 프로퍼티는 `--pn-` 프리픽스로 네임스페이스 격리. `content.schema.yaml`과 `tokens.schema.yaml`이 생성물의 구조를 강제.

#### 5. 두 시스템의 통합 일관성
**문제**: foliocraft(포트폴리오 전용)의 8개 에이전트와 ultra-cc-init(개발 자동화)의 18개 에이전트를 하나로 합치면서, 네이밍 컨벤션, 라우팅 규칙, Hook 이벤트 체계를 통일해야 했다.
**해결**: MANIFEST.md 기반 키워드 라우팅(KO/EN 이중 언어), `.claude/settings.json` 334줄 통합 설정, 7개 Hook의 matcher-event 체계 표준화. 모든 에이전트가 `.state.yaml`의 동일한 스키마(`workspace/.state-schema.yaml`, 358줄)를 공유.

### Story Arc

open-pantheon의 이야기는 2026년 1월 6일, 단 하나의 커밋에서 시작한다.

**cc-initializer (2026-01-06 ~ 2026-01-22)** — "Claude Code Project Initializer"라는 이름으로 태어난 이 프로젝트는 Claude Code 세션을 위한 프로젝트 초기화 도구였다. CLAUDE.md 자동 생성, 기본적인 Phase 관리, Agile 워크플로우가 전부였다. 하지만 38개 커밋 동안 폭발적으로 성장했다. v2.0에서 Agile 자동화가 추가되고, v2.1에서 Phase 기반 개발 시스템이 도입되고, v3.0에서 "Discovery First" 접근법이 확립되었다. v4.0에서는 단일 프로젝트 도구를 넘어 재사용 가능한 프레임워크로 전환되었고, --sync와 --update 옵션으로 다른 프로젝트에 적용할 수 있게 되었다. GitHub Manager, Analytics 시각화, 자동 검색 시스템이 차례로 추가되면서 v4.5에 이르러 20개 이상의 에이전트와 20개 이상의 스킬을 보유한 본격적인 AI 에이전트 프레임워크가 되었다.

**ultra-cc-init (2026-01-31 ~ 2026-02-06)** — cc-initializer가 기능적으로 성숙해지자 새로운 병목이 드러났다. 바로 토큰 컨텍스트 관리다. 20개 넘는 에이전트와 스킬을 모두 로드하면 컨텍스트 윈도우가 포화되었다. ultra-cc-init은 이 문제를 정면으로 해결했다. Agent MANIFEST를 도입하여 키워드 매칭 기반 lazy-loading을 구현했고, lean CLAUDE.md 템플릿으로 초기 로딩을 최소화했으며, 4-tier 토큰 예산 체계(2K~50K)로 작업 유형별 컨텍스트 크기를 제어했다. 동시에 Codex CLI를 dual-AI loop로 통합하여 "Claude가 구현하고 Codex가 검증하는" Multi-AI 협업 패턴을 확립했다.

**open-pantheon (2026-02-22)** — 그리고 세 번째 진화가 일어났다. foliocraft라는 이름으로 별도 개발되던 포트폴리오 생성 파이프라인(Phase 1~4, 8개 craft 에이전트, 상태머신, Gemini CLI 통합)이 ultra-cc-init의 개발 라이프사이클 자동화와 합병된다. 이름은 open-pantheon — "AI 신들이 프로젝트를 단조하는 곳". 단일 초기 커밋에 170개 파일, 22,814줄이 담겼다. 두 시스템을 연결하기 위해 state-transition.sh와 craft-progress.sh라는 bridge hook이 새로 만들어졌고, 13-state 상태머신이 Quality Gate와 Feedback Loop를 통합하여 파이프라인의 모든 단계를 자동으로 검증하게 되었다.

결과적으로 open-pantheon은 47일 동안 3번의 진화를 거친 AI Native 개발 생태계다. cc-initializer의 21,162줄에서 ultra-cc-init의 21,607줄을 거쳐 open-pantheon의 29,500줄로 — 코드는 37% 성장했지만 역할은 근본적으로 확장되었다. 단일 프로젝트 초기화 도구가 Multi-CLI 오케스트레이션 플랫폼이 되었고, 분석-디자인-빌드-배포-생명주기 관리를 하나의 명령어(`/craft`)로 실행할 수 있는 시스템이 되었다.

> "No two projects should look the same. No development workflow should be manual."

이것이 open-pantheon이 47일에 걸쳐 증명하려는 명제다.

---

## Stack Profile

> Phase 1 stack-detector 산출물. 기술 스택 감지, 도메인 분류, 템플릿 추천.
> 생성일: 2026-02-22 | Agent: stack-detector | CLI: Claude (self-analysis)

---

### 1. Primary Stack

open-pantheon은 코드 실행 애플리케이션이 아닌 **AI 에이전트 오케스트레이션 프레임워크**입니다. 주요 기술 자산은 Markdown 에이전트 정의, YAML 설정/스키마, Shell 자동화 훅, 그리고 프론트엔드 사이트 템플릿(SvelteKit, Astro)으로 구성됩니다.

#### Language & Format Distribution

| 유형 | 파일 수 | 라인 수 | 비율 | Confidence |
|------|---------|---------|------|------------|
| Markdown (.md) | 138 | ~25,252 | 86.9% | **HIGH** |
| YAML (.yaml) | 19 | ~1,343 | 4.6% | **HIGH** |
| Shell Script (.sh) | 9 | ~1,578 | 5.4% | **HIGH** |
| JSON (.json/.jsonl) | 13 | ~590 | 2.0% | **HIGH** |
| CSS (.css) | 4 | ~100 | 0.3% | **HIGH** |
| JavaScript (.js/.mjs) | 4 | ~60 | 0.2% | **HIGH** |
| Svelte (.svelte) | 2 | ~70 | 0.2% | **HIGH** |
| Astro (.astro) | 2 | ~70 | 0.2% | **HIGH** |

**총 파일**: 197개 | **총 라인**: ~29,049

> 근거: 프로젝트 루트에서 `find . -type f` 집계. `.git/` 제외.

---

### 2. Framework Detection

#### 2.1 Core Framework: Claude Agent SDK (Configuration-as-Code)

| 항목 | 감지 결과 | 근거 |
|------|----------|------|
| Agent System | 26 agents (Markdown 정의) | `.claude/agents/MANIFEST.md:1-40` — 33 에이전트 라우팅 인덱스 |
| Skill System | 29 skills (21 dirs + 6 legacy + 2 CLI) | `.claude/skills/` 디렉토리 구조 |
| Command System | 13 slash commands | `.claude/commands/` — craft + dev lifecycle |
| Hook System | 7 automation hooks | `.claude/hooks/*.sh` — PreToolUse, PostToolUse, Notification |
| Settings | Centralized JSON config | `.claude/settings.json:1-334` — hooks, agile, phase, sprint, quality-gate 등 |
| State Machine | YAML-based FSM | `workspace/.state-schema.yaml:1-359` — 12 states, 11 transitions, guards |
| **Confidence** | **HIGH** | 프로젝트의 핵심 가치. 전체 파일의 90%+ 가 이 시스템 정의 |

#### 2.2 Template Stack A: SvelteKit 5 + Vite 7

| 항목 | 버전 | 근거 |
|------|------|------|
| SvelteKit | ^2.0.0 | `templates/sveltekit-dashboard/package.json:12` |
| Svelte | ^5.0.0 | `templates/sveltekit-dashboard/package.json:14` |
| Vite | ^7.0.0 | `templates/sveltekit-dashboard/package.json:15` |
| adapter-static | ^3.0.0 | `templates/sveltekit-dashboard/package.json:11` — SSG 전용 |
| **용도** | Dashboard 레이아웃 | `templates/sveltekit-dashboard/svelte.config.js:1-21` |
| **Confidence** | **HIGH** | `package.json` devDependencies 명시 |

#### 2.3 Template Stack B: Astro 5 + Tailwind CSS 4

| 항목 | 버전 | 근거 |
|------|------|------|
| Astro | ^5.0.0 | `templates/astro-landing/package.json:10` |
| Tailwind CSS | ^4.0.0 | `templates/astro-landing/package.json:17` |
| @tailwindcss/vite | ^4.0.0 | `templates/astro-landing/package.json:16` |
| @astrojs/sitemap | ^3.0.0 | `templates/astro-landing/package.json:11` |
| **용도** | Landing page 레이아웃 | `templates/astro-landing/astro.config.mjs:1-12` |
| **Confidence** | **HIGH** | `package.json` dependencies 명시 |

#### 2.4 External CLI Integration

| CLI | 역할 | 모델 | 근거 |
|-----|------|------|------|
| Codex CLI | Phase 1 분석, Phase 3.5 검증 | `gpt-5.2-codex` (기본) | `.claude/skills/codex/references/ultra-codex-patterns.md:14-16` |
| Gemini CLI | Phase 2 디자인, Phase 3 시각화 | `gemini-2.5-flash` (기본) | `.claude/settings.json:326-327` |
| GitHub CLI (`gh`) | 이슈/PR/CI/릴리스 관리 | N/A | `.claude/settings.json:296-319` |
| **Confidence** | **MEDIUM** | 설정에 정의되어 있으나, 외부 CLI 바이너리는 런타임 의존 |

#### 2.5 Design System

| 항목 | 구현 | 근거 |
|------|------|------|
| CSS Custom Properties | `--pn-` 프리픽스 체계 | `templates/_tokens/tokens.schema.yaml:1-106` — 21 required + 4 optional 프로퍼티 |
| Color Palettes | 4 YAML 프리셋 | `design/palettes/automation.yaml`, `plugin-tool.yaml`, `ai-ml.yaml`, `terminal.yaml` |
| Typography | 3 YAML 프리셋 | `design/typography/heading-sans.yaml`, `system-clean.yaml`, `mono-terminal.yaml` |
| Layouts | 2 YAML 프리셋 | `design/layouts/dashboard.yaml`, `landing.yaml` |
| Domain Profiles | 8 domains mapped | `design/domain-profiles/index.yaml:1-68` |
| Content Schema | YAML-defined JSON contract | `templates/_tokens/content.schema.yaml:1-139` |
| **Confidence** | **HIGH** | 스키마와 프리셋 파일 모두 존재. 템플릿이 토큰 소비 확인 |

---

### 3. Shell Automation Layer

#### Hook Architecture (Bash)

| Hook | 라인 수 | 이벤트 | 핵심 기능 | 근거 |
|------|---------|--------|----------|------|
| `pre-tool-use-safety.sh` | 114 | PreToolUse | 위험 명령 차단 (20 패턴), 보호 파일 감지 (8 패턴) | `.claude/hooks/pre-tool-use-safety.sh:26-58` |
| `state-transition.sh` | 89 | PostToolUse | `.state.yaml` 변경 감지 → 상태 전이 로깅 + 자동화 트리거 | `.claude/hooks/state-transition.sh:1-89` |
| `craft-progress.sh` | 85 | PostToolUse | workspace 변경 → `docs/PROGRESS.md` 자동 생성 (ASCII 진행바) | `.claude/hooks/craft-progress.sh:34-83` |
| `analytics-visualizer.sh` | 505 | Script | JSONL 메트릭 → CLI 차트 (sparkline, bar, percentage) | `.claude/scripts/analytics-visualizer.sh:1-505` |
| `phase-progress.sh` | - | PostToolUse | TASKS.md 변경 → Phase 진행률 업데이트 | `.claude/hooks/phase-progress.sh` |
| `auto-doc-sync.sh` | - | PostToolUse | Git commit → CHANGELOG + README 통계 동기화 | `.claude/hooks/auto-doc-sync.sh` |
| `post-tool-use-tracker.sh` | - | PostToolUse | 변경사항 JSONL 로깅 | `.claude/hooks/post-tool-use-tracker.sh` |
| `notification-handler.sh` | - | Notification | 알림 처리 | `.claude/hooks/notification-handler.sh` |

**Shell 특성**:
- `set -euo pipefail` 사용 (strict mode): `state-transition.sh:6`, `craft-progress.sh:6`
- `jq` 선택적 의존 (fallback 파싱 구현): `analytics-visualizer.sh:49-54`
- ANSI escape code 기반 CLI UI: `analytics-visualizer.sh:25-43`
- **Confidence**: **HIGH**

---

### 4. Data Format Stack

| 형식 | 용도 | Phase | 근거 |
|------|------|-------|------|
| **Markdown** | Agent 정의, 분석 산출물, 커맨드, 스킬, 문서 | 1 (산출물), 전체 (시스템 정의) | 138개 파일, 25K+ 라인 |
| **YAML** | 상태 스키마, 디자인 프리셋, 팔레트, 타이포, 레이아웃, 설정 | 2 (design-profile), 전체 (config) | `workspace/.state-schema.yaml`, `design/**/*.yaml` |
| **JSON** | settings.json, content.json, plugin.json, metrics.jsonl | 3 (content), 전체 (config) | `.claude/settings.json`, `templates/_tokens/content.schema.yaml` |
| **CSS** | Design tokens (`--pn-*`), 컴포넌트 스타일 | 3 (tokens.css) | `templates/*/src/*/tokens.css` |
| **Svelte** | SvelteKit dashboard 템플릿 컴포넌트 | 3 (site build) | `templates/sveltekit-dashboard/src/routes/+page.svelte:1-62` |
| **Astro** | Astro landing 템플릿 페이지/레이아웃 | 3 (site build) | `templates/astro-landing/src/pages/index.astro:1-57` |

---

### 5. Architecture Patterns

#### 5.1 State Machine (YAML FSM)

- 12 states, 11 transition rules with guards
- Append-only event log (`log[]`)
- Quality gate integration (`pre_build`, `pre_deploy`, `post_release`)
- Feedback loop fields (`learnings`, `adr`, `retro`)
- 근거: `workspace/.state-schema.yaml:19-37` (states), `293-358` (transitions)
- **Confidence**: **HIGH**

#### 5.2 Multi-CLI Orchestration

- Claude Code = Lead orchestrator
- Codex CLI = 분석/검증 (read-only sandbox)
- Gemini CLI = 디자인/시각화 (auto-accept)
- Fallback chain: CLI fail → 1 retry → Claude fallback
- 근거: `.claude/settings.json:324-328` (cli_distribution), `CLAUDE.md` Pipeline 섹션
- **Confidence**: **HIGH**

#### 5.3 Configuration-as-Code

- 에이전트 = Markdown 파일 (frontmatter + 구조화된 역할/프로세스 정의)
- 라우팅 = MANIFEST.md 키워드 매칭
- 설정 = 단일 settings.json (334줄, 15개 최상위 설정 카테고리)
- 훅 = Shell 스크립트 + JSON 매칭 규칙
- 근거: `.claude/settings.json:2-52` (hooks config), `.claude/agents/MANIFEST.md:1-40` (routing)
- **Confidence**: **HIGH**

#### 5.4 Design Token System

- 모든 시각적 속성은 `--pn-*` CSS custom properties로 추상화
- `design-profile.yaml` → `tokens.css` 변환 파이프라인
- 템플릿이 토큰만 소비 → 프로젝트별 고유 디자인 자동 적용
- 근거: `templates/_tokens/tokens.schema.yaml:8-92`, `templates/sveltekit-dashboard/src/lib/styles/tokens.css:1-34`
- **Confidence**: **HIGH**

---

### 6. Domain Classification

#### Primary Domain: **devtool**

| 판정 근거 | 상세 |
|----------|------|
| 프로젝트 성격 | AI 에이전트 기반 개발 도구/프레임워크. CLI 오케스트레이션으로 포트폴리오 사이트를 자동 생성 |
| 사용자 타겟 | 개발자 (자신의 Git 레포를 분석하여 포트폴리오 생성) |
| 인터페이스 | CLI-first (Claude Code, Codex CLI, Gemini CLI, gh CLI) |
| 실행 환경 | 터미널/셸 — 모든 자동화가 bash hook 기반 |
| domain-profiles 매핑 | `design/domain-profiles/index.yaml:45-51` — "CLI tools, terminals, development utilities" |
| **Confidence** | **HIGH** |

#### Secondary Domains

| Domain | 관련도 | 이유 |
|--------|--------|------|
| automation | HIGH | 7 hooks, state machine, CI/CD pipeline — 자동화가 핵심 기능 |
| ai-ml | MEDIUM | Multi-LLM 오케스트레이션 (Claude + Codex + Gemini) — AI가 도구이지만 ML 모델 자체는 아님 |

---

### 7. Template Recommendation

#### Recommended: `sveltekit-dashboard`

| 기준 | 판정 | 근거 |
|------|------|------|
| **도메인 매핑** | devtool → `sveltekit-dashboard` | `design/domain-profiles/index.yaml:50` |
| **시각화 필요** | HIGH — 파이프라인 흐름, 에이전트 관계, 상태 머신 다이어그램 | State diagram (12 states), Pipeline diagram (4 phases), Agent manifest (33 entries) |
| **인터랙티브 요소** | HIGH — 에이전트 라우팅 탐색, 파이프라인 단계별 전환 애니메이션 | SvelteKit 내장 transition + store로 상태 시각화 가능 |
| **데이터 밀도** | HIGH — 26 agents, 29 skills, 7 hooks, 13 commands, 8 domains, 2 templates | Dashboard의 카드 그리드가 메트릭 표현에 최적 |
| **프로젝트 정체성** | "AI gods forge your projects" — 다크 대시보드 + 네온 강조색이 시스템/도구 느낌 부각 | `design/palettes/terminal.yaml` 또는 `automation.yaml` 적용 |

#### Alternative Considered: `astro-landing`

| 기준 | 판정 | 기각 이유 |
|------|------|----------|
| 정적 콘텐츠 | 적합 | 시스템의 복잡도를 표현하기에 단일 랜딩은 부족 |
| 0KB JS | 장점이지만 | 파이프라인 시각화, 에이전트 탐색 등 인터랙션이 필수적 |
| SEO | 장점 | Dashboard도 adapter-static으로 SSG 가능 |

#### Recommended Design Presets

| 요소 | 추천 프리셋 | 이유 |
|------|-----------|------|
| Palette | `terminal` | CLI-first 도구. 다크 배경(#0d0d0d) + coral/teal 강조. `design/palettes/terminal.yaml:1-42` |
| Typography | `mono-terminal` | 코드/CLI 미학. JetBrains Mono 헤딩. `design/typography/mono-terminal.yaml:1-37` |
| Layout | `dashboard` | 카드 그리드 + 메트릭 카드 + 아키텍처 다이어그램. `design/layouts/dashboard.yaml:1-39` |

#### Key Sections to Showcase

| 섹션 | 콘텐츠 소스 | 시각화 방식 |
|------|------------|-----------|
| Hero | "Where AI gods forge your projects" + 파이프라인 개요 | 터미널 타이핑 애니메이션 |
| Pipeline Flow | Phase 1→2→3→4 다이어그램 | Mermaid flowchart + 단계별 상태 색상 |
| Agent Ecosystem | 26 agents, 8 craft + 18 dev lifecycle | Interactive card grid (필터: phase, role, CLI) |
| Metrics | 197 files, 29K lines, 29 skills, 7 hooks, 13 commands | KPI metric cards row |
| State Machine | 12 states, 11 transitions | Mermaid state diagram + transition table |
| Design System | --pn-* tokens, 4 palettes, 3 typography, 2 layouts, 8 domains | Color swatch grid + live token preview |
| Tech Stack | Claude + Codex + Gemini + SvelteKit + Astro | Icon grid with version badges |
| Architecture | Multi-CLI orchestration, hook pipeline, state bridge | System architecture diagram |

---

### 8. Build & Deploy Characteristics

| 항목 | 값 | 근거 |
|------|-----|------|
| Package Manager | npm (추정) | `templates/*/package.json` — lockfile 미존재 |
| Build Tool | Vite 7 | `templates/sveltekit-dashboard/package.json:15` |
| Static Output | SSG (adapter-static) | `templates/sveltekit-dashboard/svelte.config.js:1-3` |
| Deploy Targets | GitHub Pages, Vercel, Netlify | `workspace/.state-schema.yaml:180-181` |
| CI/CD | GitHub Actions (gh CLI 통합) | `.claude/settings.json:309-313` |
| **Confidence** | **MEDIUM** — 템플릿 기준. 프레임워크 자체에 빌드는 없음 |

---

### 9. Dependency Analysis

#### Runtime Dependencies (Template)

| 패키지 | 버전 | 템플릿 | 유형 |
|--------|------|--------|------|
| svelte | ^5.0.0 | sveltekit-dashboard | devDependency |
| @sveltejs/kit | ^2.0.0 | sveltekit-dashboard | devDependency |
| @sveltejs/adapter-static | ^3.0.0 | sveltekit-dashboard | devDependency |
| vite | ^7.0.0 | sveltekit-dashboard | devDependency |
| astro | ^5.0.0 | astro-landing | dependency |
| @astrojs/sitemap | ^3.0.0 | astro-landing | dependency |
| tailwindcss | ^4.0.0 | astro-landing | devDependency |
| @tailwindcss/vite | ^4.0.0 | astro-landing | devDependency |

#### System Dependencies (Runtime)

| 도구 | 용도 | 필수 여부 |
|------|------|----------|
| `bash` | Hook 실행, 스크립트 자동화 | 필수 |
| `git` | 레포 분석, 히스토리 추적 | 필수 |
| `jq` | JSONL 메트릭 파싱 (fallback 있음) | 선택 |
| `gh` | GitHub 이슈/PR/CI 관리 | 선택 (GitHub 기능 사용 시 필수) |
| `codex` | Phase 1/3.5 외부 분석/검증 | 선택 (Claude fallback) |
| `gemini` | Phase 2/3 디자인/시각화 | 선택 (Claude fallback) |
| `node/npm` | 템플릿 빌드 (site 생성 시) | Phase 3에서 필수 |

---

### 10. Uniqueness Factors

open-pantheon의 포트폴리오는 일반 프로젝트와 다른 메타적 특성을 가집니다:

1. **자기 참조적(Self-referential)**: 포트폴리오를 만드는 도구 자체의 포트폴리오. 도구가 자신을 분석하고 자신의 사이트를 생성
2. **Configuration-as-Code 중심**: 실행 코드보다 선언적 설정이 핵심 가치. 에이전트 = Markdown, 스키마 = YAML, 토큰 = CSS
3. **Multi-LLM Orchestration**: 단일 AI가 아닌 Claude + Codex + Gemini 3중 오케스트레이션
4. **Pipeline-as-Product**: 4-phase 파이프라인 자체가 제품. 입력(Git repo) → 출력(Portfolio site)
5. **Extensible Ecosystem**: 26 agents, 29 skills, 13 commands, 7 hooks — 각각 독립적으로 확장 가능

---

### Summary

| 항목 | 값 |
|------|-----|
| **Primary Stack** | Claude Agent SDK (Configuration-as-Code) + Bash Automation |
| **Template Stacks** | SvelteKit 5 / Astro 5 (생성 대상 사이트용) |
| **Domain** | devtool (primary), automation (secondary) |
| **Recommended Template** | `sveltekit-dashboard` |
| **Recommended Palette** | `terminal` |
| **Recommended Typography** | `mono-terminal` |
| **Recommended Layout** | `dashboard` |
| **Total Assets** | 197 files, ~29K lines, 26 agents, 29 skills, 7 hooks, 13 commands |
| **Deploy Target** | GitHub Pages (SSG via adapter-static) |

---

## Summary

### Key Insights

- **3중 아키텍처 패턴**: Agent Orchestration(26 agents) + Finite State Machine(12 states, 14 transitions) + Event-Driven Hook Pipeline(7 hooks). 세 패턴이 레이어로 결합된 Configuration-as-Code 프레임워크
- **Multi-CLI Orchestration**: Claude Code(Lead 오케스트레이터) + Codex CLI(분석/검증, read-only sandbox) + Gemini CLI(디자인/시각화, auto-accept). 각 AI의 강점을 극대화하는 역할 분담. 3단계 Fallback(경량 모델 → 1회 재시도 → Claude 대체)
- **4-Phase Pipeline (Analyze→Design→Build→Deploy)**: Phase별 산출물 형식 전환 — Markdown(사람 검토) → YAML(사람 수정) → JSON+CSS(기계 소비). 각 소비자에게 최적화된 형식
- **47일간 3부작 진화**: cc-initializer(38커밋, 21K줄) → ultra-cc-init(40커밋, 21K줄) → open-pantheon(1커밋, 29.5K줄). 총 79커밋. 프로젝트 초기화 도구 → 개발 라이프사이클 프레임워크 → Multi-CLI 포트폴리오 생성 + 개발 자동화 통합 생태계
- **Configuration-as-Code**: 197파일 중 70%가 Markdown. 에이전트=MD, 스키마=YAML, 토큰=CSS. 코드 디버깅 없이 Markdown 편집으로 에이전트 행동 변경 가능
- **코드-드리븐 디자인**: 8개 도메인 프로파일 × 4개 팔레트 × 3개 타이포 × 2개 레이아웃. `--pn-*` CSS custom properties(21 required tokens)로 프로젝트별 고유 디자인 자동 생성
- **Bridge Hook 아키텍처**: foliocraft(포트폴리오)와 ultra-cc-init(개발 라이프사이클) 합병을 위해 `state-transition.sh` + `craft-progress.sh` 신규 도입. State Machine ↔ Quality Gate ↔ Feedback Loop 자동 연동
- **자기 참조적 시스템**: 포트폴리오를 만드는 도구가 자기 자신의 포트폴리오를 생성. experience-interviewer가 코드 분석 갭을 6블록으로 구조화하는 유일한 대화형 에이전트

### Recommended Template

`sveltekit-dashboard` — 높은 데이터 밀도(26 agents, 29 skills, 7 hooks, 13 commands), 파이프라인 시각화, 에이전트 인터랙티브 탐색, 상태머신 다이어그램 등 대시보드 레이아웃이 최적.

**디자인 프리셋**: `terminal` 팔레트(다크 #0d0d0d + coral/teal 강조) + `mono-terminal` 타이포(JetBrains Mono) + `dashboard` 레이아웃

### Design Direction

- **Palette**: `terminal` — 다크 배경(#0d0d0d) + coral/teal 강조. CLI-first 도구의 정체성 반영. "Where AI gods forge your projects" 컨셉에 맞는 신비로운 다크 대시보드
- **Typography**: `mono-terminal` — JetBrains Mono 헤딩 + 시스템 본문. 코드/CLI 미학
- **Layout**: Dashboard — Hero(터미널 타이핑 애니메이션) → Pipeline Flow(Phase 1→4 Mermaid) → Agent Ecosystem(인터랙티브 카드 그리드) → Metrics(KPI 카드) → State Machine(상태 다이어그램) → Design System(토큰 프리뷰) → 3부작 진화 타임라인

### Notable

- **197파일, 29,500줄 단일 초기 커밋**: foliocraft + ultra-cc-init 합병의 결과. 전체가 단일 `feat: initialize open-pantheon` 커밋
- **13 Slash Commands**: craft 파이프라인 7개 + dev lifecycle 6개. `/craft` 하나로 Phase 1→4 전체 실행
- **6 Quality Gates**: pre-commit → pre-merge → pre-build → pre-deploy → pre-release → post-release. 모든 단계에서 자동 품질 검증
- **Workspace 격리**: 각 프로젝트(resumely, DXTnavis, bim-ontology 등)가 `workspace/{project}/`에 독립 `.state.yaml`로 상태 관리
- **Hook 실행 순서 명시**: Write/Edit 시 5개 PostToolUse hook 순차 실행. INTEGRATION-MAP.md에 문서화
- **경험 인터뷰어 차별점**: 파이프라인에서 유일한 대화형 에이전트. 분석 결과의 갭을 6블록(목표/현상/가설/판단기준/실행/결과)으로 구조화
- **nextjs-app 템플릿 미구현**: resumely에 필요한 Next.js 템플릿이 아직 planned 상태. 추가 개발 필요

---

## Experience Blocks

> cc-initializer + ultra-cc-init + open-pantheon 통합 인터뷰 결과
> 2라운드 인터뷰, 7개 질문으로 5개 경험 구조화

---

### Experience 1: 97% 토큰 최적화 — Five Pillars Architecture

**프로젝트**: ultra-cc-init (cc-initializer v5.0~v5.1)

#### 목표 [O]
세션 초기화 토큰 97% 절감 (38K → 1.1K). 매 턴 CLAUDE.md 토큰 82% 절감 (1,700 → 300). "기능을 추가할수록 성능이 저하되는" 역설 해결.

#### 현상 [O]
25개 agent, 27개 skill, 6개 hook 전체가 세션 시작 시 로드되어 ~38,000 토큰 소비. 컨텍스트 윈도우의 ~38%가 프레임워크 오버헤드로 낭비. 복잡한 멀티파일 작업에서 맥락 유실과 응답 품질 저하 발생.

#### 원인 가설 [O]
점진적으로 실험하며 Claude와 Codex의 모델별 타겟 성능 차이를 확인. Context window가 매우 큰 Codex를 연계하면 Claude의 컨텍스트 부담을 분산할 수 있다는 가설. Database의 인덱스 패턴(full table scan 회피)과 OS의 demand paging(필요 시점 로드)에서 lazy-load 아키텍처 영감.

#### 판단 기준 [O]
4-tier 토큰 예산(2K/10K/30K/50K)은 실사용 세션에서 반복 실험하며 수렴한 값. Claude의 응답 품질이 유지되는 최소 컨텍스트(quick 2K), 일반 작업 충분량(standard 10K), 아키텍처 분석 필요량(deep 30K), 전체 상태 로드(full 50K)로 경험적으로 결정. Codex의 큰 context window를 활용하여 Claude의 부담을 줄이는 전략이 판단 기준.

#### 실행 [O]
Five Pillars를 하루 만에 5개 커밋으로 집중 구현:
1. Agent MANIFEST (38K → 500 토큰 라우팅 테이블)
2. Lean CLAUDE.md (8개 변수 템플릿, 300 토큰)
3. Incremental Loading (4-tier 예산)
4. 2-Tier Document (Header ~50줄 + Detail on-demand, 8개 파일 평균 90% 절감)
5. Structured Data (산문 → 테이블 변환, 9개 파일 73% 라인 절감)

#### 결과 [O]
- 세션 초기화: 38K → 1.1K (97% 절감)
- Per-turn: 1,700 → 300 토큰 (82% 절감)
- 총 5,400+ 라인 최적화
- v5.0 "역성장 릴리스": 순 2,434줄 감소 (기능 100%, 비용 3%)
- Codex CLI로 6개 내부 비일관성 발견/수정 (commit `adb3d11`)

---

### Experience 2: Multi-CLI 오케스트레이션 — Claude + Codex + Gemini

**프로젝트**: open-pantheon (ultra-cc-init에서 시작)

#### 목표 [O]
각 AI CLI의 강점을 극대화하는 역할 분담 아키텍처 구축. 단일 AI의 자기 검증 한계 돌파.

#### 현상 [O]
단일 Claude Code가 코드 분석, 디자인 생성, 빌드 검증을 모두 수행. 동일 모델의 blind spot 공유로 특정 유형의 버그/결함을 체계적으로 놓침. 디자인 생성과 코드 검증에서 특화 모델 대비 품질 저하.

#### 원인 가설 [O]
Claude가 코드 작성에 능숙하고, Codex가 Critical한 부분과 자세히 봐야 하는 부분에 능숙한 것을 확인. Gemini는 디자인에 유리한 것을 관찰. 각 CLI의 강점/약점을 실사용에서 파악한 후 역할 분배를 설계. 서로 다른 모델 아키텍처(Claude vs GPT-5-codex vs Gemini)를 사용하면 blind spot이 중첩되지 않는다는 가설.

#### 판단 기준 [O]
Codex가 6개 내부 불일치를 발견한 경험(commit `adb3d11`)이 결정적 계기. 이 성공 사례로 "검증 전용 CLI"의 가치가 입증됨. Codex는 `--sandbox read-only`로 안전성 보장, Gemini는 `-y` auto-accept로 비대화형 디자인 생성, Claude는 모든 파일 수정과 오케스트레이션 담당이라는 명확한 경계 설정.

#### 실행 [O]
- Claude Code (Lead): 전체 오케스트레이션 + 코드 생성 + 내러티브 추출
- Codex CLI (Analyst): Phase 1 코드 분석, Phase 3.5 빌드 검증 (`--sandbox read-only`)
- Gemini CLI (Designer): Phase 2 디자인 프로파일, Phase 3 SVG/Mermaid 시각화 (`-y`)
- 3단계 Fallback: 경량 모델 → 1회 재시도 → Claude 대체
- 모든 CLI 호출/fallback을 `.state.yaml` log에 이벤트 기록

#### 결과 [O]
- 버그 사전 발견율 증가: 단일 AI 대비 교차 검증으로 발견하는 문제의 양과 질 향상
- 역할 분담으로 속도 향상: 각 CLI가 전문 영역에 집중하여 파이프라인 전체 속도 체감 개선
- AI 산출물 신뢰도 증가: 다른 모델이 검증한다는 구조적 보장으로 결과물에 대한 신뢰 복합적으로 향상

---

### Experience 3: Configuration-as-Code — 코드 없는 AI Agent 프레임워크

**프로젝트**: cc-initializer에서 시작 → ultra-cc-init → open-pantheon으로 계승

#### 목표 [O]
런타임 소스 코드 없이, Markdown + Shell + JSON만으로 25+ agents, 27+ skills, 6+ hooks 생태계 구현. 어떤 프로젝트에든 `.claude/` 디렉토리 복사만으로 적용 가능한 이식성.

#### 현상 [O]
Claude Code에는 프로젝트 초기화 프레임워크가 없었음. 매 프로젝트마다 `.claude/` 설정을 처음부터 수동 구성. 프로젝트 간 일관성 부재. Phase 관리, Sprint 추적, Quality Gate 등 개발 라이프사이클 자동화 부재.

#### 원인 가설 [O]
Claude Code 런타임이 Markdown을 에이전트 프롬프트로 해석하는 네이티브 메커니즘을 이미 보유. 별도 런타임이 불필요하다는 판단. `.claude/` 디렉토리 구조가 곧 프레임워크가 될 수 있다는 통찰. Convention over Configuration + Declarative Agent 패턴 채택.

#### 판단 기준 [O]
이식성이 결정적 기준. `.claude/` 디렉토리를 통째로 복사하면 어떤 프로젝트에나 즉시 적용 가능(`/init --sync`). TypeScript SDK 같은 코드 기반 접근은 빌드/배포 복잡도, 타겟 프로젝트 의존성 오염 문제. 유일한 trade-off는 JSON 형식으로 write/read 시 토큰 소모가 큰 것이며, 이 외에는 Config-as-Code가 압도적 우위.

#### 실행 [O]
- cc-initializer: 113 Markdown + 7 Shell + 7 JSON = 134파일 (Markdown 84%)
- ultra-cc-init: 117 Markdown + 8 Shell + 7 JSON = 139파일 (Markdown 84%)
- open-pantheon: 138 Markdown + 9 Shell + 12 JSON = 197파일 (Markdown 70%)
- 모든 에이전트 행동이 Markdown 편집으로 변경 가능 — 코드 디버깅 불필요
- settings.json이 17-section 중앙 설정 허브 역할

#### 결과 [O]
- DXTnavis 프로젝트 실제 채택 (PROJECTS.json 등록)
- `/init --sync`로 기존 프로젝트에 원커맨드 적용 검증
- 사람이 읽고 수정 가능한 투명한 시스템 (비개발자도 에이전트 행동 이해 가능)
- JSON write/read 시 토큰 비용이 유일한 trade-off — 이를 2-Tier Document + Structured Data로 상쇄

---

### Experience 4: 47일 삼부작 연속 진화 — AI Native 생태계 구축

**프로젝트**: cc-initializer → ultra-cc-init → open-pantheon (전체)

#### 목표 [O]
AI와 개발자가 함께 일하는 방식에 대한 하나의 답안. 프로젝트 초기화부터 포트폴리오 생성까지 모든 개발 라이프사이클을 AI agent가 관리하는 통합 생태계 구축.

#### 현상 [O]
AI 코딩 도구(Claude Code, Codex CLI, Gemini CLI)가 각각 강력하지만 독립적으로 존재. 매 프로젝트마다 초기화/문서 생성/Phase 관리/품질 검증/배포를 각각 수동 설정. 완성된 프로젝트의 포트폴리오 전환은 전혀 다른 수동 워크플로우.

#### 원인 가설 [O]
3부작은 사전 계획이 아닌 자연스러운 진화의 결과. 각 분기의 트리거는 **범위 확장**:
- cc-initializer: 초기화 도구로 시작 → 기능 확장 중 토큰 폭발 문제 발생
- ultra-cc-init: 토큰 최적화 필요성이 범위를 넘어서면서 별도 프로젝트로 분기
- open-pantheon: 포트폴리오 파이프라인(foliocraft) 추가 요구 + 개발 라이프사이클과의 통합 필요성

#### 판단 기준 [O]
"기존 프로젝트의 범위를 넘어서는 요구가 발생할 때" 새 프로젝트로 분기. cc-initializer는 "초기화"가 핵심 정체성인데 "최적화"는 다른 관심사. ultra-cc-init은 "개발 자동화"인데 "포트폴리오 생성"은 다른 도메인. 범위(scope)의 자연스러운 확장이 분기를 촉발.

#### 실행 [O]
- cc-initializer: 38커밋, 28일, v1.0→v4.5, 134파일 21K줄
- ultra-cc-init: 40커밋, 6일 집중, v5.0→v5.1+, 139파일 21.6K줄
- open-pantheon: 1커밋 단일 초기화 (foliocraft + ultra-cc-init 합병), 197파일 29.5K줄
- 총 79커밋, 47일, 3레포

#### 결과 [O]
- 단일 프로젝트 초기화 도구 → Multi-CLI 오케스트레이션 플랫폼으로 진화
- 코드량 37% 성장 (21K → 29.5K) + 역할 근본적 확장
- 13-state 상태머신 + 6 Quality Gates + 7 Hooks 자동화 체계 완성
- `/craft` 하나로 Phase 1→4 전체 파이프라인 실행 가능

---

### Experience 5: Discovery First + 6블록 경험 구조화

**프로젝트**: cc-initializer v3.0에서 시작 → open-pantheon experience-interviewer로 확장

#### 목표 [O]
AI의 맹목적 코드 생성 방지. "AI가 코드 생성 전에 먼저 프로젝트를 이해해야 한다"는 원칙 확립. 코드 분석으로 추출 가능한 정보와 사람만 아는 정보의 갭을 체계적으로 식별하고 구조화.

#### 현상 [O]
AI가 프로젝트 이해 없이 코드를 생성하면 기존 아키텍처와 충돌하거나 도메인 맥락이 빠진 결과물 생성. 코드 분석만으로는 "왜 이 결정을 했는가", "어떤 대안을 고려했는가"를 알 수 없음.

#### 원인 가설 [O]
코드에서 추출 가능한 정보(아키텍처, 스택, 메트릭)와 사람만 아는 정보(목표, 가설, 판단 기준)의 구조적 갭이 존재. STAR(Situation-Task-Action-Result) 같은 기존 프레임워크는 "원인 가설"과 "판단 기준"이라는 핵심 블록이 빠져 있어 부족.

#### 판단 기준 [O]
6블록 설계는 실제 **국내 자기소개서에서 사용되는 최신 전략**에서 영감. 최근 트렌드가 계속 바뀌면서 기존 STAR 프레임워크로는 부족한 영역이 발생. 특히 "원인 가설"(왜 이 문제가 발생했다고 생각했는가)과 "판단 기준"(어떤 기준으로 이 접근을 선택했는가)이 코드 분석에서 가장 추출하기 어려운 블록이며, 이를 명시적으로 구조에 포함.

#### 실행 [O]
- cc-initializer v3.0: Discovery First 도입 — `project-discovery` agent가 대화 기반으로 DISCOVERY.md 생성
- open-pantheon: experience-interviewer agent 구현
  - 분석 결과에서 6블록 매핑 수행 (O/△/X 판정)
  - 갭이 있는 블록만 사용자에게 AskUserQuestion
  - 최대 3라운드, 라운드당 1-4개 질문
  - 답변을 6블록 형식으로 구조화하여 experience-blocks.md 생성

#### 결과 [O]
- resumely: 5개 경험 x 6블록 = 30블록 중 27블록 [O], 3블록 [△] (정량적 측정 보류)
- 삼부작 통합: 5개 경험 x 6블록 = 30블록 완전 구조화 (2라운드, 7개 질문)
- "코드가 말하지 못하는 것"(가설, 판단 기준)을 체계적으로 수집하는 유일한 대화형 에이전트
- 자기소개서 트렌드 반영으로 국내 개발자 포트폴리오에 최적화된 경험 서술 지원

---

### Gap Summary

| 경험 | 목표 | 현상 | 원인가설 | 판단기준 | 실행 | 결과 |
|------|:----:|:----:|:-------:|:-------:|:----:|:----:|
| 1. 97% 토큰 최적화 | O | O | O | O | O | O |
| 2. Multi-CLI 오케스트레이션 | O | O | O | O | O | O |
| 3. Configuration-as-Code | O | O | O | O | O | O |
| 4. 47일 삼부작 진화 | O | O | O | O | O | O |
| 5. Discovery First + 6블록 | O | O | O | O | O | O |

**인터뷰 후 모든 갭 해소** — 5개 경험 x 6블록 = 30블록 전체 [O]
