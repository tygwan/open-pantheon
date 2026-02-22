# open-pantheon — Stack Profile

> Phase 1 stack-detector 산출물. 기술 스택 감지, 도메인 분류, 템플릿 추천.
> 생성일: 2026-02-22 | Agent: stack-detector | CLI: Claude (self-analysis)

---

## 1. Primary Stack

open-pantheon은 코드 실행 애플리케이션이 아닌 **AI 에이전트 오케스트레이션 프레임워크**입니다. 주요 기술 자산은 Markdown 에이전트 정의, YAML 설정/스키마, Shell 자동화 훅, 그리고 프론트엔드 사이트 템플릿(SvelteKit, Astro)으로 구성됩니다.

### Language & Format Distribution

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

## 2. Framework Detection

### 2.1 Core Framework: Claude Agent SDK (Configuration-as-Code)

| 항목 | 감지 결과 | 근거 |
|------|----------|------|
| Agent System | 26 agents (Markdown 정의) | `.claude/agents/MANIFEST.md:1-40` — 33 에이전트 라우팅 인덱스 |
| Skill System | 29 skills (21 dirs + 6 legacy + 2 CLI) | `.claude/skills/` 디렉토리 구조 |
| Command System | 13 slash commands | `.claude/commands/` — craft + dev lifecycle |
| Hook System | 7 automation hooks | `.claude/hooks/*.sh` — PreToolUse, PostToolUse, Notification |
| Settings | Centralized JSON config | `.claude/settings.json:1-334` — hooks, agile, phase, sprint, quality-gate 등 |
| State Machine | YAML-based FSM | `workspace/.state-schema.yaml:1-359` — 12 states, 11 transitions, guards |
| **Confidence** | **HIGH** | 프로젝트의 핵심 가치. 전체 파일의 90%+ 가 이 시스템 정의 |

### 2.2 Template Stack A: SvelteKit 5 + Vite 7

| 항목 | 버전 | 근거 |
|------|------|------|
| SvelteKit | ^2.0.0 | `templates/sveltekit-dashboard/package.json:12` |
| Svelte | ^5.0.0 | `templates/sveltekit-dashboard/package.json:14` |
| Vite | ^7.0.0 | `templates/sveltekit-dashboard/package.json:15` |
| adapter-static | ^3.0.0 | `templates/sveltekit-dashboard/package.json:11` — SSG 전용 |
| **용도** | Dashboard 레이아웃 | `templates/sveltekit-dashboard/svelte.config.js:1-21` |
| **Confidence** | **HIGH** | `package.json` devDependencies 명시 |

### 2.3 Template Stack B: Astro 5 + Tailwind CSS 4

| 항목 | 버전 | 근거 |
|------|------|------|
| Astro | ^5.0.0 | `templates/astro-landing/package.json:10` |
| Tailwind CSS | ^4.0.0 | `templates/astro-landing/package.json:17` |
| @tailwindcss/vite | ^4.0.0 | `templates/astro-landing/package.json:16` |
| @astrojs/sitemap | ^3.0.0 | `templates/astro-landing/package.json:11` |
| **용도** | Landing page 레이아웃 | `templates/astro-landing/astro.config.mjs:1-12` |
| **Confidence** | **HIGH** | `package.json` dependencies 명시 |

### 2.4 External CLI Integration

| CLI | 역할 | 모델 | 근거 |
|-----|------|------|------|
| Codex CLI | Phase 1 분석, Phase 3.5 검증 | `gpt-5.2-codex` (기본) | `.claude/skills/codex/references/ultra-codex-patterns.md:14-16` |
| Gemini CLI | Phase 2 디자인, Phase 3 시각화 | `gemini-2.5-flash` (기본) | `.claude/settings.json:326-327` |
| GitHub CLI (`gh`) | 이슈/PR/CI/릴리스 관리 | N/A | `.claude/settings.json:296-319` |
| **Confidence** | **MEDIUM** | 설정에 정의되어 있으나, 외부 CLI 바이너리는 런타임 의존 |

### 2.5 Design System

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

## 3. Shell Automation Layer

### Hook Architecture (Bash)

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

## 4. Data Format Stack

