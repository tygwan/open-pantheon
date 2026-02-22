# resumely Stack Profile

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
