# resumely Architecture Analysis

## Overview

AI 기반 맞춤형 자기소개서/커버레터 생성 서비스. 사용자의 경험 데이터(Context Bank/Experiences)와 채용공고(Job Postings)를 다중 AI 모델(Claude, GPT, Gemini)로 분석하여 개인화된 자기소개서를 자동 생성하고, 생성 결과를 자동 검증/평가하는 풀스택 SaaS 애플리케이션.

## Tech Stack

| Category | Technology | Version | Notes |
|----------|-----------|---------|-------|
| Framework | Next.js (App Router) | 16.1.6 | React 19 기반, Server Actions 10MB 제한 (`next.config.ts:17-19`) |
| Language | TypeScript | ^5 | strict mode, bundler moduleResolution (`tsconfig.json:6,12`) |
| Styling | Tailwind CSS | ^4 | PostCSS 플러그인, `tw-animate-css` 포함 (`package.json:52`) |
| UI Components | shadcn/ui (Radix) | New York style | 20개 UI primitive, `components.json:6` RSC 지원 |
| Animation | Framer Motion | ^12.33.0 | Landing page 트랜지션 (`page.tsx:9`) |
| State (Server) | TanStack React Query | ^5.90.20 | staleTime 2min, gcTime 5min (`providers.tsx:14-15`) |
| State (Client) | Zustand | ^5.0.10 | 단일 `app-store.ts` (모델 선택, 전략, 질문 항목 관리) |
| AI SDK | Vercel AI SDK | ^6.0.64 | `streamObject`, `generateObject`, 3-provider 추상화 |
| AI Providers | Anthropic, OpenAI, Google | 각 ^3.x | 8개 모델 정의, 3-tier credit 시스템 (`models.ts:11-84`) |
| Auth | Supabase Auth | ^2.93.3 | SSR 기반, 미들웨어 세션 갱신 (`middleware.ts:1-34`) |
| Database | Supabase PostgreSQL | - | RLS 적용, 10 테이블, 11 마이그레이션 |
| Storage | Supabase Storage | - | `context-files`, `job-images` 버킷 |
| i18n | next-intl | ^4.8.1 | KO/EN, 776줄 메시지 파일, locale routing (`routing.ts:4-7`) |
| Forms | React Hook Form + Zod | ^7.71.1 / ^4.3.6 | 스키마 검증, `@hookform/resolvers` |
| Payments | PortOne Browser SDK | ^0.1.3 | 한국 PG 결제 (`payments/portone.ts`) |
| File Parsing | mammoth.js | ^1.11.0 | DOCX 텍스트 추출 |
| Deploy | Vercel | - | Fluid Compute (AI 라우트 300s timeout), Security Headers |

## Architecture

**Architecture Style: Serverless Layered Monolith**

Next.js App Router 기반의 서버리스 모놀리스 구조. 프레젠테이션(React pages), 비즈니스 로직(API routes + lib), 데이터 접근(Supabase client)이 단일 배포 단위로 결합되되, 관심사는 디렉토리로 분리됨.

