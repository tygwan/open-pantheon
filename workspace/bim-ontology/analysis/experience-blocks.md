# bim-ontology — Experience Blocks

> 6블록 사고력 템플릿 기반 경험 구조화. 분석 데이터 + 사용자 인터뷰 결합.
> 생성일: 2026-02-22 | 경험 수: 6개 | 프로젝트 목표: 논문 발표 + 실제 건설현장 적용 (둘 다)

---

## Experience 1: Oxigraph 백엔드 전환 — rdflib에서 Rust 기반 트리플스토어로

### 목표(KPI)
BIM 온톨로지 시스템의 쿼리 응답속도를 현장 의사결정에 활용 가능한 수준으로 개선. Conference paper용 MVP를 빠르게 완성하면서도, 2.8M 트리플 규모의 방대한 BIM 데이터에서 실시간 대시보드 인터랙션이 가능해야 함.

### 현상(문제 증상)
- rdflib(Python-native) 백엔드에서 복합 hierarchy 쿼리 시 5분 이상 소요 (출처: narrative.md)
- 13개 대시보드 탭 전환 시 UX 붕괴. cold query 65ms이지만 복합 쿼리가 병목
- Navisworks에서 IFC 데이터의 ontology 관계가 명확하게 나오지 않아 raw data(mesh, csv, ttl, owl)로 출력하는 방향으로 전환 → 데이터 규모 증가로 성능 문제 심화

### 원인 가설
1. **rdflib의 로딩 속도 한계** → 검증: 프로파일링으로 rdflib의 Python 인터프리터 오버헤드 확인. 2.8M 트리플 로딩 시 메모리/시간 측정
2. **SPARQL 쿼리 최적화기 부재** → 검증: 동일 쿼리를 rdflib vs Oxigraph(Spargebat 옵티마이저 내장)에서 실행 비교. Golden Query 40개 벤치마크
3. **Navisworks IFC 출력의 ontology 관계 불명확** → 검증: IFC export 데이터와 CSV AllHierarchy 데이터의 관계 보존율 비교

### 판단 기준(Decision Rule)
- **조건**: ontology 관계가 IFC에서 명확히 나오는가?
- **전략 A (기각)**: IFC 기반 ontology 직접 구현
- **전략 B (채택)**: raw data(mesh, csv, ttl, owl)로 출력 후 RDF 변환
- **기각 근거**: Navisworks IFC exporter가 parent-child, property context를 누락. raw data가 더 충실한 소스

- **조건**: rdflib 로딩 속도가 대시보드 UX를 감당하는가?
- **전략 A (채택)**: Oxigraph(Rust) 전환 — pyoxigraph가 pip install 한 줄. Shadow/Canary로 안전 전환
- **전략 B (기각)**: rdflib 최적화/캐싱만으로 해결 시도
- **기각 근거**: Python-native의 근본적 한계. 캐싱만으로는 복합 쿼리 5분+ 해결 불가

### 실행
1. Golden Query 40개 정의 (5 카테고리: Statistics, Hierarchy, Properties, Spatial, Cross-domain) — 양 백엔드 결과 비교 기준 확립
2. Shadow/Canary 패턴 구현 — rdflib를 primary로 두고 Oxigraph를 shadow로 병렬 실행, 결과 자동 비교 (도구: `src/api/utils/shadow_executor.py`)
3. 점진적 트래픽 전환 — shadow → canary → primary 단계별 이동. 40/40 쿼리 일치 확인 후 전환 완료
4. LRU TTL 캐시 추가 — hot query 경로 추가 최적화

### 결과

| 지표 | Before (rdflib) | After (Oxigraph) | 변화 |
|------|-----------------|-------------------|------|
| 복합 쿼리 응답 | 5분+ | 4-20ms | **34-64x 개선** |
| p95 latency | 측정 불가 (타임아웃) | 517ms | 실시간 가능 |
| 캐시 적중 시 | N/A | 14,869x speedup | - |
| 전환 중 다운타임 | - | **0** | Shadow/Canary 패턴 |
| Golden Query 일치 | - | **40/40 (100%)** | 데이터 무결성 보장 |

