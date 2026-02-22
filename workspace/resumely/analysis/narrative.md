# resumely Narrative

## One-liner
> 경험 데이터와 채용공고를 AI로 매칭하여, 한국 취업 시장에 최적화된 자기소개서와 이력서를 실시간 스트리밍으로 생성하는 풀스택 SaaS 플랫폼 (Next.js 15 + Multi-model AI + Supabase)

## Problem & Solution

### Problem
한국 취업 시장에서 자기소개서(커버레터) 작성은 지원자에게 가장 시간 집약적인 과정이다. 기업마다 다른 문항, 글자수 제한, 직무별 키워드 요구사항이 존재하며, 지원자는 매 공고마다 자신의 경험을 새로운 구조로 재구성해야 한다. 기존 AI 작성 도구들은 두 가지 핵심 문제를 안고 있다:

1. **AI 특유의 추상적 문체**: "열정을 가지고", "기여하겠습니다" 같은 클리셰가 반복되어 인사담당자에게 즉시 감별된다
2. **경험-직무 간 매칭 부재**: 지원자의 실제 경험을 채용공고의 요구 역량과 정밀하게 연결하지 못한다

### Solution
Resumely는 사용자의 경험을 12개 AI 카테고리로 구조화하여 저장(Experience Hub + Context Bank)하고, 채용공고를 키워드/역량/채용 의도까지 심층 분석한 뒤, Signal-weighted 매칭 알고리즘으로 최적의 경험-직무 조합을 추천한다. SSE 실시간 스트리밍으로 생성 과정을 2~3초 만에 시작하며, K-STAR-K 준수 검증 + 금지 문구 탐지 + 자동 재시도로 품질을 보장한다.

### Why This Approach
- **"판단 기준(Decision Rule)" 중심 구조화**: 한국 대기업 인사담당자 관점의 7단계 자기소개서 프레임워크(`자기소개서_작성_프레임워크.md`)를 프롬프트 시스템에 내장하여 "왜 그렇게 했는지"를 명문화하는 사고 흐름 기반 작성
- **Multi-model AI 선택권**: Claude (Haiku/Sonnet/Opus), GPT-4o/4o-mini, Gemini 2.0 Flash 중 상황에 맞는 모델을 사용자가 선택 — 비용 대비 품질 최적화
- **완전한 한/영 이중 언어**: next-intl 기반으로 UI, 프롬프트, 검증 규칙 모두 이중 언어 대응
- **Vercel AI SDK + SSE**: `streamObject()`와 커스텀 SSE 프로토콜로 30초 대기를 2~3초로 단축

## Milestones

| Date | Milestone | Impact | Evidence |
|------|-----------|--------|----------|
| 2026-01 | **Phase 1 Foundation 출시** — Next.js 15 + Supabase + shadcn/ui 기반 풀스택 골격 완성. OAuth 인증, Context Bank, Job Posting, 기본 생성 파이프라인 구축 | 6개 DB 테이블, RLS 보안 정책, 자동 프로필/크레딧 생성 트리거 포함한 프로덕션 레벨 스키마 확립 | `commit:6543eb5` |
| 2026-01 | **Phase 2 Core Features + Phase 3 Monetization** — 5개 작성 전략(STAR, company-tailored, keyword-optimize, quantifiable, growth-narrative), Freeform/Items 모드, Context Matching, PortOne V2 결제 시스템 통합 | 크레딧 기반 수익화 모델 확립. 분석은 무료(GPT-4o-mini), 생성은 모델별 1~10 크레딧 과금. 결제 실패 시 자동 환불 | `commit:cbfab5a` |
| 2026-02-07 | **자기소개서 프레임워크 통합** — 7-Phase 작성 전략 프레임워크를 프롬프트 시스템에 내장. Few-shot examples, 출력 검증(validate-output.ts), Context Matching 동의어 매핑(30+ 한영 기술 용어) | 생성 품질의 체계적 관리 시작. K-STAR-K 준수율 검증, 금지 문구 9개(한국어)+7개(영어) 탐지, ±30% 글자수 이탈 시 자동 재생성 | `commit:c219ecb`, `commit:425a123` |
| 2026-02-08 | **UX/보안 대규모 개선** — Toss 스타일 랜딩 페이지 리디자인, 이미지 OCR 분석, Rate Limiting, Webhook 검증, CSP 헤더, OAuth locale-aware redirect | 하루 동안 8개 커밋으로 보안 경화와 UX 개선을 병행. 클립보드 이미지 붙여넣기, 네비게이션 스켈레톤 등 실사용 편의성 확보 | `commit:e81c5d4`, `commit:8fa6a99`, `commit:fee29b9` 외 5건 |
| 2026-02-10 | **SSE 실시간 스트리밍 아키텍처 구축** — `streamObject()` + 커스텀 SSE 프로토콜(started/partial/validating/retrying/complete/error). `useTransition`으로 UI freeze 제거 | 체감 대기 시간 ~30초 → ~2-3초로 단축. 6단계 생명주기(idle/generating/validating/retrying/complete/error) 관리. AbortController 기반 사용자 취소 지원 | `commit:25a6089`, `commit:629df72` |
| 2026-02-22 | **Experience Hub + Resume Builder** — 12개 AI 카테고리 경험 관리, A4 라이브 프리뷰(794x1123px) 이력서 빌더, URL 스크래핑 Job Fetcher, Context Bank 아카이브/복원, 사이드바 네비게이션 | 단일 커밋으로 54개 파일, 7,948줄 추가. 5개 DB 마이그레이션. 앱이 커버레터 전용에서 통합 취업 준비 플랫폼으로 확장 | `commit:5c79a69` |

