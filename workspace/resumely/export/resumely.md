# resumely — Pantheon Export

> Exported from open-pantheon | 2026-02-23T00:00:00+09:00

---

# Architecture

## resumely Architecture Analysis

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

---

# Narrative

## resumely Narrative

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

---

# Stack Profile

## resumely Stack Profile

## Detected Stack

| Category | Detected | Confidence | Evidence |
|----------|----------|------------|----------|
| **Framework** | Next.js 16.1.6 (App Router) | high | `package.json:38` — `"next": "16.1.6"`, `src/app/[locale]/layout.tsx` App Router 구조 |
| **Language** | TypeScript 5.x | high | `package.json:59` — `"typescript": "^5"`, `tsconfig.json:1-34` strict mode 설정 |
| **UI Library** | React 19.2.3 | high | `package.json:42-43` — `"react": "19.2.3"`, `"react-dom": "19.2.3"` |
| **Component System** | shadcn/ui (New York style) | high | `components.json:1-23` — `"style": "new-york"`, `"rsc": true`, 18+ UI 컴포넌트 (`src/components/ui/`) |
| **CSS Framework** | Tailwind CSS v4 | high | `package.json:57` — `"tailwindcss": "^4"`, `postcss.config.mjs:3` — `@tailwindcss/postcss`, `globals.css:1` — `@import "tailwindcss"` |
| **CSS Animation** | tw-animate-css 1.4.0 | high | `package.json:58` — `"tw-animate-css": "^1.4.0"`, `globals.css:2` — `@import "tw-animate-css"` |
| **Motion** | Framer Motion 12.33.0 | high | `package.json:35` — `"framer-motion": "^12.33.0"`, `src/app/[locale]/page.tsx:9` — `import { motion }` |
| **State Management** | Zustand 5.0.10 | high | `package.json:48` — `"zustand": "^5.0.10"`, `src/stores/app-store.ts:1` — `import { create } from 'zustand'` |
| **Server State** | TanStack React Query 5.90.20 | high | `package.json:30` — `"@tanstack/react-query": "^5.90.20"`, `src/components/providers.tsx:3` — `QueryClientProvider` |
| **Backend/DB** | Supabase (SSR) | high | `package.json:28-29` — `"@supabase/ssr": "^0.8.0"`, `"@supabase/supabase-js": "^2.93.3"`, `src/lib/supabase/` 4개 파일 (admin, client, server, middleware) |
| **AI SDK** | Vercel AI SDK 6.0.64 | high | `package.json:31` — `"ai": "^6.0.64"`, `src/lib/ai/providers.ts:1-3` — Anthropic/OpenAI/Google 프로바이더 import |
| **AI Provider: Anthropic** | @ai-sdk/anthropic 3.0.33 | high | `package.json:12` — `"@ai-sdk/anthropic": "^3.0.33"`, `src/lib/ai/models.ts:14-19` — Claude Haiku 4.5, Sonnet 4.6, Opus 4.6 |
| **AI Provider: OpenAI** | @ai-sdk/openai 3.0.23 | high | `package.json:14` — `"@ai-sdk/openai": "^3.0.23"`, `src/lib/ai/models.ts:22-28` — GPT-4o Mini, GPT-4o, GPT-5 Mini, GPT-5 |
| **AI Provider: Google** | @ai-sdk/google 3.0.18 | high | `package.json:13` — `"@ai-sdk/google": "^3.0.18"`, `src/lib/ai/models.ts:33-38` — Gemini 2.0 Flash |
| **AI Streaming** | @ai-sdk/react 3.0.66 (SSE) | high | `package.json:15` — `"@ai-sdk/react": "^3.0.66"`, `src/hooks/use-generate-stream.ts:80-135` — SSE 스트리밍 구현 |
| **i18n** | next-intl 4.8.1 (ko/en) | high | `package.json:39` — `"next-intl": "^4.8.1"`, `src/i18n/routing.ts:4-7` — `locales: ['ko', 'en']`, `messages/ko.json` + `messages/en.json` |
| **Form** | React Hook Form 7.71.1 + Zod 4.3.6 | high | `package.json:44,47` — `"react-hook-form": "^7.71.1"`, `"zod": "^4.3.6"`, `package.json:16` — `"@hookform/resolvers": "^5.2.2"` |
| **Schema Validation** | Zod 4.3.6 | high | `package.json:47` — `"zod": "^4.3.6"`, `src/lib/validations/resume.ts`, `src/lib/validations/experience.ts` |
| **Payment** | PortOne Browser SDK 0.1.3 | high | `package.json:17` — `"@portone/browser-sdk": "^0.1.3"`, `src/lib/payments/portone.ts:1-81` — PortOne V2 API 통합, HMAC-SHA256 웹훅 검증 |
| **Document Parsing** | Mammoth 1.11.0 | high | `package.json:37` — `"mammoth": "^1.11.0"` (DOCX 파싱) |
| **Date** | date-fns 4.1.0 | high | `package.json:34` — `"date-fns": "^4.1.0"` |
| **Icons** | Lucide React 0.563.0 | high | `package.json:36` — `"lucide-react": "^0.563.0"`, `components.json:13` — `"iconLibrary": "lucide"` |
| **Toast** | Sonner 2.0.7 | high | `package.json:45` — `"sonner": "^2.0.7"`, `src/components/providers.tsx:5` — `import { Toaster }` |
| **Theme** | next-themes 0.4.6 | high | `package.json:40` — `"next-themes": "^0.4.6"`, `globals.css:84-116` — `.dark` 테마 변수 정의 |
| **Font** | Geist Sans + Geist Mono (Google Fonts) | high | `src/app/[locale]/layout.tsx:6` — `import { Geist, Geist_Mono } from 'next/font/google'` |
| **Linting** | ESLint 9.x + eslint-config-next | high | `package.json:55-56` — `"eslint": "^9"`, `"eslint-config-next": "16.1.6"`, `eslint.config.mjs:1-16` |
| **Ads** | Google AdSense + Kakao AdFit + Coupang Partners | medium | `src/components/ads/ad-banner.tsx`, `src/components/ads/kakao-adfit.tsx`, `src/components/ads/coupang-partners.tsx`, `.env.local.example:18-22` |
| **Monetization** | Credit 기반 과금 (KRW) | high | `src/lib/payments/packages.ts:1-17` — 4개 패키지 (3,000~18,000 KRW), `src/lib/credits.ts` — 크레딧 차감/환불/구매 |
| **Auth** | Supabase Auth (SSR cookie) | high | `src/lib/supabase/middleware.ts:1-34` — `createServerClient`, cookie 기반 세션 관리, `src/app/api/auth/callback/route.ts` |
| **Security** | CSP + Security Headers | high | `next.config.ts:6-12` — X-Content-Type-Options, X-Frame-Options, CSP, Referrer-Policy 등 6개 보안 헤더 |
| **Server Actions** | Next.js Server Actions (10MB limit) | high | `next.config.ts:16-19` — `experimental.serverActions.bodySizeLimit: '10mb'` |
| **CI/CD** | 미감지 | low | `.github/workflows/` 디렉토리 없음 |

