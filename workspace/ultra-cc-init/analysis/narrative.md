# ultra-cc-init Narrative

## One-liner

Claude Code 개발 프레임워크의 토큰 사용량을 97% 절감하면서 25개 agent, 27개 skill을 유지하는 극한 최적화 시스템 — AI Native 생태계의 기반 인프라.

## Problem & Solution

### Problem

Claude Code는 세션 시작 시 CLAUDE.md, agent 파일, skill 정의 등을 모두 로드합니다. cc-initializer v4.5 기준으로 25개 agent, 27개 skill, 6개 hook을 포함한 프레임워크는 세션 초기화에 **~38,000 토큰**을 소비했습니다. 매 턴마다 CLAUDE.md만 **~1,700 토큰**이 반복 투입되었고, 실제 작업에 필요한 agent는 1-2개뿐인데 25개 전체가 로드되었습니다. 이는 Claude Code의 context window를 빠르게 소진시키고, 복잡한 멀티페이즈 프로젝트에서 맥락 유실로 이어졌습니다.

### Solution

**Five Pillars** 전략으로 기능 손실 없이 토큰 소비를 극한까지 줄였습니다:

1. **Agent MANIFEST** — 25개 agent를 31줄 라우팅 테이블로 압축. 키워드 매칭으로 필요한 agent만 lazy-load (`MANIFEST.md:1-31`)
2. **Lean CLAUDE.md** — 1,700 토큰 CLAUDE.md를 300 토큰 템플릿으로 교체. 8개 변수만 유지 (`.claude/templates/CLAUDE.lean.md`)
3. **Incremental Loading** — 4-tier 토큰 예산 (2K/10K/30K/50K)으로 턴별 점진적 로딩 (`settings.json:context-optimizer`)
4. **2-Tier Document** — 대형 파일을 Header(~50줄) + Detail(on-demand) 구조로 분리. 8개 파일에서 평균 90% 절감 (`agents/details/`)
5. **Structured Data** — 모든 산문을 테이블로 변환. 9개 파일에서 73% 라인 절감

### Why This Approach

토큰은 AI agent의 "작업 메모리"입니다. 프레임워크가 컨텍스트를 소비하면 실제 작업(코드 분석, 생성)에 쓸 수 있는 용량이 줄어듭니다. ultra-cc-init은 "프레임워크의 오버헤드를 0에 수렴시키면서 기능은 100% 보존"이라는 원칙을 추구합니다. Database의 인덱스 패턴과 OS의 demand paging에서 영감을 받아, lazy-load + keyword routing 아키텍처를 채택했습니다.

## Milestones

| Date | Milestone | Impact | Evidence |
|------|-----------|--------|----------|
| 2026-01-06 | **v1.0 — Initial Release** (cc-initializer) | Claude Code 프로젝트 초기화 자동화 시작. Agent 기반 개발 워크플로우의 첫 구현 | `c2a5fbf feat: Initial release of Claude Code Project Initializer` |
| 2026-01-07 | **v2.0 — Agile Automation** | Sprint/Phase 통합 개발 시스템 도입. hook 기반 자동화 파이프라인 완성 | `8518dd1 feat(agile): add agile development automation v2.0` |
| 2026-01-09 | **v3.0 — Discovery First** | 대화 기반 요구사항 파악(`project-discovery`) → 문서 자동 생성 파이프라인 구축 | `1323adc feat(cc-initializer): implement Discovery First approach v3.0` |
| 2026-01-11 | **v4.0 — Framework Setup & Sync** | `.claude/` 전체를 다른 프로젝트로 복사/동기화하는 프레임워크 배포 체계 확립. `--sync`, `--update` 옵션 추가 | `ea8ba66 feat(cc-initializer): add Framework Setup and --sync option v4.0` |
| 2026-01-21 | **v4.3 — GitHub & Analytics** | `github-manager` agent + `/gh` skill로 이슈/PR/CI/CD/릴리스를 CLI에서 통합 관리. Analytics 시각화 추가 | `ed0146e feat(github): add github-manager agent and /gh skill v4.3.0` |
| 2026-01-31 | **v5.0 — Ultra Optimization** | Five Pillars 도입. 세션 토큰 38K→1.1K (97% 절감). Agent MANIFEST, Lean CLAUDE.md, Incremental Loading 구현 | `dcd5eff feat(token-optimization): add Agent MANIFEST, lean CLAUDE.md template, and incremental context loading` |
| 2026-01-31 | **v5.1 — 2-Tier + Structured** | 8개 대형 파일을 Header/Detail 분리 (평균 90% 절감). 9개 파일을 산문→테이블 변환 (73% 절감). 총 5,400+ 라인 최적화 | `9748c5b feat(token-optimization): implement 2-Tier Document structure (P1-1)` |
| 2026-02-02 | **v5.1+ — Dual AI Skills** | Codex CLI 연동 및 Claude+Codex 듀얼 AI 루프 스킬 추가. 멀티 LLM 오케스트레이션 시작 | `54c1998 feat: add Codex dual-AI skills to project (codex, codex-claude-loop)` |

