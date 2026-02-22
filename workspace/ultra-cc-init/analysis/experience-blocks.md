# ultra-cc-init Experience Blocks

> 3부작 통합 인터뷰 결과. 전체 내용은 `workspace/open-pantheon/analysis/experience-blocks.md` 참조.

## 이 프로젝트의 주요 경험

### Experience 1: 97% 토큰 최적화 — Five Pillars (주도)
4-tier 토큰 예산(2K/10K/30K/50K)은 점진적 실험으로 수렴. Claude와 Codex의 모델별 성능 차이를 확인하고 Codex의 큰 context window를 활용하여 Claude 부담 경감. DB 인덱스 + OS demand paging에서 영감.

### Experience 2: Multi-CLI 오케스트레이션 (원형)
Claude=코드 작성, Codex=Critical 부분 분석, Gemini=디자인. Codex가 6개 불일치 발견(commit `adb3d11`)이 결정적 계기. 듀얼 AI 루프의 원형 구현.

### Experience 4: 47일 삼부작 진화 (최적화 편)
ultra-cc-init은 삼부작의 두 번째. 6일 집중 개발, v5.0 "역성장 릴리스"(순 2,434줄 감소, 기능 100%, 비용 3%). 범위 확장(포트폴리오 요구)이 open-pantheon 통합을 촉발.

## 전체 Gap Summary (30/30 블록 해소)

| 경험 | 목표 | 현상 | 가설 | 판단기준 | 실행 | 결과 |
|------|:----:|:----:|:----:|:-------:|:----:|:----:|
| 1. 토큰 최적화 | O | O | O | O | O | O |
| 2. Multi-CLI | O | O | O | O | O | O |
| 4. 삼부작 진화 | O | O | O | O | O | O |