## Domain Classification

- **Primary**: saas
- **Secondary**: ai-ml
- **Rationale**: Resumely는 AI 기반 자기소개서/커버레터 자동 생성 SaaS 서비스입니다. 사용자가 경험/이력을 업로드하고, 채용공고를 분석한 뒤, Claude/GPT/Gemini 등 멀티 AI 모델을 활용하여 맞춤형 자기소개서를 생성합니다. 크레딧 기반 과금 시스템(PortOne 결제)과 구독형 구조를 갖춘 본격적인 B2C SaaS입니다. AI가 핵심 기능이므로 ai-ml이 부 분류에 해당합니다.

## Template Recommendation

- **Recommended**: `nextjs-app` *(planned)*
- **Alternative**: `sveltekit-dashboard`
- **Rationale**:
  1. **스택 친화도**: Resumely 자체가 Next.js 16 + React 19 + App Router 프로젝트입니다. 포트폴리오 사이트도 동일 생태계(nextjs-app 템플릿)로 구축하면 기술 일관성이 극대화됩니다. shadcn/ui, Tailwind CSS, Framer Motion 등 UI 스택을 그대로 보여줄 수 있는 인터랙티브 데모를 삽입하기에 최적입니다.
  2. **콘텐츠 특성**: 단순 정적 랜딩이 아니라, AI 스트리밍 데모, 멀티모델 비교, 크레딧 시스템 등 인터랙티브 요소가 풍부합니다. SSR/SSG 하이브리드 렌더링이 가능한 Next.js 템플릿이 이 복잡도를 가장 잘 표현합니다.
  3. **CLAUDE.md 매핑 일치**: 프로젝트별 스택 매핑 테이블에서 resumely는 `nextjs-app` 템플릿으로 지정되어 있습니다.
  4. **대안으로 sveltekit-dashboard**: nextjs-app 템플릿이 아직 구현 전이므로, 현재 사용 가능한 템플릿 중에서는 인터랙티브 대시보드와 애니메이션을 지원하는 sveltekit-dashboard가 차선책입니다. 다만 React 프로젝트를 Svelte 기반으로 소개하는 것은 기술적 부조화가 있으므로, nextjs-app 템플릿 구현 후 진행하는 것을 권장합니다.

## Existing Site

- **Has existing site**: yes (추정)
- **URL**: `https://resumely.app` (User-Agent 헤더에서 확인: `src/lib/web/job-posting-fetcher.ts:173` — `'User-Agent': 'ResumelyBot/1.0 (+https://resumely.app)'`)
- **GitHub**: `https://github.com/tygwan/resumely` (git remote origin)
- **Notes**: 프로덕션 도메인 `resumely.app`이 존재하며, Supabase 백엔드와 PortOne 결제가 통합된 운영 중인 SaaS 서비스입니다. 별도의 `vercel.json`, `netlify.toml`, `Dockerfile` 미감지 — Vercel 자동 배포(Next.js 기본 호스팅)로 추정됩니다.