## Impact Metrics

| Metric | Value | Source |
|--------|-------|--------|
| 총 커밋 수 | 22 | `git log --oneline --all \| wc -l` |
| 총 코드 삽입량 | 68,969줄 | `git log --shortstat` 집계 |
| 소스 코드 규모 (src/) | 19,255줄 (111개 파일) | `find src -name "*.ts" -o -name "*.tsx" \| xargs wc -l` |
| DB 마이그레이션 수 | 11개 | `supabase/migrations/` |
| 컴포넌트 파일 수 | 40개 | `src/components/` |
| API 라우트 수 | 16개 | `src/app/api/` |
| AI 프롬프트 시스템 규모 | 960줄 | `src/lib/ai/prompts.ts` |
| 지원 AI 모델 수 | 6개 (Claude Haiku/Sonnet/Opus, GPT-4o/4o-mini, Gemini 2.0 Flash) | `src/lib/ai/models.ts` |
| 작성 전략 수 | 6개 (STAR, 3C4P, company-tailored, keyword-optimize, quantifiable, growth-narrative) | `src/lib/ai/prompts.ts` |
| i18n 지원 언어 | 2개 (한국어/영어) | `messages/ko.json`, `messages/en.json` |
| 개발 기간 | 23일 (2026-01-31 ~ 2026-02-22) | `git log --format="%ad" --date=short` |
| Context Bank 시드 데이터 | 27 + 15 = 42개 경험 항목 | `docs/CONTEXT-BANK-GUIDE.md` |

## Hero Content

### Headline
AI가 당신의 경험과 채용공고를 읽고, 인사담당자가 인정하는 자기소개서를 2초 만에 쓰기 시작합니다

### Description
Resumely는 한국 취업 시장에 특화된 AI 자기소개서/이력서 생성 플랫폼입니다. 12개 AI 카테고리로 구조화된 경험 데이터, 채용공고 심층 분석(키워드/역량/채용 의도/면접 예상 질문), Signal-weighted 매칭 알고리즘이 최적의 경험-직무 조합을 추천합니다. 6개 AI 모델과 6개 작성 전략 중 선택하면, SSE 실시간 스트리밍으로 즉시 결과를 확인하고, K-STAR-K 품질 검증이 자동으로 완성도를 보장합니다.

### Key Achievements
- **23일 만에 풀스택 SaaS 구축**: Next.js 15 + Supabase + 6개 AI 모델 통합, 19,000+ 줄 TypeScript, 11개 DB 마이그레이션
- **한국 자기소개서 도메인 특화**: 7-Phase 작성 프레임워크, "판단 기준(Decision Rule)" 중심 구조화, AI 클리셰 탐지/차단
- **SSE 실시간 스트리밍**: 체감 대기 시간 ~30초 → ~2-3초, 6단계 생명주기 관리, 자동 품질 재시도
- **Experience Hub → Cover Letter → Resume 통합 파이프라인**: 경험 저장 → 공고 분석 → 매칭 추천 → 생성 → 검증 → 이력서 빌드까지 원스톱