```
┌─────────────────────────────────────────────────────────┐
│                    Client (Browser)                      │
│  Pages ([locale]/*) ← Zustand + React Query             │
│  ├─ Landing, Dashboard, Bank, Jobs, Generate, History   │
│  ├─ Resume, Settings, About, Login, Signup              │
│  └─ SSE streaming (useGenerateStream hook)              │
├─────────────────────────────────────────────────────────┤
│              Middleware (proxy.ts)                        │
│  Supabase Auth refresh + next-intl locale routing        │
│  Protected paths: /dashboard,/bank,/resume,/jobs,...     │
├─────────────────────────────────────────────────────────┤
│                API Layer (21 routes)                      │
│  ├─ /api/ai/analyze    ← generateObject (구조화 분석)    │
│  ├─ /api/ai/generate   ← streamObject → SSE (생성)      │
│  ├─ /api/ai/evaluate   ← generateObject (평가)          │
│  ├─ /api/experiences/* ← CRUD + AI 구조화              │
│  ├─ /api/bank/upload   ← 파일 파싱 + 저장              │
│  ├─ /api/jobs/fetch    ← URL 스크래핑                   │
│  ├─ /api/resumes/*     ← 이력서 CRUD                   │
│  ├─ /api/payments/*    ← PortOne 결제 플로우            │
│  ├─ /api/credits       ← 크레딧 조회                   │
│  ├─ /api/letters/edit  ← 생성 결과 편집                 │
│  └─ /api/auth/callback ← Supabase Auth OAuth 콜백      │
├─────────────────────────────────────────────────────────┤
│            Business Logic (src/lib/)                     │
│  ├─ ai/ (models, providers, prompts, validate-output)   │
│  ├─ credits.ts (deduct, refund, purchase with OCC)       │
│  ├─ context-matching.ts (신호 가중치 매칭 알고리즘)       │
│  ├─ hiring-schedule.ts (채용 일정 파싱/정규화)           │
│  ├─ rate-limit.ts (in-memory 토큰 버킷)                 │
│  ├─ web/job-posting-fetcher.ts (SSRF 방어 + HTML 파싱)  │
│  └─ validations/ (experience, resume 검증)              │
├─────────────────────────────────────────────────────────┤
│          Data Layer (Supabase)                            │
│  ├─ client.ts  (브라우저 — createBrowserClient)          │
│  ├─ server.ts  (서버 — createServerClient + cookies)     │
│  └─ middleware.ts (미들웨어 — 세션 갱신)                 │
│  PostgreSQL + RLS (auth.uid() = user_id)                 │
│  Storage: context-files, job-images                      │
└─────────────────────────────────────────────────────────┘
```

## Module Structure

| Module | Responsibility | Key Files | LoC (추정) |
|--------|---------------|-----------|-----|
| AI Core | AI 모델 정의, 프로바이더 추상화, 시스템 프롬프트, 출력 검증 | `src/lib/ai/models.ts`, `providers.ts`, `prompts.ts`, `validate-output.ts`, `framework.ts` | ~2,930 |
| AI Routes | 분석/생성/평가 API 엔드포인트 | `src/app/api/ai/analyze/route.ts`, `generate/route.ts`, `evaluate/route.ts` | ~1,130 |
| Context Matching | 채용공고 신호와 경험 데이터 가중치 매칭 | `src/lib/context-matching.ts` | 392 |
| Credit System | 크레딧 차감/환불/구매 + Optimistic Concurrency | `src/lib/credits.ts` | 116 |
| Auth & Middleware | Supabase Auth SSR + next-intl locale routing + 보호 라우팅 | `src/proxy.ts`, `src/lib/supabase/*.ts` | ~110 |
| Experiences | 구조화된 경험 데이터 CRUD + AI 분석 | `src/app/api/experiences/**`, `src/hooks/use-experiences.ts`, `src/components/experiences/*` | ~1,800 |
| Context Bank | 레거시 경험 문서 업로드/분석/관리 | `src/app/api/bank/*`, `src/hooks/use-context-bank.ts`, `src/components/bank/*` | ~800 |
| Job Postings | 채용공고 등록/분석/URL 스크래핑 | `src/app/api/jobs/*`, `src/hooks/use-job-postings.ts`, `src/lib/web/*`, `src/components/jobs/*` | ~1,000 |
| Generation UI | 생성 설정 + SSE 스트리밍 + 결과 표시 + 평가 | `src/app/[locale]/generate/page.tsx`, `src/hooks/use-generate-stream.ts`, `src/components/generate/*` | ~2,150 |
| Resume Builder | 이력서 문서 CRUD + 섹션 관리 | `src/app/api/resumes/**`, `src/app/[locale]/resume/page.tsx`, `src/hooks/use-resumes.ts` | ~1,950 |
| Payments | PortOne 결제 + 크레딧 충전 | `src/app/api/payments/**`, `src/lib/payments/*`, `src/components/payments/*` | ~600 |
| Hiring Schedule | 채용 일정 파싱/정규화/관리 | `src/lib/hiring-schedule.ts` | 151 |
| UI Primitives | shadcn/ui Radix 기반 컴포넌트 | `src/components/ui/*.tsx` (20 files) | ~2,500 |
| Layout | 사이드바 + 페이지 레이아웃 | `src/components/layout/*`, `src/app/[locale]/layout.tsx` | ~340 |
| Store | 클라이언트 상태 (모델/전략/문항/경험 선택) | `src/stores/app-store.ts` | 138 |
| Types | DB 스키마 + 도메인 타입 정의 | `src/types/database.ts` | 571 |
| i18n | KO/EN 메시지 + routing 설정 | `src/i18n/routing.ts`, `messages/*.json` | ~1,560 |