## Build & Deploy Profile

| Aspect | Detail |
|--------|--------|
| Package Manager | npm (lock file: `package-lock.json` 기반, yarn.lock/pnpm-lock 미감지) |
| Node Version | v20.20.0 (시스템 감지) |
| Build Command | `next build` (`package.json:7`) |
| Dev Command | `next dev` (`package.json:6`) |
| Start Command | `next start` (`package.json:8`) |
| Lint Command | `eslint` (`package.json:9`) |
| Output Dir | `.next/` (Next.js 기본) |
| Rendering | SSR + SSG Hybrid (App Router, Server Components + `"use client"`) |
| i18n Strategy | Locale Routing (`/[locale]/`) via next-intl plugin (`next.config.ts:2-4`) |
| Supported Locales | `ko` (기본), `en` |
| API Routes | 16개 — `/api/ai/*`, `/api/auth/*`, `/api/bank/*`, `/api/credits/*`, `/api/experiences/*`, `/api/jobs/*`, `/api/letters/*`, `/api/payments/*`, `/api/resumes/*` |
| Server Actions | 활성화, body size limit 10MB (`next.config.ts:17-19`) |
| Deploy Target | Vercel (추정 — Next.js 기본 호스팅, 별도 deploy config 미감지) |
| Domain | `resumely.app` (추정) |

## Architecture Summary

```
Client (React 19 + App Router)
├── Landing Page (SSR + Framer Motion)
├── Dashboard (인증 필수)
│   ├── Context Bank — 경험/이력 업로드 (DOCX 파싱)
│   ├── Experience Hub — 경험 구조화 (STAR 프레임워크)
│   ├── Job Postings — 채용공고 URL 크롤링 + AI 분석
│   ├── Generate — 멀티모델 AI 자소서 생성 (SSE 스트리밍)
│   ├── Resume Builder — 이력서 작성
│   ├── History — 생성 이력
│   └── Settings — 사용자 설정
├── Auth (Supabase Auth + SSR Cookie)
└── Payments (PortOne + 크레딧 시스템)

Server (Next.js API Routes + Server Actions)
├── AI Generation Pipeline
│   ├── Claude Haiku/Sonnet/Opus (Anthropic)
│   ├── GPT-4o Mini/GPT-4o/GPT-5 Mini/GPT-5 (OpenAI)
│   └── Gemini 2.0 Flash (Google)
├── Supabase (Auth + Database + Storage)
└── PortOne V2 (Payment Gateway)
```

## Key Metrics

| Metric | Value |
|--------|-------|
| App Routes (pages) | 11 (`landing`, `about`, `bank`, `dashboard`, `generate`, `history`, `jobs`, `login`, `privacy`, `resume`, `settings`, `signup`, `terms`) |
| API Routes | 16 endpoints |
| UI Components | 18+ (shadcn/ui 기반) |
| Custom Hooks | 5 (`use-resumes`, `use-generate-stream`, `use-context-bank`, `use-experiences`, `use-job-postings`) |
| AI Models | 8 (3 providers, 3 tiers: fast/balanced/premium) |
| DB Tables | 9 (`profiles`, `user_credits`, `credit_transactions`, `context_bank`, `job_postings`, `payment_orders`, `experiences`, `generated_letters`, `resume_documents`, `resume_sections`) |
| i18n Messages | ~776 lines per locale (ko, en) |
| Dependencies | 30 (production) + 8 (dev) |

---

# Summary

## resumely Analysis Summary

## Key Insights

- **23일 만에 풀스택 SaaS 구축**: Next.js 16 + React 19 + Supabase + Vercel AI SDK 조합으로 19,255줄 TypeScript, 22 commits, 68,969줄 코드를 23일(2026-01-31 ~ 2026-02-22)에 생성. 프로토타입에서 프로덕션까지 단일 개발자 + AI 페어 프로그래밍
- **한국 자기소개서 도메인 특화**: 7-Phase 작성 프레임워크, "판단 기준(Decision Rule)" 중심 구조화, AI 클리셰 탐지/차단(금지 문구 16개), K-STAR-K 준수 검증 — 한국 취업 시장에 최적화된 AI 솔루션
- **Multi-model AI 아키텍처**: 3개 프로바이더(Anthropic Claude, OpenAI GPT, Google Gemini) 8개 모델을 3-tier 크레딧 시스템(fast 1~2cr, balanced 3cr, premium 10cr)으로 분류. 분석은 무료, 생성만 유료화하여 진입 장벽 최소화
- **SSE 실시간 스트리밍**: `streamObject()` + 커스텀 SSE 프로토콜(6종 이벤트)로 체감 대기 ~30초 → ~2-3초. 5-phase FSM 기반 클라이언트 상태 관리
- **Signal-weighted 매칭 알고리즘**: 9-tier 신호 가중치(mustHave 2.2x ~ context 0.5x) + 30+ 한영 동의어 쌍으로 경험-채용공고 자동 매칭
- **Serverless Layered Monolith**: Next.js App Router 기반 서버리스 모놀리스. Supabase RLS 멀티테넌시 + OCC 크레딧 차감 + PortOne V2 결제. 보안 헤더 6개, Rate Limiting, SSRF 방어 포함
- **커버레터 → 통합 취업 준비 플랫폼 진화**: Experience Hub(12 AI 카테고리) + Resume Builder(A4 라이브 프리뷰) + URL 기반 Job Fetcher로 기능 확장. 단일 커밋에 54파일/7,948줄 추가