| 형식 | 용도 | Phase | 근거 |
|------|------|-------|------|
| **Markdown** | Agent 정의, 분석 산출물, 커맨드, 스킬, 문서 | 1 (산출물), 전체 (시스템 정의) | 138개 파일, 25K+ 라인 |
| **YAML** | 상태 스키마, 디자인 프리셋, 팔레트, 타이포, 레이아웃, 설정 | 2 (design-profile), 전체 (config) | `workspace/.state-schema.yaml`, `design/**/*.yaml` |
| **JSON** | settings.json, content.json, plugin.json, metrics.jsonl | 3 (content), 전체 (config) | `.claude/settings.json`, `templates/_tokens/content.schema.yaml` |
| **CSS** | Design tokens (`--pn-*`), 컴포넌트 스타일 | 3 (tokens.css) | `templates/*/src/*/tokens.css` |
| **Svelte** | SvelteKit dashboard 템플릿 컴포넌트 | 3 (site build) | `templates/sveltekit-dashboard/src/routes/+page.svelte:1-62` |
| **Astro** | Astro landing 템플릿 페이지/레이아웃 | 3 (site build) | `templates/astro-landing/src/pages/index.astro:1-57` |

---

## 5. Architecture Patterns

### 5.1 State Machine (YAML FSM)

- 12 states, 11 transition rules with guards
- Append-only event log (`log[]`)
- Quality gate integration (`pre_build`, `pre_deploy`, `post_release`)
- Feedback loop fields (`learnings`, `adr`, `retro`)
- 근거: `workspace/.state-schema.yaml:19-37` (states), `293-358` (transitions)
- **Confidence**: **HIGH**

### 5.2 Multi-CLI Orchestration

- Claude Code = Lead orchestrator
- Codex CLI = 분석/검증 (read-only sandbox)
- Gemini CLI = 디자인/시각화 (auto-accept)
- Fallback chain: CLI fail → 1 retry → Claude fallback
- 근거: `.claude/settings.json:324-328` (cli_distribution), `CLAUDE.md` Pipeline 섹션
- **Confidence**: **HIGH**

### 5.3 Configuration-as-Code

- 에이전트 = Markdown 파일 (frontmatter + 구조화된 역할/프로세스 정의)
- 라우팅 = MANIFEST.md 키워드 매칭
- 설정 = 단일 settings.json (334줄, 15개 최상위 설정 카테고리)
- 훅 = Shell 스크립트 + JSON 매칭 규칙
- 근거: `.claude/settings.json:2-52` (hooks config), `.claude/agents/MANIFEST.md:1-40` (routing)
- **Confidence**: **HIGH**

### 5.4 Design Token System

- 모든 시각적 속성은 `--pn-*` CSS custom properties로 추상화
- `design-profile.yaml` → `tokens.css` 변환 파이프라인
- 템플릿이 토큰만 소비 → 프로젝트별 고유 디자인 자동 적용
- 근거: `templates/_tokens/tokens.schema.yaml:8-92`, `templates/sveltekit-dashboard/src/lib/styles/tokens.css:1-34`
- **Confidence**: **HIGH**

---

## 6. Domain Classification

### Primary Domain: **devtool**

| 판정 근거 | 상세 |
|----------|------|
| 프로젝트 성격 | AI 에이전트 기반 개발 도구/프레임워크. CLI 오케스트레이션으로 포트폴리오 사이트를 자동 생성 |
| 사용자 타겟 | 개발자 (자신의 Git 레포를 분석하여 포트폴리오 생성) |
| 인터페이스 | CLI-first (Claude Code, Codex CLI, Gemini CLI, gh CLI) |
| 실행 환경 | 터미널/셸 — 모든 자동화가 bash hook 기반 |
| domain-profiles 매핑 | `design/domain-profiles/index.yaml:45-51` — "CLI tools, terminals, development utilities" |
| **Confidence** | **HIGH** |

### Secondary Domains

| Domain | 관련도 | 이유 |
|--------|--------|------|
| automation | HIGH | 7 hooks, state machine, CI/CD pipeline — 자동화가 핵심 기능 |
| ai-ml | MEDIUM | Multi-LLM 오케스트레이션 (Claude + Codex + Gemini) — AI가 도구이지만 ML 모델 자체는 아님 |

