# open-pantheon Narrative

## One-liner
> AI 에이전트 생태계의 진화 삼부작(cc-initializer -> ultra-cc-init -> open-pantheon)의 최종형. Git 레포 분석에서 포트폴리오 사이트 자동 생성까지의 파이프라인과 개발 라이프사이클 자동화를 26개 에이전트, 29개 스킬, 3개 CLI(Claude + Codex + Gemini)로 통합 오케스트레이션하는 AI Native 개발 프레임워크.

## Problem & Solution

### Problem

AI 코딩 에이전트(Claude Code, Codex CLI, Gemini CLI)는 각각 강력하지만 독립적으로 존재한다. 개발자가 프로젝트를 시작하면 초기화, 문서 생성, Phase 관리, 품질 검증, 배포를 각각 수동으로 설정해야 한다. 더 나아가, 완성된 프로젝트를 포트폴리오로 전환하려면 디자인 결정부터 사이트 빌드까지 전혀 다른 워크플로우가 필요하다.

두 가지 핵심 문제가 존재했다:

1. **포트폴리오 생성의 비효율**: 프로젝트 코드를 분석하고, 디자인을 결정하고, 사이트를 빌드하는 과정이 완전히 수동이었다. 프로젝트마다 고유한 아키텍처와 도메인 특성이 있음에도 불구하고 템플릿 기반의 획일화된 포트폴리오가 생성되었다.

2. **개발 라이프사이클 자동화의 파편화**: Phase 관리, Sprint 추적, Quality Gate, 문서 동기화, Git 워크플로우가 각각 다른 도구와 설정으로 분산되어 있었다. 프로젝트가 늘어날수록 설정의 복잡도가 기하급수적으로 증가했다.

### Solution

open-pantheon은 3개 AI CLI를 하나의 오케스트레이션 레이어 아래 통합한다:

- **Claude Code** (Lead): 전체 파이프라인 오케스트레이션 + 코드 생성 + 내러티브 추출
- **Codex CLI** (Analyst): 코드 분석, 스택 감지, 빌드 검증 (`--sandbox read-only`)
- **Gemini CLI** (Designer): 디자인 프로파일 생성, SVG/Mermaid 시각화 (`-y` auto-accept)

4-Phase 파이프라인(`Analyze -> Design -> Build -> Deploy`)이 13-state 상태머신으로 추적되며, 각 전이(transition)마다 Quality Gate가 자동으로 적용된다. 실패 시 CLI Fallback(1회 재시도 -> Claude 대체)과 최대 3회 retry가 보장된다.

### Why This Approach

**"코드가 디자인을 결정한다"** 라는 원칙. 프로젝트의 Git 히스토리, 아키텍처, 도메인 특성을 먼저 분석(Phase 1)한 뒤에야 디자인 프로파일(Phase 2)이 결정된다. automation 도메인은 dark dashboard + neon palette, research 도메인은 clean landing + system typography처럼 프로젝트의 본질이 시각적 정체성을 형성한다. 8개 도메인 프로파일(`design/domain-profiles/index.yaml`)이 이를 자동 매핑한다.

Multi-CLI 아키텍처는 각 AI의 강점을 극대화한다. Codex의 코드 이해력은 분석/검증에, Gemini의 시각적 창의력은 디자인/시각화에, Claude의 종합적 추론력은 오케스트레이션/생성에 배치된다. 단일 AI가 모든 것을 처리하는 대신, 전문화된 역할 분담이 품질과 속도를 모두 향상시킨다.

## Milestones

| Date | Milestone | Impact | Evidence |
|------|-----------|--------|----------|
| 2026-01 | **cc-initializer v1.0 탄생** — Claude Code Project Initializer 최초 릴리스. CLAUDE.md 자동 생성, Phase 관리, Agile 자동화 기초 수립. | 프로젝트 초기화 시간 수동 -> 자동. 초기 agents 5개 + hooks 3개로 시작 | `commit:c2a5fbf` (cc-initializer) 2026-01-06 |
| 2026-01 | **cc-initializer v3.0 Discovery First** — 대화 기반 프로젝트 요구사항 파악 시스템 도입. Phase 기반 개발 워크플로우, doc-splitter 통합 | 프로젝트 분석 -> 문서 생성 -> Phase 분할 자동화 체인 완성 | `commit:1323adc` (cc-initializer) 2026-01-09 |
| 2026-01 | **cc-initializer v4.0-4.5 프레임워크화** — Framework Setup, --sync, --update, GitHub Manager, Analytics 시각화. 26개 agents, 22개 skills로 확장 | 단일 프로젝트 도구 -> 재사용 가능한 프레임워크로 전환 | `commit:ea8ba66` ~ `commit:6222437` (cc-initializer) 2026-01-11 ~ 2026-01-22 |
| 2026-01 ~ 02 | **ultra-cc-init 분기** — Token Optimization(Agent MANIFEST, lean CLAUDE.md, incremental context loading), 2-Tier Document 구조, Codex dual-AI loop 도입 | 토큰 사용량 최적화. 컨텍스트 예산 레벨(2K/10K/30K/50K) 체계화. Multi-AI 협업 패턴 확립 | `commit:dcd5eff` ~ `commit:5d0cfbe` (ultra-cc-init) 2026-01-31 ~ 2026-02-06 |
| 2026-02 | **open-pantheon 통합 탄생** — foliocraft(포트폴리오 파이프라인) + ultra-cc-init(개발 라이프사이클)을 하나의 AI 에이전트 생태계로 합병. 26 agents, 29 skills, 13 commands, 7 hooks, 13-state machine, 3 CLI providers | 두 개의 독립 시스템이 하나의 통합 생태계로. 170개 파일, 22,814줄 단일 초기 커밋 | `commit:a16dc91` (open-pantheon) 2026-02-22 |