## Recommended Template

`nextjs-app` *(planned)* — resumely 자체가 Next.js 16 + React 19 프로젝트이므로 동일 생태계 템플릿이 최적. shadcn/ui, Framer Motion, SSE 스트리밍 데모 등 인터랙티브 요소를 네이티브로 표현 가능. CLAUDE.md 매핑과도 일치.

**대안**: `sveltekit-dashboard` (nextjs-app 미구현 시 차선책. 단, React→Svelte 기술적 부조화 존재)

## Design Direction

- **Palette**: AI/SaaS 특성 반영. 신뢰감 있는 딥 네이비/다크 계열 배경 + 핵심 액션에 보라-파랑 그라디언트(AI 느낌). 크레딧/결제 UI에는 골드/앰버 강조. 한국 시장 타겟이므로 과도한 네온보다는 세련된 톤다운
- **Typography**: Geist Sans/Mono (프로젝트 자체 폰트) 유지. 히어로 섹션은 굵은 한글 헤드라인 + 영문 서브텍스트. 코드/기술 섹션에 Geist Mono 활용
- **Layout**: SaaS 대시보드 스타일. Hero → Problem/Solution → 핵심 기능 데모(SSE 스트리밍 시각화, 멀티모델 비교) → 아키텍처 다이어그램 → 기술 스택 그리드 → 타임라인(23일 개발 히스토리) → CTA

## Notable

- **테스트 코드 부재**: `test/` 디렉토리에 참고 문서만 존재. 자동화 테스트 미구현 (빠른 MVP 개발 우선)
- **CI/CD 미설정**: `.github/workflows/` 없음. Vercel 자동 배포에 의존
- **nextjs-app 템플릿 미구현**: 현재 available한 템플릿은 sveltekit-dashboard와 astro-landing뿐. resumely에 최적인 nextjs-app 템플릿 개발이 선행 필요
- **960줄 프롬프트 시스템**: `prompts.ts`가 프로젝트 최대 파일(66KB). 프롬프트 엔지니어링의 깊이를 보여주는 동시에, 유지보수 리스크도 존재
- **프로덕션 운영 중**: `resumely.app` 도메인으로 실제 서비스 운영. PortOne 결제, Supabase Auth, 광고(AdSense/Kakao/Coupang) 통합
- **경험 → 자소서 → 이력서 원스톱 파이프라인**: 단순 생성 도구가 아닌, 경험 관리부터 이력서까지 연결하는 통합 플랫폼으로 진화 중

---

# Experience Blocks

## resumely — Experience Blocks

> 6블록 사고력 템플릿 기반 경험 구조화. 분석 데이터 + 사용자 인터뷰 결합.
> 생성일: 2026-02-22 | 경험 수: 5개

---

## Experience 1: AI 생성 품질 제어 — "AI가 쓴 티"를 없애는 3중 검증 체계

### 목표(KPI)
한국 취업 시장에서 인사담당자가 AI 생성물로 감별하지 못하는 수준의 자기소개서 품질 달성. 구체적으로: 금지 문구(클리셰) 0개, 글자수 정확도 ±10% 이내, K-STAR-K 준수(정량적 결과 패턴 2개 이상 포함).

### 현상(문제 증상)
LLM이 생성하는 자기소개서에 "열정을 가지고", "기여하겠습니다", "성장할 수 있었습니다" 같은 AI 특유의 추상적 클리셰가 거의 매번 반복 발생. 글자수 제한(±10%)을 정확히 맞추지 못하는 빈도도 높았음. 경험 많은 인사담당자에게 즉시 감별되어 서류 탈락으로 직결되는 문제. (출처: narrative.md Challenge 1)

### 원인 가설
1. **프롬프트의 지시 부족** → 검증: 시스템 프롬프트에 "~하지 마라"는 명시적 금지 지시를 추가하고 클리셰 발생률 비교. 금지 지시 없으면 LLM이 학습 데이터의 최빈 패턴(클리셰)으로 회귀 (사용자 답변)
2. **구조화 부족 (자유 서술)** → 검증: K-STAR-K 같은 구조를 강제하지 않고 자유 작성시키면, LLM이 빈 공간을 추상적 표현으로 채움. 구조 강제 전후 클리셰 빈도 비교 (사용자 답변)
3. **검증 루프 부재** → 검증: 생성 후 자동 품질 체크 없이 출력을 그대로 전달하면 클리셰가 사용자에게 도달. 검증 추가 전후 최종 출력 품질 비교 (출처: architecture.md Decision 4)