## Data Flow

### 1. 경험 업로드 → AI 분석 (Context Bank Flow)

```
User uploads DOCX/PDF/Text
  → POST /api/bank/upload (mammoth.js 파싱)
    → context_bank INSERT (status: pending)
    → POST /api/ai/analyze (type: context)
      → generateObject(gpt-4o-mini, contextResultSchema)
      → context_bank UPDATE (segments: JSONB, status: complete)
```
- 근거: `src/hooks/use-context-bank.ts:46-64` (uploadFile mutation)
- 근거: `src/app/api/ai/analyze/route.ts:93-141` (context 분석 분기)

### 2. 채용공고 등록 → AI 분석 (Job Analysis Flow)

```
User pastes JD text / URL / images
  → POST /api/ai/analyze (type: job)
    → [URL인 경우] fetchJobPostingFromUrl() — SSRF 방어 후 HTML 파싱
    → [이미지인 경우] Supabase Storage signed URL → multimodal 분석
    → generateObject(gpt-4o-mini/gpt-5-mini, jobResultSchema)
    → job_postings UPDATE (analysis: JSONB, hiring_schedule 자동 추출)
```
- 근거: `src/app/api/ai/analyze/route.ts:144-366` (job 분석 분기)
- 근거: `src/lib/web/job-posting-fetcher.ts:160-213` (URL 스크래핑)

### 3. 자기소개서 생성 (Generation Flow — 핵심 플로우)

```
User selects: job + contexts/experiences + model + strategies + mode
  → POST /api/ai/generate
    → Auth check + rateLimit(10/min)
    → deductCredits() — Optimistic Concurrency Control
    → Build prompt: 공고원문 + 분석요약 + Target Facts + 경험자료 + 전략 addendum
    → generated_letters INSERT (status: processing)
    → SSE stream:
      ├─ streamObject(provider, schema, systemPrompt, prompt)
      │   → partial events → client renders progressively
      ├─ validateOutput(content, charLimit, locale)
      │   → char count, banned phrases, K-STAR-K, anti-patterns
      ├─ shouldRetry() → [if critical] generateObject(retryPrompt)
      └─ complete event + generated_letters UPDATE (status: complete)
    → Client: useGenerateStream() manages SSE lifecycle (5-phase FSM)
```
- 근거: `src/app/api/ai/generate/route.ts:213-567` (전체 생성 엔드포인트)
- 근거: `src/hooks/use-generate-stream.ts:28-167` (SSE 클라이언트 훅)
- 근거: `src/lib/ai/validate-output.ts:217-361` (출력 검증)

### 4. 경험-공고 매칭 (Context Matching Flow)

```
Job analysis (JobAnalysis)
  → buildSignals(): mustHave(2.2x) > responsibilities(1.8x) > requirements(1.6x) > keywords(1.4x) > ...
  → For each context:
    → Segment keyword match (category weight * signal weight)
    → Evidence text match (0.45x discount)
    → Raw text fallback match (0.35x discount)
  → Sort by score → filter by MIN_RECOMMEND_SCORE(2.4)
  → Return recommended (max 8) + other
```
- 근거: `src/lib/context-matching.ts:236-348` (recommendContexts 함수)
- 근거: `src/lib/context-matching.ts:50-76` (가중치 상수)

### 5. 결제 → 크레딧 충전 (Payment Flow)

```
User selects credit package
  → POST /api/payments/prepare (order 생성)
  → PortOne Browser SDK 결제 UI
  → POST /api/payments/complete (결제 확인)
  → addPurchasedCredits() → user_credits + credit_transactions UPDATE
  → [Webhook] POST /api/payments/webhook (비동기 검증)
```
- 근거: `src/lib/credits.ts:82-115` (addPurchasedCredits)
- 근거: `package.json:17` (PortOne SDK)

## Design Decisions

### Decision 1: Vercel AI SDK의 `streamObject` + SSE 기반 스트리밍