**핵심 성과**: Python rdflib → Rust Oxigraph 전환으로 34-64x 성능 개선. Shadow/Canary 패턴으로 무중단 전환 달성. 40개 Golden Query로 결과 일치 검증.

---

## Experience 2: BIM 데이터 손실 복원 — IFC 스펙 한계를 이중 경로로 극복

### 목표(KPI)
건설공사 전 생애주기에서 BIM 데이터를 추적 가능하도록 온톨로지화. Navisworks에서 추출한 12,009개 객체의 계층구조, 속성, 관계를 유실 없이 RDF로 변환.

### 현상(문제 증상)
- IFC 내보내기 시 parent-child 관계 붕괴, property context 소실, type 정보 유실 (출처: narrative.md)
- Navisworks InstanceGuid ≠ IFC GlobalId ≠ 커스텀 ID. 식별자 불안정으로 하류 시스템(스케줄링, 원가 배분) 연동 실패
- 복잡한 plant project 설계 특성상 관계 파악이 핵심인데, 내보내기 과정에서 정보 손실

### 원인 가설
1. **IFC 스펙 자체의 한계** → 검증: IFC 표준이 Navisworks의 계층구조(AllHierarchy)를 완전히 표현하지 못함. IFC export vs CSV export 데이터 비교로 확인
2. **Navisworks IFC exporter의 구현 제한** → 검증: 동일 모델을 IFC vs CSV(AllHierarchy)로 각각 내보내고 관계 보존율 비교
3. **식별자 체계 불일치** → 검증: InstanceGuid, Item GUID, Authoring ID 각각의 안정성을 여러 export에서 교차 확인

### 판단 기준(Decision Rule)
- **조건**: IFC export가 계층구조와 속성을 충분히 보존하는가?
- **전략 A (기각)**: IFC 단일 경로만 사용
- **전략 B (채택)**: IFC + CSV 이중 경로. CSV(AllHierarchy)가 더 충실한 데이터 소스
- **기각 근거**: IFC 스펙 자체의 한계. Navisworks의 9단계 계층과 속성 컨텍스트를 IFC가 완전히 담지 못함

- **조건**: 식별자가 안정적인가?
- **전략 A (채택)**: Synthetic ID fallback chain (InstanceGuid → Item GUID → Authoring ID → Path Hash). 결정론적이되 도구 업데이트에 견고
- **전략 B (기각)**: 단일 식별자 의존
- **기각 근거**: 어떤 단일 ID도 모든 상황에서 안정적이지 않음

### 실행
1. IFC 파싱 파이프라인 구축 — `ifcopenshell` 기반 (`src/parser/ifc_parser.py`)
2. CSV → RDF 변환기 개발 — Navisworks AllHierarchy CSV에서 ObjectId, ParentId, Level, Properties 추출 (`src/converter/navis_to_rdf.py`)
3. Name-based category inference — 29개 패턴으로 type 정보 복원 (`src/converter/ifc_to_rdf.py`)
4. PropertyValue reification — RDF reification으로 414K 속성값의 컨텍스트 보존
5. Synthetic ID fallback chain 구현 — 4단계 ID 해소 전략

### 결과

| 지표 | Before (IFC only) | After (IFC+CSV) | 변화 |
|------|-------------------|------------------|------|
| 보존된 객체 | 부분적 (계층 붕괴) | **12,009개** (9 계층) | 완전 보존 |
| 속성값 | context 유실 | **414K** reified values | 컨텍스트 복원 |
| 카테고리 인식 | type 유실 | **29 패턴** 자동 분류 | 자동화 |
| ID 안정성 | 단일 ID 의존 | **4단계 fallback** | 도구 독립적 |

**핵심 성과**: IFC 스펙 한계를 CSV 이중 경로 + Synthetic ID + PropertyValue reification으로 극복. 12,009 객체 × 9 계층 완전 보존.

---