## Impact Metrics

| Metric | Value | Source |
|--------|-------|--------|
| 세션 초기화 토큰 절감 | 38,000 → 1,100 (**97% 감소**) | `README.md:32` — Before & After 섹션 |
| CLAUDE.md 턴당 토큰 | 1,700 → 300 (**82% 감소**) | `README.md:33` — Before & After 섹션 |
| Agent 라우팅 토큰 | 38,000 → 500 (**97% 감소**) | `README.md:34`, `MANIFEST.md` (31줄 × ~16 tokens/줄) |
| 총 코드 라인 최적화 | **5,400+ 라인** 절감 | `README.md:23` — Lines Saved 배지 |
| 프레임워크 컴포넌트 | 25 agents, 27 skills, 6 commands, 6 hooks | `README.md:18-22` — 배지 |
| 프레임워크 총 파일 수 | **126개** 파일 (`.claude/` 디렉토리) | `find .claude -type f \|wc -l` |
| 프레임워크 총 라인 수 | **20,043줄** (md + sh + json) | `find .claude -type f \|xargs wc -l` |
| 2-Tier 평균 Header 절감 | **90%** (8개 파일 대상) | `README.md:162-171` — 2-Tier Document Architecture |
| Structured Data 평균 절감 | **52%** (9개 파일 대상) | `README.md:179-189` — Structured Data Format |
| Git 커밋 수 | **36개** (약 1개월 개발) | `git log --oneline\|wc -l` |
| 총 코드 변경량 | 29,519 insertions / 8,403 deletions | `git log --numstat` 집계 |
| 버전 반복 | v1.0 → v5.1+ (**8개 major/minor 릴리스**, 31일간) | `git log` 버전 태그 커밋 |
| 실사용 프로젝트 | DXTnavis (등록) | `PROJECTS.json` |

## Hero Content

### Headline

**97% 토큰 절감, 기능 손실 Zero — AI 개발 프레임워크의 극한 최적화**

### Description

ultra-cc-init은 Claude Code를 위한 통합 개발 워크플로우 프레임워크입니다. 25개 전문 agent, 27개 skill, 6개 자동화 hook을 하나의 생태계로 통합하면서, 세션 초기화 토큰을 38,000에서 1,100으로 줄였습니다. Agent MANIFEST 라우팅, 2-Tier Document 분리, Incremental Context Loading이라는 세 가지 핵심 패턴은 AI agent 프레임워크의 새로운 설계 원칙을 제시합니다. cc-initializer(v1-v4)의 기능 확장기를 거쳐, ultra(v5+)에서 성능 최적화로 전환한 이 프로젝트는 "기능을 추가할수록 비용은 줄어들 수 있다"는 역설적 진화를 실현했습니다.

### Key Achievements

1. **97% Token Reduction** — 세션 초기화 38K→1.1K, 매 턴 1,700→300 토큰
2. **Five Pillars Architecture** — MANIFEST routing, Lean template, Incremental loading, 2-Tier docs, Structured data
3. **31일간 8회 릴리스** — v1.0(초기화)→v5.1(극한 최적화), 주 2회 이상 릴리스
4. **Dual AI Orchestration** — Claude + Codex CLI 연동, 멀티 LLM 듀얼 엔지니어링 루프

## Story Arc

### Act 1: Genesis — "하나의 초기화 스크립트에서 시작" (2026-01-06 ~ 01-07)

cc-initializer는 Claude Code 프로젝트를 시작할 때 필요한 boilerplate를 자동 생성하는 도구로 탄생했습니다. 첫 커밋에서 agent 기반 구조, hook 시스템, 기본 스킬이 한꺼번에 추가되었습니다. 이틀 만에 v2.0으로 올라가며 Agile 자동화(Sprint/Phase tracking)가 도입되었고, 단순한 초기화 도구를 넘어 **개발 생명주기 관리 프레임워크**로 방향을 잡았습니다.

### Act 2: Expansion — "기능의 폭발적 성장" (2026-01-09 ~ 01-22)

v3.0에서 Discovery First 접근법이 도입되면서, 프레임워크는 대화 기반 요구사항 파악 → 문서 자동 생성이라는 고유한 워크플로우를 갖게 되었습니다. v4.0에서는 `--sync`, `--update`로 프레임워크 자체를 다른 프로젝트에 배포하는 메커니즘이 완성되었습니다. GitHub 통합(v4.3), Analytics(v4.2), 커뮤니티 프로젝트 발견(v4.4), README 도우미(v4.5)가 빠르게 추가되면서 agent 수는 25개, 스킬은 27개로 팽창했습니다. 그러나 이 성장은 비용을 수반했습니다 — 세션 초기화에만 **38,000 토큰**을 소비하게 된 것입니다.

### Act 3: Compression — "적을수록 강하다" (2026-01-31)