### 판단 기준(Decision Rule)
- **조건 1**: 한국어 금지 표현/패턴은 범용 LLM이 사전에 학습하지 못한 도메인 특수 지식 → **전략: 명시적 금지 목록(9개 한국어 + 7개 영어) 필수** ← 채택
- **조건 2**: 프롬프트(사전 예방)만으로는 100% 방지 불가 → **전략: 사전 예방 + 사후 교정 조합** ← 채택. "프롬프트 예방만으로 충분하면 검증 불필요, 불충분하면 검증 레이어 추가"가 핵심 판단 기준
- **기각된 대안**: 무조건 2회 생성 후 선택 → 비용 2배이며 대부분 1차 생성이 충분. 임계값 초과 시에만 재시도하여 비용 절감 (사용자 답변 + 출처: architecture.md Decision 4)

### 실행
1. **Few-shot Examples 내장** — 좋은/나쁜 예시를 `prompts.ts`(960줄)에 포함. LLM이 "무엇이 클리셰인지" 경계를 학습하도록 유도 — 도구: 시스템 프롬프트
2. **validate-output.ts 검증 엔진 구축** (445줄) — 글자수 정확도, 금지 문구 16개 탐지, K-STAR-K 준수(정량적 결과 패턴 2개+), 4종 안티패턴(나열식/배경 장황/AI투/판단근거 부재) 자동 감지 — 도구: Zod 스키마 + 정규식
3. **조건부 자동 재시도** — ±30% 글자수 이탈 또는 금지 문구 3개+ 시 corrective feedback 포함하여 1회 자동 재생성. 추가 크레딧 없이 품질 향상 — 도구: streamObject retry with feedback prompt
4. **검증**: 재시도 실패 시에도 1차 결과를 유지하여 항상 결과 반환 (사용자 경험 보장)

### 결과

| 지표 | Before | After | 변화 |
|------|--------|-------|------|
| 클리셰 발생률 | 거의 매번 포함 | 대부분 제거 | 체감 대폭 감소 (사용자 답변) |
| 금지 문구 탐지 범위 | 0개 | 16개 (KO 9 + EN 7) | 한국어 도메인 특화 |
| 안티패턴 감지 | 없음 | 4종 자동 감지 | 나열식/장황/AI투/판단근거 부재 |
| 사용자 수동 재생성 | 필요 | 자동 재시도로 감소 | UX 개선 + 크레딧 절약 |

**핵심 성과**: 한국 자기소개서 도메인에 특화된 3중 품질 보증 체계(Few-shot + 금지목록 + 자동 재시도)로 AI 클리셰 발생률을 체감 대폭 감소시킴 [아직 정량 측정 전]

---

## Experience 2: SSE 실시간 스트리밍 아키텍처 — 체감 대기 30초 → 2~3초

### 목표(KPI)
자기소개서 생성 시 사용자 체감 대기 시간을 ~30초에서 최초 콘텐츠 노출 ~2-3초로 단축. 생성 중 진행 상태(검증/재시도/에러)를 실시간 피드백.

### 현상(문제 증상)
LLM 기반 자기소개서 생성에 평균 ~30초 소요. 이 동안 사용자는 "작동하고 있는지" 확인 불가. 또한 생성 후 품질 검증 + 자동 재시도라는 후처리 단계가 필요하여, 단순 스트리밍으로는 대응 불가능. (출처: narrative.md Challenge 2)

### 원인 가설
1. **후처리 이벤트 전달 불가** → 검증: Vercel AI SDK의 `experimental_useObject` 훅은 JSON 스트림만 지원. 검증/재시도/에러 등 생성 외 이벤트를 클라이언트에 전달할 채널이 없음 (사용자 답변)
2. **상태 관리 한계** → 검증: useObject의 단순 partial/complete 2단계로는 5-phase FSM(generating→validating→retrying→complete→error) 표현 불가. 복잡한 생명주기를 클라이언트가 인지해야 적절한 UI 렌더링 가능 (사용자 답변)
3. **커스텀 요구사항 복합** → 검증: AbortController 기반 사용자 취소, 분할 청크 버퍼 누적, 비-SSE 폴백까지 포함하면 기본 훅의 추상화 수준으로는 대응 불가 (사용자 답변)

