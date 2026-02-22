# AI Native 삼부작 Experience Blocks (통합)

> cc-initializer + ultra-cc-init + open-pantheon 통합 인터뷰 결과
> 2라운드 인터뷰, 7개 질문으로 5개 경험 구조화

---

## Experience 1: 97% 토큰 최적화 — Five Pillars Architecture

**프로젝트**: ultra-cc-init (cc-initializer v5.0~v5.1)

### 목표 [O]
세션 초기화 토큰 97% 절감 (38K → 1.1K). 매 턴 CLAUDE.md 토큰 82% 절감 (1,700 → 300). "기능을 추가할수록 성능이 저하되는" 역설 해결.

### 현상 [O]
25개 agent, 27개 skill, 6개 hook 전체가 세션 시작 시 로드되어 ~38,000 토큰 소비. 컨텍스트 윈도우의 ~38%가 프레임워크 오버헤드로 낭비. 복잡한 멀티파일 작업에서 맥락 유실과 응답 품질 저하 발생.

### 원인 가설 [O]
점진적으로 실험하며 Claude와 Codex의 모델별 타겟 성능 차이를 확인. Context window가 매우 큰 Codex를 연계하면 Claude의 컨텍스트 부담을 분산할 수 있다는 가설. Database의 인덱스 패턴(full table scan 회피)과 OS의 demand paging(필요 시점 로드)에서 lazy-load 아키텍처 영감.

### 판단 기준 [O]
4-tier 토큰 예산(2K/10K/30K/50K)은 실사용 세션에서 반복 실험하며 수렴한 값. Claude의 응답 품질이 유지되는 최소 컨텍스트(quick 2K), 일반 작업 충분량(standard 10K), 아키텍처 분석 필요량(deep 30K), 전체 상태 로드(full 50K)로 경험적으로 결정. Codex의 큰 context window를 활용하여 Claude의 부담을 줄이는 전략이 판단 기준.

### 실행 [O]
Five Pillars를 하루 만에 5개 커밋으로 집중 구현:
1. Agent MANIFEST (38K → 500 토큰 라우팅 테이블)
2. Lean CLAUDE.md (8개 변수 템플릿, 300 토큰)
3. Incremental Loading (4-tier 예산)
4. 2-Tier Document (Header ~50줄 + Detail on-demand, 8개 파일 평균 90% 절감)
5. Structured Data (산문 → 테이블 변환, 9개 파일 73% 라인 절감)

### 결과 [O]
- 세션 초기화: 38K → 1.1K (97% 절감)
- Per-turn: 1,700 → 300 토큰 (82% 절감)
- 총 5,400+ 라인 최적화
- v5.0 "역성장 릴리스": 순 2,434줄 감소 (기능 100%, 비용 3%)
- Codex CLI로 6개 내부 비일관성 발견/수정 (commit `adb3d11`)

---

## Experience 2: Multi-CLI 오케스트레이션 — Claude + Codex + Gemini

**프로젝트**: open-pantheon (ultra-cc-init에서 시작)

### 목표 [O]
각 AI CLI의 강점을 극대화하는 역할 분담 아키텍처 구축. 단일 AI의 자기 검증 한계 돌파.

### 현상 [O]
단일 Claude Code가 코드 분석, 디자인 생성, 빌드 검증을 모두 수행. 동일 모델의 blind spot 공유로 특정 유형의 버그/결함을 체계적으로 놓침. 디자인 생성과 코드 검증에서 특화 모델 대비 품질 저하.

### 원인 가설 [O]
Claude가 코드 작성에 능숙하고, Codex가 Critical한 부분과 자세히 봐야 하는 부분에 능숙한 것을 확인. Gemini는 디자인에 유리한 것을 관찰. 각 CLI의 강점/약점을 실사용에서 파악한 후 역할 분배를 설계. 서로 다른 모델 아키텍처(Claude vs GPT-5-codex vs Gemini)를 사용하면 blind spot이 중첩되지 않는다는 가설.

### 판단 기준 [O]
Codex가 6개 내부 불일치를 발견한 경험(commit `adb3d11`)이 결정적 계기. 이 성공 사례로 "검증 전용 CLI"의 가치가 입증됨. Codex는 `--sandbox read-only`로 안전성 보장, Gemini는 `-y` auto-accept로 비대화형 디자인 생성, Claude는 모든 파일 수정과 오케스트레이션 담당이라는 명확한 경계 설정.