- **Context**: 자기소개서 생성은 LLM 호출로 수십 초가 소요되며, 사용자에게 실시간 진행 상황을 보여줘야 함. 구조화된 JSON 출력(LetterResultV2)이 필요하면서도 점진적 렌더링이 요구됨.
- **Decision**: Vercel AI SDK의 `streamObject`로 구조화된 JSON을 스트리밍하고, 커스텀 SSE(Server-Sent Events) 프로토콜로 5-phase 상태 머신(started → partial → validating → retrying → complete)을 구현.
- **Rationale**: (1) `streamObject`는 Zod 스키마로 타입 안전한 partial object를 스트리밍하여, 클라이언트가 불완전한 JSON도 안전하게 렌더링 가능. (2) 커스텀 SSE는 생성 외 이벤트(검증, 재시도)도 전달 가능. (3) Vercel Fluid Compute의 300s timeout과 결합하여 장시간 생성 지원.
- **Alternatives considered**:
  - `streamText` + 클라이언트 파싱: 구조화 보장 없음. 불완전 JSON 파싱 오류 위험.
  - WebSocket: 연결 관리 복잡도 증가. Vercel 서버리스 환경에서 WebSocket 유지 어려움.
  - Polling: 지연 시간 + 불필요한 DB 쿼리. 실시간성 부족.
- **Evidence**: `src/app/api/ai/generate/route.ts:421-557` — ReadableStream + SSE 인코딩, `src/hooks/use-generate-stream.ts:6` — StreamPhase 타입 정의

### Decision 2: Optimistic Concurrency Control을 이용한 크레딧 차감

- **Context**: 동시 요청 시 크레딧이 중복 차감될 수 있음. 분산 락 없이 단일 Supabase PostgreSQL에서 race condition 방지 필요.
- **Decision**: `user_credits` 테이블에 대해 WHERE 절에 현재 잔액을 포함하는 Optimistic Concurrency Control(OCC) 패턴 적용. `.eq('balance', credits.balance)`로 읽은 값과 다르면 update가 0행 반환 → 실패 처리.
- **Rationale**: (1) PostgreSQL의 MVCC와 자연스럽게 결합. (2) 별도 분산 락 인프라(Redis 등) 불필요. (3) 경합 빈도가 낮은 SaaS 환경에서 최적. (4) 실패 시 즉시 감지하여 환불 없이 요청 거부.
- **Alternatives considered**:
  - `SELECT FOR UPDATE`: 명시적 행 잠금. Supabase RLS + JavaScript client에서 트랜잭션 관리 복잡.
  - Redis 분산 락: 추가 인프라 필요. 단순 크레딧 시스템 대비 과도한 복잡도.
  - PostgreSQL Advisory Lock: 세션 기반 잠금. 서버리스(Vercel)에서 커넥션 풀링과 충돌 위험.
- **Evidence**: `src/lib/credits.ts:29-37` — `.eq('balance', credits.balance)` 및 `count === 0` 체크

### Decision 3: 다중 AI 모델 + 3-Tier 크레딧 시스템

- **Context**: 사용자마다 품질/비용 선호가 다름. 단일 모델로는 가격 민감 사용자와 품질 중시 사용자를 동시에 만족시킬 수 없음.
- **Decision**: 3개 프로바이더(Anthropic, OpenAI, Google)의 8개 모델을 3-tier(fast 1~2cr, balanced 3cr, premium 10cr)로 분류. 신규 사용자에게 5 크레딧 무료 제공하여 fast 모델 5회 또는 balanced 모델 1회 체험 가능.
- **Rationale**: (1) 프로바이더 다양화로 단일 장애점 회피. (2) tier 기반 가격은 사용자에게 직관적. (3) 분석(analyze)은 무료 저가 모델 사용, 생성(generate)만 유료화하여 진입 장벽 최소화. (4) Vercel AI SDK의 `getProvider()` 추상화로 모델 교체 1줄.
- **Alternatives considered**:
  - 단일 모델(Claude만): 의존성 집중. 장애 시 전체 서비스 중단.
  - 구독제(월정액): MVP 단계에서 가격 실험 어려움. 종량제가 시장 검증에 유리.
- **Evidence**: `src/lib/ai/models.ts:11-84` — AI_MODELS 배열, `src/lib/ai/providers.ts:6-17` — getProvider 팩토리