## Impact Metrics

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

## Hero Content

### Headline
**Where AI gods forge your projects.**

### Description
open-pantheon은 3개의 AI CLI(Claude, Codex, Gemini)를 하나의 오케스트레이션 레이어로 통합하여, Git 레포를 분석하면 프로젝트의 본질을 반영한 포트폴리오 사이트를 자동 생성합니다. 동시에 Phase 관리, Sprint 추적, Quality Gate, 자동 문서화까지 개발 라이프사이클 전체를 26개 에이전트가 관리합니다. cc-initializer에서 시작해 ultra-cc-init을 거쳐 open-pantheon으로 완성된, 47일간의 AI Native 개발 생태계 삼부작입니다.

### Key Achievements
- **Multi-CLI Orchestration**: Claude(오케스트레이션) + Codex(분석/검증) + Gemini(디자인/시각화) — 각 AI의 강점을 극대화하는 역할 분담 아키텍처
- **13-State Machine + Quality Gate 통합**: 모든 파이프라인 전이에 자동 품질 검증. pre-build, pre-deploy, post-release 3중 게이트
- **코드-드리븐 디자인**: 프로젝트 분석 결과가 디자인 결정을 형성. 8개 도메인 프로파일, 4개 팔레트, 3개 타이포그래피가 자동 매핑
- **경험 구조화 (6-Block Thinking)**: experience-interviewer 에이전트가 코드 분석 갭을 식별하고 사용자 인터뷰로 "목표-현상-가설-판단기준-실행-결과" 6블록을 완성
- **47일 삼부작 진화**: cc-initializer(v1~v4.5, 38커밋) -> ultra-cc-init(토큰 최적화, 40커밋) -> open-pantheon(통합 생태계) — 총 79커밋의 연속적 진화

## Technical Challenges

### 1. Multi-CLI Fallback 전략
**문제**: Codex CLI, Gemini CLI는 외부 의존성이므로 실패 가능성이 상존한다. 네트워크 불안정, 모델 과부하, CLI 미설치 등 다양한 실패 시나리오.
**해결**: 3단계 Fallback — (1) 기본 경량 모델 시도 (gpt-5-mini / gemini-2.5-flash), (2) 1회 재시도, (3) Claude 내장 도구 대체. 모든 fallback은 `.state.yaml` log에 `cli_fallback` 이벤트로 기록. 비필수 hook 실패 시 graceful degradation으로 작업 계속 (`settings.json`: 258-264행).

### 2. 상태머신과 Hook 브릿지
**문제**: Craft 파이프라인(Phase 1~4 상태 전이)과 Dev Lifecycle(Phase 관리, Sprint, Quality Gate)이 원래 별개 시스템이었다. foliocraft와 ultra-cc-init의 합병 과정에서 두 시스템의 이벤트를 연결해야 했다.
**해결**: `state-transition.sh`와 `craft-progress.sh` 두 개의 bridge hook 신규 도입. `.state.yaml` 변경을 감지하면 Quality Gate 트리거, Feedback Loop 연동, PROGRESS.md 동기화를 자동 실행. Hook 실행 순서가 명확히 정의됨 (`INTEGRATION-MAP.md`).

### 3. 토큰 컨텍스트 최적화
**문제**: 26개 에이전트, 29개 스킬, 138개 .md 파일을 모두 로드하면 컨텍스트 윈도우를 초과한다. ultra-cc-init 시절부터의 핵심 과제.
**해결**: 4-tier 토큰 예산(quick 2K / standard 10K / deep 30K / full 50K), Agent MANIFEST 키워드 매칭으로 lazy-load, lean CLAUDE.md 템플릿, incremental context loading. 작업 유형에 따라 필요한 에이전트만 선택적으로 활성화 (`settings.json`: 124-155행).

