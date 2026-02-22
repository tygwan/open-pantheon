# resumely Analysis Summary

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