### Decision 4: 자동 출력 검증 + 조건부 재시도 (Validate-Retry Loop)

- **Context**: LLM 출력은 글자수 미충족, 금지 표현 포함, AI투 문체 등 품질 문제가 빈번함. 사용자가 수동으로 재생성하면 크레딧 이중 소비.
- **Decision**: 1차 생성 후 자동 검증(글자수, 금지 표현 26개, K-STAR-K 수치 패턴, 4종 안티패턴)을 수행하고, 임계값 초과 시 검증 피드백을 프롬프트에 추가하여 1회 자동 재시도. 추가 크레딧 없이 품질 향상.
- **Rationale**: (1) 글자수 +-30%, 금지표현 3개+, 나열식+장황 병존 시만 재시도하여 비용 절감. (2) 한국어 자기소개서 특화 안티패턴(나열식, 배경 장황, AI투, 판단근거 부재) 자동 감지. (3) 재시도 실패 시 1차 결과 유지하여 항상 결과 반환.
- **Alternatives considered**:
  - 재시도 없이 경고만: 사용자가 수동 재생성 시 크레딧 2배 소비. UX 저하.
  - 무조건 2회 생성 후 선택: 비용 2배. 대부분 1차 생성이 충분한 경우 낭비.
- **Evidence**: `src/lib/ai/validate-output.ts:363-375` — shouldRetry 조건, `src/app/api/ai/generate/route.ts:453-478` — validate-retry 루프

### Decision 5: Supabase RLS 기반 멀티테넌시 + 3-client 패턴

- **Context**: SaaS 특성상 다중 사용자 데이터 격리 필수. 별도 미들웨어 없이 DB 수준 보안이 필요.
- **Decision**: 모든 10개 테이블에 RLS(`auth.uid() = user_id`) 적용. 브라우저/서버/미들웨어 각각에 최적화된 3개 Supabase 클라이언트를 분리.
- **Rationale**: (1) RLS는 쿼리 자체에 보안이 내장되어, API 코드에서 WHERE user_id 누락 실수를 방지. (2) Signup trigger로 profile + credits 자동 생성하여 온보딩 원자성 보장. (3) 3-client 패턴은 Supabase 공식 권장 사항이며, cookie 처리 차이를 캡슐화.
- **Alternatives considered**:
  - 애플리케이션 수준 필터링: WHERE 누락 시 데이터 유출 위험. 코드 리뷰 의존.
  - 테넌트별 스키마 분리: 관리 복잡도 급증. Supabase 무료 플랜에서 비현실적.
- **Evidence**: `supabase/migrations/00001_initial_schema.sql:76-100` — RLS 활성화 + 정책, `src/lib/supabase/client.ts:4-9`, `server.ts:5-28`, `middleware.ts:4-34` — 3-client 패턴

## Code Metrics

| Metric | Value |
|--------|-------|
| TypeScript 소스 파일 수 | 111 |
| TypeScript LoC (src/) | 19,255 |
| SQL LoC (migrations + seeds) | ~1,309 (migrations만) |
| i18n 메시지 LoC | 1,552 (KO 776 + EN 776) |
| 전체 추정 LoC | ~22,000+ |
| 의존성 (production) | 37 |
| 의존성 (dev) | 9 |
| API 라우트 수 | 21 |
| 페이지 수 | 13 |
| UI 컴포넌트 (shadcn) | 20 |
| Feature 컴포넌트 | 20 |
| Custom Hooks | 5 |
| Zustand Stores | 1 |
| DB 테이블 | 10 (profiles, user_credits, credit_transactions, context_bank, job_postings, generated_letters, payment_orders, experiences, resume_documents, resume_sections) |
| DB 마이그레이션 | 11 |
| AI 모델 정의 | 8 (3 provider: Anthropic/OpenAI/Google) |
| 시스템 프롬프트 | ~960 LoC (`prompts.ts`, 66KB — 프로젝트 최대 파일) |
| 테스트 파일 | 0 (test/ 디렉토리에 참고 문서만 존재, 자동화 테스트 미구현) |
| 보안 헤더 | 6 (CSP, X-Frame-Options, X-XSS-Protection 등 — `next.config.ts:6-13`) |

## Key Files