### 판단 기준(Decision Rule)
- **조건**: 생성 외 이벤트(검증/재시도/에러) 전달 + 5-phase 상태 관리 + AbortController가 모두 필요 → **전략 A**: 커스텀 SSE 프로토콜 구현 ← 채택
- **전략 B**: `experimental_useObject` 기본 훅 사용 → 후처리 이벤트 전달 불가, FSM 표현 불가로 기각
- **전략 C**: WebSocket → Vercel 서버리스에서 연결 유지 어려움, 관리 복잡도 과도
- **전략 D**: Polling → 지연 시간 + 불필요한 DB 쿼리, 실시간성 부족
- **기각 근거**: "요구사항이 기본 훅으로 충족 가능하면 기본 훅, 불가능하면 커스텀"이 판단 기준. 3가지 요구사항 모두 기본 훅 불가 → 커스텀 필수 (사용자 답변)

### 실행
1. **커스텀 SSE 프로토콜 설계** — 6종 이벤트 타입(started/partial/validating/retrying/complete/error) 정의. `data: {...}\n\n` 형식으로 인코딩 — 도구: ReadableStream + TextEncoder
2. **서버 스트리밍 구현** (`generate/route.ts` 567줄) — `streamObject()`로 Zod 스키마 기반 JSON 스트리밍 시작 → 각 phase에서 SSE 이벤트 전송
3. **클라이언트 훅 구현** (`use-generate-stream.ts` 167줄) — `ReadableStream` + `TextDecoder`로 SSE 청크 파싱. 분할 청크 버퍼 누적, 5-phase FSM 관리, AbortController 기반 취소
4. **검증**: 비-SSE 폴백 경로, `useTransition`으로 UI freeze 제거

### 결과

| 지표 | Before | After | 변화 |
|------|--------|-------|------|
| 최초 콘텐츠 노출 | ~30초 (전체 대기) | ~2-3초 | 10배+ 체감 개선 |
| 진행 상태 피드백 | 없음 (스피너만) | 6종 실시간 이벤트 | 사용자 불확실성 해소 |
| 사용자 취소 | 불가 | AbortController 지원 | UX 개선 |
| 후처리 가시성 | 없음 | validating/retrying 표시 | 품질 보증 과정 투명화 |

**핵심 성과**: 커스텀 SSE 프로토콜 + 5-phase FSM으로 체감 대기 시간 10배+ 단축, 생성-검증-재시도 전체 생명주기를 실시간 시각화

---

## Experience 3: Signal-weighted 경험-직무 매칭 알고리즘

### 목표(KPI)
사용자의 경험 데이터(최대 42+ 항목)와 채용공고 요구사항을 정밀 매칭하여, 상위 추천 경험의 직무 적합성을 극대화. 최소 추천 점수(MIN_RECOMMEND_SCORE: 2.4) 이상만 추천.

### 현상(문제 증상)
단순 키워드 매칭으로 경험-공고를 연결하면 두 가지 문제: (1) 한영 혼용 기술 용어(Docker↔도커, BIM↔건축정보모델링) 매칭 실패, (2) 경험 카테고리별 중요도(project vs personality) 차이를 반영하지 못해 부적합한 경험이 상위 추천됨. (출처: narrative.md Challenge 3)

### 원인 가설
1. **한영 동의어 부재** → 검증: "React"와 "리액트"를 같은 토큰으로 인식하지 못하면 50%+ 매칭 누락. 동의어 사전 추가 전후 매칭률 비교 (출처: context-matching.ts)
2. **균등 가중치의 한계** → 검증: 모든 신호(mustHave, responsibilities, keywords 등)를 동일 가중치로 처리하면, 채용공고에서 "필수"로 명시한 역량과 "우대"를 동일하게 취급. 인사담당자 관점에서 서류 심사 기준과 괴리 발생 (사용자 답변)
3. **카테고리 미분화** → 검증: project/skill 경험(직무 핵심)과 personality/growth 경험(보조)을 동일 가중치로 점수화하면 노이즈 증가 (출처: context-matching.ts:50-76)

### 판단 기준(Decision Rule)
가중치 결정에 3가지 접근을 복합 적용:
- **인사담당자 관점 역추론**: 채용공고에서 '필수 조건'으로 명시 > '담당 업무' > '우대 사항' 순으로 서류 탈락에 영향. 이 우선순위를 수치화 → mustHave(2.2x) > responsibilities(1.8x) > requirements(1.6x) > keywords(1.4x) (사용자 답변)
- **A/B 테스트 + 반복 조정**: 실제 공고와 경험 데이터로 매칭 실행하여 추천 결과의 적합성을 체감으로 반복 튜닝 (사용자 답변)
- **정보이론 기반 추정**: TF-IDF 유사 개념 — 공고에서 희소하고 명시적일수록 가중치 높게, 일반적 키워드는 낮게 설정 (사용자 답변)
- **기각된 대안**: 균등 가중치 → 필수/우대 구분 불가. ML 기반 학습 → 학습 데이터 부족(초기 서비스)

