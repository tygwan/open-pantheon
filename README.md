<div align="center">

<br />

<pre>
 ██████  ██████  ██████  ██    ██
██    ██ ██   ██ ██      ███   ██
██    ██ ██████  █████   ████  ██
██    ██ ██      ██      ██ ██ ██
 ██████  ██      ██████  ██  ████

██████   ████   ██    ██ ████████ ██   ██ ██████  ██████  ██    ██
██   ██ ██  ██  ███   ██    ██    ██   ██ ██      ██  ██  ███   ██
██████  ██████  ████  ██    ██    ███████ █████   ██  ██  ████  ██
██      ██  ██  ██ ██ ██    ██    ██   ██ ██      ██  ██  ██ ██ ██
██      ██  ██  ██  ████    ██    ██   ██ ██████  ██████  ██  ████
</pre>

**Where AI gods forge your projects.**

Git 레포 분석 + 포트폴리오 생성 + 개발 라이프사이클 자동화 — 하나의 AI 에이전트 생태계.

<br />

<a href="https://github.com/tygwan/open-pantheon/actions"><img src="https://img.shields.io/github/actions/workflow/status/tygwan/open-pantheon/ci.yml?branch=main&style=for-the-badge&logo=github&label=CI" alt="CI"></a>&nbsp;
<a href="https://github.com/tygwan/open-pantheon/releases"><img src="https://img.shields.io/github/v/release/tygwan/open-pantheon?include_prereleases&style=for-the-badge&logo=semantic-release&color=ea4b71" alt="Release"></a>&nbsp;
<a href="https://github.com/tygwan/open-pantheon/blob/main/LICENSE"><img src="https://img.shields.io/github/license/tygwan/open-pantheon?style=for-the-badge&color=3ddbd9" alt="License"></a>&nbsp;
<a href="https://claude.ai"><img src="https://img.shields.io/badge/Powered_by-Claude_+_Codex_+_Gemini-7c5cff?style=for-the-badge&logo=anthropic" alt="Multi-CLI"></a>

</div>

<br />

---

## What is open-pantheon?

open-pantheon은 **두 가지 핵심 기능**을 하나로 통합합니다:

1. **Portfolio Generation** — Git 레포를 분석하여 프로젝트별 고유 디자인의 포트폴리오 사이트를 자동 생성
2. **Dev Lifecycle Management** — Phase/Sprint 관리, Quality Gates, Feedback Loops, CI/CD 자동화

**Claude Code**가 오케스트레이션하고, **Codex CLI**(코드 분석/검증)와 **Gemini CLI**(디자인/시각화)가 역할을 분담합니다.

```
$ claude /craft /path/to/your-repo

  ✔ Phase 1   — Analyzing repo with 3 agents...      (Codex assists)
  ✔ Phase 2   — Generating design profile...          (Gemini generates)
  ✔ Phase 3   — Building site...                      (Claude writes)
  ✔ Phase 3.5 — Validating build...                   (Codex validates)
  ✔ Phase 4   — Deployed to GitHub Pages

  → https://yourname.github.io/your-repo/
```

---

## Pipeline

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                          open-pantheon pipeline                              │
│                                                                              │
│  Phase 1: ANALYZE       Phase 2: DESIGN      Phase 3: BUILD                 │
│  ┌──────────────┐       ┌──────────────┐     ┌──────────────┐               │
│  │ code-analyst ─┤       │              │     │  page-writer │               │
│  │ story-analyst ┼──→ SUMMARY.md ──→ design  ──→ tokens.css │               │
│  │ stack-detector┤   (Lead 종합)    profile  │  content.json│               │
│  └──────────────┘       │    .yaml     │     │  site/       │               │
│   Codex assists         │  (사람 검토)  │     │              │               │
│                         │  Gemini gen  │     │figure-designer│              │
│                         └──────────────┘     │  → diagrams/  │              │
│                                              └───────┬──────┘               │
│                                                      ↓                      │
│                                            Phase 3.5: VALIDATE              │
│                                            ┌──────────────────┐             │
│                                            │ validation-agent  │             │
│                                            │ Schema · Quality  │             │
│                                            │   (Codex CLI)     │             │
│                                            └───────┬──────────┘             │
│                                                    ↓                        │
│                                            Phase 4: DEPLOY                  │
│                                            GitHub Pages / Vercel            │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## State Machine

모든 프로젝트는 **13-state 상태머신**으로 추적됩니다. Quality Gate와 Feedback Loop가 통합되어 있습니다.

```
init → analyzing → analyzed → designing → design_review
                                              ↓
                    build_review ← validating ← building
                        ↓                     ↑ quality-gate
                    deploying → done          │ pre-build
                                ↑
                         quality-gate
                          pre-deploy

                    + paused, failed, cancelled
```

Per-project state: `workspace/{project}/.state.yaml`
Schema: `workspace/.state-schema.yaml`

---

## Multi-CLI Architecture

