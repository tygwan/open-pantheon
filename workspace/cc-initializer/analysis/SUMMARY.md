# cc-initializer Analysis Summary

## Key Insights

- **Zero-Dependency Declarative Agent Framework**: 런타임 소스 코드 없이 Markdown(113파일) + Shell(7파일) + JSON(7파일)만으로 25 agents, 27 skills, 6 commands, 6 hooks 생태계 구현. `.claude/` 디렉토리를 통째로 복사하면 어떤 프로젝트에나 적용 가능
- **97% 토큰 최적화 (Five Pillars)**: MANIFEST 라우팅(38K→1.1K 세션 초기화), Lean CLAUDE.md(1,700→300/turn), 2-Tier Document(81-95% 절감), Incremental Loading(4-tier 예산), Structured Data(39-68% 절감). "기능을 추가할수록 성능이 저하되는" 역설을 해결
- **Discovery-First 패러다임**: "AI가 코드 생성 전에 먼저 프로젝트를 이해해야 한다" — 대화 기반 요구사항 파악(DISCOVERY.md)을 강제하여 맹목적 코드 생성 방지 (v3.0)
- **Dual-AI Engineering Loop**: Claude(설계/구현) + Codex(검증/리뷰) 교차 검증. 실제 사례에서 Codex가 6개 내부 불일치 발견 (commit `adb3d11`)
- **Event-Driven Hook System**: PreToolUse/PostToolUse/Notification 이벤트에 Critical(safety)과 Non-critical(progress/sync) 분류. Graceful degradation으로 비필수 훅 실패 시에도 개발 흐름 보존
- **28일간 v1.0→v5.1 진화**: 39 commits, 134파일, 21K+ 줄. 단순 초기화 도구 → 개발 라이프사이클 프레임워크 → 토큰 최적화 + 듀얼 AI 생태계
- **3부작 기원**: cc-initializer(초기화) → ultra-cc-init(최적화) → open-pantheon(통합)의 AI Native 개발 진화의 첫 장

## Recommended Template

`astro-landing` — 런타임 코드나 인터랙티브 대시보드가 없는 순수 텍스트 기반 프레임워크. 제품 소개(25 agents, 97% 토큰 절감)와 아키텍처 시각화가 핵심이므로 Astro의 0KB JS 기본값이 최적.

**대안**: `html-terminal` *(planned)* — CLI 도구 특성에 더 부합하나 미구현

## Design Direction

- **Palette**: DevTool/CLI 특성 반영. 다크 터미널 배경(#0d1117) + 밝은 코드 텍스트. 핵심 강조에 브랜드 오렌지(#FF6B35, README 배지에서 추출). Agent/Skill/Hook 각각 구분 색상
- **Typography**: Monospace 주체 (JetBrains Mono 또는 Fira Code). 터미널 느낌의 코드 블록 스타일. 헤드라인에 Sans-serif 대비
- **Layout**: CLI 도구 랜딩 스타일. Hero(97% 토큰 절감 Before/After) → Five Pillars 시각화 → Agent/Skill/Hook 카탈로그 → 3부작 진화 타임라인 → 워크플로우 다이어그램(Init/Feature/Hook 흐름) → DXTnavis 채택 사례

## Notable

- **자기 자신이 PoC**: cc-initializer는 자기 자신의 개발에 cc-initializer를 사용. 프레임워크 도구성 검증의 재귀적 특성
- **커뮤니티 자동 발견**: GitHub Topics(`uses-cc-initializer`) + GraphQL API + 주간 크론으로 채택 프로젝트 자동 수집 (PROJECTS.json)
- **Dual Remote 구조**: `origin`(cc-initializer) + `ultra`(ultra-cc-init) — 동일 코드베이스에서 두 프로젝트 관리
- **프레임워크 동기화 딜레마 해결**: `/init --sync`(add_missing 병합) + `--update`(git pull 연계) + `preserve_project_customizations`로 프레임워크 업데이트와 프로젝트 격리를 동시 달성
- **No Tests, No CI for Code**: Quality Gate가 프로세스 수준 검증(lint/coverage 체크 자동화)을 담당. 코드 자체가 없으므로 전통적 테스트 불필요