### 실행
1. **한영 동의어 사전 구축** — 30+ 양방향 확장 매핑(AI↔인공지능, React↔리액트, Docker↔도커 등 48개) — 도구: 수동 매핑 + context-matching.ts
2. **9-tier 신호 가중치 시스템** — mustHave(2.2x), responsibilities(1.8x), requirements(1.6x), keywords(1.4x), niceToHave(1.2x), context(0.5x) 등 — 도구: context-matching.ts 392줄
3. **카테고리별 가중치** — project/skill: 2x, problem: 1.5x, collaboration/personality/growth: 1x
4. **점수 기반 정렬** — MIN_RECOMMEND_SCORE(2.4) 이상만 추천(max 8개) + 나머지는 other로 분류

### 결과

| 지표 | Before (단순 키워드) | After (Signal-weighted) | 변화 |
|------|---------------------|------------------------|------|
| 한영 용어 매칭 | 매칭 실패 빈번 | 48개 동의어 양방향 확장 | 매칭 누락 대폭 감소 |
| 추천 적합도 | 부적합 경험 상위 노출 | 직무 핵심 경험 우선 | 체감 적합성 향상 |
| 신호 계층화 | 균등 (1x) | 9-tier (0.5x~2.2x) | 필수/우대 구분 |
| 추천 수 | 전체 표시 | max 8개 (2.4점+) | 노이즈 제거 |

**핵심 성과**: 인사담당자 관점 역추론 + 정보이론 + 반복 튜닝을 결합한 9-tier 가중치 매칭으로, 경험-직무 추천의 질적 도약 달성

---

## Experience 4: 23일 만에 프로덕션 SaaS 구축 — 극한 속도의 풀스택 개발

### 목표(KPI)
OAuth 인증, RLS 보안, 결제 시스템, Multi-model AI, i18n, 실시간 스트리밍, 품질 검증까지 포함한 프로덕션 레벨 SaaS를 최소 시간 내 구축하여 시장 검증 개시. 실제 달성: 23일.

### 현상(문제 증상)
자기소개서 AI 서비스라는 아이디어를 최대한 빠르게 시장에서 검증해야 하는 상황. 인증/결제/AI/i18n/보안 등 필수 요소를 직접 구현하면 각각 1~2주씩 소요. 개인 프로젝트로서 리소스 제한. (출처: narrative.md Challenge 4)

### 원인 가설
1. **백엔드 인프라 직접 구현의 시간 비용** → 검증: Auth, DB, Storage를 각각 구현하면 최소 2주+. BaaS 위임 시 수일로 단축 가능한지 검증 (사용자 답변)
2. **멀티모델 통합의 복잡도** → 검증: 3개 프로바이더 직접 통합 vs SDK 추상화. 직접 구현 시 모델 교체마다 코드 변경 필요 (출처: architecture.md Decision 3)
3. **핵심 로직 검증 없이 스택 선택의 위험** → 검증: 전체 프레임워크 세팅 후 핵심 로직이 동작하지 않으면 전체 시간 낭비 (사용자 답변)

### 판단 기준(Decision Rule)
- **조건 1**: "커스텀 백엔드 필요 없으면 BaaS" → **Supabase로 Auth + DB(RLS) + Storage 전체 위임** ← 채택. 커스텀 서버 구축 대비 2주+ 절감. (사용자 답변)
- **조건 2**: "로직 검증이 안 되면 스택 선택 의미 없음" → **프로토타입 검증 후 전환** ← 채택. 단일 파일(`cover-letter-assistant.tsx`)로 핵심 플로우(경험→AI→자소서) 검증 후 풀스택 전환. (사용자 답변)
- **조건 3**: "멀티모델 필요하면 Vercel AI SDK, 단일 모델이면 직접 호출" → SDK 추상화로 모델 교체 1줄 (출처: architecture.md)
- **기각된 대안**: 커스텀 Express/Fastify 백엔드 → 인증/DB 직접 구현 시 시간 초과. 단일 모델 → 프로바이더 장애 시 전체 서비스 중단.

### 실행
1. **프로토타입 검증** — `cover-letter-assistant.tsx` 단일 파일로 핵심 로직 PoC (경험 업로드 → AI 분석 → 공고 비교 → 생성) — 도구: React, Vercel AI SDK
2. **풀스택 전환** — Next.js 16 App Router + Supabase(Auth+DB+Storage) + Vercel AI SDK + shadcn/ui + Tailwind CSS 4 조합으로 전환
3. **BaaS 극대화** — Supabase RLS로 멀티테넌시, Signup trigger로 자동 온보딩, 3-client 패턴(browser/server/middleware)
4. **AI 페어 프로그래밍** — Claude Code와 협업으로 구현 속도 가속
5. **단계적 기능 확장** — Phase 1 Foundation → Phase 2 Core → Phase 3 Monetization → SSE → Experience Hub/Resume Builder

### 결과

| 지표 | Before (계획) | After (실제) | 변화 |
|------|--------------|-------------|------|
| 개발 기간 | 미정 | 23일 | 프로토타입→프로덕션 |
| 코드 규모 | 0 | 19,255줄 TS + 68,969줄 총 삽입 | 풀스택 SaaS |
| DB 스키마 | 0 | 10 테이블 + 11 마이그레이션 | Supabase RLS |
| 커밋 수 | 0 | 22 | 평균 ~1일 1커밋 |
| 기능 범위 | 자소서 생성기 | 통합 취업 준비 플랫폼 | 범위 확장 |