```
               ┌──────────────────────────────┐
               │    Claude Code (Lead)         │
               │  Orchestration + Code Gen     │
               └──────┬──────────────┬─────────┘
                      │              │
        ┌─────────────┘              └──────────────┐
        ▼                                           ▼
┌───────────────────┐                 ┌───────────────────┐
│  Codex CLI        │                 │  Gemini CLI       │
│  Review · Search  │                 │  Design · Visual  │
│  Validate         │                 │  UI/UX · SVG      │
│  --sandbox ro     │                 │  -y (auto-accept) │
└───────────────────┘                 └───────────────────┘
```

---

## Dev Lifecycle

open-pantheon은 포트폴리오 생성 외에도 개발 워크플로우를 통합 관리합니다.

### Feature Development
```
/feature start "기능명"  →  branch + phase + sprint 연동
/feature progress        →  진행률 업데이트
/feature complete        →  PR + docs + quality-gate
```

### Quality Gates
자동 품질 검증이 파이프라인의 핵심 단계에 통합:
- **Pre-commit**: lint, format, types, secrets
- **Pre-build**: content.json schema, tokens.css, no PLACEHOLDERs
- **Pre-deploy**: full validation, site builds, deploy config
- **Pre-release**: coverage, security scan, all docs

### Hooks & Automation
7개의 자동화 훅이 개발 작업을 모니터링:
- Safety checks, progress tracking, doc sync, analytics
- **State Machine bridge**: 상태 전이 시 quality-gate/feedback 자동 트리거

---

## Agents (26)

8개의 **Craft Pipeline** 에이전트와 18개의 **Dev Lifecycle** 에이전트가 역할을 분담합니다.

| Category | Agents | Purpose |
|:---------|:------:|:--------|
| **Craft Pipeline** | 8 | 코드 분석, 경험 인터뷰, 디자인 생성, 사이트 빌드, 검증 |
| **Dev Lifecycle** | 18 | 진행률 추적, 문서 관리, Git 워크플로우, 코드 리뷰, 테스트 |

> Agent 라우팅: `.claude/agents/MANIFEST.md` — 26 agents의 키워드(KO/EN) 매칭으로 자동 선택

---

## Templates

| Template | Stack | Best for |
|:---------|:------|:---------|
| **sveltekit-dashboard** | SvelteKit 5 | 대시보드, 워크플로우, 애니메이션 |
| **astro-landing** | Astro 5 + Tailwind v4 | 제품 랜딩, 연구 쇼케이스 |

### Design Presets

<table>
<tr><th colspan="4">Palettes</th></tr>
<tr>
  <td><b>automation</b><br/><sub>Dark + neon</sub></td>
  <td><b>plugin-tool</b><br/><sub>Light/Dark dual</sub></td>
  <td><b>ai-ml</b><br/><sub>Deep dark + gradient</sub></td>
  <td><b>terminal</b><br/><sub>CLI aesthetic</sub></td>
</tr>
</table>

---

## Commands (14)

| Command | Description |
|:--------|:-----------|
| `/craft <repo>` | 전체 파이프라인 (Phase 1→2→3→3.5→4) |
| `/craft-analyze <repo>` | Phase 1만 — 3 agents 병렬 분석 |
| `/craft-export <project>` | 분석 결과를 Resumely 호환 Markdown으로 내보내기 |
| `/craft-design <project>` | Phase 2만 — design-profile.yaml 생성 |
| `/craft-preview <project>` | 로컬 빌드 + 검증 + 프리뷰 |
| `/craft-deploy <project>` | 배포 (github-pages / vercel / netlify) |
| `/craft-sync [project]` | 메인 포트폴리오와 동기화 |
| `/craft-state <project>` | 상태 조회 / 로그 / 리셋 / 재개 |
| `/feature` | 기능 개발 워크플로우 |
| `/bugfix` | 버그 수정 워크플로우 |
| `/release` | 릴리스 관리 |
| `/phase` | Phase 관리 |
| `/dev-doc-planner` | 문서 계획 |
| `/git-workflow` | Git 워크플로우 |

---

## Quick Start

```bash
# 1. Clone
git clone https://github.com/tygwan/open-pantheon.git
cd open-pantheon

# 2. Open in Claude Code
claude

# 3. Generate a portfolio for your project
/craft /path/to/your-project --deploy github-pages

# 4. Check project state
/craft-state my-project inspect
```

---

## At a Glance

| | Count |
|:--|------:|
| AI Agents | **26** |
| CLI Providers | **3** (Claude + Codex + Gemini) |
| Skills | **29** (23 dirs + 6 legacy) |
| Slash Commands | **14** |
| Hooks | **7** |
| State Machine States | **13** |
| Quality Gates | **6** (commit, merge, build, deploy, release, post-release) |
| Template Stacks | **2** (+ 4 planned) |
| Design Palettes | **4** |
| Domain Profiles | **8** |

---

## Philosophy

> **No two projects should look the same.**
> **No development workflow should be manual.**

open-pantheon은 코드를 읽고, 히스토리를 추적하고, 아키텍처를 파악한 뒤에야 디자인이 결정됩니다. 동시에 개발 프로세스 전체를 자동화하여 품질과 속도를 모두 잡습니다.

---

<div align="center">
<sub>Built with <a href="https://claude.ai/claude-code">Claude Code</a> + <a href="https://github.com/openai/codex">Codex CLI</a> + <a href="https://github.com/google-gemini/gemini-cli">Gemini CLI</a></sub>
</div>
