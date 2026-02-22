# open-pantheon

**"Where AI gods forge your projects."**

Git 레포 분석 → 포트폴리오 생성 파이프라인 + 개발 라이프사이클 자동화를 하나의 AI 에이전트 생태계로 통합합니다.

- **Portfolio Generation**: 코드/히스토리/도메인 분석 → 프로젝트별 고유 디자인 사이트 자동 생성
- **Dev Lifecycle**: Phase/Sprint 관리, Quality Gates, Feedback Loops, CI/CD
- **Multi-CLI Orchestration**: Claude Code(Lead) + Codex CLI(분석/검증) + Gemini CLI(디자인/시각화)
- **Automation Ecosystem**: 7 hooks, 26 agents, 29 skills, 13 commands

---

## Pipeline

```
Phase 1: Analyze          Phase 2: Design          Phase 3: Build           Phase 4: Deploy
───────────────────       ──────────────────       ──────────────────       ──────────────────
 code-analyst ─┐                                    page-writer
 story-analyst ─┼─→ SUMMARY.md ─→ design-profile ─→ content.json  ─→ site/ ─→ GitHub Pages
 stack-detector─┘     │  .yaml          tokens.css     figure-designer     Vercel / Netlify
                      │(Lead 종합)     (사람 검토/수정)   (Mermaid/SVG)
                      ↓
              experience-interviewer
              (6블록 갭→사용자 질문→experience-blocks.md)
```

### Phase별 산출물 형식

| Phase | 산출물 | 형식 | 이유 |
|-------|--------|------|------|
| 1 — Analyze | architecture.md, narrative.md, stack-profile.md | **Markdown** | 사람이 검토. 근거(파일:라인) 포함 서술형 |
| 2 — Design | design-profile.yaml | **YAML** | 사람이 수정 가능. 주석 지원. 구조화 |
| 3 — Build | content.json | **JSON** | 템플릿 코드가 import. 기계 소비용 |
| 3 — Build | tokens.css | **CSS** | 브라우저가 직접 소비 |
| 3 — Build | site/ | **HTML/CSS/JS** | 빌드 가능한 정적 사이트 |

---

## State Machine

각 프로젝트는 `workspace/{project}/.state.yaml`로 상태를 추적합니다. 스키마: `workspace/.state-schema.yaml`

### State Diagram

```
init → analyzing → analyzed → designing → design_review → building → validating → build_review → deploying → done
                                  ↑              │                       ↑              │
                                  └── revision ──┘                       └── issues ────┘
                                                        + paused, failed, cancelled (any active → special)
```

### Transition Table