**핵심 성과**: BaaS 의존도 최대화 + 프로토타입 우선 검증 + AI 페어 프로그래밍으로 23일 만에 인증/결제/AI/i18n/보안이 모두 포함된 프로덕션 SaaS 구축

---

## Experience 5: Multi-model AI + 3-Tier 크레딧 과금 시스템

### 목표(KPI)
다양한 품질/비용 선호의 사용자를 동시에 만족시키는 과금 모델 구축. 신규 사용자의 진입 장벽 최소화(무료 크레딧 5개 → fast 5회 또는 balanced 1회 체험).

### 현상(문제 증상)
단일 AI 모델로는 가격 민감 사용자와 품질 중시 사용자를 동시에 만족 불가. 단일 프로바이더 의존 시 장애 발생하면 전체 서비스 중단. MVP 단계에서 구독제는 가격 실험이 어려움. (출처: architecture.md Decision 3)

### 원인 가설
1. **모델별 비용-품질 편차** → 검증: Haiku(저가/빠름) vs Opus(고가/고품질) 사이에 토큰 단가 10배+ 차이. 단일 가격은 한쪽이 불만족 (출처: models.ts)
2. **프로바이더 단일 장애점** → 검증: Anthropic API 장애 시 서비스 전체 중단. 3개 프로바이더면 fallback 가능 (출처: architecture.md)
3. **진입 장벽과 전환율의 트레이드오프** → 검증: 유료 진입이면 사용자 이탈, 완전 무료면 수익 불가. 크레딧 체험 → 유료 전환 경로 필요

### 판단 기준(Decision Rule)
- **가격 결정 기준**: **API 비용 역산** 기반. 각 모델의 토큰 단가를 기준으로 원가 대비 마진을 설정하여 크레딧 비용 산출. Haiku(저원가)=fast 1cr, Opus(고원가)=premium 10cr (사용자 답변)
- **조건**: "무료 크레딧으로 fast 모델 체험 → 품질 인식 후 balanced/premium 전환 유도"가 핵심 전환 전략
- **기각된 대안**: 구독제(월정액) → MVP 단계에서 가격 실험 어려움. 종량제가 시장 검증에 유리. 단일 모델 → 의존성 집중 리스크

### 실행
1. **3-프로바이더 통합** — Anthropic(Claude Haiku/Sonnet/Opus), OpenAI(GPT-4o-mini/4o/5-mini/5), Google(Gemini 2.0 Flash) — 도구: Vercel AI SDK `getProvider()` 팩토리
2. **3-Tier 크레딧 분류** — fast(1~2cr): Haiku, GPT-4o-mini, Gemini Flash / balanced(3cr): Sonnet, GPT-5-mini / premium(10cr): Opus, GPT-4o, GPT-5
3. **PortOne V2 결제 통합** — 4개 패키지(3,000~18,000 KRW), HMAC-SHA256 웹훅 검증
4. **OCC 크레딧 차감** — Optimistic Concurrency Control로 동시 요청 시 중복 차감 방지 (출처: architecture.md Decision 2)
5. **분석 무료화** — `analyze` API는 GPT-4o-mini(저가) 사용, 크레딧 미차감. 진입 장벽 최소화

### 결과

| 지표 | Before | After | 변화 |
|------|--------|-------|------|
| AI 모델 수 | 0 | 8개 (3 프로바이더) | 다양성 확보 |
| 크레딧 tier | 없음 | 3-tier (fast/balanced/premium) | 가격 세분화 |
| 결제 수단 | 없음 | PortOne V2 (한국 PG) | 수익화 가능 |
| 신규 사용자 진입 | 유료만 | 무료 5cr 체험 | 진입 장벽 제거 |
| 프로바이더 장애 대응 | 전체 중단 | 다른 프로바이더 fallback 가능 | 가용성 향상 |

**핵심 성과**: API 비용 역산 기반 3-Tier 크레딧 과금으로 비용-품질 선택권을 사용자에게 제공하면서, 무료 체험 → 유료 전환 경로를 설계

---

## Gap Summary

| 경험 | 목표 | 현상 | 가설 | 판단기준 | 실행 | 결과 |
|------|------|------|------|---------|------|------|
| Exp 1: AI 품질 제어 | O | O | O | O | O | △ |
| Exp 2: SSE 스트리밍 | O | O | O | O | O | O |
| Exp 3: Signal-weighted 매칭 | O | O | O | O | O | △ |
| Exp 4: 23일 SaaS | O | O | O | O | O | O |
| Exp 5: Multi-model 크레딧 | O | O | O | O | O | △ |

> O = 완성, △ = 부분(정량 측정 미완 — 서비스 초기 단계), X = 미확인
> △ 항목은 서비스 운영 데이터 축적 후 정량화 가능