v5.0은 프로젝트의 결정적 전환점입니다. 기능을 추가하는 대신 **기존 기능의 토큰 비용을 극한까지 줄이는** 작업이 하루 만에 집중 수행되었습니다. 5개의 커밋으로 Five Pillars가 구현되었고, Codex CLI로 6개의 내부 비일관성이 발견/수정되었습니다. 30개 파일에서 2,843줄이 추가되고 5,277줄이 삭제되어, 순 2,434줄 감소라는 드문 "역성장 릴리스"가 완성되었습니다. 결과: 기능 100%, 비용 3%.

### Act 4: Orchestration — "멀티 AI 시대" (2026-02-01 ~ 현재)

Codex CLI 통합과 듀얼 AI 루프 스킬 추가로, 단일 Claude 프레임워크에서 **멀티 LLM 오케스트레이션 플랫폼**으로 진화했습니다. Claude가 구현하고 Codex가 검증하는 교차 검증 루프는 open-pantheon의 Multi-CLI Distribution 패턴의 원형이 되었습니다. 이 레포는 cc-initializer → ultra-cc-init → open-pantheon으로 이어지는 AI Native 생태계 삼부작의 두 번째 작품입니다.

## Technical Challenges

### Challenge 1: Agent Routing Without Loading All Files

**Problem**: 25개 agent 파일을 세션 시작 시 모두 로드하면 ~38,000 토큰이 소비됩니다. 사용자가 "커밋해줘"라고 말했을 때 실제 필요한 것은 `commit-helper` 하나뿐인데, 나머지 24개 agent 정의도 컨텍스트에 올라가 있었습니다.

**Impact**: Context window의 약 38%가 프레임워크 오버헤드로 낭비되어, 복잡한 멀티파일 작업에서 맥락 유실과 응답 품질 저하가 발생했습니다.

**Solution**: `MANIFEST.md` 패턴 — 25개 agent를 31줄 라우팅 테이블(~500 토큰)로 압축하고, 한국어/영어 키워드 컬럼으로 intent matching 후 해당 agent 파일만 lazy-load합니다. Database의 인덱스가 전체 테이블 스캔을 피하듯, MANIFEST가 전체 agent 로드를 피합니다.

**Evidence**: `MANIFEST.md:1-31` (라우팅 테이블), `README.md:34` ("Agent routing: load all 25 → MANIFEST → 1, -97%"), `settings.json:126` ("agent_manifest": ".claude/agents/MANIFEST.md")

### Challenge 2: Framework Overhead vs. Working Memory Trade-off

**Problem**: CLAUDE.md가 매 턴마다 ~1,700 토큰을 소비했습니다. 프레임워크의 전체 구조, 컨벤션, 설정을 설명하는 산문형 문서가 Claude의 시스템 프롬프트에 항상 포함되었습니다. 이는 누적적으로 세션당 수만 토큰의 "고정 비용"을 발생시켰습니다.

**Impact**: 긴 대화에서 실제 코드를 다룰 수 있는 컨텍스트 여유가 크게 줄었고, `context > 80%` 경고가 빈번하게 발생했습니다.

**Solution**: 3중 전략 적용: (1) Lean CLAUDE.md 템플릿(8개 변수, ~300 토큰)으로 교체 (2) 모든 산문을 테이블/구조화 데이터로 변환 (3) 4-tier 토큰 예산 시스템(Quick 2K / Standard 10K / Deep 30K / Full 50K)으로 세션 유형에 맞는 컨텍스트만 로드. Session Checkpoint 프로토콜로 80% 임계치 초과 시 자동 저장 후 `/clear` → ~2K로 즉시 복구.

**Evidence**: `.claude/templates/CLAUDE.lean.md` (27줄 템플릿), `README.md:30-37` (Before & After), `settings.json:121-151` (context-optimizer 전체 설정), `context-optimizer/SKILL.md:46-49` (Token Budget Guidelines)

### Challenge 3: Framework Distribution and Sync Integrity

**Problem**: cc-initializer를 여러 프로젝트에 배포할 때, 각 프로젝트가 자체적으로 커스터마이징한 agent/skill과 프레임워크 원본의 업데이트 사이에 충돌이 발생했습니다. 단순 복사는 프로젝트 고유 설정을 덮어쓰고, 수동 병합은 누락을 발생시켰습니다.

**Impact**: 프레임워크 업데이트 시 각 프로젝트에서 개별 diff/merge가 필요했고, 에러가 잦았습니다.

**Solution**: `settings.json`의 `sync` 섹션에 컴포넌트별 merge strategy를 정의했습니다. agents/skills/commands/hooks는 `add_missing` 전략(기존 파일 유지, 새 파일만 추가)을 사용하고, settings는 `deep_merge`(키 단위 병합)를 적용합니다. `preserve_project_customizations: true`로 프로젝트 고유 설정을 보호하며, `backup_before_sync: true`로 롤백 안전망을 제공합니다. `/init --update`로 원격 레포에서 최신 버전을 pull → sync → validate까지 원커맨드로 완료됩니다.

**Evidence**: `settings.json:178-216` (sync 전체 설정), `CLAUDE.md:84-89` (sync 워크플로우), `346a96a feat(cc-initializer): add --update option for GitHub sync v4.1`