| File | Role | Notable |
|------|------|---------|
| `src/app/api/ai/generate/route.ts` (567 LoC) | 핵심: 자기소개서 생성 엔드포인트 | SSE 스트리밍 + 자동 검증 + 조건부 재시도. Zod 스키마로 freeform/items 모드 분기. 프로젝트에서 가장 복잡한 비즈니스 로직 |
| `src/lib/ai/prompts.ts` (960 LoC) | AI 시스템 프롬프트 전체 | 66KB. 분석/생성/평가 프롬프트 + 8개 전략별 프롬프트(STAR, 3C4P 등). KO/EN 이중 언어. 프로젝트 최대 파일 |
| `src/lib/ai/validate-output.ts` (445 LoC) | 생성 결과 자동 검증 | 글자수, 금지표현(26개), K-STAR-K, 4종 안티패턴(나열식/장황/AI투/판단근거 부재) |
| `src/lib/context-matching.ts` (392 LoC) | 경험-공고 매칭 알고리즘 | 9-tier 신호 가중치 + KO/EN 동의어 사전(48개 매핑) + 카테고리별 가중치 |
| `src/types/database.ts` (571 LoC) | DB 스키마 + 도메인 타입 | 10 테이블 Row/Insert/Update + 도메인 타입(JobAnalysis, LetterResultV2 등) |
| `src/stores/app-store.ts` (138 LoC) | 클라이언트 전역 상태 | Zustand. 모델/전략/문항/경험 선택, 8개 한국 자소서 템플릿 프리셋 |
| `src/hooks/use-generate-stream.ts` (167 LoC) | SSE 스트리밍 클라이언트 훅 | 5-phase FSM(idle→generating→validating→retrying→complete), AbortController |
| `src/lib/credits.ts` (116 LoC) | 크레딧 시스템 | OCC 기반 차감, 환불, 구매. credit_transactions 감사 로그 |
| `src/proxy.ts` (41 LoC) | 미들웨어 (실질적 middleware.ts) | Supabase Auth + next-intl 통합, 보호 라우트 리다이렉트 |
| `src/lib/ai/models.ts` (93 LoC) | AI 모델 정의 | 8 모델, 3 프로바이더, 3-tier, creditCost/maxTokens 설정 |
| `src/lib/ai/providers.ts` (17 LoC) | AI 프로바이더 팩토리 | switch-based. Anthropic/OpenAI/Google SDK 추상화 |
| `src/lib/web/job-posting-fetcher.ts` (213 LoC) | URL 스크래핑 | SSRF 방어(private IP/DNS 차단), HTML→텍스트 변환, 40KB 제한 |
| `src/lib/hiring-schedule.ts` (151 LoC) | 채용 일정 파싱 | 다국어 날짜 정규화(YYYY-MM-DD, 한국어, US 형식), AI 분석 deadline 자동 반영 |
| `src/app/[locale]/generate/page.tsx` (1,461 LoC) | 생성 페이지 | 모델 선택, 전략 토글, freeform/items 모드, 경험 선택, 결과 렌더링. 프로젝트 최대 페이지 |
| `src/app/[locale]/resume/page.tsx` (1,699 LoC) | 이력서 빌더 페이지 | 문서 CRUD, 섹션 관리, 경험 연동. 프로젝트 최대 LoC 단일 파일 |
| `supabase/migrations/00001_initial_schema.sql` (128 LoC) | 초기 DB 스키마 | 6 테이블, RLS, 자동 온보딩 trigger, 인덱스 |
| `next.config.ts` (31 LoC) | Next.js 설정 | next-intl 플러그인, CSP 포함 6개 보안 헤더, Server Actions 10MB 제한 |
| `src/app/[locale]/layout.tsx` (82 LoC) | 루트 레이아웃 | Geist 폰트, NextIntlClientProvider, TanStack Query Provider, AppSidebar |
| `src/lib/ai/framework.ts` (41 LoC) | 자소서 프레임워크 상수 | v3 프레임워크, 10개 항목 유형, AI 투 패턴, Phase→항목 매핑 |
| `src/lib/rate-limit.ts` (38 LoC) | In-memory rate limiter | Map 기반 토큰 버킷, 5분 주기 cleanup. Vercel 서버리스 환경에서 인스턴스별 독립 |