## Story Arc

Resumely는 2026년 1월 31일, 단일 파일 React 프로토타입(`cover-letter-assistant.tsx`)에서 시작되었다. 이 프로토타입은 "경험 업로드 → AI 분석 → 공고 비교 → 자기소개서 생성"이라는 핵심 흐름을 검증했고, 같은 날 Next.js 15 App Router 기반의 풀스택 아키텍처로 전환하며 Phase 1 Foundation이 완성되었다.

Phase 1과 Phase 2는 거의 동시에 진행되었다 — 첫 커밋에서 이미 Supabase 스키마(6개 테이블, RLS), OAuth 인증, Context Bank, Job Posting 분석의 골격이 잡혔고, 같은 날 5개 작성 전략, 2개 생성 모드(Freeform/Items), PortOne V2 결제 시스템까지 통합되었다. 이는 프로토타입 단계에서 비즈니스 모델까지 이미 설계가 완료되어 있었음을 보여준다.

2026년 2월 첫째 주(7~8일)는 프로젝트의 품질 전환점이었다. 한국 대기업 인사담당자 관점의 7-Phase 자기소개서 프레임워크(`자기소개서_작성_프레임워크.md`)가 프롬프트 시스템에 통합되면서, 단순 AI 생성에서 "판단 기준 중심의 사고 흐름 재구성"으로 패러다임이 전환되었다. 동시에 Few-shot examples, K-STAR-K 준수 검증, 금지 문구 탐지, Context Matching 동의어 매핑(30+ 한영 기술 용어 쌍)이 추가되어 품질 보증 체계가 확립되었다. 2월 8일 하루 동안에만 8개 커밋이 발생하며, Toss 스타일 랜딩 리디자인, 이미지 OCR, Rate Limiting, Webhook 검증 등 보안과 UX가 동시에 강화되었다.

2월 10일, 체감 품질을 결정짓는 기술적 도약이 이루어졌다. Vercel AI SDK의 `streamObject()`와 커스텀 SSE 프로토콜을 결합한 실시간 스트리밍 아키텍처가 구축되어, 사용자가 생성 결과를 2~3초 만에 볼 수 있게 되었다. `useTransition`을 활용한 UI freeze 제거, 6단계 생명주기 상태 관리, AbortController 기반 사용자 취소까지 — 이 시점에서 Resumely는 기술적으로 프로덕션 레벨에 도달했다.

2월 13일 보안 경화(Webhook 검증 강화, 크레딧 로직 정비, CSP 헤더)를 거친 뒤, 9일간의 침묵 끝에 2월 22일 프로젝트의 가장 큰 전환이 발생했다. 단일 커밋으로 54개 파일, 7,948줄이 추가되며 Experience Hub(12개 AI 카테고리 경험 관리), Resume Builder(A4 라이브 프리뷰), URL 기반 Job Fetcher, Context Bank 아카이브/복원이 한꺼번에 도입되었다. 이로써 Resumely는 "자기소개서 생성기"에서 "통합 취업 준비 플랫폼"으로 정체성이 확장되었다.

23일이라는 짧은 기간 동안 22개 커밋, 68,969줄의 코드가 작성되었다. 이 속도가 가능했던 이유는 세 가지다: (1) 프로토타입 단계에서의 철저한 도메인 분석, (2) Next.js 15 App Router + Supabase + Vercel AI SDK라는 최신 풀스택 조합의 생산성, (3) Claude Code와의 AI 페어 프로그래밍.

## Technical Challenges

