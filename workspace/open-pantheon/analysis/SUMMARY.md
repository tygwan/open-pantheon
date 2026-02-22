# open-pantheon Analysis Summary

## Key Insights

- **3중 아키텍처 패턴**: Agent Orchestration(26 agents) + Finite State Machine(12 states, 14 transitions) + Event-Driven Hook Pipeline(7 hooks). 세 패턴이 레이어로 결합된 Configuration-as-Code 프레임워크
- **Multi-CLI Orchestration**: Claude Code(Lead 오케스트레이터) + Codex CLI(분석/검증, read-only sandbox) + Gemini CLI(디자인/시각화, auto-accept). 각 AI의 강점을 극대화하는 역할 분담. 3단계 Fallback(경량 모델 → 1회 재시도 → Claude 대체)
- **4-Phase Pipeline (Analyze→Design→Build→Deploy)**: Phase별 산출물 형식 전환 — Markdown(사람 검토) → YAML(사람 수정) → JSON+CSS(기계 소비). 각 소비자에게 최적화된 형식
- **47일간 3부작 진화**: cc-initializer(38커밋, 21K줄) → ultra-cc-init(40커밋, 21K줄) → open-pantheon(1커밋, 29.5K줄). 총 79커밋. 프로젝트 초기화 도구 → 개발 라이프사이클 프레임워크 → Multi-CLI 포트폴리오 생성 + 개발 자동화 통합 생태계
- **Configuration-as-Code**: 197파일 중 70%가 Markdown. 에이전트=MD, 스키마=YAML, 토큰=CSS. 코드 디버깅 없이 Markdown 편집으로 에이전트 행동 변경 가능
- **코드-드리븐 디자인**: 8개 도메인 프로파일 × 4개 팔레트 × 3개 타이포 × 2개 레이아웃. `--pn-*` CSS custom properties(21 required tokens)로 프로젝트별 고유 디자인 자동 생성
- **Bridge Hook 아키텍처**: foliocraft(포트폴리오)와 ultra-cc-init(개발 라이프사이클) 합병을 위해 `state-transition.sh` + `craft-progress.sh` 신규 도입. State Machine ↔ Quality Gate ↔ Feedback Loop 자동 연동
- **자기 참조적 시스템**: 포트폴리오를 만드는 도구가 자기 자신의 포트폴리오를 생성. experience-interviewer가 코드 분석 갭을 6블록으로 구조화하는 유일한 대화형 에이전트

## Recommended Template

`sveltekit-dashboard` — 높은 데이터 밀도(26 agents, 29 skills, 7 hooks, 13 commands), 파이프라인 시각화, 에이전트 인터랙티브 탐색, 상태머신 다이어그램 등 대시보드 레이아웃이 최적.

**디자인 프리셋**: `terminal` 팔레트(다크 #0d0d0d + coral/teal 강조) + `mono-terminal` 타이포(JetBrains Mono) + `dashboard` 레이아웃

## Design Direction

- **Palette**: `terminal` — 다크 배경(#0d0d0d) + coral/teal 강조. CLI-first 도구의 정체성 반영. "Where AI gods forge your projects" 컨셉에 맞는 신비로운 다크 대시보드
- **Typography**: `mono-terminal` — JetBrains Mono 헤딩 + 시스템 본문. 코드/CLI 미학
- **Layout**: Dashboard — Hero(터미널 타이핑 애니메이션) → Pipeline Flow(Phase 1→4 Mermaid) → Agent Ecosystem(인터랙티브 카드 그리드) → Metrics(KPI 카드) → State Machine(상태 다이어그램) → Design System(토큰 프리뷰) → 3부작 진화 타임라인

## Notable

- **197파일, 29,500줄 단일 초기 커밋**: foliocraft + ultra-cc-init 합병의 결과. 전체가 단일 `feat: initialize open-pantheon` 커밋
- **13 Slash Commands**: craft 파이프라인 7개 + dev lifecycle 6개. `/craft` 하나로 Phase 1→4 전체 실행
- **6 Quality Gates**: pre-commit → pre-merge → pre-build → pre-deploy → pre-release → post-release. 모든 단계에서 자동 품질 검증
- **Workspace 격리**: 각 프로젝트(resumely, DXTnavis, bim-ontology 등)가 `workspace/{project}/`에 독립 `.state.yaml`로 상태 관리
- **Hook 실행 순서 명시**: Write/Edit 시 5개 PostToolUse hook 순차 실행. INTEGRATION-MAP.md에 문서화
- **경험 인터뷰어 차별점**: 파이프라인에서 유일한 대화형 에이전트. 분석 결과의 갭을 6블록(목표/현상/가설/판단기준/실행/결과)으로 구조화
- **nextjs-app 템플릿 미구현**: resumely에 필요한 Next.js 템플릿이 아직 planned 상태. 추가 개발 필요