## Experience 3: NL2SPARQL — 온톨로지 스키마 기반 자연어 인터페이스

### 목표(KPI)
SPARQL 전문 지식 없는 도메인 전문가(프로젝트 매니저, 안전 엔지니어)가 한국어/영어 자연어로 BIM 데이터 질의 가능하도록 함. Conference paper 핵심 기여 포인트.

### 현상(문제 증상)
- SPARQL 문법 장벽으로 도메인 전문가가 직접 데이터 조회 불가
- "Zone A의 모든 파이프 총 무게는?" 같은 질문에 SPARQL 작성 필요 → 개발자 의존
- 건설현장에서 빠른 의사결정을 위해 반복작업/처리시간 단축이 필수인데, 쿼리 작성이 병목

### 원인 가설
1. **SPARQL 문법의 높은 진입장벽** → 검증: 도메인 전문가에게 SPARQL 교육 시간 대비 효과 측정
2. **GUI 쿼리빌더의 유연성 부족** → 검증: 프리셋 대시보드/쿼리빌더는 미리 정의된 패턴만 가능. 예상 못한 질문 처리 불가
3. **LLM의 SPARQL 생성 정확도 성숙** → 검증: GPT/Claude에 ontology schema를 제공하면 SPARQL 생성 정확도 검증

### 판단 기준(Decision Rule)
- **전제 조건**: ontology DB schema 설계가 잘 되어 있어야 함
- **조건**: schema가 충분히 구조화되어 있으면 LLM이 읽고 정확한 SPARQL 생성 가능
- **전략 A (채택)**: LLM 기반 NL2SPARQL — schema를 LLM에 제공하여 자연어 → SPARQL 자동 변환
- **전략 B (기각)**: GUI 쿼리빌더 / 프리셋 대시보드
- **기각 근거**: GUI는 미리 정의된 패턴만 처리. 자연어는 예상 못한 질문도 처리 가능. 건설현장 의사결정의 유연성 필요

### 실행
1. Schema Retriever 구현 — ontology에서 entity/predicate 매핑 자동 추출
2. Multi-provider LLM 통합 — Anthropic(Claude) + OpenAI(GPT) 지원. 단일 벤더 의존 방지
3. Static Validator — SPARQL injection 공격 방지 (UNION, DROP, DELETE 차단)
4. Evidence chain 기록 — 어떤 ontology fact가 번역에 사용되었는지 투명하게 추적
5. 대시보드 통합 — SPARQL 탭에 NL 입력 박스, 템플릿 라이브러리, 쿼리 히스토리 구현

### 결과

| 지표 | Before | After | 변화 |
|------|--------|-------|------|
| SPARQL 작성 주체 | 개발자 전용 | **도메인 전문가 직접** | 접근성 해결 |
| 지원 언어 | N/A | **한국어 + 영어** | 다국어 |
| 구현 규모 | 0 | **7 모듈, 39 unit tests** | - |
| LLM 벤더 | N/A | **2 providers** (Anthropic, OpenAI) | 단일 벤더 비의존 |
| 보안 | N/A | **Static Validator** (injection 차단) | - |

**핵심 성과**: 잘 설계된 ontology schema를 전제로 LLM이 자연어를 SPARQL로 변환. SPARQL 진입장벽 제거, 도메인 전문가의 직접 데이터 접근 실현.

---

## Experience 4: SHACL 데이터 품질 검증 — W3C 표준 기반 BIM 데이터 무결성

### 목표(KPI)
BIM 데이터의 무결성을 자동으로 검증하여 수동 검수 시간 단축. RDF 생태계와 자연스럽게 통합되는 검증 체계 구축. 논문에서 표준 기반 검증 방법론으로 제시.

### 현상(문제 증상)
- BIM 데이터에서 잘못된 데이터(누락된 ObjectId, 범위 밖 좌표, 끊어진 parent-child 관계)를 발견하려면 수동 검수 필요
- "이 건물이 구역 규정을 위반하는가?" 같은 질문은 수천 개 요소를 수동 검사해야 답변 가능
- 데이터 품질 문제가 하류 분석(공간 검증, 일정 계획)의 신뢰도를 떨어뜨림