### Challenge 1: AI 생성 품질 제어 — "AI가 쓴 티"를 없애는 것
- **Problem**: LLM이 생성하는 자기소개서는 "열정을 가지고", "기여하겠습니다" 같은 AI 특유의 추상적 클리셰를 반복하여, 경험 많은 인사담당자에게 즉시 감별된다. 또한 글자수 제한(±10%)을 정확히 맞추는 것이 어렵다.
- **Impact**: 생성된 자기소개서의 실사용 가능성을 결정짓는 핵심 품질 요소. 클리셰가 포함된 자기소개서는 서류 탈락으로 직결된다.
- **Solution**: 3중 품질 보증 체계를 구축했다. (1) Few-shot examples로 좋은/나쁜 예시를 프롬프트에 내장 (`src/lib/ai/prompts.ts`), (2) `validate-output.ts`에서 글자수 정확도, 금지 문구 9+7개 탐지, K-STAR-K 준수(정량적 결과 패턴 2개 이상), 반복 구조 감지를 수행, (3) ±30% 글자수 이탈 또는 3개 이상 금지 문구 시 corrective feedback과 함께 자동 재생성.
- **Evidence**: `src/lib/ai/validate-output.ts` (445줄), `src/lib/ai/prompts.ts` (960줄), `src/lib/ai/framework.ts` (AI_STYLE_PATTERNS 8개 정의), `commit:c219ecb`

### Challenge 2: SSE 실시간 스트리밍 아키텍처 설계
- **Problem**: 자기소개서 생성에 ~30초가 소요되어, 사용자가 결과를 기다리는 동안 "작동하고 있는지" 불확실하다. 또한 생성 후 품질 검증 + 자동 재시도라는 후처리 단계가 필요하여, Vercel AI SDK의 기본 `experimental_useObject` 훅으로는 대응 불가능하다.
- **Impact**: 체감 대기 시간이 UX의 핵심이며, 후처리(검증/재시도/LetterResultV2 래핑) 없이는 품질 보증이 불가능하다.
- **Solution**: 커스텀 SSE 프로토콜(`data: {...}\n\n`)을 설계하여 6종 이벤트 타입(started/partial/validating/retrying/complete/error)을 정의했다. 서버에서 `streamObject()`로 Zod 스키마 기반 스트리밍을 시작하고, 클라이언트의 `useGenerateStream` 훅이 `ReadableStream` + `TextDecoder`로 SSE 청크를 파싱한다. 분할 청크 처리를 위한 버퍼 누적, `AbortController` 기반 사용자 취소, 비-SSE 폴백까지 구현.
- **Evidence**: `src/hooks/use-generate-stream.ts` (167줄), `src/app/api/ai/generate/route.ts` (567줄), `commit:25a6089`

### Challenge 3: 경험-직무 Signal-weighted 매칭
- **Problem**: 사용자의 경험 데이터(Context Bank, 최대 42+ 항목)와 채용공고의 요구사항을 단순 키워드 매칭으로 연결하면, 한영 혼용 기술 용어(Docker↔도커, BIM↔건축정보모델링) 매칭 실패 + 경험 카테고리별 중요도 차이를 반영하지 못한다.
- **Impact**: 잘못된 경험이 추천되면 생성된 자기소개서의 직무 적합성이 크게 떨어진다.
- **Solution**: 30+ 한영 기술 용어 동의어 쌍(AI↔인공지능, React↔리액트 등)을 양방향 확장하고, 카테고리별 가중치(project/skill: 2x, problem: 1.5x, collaboration/personality/growth: 1x)를 적용한 점수 기반 정렬 알고리즘을 구현.
- **Evidence**: `src/lib/context-matching.ts` (392줄), `docs/CHANGELOG-2026-02-06.md`, `commit:c219ecb`

### Challenge 4: 23일 만에 프로덕션 레벨 SaaS 구축
- **Problem**: OAuth 인증, RLS 보안, 결제 시스템, Multi-model AI, i18n, 실시간 스트리밍, 품질 검증까지 포함한 풀스택 SaaS를 극한의 속도로 구축해야 했다.
- **Impact**: 빠른 시장 검증이 필요한 개인 프로젝트에서 속도와 품질의 균형이 핵심이었다.
- **Solution**: (1) 프로토타입(`cover-letter-assistant.tsx`)에서 핵심 로직을 검증한 뒤 Next.js 15 App Router로 전환, (2) Supabase의 Auth + RLS + Storage로 백엔드 인프라를 최소화, (3) Vercel AI SDK로 6개 모델 통합을 추상화, (4) shadcn/ui + Tailwind CSS 4로 UI 생산성 극대화, (5) Claude Code AI 페어 프로그래밍으로 구현 속도 가속.
- **Evidence**: `commit:6543eb5` ~ `commit:5c79a69` (22 commits, 68,969줄 삽입, 23일간)