| From | To | Guard | Phase |
|------|----|-------|-------|
| `init` | `analyzing` | repo_path is git repo | 1 |
| `analyzing` | `analyzed` | 3 analysis/*.md + SUMMARY.md exist | 1 |
| `analyzed` | `designing` | SUMMARY.md exists | 2 |
| `designing` | `design_review` | design-profile.yaml valid | 2 |
| `design_review` | `building` | user approved | 3 |
| `design_review` | `designing` | user revision | 2 |
| `building` | `validating` | content.json + tokens.css + site/, no PLACEHOLDER | 3.5 |
| `validating` | `build_review` | validation passed | 3.5 |
| `validating` | `building` | error-level issues → feedback | 3 |
| `build_review` | `deploying` | user approved preview | 4 |
| `deploying` | `done` | deploy.yaml with url | 4 |
| any active | `paused` | user interrupt | - |
| `paused` | previous | /craft-state resume | - |
| any active | `failed` | retry_count >= 3 | - |
| `failed` | previous | /craft-state resume --retry | - |

### Quality Gate & Feedback Fields

```yaml
quality_gate:
  pre_build: pending|passed|failed      # building → validating
  pre_deploy: pending|passed|failed     # build_review → deploying
  post_release: pending|passed|failed   # deploying → done

feedback:
  learnings_captured: boolean   # 파이프라인 완료 후 학습 기록
  adr_generated: boolean        # 아키텍처 결정 기록
  retro_completed: boolean      # 회고 완료
```

---

## Hybrid Design System

모든 포트폴리오 사이트는 두 파일로 디자인이 결정됩니다:

### tokens.css — 디자인 토큰
```css
:root {
  --pn-bg-primary: #0d1117;
  --pn-text-primary: #e6edf3;
  --pn-accent: #ea4b71;
  /* ... */
}
```
- 모든 커스텀 프로퍼티는 `--pn-` 프리픽스 사용
- `design-profile.yaml`의 palette + typography를 CSS로 변환

### content.json — 콘텐츠 데이터
```json
{
  "meta": { "title": "n8n", "tagline": "..." },
  "hero": { "headline": "...", "description": "..." },
  "sections": [...]
}
```
- 템플릿 컴포넌트가 import하여 렌더링
- Phase 1 분석 결과를 구조화된 데이터로 변환

---

## Agents (26)

### Craft Pipeline Agents (8)

| Agent | Phase | CLI | 입력 | 출력 | 역할 |
|-------|-------|-----|------|------|------|
| code-analyst | 1 | Codex | Git repo | `analysis/architecture.md` | 기술스택, 아키텍처, 코드 메트릭 분석 |
| story-analyst | 1 | Claude | Git repo | `analysis/narrative.md` | 내러티브, 마일스톤, 임팩트 추출 |
| stack-detector | 1 | Codex | Git repo | `analysis/stack-profile.md` | 프레임워크 감지, 템플릿/스택 추천 |
| experience-interviewer | 1+ | Claude | analysis/*.md | `analysis/experience-blocks.md` | 6블록 갭 분석 → 사용자 인터뷰 → 경험 구조화 |
| design-agent | 2 | Gemini | SUMMARY.md | `design-profile.yaml` | 디자인 프로파일 생성 (팔레트, 타이포, 레이아웃) |
| page-writer | 3 | Claude | design-profile.yaml | `content.json` + `tokens.css` + `site/` | 사이트 빌드 |
| figure-designer | 3 | Gemini | analysis/*.md | `diagrams/` | Mermaid 다이어그램, SVG 시각화 |
| validation-agent | 3.5 | Codex | site/ | validation report | 스키마/콘텐츠/CSS/빌드 검증 |

### Dev Lifecycle Agents (18)

| Agent | 역할 |
|-------|------|
| progress-tracker | Phase+Sprint 통합 진행률 추적 |
| phase-tracker | Phase별 진행 추적, 전환, 체크리스트 검증 |
| dev-docs-writer | DISCOVERY.md 기반 PRD/TECH-SPEC/PROGRESS 생성 |
| project-discovery | 대화 기반 프로젝트 요구사항 파악 → DISCOVERY.md |
| doc-splitter | Phase 폴더/문서 구조 생성 |
| github-manager | gh CLI 기반 이슈/PR/CI/CD/릴리스 관리 |
| analytics-reporter | Agent/Skill 사용 통계 CLI 시각화 |
| commit-helper | Conventional Commits 커밋 메시지 작성 |
| pr-creator | PR 생성 및 설명 작성 |
| branch-manager | GitHub Flow 브랜치/Remote 관리 |
| code-reviewer | 코드 품질/보안/성능/컨벤션 리뷰 |
| test-helper | 단위/통합/E2E 테스트 작성 보조 |
| refactor-assistant | 코드 구조 개선, 디자인 패턴 적용 |
| git-troubleshooter | Git 충돌 해결, 히스토리 복구, 문제 진단 |
| doc-generator | 기술/사용자 문서 생성 |
| doc-validator | 문서 완성도 검증, 누락 확인 |
| readme-helper | README 작성/개선, 배지 생성 |
| work-unit-manager | 세션 변경사항 추적, 원자적 커밋 단위 제안 |

Agent 라우팅: `.claude/agents/MANIFEST.md` (키워드 기반 자동 매칭)

---

## CLI Distribution

```
            Claude Code (Lead) — 오케스트레이션 + 코드 생성
                    │
        ┌───────────┴───────────┐
        ▼                       ▼
  Codex CLI                Gemini CLI
  분석, 검증, 리뷰          디자인, 시각화
  --sandbox read-only      -y (auto)