### 원인 가설
1. **구조화된 검증 규칙 부재** → 검증: 기존에는 코드로 개별 검증 로직 작성. 규칙 추가/수정이 코드 변경을 요구
2. **검증과 데이터 모델의 분리** → 검증: 코드 기반 룰은 데이터 스키마와 별도 관리. 스키마 변경 시 검증 로직 동기화 필요
3. **재사용 불가능한 검증 로직** → 검증: 프로젝트별로 검증 코드를 다시 작성. 표준 기반이면 재사용 가능

### 판단 기준(Decision Rule)
- **조건**: 이미 RDF/OWL 기반 시스템인가?
- **전략 A (채택)**: SHACL (W3C 표준) — RDF 그래프 형태로 shape 정의. 온톨로지와 자연스러운 통합
- **전략 B (기각)**: 코드 기반 커스텀 validator
- **기각 근거**: RDF 생태계와 자연스럽게 통합. shape 자체가 그래프로 관리 가능. W3C 표준이라 논문 근거로 강하고 다른 BIM 프로젝트에도 재사용 가능

### 실행
1. 6개 도메인별 SHACL shape 설계 — Identity, Geometry, Numeric, Classification, Relationship, Completeness
2. 15개 shape 구현 — `data/ontology/shapes/core/` (도구: pyshacl 0.31.0)
3. 대시보드 Validation 탭 구현 — SHACL 실행 → 위반사항 도메인별 리포트
4. NL2SPARQL root cause engine 연동 — "왜 요소 X가 검증 실패했는가?" 자연어 분석

### 결과

| 지표 | Before | After | 변화 |
|------|--------|-------|------|
| 검증 방식 | 수동 검수 | **자동 SHACL** | 자동화 |
| 검증 규칙 | 0 (코드 산재) | **15 shapes, 6 도메인** | 체계화 |
| 표준 준수 | 비표준 | **W3C SHACL** | 논문 + 재사용 |
| 검증-분석 연계 | 불가 | **NL2SPARQL root cause** 연동 | 원인 추적 |

**핵심 성과**: W3C SHACL 표준으로 BIM 데이터 품질 검증 자동화. 15 shapes × 6 도메인. RDF 생태계 자연 통합 + 논문 기여.

---

## Experience 5: 공간 검증 프레임워크 — Navisworks 의존성 탈피

### 목표(KPI)
Plant project의 복잡한 3D 공간 관계(인접성, 충돌, 연결성)를 Navisworks 없이 웹에서 검증 가능하도록 함. Navisworks API의 read-only 한계를 극복하고 ontology 기반 공간 데이터 관리 체계 구축.

### 현상(문제 증상)
- Plant project는 x, y, z축으로 사방으로 퍼지는 구조 → BBox 기반 object 연결성 검증이 어려움
- Navisworks Clash Detection은 있지만, API가 write 기능이 없어 schema update/커스텀 분류가 불편
- 충돌 감지 결과를 온톨로지와 연결하여 자동 분류/추적하려면 별도 시스템 필요
- Navisworks 라이선스 없이도 동작하는 웹 기반 검증 필요

### 원인 가설
1. **BBox의 공간 표현 한계** → 검증: plant 구조물에서 BBox overlap과 실제 물리적 인접성의 불일치율 측정
2. **Navisworks API의 write 불가** → 검증: API 문서 확인. schema 수정, 커스텀 속성 주입이 API로 불가능
3. **Clash Detection 결과의 온톨로지 연결 부재** → 검증: Navisworks clash 결과가 구조화되지 않은 텍스트/CSV로만 출력

### 판단 기준(Decision Rule)
- **조건**: Navisworks API에 write 기능이 있는가?
- **전략 A (기각)**: Navisworks API 기반 확장
- **전략 B (채택)**: 별도 공간 검증 시스템 구축 (웹 기반, ontology 연동)
- **기각 근거**: Navisworks API 자체에 write 기능이 없어 schema update 불편. 온톨로지 시스템으로 만들려면 독립 시스템 필수