---

## 7. Template Recommendation

### Recommended: `sveltekit-dashboard`

| 기준 | 판정 | 근거 |
|------|------|------|
| **도메인 매핑** | devtool → `sveltekit-dashboard` | `design/domain-profiles/index.yaml:50` |
| **시각화 필요** | HIGH — 파이프라인 흐름, 에이전트 관계, 상태 머신 다이어그램 | State diagram (12 states), Pipeline diagram (4 phases), Agent manifest (33 entries) |
| **인터랙티브 요소** | HIGH — 에이전트 라우팅 탐색, 파이프라인 단계별 전환 애니메이션 | SvelteKit 내장 transition + store로 상태 시각화 가능 |
| **데이터 밀도** | HIGH — 26 agents, 29 skills, 7 hooks, 13 commands, 8 domains, 2 templates | Dashboard의 카드 그리드가 메트릭 표현에 최적 |
| **프로젝트 정체성** | "AI gods forge your projects" — 다크 대시보드 + 네온 강조색이 시스템/도구 느낌 부각 | `design/palettes/terminal.yaml` 또는 `automation.yaml` 적용 |

### Alternative Considered: `astro-landing`

| 기준 | 판정 | 기각 이유 |
|------|------|----------|
| 정적 콘텐츠 | 적합 | 시스템의 복잡도를 표현하기에 단일 랜딩은 부족 |
| 0KB JS | 장점이지만 | 파이프라인 시각화, 에이전트 탐색 등 인터랙션이 필수적 |
| SEO | 장점 | Dashboard도 adapter-static으로 SSG 가능 |

### Recommended Design Presets

| 요소 | 추천 프리셋 | 이유 |
|------|-----------|------|
| Palette | `terminal` | CLI-first 도구. 다크 배경(#0d0d0d) + coral/teal 강조. `design/palettes/terminal.yaml:1-42` |
| Typography | `mono-terminal` | 코드/CLI 미학. JetBrains Mono 헤딩. `design/typography/mono-terminal.yaml:1-37` |
| Layout | `dashboard` | 카드 그리드 + 메트릭 카드 + 아키텍처 다이어그램. `design/layouts/dashboard.yaml:1-39` |

### Key Sections to Showcase

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

## 8. Build & Deploy Characteristics

| 항목 | 값 | 근거 |
|------|-----|------|
| Package Manager | npm (추정) | `templates/*/package.json` — lockfile 미존재 |
| Build Tool | Vite 7 | `templates/sveltekit-dashboard/package.json:15` |
| Static Output | SSG (adapter-static) | `templates/sveltekit-dashboard/svelte.config.js:1-3` |
| Deploy Targets | GitHub Pages, Vercel, Netlify | `workspace/.state-schema.yaml:180-181` |
| CI/CD | GitHub Actions (gh CLI 통합) | `.claude/settings.json:309-313` |
| **Confidence** | **MEDIUM** — 템플릿 기준. 프레임워크 자체에 빌드는 없음 |

---

## 9. Dependency Analysis

### Runtime Dependencies (Template)

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

### System Dependencies (Runtime)

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

## 10. Uniqueness Factors

open-pantheon의 포트폴리오는 일반 프로젝트와 다른 메타적 특성을 가집니다:

1. **자기 참조적(Self-referential)**: 포트폴리오를 만드는 도구 자체의 포트폴리오. 도구가 자신을 분석하고 자신의 사이트를 생성
2. **Configuration-as-Code 중심**: 실행 코드보다 선언적 설정이 핵심 가치. 에이전트 = Markdown, 스키마 = YAML, 토큰 = CSS
3. **Multi-LLM Orchestration**: 단일 AI가 아닌 Claude + Codex + Gemini 3중 오케스트레이션
4. **Pipeline-as-Product**: 4-phase 파이프라인 자체가 제품. 입력(Git repo) → 출력(Portfolio site)
5. **Extensible Ecosystem**: 26 agents, 29 skills, 13 commands, 7 hooks — 각각 독립적으로 확장 가능

---

## Summary

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