### 실행 [O]
- Claude Code (Lead): 전체 오케스트레이션 + 코드 생성 + 내러티브 추출
- Codex CLI (Analyst): Phase 1 코드 분석, Phase 3.5 빌드 검증 (`--sandbox read-only`)
- Gemini CLI (Designer): Phase 2 디자인 프로파일, Phase 3 SVG/Mermaid 시각화 (`-y`)
- 3단계 Fallback: 경량 모델 → 1회 재시도 → Claude 대체
- 모든 CLI 호출/fallback을 `.state.yaml` log에 이벤트 기록

### 결과 [O]
- 버그 사전 발견율 증가: 단일 AI 대비 교차 검증으로 발견하는 문제의 양과 질 향상
- 역할 분담으로 속도 향상: 각 CLI가 전문 영역에 집중하여 파이프라인 전체 속도 체감 개선
- AI 산출물 신뢰도 증가: 다른 모델이 검증한다는 구조적 보장으로 결과물에 대한 신뢰 복합적으로 향상

---

## Experience 3: Configuration-as-Code — 코드 없는 AI Agent 프레임워크

**프로젝트**: cc-initializer에서 시작 → ultra-cc-init → open-pantheon으로 계승

### 목표 [O]
런타임 소스 코드 없이, Markdown + Shell + JSON만으로 25+ agents, 27+ skills, 6+ hooks 생태계 구현. 어떤 프로젝트에든 `.claude/` 디렉토리 복사만으로 적용 가능한 이식성.

### 현상 [O]
Claude Code에는 프로젝트 초기화 프레임워크가 없었음. 매 프로젝트마다 `.claude/` 설정을 처음부터 수동 구성. 프로젝트 간 일관성 부재. Phase 관리, Sprint 추적, Quality Gate 등 개발 라이프사이클 자동화 부재.

### 원인 가설 [O]
Claude Code 런타임이 Markdown을 에이전트 프롬프트로 해석하는 네이티브 메커니즘을 이미 보유. 별도 런타임이 불필요하다는 판단. `.claude/` 디렉토리 구조가 곧 프레임워크가 될 수 있다는 통찰. Convention over Configuration + Declarative Agent 패턴 채택.

### 판단 기준 [O]
이식성이 결정적 기준. `.claude/` 디렉토리를 통째로 복사하면 어떤 프로젝트에나 즉시 적용 가능(`/init --sync`). TypeScript SDK 같은 코드 기반 접근은 빌드/배포 복잡도, 타겟 프로젝트 의존성 오염 문제. 유일한 trade-off는 JSON 형식으로 write/read 시 토큰 소모가 큰 것이며, 이 외에는 Config-as-Code가 압도적 우위.

### 실행 [O]
- cc-initializer: 113 Markdown + 7 Shell + 7 JSON = 134파일 (Markdown 84%)
- ultra-cc-init: 117 Markdown + 8 Shell + 7 JSON = 139파일 (Markdown 84%)
- open-pantheon: 138 Markdown + 9 Shell + 12 JSON = 197파일 (Markdown 70%)
- 모든 에이전트 행동이 Markdown 편집으로 변경 가능 — 코드 디버깅 불필요
- settings.json이 17-section 중앙 설정 허브 역할

### 결과 [O]
- DXTnavis 프로젝트 실제 채택 (PROJECTS.json 등록)
- `/init --sync`로 기존 프로젝트에 원커맨드 적용 검증
- 사람이 읽고 수정 가능한 투명한 시스템 (비개발자도 에이전트 행동 이해 가능)
- JSON write/read 시 토큰 비용이 유일한 trade-off — 이를 2-Tier Document + Structured Data로 상쇄

---

## Experience 4: 47일 삼부작 연속 진화 — AI Native 생태계 구축

**프로젝트**: cc-initializer → ultra-cc-init → open-pantheon (전체)

### 목표 [O]
AI와 개발자가 함께 일하는 방식에 대한 하나의 답안. 프로젝트 초기화부터 포트폴리오 생성까지 모든 개발 라이프사이클을 AI agent가 관리하는 통합 생태계 구축.

### 현상 [O]
AI 코딩 도구(Claude Code, Codex CLI, Gemini CLI)가 각각 강력하지만 독립적으로 존재. 매 프로젝트마다 초기화/문서 생성/Phase 관리/품질 검증/배포를 각각 수동 설정. 완성된 프로젝트의 포트폴리오 전환은 전혀 다른 수동 워크플로우.

### 원인 가설 [O]
3부작은 사전 계획이 아닌 자연스러운 진화의 결과. 각 분기의 트리거는 **범위 확장**:
- cc-initializer: 초기화 도구로 시작 → 기능 확장 중 토큰 폭발 문제 발생
- ultra-cc-init: 토큰 최적화 필요성이 범위를 넘어서면서 별도 프로젝트로 분기
- open-pantheon: 포트폴리오 파이프라인(foliocraft) 추가 요구 + 개발 라이프사이클과의 통합 필요성

