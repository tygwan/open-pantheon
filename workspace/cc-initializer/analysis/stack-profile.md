# cc-initializer Stack Profile

## Detected Stack

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

## Domain Classification

| Aspect | Value |
|--------|-------|
| **Primary Domain** | devtool |
| **Secondary Domain** | automation |
| **Rationale** | cc-initializer는 Claude Code를 위한 개발 워크플로우 프레임워크로, 25개 agent + 27개 skill + 6개 command + 6개 hook으로 구성된 CLI 기반 개발 도구입니다. 코드를 직접 실행하는 런타임이 아닌, AI 에이전트 오케스트레이션을 통한 개발 프로세스 자동화에 초점을 맞추고 있어 devtool(Primary) + automation(Secondary)으로 분류합니다. Phase/Sprint 관리, Quality Gate, Dual AI Loop(Claude+Codex) 등 개발 라이프사이클 전반을 커버합니다. |

## Template Recommendation

| Aspect | Value |
|--------|-------|
| **Recommended** | `astro-landing` |
| **Alternative** | `html-terminal` (planned) |
| **Rationale** | cc-initializer는 런타임 코드나 인터랙티브 대시보드가 없는 순수 텍스트 기반 프레임워크입니다. 제품 소개(25 agents, 27 skills, 97% 토큰 절감 등)와 아키텍처 시각화가 핵심이므로, 0KB JS 기본값과 정적 콘텐츠에 최적화된 `astro-landing`이 가장 적합합니다. 워크플로우 다이어그램(Init flow, Dual AI Loop, 2-Tier Architecture)은 `figure-designer`의 Mermaid/SVG로 충분히 표현 가능하며, SvelteKit의 인터랙티브 기능은 필요하지 않습니다. 추후 `html-terminal`이 구현되면 CLI 도구 특성에 더 부합할 수 있으나, 현재 사용 가능한 옵션 중에서는 `astro-landing`이 최선입니다. |

## Existing Site

| Aspect | Detail |
|--------|--------|
| **Has Existing Site** | No |
| **GitHub Pages** | 미설정 |
| **URL** | N/A |
| **Notes** | GitHub repo README가 유일한 공개 문서. `README.md`에 풍부한 시각적 표현(badges, HTML tables, ASCII diagrams)이 이미 존재하여 포트폴리오 사이트의 콘텐츠 소스로 활용 가능 |

## Build & Deploy Profile

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