- **조건**: BBox만으로 plant 구조물의 연결성 검증이 가능한가?
- **전략 A (기각)**: BBox overlap만 사용
- **전략 B (채택)**: BBox + 실제 mesh collision + connected components 복합 검증
- **기각 근거**: plant project는 사방으로 퍼지는 구조. BBox만으로는 오탐/미탐 과다

### 실행
1. CSV 기반 SpatialHierarchyIndex 구축 — Navisworks CSV에서 계층+좌표 추출 (`src/spatial/hierarchy_index.py`)
2. BBox adjacency 계산 — axis-aligned bounding box overlap 감지
3. Connected components — Union-Find로 인접 요소 그룹핑 (`src/spatial/connected_components.py`)
4. Mesh collision — trimesh 기반 실제 메시 거리 계산 (`src/spatial/mesh_collision.py`)
5. Validation UX — Y/N/Skip verdict 시스템, 색상 코딩 3D 시각화, 배치 어노테이션 API
6. CSV verdict persistence — 수동 검증 결과를 CSV로 저장, pipeline stale 마킹으로 재계산 트리거

### 결과

| 지표 | Before (Navisworks 의존) | After (독립 시스템) | 변화 |
|------|--------------------------|---------------------|------|
| 라이선스 의존 | Navisworks 필수 | **웹 브라우저만 필요** | 의존성 제거 |
| Schema 수정 | API write 불가 | **자유로운 ontology update** | 유연성 확보 |
| 검증 방식 | BBox만 | **BBox + Mesh + Components** | 정확도 향상 |
| 결과 추적 | 비구조화 텍스트 | **CSV verdict + 온톨로지 연동** | 자동 분류 |
| 공간 API | 0 | **26 endpoints** | - |

**핵심 성과**: Navisworks write 불가 한계를 독립 공간 검증 시스템으로 극복. BBox+Mesh+Components 복합 검증으로 plant project 특성 대응.

---

## Experience 6: Delta 증분 업데이트 엔진

> [미확인 — 사용자 스킵] 사용자가 해당 기능의 배경을 기억하지 못하여 인터뷰 미완.
> 분석 데이터만으로 구성된 부분적 블록입니다.

### 목표(KPI)
[미확인]

### 현상(문제 증상)
2.8M 트리플 스토어에 속성 몇 개를 추가할 때 전체 데이터셋 리로드 필요 → 5분 소요 (출처: narrative.md)

### 원인 가설
[미확인]

### 판단 기준(Decision Rule)
[미확인]

### 실행
- Manifest: 메타데이터 해시 기반 변경 감지 (`src/delta/manifest_store.py`)
- Diff Engine: old vs new 비교 (`src/delta/diff_engine.py`)
- Patch Builder: SPARQL INSERT/DELETE 생성
- Reconciler: 일관성 검증 (`src/delta/reconciler.py`)
(출처: architecture.md)

### 결과

| 지표 | Before | After | 변화 |
|------|--------|-------|------|
| 업데이트 방식 | 전체 리로드 (5분) | **증분 패치 (초 단위)** | 대폭 단축 |

**핵심 성과**: [부분적] 전체 리로드를 증분 패치로 대체. 정확한 의사결정 배경은 미확인.

---

## Gap Summary

| 경험 | 목표 | 현상 | 가설 | 판단기준 | 실행 | 결과 |
|------|------|------|------|---------|------|------|
| Exp 1: Oxigraph 전환 | O | O | O | O | O | O |
| Exp 2: 데이터 손실 복원 | O | O | O | O | O | O |
| Exp 3: NL2SPARQL | O | O | O | O | O | O |
| Exp 4: SHACL 검증 | O | O | O | O | O | O |
| Exp 5: 공간 검증 | O | O | O | O | O | O |
| Exp 6: Delta 업데이트 | X | O | X | X | △ | △ |

> O = 완성, △ = 부분(보충 필요), X = 미확인