### 판단 기준 [O]
"기존 프로젝트의 범위를 넘어서는 요구가 발생할 때" 새 프로젝트로 분기. cc-initializer는 "초기화"가 핵심 정체성인데 "최적화"는 다른 관심사. ultra-cc-init은 "개발 자동화"인데 "포트폴리오 생성"은 다른 도메인. 범위(scope)의 자연스러운 확장이 분기를 촉발.

### 실행 [O]
- cc-initializer: 38커밋, 28일, v1.0→v4.5, 134파일 21K줄
- ultra-cc-init: 40커밋, 6일 집중, v5.0→v5.1+, 139파일 21.6K줄
- open-pantheon: 1커밋 단일 초기화 (foliocraft + ultra-cc-init 합병), 197파일 29.5K줄
- 총 79커밋, 47일, 3레포

### 결과 [O]
- 단일 프로젝트 초기화 도구 → Multi-CLI 오케스트레이션 플랫폼으로 진화
- 코드량 37% 성장 (21K → 29.5K) + 역할 근본적 확장
- 13-state 상태머신 + 6 Quality Gates + 7 Hooks 자동화 체계 완성
- `/craft` 하나로 Phase 1→4 전체 파이프라인 실행 가능

---

## Experience 5: Discovery First + 6블록 경험 구조화

**프로젝트**: cc-initializer v3.0에서 시작 → open-pantheon experience-interviewer로 확장

### 목표 [O]
AI의 맹목적 코드 생성 방지. "AI가 코드 생성 전에 먼저 프로젝트를 이해해야 한다"는 원칙 확립. 코드 분석으로 추출 가능한 정보와 사람만 아는 정보의 갭을 체계적으로 식별하고 구조화.

### 현상 [O]
AI가 프로젝트 이해 없이 코드를 생성하면 기존 아키텍처와 충돌하거나 도메인 맥락이 빠진 결과물 생성. 코드 분석만으로는 "왜 이 결정을 했는가", "어떤 대안을 고려했는가"를 알 수 없음.

### 원인 가설 [O]
코드에서 추출 가능한 정보(아키텍처, 스택, 메트릭)와 사람만 아는 정보(목표, 가설, 판단 기준)의 구조적 갭이 존재. STAR(Situation-Task-Action-Result) 같은 기존 프레임워크는 "원인 가설"과 "판단 기준"이라는 핵심 블록이 빠져 있어 부족.

### 판단 기준 [O]
6블록 설계는 실제 **국내 자기소개서에서 사용되는 최신 전략**에서 영감. 최근 트렌드가 계속 바뀌면서 기존 STAR 프레임워크로는 부족한 영역이 발생. 특히 "원인 가설"(왜 이 문제가 발생했다고 생각했는가)과 "판단 기준"(어떤 기준으로 이 접근을 선택했는가)이 코드 분석에서 가장 추출하기 어려운 블록이며, 이를 명시적으로 구조에 포함.

### 실행 [O]
- cc-initializer v3.0: Discovery First 도입 — `project-discovery` agent가 대화 기반으로 DISCOVERY.md 생성
- open-pantheon: experience-interviewer agent 구현
  - 분석 결과에서 6블록 매핑 수행 (O/△/X 판정)
  - 갭이 있는 블록만 사용자에게 AskUserQuestion
  - 최대 3라운드, 라운드당 1-4개 질문
  - 답변을 6블록 형식으로 구조화하여 experience-blocks.md 생성

### 결과 [O]
- resumely: 5개 경험 x 6블록 = 30블록 중 27블록 [O], 3블록 [△] (정량적 측정 보류)
- 삼부작 통합: 5개 경험 x 6블록 = 30블록 완전 구조화 (2라운드, 7개 질문)
- "코드가 말하지 못하는 것"(가설, 판단 기준)을 체계적으로 수집하는 유일한 대화형 에이전트
- 자기소개서 트렌드 반영으로 국내 개발자 포트폴리오에 최적화된 경험 서술 지원

---

## Gap Summary

| 경험 | 목표 | 현상 | 원인가설 | 판단기준 | 실행 | 결과 |
|------|:----:|:----:|:-------:|:-------:|:----:|:----:|
| 1. 97% 토큰 최적화 | O | O | O | O | O | O |
| 2. Multi-CLI 오케스트레이션 | O | O | O | O | O | O |
| 3. Configuration-as-Code | O | O | O | O | O | O |
| 4. 47일 삼부작 진화 | O | O | O | O | O | O |
| 5. Discovery First + 6블록 | O | O | O | O | O | O |

**인터뷰 후 모든 갭 해소** — 5개 경험 x 6블록 = 30블록 전체 [O]