```

| Phase | Task | Primary CLI | Fallback |
|-------|------|-------------|----------|
| 1 | 코드 분석, 스택 감지 | Codex (`gpt-5-mini` → `gpt-5-codex`) | Claude |
| 2 | 디자인 프로파일 생성 | Gemini (`gemini-2.5-flash` → `gemini-2.5-pro`) | Claude |
| 3 | 다이어그램/SVG | Gemini (`gemini-2.5-flash` → `gemini-2.5-pro`) | Claude |
| 3.5 | 빌드 검증, 코드 리뷰 | Codex (`gpt-5-mini` / `gpt-5-codex`) | Claude |

**Fallback**: CLI 실패 → 1회 재시도 → Claude 내장 도구 대체. `.state.yaml` log에 기록.

CLI 스킬: `.claude/skills/codex/SKILL.md`, `.claude/skills/gemini/SKILL.md`

---

## Slash Commands (13)

### Craft Pipeline Commands

| Command | 설명 |
|---------|------|
| `/craft` | 전체 파이프라인 실행 (Phase 1→2→3→4) |
| `/craft-analyze` | Phase 1만 실행 (3 agents → Markdown) |
| `/craft-design` | Phase 2만 실행 (Markdown → design-profile.yaml) |
| `/craft-preview` | 로컬 빌드 + 서빙 |
| `/craft-deploy` | 배포 (GitHub Pages / Vercel / Netlify) |
| `/craft-sync` | 메인 포트폴리오(`dev/portfolio`)와 데이터 동기화 |
| `/craft-state` | 프로젝트 상태 조회/제어 (inspect, log, reset, resume, pause) |

### Dev Lifecycle Commands

| Command | 설명 |
|---------|------|
| `/feature` | 기능 개발 워크플로우 (Phase + Sprint + Git + 문서 통합) |
| `/bugfix` | 버그 수정 워크플로우 (이슈 분석 → 수정 → PR) |
| `/release` | 릴리스 관리 (버전 관리 + 문서 정리 + 배포) |
| `/phase` | Phase 상태 확인/전환/진행률 |
| `/dev-doc-planner` | 문서 계획 (PRD, TECH-SPEC, PROGRESS 템플릿) |
| `/git-workflow` | Git 워크플로우 (브랜치 전략, 커밋 컨벤션, PR 템플릿) |

---

## Skills (29)

### Craft Skills (2)

| Skill | 역할 |
|-------|------|
| codex | Codex CLI 호출 (Phase 1 분석, Phase 3.5 검증) |
| gemini | Gemini CLI 호출 (Phase 2 디자인, Phase 3 시각화) |

### Dev Lifecycle Skills (21 directories)

| Skill | 역할 |
|-------|------|
| init | 프로젝트 초기화 (6 modes: discover, generate, phase-split) |
| sprint | Sprint 관리 (velocity, burndown, retro) |
| quality-gate | 자동 품질 게이트 (pre-commit, pre-merge, pre-release) |
| agile-sync | Agile 산출물 동기화 (CHANGELOG, README 통계) |
| context-optimizer | 토큰 최적화 (incremental loading, budgets) |
| feedback-loop | 학습/ADR/회고 수집 |
| dev-doc-system | 개발 문서 통합 관리 |
| prompt-enhancer | 프롬프트 향상 (프로젝트 컨텍스트 분석) |
| readme-sync | README 자동 동기화 |
| gh | GitHub CLI 통합 |
| codex-claude-loop | 듀얼 AI 루프 (Claude 구현 ↔ Codex 검증) |
| analytics | 사용 통계 시각화 |
| ccusage | Claude/Codex 토큰 사용량 추적 |
| validate | 설정 검증 |
| repair | 자동 복구 |
| sync-fix | 동기화 복구 |
| doc-confirm | 문서 생성 확인 플로우 |
| skill-creator | 새 skill 생성 |
| subagent-creator | 새 agent 생성 |
| hook-creator | 새 hook 생성 |
| brainstorming | 아이디어 발상/검증 |

### Legacy Skills (6 files)

`commit.md`, `doc.md`, `refactor.md`, `review.md`, `test.md`, `phase-development.md`

---

## Hooks & Automation (7)

| Hook | Event | 역할 |
|------|-------|------|
| pre-tool-use-safety.sh | PreToolUse | 위험 명령 차단 (Bash, Write, Edit) |
| phase-progress.sh | PostToolUse | TASKS.md 변경 → Phase 진행률 업데이트 |
| auto-doc-sync.sh | PostToolUse | Git commit → CHANGELOG + README 통계 동기화 |
| post-tool-use-tracker.sh | PostToolUse | 변경사항 로깅 (analytics) |
| notification-handler.sh | Notification | 알림 처리 |
| state-transition.sh | PostToolUse | **State Machine ↔ Quality Gate 브릿지** |
| craft-progress.sh | PostToolUse | **Craft 파이프라인 진행률 → docs/PROGRESS.md** |

브릿지 동작: `.claude/docs/INTEGRATION-MAP.md` 참조

---

## Quality Gates

| Gate | 시점 | 체크 항목 |
|------|------|-----------|
| pre-commit | 커밋 전 | lint, format, types, secrets |
| pre-merge | 머지 전 | coverage(80%), review 필수, changelog 필수 |
| pre-build | Phase 3→3.5 | content.json 스키마, tokens.css 완성도, PLACEHOLDER 없음 |
| pre-deploy | Phase 3.5→4 | 전체 검증 통과, site/ 빌드, deploy config |
| pre-release | 릴리스 전 | coverage(80%), security scan, 전체 문서 |
| post-release | 릴리스 후 | sprint 아카이브, release notes, 회고 프롬프트 |

---

## Context Optimization

토큰 예산 관리로 효율적인 컨텍스트 로딩:

| Level | Budget | 용도 |
|-------|--------|------|
| quick | 2,000 | 빠른 조회, 상태 확인 |
| standard | 10,000 | 일반 작업 |
| deep | 30,000 | 아키텍처 분석, 리뷰 |
| full | 50,000 | 전체 상태 + 모든 Phase |

Agent 라우팅: MANIFEST.md 키워드 매칭 → 필요한 agent만 lazy-load

---

## Template Stacks

프로젝트 성격에 따라 최적의 프레임워크를 선택합니다.

### 현재 사용 가능

| 템플릿 | 스택 | 대상 프로젝트 타입 | 선택 이유 |
|--------|------|-------------------|-----------|
| sveltekit-dashboard | **SvelteKit** | 인터랙티브 대시보드, 워크플로우 시각화 | 내장 transition, 작은 번들, 애니메이션 |
| astro-landing | **Astro** | 정적 제품 랜딩, 연구 쇼케이스 | 0KB JS 기본, GitHub Pages 최적 |

### 추후 추가 예정

| 템플릿 | 스택 | 대상 |
|--------|------|------|
| nextjs-app | Next.js | React 생태계 프로젝트 (resumely) |
| hugo-research | Hugo | 학술/논문 프로젝트 |
| html-terminal | Plain HTML | CLI/devtool 프로젝트 |
| nuxt-showcase | Nuxt | Vue 프로젝트 |

### 프로젝트별 스택 매핑

| 프로젝트 | 템플릿 | 이유 |
|----------|--------|------|
| n8n | sveltekit-dashboard | 워크플로우 시각화, 애니메이션, 다크 대시보드 |
| DXTnavis | astro-landing | 깔끔한 제품 랜딩, 정적 콘텐츠 |
| bim-ontology | astro-landing | 학술/리서치 스타일 |
| resumely | nextjs-app | 기존 React/Next.js 프로젝트 |
| ai-master-class | sveltekit-dashboard | 커리큘럼 네비게이션, 진행도 애니메이션 |
| physical-unity | sveltekit-dashboard | 시뮬레이션 비주얼 쇼케이스 |

---

## Directory Structure

```
open-pantheon/
├── CLAUDE.md                          ← 이 파일
├── .claude/
│   ├── settings.json                  ← 통합 설정 (hooks, quality-gate, sprint, ...)
│   ├── agents/                        ← 25 에이전트 + MANIFEST
│   │   ├── MANIFEST.md                ← 키워드 라우팅 인덱스
│   │   ├── code-analyst.md            ← Phase 1 (Codex)
│   │   ├── story-analyst.md           ← Phase 1 (Claude)
│   │   ├── stack-detector.md          ← Phase 1 (Codex)
│   │   ├── design-agent.md            ← Phase 2 (Gemini)
│   │   ├── page-writer.md             ← Phase 3 (Claude)
│   │   ├── figure-designer.md         ← Phase 3 (Gemini)
│   │   ├── validation-agent.md        ← Phase 3.5 (Codex)
│   │   ├── progress-tracker.md        ← Dev lifecycle
│   │   ├── phase-tracker.md
│   │   ├── dev-docs-writer.md
│   │   ├── ... (18 more)
│   │   └── details/                   ← 상세 문서
│   ├── commands/                      ← 13 슬래시 커맨드
│   │   ├── craft.md                   ← 전체 파이프라인
│   │   ├── craft-analyze.md ... craft-state.md
│   │   ├── feature.md                 ← Dev lifecycle
│   │   ├── bugfix.md, release.md, phase.md
│   │   ├── dev-doc-planner.md + dev-doc-planner/
│   │   └── git-workflow.md + git-workflow/
│   ├── skills/                        ← 29 스킬
│   │   ├── codex/SKILL.md             ← Codex CLI (분석/검증)
│   │   ├── gemini/SKILL.md            ← Gemini CLI (디자인/시각화)
│   │   ├── init/, sprint/, quality-gate/, ...
│   │   └── commit.md, doc.md, ...     ← Legacy skills
│   ├── hooks/                         ← 7 자동화 훅
│   │   ├── pre-tool-use-safety.sh
│   │   ├── phase-progress.sh
│   │   ├── auto-doc-sync.sh
│   │   ├── post-tool-use-tracker.sh
│   │   ├── notification-handler.sh
│   │   ├── state-transition.sh        ← State Machine 브릿지
│   │   └── craft-progress.sh          ← Craft 진행률 동기화
│   ├── docs/                          ← 프레임워크 문서
│   │   ├── ARCHITECTURE.md
│   │   ├── INTEGRATION-MAP.md         ← State ↔ Hooks 매핑
│   │   └── ...
│   ├── templates/                     ← Phase 템플릿
│   ├── analytics/                     ← 메트릭 데이터
│   ├── logs/                          ← 훅 로그
│   └── scripts/                       ← 유틸리티
├── design/                            ← 디자인 프리셋
│   ├── palettes/
│   ├── typography/
│   ├── layouts/
│   └── domain-profiles/
├── templates/                         ← 사이트 템플릿
│   ├── _tokens/                       ← 토큰/콘텐츠 스키마
│   ├── sveltekit-dashboard/
│   └── astro-landing/
├── workspace/                         ← 프로젝트별 작업 공간
│   ├── .state-schema.yaml             ← 상태 파일 스키마
│   └── {project}/
│       ├── .state.yaml
│       ├── analysis/
│       ├── design-profile.yaml
│       ├── content.json
│       ├── tokens.css
│       └── site/
├── references/
└── examples/
```

---

## Portfolio Integration

open-pantheon으로 생성된 사이트는 메인 포트폴리오(`/home/coffin/dev/portfolio`)와 연동됩니다.

### 데이터 흐름

```
open-pantheon                           portfolio
workspace/{project}/                    src/data/
├── content.json  ──→ /craft-sync ──→   ├── projects.ts  (PortfolioSite[])
├── deploy.yaml   ──→             ──→   └── resume.ts    (mainProjects[].live)
└── site/         ──→ 배포 URL
```

### 매핑 규칙

| open-pantheon (content.json) | portfolio (PortfolioSite) |
|------------------------------|--------------------------|
| `meta.title` | `title` |
| `meta.tagline` | `desc` |
| `tech_stack[].name` | `tech[]` |
| `deploy.url` | `url` |
| `deploy.status` | `status` |
| `features[].title` (top 3) | `projects[]` |

### deploy.yaml

`/craft-deploy` 실행 후 자동 생성. `/craft-sync`가 이 파일을 읽어 portfolio를 업데이트합니다.

---

## Conventions

- **CSS 프리픽스**: 모든 디자인 토큰은 `--pn-` 프리픽스 사용
- **파일 형식**: Phase 1 → Markdown, Phase 2 → YAML, Phase 3 → JSON/CSS
- **근거 포함**: 분석 문서의 모든 주장은 `파일:라인` 형태의 근거 포함
- **PLACEHOLDER 패턴**: 템플릿의 `content.json`, `tokens.css`는 PLACEHOLDER로 시작, page-writer가 교체
- **Workspace 격리**: 각 프로젝트 작업물은 `workspace/{project}/`에 격리
- **커밋 스타일**: Conventional Commits (`feat:`, `fix:`, `docs:` 등)
- **상태 파일**: 모든 상태 전이는 `.state.yaml`에 기록. guard 미충족 시 전이 불가
- **이벤트 로깅**: `.state.yaml` log 배열은 append-only. 모든 CLI 호출, 에러, 전이 기록
- **CLI Fallback**: 외부 CLI 실패 → 1회 재시도 → Claude 대체. fallback은 `cli_fallback` 이벤트로 기록
- **모델 선택**: 각 CLI는 기본 경량 모델 사용. 입력 규모에 따라 자동 업그레이드. `--model`로 수동 오버라이드 가능
- **Hook Safety**: 모든 hook은 graceful degradation. 비필수 hook 실패 시 작업 계속
- **Quality Gate**: 커밋/머지/릴리스/빌드/배포 각 단계에서 자동 품질 검증