### 4. 코드에서 디자인까지의 자동 매핑
**문제**: 프로젝트의 도메인 특성을 자동으로 감지하고, 적절한 시각적 정체성(팔레트, 타이포그래피, 레이아웃)을 결정해야 한다.
**해결**: 8개 도메인 프로파일(`design/domain-profiles/index.yaml`)이 프레임워크 감지 결과를 팔레트-타이포-레이아웃-템플릿 조합으로 매핑. 모든 CSS 커스텀 프로퍼티는 `--pn-` 프리픽스로 네임스페이스 격리. `content.schema.yaml`과 `tokens.schema.yaml`이 생성물의 구조를 강제.

### 5. 두 시스템의 통합 일관성
**문제**: foliocraft(포트폴리오 전용)의 8개 에이전트와 ultra-cc-init(개발 자동화)의 18개 에이전트를 하나로 합치면서, 네이밍 컨벤션, 라우팅 규칙, Hook 이벤트 체계를 통일해야 했다.
**해결**: MANIFEST.md 기반 키워드 라우팅(KO/EN 이중 언어), `.claude/settings.json` 334줄 통합 설정, 7개 Hook의 matcher-event 체계 표준화. 모든 에이전트가 `.state.yaml`의 동일한 스키마(`workspace/.state-schema.yaml`, 358줄)를 공유.

## Story Arc

open-pantheon의 이야기는 2026년 1월 6일, 단 하나의 커밋에서 시작한다.

**cc-initializer (2026-01-06 ~ 2026-01-22)** — "Claude Code Project Initializer"라는 이름으로 태어난 이 프로젝트는 Claude Code 세션을 위한 프로젝트 초기화 도구였다. CLAUDE.md 자동 생성, 기본적인 Phase 관리, Agile 워크플로우가 전부였다. 하지만 38개 커밋 동안 폭발적으로 성장했다. v2.0에서 Agile 자동화가 추가되고, v2.1에서 Phase 기반 개발 시스템이 도입되고, v3.0에서 "Discovery First" 접근법이 확립되었다. v4.0에서는 단일 프로젝트 도구를 넘어 재사용 가능한 프레임워크로 전환되었고, --sync와 --update 옵션으로 다른 프로젝트에 적용할 수 있게 되었다. GitHub Manager, Analytics 시각화, 자동 검색 시스템이 차례로 추가되면서 v4.5에 이르러 20개 이상의 에이전트와 20개 이상의 스킬을 보유한 본격적인 AI 에이전트 프레임워크가 되었다.

**ultra-cc-init (2026-01-31 ~ 2026-02-06)** — cc-initializer가 기능적으로 성숙해지자 새로운 병목이 드러났다. 바로 토큰 컨텍스트 관리다. 20개 넘는 에이전트와 스킬을 모두 로드하면 컨텍스트 윈도우가 포화되었다. ultra-cc-init은 이 문제를 정면으로 해결했다. Agent MANIFEST를 도입하여 키워드 매칭 기반 lazy-loading을 구현했고, lean CLAUDE.md 템플릿으로 초기 로딩을 최소화했으며, 4-tier 토큰 예산 체계(2K~50K)로 작업 유형별 컨텍스트 크기를 제어했다. 동시에 Codex CLI를 dual-AI loop로 통합하여 "Claude가 구현하고 Codex가 검증하는" Multi-AI 협업 패턴을 확립했다.

**open-pantheon (2026-02-22)** — 그리고 세 번째 진화가 일어났다. foliocraft라는 이름으로 별도 개발되던 포트폴리오 생성 파이프라인(Phase 1~4, 8개 craft 에이전트, 상태머신, Gemini CLI 통합)이 ultra-cc-init의 개발 라이프사이클 자동화와 합병된다. 이름은 open-pantheon — "AI 신들이 프로젝트를 단조하는 곳". 단일 초기 커밋에 170개 파일, 22,814줄이 담겼다. 두 시스템을 연결하기 위해 state-transition.sh와 craft-progress.sh라는 bridge hook이 새로 만들어졌고, 13-state 상태머신이 Quality Gate와 Feedback Loop를 통합하여 파이프라인의 모든 단계를 자동으로 검증하게 되었다.

결과적으로 open-pantheon은 47일 동안 3번의 진화를 거친 AI Native 개발 생태계다. cc-initializer의 21,162줄에서 ultra-cc-init의 21,607줄을 거쳐 open-pantheon의 29,500줄로 — 코드는 37% 성장했지만 역할은 근본적으로 확장되었다. 단일 프로젝트 초기화 도구가 Multi-CLI 오케스트레이션 플랫폼이 되었고, 분석-디자인-빌드-배포-생명주기 관리를 하나의 명령어(`/craft`)로 실행할 수 있는 시스템이 되었다.

> "No two projects should look the same. No development workflow should be manual."

이것이 open-pantheon이 47일에 걸쳐 증명하려는 명제다.
