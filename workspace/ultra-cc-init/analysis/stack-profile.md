# ultra-cc-init Stack Profile

> **Repo**: https://github.com/tygwan/ultra-cc-init
> **Version**: 5.1.0
> **Base**: cc-initializer 4.5
> **Analyzed**: 2026-02-22

---

## Detected Stack

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

### Stack Summary

```
Primary:   Markdown (84%) + Shell (6%) + JSON (5%)
Secondary: Python3 (CI inline) + Node.js (ccusage inline)
External:  Claude Code + Codex CLI + gh CLI + jq
Data:      JSONL (metrics) + JSON (config) + Frontmatter YAML (agents/skills)
CI/CD:     GitHub Actions (weekly cron + manual dispatch)
```

---

## Domain Classification

| Criteria | Assessment |
|----------|-----------|
| **Primary Domain** | **devtool** |
| **Sub-domain** | AI Agent Orchestration Framework / CLI Configuration System |
| **Confidence** | **97%** |
| **Rationale** | Claude Code의 개발 워크플로우를 자동화하는 설정 프레임워크. 25 agents, 27 skills, 6 commands, 6 hooks를 오케스트레이션하여 프로젝트 초기화, Phase/Sprint 관리, 품질 게이트, 문서 동기화를 자동화 |

### Domain Evidence

| Signal | Evidence | Weight |
|--------|----------|:------:|
| Developer tooling | `CLAUDE.md:9` — "통합 개발 워크플로우 프레임워크" | High |
| CLI orchestration | Codex CLI + Claude Code + gh CLI 통합 (`settings.json`, `codex/SKILL.md`, `codex-claude-loop/SKILL.md`) | High |
| Configuration-as-Code | `.claude/settings.json` 316줄 — hooks, phase, sprint, quality-gate, analytics 등 17개 섹션 | High |
| Token optimization | `README.md:29-37` — 97% 토큰 절감 (38K → 1.1K), MANIFEST 라우팅, 2-Tier Docs | High |
| Automation hooks | 6개 shell hooks: safety, progress, doc-sync, tracker, notification, error-recovery | High |
| Project management | Phase + Sprint 통합, quality gates, feedback loops | Medium |
| Analytics | JSONL 메트릭 수집 + CLI 시각화 (`analytics-visualizer.sh`) | Medium |

### Alternative Domain Consideration

| Domain | Fit | Reason |
|--------|:---:|--------|
| devtool | **Best** | 개발 도구/프레임워크의 정의에 완벽 부합 |
| automation | Partial | 자동화 요소 강하나, 범용 자동화가 아닌 개발 특화 |
| ai-ml | Partial | AI CLI를 사용하지만, ML 모델 학습/추론이 아닌 도구 오케스트레이션 |
| plugin-tool | Partial | 플러그인 시스템 특성이 있으나 독립 프레임워크에 더 가까움 |

---

## Template Recommendation

| Criteria | Recommendation | Rationale |
|----------|:--------------:|-----------|
| **Primary** | **astro-landing** | CLI 도구 특성상 정적 콘텐츠 중심. 인터랙티브 요소 불필요. 0KB JS 기본값이 devtool 포트폴리오에 최적 |
| **Alternative** | sveltekit-dashboard | Token budget 시각화, agent routing 다이어그램 등 인터랙티브 요소 포함 시 |

### Template Selection Logic

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

### Visualization Opportunities

| Element | Type | Source |
|---------|------|--------|
| Before/After 비교 | 정적 테이블 + CSS 바 차트 | `README.md:29-37` — 토큰 절감 수치 |
| Five Pillars | 카드 레이아웃 | `README.md:41-111` — 5개 최적화 기둥 |
| Architecture Diagram | Mermaid/SVG | `.claude/docs/ARCHITECTURE.md` — 시스템 흐름도 |
| Component Count | 배지/통계 카드 | 25 agents, 27 skills, 6 commands, 6 hooks |
| Token Budget Tiers | 정적 그래프 | 4-tier budget system (2K/10K/30K/50K) |
| 2-Tier Docs Savings | 비교 테이블 | `README.md:162-171` — 81-95% 절감률 |

---

## Existing Site

| Item | Status |
|------|--------|
| **Live site** | None detected |
| **GitHub Pages** | 미설정 (`.github/workflows/`에 배포 workflow 없음) |
| **Homepage URL** | 미설정 |
| **Deploy config** | 없음 |
| **README badges** | 있음 — version 5.1.0, base cc-initializer 4.5, MIT license (`README.md:2-14`) |
| **Package registry** | 미등록 (npm, PyPI 등 없음) |

---

## Build & Deploy Profile

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

### File Statistics

| Metric | Value |
|--------|-------|
| Total files | 139 |
| Total lines | 21,607 |
| Markdown files | 117 (84%) |
| Shell scripts | 8 (6%) |
| JSON files | 7 (5%) |
| YAML files | 1 (< 1%) |
| Other (.gitkeep, .gitattributes, .gitignore) | 6 (4%) |

### Key Design Tokens Derivation

| Source Signal | Design Implication |
|--------------|--------------------|
| Token optimization 테마 (97% 절감) | 미니멀리스트 디자인, 공백 활용, "less is more" |
| CLI 도구 + 터미널 출력 | 모노스페이스 타이포그래피, 다크 배경 가능 |
| Before/After 비교 패턴 | 대비 컬러 팔레트 (before: muted, after: vibrant) |
| 5-Pillar 구조 | 카드 그리드 레이아웃, 아이콘 기반 내비게이션 |
| "Ultra" + "97% fewer tokens" | 속도감, 경량화 시각 메타포 (gradient, sharp edges) |
| 오렌지 브랜드 컬러 (`#FF6B35`) | `README.md:2` — 배지 컬러에서 추출, accent 색상 후보 |

---

## Appendix: Detected Components Inventory

### Agents (25)

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

### Skills (27 = 23 directory-based + 4 legacy files)

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

### Hooks (7 scripts)

| # | Hook | Event | Purpose |
|---|------|-------|---------|
| 1 | pre-tool-use-safety.sh | PreToolUse | 위험 명령 차단 |
| 2 | phase-progress.sh | PostToolUse | TASKS.md 변경 → 진행률 업데이트 |
| 3 | auto-doc-sync.sh | PostToolUse | Git commit → CHANGELOG/README 동기화 |
| 4 | post-tool-use-tracker.sh | PostToolUse | JSONL 메트릭 + 세션 로깅 |
| 5 | notification-handler.sh | Notification | 알림 처리 |
| 6 | error-recovery.sh | PostToolUse | 에러 복구 |
| 7 | analytics-visualizer.sh | Manual | CLI 차트 시각화 (script/) |
