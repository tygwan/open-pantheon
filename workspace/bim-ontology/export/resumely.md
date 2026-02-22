# bim-ontology — Pantheon Export

> Exported from open-pantheon | 2026-02-22T13:01:13Z

---

# Architecture

## bim-ontology — Architecture Analysis

**Audit Scope**
Directly inspected source/config files include (sample, >15): `src/api/server.py:1`, `src/storage/base_store.py:1`, `src/storage/__init__.py:1`, `src/storage/triple_store.py:1`, `src/storage/oxigraph_store.py:1`, `src/storage/graphdb_store.py:1`, `src/storage/object_store.py:1`, `src/parser/ifc_parser.py:1`, `src/converter/ifc_to_rdf.py:1`, `src/converter/csv_to_rdf.py:1`, `src/converter/navis_to_rdf.py:1`, `src/converter/lean_layer_injector.py:1`, `src/spatial/hierarchy_index.py:1`, `src/spatial/adjacency_detector.py:1`, `src/spatial/connected_components.py:1`, `src/spatial/mesh_collision.py:1`, `src/api/utils/query_executor.py:1`, `src/api/utils/shadow_executor.py:1`, `src/inference/reasoner.py:1`, `src/inference/shacl_validator.py:1`, `src/delta/diff_engine.py:1`, `src/mcp/navisworks_server.py:1`.

### 1. Tech Stack

| Layer | Technology | Version / Constraint | Evidence |
|---|---|---|---|
| Runtime | Python | `>=3.11` (project constraint) | `pyproject.toml:5` |
| Runtime (CI) | Python | `3.12` | `.github/workflows/ci.yml:18`, `.github/workflows/ci.yml:21` |
| Runtime (Docker) | Python image | `python:3.12-slim` | `Dockerfile:1` |
| API framework | FastAPI | locked `0.128.1` (constraint `>=0.100.0`) | `uv.lock:358`, `uv.lock:359`, `pyproject.toml:8`, `src/api/server.py:11` |
| ASGI server | Uvicorn | locked `0.40.0` (constraint `>=0.23.0`) | `uv.lock:1161`, `uv.lock:1162`, `pyproject.toml:9`, `Dockerfile:22` |
| Data models | Pydantic | locked `2.12.5` (constraint `>=2.0.0`) | `uv.lock:561`, `uv.lock:562`, `pyproject.toml:10`, `src/api/models/request.py:3` |
| RDF engine | rdflib | locked `7.5.0` (constraint `>=7.0.0`) | `uv.lock:921`, `uv.lock:922`, `pyproject.toml:7`, `src/storage/triple_store.py:13` |
| Rule reasoning | owlrl | locked `7.1.4` | `uv.lock:510`, `uv.lock:511`, `pyproject.toml:11`, `src/inference/reasoner.py:11` |
| High-perf triplestore | pyoxigraph | locked `0.5.4` | `uv.lock:710`, `uv.lock:711`, `pyproject.toml:13`, `src/storage/oxigraph_store.py:13` |
| SHACL validation | pyshacl | locked `0.31.0` | `uv.lock:770`, `uv.lock:771`, `pyproject.toml:14`, `src/inference/shacl_validator.py:217` |
| Upload parsing | python-multipart | locked `0.0.22` | `uv.lock:838`, `uv.lock:839`, `pyproject.toml:12`, `src/api/routes/lean_layer.py:12` |
| YAML | PyYAML | locked `6.0.3` | `uv.lock:866`, `uv.lock:867`, `pyproject.toml:15`, `tests/conftest.py:8` |
| MCP | mcp | locked `1.26.0` | `uv.lock:485`, `uv.lock:486`, `pyproject.toml:16`, `src/mcp/navisworks_server.py:15` |
| IFC parsing | ifcopenshell | `>=0.7.0` (not lock-pinned here) | `requirements.txt:2`, `src/parser/ifc_parser.py:14` |
| GraphDB client | SPARQLWrapper | `>=2.0.0` (not lock-pinned here) | `requirements.txt:6`, `src/storage/graphdb_store.py:10` |
| HTTP utility | requests | `>=2.31.0` (not lock-pinned here) | `requirements.txt:25`, `src/storage/graphdb_store.py:91` |
| HTTP client | httpx | locked `0.28.1` (constraint `>=0.24.0`) | `uv.lock:404`, `uv.lock:405`, `requirements.txt:20`, `src/clients/python/client.py:10` |
| Test runner | pytest | locked `9.0.2` | `uv.lock:786`, `uv.lock:787`, `pyproject.toml:26`, `.github/workflows/ci.yml:28` |
| Test async | pytest-asyncio | locked `1.3.0` | `uv.lock:802`, `uv.lock:803`, `pyproject.toml:27` |
| Test coverage | pytest-cov | locked `7.0.0` | `uv.lock:815`, `uv.lock:816`, `pyproject.toml:28`, `.github/workflows/ci.yml:31` |
| Docs site | Astro | lock `5.17.1` (spec `^5.17.1`) | `site/package-lock.json:1663`, `site/package-lock.json:1664`, `site/package.json:12` |
| Docs site runtime | Node.js | `20` in deploy workflow | `.github/workflows/deploy-site.yml:28` |
| Optional external DB | GraphDB image | `ontotext/graphdb:10.6` | `docker-compose.yml:21` |
| Frontend CDN libs | Tailwind/Chart.js/three.js | `2.2.19` / `4.4.0` / `0.137.0` | `src/dashboard/index.html:8`, `src/dashboard/index.html:9`, `src/dashboard/index.html:10` |

### 2. Architecture Pattern

**Pattern classification**
- **Modular monolith with layered internals**: one FastAPI app instance wires all route modules in-process (`src/api/server.py:234`, `src/api/server.py:263`).
- **Layered composition**:
  - API routes (`src/api/routes/sparql.py:14`)
  - Query/service utilities (`src/api/utils/query_executor.py:32`)
  - Storage abstraction (`src/storage/base_store.py:10`)
  - Backend implementations (`src/storage/triple_store.py:21`, `src/storage/oxigraph_store.py:22`, `src/storage/graphdb_store.py:20`)
  - Spatial/inference/delta modules (`src/spatial/hierarchy_index.py:53`, `src/inference/reasoner.py:163`, `src/delta/diff_engine.py:69`)
- **Optional external service integration**: GraphDB backend and Docker profile (`src/storage/graphdb_store.py:20`, `docker-compose.yml:28`).

**ASCII Architecture Diagram**
```text
[IFC file / CSV / TTL]
        |
        v
[Parser + Converters]
  IFCParser / RDFConverter / Navis converters
        |
        v
[TripleStore Abstraction]
  BaseTripleStore -> Oxigraph | rdflib | GraphDB
        |
        +------------------------------+
        |                              |
        v                              v
[FastAPI Route Layer]            [ObjectStore (SQLite)]
  /api/* routers                  objects/edges/groups/workforce
        |                              ^
        |                              |
        v                              |
[Spatial Index + Validation CSV + Continuity Pipeline]
  SpatialHierarchyIndex / connected components / mesh collision
        |
        v
[Clients]
  Dashboard static UI, Python client, MCP server
```
Evidence: `src/api/server.py:263`, `src/storage/base_store.py:10`, `src/storage/__init__.py:7`, `src/storage/object_store.py:47`, `src/spatial/hierarchy_index.py:53`, `src/mcp/navisworks_server.py:19`, `src/api/server.py:295`.

### 3. Directory Structure

**Top-level source layout (LOC snapshot)**
- `src`: 177 files, 44,178 LOC
- `tests`: 126 files, 10,503 LOC
- `scripts`: 16 files, 3,043 LOC
- `site/src`: 4 files, 1,641 LOC
- `examples`: 5 files, 133 LOC
- `.github/workflows`: 3 files, 311 LOC

**Python LOC by `src` subpackage**
- `src/api`: 8,316
- `src/converter`: 3,162
- `src/spatial`: 3,092
- `src/storage`: 1,599
- `src/ai`: 857
- `src/inference`: 627
- `src/delta`: 572
- `src/scheduling`: 402
- `src/mcp`: 336
- `src/ontology`: 289
- `src/parser`: 252
- `src/clients`: 183

**Organization rationale**
- `src/api` is split into app bootstrap, route modules, models, and utils (`README.md:418`, `README.md:422`).
- `src/converter` and `src/parser` isolate ingest/transform concerns (`README.md:426`, `src/parser/ifc_parser.py:1`, `src/converter/ifc_to_rdf.py:1`).
- `src/spatial` is a dedicated analysis subsystem (adjacency, groups, collision) (`README.md:428`, `src/spatial/hierarchy_index.py:1`, `src/spatial/mesh_collision.py:1`).
- `src/inference` separates reasoning/validation (`README.md:429`, `src/inference/reasoner.py:1`, `src/inference/shacl_validator.py:1`).
- `src/delta` isolates incremental update logic (`README.md:430`, `src/delta/diff_engine.py:1`, `src/delta/manifest_store.py:1`).
- Frontend dashboard is static HTML + a very large single JS file (`README.md:423`, `src/dashboard/index.html:1`, `src/dashboard/app.js:1`).

### 4. Key Modules & Components

| Module | LOC | Responsibility | Key Interactions | Evidence |
|---|---:|---|---|---|
| `src/api` | 8,316 | FastAPI app, route orchestration, startup lifecycle | Calls storage factory, initializes query/spatial/object stores | `src/api/server.py:58`, `src/api/server.py:113`, `src/api/server.py:129`, `src/api/server.py:177` |
| `src/storage` | 1,599 | Triple-store abstraction + backends + SQLite object DB | Used by API/query utilities and startup | `src/storage/base_store.py:10`, `src/storage/__init__.py:7`, `src/storage/object_store.py:47`, `src/api/utils/query_executor.py:10` |
| `src/parser` | 252 | IFC file loading, schema/type extraction | Consumed by converter and startup fallback | `src/parser/ifc_parser.py:57`, `src/api/server.py:84`, `src/converter/ifc_to_rdf.py:20` |
| `src/converter` | 3,162 | IFC/CSV/Navis/Lean pipelines to RDF | Feeds triplestore ingest path | `src/converter/ifc_to_rdf.py:25`, `src/converter/navis_to_rdf.py:37`, `src/converter/lean_layer_injector.py:52`, `src/api/server.py:87` |
| `src/spatial` | 3,092 | In-memory hierarchy, adjacency, groups, mesh-collision | Bound to `/api/spatial/*` and continuity pipeline | `src/spatial/hierarchy_index.py:53`, `src/api/routes/spatial.py:20`, `src/spatial/connected_components.py:105`, `src/spatial/mesh_collision.py:146` |
| `src/inference` | 627 | OWL/RDFS reasoning + SHACL validation | Exposed via reasoning routes | `src/inference/reasoner.py:163`, `src/inference/shacl_validator.py:199`, `src/api/routes/reasoning.py:32` |
| `src/delta` | 572 | Hash-based diff, manifest persistence, patch/reconcile | Exposed operationally via `/api/ops/*` status | `src/delta/diff_engine.py:69`, `src/delta/manifest_store.py:46`, `src/delta/reconciler.py:39`, `src/api/routes/ops.py:82` |
| `src/mcp` | 336 | MCP resources/tools/prompts over BIM store | Reuses storage/query stack | `src/mcp/navisworks_server.py:19`, `src/mcp/navisworks_server.py:35`, `src/mcp/navisworks_server.py:138` |
| Dashboard (`src/dashboard`) | 13,129 JS LOC + HTML shell | In-browser client over same-origin API | Served by FastAPI root/static routes | `src/dashboard/app.js:1`, `src/api/server.py:297`, `src/api/server.py:299` |

### 5. Data Flow

**A. Ingestion flow (Input → Processing → Output)**
1. Startup resolves input paths from env defaults (`src/api/server.py:41`).
2. App creates configured triplestore backend (`src/api/server.py:60`, `src/storage/__init__.py:16`).
3. If RDF exists, it loads cached TTL (+ optional extra RDF) (`src/api/server.py:64`, `src/api/server.py:69`, `src/api/server.py:76`).
4. Else, it parses IFC and converts to RDF, saves cache, then loads into selected backend (`src/api/server.py:82`, `src/api/server.py:87`, `src/api/server.py:94`, `src/api/server.py:98`).
5. Store is registered globally for route execution (`src/api/server.py:113`, `src/api/utils/query_executor.py:25`).

**B. Query flow**
1. HTTP route receives SPARQL request (`src/api/routes/sparql.py:45`).
2. Route delegates to shared executor (`src/api/routes/sparql.py:54`, `src/api/utils/query_executor.py:32`).
3. Executor optionally dual-runs shadow backend under canary policy (`src/api/utils/query_executor.py:40`, `src/api/utils/query_executor.py:44`, `src/api/utils/shadow_executor.py:107`).
4. Primary results are returned to API response model (`src/api/routes/sparql.py:55`, `src/api/routes/sparql.py:56`).

**C. Spatial analysis flow**
1. Startup builds `SpatialHierarchyIndex` from CSV first, else SPARQL store (`src/api/server.py:119`, `src/api/server.py:123`, `src/api/server.py:134`).
2. Validation edges endpoint loads cached CSV verdicts and falls back to index-generated edges when needed (`src/api/routes/spatial.py:581`, `src/api/routes/spatial.py:724`, `src/api/routes/spatial.py:765`, `src/api/routes/spatial.py:804`).
3. Annotation endpoints persist verdicts back to validation CSV and mark pipeline stale (`src/api/routes/spatial.py:1003`, `src/api/routes/spatial.py:1028`, `src/api/routes/spatial.py:1034`, `src/api/routes/spatial.py:1059`, `src/api/routes/spatial.py:1410`).
4. Continuity recompute transforms validated edges to groups, enriches via unified CSV, and produces work packages (`src/api/routes/spatial.py:1415`, `src/api/routes/spatial.py:1452`, `src/api/routes/spatial.py:1500`, `src/api/routes/spatial.py:1503`, `src/api/routes/spatial.py:1530`).
5. Mesh collision endpoint optionally computes mesh-to-mesh distances using trimesh (`src/api/routes/spatial.py:1662`, `src/api/routes/spatial.py:1700`, `src/spatial/mesh_collision.py:24`, `src/spatial/mesh_collision.py:97`).

### 6. Code Metrics

**Repository metrics (snapshot)**
- Tracked files: **477**
- Tracked file types:  
  `md 219`, `py 107`, `json 57`, `rq 40`, `sh 11`, `ttl 8`, `gitkeep 7`, `yml 4`, `astro 4`, `yaml 2`, `txt 2`, `gitignore 2`, `csv 2`, `toml 1`, `svg 1`, `mjs 1`, `lock 1`, `js 1`, `ico 1`, `html 1`, `gz 1`, `gitattributes 1`, `example 1`
- `src` Python files: **93**
- `src` Python LOC: **20,126**
- Test files (`tests/test_*.py`): **18**
- Test Python LOC (`tests/*.py`): **4,534**
- Direct dependency entries (declared): **28**
- Unique direct dependency names: **19**
- REST endpoints: **155 total** (152 route-module + 3 app-level)

Evidence scope for where these metrics apply: project structure and routing assembly in `README.md:413`, `src/api/server.py:263`.

### 7. Dependencies (External, Versions, Roles)

| Dependency | Version in config | Role | Evidence |
|---|---|---|---|
| fastapi | `0.128.1` lock (`>=0.100.0` declared) | Web API framework | `uv.lock:358`, `pyproject.toml:8`, `src/api/server.py:11` |
| uvicorn | `0.40.0` lock (`>=0.23.0` declared) | ASGI serving | `uv.lock:1161`, `pyproject.toml:9`, `Dockerfile:22` |
| pydantic | `2.12.5` lock | Request/response models | `uv.lock:561`, `src/api/models/request.py:3` |
| rdflib | `7.5.0` lock | RDF graph model/query backend | `uv.lock:921`, `src/storage/triple_store.py:13` |
| owlrl | `7.1.4` lock | OWL/RDFS reasoning | `uv.lock:510`, `src/inference/reasoner.py:11` |
| pyoxigraph | `0.5.4` lock | High-perf triplestore backend | `uv.lock:710`, `src/storage/oxigraph_store.py:13` |
| pyshacl | `0.31.0` lock | SHACL validation engine | `uv.lock:770`, `src/inference/shacl_validator.py:217` |
| python-multipart | `0.0.22` lock | Multipart upload support for CSV injection routes | `uv.lock:838`, `src/api/routes/lean_layer.py:12` |
| pyyaml | `6.0.3` lock | YAML loading in tests/golden tooling | `uv.lock:866`, `tests/conftest.py:8` |
| mcp | `1.26.0` lock | MCP server runtime | `uv.lock:485`, `src/mcp/navisworks_server.py:15` |
| ifcopenshell | `>=0.7.0` (constraint) | IFC parsing | `requirements.txt:2`, `src/parser/ifc_parser.py:14` |
| SPARQLWrapper | `>=2.0.0` (constraint) | GraphDB SPARQL adapter | `requirements.txt:6`, `src/storage/graphdb_store.py:10` |
| requests | `>=2.31.0` (constraint) | GraphDB import/export HTTP | `requirements.txt:25`, `src/storage/graphdb_store.py:91` |
| httpx | `0.28.1` lock (`>=0.24.0` constraint) | Python client HTTP calls | `uv.lock:404`, `requirements.txt:20`, `src/clients/python/client.py:10` |
| python-dotenv | `1.2.1` lock (`>=1.0.0` constraint) | Declared utility dependency | `uv.lock:829`, `requirements.txt:23` |
| pytest | `9.0.2` lock | Test runner | `uv.lock:786`, `pyproject.toml:26`, `.github/workflows/ci.yml:28` |
| pytest-asyncio | `1.3.0` lock | Async test support | `uv.lock:802`, `pyproject.toml:27` |
| pytest-cov | `7.0.0` lock | Coverage reporting/gating | `uv.lock:815`, `pyproject.toml:28`, `.github/workflows/ci.yml:31` |
| astro | `5.17.1` lock (`^5.17.1` spec) | Static docs site | `site/package-lock.json:1663`, `site/package.json:12` |

### 8. API Surface

**Module summary**

| Route module | Endpoints | LOC | Purpose | Evidence |
|---|---:|---:|---|---|
| `analytics.py` | 6 | 171 | cost/duration analytics | `src/api/routes/analytics.py:1` |
| `buildings.py` | 4 | 122 | building/storey/element read APIs | `src/api/routes/buildings.py:1` |
| `lean_layer.py` | 9 | 319 | schedule/AWP/status/equipment injection and queries | `src/api/routes/lean_layer.py:1` |
| `llm.py` | 3 | 373 | text-to-SQL schema + execution | `src/api/routes/llm.py:1` |
| `ontology_editor.py` | 13 | 170 | ontology schema CRUD | `src/api/routes/ontology_editor.py:1` |
| `ops.py` | 8 | 115 | ops status (ingestion/shadow/canary/delta/reconcile) | `src/api/routes/ops.py:1` |
| `properties.py` | 5 | 251 | property lookup/injection | `src/api/routes/properties.py:1` |
| `reasoning.py` | 10 | 681 | reasoning + SHACL + node exploration | `src/api/routes/reasoning.py:1` |
| `simulation.py` | 2 | 497 | scenario simulation and schedule commit | `src/api/routes/simulation.py:1` |
| `sparql.py` | 2 | 90 | SPARQL + NL2SPARQL | `src/api/routes/sparql.py:1` |
| `spatial.py` | 26 | 1765 | spatial adjacency/validation/continuity/mesh | `src/api/routes/spatial.py:1` |
| `statistics.py` | 4 | 113 | statistics/hierarchy/metadata | `src/api/routes/statistics.py:1` |
| `store.py` | 23 | 588 | ObjectStore CRUD, schemas, role-mapping | `src/api/routes/store.py:1` |
| `workbench.py` | 18 | 813 | cost-duration assignment/aggregation/scheduling | `src/api/routes/workbench.py:1` |
| `workforce.py` | 19 | 779 | workers/crews/availability/assignments | `src/api/routes/workforce.py:1` |
| app-level (`server.py`) | 3 | n/a | health + root/dashboard | `src/api/server.py:279` |

**Full endpoint inventory (all 155)**

**analytics**
- `GET /api/analytics/cost-by-system` → `cost_by_system` (`src/api/routes/analytics.py:19`)
- `GET /api/analytics/cost-by-category` → `cost_by_category` (`src/api/routes/analytics.py:37`)
- `GET /api/analytics/duration-by-system` → `duration_by_system` (`src/api/routes/analytics.py:48`)
- `GET /api/analytics/duration-by-category` → `duration_by_category` (`src/api/routes/analytics.py:67`)
- `GET /api/analytics/summary` → `analytics_summary` (`src/api/routes/analytics.py:78`)
- `GET /api/analytics/schedule-overview` → `schedule_overview` (`src/api/routes/analytics.py:98`)

**buildings**
- `GET /api/buildings` → `list_buildings` (`src/api/routes/buildings.py:16`)
- `GET /api/buildings/{global_id}` → `get_building` (`src/api/routes/buildings.py:33`)
- `GET /api/storeys` → `list_storeys` (`src/api/routes/buildings.py:55`)
- `GET /api/elements` → `list_elements` (`src/api/routes/buildings.py:87`)

**lean_layer**
- `POST /api/lean/inject/schedule` → `inject_schedule` (`src/api/routes/lean_layer.py:50`)
- `POST /api/lean/inject/awp` → `inject_awp` (`src/api/routes/lean_layer.py:75`)
- `POST /api/lean/inject/status` → `inject_status` (`src/api/routes/lean_layer.py:98`)
- `POST /api/lean/inject/equipment` → `inject_equipment` (`src/api/routes/lean_layer.py:121`)
- `PUT /api/lean/status/{global_id}` → `update_status` (`src/api/routes/lean_layer.py:151`)
- `GET /api/lean/today` → `get_todays_work` (`src/api/routes/lean_layer.py:173`)
- `GET /api/lean/delayed` → `get_delayed_elements` (`src/api/routes/lean_layer.py:226`)
- `GET /api/lean/iwp/{iwp_id}/constraints` → `get_iwp_constraints` (`src/api/routes/lean_layer.py:265`)
- `GET /api/lean/stats` → `get_lean_stats` (`src/api/routes/lean_layer.py:315`)

**llm**
- `GET /api/llm/schema` → `get_schema` (`src/api/routes/llm.py:275`)
- `POST /api/llm/text-to-sql` → `text_to_sql` (`src/api/routes/llm.py:296`)
- `POST /api/llm/execute-sql` → `execute_sql` (`src/api/routes/llm.py:348`)

**ontology_editor**
- `GET /api/ontology/types` → `list_types` (`src/api/routes/ontology_editor.py:66`)
- `POST /api/ontology/types` → `create_type` (`src/api/routes/ontology_editor.py:73`)
- `PUT /api/ontology/types/{name}` → `update_type` (`src/api/routes/ontology_editor.py:80`)
- `DELETE /api/ontology/types/{name}` → `delete_type` (`src/api/routes/ontology_editor.py:91`)
- `GET /api/ontology/properties` → `list_properties` (`src/api/routes/ontology_editor.py:101`)
- `POST /api/ontology/properties` → `create_property` (`src/api/routes/ontology_editor.py:108`)
- `GET /api/ontology/links` → `list_links` (`src/api/routes/ontology_editor.py:117`)
- `POST /api/ontology/links` → `create_link` (`src/api/routes/ontology_editor.py:124`)
- `GET /api/ontology/rules` → `get_rules` (`src/api/routes/ontology_editor.py:133`)
- `PUT /api/ontology/rules` → `update_rules` (`src/api/routes/ontology_editor.py:139`)
- `POST /api/ontology/apply` → `apply_schema` (`src/api/routes/ontology_editor.py:148`)
- `GET /api/ontology/export` → `export_schema` (`src/api/routes/ontology_editor.py:156`)
- `POST /api/ontology/import` → `import_schema` (`src/api/routes/ontology_editor.py:162`)

**ops**
- `GET /api/ops/ingestion-status` → `ingestion_status` (`src/api/routes/ops.py:19`)
- `GET /api/ops/shadow-diff-summary` → `shadow_diff_summary` (`src/api/routes/ops.py:33`)
- `GET /api/ops/canary-status` → `canary_status` (`src/api/routes/ops.py:42`)
- `POST /api/ops/canary-advance` → `canary_advance` (`src/api/routes/ops.py:49`)
- `POST /api/ops/canary-rollback` → `canary_rollback` (`src/api/routes/ops.py:57`)
- `GET /api/ops/validation-status` → `validation_status` (`src/api/routes/ops.py:65`)
- `GET /api/ops/delta-status` → `delta_status` (`src/api/routes/ops.py:82`)
- `GET /api/ops/reconciliation-status` → `reconciliation_status` (`src/api/routes/ops.py:100`)

**properties**
- `GET /api/properties/{global_id}` → `get_element_properties` (`src/api/routes/properties.py:22`)
- `GET /api/properties/plant-data` → `get_plant_data` (`src/api/routes/properties.py:56`)
- `GET /api/properties/search` → `search_properties` (`src/api/routes/properties.py:98`)
- `POST /api/properties/inject` → `inject_csv` (`src/api/routes/properties.py:179`)
- `POST /api/properties/{object_id}` → `add_property` (`src/api/routes/properties.py:232`)

**reasoning**
- `POST /api/reasoning` → `run_reasoning` (`src/api/routes/reasoning.py:32`)
- `POST /api/reasoning/validate` → `run_shacl_validation` (`src/api/routes/reasoning.py:45`)
- `GET /api/reasoning/ttl-files` → `list_ttl_files` (`src/api/routes/reasoning.py:306`)
- `POST /api/reasoning/reload` → `reload_ttl_file` (`src/api/routes/reasoning.py:330`)
- `GET /api/reasoning/validation-report` → `get_validation_report` (`src/api/routes/reasoning.py:363`)
- `GET /api/reasoning/other-elements` → `get_other_elements` (`src/api/routes/reasoning.py:404`)
- `GET /api/reasoning/node-types` → `get_node_types` (`src/api/routes/reasoning.py:504`)
- `GET /api/reasoning/node-predicates` → `get_node_predicates` (`src/api/routes/reasoning.py:530`)
- `GET /api/reasoning/nodes` → `browse_nodes` (`src/api/routes/reasoning.py:556`)
- `GET /api/reasoning/node-detail` → `get_node_detail` (`src/api/routes/reasoning.py:656`)

**simulation**
- `POST /api/simulation/simulate` → `run_simulation` (`src/api/routes/simulation.py:59`)
- `POST /api/simulation/commit-schedule` → `commit_schedule` (`src/api/routes/simulation.py:417`)

**sparql**
- `POST /api/sparql` → `post_sparql` (`src/api/routes/sparql.py:45`)
- `POST /api/sparql/nl-query` → `post_nl_query` (`src/api/routes/sparql.py:64`)

**spatial**
- `GET /api/spatial/summary` → `spatial_summary` (`src/api/routes/spatial.py:32`)
- `GET /api/spatial/adjacency` → `adjacency_list` (`src/api/routes/spatial.py:88`)
- `GET /api/spatial/groups` → `group_list` (`src/api/routes/spatial.py:139`)
- `GET /api/spatial/groups/{group_id}/members` → `group_members` (`src/api/routes/spatial.py:184`)
- `GET /api/spatial/zones` → `zone_list_by_system_path` (`src/api/routes/spatial.py:211`)
- `GET /api/spatial/systems` → `systems_list` (`src/api/routes/spatial.py:240`)
- `GET /api/spatial/zones/hierarchy` → `zone_hierarchy` (`src/api/routes/spatial.py:252`)
- `GET /api/spatial/summary/fast` → `spatial_summary_fast` (`src/api/routes/spatial.py:279`)
- `GET /api/spatial/adjacency/fast` → `adjacency_fast` (`src/api/routes/spatial.py:332`)
- `GET /api/spatial/adjacency/aggregated` → `adjacency_aggregated` (`src/api/routes/spatial.py:408`)
- `GET /api/spatial/meshes` → `mesh_list` (`src/api/routes/spatial.py:457`)
- `GET /api/spatial/neighbors` → `element_neighbors` (`src/api/routes/spatial.py:513`)
- `GET /api/spatial/validation/edges` → `validation_edges` (`src/api/routes/spatial.py:724`)
- `POST /api/spatial/validation/annotate` → `validation_annotate` (`src/api/routes/spatial.py:1003`)
- `POST /api/spatial/validation/batch-annotate` → `validation_batch_annotate` (`src/api/routes/spatial.py:1034`)
- `GET /api/spatial/validation/summary` → `validation_summary` (`src/api/routes/spatial.py:1065`)
- `GET /api/spatial/validation/confusion` → `validation_confusion` (`src/api/routes/spatial.py:1100`)
- `POST /api/spatial/groups/recompute` → `groups_recompute` (`src/api/routes/spatial.py:1231`)
- `GET /api/spatial/groups/validated` → `groups_validated` (`src/api/routes/spatial.py:1362`)
- `POST /api/spatial/continuity/recompute` → `continuity_recompute` (`src/api/routes/spatial.py:1530`)
- `GET /api/spatial/continuity/groups` → `continuity_groups` (`src/api/routes/spatial.py:1536`)
- `GET /api/spatial/continuity/stale` → `continuity_stale` (`src/api/routes/spatial.py:1564`)
- `GET /api/spatial/continuity/tasks` → `continuity_tasks` (`src/api/routes/spatial.py:1570`)
- `GET /api/spatial/continuity/schedule` → `continuity_schedule` (`src/api/routes/spatial.py:1596`)
- `GET /api/spatial/continuity/compare` → `continuity_compare` (`src/api/routes/spatial.py:1649`)
- `POST /api/spatial/mesh-collision/compute` → `mesh_collision_compute` (`src/api/routes/spatial.py:1662`)

**statistics**
- `GET /api/statistics` → `overall_statistics` (`src/api/routes/statistics.py:16`)
- `GET /api/statistics/categories` → `category_statistics` (`src/api/routes/statistics.py:54`)
- `GET /api/hierarchy` → `building_hierarchy` (`src/api/routes/statistics.py:67`)
- `GET /api/statistics/metadata` → `graph_metadata` (`src/api/routes/statistics.py:76`)

**store**
- `GET /api/store/objects` → `list_objects` (`src/api/routes/store.py:75`)
- `GET /api/store/objects/{uri:path}` → `get_object` (`src/api/routes/store.py:93`)
- `PATCH /api/store/objects/{uri:path}` → `update_object` (`src/api/routes/store.py:106`)
- `GET /api/store/edges` → `list_edges` (`src/api/routes/store.py:120`)
- `PATCH /api/store/edges/{edge_id}` → `update_edge` (`src/api/routes/store.py:137`)
- `POST /api/store/edges/verdict` → `set_edge_verdict` (`src/api/routes/store.py:146`)
- `POST /api/store/edges/verdict/batch` → `batch_set_verdicts` (`src/api/routes/store.py:155`)
- `GET /api/store/groups` → `list_groups` (`src/api/routes/store.py:164`)
- `GET /api/store/groups/{group_id}` → `get_group` (`src/api/routes/store.py:171`)
- `GET /api/store/stats` → `get_stats` (`src/api/routes/store.py:182`)
- `GET /api/store/data-sources` → `list_data_sources` (`src/api/routes/store.py:190`)
- `GET /api/store/scenarios` → `list_scenarios` (`src/api/routes/store.py:198`)
- `GET /api/store/system-tree` → `get_system_tree` (`src/api/routes/store.py:206`)
- `GET /api/store/system-tree/flat` → `get_system_tree_flat` (`src/api/routes/store.py:216`)
- `GET /api/store/categories` → `list_categories` (`src/api/routes/store.py:228`)
- `GET /api/store/systems` → `list_systems` (`src/api/routes/store.py:237`)
- `GET /api/store/leaf-stats` → `get_leaf_stats` (`src/api/routes/store.py:248`)
- `GET /api/store/schema` → `get_schema` (`src/api/routes/store.py:304`)
- `GET /api/store/status` → `get_status` (`src/api/routes/store.py:394`)
- `GET /api/store/datasets` → `list_datasets` (`src/api/routes/store.py:485`)
- `GET /api/store/role-mapping/status` → `role_mapping_status` (`src/api/routes/store.py:562`)
- `POST /api/store/role-mapping/apply` → `apply_role_mapping` (`src/api/routes/store.py:572`)
- `PUT /api/store/objects/{uri:path}/role` → `set_object_role` (`src/api/routes/store.py:581`)

**workbench**
- `POST /api/workbench/cost-duration/assign` → `assign_cost_duration` (`src/api/routes/workbench.py:127`)
- `POST /api/workbench/cost-duration/template` → `assign_by_template` (`src/api/routes/workbench.py:152`)
- `POST /api/workbench/cost-duration/csv` → `assign_from_csv` (`src/api/routes/workbench.py:203`)
- `POST /api/workbench/cost-duration/bulk` → `assign_bulk` (`src/api/routes/workbench.py:251`)
- `GET /api/workbench/categories` → `get_categories` (`src/api/routes/workbench.py:333`)
- `GET /api/workbench/levels` → `get_levels` (`src/api/routes/workbench.py:349`)
- `POST /api/workbench/cost-duration/aggregate` → `run_cost_aggregation` (`src/api/routes/workbench.py:364`)
- `GET /api/workbench/cost-duration/tree` → `get_cost_tree` (`src/api/routes/workbench.py:374`)
- `GET /api/workbench/cost-duration/templates` → `get_cost_templates` (`src/api/routes/workbench.py:408`)
- `POST /api/workbench/schedule/generate` → `generate_schedule` (`src/api/routes/workbench.py:417`)
- `GET /api/workbench/schedule/packages` → `get_schedule` (`src/api/routes/workbench.py:494`)
- `GET /api/workbench/zone-categories` → `get_zone_categories` (`src/api/routes/workbench.py:521`)
- `POST /api/workbench/validation/annotate` → `annotate_adjacency` (`src/api/routes/workbench.py:551`)
- `GET /api/workbench/validation/summary` → `get_validation_summary` (`src/api/routes/workbench.py:565`)
- `GET /api/workbench/validation/annotations` → `get_annotations` (`src/api/routes/workbench.py:619`)
- `POST /api/workbench/validation/import` → `import_annotations` (`src/api/routes/workbench.py:625`)
- `POST /api/workbench/validation/clash-import` → `import_clash_csv` (`src/api/routes/workbench.py:640`)
- `GET /api/workbench/validation/cost-adjacency` → `cost_adjacency_cross` (`src/api/routes/workbench.py:730`)

**workforce**
- `GET /api/workforce/workers` → `list_workers` (`src/api/routes/workforce.py:120`)
- `POST /api/workforce/workers` → `create_worker` (`src/api/routes/workforce.py:161`)
- `GET /api/workforce/workers/{worker_id}` → `get_worker` (`src/api/routes/workforce.py:192`)
- `PATCH /api/workforce/workers/{worker_id}` → `update_worker` (`src/api/routes/workforce.py:215`)
- `DELETE /api/workforce/workers/{worker_id}` → `delete_worker` (`src/api/routes/workforce.py:248`)
- `GET /api/workforce/crews` → `list_crews` (`src/api/routes/workforce.py:267`)
- `GET /api/workforce/crews/summary` → `crews_summary` (`src/api/routes/workforce.py:295`)
- `POST /api/workforce/crews` → `create_crew` (`src/api/routes/workforce.py:321`)
- `POST /api/workforce/crews/{crew_id}/members` → `add_crew_member` (`src/api/routes/workforce.py:333`)
- `DELETE /api/workforce/crews/{crew_id}/members/{worker_id}` → `remove_crew_member` (`src/api/routes/workforce.py:357`)
- `GET /api/workforce/availability` → `get_availability` (`src/api/routes/workforce.py:373`)
- `POST /api/workforce/availability` → `set_availability` (`src/api/routes/workforce.py:404`)
- `POST /api/workforce/auto-assign` → `auto_assign` (`src/api/routes/workforce.py:424`)
- `GET /api/workforce/assignments` → `list_assignments` (`src/api/routes/workforce.py:553`)
- `PATCH /api/workforce/assignments/{assignment_id}` → `update_assignment` (`src/api/routes/workforce.py:589`)
- `GET /api/workforce/utilization` → `worker_utilization` (`src/api/routes/workforce.py:616`)
- `GET /api/workforce/cost-summary` → `cost_summary` (`src/api/routes/workforce.py:665`)
- `GET /api/workforce/dashboard-stats` → `dashboard_stats` (`src/api/routes/workforce.py:718`)
- `GET /api/workforce/llm-context` → `llm_context` (`src/api/routes/workforce.py:749`)

**app-level (`server.py`)**
- `GET /health` → `health` (`src/api/server.py:279`)
- `GET /` → `dashboard` (when dashboard exists) (`src/api/server.py:299`)
- `GET /` → `root` (fallback) (`src/api/server.py:303`)

### 9. Configuration

| Env var | Default | Purpose | Evidence |
|---|---|---|---|
| `BIM_IFC_PATH` | `references/nwd4op-12.ifc` | IFC fallback input path | `src/api/server.py:41` |
| `BIM_RDF_PATH` | `data/rdf/navis-via-csv-v3.ttl` | primary RDF cache/load path | `src/api/server.py:42` |
| `BIM_EXTRA_RDF` | `data/rdf/dxtnavis-spatial-v2.ttl` | additional RDF load list | `src/api/server.py:44` |
| `BIM_MESH_DIR` | `references/test-5/mesh` | mesh static serving + collision input | `src/api/server.py:46`, `src/spatial/mesh_collision.py:54` |
| `BIM_GEOMETRY_CSV` | `references/test-5/geometry.csv` | geometry/mesh metadata source | `src/api/server.py:48`, `src/api/routes/spatial.py:544` |
| `BIM_UNIFIED_CSV` | `references/test-5/unified.csv` | hierarchy/object CSV source | `src/api/server.py:50` |
| `BIM_ADJACENCY_CSV` | `references/test-5/adjacency.csv` | adjacency CSV source | `src/api/server.py:51` |
| `BIM_VALIDATION_CSV` | `references/adjacency-test/b01_validation.csv` | manual verdict persistence | `src/api/server.py:53`, `src/api/routes/spatial.py:572` |
| `BIM_DB_PATH` | `data/bim_store.db` | SQLite ObjectStore/workforce DB | `src/api/server.py:55`, `src/api/routes/llm.py:21`, `src/api/routes/workforce.py:18` |
| `TRIPLESTORE_BACKEND` | code default `oxigraph` | selects `oxigraph`/`graphdb`/fallback rdflib | `src/storage/__init__.py:16` |
| `GRAPHDB_URL` | `http://localhost:7200` | external GraphDB base URL | `src/storage/graphdb_store.py:16`, `src/storage/graphdb_store.py:28` |
| `GRAPHDB_REPO` | `bim-ontology` | GraphDB repository name | `src/storage/graphdb_store.py:17`, `src/storage/graphdb_store.py:29` |
| `CANARY_STAGE` | `shadow` | global canary stage | `src/api/utils/canary_config.py:64` |
| `CANARY_PRIMARY` | `rdflib` | primary backend alias for canary | `src/api/utils/canary_config.py:71` |
| `CANARY_TARGET` | `oxigraph` | target backend alias for canary | `src/api/utils/canary_config.py:72` |
| `NL2SPARQL_PROVIDER` | `anthropic` | selects NL2SPARQL LLM provider | `src/api/routes/sparql.py:29` |
| `OPENAI_API_KEY` | none | OpenAI provider auth | `src/ai/llm/openai_provider.py:14` |
| `ANTHROPIC_API_KEY` | none | Anthropic provider auth | `src/ai/llm/anthropic_provider.py:13` |
| `BIM_TTL_PATH` | `data/rdf/navis-via-csv.ttl` | MCP default TTL autoload | `src/mcp/navisworks_server.py:40` |
| `BIM_PORT` | `8000` (compose/.env) | host port mapping | `docker-compose.yml:5`, `.env.example:4` |
| `LOG_LEVEL` | `info` | API container log level | `docker-compose.yml:10`, `.env.example:5` |
| `GRAPHDB_PORT` | `7200` | GraphDB host port mapping | `docker-compose.yml:23` |

### 10. Build & Deployment

**Local dev**
- `uv sync` and `uv run uvicorn ...` documented in README (`README.md:133`, `README.md:136`).
- Deploy guide also documents direct uvicorn run (`docs/guides/DEPLOY.md:8`).

**Docker**
- Docker image builds on `python:3.12-slim`, installs `requirements.txt`, runs uvicorn (`Dockerfile:1`, `Dockerfile:12`, `Dockerfile:22`).
- Compose runs `api` plus optional `graphdb` profile (`docker-compose.yml:2`, `docker-compose.yml:20`, `docker-compose.yml:28`).
- Volume strategy mounts references read-only and data read-write (`docker-compose.yml:7`, `docker-compose.yml:8`).

**CI**
- GitHub Actions CI on push/PR to `main` (`.github/workflows/ci.yml:4`, `.github/workflows/ci.yml:6`).
- Installs requirements and runs tests with coverage (`.github/workflows/ci.yml:25`, `.github/workflows/ci.yml:28`).
- Enforces coverage threshold (`.github/workflows/ci.yml:31`).

**CD**
- Site deploy workflow builds Astro and deploys to GitHub Pages (`.github/workflows/deploy-site.yml:36`, `.github/workflows/deploy-site.yml:53`).
- Uses Node 20 and `npm ci` in `site/` (`.github/workflows/deploy-site.yml:28`, `.github/workflows/deploy-site.yml:34`).
- Astro site/base configured for GitHub Pages path (`site/astro.config.mjs:5`, `site/astro.config.mjs:6`).

**Scheduled automation**
- Weekly workflow updates README projects list (`.github/workflows/update-projects.yml:4`, `.github/workflows/update-projects.yml:138`).

### 11. Design Decisions

#### Decision 1
- **CONTEXT**: The system supports local and external triplestore backends.
- **DECISION**: Define `BaseTripleStore` interface and choose implementation through `create_store`.
- **RATIONALE**: API/query code targets a stable interface (`query/insert/load/save`) while backend selection remains configurable.
- **ALTERNATIVES**: Implementations present in code are `OxigraphStore`, `GraphDBStore`, and fallback `TripleStore`.
- **EVIDENCE**: `src/storage/base_store.py:10`, `src/storage/__init__.py:16`, `src/storage/__init__.py:19`, `src/storage/__init__.py:23`, `src/storage/__init__.py:26`.

#### Decision 2
- **CONTEXT**: Startup must ingest data either from cached RDF or IFC source.
- **DECISION**: Prefer existing RDF cache load; fallback to IFC parse/convert/save when cache is missing.
- **RATIONALE**: Cache path is explicitly marked as the fast path; IFC conversion path exists as fallback.
- **ALTERNATIVES**: Fallback branch converts IFC via `IFCParser` and `RDFConverter`, then reloads cached TTL.
- **EVIDENCE**: `src/api/server.py:62`, `src/api/server.py:64`, `src/api/server.py:80`, `src/api/server.py:84`, `src/api/server.py:87`, `src/api/server.py:94`, `src/api/server.py:98`.

#### Decision 3
- **CONTEXT**: Spatial validation and continuity planning require both machine-generated edges and manual verdicts.
- **DECISION**: Persist manual verdicts in CSV and recompute groups/continuity pipeline from in-memory index + verdict map.
- **RATIONALE**: API supports loading cached validation CSV, generating index-backed fallback edges, writing annotations, then re-running union-find/enrichment/bin-packing.
- **ALTERNATIVES**: Pure CSV mode and pure index-generated mode are both implemented.
- **EVIDENCE**: `src/api/routes/spatial.py:581`, `src/api/routes/spatial.py:765`, `src/api/routes/spatial.py:1003`, `src/api/routes/spatial.py:1028`, `src/api/routes/spatial.py:1415`, `src/api/routes/spatial.py:1452`, `src/api/routes/spatial.py:1503`.

### 12. Key Findings

**Strengths**
- Pluggable triplestore architecture with clear abstraction boundary (`src/storage/base_store.py:10`, `src/storage/__init__.py:7`).
- Broad, modular API surface split by domain route modules (`src/api/server.py:263`, `src/api/server.py:277`, `src/api/routes/spatial.py:20`, `src/api/routes/workforce.py:16`).
- Strong spatial stack with CSV bootstrap fallback and in-memory indexing (`src/api/server.py:119`, `src/spatial/hierarchy_index.py:81`, `src/spatial/hierarchy_index.py:203`).
- Persistent operational data model (objects, edges, groups, workforce) in SQLite (`src/storage/object_store.py:63`, `src/storage/object_store.py:83`, `src/storage/object_store.py:137`, `src/storage/object_store.py:178`).
- CI/CD is codified (test, coverage threshold, site deploy) (`.github/workflows/ci.yml:28`, `.github/workflows/ci.yml:31`, `.github/workflows/deploy-site.yml:36`, `.github/workflows/deploy-site.yml:53`).

**Trade-offs**
- Backend default mismatch across configs:
  - Code default `oxigraph` (`src/storage/__init__.py:16`)
  - Compose default `local` (`docker-compose.yml:11`)
  - Example env default `rdflib` (`.env.example:8`)
- Dependency definitions are split across `pyproject.toml` and `requirements.txt`, and some runtime imports are optional/manual:
  - Core deps in `pyproject.toml` (`pyproject.toml:6`)
  - Extra deps in requirements (`requirements.txt:2`, `requirements.txt:6`, `requirements.txt:25`)
  - Optional provider imports inside code (`src/ai/llm/openai_provider.py:18`, `src/ai/llm/anthropic_provider.py:17`, `src/spatial/mesh_collision.py:27`)
- Large concentrated modules increase maintenance surface:
  - `src/api/routes/spatial.py` is 1,765 LOC (route concentration)
  - `src/dashboard/app.js` is 13,129 LOC (single-file frontend core) (`src/dashboard/app.js:1`).
---

# Narrative

## bim-ontology — Project Narrative

### Project Origin & Purpose

**bim-ontology** is an ambitious semantic BIM (Building Information Modeling) pipeline that transforms raw construction data into queryable, reasoning-capable knowledge graphs. Born from frustration with data loss and integration brittleness in traditional BIM export workflows, the project converts Industry Foundation Classes (IFC) files and Navisworks CSV exports into RDF ontologies that can answer complex questions about building structure, properties, and relationships through SPARQL queries.

The core problem the project solves is profound: IFC exporters and Navisworks data pipelines leak critical information—hierarchical relationships collapse, property contexts disappear, identification becomes unstable. Engineers need to know not just "what elements exist," but "what rooms are adjacent to this space?" and "which components share a system?" The bim-ontology solution uses semantic web standards (OWL, RDFS, SHACL, SPARQL) to restore this lost context and add reasoning capability that wasn't possible with raw IFC data.

The vision extends beyond a technical tool: it's establishing **construction intelligence as a solved problem domain**. By layering semantic reasoning, automated validation (SHACL), and natural language query capabilities (NL2SPARQL) on top of standardized RDF representations, the project positions BIM ontologies as the foundation for autonomous construction analytics.

### Evolution Timeline

The project's evolution spans **61 commits across ~3 weeks** (February 3-18, 2026), concentrated in a structured MVP execution phase:

#### Phase 1: Foundation Week (Feb 3-4)
- **Commit 9d57fbe** (Feb 3): "implement IFC to RDF ontology conversion pipeline" — the first commit, establishing the core ETL backbone
- Commits 18120f1, 9f297fb (Feb 9): Introduction of MVPStructure and 12-week development planning with comprehensive Codex-generated specification
- **Key milestone**: 40 "Golden Queries" defined as the quality baseline — 40 SPARQL test queries across 5 semantic categories (Statistics, Hierarchy, Properties, Spatial, Cross-domain), each validated against both rdflib and Oxigraph backends. This represents a shift from "it works on my machine" to machine-verified semantic contracts.

#### Phase 2: Intelligence Acceleration (Feb 9-10)
- **Commit bd54d70** (Feb 9): "implement Golden Query 40 test harness" — automated test infrastructure for baseline validation
- **Commit c2898fb** (Feb 9): "implement Shadow/Canary execution mode" — introduces safe backend cutover patterns, allowing Oxigraph to shadow rdflib queries before production traffic
- **Commit e4664ff** (Feb 9): "implement SHACL v1 core rules with 15 shapes" — data quality validation through semantic schemas
- **Commit 9a2dec0** (Feb 9): "switch default backend to Oxigraph + ops API" — committed to modern Rust-based triple store (34-64x faster than rdflib)
- **Commit 47c2d8b** (Feb 10): "implement NL2SPARQL pipeline with LLM providers and dashboard UI" — enables business users to ask questions in English/Korean, auto-translated to SPARQL
- **Commit ea68b52** (Feb 10): "implement MCP v0 server with resources, tools, and prompts" — AI agent integration layer (Model Context Protocol)

#### Phase 3: Production Hardening (Feb 10)
- **Commit 234efba** (Feb 10): "implement Delta Update engine with manifest, diff, patch, reconciler" — replaces full data reloads with surgical incremental updates
- **Commit 4084bc1** (Feb 10): "add Delta ops API endpoints and benchmark harness" — operationalizes delta updates at API level

#### Phase 4: Dashboard & Integration (Feb 4-6)
- **Commit e175f85** (Feb 5): "add dxtnavis CSV to RDF converter (MVP)" — bridges Navisworks export tooling into the RDF pipeline
- **Commit ace5f1f** (Feb 5): "add Hierarchy visualization tab to dashboard" — Miller Columns UI for hierarchical exploration
- **Commit 2a409d5** (Feb 6): "add Navisworks Miller Columns drill-down, property aggregation, and dashboard guide"
- **Commit 6e1fb1e** (Feb 6): "add UnifiedExport CSV v2 converter with geometry support"

#### Phase 5: Spatial & Validation (Feb 15-18, current)
- **Commit 2f945cd** (Feb 18): "feat(spatial): add CSV-based hierarchy index and spatial API"
- **Commit adf143a** (Feb 18): "feat(dashboard): implement Validation UX Phase A+B"
- **Commit 49e5f40** (Feb 18): "feat(validation): batch annotate API + stable layout updates"
- **Latest commits** (Feb 18): Focus on spatial validation edge cases, stale response guards

### Key Milestones

#### Milestone 1: Golden Query Baseline (Week 1, Feb 3)
**What**: Defined 40 SPARQL queries covering all semantic domains, with expected results captured as JSON snapshots.
**Why**: Establishes machine-verifiable contracts. Any backend can claim "SPARQL compliant," but not every backend returns identical results across complex queries involving hierarchy traversal, numeric aggregation, and multi-predicate joins.
**Impact**: Enables safe backend switching (Shadow/Canary) and prevents silent data corruption during refactoring.

#### Milestone 2: Oxigraph Cutover (Week 4, Feb 9)
**What**: Successfully switched default triple store from rdflib (Python, slower) to Oxigraph (Rust, 34-64x faster).
**Why**: rdflib became a bottleneck; Oxigraph + Spargebat SPARQL optimizer could handle 2.8M triple dataset with p95 latency < 517ms.
**Technical Achievement**: Implemented Shadow/Canary pattern to run both backends in parallel, compare results, and gradually shift traffic. Zero production outages during transition.
**Impact**: From a 5-minute page load to near-instant query response. Unlocked real-time dashboard interactions.

#### Milestone 3: Natural Language Interface (Week 6, Feb 10)
**What**: Integrated NL2SPARQL pipeline enabling English/Korean natural language queries.
**How**: Schema retriever extracts entity/predicate mappings → LLM generates SPARQL → Static validator catches injection attacks → Query executes → Evidence chain recorded.
**Significance**: Breaks the "SPARQL is only for experts" ceiling. Domain experts (project managers, safety engineers) can now ask questions in English/Korean without learning SPARQL syntax.
**Implementation**: 7 Python modules, 39 unit tests, multi-provider support (Anthropic, OpenAI).

#### Milestone 4: AI Integration via MCP (Week 8, Feb 10)
**What**: Model Context Protocol v0 server exposing BIM data as structured resources and tools.
**Resources**: Dataset summary, ontology prefixes, element details, latest validation results.
**Tools**: search_elements, get_properties, run_select_sparql, get_validation_issues.
**Prompts**: Pre-written system prompts for Korean/English NL2SPARQL, root cause analysis.
**Impact**: Claude, Gemini, and other AI agents can now autonomously query and reason about BIM data without human-written SQL/SPARQL.

#### Milestone 5: Incremental Updates (Week 10-12, Feb 10)
**What**: Delta Update engine that replaces full TTL reloads with smart diffs.
**Problem Solved**: Inserting 5 new properties into a 2.8M-triple store previously required reloading the entire dataset (5 minutes). Delta approach: compute diff, generate patches, reconcile in seconds.
**Architecture**: Manifest (metadata hash) → Diff Engine (old vs new) → Patch Builder (SPARQL INSERT/DELETE) → Reconciler (consistency check).

#### Milestone 6: Spatial Validation Framework (Week 15-18, Feb 18, in progress)
**What**: Integration of 3D spatial geometry with BIM topology.
**Components**:
  - BBox collision detection (axis-aligned bounding box overlap)
  - Adjacency index (which elements touch/overlap/near each other)
  - Connected components (transitive grouping of adjacent zones)
  - Mesh collision (real mesh vs simplified BBox comparison)
**Dashboard**: Spatial Validation tab with Y/N/Skip verdicts on edges, color-coded 3D visualization, batch annotation API.
**Real-world Use**: Identify constraint violations (pipes inside walls), optimize MEP routing, validate contractor-reported "clashes."

### Technical Challenges Solved

#### Challenge 1: Data Loss Through Export Pipelines
**Problem**: IFC export loses parent-child relationships, property contexts, and type information. Navisworks export preserves some structure but uses unstable object IDs.
**Solution**:
  - Built dual-path import (IFC + CSV) with fallback strategy
  - Navisworks CSV → RDF converter extracts ObjectId, ParentId, Level, Properties
  - Name-based category inference (29 patterns) recovers type information
  - PropertyValue reification (414K values in v3) restores property context
**Evidence**: `src/converter/` modules, 12,009 objects × 9 hierarchy levels preserved

#### Challenge 2: Query Consistency Across Multiple Backends
**Problem**: rdflib and Oxigraph produce different results on complex queries (blank nodes, ORDER BY, aggregate functions vary).
**Solution**:
  - Golden Query framework: 40 canonical SPARQL queries with Oxigraph as ground truth
  - Unit tests verify both backends match on every query
  - `tests/test_golden_queries.py`: 40/40 tests, 12.7s runtime
  - Identified rdflib limitations (non-deterministic LIMIT, weak SPARQL optimization) documented

#### Challenge 3: Real-time Interactivity on Large Datasets
**Problem**: 2.8M triple dataset + rdflib SPARQL → 65ms cold query + result materialization. Dashboard needed sub-100ms interaction.
**Solution**:
  - Oxigraph backend (Rust SPARQL engine) reduced base latency to 4-20ms
  - LRU cache with TTL for hot queries (14,869x speedup for cached paths)
  - Shadow/Canary pattern enabled migration without downtime
  - Results: p99 < 517ms on complex hierarchy queries

#### Challenge 4: Stable Object Identification Across Tools
**Problem**: Navisworks InstanceGuid ≠ IFC GlobalId ≠ custom ID assignments. Downstream systems (scheduling, cost allocation) break on ID instability.
**Solution** (from DXTnavis integration):
  - Synthetic ID fallback chain: InstanceGuid → Item GUID → Authoring ID → Path Hash
  - Deterministic (same input = same ID) but resilient to tool updates
  - CSV exchange format locks ObjectId contract
  - Enables stable parent-child mapping for scheduling integration

#### Challenge 5: Semantic Data Quality at Scale
**Problem**: No standardized way to detect malformed BIM data. "Does this building violate zoning rules?" requires manual inspection across thousands of elements.
**Solution**:
  - SHACL (Shapes Constraint Language) validators: 15 shapes across 6 domains
    - Identity: ObjectId uniqueness, required fields
    - Geometry: BoundingBox completeness, coordinate ranges
    - Numeric: Count consistency, positive values
    - Classification: Category membership, type constraints
    - Relationship: Parent-child integrity, hierarchy depth
    - Completeness: Required properties, data coverage
  - Dashboard Validation tab executes SHACL, reports violations by shape
  - Integration with NL2SPARQL root cause engine ("Why did element X fail validation?")

#### Challenge 6: Making Semantic Queries Accessible
**Problem**: SPARQL syntax barrier. Project managers can't ask "What's the total weight of all pipes in Zone A?" without learning SPARQL.
**Solution**:
  - NL2SPARQL: English/Korean → SPARQL translation via Claude/GPT
  - Schema Retriever extracts entity/predicate mappings from ontology
  - Static Validator catches injection attacks (forbidding UNION, DROP, DELETE in user queries)
  - Evidence chain records which ontology facts informed the translation
  - Dashboard SPARQL tab with NL input box, template library, query history

### Impact & Value Proposition

#### Who Benefits
1. **BIM Managers & Coordinators**: "Show me all coordination issues between MEP trades" — solved via adjacency queries + spatial validation
2. **Safety Engineers**: "Which elements violate fall protection requirements?" — solved via SHACL + custom reasoning rules
3. **Cost/Schedule Planners**: "What's the critical path for this system?" — solved via delta injection of schedule data + path traversal
4. **AI/Automation Teams**: MCP server enables autonomous agents to query BIM without human-written queries
5. **Research Community**: 2.8M triples + SPARQL endpoint for BIM research (papers on ontology fusion, code compliance automation)

#### Unique Value Propositions
1. **Complete Data Fidelity**: Preserves parent-child relationships, properties, and type information that IFC export loses
2. **Reasoning + Validation**: OWL/RDFS rules + SHACL shapes enable automated inconsistency detection
3. **Fast, Modern Tech**: Oxigraph (Rust) vs rdflib (Python) is a 30-60x performance leap
4. **Multi-Channel Access**: SPARQL API, NL2SPARQL, MCP, Dashboard, Python client all use the same semantic knowledge base
5. **Safe Operations**: Shadow/Canary cutover patterns, Delta updates, and golden queries enable confident production usage

#### Quantified Impact
- **Data Scale**: 2.8M triples from 12,009 objects × 9 hierarchy levels (Navisworks AllHierarchy CSV, 76 MB input)
- **Query Performance**: p95 < 517ms on complex queries (vs 5min+ with naive IFC processing)
- **Test Coverage**: 176 tests across 17 files, 15s runtime. Golden Query baseline: 40 queries, 100% consistency
- **Developer Velocity**: 61 commits in 3 weeks (MVP), structured phases with clear gates (Gate A/B/C/D passed)
- **Reasoning Capacity**: 15 SHACL shapes, OWL/RDFS reasoner, 39 NL2SPARQL unit tests

### Current Status & Roadmap

#### Project Maturity
- **Active Development**: MVP 12-week plan (Feb 9 — May 3), currently Week 16
- **Phase Completion**: Phases 1-4 complete (100% each), Phase 5 in progress (55%)
- **Stability**: All gates passed (Gate A: Oxigraph cutover, Gate B: NL2SPARQL/MCP, Gate C: Delta engine, Gate D: Validation UX)
- **Code Health**: 11,082 lines of Python, 176 tests, ~35% coverage (intentionally conservative CI threshold)

#### Current Phase (Phase 5: Spatial & Validation)
- Spatial adjacency indexing from CSV hierarchy
- Validation UX (Edges, Groups, Mesh collision sub-tabs)
- Batch annotation API for edge verdicts
- Connected component auto-computation
- 3D spatial visualization (Blue/Orange for source/target, Red/Green/Cyan for Overlap/Touch/Near)

#### Immediate Roadmap (Weeks 17-22)
- Phase 5 completion: Mesh collision refinement, validation report export
- Production hardening: Error handling, graceful degradation, logging
- Documentation: API guide, MCP integration examples, SHACL rule authoring
- Performance tuning: Benchmark suite, profile critical paths

#### Future Horizons (Post-MVP)
- **Phase 6+**: Multi-project federation (query across building portfolio)
- **Data Integration**: Schedule injection (4D), cost injection (5D), AWP (Activity Work Package) synchronization
- **AI Extensions**: Autonomous reasoning agents for compliance checking, auto-generated design alternatives
- **Ecosystem**: Public SPARQL endpoint, linked data federation with industry standards (ifcOWL, BuildingSMART)
- **Research**: Papers on BIM ontology fusion, semantic code compliance automation

### Project Identity & Personality

**bim-ontology** is a **research-meets-production project**. It carries the DNA of academic semantic web work (OWL, SHACL, SPARQL) but is relentlessly focused on real construction data and practitioner workflows.

The project's personality emerges in several ways:

1. **Meticulous Documentation**: Every feature is documented with evidence (file paths, line numbers). The PROJECTS.json includes "whatWasDone" + "evidence" pairs, bridging spec and implementation.
2. **Experimental Rigor**: Golden Queries, Shadow/Canary patterns, and Delta engines are deployed only after proving equivalence/safety with prior state.
3. **Multi-Persona Design**: SPARQL editor for data engineers, NL2SPARQL for domain experts, MCP for AI agents, Miller Columns for visual explorers.
4. **Iterative Refinement**: The MVP structure (3 phases, 12 weeks, 4 gates) shows willingness to **pivot on evidence**, not speculation.
5. **Ownership Across Domains**: A single developer across IFC parsing, RDF conversion, SPARQL optimization, API design, UI/UX, and research.

### Community & Collaboration

#### Contributor Profile
- **Primary Author**: tygwan (57/61 commits) — owner-builder model
- **Automation**: GitHub Actions (2 commits) for documentation syncing
- **Organizational**: Part of broader ecosystem (bim-ontology + dxtnavis companion projects)

#### Knowledge Artifacts
- **CONTRIBUTING.md**: Python 3.12+ with type hints, Korean docstrings, Conventional Commits, 176 tests required
- **PROJECTS.json**: Meta-documentation format (schema-driven, evidence-backed) for portfolio generation
- **Docs Structure**: `/docs/mvp/`, `/docs/phases/`, `/docs/technical/`, `/docs/guides/`, `/docs/research/`

### Story Summary

**bim-ontology** is a 3-week MVP that solves a 20-year BIM data problem: how to recover lost information from proprietary export formats and enable semantic reasoning over building data. By layering RDF ontologies, SPARQL queries, SHACL validation, and natural language interfaces on top of Navisworks CSV and IFC files, the project transforms raw hierarchical data into a queryable, reasoning-capable knowledge base. The technical execution is meticulous—Golden Query baselines ensure correctness, Shadow/Canary patterns enable safe cutover, and Delta updates replace slow full reloads with surgical patches. The breadth is impressive: a 13-tab dashboard, 40+ API endpoints, MCP server integration, and NL2SPARQL natural language support all feed from a single RDF backend, creating a unified construction intelligence platform that bridges research (semantic web standards) and production (real Navisworks projects). The project's identity is one of experimental rigor paired with relentless practicality—every feature is measured, every decision is evidence-driven, and every workflow (data engineer, domain expert, AI agent, visual explorer) is supported.

---

# Stack Profile

## bim-ontology — Stack Profile

### 1. Primary Languages
Scope used for language metrics: `src/`, `tests/`, `scripts/`, `examples/`, `site/src/`, `.github/workflows/`, plus root manifests (`pyproject.toml`, `requirements.txt`, `docker-compose.yml`, `Dockerfile`, `site/package.json`).

| Language | Files | File % | LOC | LOC % | Evidence |
|---|---:|---:|---:|---:|---|
| Python | 133 | 58.08% | 27,755 | 55.58% | `src/api/server.py:11`, `tests/test_api.py:10` |
| JavaScript | 1 | 0.44% | 13,129 | 26.29% | `src/dashboard/app.js:1` |
| HTML | 1 | 0.44% | 4,382 | 8.78% | `src/dashboard/index.html:1` |
| JSON | 43 | 18.78% | 1,644 | 3.29% | `site/package-lock.json:1` |
| Astro | 4 | 1.75% | 1,641 | 3.29% | `site/src/pages/index.astro:1` |
| SPARQL | 40 | 17.47% | 680 | 1.36% | `tests/golden/queries/statistics/ST-01.rq:1` |
| YAML | 5 | 2.18% | 655 | 1.31% | `.github/workflows/ci.yml:1`, `tests/golden/manifest.yaml:1` |
| TOML | 1 | 0.44% | 29 | 0.06% | `pyproject.toml:1` |
| Dockerfile | 1 | 0.44% | 22 | 0.04% | `Dockerfile:1` |

Total counted: 229 files, 49,937 LOC.

### 2. Frameworks & Libraries (All Declared Dependencies)

| Dependency | Version Declaration(s) | Purpose in Project | Evidence | Confidence |
|---|---|---|---|---|
| `rdflib` | `>=7.0.0` | RDF graph model + SPARQL execution | `pyproject.toml:7`, `requirements.txt:5`, `src/storage/triple_store.py:13`, `uv.lock:921` | High |
| `fastapi` | `>=0.100.0` | REST API framework and router system | `pyproject.toml:8`, `requirements.txt:13`, `src/api/server.py:11`, `src/api/server.py:263` | High |
| `uvicorn` | `>=0.23.0` / `>=0.20.0` | ASGI server for API app | `pyproject.toml:9`, `requirements.txt:14`, `Dockerfile:22` | High |
| `pydantic` | `>=2.0.0` | Request/response data models | `pyproject.toml:10`, `requirements.txt:24`, `src/api/models/response.py:4` | High |
| `owlrl` | `>=7.1.4` / `>=6.0.0` | OWL/RDFS reasoning expansion | `pyproject.toml:11`, `requirements.txt:7`, `src/inference/reasoner.py:11`, `src/inference/reasoner.py:198` | High |
| `python-multipart` | `>=0.0.22` / `>=0.0.6` | Multipart form upload support for file endpoints | `pyproject.toml:12`, `requirements.txt:15`, `src/api/routes/lean_layer.py:12`, `src/api/routes/lean_layer.py:51` | Medium |
| `pyoxigraph` | `>=0.4.0` | Oxigraph triple-store backend | `pyproject.toml:13`, `src/storage/oxigraph_store.py:13`, `src/storage/__init__.py:18`, `uv.lock:710` | High |
| `pyshacl` | `>=0.26.0` | SHACL validation engine | `pyproject.toml:14`, `requirements.txt:10`, `src/inference/shacl_validator.py:217`, `src/inference/shacl_validator.py:239` | High |
| `pyyaml` | `>=6.0.3` | YAML parsing for golden-test manifest fixtures | `pyproject.toml:15`, `tests/conftest.py:8`, `tests/conftest.py:62` | Medium |
| `mcp` | `>=1.26.0` | MCP server integration (`FastMCP`) | `pyproject.toml:16`, `src/mcp/navisworks_server.py:15`, `src/mcp/navisworks_server.py:19`, `uv.lock:485` | High |
| `pytest` | `>=9.0.2` / `>=7.0.0` | Test runner | `pyproject.toml:26`, `requirements.txt:18`, `tests/test_integration.py:9`, `uv.lock:786` | High |
| `pytest-asyncio` | `>=1.3.0` | Async test support (`@pytest.mark.asyncio`) | `pyproject.toml:27`, `tests/test_nl2sparql.py:260`, `uv.lock:802` | High |
| `pytest-cov` | `>=7.0.0` / `>=4.0.0` | Coverage reporting/gating | `pyproject.toml:28`, `requirements.txt:19`, `.github/workflows/ci.yml:28`, `.github/workflows/ci.yml:31` | High |
| `ifcopenshell` | `>=0.7.0` | IFC file parsing | `requirements.txt:2`, `src/parser/ifc_parser.py:14`, `src/parser/ifc_parser.py:79` | High (usage), Medium (version pinning) |
| `SPARQLWrapper` | `>=2.0.0` | GraphDB SPARQL HTTP adapter | `requirements.txt:6`, `src/storage/graphdb_store.py:10`, `src/storage/graphdb_store.py:33` | High (usage), Medium (version pinning) |
| `httpx` | `>=0.24.0` | Python API client HTTP calls | `requirements.txt:20`, `src/clients/python/client.py:10`, `src/clients/python/client.py:168` | High |
| `python-dotenv` | `>=1.0.0` | Declared utility dependency; no direct in-repo import found | `requirements.txt:23` | Low |
| `requests` | `>=2.31.0` | GraphDB import/export HTTP calls | `requirements.txt:25`, `src/storage/graphdb_store.py:91`, `src/storage/graphdb_store.py:118` | Medium |
| `astro` | `^5.17.1` | Static site framework for `site/` | `site/package.json:12`, `site/package-lock.json:1664`, `site/src/pages/index.astro:1` | High |

### 3. Package Manager
- Primary: `uv` for Python dependency locking/sync.
Evidence: `uv.lock:1`, `README.md:133`, `README.md:136`.
Confidence: High.
- Secondary: `pip` in CI/container build.
Evidence: `.github/workflows/ci.yml:25`, `Dockerfile:12`.
Confidence: High.
- Secondary (site): `npm` for Astro site.
Evidence: `site/package-lock.json:4`, `.github/workflows/deploy-site.yml:34`.
Confidence: High.

### 4. Database & Storage
| Storage Mechanism | Details | Evidence | Confidence |
|---|---|---|---|
| SQLite (`ObjectStore`) | Main persistent store, WAL enabled, FK on, multi-table schema | `src/storage/object_store.py:50`, `src/storage/object_store.py:56`, `src/storage/object_store.py:63` | High |
| SQLite schema | Tables: `objects`, `edges`, `groups_`, `group_members`, `data_sources`, `scenarios`, `workers`, `crews`, `crew_members`, `worker_availability`, `assignments`, `timesheets` | `src/storage/object_store.py:63`, `src/storage/object_store.py:83`, `src/storage/object_store.py:97`, `src/storage/object_store.py:112`, `src/storage/object_store.py:122`, `src/storage/object_store.py:138`, `src/storage/object_store.py:154`, `src/storage/object_store.py:162`, `src/storage/object_store.py:169`, `src/storage/object_store.py:178`, `src/storage/object_store.py:192` | High |
| SQLite spatial index | `bbox_index` virtual R-tree table | `src/storage/object_store.py:221` | High |
| RDF Triple Store (default) | Oxigraph backend selected by default | `src/storage/__init__.py:16`, `src/storage/__init__.py:18` | High |
| RDF Triple Store (fallback) | rdflib local in-memory/file backend | `src/storage/__init__.py:26`, `src/storage/triple_store.py:13` | High |
| External triple store | GraphDB adapter via SPARQL HTTP | `src/storage/__init__.py:22`, `src/storage/graphdb_store.py:10`, `docker-compose.yml:21` | High |
| File-based RDF | Default RDF + extra RDF TTL file loading | `src/api/server.py:42`, `src/api/server.py:44`, `src/api/server.py:66`, `src/api/server.py:76` | High |
| File-based CSV ingestion | Imports from `unified.csv`, `adjacency.csv`, optional `geometry.csv` | `src/storage/object_store.py:234`, `src/storage/object_store.py:286`, `src/storage/object_store.py:309` | High |
| SHACL shape files (TTL) | Shape glob loading from `data/ontology/shapes/**/*.ttl` | `src/inference/shacl_validator.py:19`, `src/inference/shacl_validator.py:20`, `data/ontology/shapes/core/classification.ttl:1` | High |

### 5. API Framework
- Framework: FastAPI.
Evidence: `src/api/server.py:11`, `src/api/server.py:242`.
Confidence: High.
- Server: Uvicorn ASGI.
Evidence: `Dockerfile:22`, `pyproject.toml:9`.
Confidence: High.
- Middleware count: 1 (`CORSMiddleware`).
Evidence: `src/api/server.py:256`, `src/api/server.py:257`.
Confidence: High.
- Router mounts: 15 router modules mounted under `/api`.
Evidence: `src/api/server.py:263`, `src/api/server.py:277`.
Confidence: High.
- Route count: 155 total decorators (`GET 100`, `POST 44`, `PUT 4`, `PATCH 4`, `DELETE 3`) counted across `src/api`.
Evidence examples: `src/api/server.py:279`, `src/api/routes/spatial.py:32`, `src/api/routes/store.py:75`, `src/api/routes/workforce.py:120`.
Confidence: High.

### 6. Frontend Stack
#### Dashboard Frontend (`src/dashboard`)
- Rendering model: static HTML + vanilla JS app served by FastAPI.
Evidence: `src/dashboard/index.html:1`, `src/dashboard/app.js:1`, `src/api/server.py:295`, `src/api/server.py:301`.
Confidence: High.
- CDN libraries (5 total assets):
- `tailwindcss@2.2.19`
- `chart.js@4.4.0`
- `three@0.137.0` core
- `OrbitControls.js` (Three examples)
- `GLTFLoader.js` (Three examples)
Evidence: `src/dashboard/index.html:8`, `src/dashboard/index.html:9`, `src/dashboard/index.html:10`, `src/dashboard/index.html:11`, `src/dashboard/index.html:12`.
Confidence: High.
- Component/tab container count: 23 `tab-content` panels.
Evidence: `src/dashboard/index.html:1858`, `src/dashboard/index.html:3954`, `src/dashboard/index.html:3128`.
Confidence: High.

#### Dashboard Tab Inventory
- Main nav tabs (8): `home`, `data`, `objects`, `3dview`, `analytics_tab`, `simulation_tab`, `workforce_tab`, `workbench`.
Evidence: `src/dashboard/index.html:1808`, `src/dashboard/index.html:1815`.
- Advanced dropdown tabs (5): `sparql`, `properties`, `hierarchy`, `ontology`, `statusmon`.
Evidence: `src/dashboard/index.html:1819`, `src/dashboard/index.html:1823`.
- Legacy nav tabs (10): `overview`, `hierarchy`, `elements`, `sparql`, `properties`, `spatial`, `validate`, `pipeline`, `ontology`, `statusmon`.
Evidence: `src/dashboard/index.html:1834`, `src/dashboard/index.html:1847`.
- Data sub-tabs (3): `sources`, `schema`, `status`.
Evidence: `src/dashboard/index.html:1946`, `src/dashboard/index.html:1948`.
- Spatial validate sub-tabs (4): `edges`, `groups`, `mesh`, `matrix`.
Evidence: `src/dashboard/index.html:3518`, `src/dashboard/index.html:3524`.
- Spatial pipeline sub-tabs (4): `groups`, `schedule`, `cost`, `compare`.
Evidence: `src/dashboard/index.html:3418`, `src/dashboard/index.html:3424`.
- Workbench sub-tabs (8): `adjacency`, `schedule`, `costtable`, `groups`, `validation`, `sim`, `timeline`, `workforce`.
Evidence: `src/dashboard/index.html:4184`, `src/dashboard/index.html:4286`.

#### Existing Site Check (`site/`, `docs/`, GitHub Pages)
- Existing Astro site present with 3 pages + 1 layout.
Evidence: `site/src/pages/index.astro:1`, `site/src/pages/guide.astro:1`, `site/src/pages/api.astro:1`, `site/src/layouts/Layout.astro:1`.
- Existing docs tree present.
Evidence: `docs/guides/DEPLOY.md:1`.
- Existing GitHub Pages deployment workflow for `site/dist`.
Evidence: `.github/workflows/deploy-site.yml:1`, `.github/workflows/deploy-site.yml:43`, `.github/workflows/deploy-site.yml:53`.

### 7. Testing Framework
- Test runner: `pytest`.
Evidence: `pyproject.toml:19`, `tests/test_integration.py:9`.
- Plugins: `pytest-asyncio`, `pytest-cov`.
Evidence: `pyproject.toml:27`, `pyproject.toml:28`, `tests/test_nl2sparql.py:260`, `.github/workflows/ci.yml:28`.
- Coverage threshold: `--cov-fail-under=35`.
Evidence: `.github/workflows/ci.yml:31`.

#### Test Count by Category (module-based)
- API/client tests: 70 (`tests/test_api.py`, `tests/test_client.py`, `tests/test_property_management.py`, `tests/test_workforce.py`).
Evidence: `tests/test_api.py:49`, `tests/test_client.py:36`, `tests/test_property_management.py:46`, `tests/test_workforce.py:103`.
- IFC/RDF pipeline tests: 67 (`tests/test_integration.py`, `tests/test_phase4.py`, `tests/test_lean_objectid.py`, `tests/test_benchmark.py`).
Evidence: `tests/test_integration.py:54`, `tests/test_phase4.py:33`, `tests/test_lean_objectid.py:22`, `tests/test_benchmark.py:23`.
- Spatial/graph/scheduling tests: 119 (`tests/test_adjacency.py`, `tests/test_hierarchy_index.py`, `tests/test_dxtnavis_integration.py`, `tests/test_shadow_diff.py`, `tests/test_scheduling.py`, `tests/test_cost_duration.py`).
Evidence: `tests/test_adjacency.py:38`, `tests/test_hierarchy_index.py:69`, `tests/test_dxtnavis_integration.py:69`, `tests/test_shadow_diff.py:30`, `tests/test_scheduling.py:25`, `tests/test_cost_duration.py:20`.
- NL2SPARQL + MCP tests: 60 (`tests/test_nl2sparql.py`, `tests/test_mcp_contract.py`).
Evidence: `tests/test_nl2sparql.py:23`, `tests/test_mcp_contract.py:21`.
- Delta engine tests: 30 (`tests/test_delta.py`).
Evidence: `tests/test_delta.py:23`.
- Golden harness tests: 1 parametrized harness (`tests/test_golden_queries.py`), with 40 query files + 40 expected snapshots.
Evidence: `tests/test_golden_queries.py:180`, `tests/golden/manifest.yaml:2`, `tests/golden/manifest.yaml:15`.

Total detected test functions: 347.

### 8. DevOps & Infrastructure
- Docker image: `python:3.12-slim`, installs requirements, runs uvicorn on `8000`.
Evidence: `Dockerfile:1`, `Dockerfile:12`, `Dockerfile:19`, `Dockerfile:22`.
- Compose services: `api` + optional `graphdb` (`ontotext/graphdb:10.6`), volume-backed persistence.
Evidence: `docker-compose.yml:2`, `docker-compose.yml:20`, `docker-compose.yml:21`, `docker-compose.yml:25`.
- CI pipeline: GitHub Actions on push/PR to `main`, runs pytest with coverage.
Evidence: `.github/workflows/ci.yml:3`, `.github/workflows/ci.yml:5`, `.github/workflows/ci.yml:27`.
- Site CD pipeline: GitHub Pages deploy from `site/` changes (`npm ci`, `npm run build`, deploy-pages).
Evidence: `.github/workflows/deploy-site.yml:6`, `.github/workflows/deploy-site.yml:34`, `.github/workflows/deploy-site.yml:38`, `.github/workflows/deploy-site.yml:53`.
- Scheduled automation: weekly README project-list update workflow.
Evidence: `.github/workflows/update-projects.yml:5`, `.github/workflows/update-projects.yml:6`.

Deployment targets detected:
- Containerized API service.
Evidence: `Dockerfile:22`, `docker-compose.yml:5`.
- Optional external GraphDB container.
Evidence: `docker-compose.yml:21`.
- GitHub Pages static site (`site/dist`).
Evidence: `.github/workflows/deploy-site.yml:43`, `.github/workflows/deploy-site.yml:49`.

### 9. Domain-Specific Tools
| Tooling Area | Technology | Version | Evidence | Confidence |
|---|---|---|---|---|
| IFC Processing | `ifcopenshell` | `>=0.7.0` (manifest floor; exact pin not in lock) | `requirements.txt:2`, `src/parser/ifc_parser.py:14`, `src/parser/ifc_parser.py:79` | Medium |
| IFC→RDF Conversion | `RDFConverter` + ifcOWL mappings | In-repo implementation | `src/converter/ifc_to_rdf.py:1`, `src/converter/ifc_to_rdf.py:25` | High |
| RDF Triple Store | `rdflib` | `7.5.0` (locked) | `uv.lock:921`, `src/storage/triple_store.py:13` | High |
| RDF/SPARQL Engine | `pyoxigraph` | `0.5.4` (locked) | `uv.lock:710`, `src/storage/oxigraph_store.py:13` | High |
| External SPARQL Store | GraphDB | `10.6` | `docker-compose.yml:21`, `src/storage/graphdb_store.py:3` | High |
| SPARQL HTTP Adapter | `SPARQLWrapper` | `>=2.0.0` (manifest floor; exact pin not in lock) | `requirements.txt:6`, `src/storage/graphdb_store.py:10` | Medium |
| OWL/RDFS Reasoning | `owlrl` | `7.1.4` (locked) | `uv.lock:510`, `src/inference/reasoner.py:11`, `src/inference/reasoner.py:218` | High |
| SHACL Validation | `pyshacl` | `0.31.0` (locked) | `uv.lock:770`, `src/inference/shacl_validator.py:217`, `src/inference/shacl_validator.py:239` | High |
| SHACL Shapes | Turtle shapes corpus | 6 core shape files detected | `src/inference/shacl_validator.py:19`, `data/ontology/shapes/core/classification.ttl:1` | High |
| Query Corpus | Golden SPARQL set | 40 queries across 5 categories | `tests/golden/manifest.yaml:2`, `tests/golden/manifest.yaml:16`, `tests/golden/manifest.yaml:195` | High |

### 10. Domain Classification
- Primary domain: BIM / AEC semantic data platform.
Rationale evidence: project description `pyproject.toml:4`; IFC parser `src/parser/ifc_parser.py:1`; IFC→RDF converter `src/converter/ifc_to_rdf.py:1`.
Confidence: High.
- Secondary domain: Semantic Web / Knowledge Graph + construction operations intelligence.
Rationale evidence: SPARQL API routes `src/api/routes/sparql.py:14`; OWL reasoning `src/inference/reasoner.py:1`; SHACL validation `src/inference/shacl_validator.py:1`; workforce/simulation operational modules `src/api/routes/workforce.py:16`, `src/api/routes/simulation.py:13`.
Confidence: High.

### 11. Template Recommendation
Recommended template: `astro-landing`.

Rationale:
- Existing static site already uses Astro (`site/package.json:12`) and has a live deployment pipeline to GitHub Pages (`.github/workflows/deploy-site.yml:53`).
- Current site content is documentation/portfolio-oriented (home, guide, API pages), which maps directly to landing-style IA (`site/src/pages/index.astro:6`, `site/src/pages/guide.astro:6`, `site/src/pages/api.astro:166`).
- Build/deploy is already optimized for static output (`npm run build` to `site/dist`) (`.github/workflows/deploy-site.yml:38`, `.github/workflows/deploy-site.yml:43`).
- Core product already has an in-app operational dashboard (`src/dashboard/index.html:1858`), so portfolio layer should stay lightweight and narrative-focused.
- Backend/API complexity is high (155 routes), so keeping marketing/docs static reduces operational coupling (`src/api/server.py:263`, `src/api/server.py:277`).
- Team already has Astro layout/theme tokens in place (`site/src/layouts/Layout.astro:19`), minimizing migration work.

Alternative: `sveltekit-dashboard`.
- Better if you want a second interactive, data-live portfolio that directly calls API endpoints and simulates app workflows.
- Tradeoff: introduces extra runtime complexity vs current static GitHub Pages flow.

### 12. Design Direction
- Color palette (recommended, aligned to existing tokens):
- `#0F172A` primary background
- `#1E293B` card/surface
- `#334155` borders/dividers
- `#3B82F6` primary accent/action
- `#4ADE80` success/status
- `#FBBF24` warning/highlight
- `#F87171` error/risk
- `#94A3B8` secondary text
Evidence baseline: `site/src/layouts/Layout.astro:20`, `src/dashboard/index.html:37`.

- Typography:
- Headings: `Space Grotesk` (project narrative + technical tone)
- Body: `IBM Plex Sans`
- Code/data: `IBM Plex Mono` or `Cascadia Code`
Evidence baseline for monospace usage: `site/src/layouts/Layout.astro:75`.

- Layout components:
- Hero with pipeline statement and CTA
- Architecture strip (IFC → RDF → SPARQL → Dashboard)
- KPI band (triples, categories, endpoints, tests)
- Capability cards (reasoning, validation, spatial, workforce)
- API quickstart code panel
- Case-study section with screenshots
- Footer with repo + docs links

- Domain-specific visual elements (recommended):
- IFC-to-RDF flow diagram
- SPARQL query/result cards
- Ontology class-link mini graph
- SHACL validation badge/violation summary
- Spatial adjacency/mesh overlay thumbnails
- Hierarchy (Miller columns) snapshot
- Work-package/timeline miniature

### 13. Complete Stack Summary Table

| Category | Technology | Version | Role |
|---|---|---|---|
| Language | Python | `>=3.11` | Core backend/tests (`pyproject.toml:5`, `src/api/server.py:11`) |
| Language | JavaScript | In-repo source | Dashboard logic (`src/dashboard/app.js:1`) |
| Language | HTML | In-repo source | Dashboard markup (`src/dashboard/index.html:1`) |
| Language | Astro | In-repo source | Portfolio/docs pages (`site/src/pages/index.astro:1`) |
| Language | SPARQL | In-repo query corpus | Golden query suite (`tests/golden/queries/statistics/ST-01.rq:1`) |
| API Framework | FastAPI | `>=0.100.0` (locked `0.128.1`) | REST app/router layer (`pyproject.toml:8`, `uv.lock:359`, `src/api/server.py:11`) |
| API Server | Uvicorn | `>=0.23.0` (locked `0.40.0`) | ASGI runtime (`pyproject.toml:9`, `uv.lock:1162`, `Dockerfile:22`) |
| Data Model | Pydantic | `>=2.0.0` (locked `2.12.5`) | API model validation (`pyproject.toml:10`, `uv.lock:562`, `src/api/models/response.py:4`) |
| RDF Stack | rdflib | `>=7.0.0` (locked `7.5.0`) | Local RDF graph/SPARQL backend (`pyproject.toml:7`, `uv.lock:922`, `src/storage/triple_store.py:13`) |
| RDF Stack | pyoxigraph | `>=0.4.0` (locked `0.5.4`) | Default high-performance triple store (`pyproject.toml:13`, `uv.lock:711`, `src/storage/oxigraph_store.py:13`) |
| RDF Stack | GraphDB | `10.6` | Optional external triple-store service (`docker-compose.yml:21`) |
| RDF Stack | SPARQLWrapper | `>=2.0.0` | GraphDB query/update adapter (`requirements.txt:6`, `src/storage/graphdb_store.py:10`) |
| IFC Stack | ifcopenshell | `>=0.7.0` | IFC parsing (`requirements.txt:2`, `src/parser/ifc_parser.py:14`) |
| Reasoning | owlrl | `>=7.1.4` (locked `7.1.4`) | OWL/RDFS inference (`pyproject.toml:11`, `uv.lock:511`, `src/inference/reasoner.py:11`) |
| Validation | pyshacl | `>=0.26.0` (locked `0.31.0`) | SHACL constraints validation (`pyproject.toml:14`, `uv.lock:771`, `src/inference/shacl_validator.py:239`) |
| API Utility | python-multipart | `>=0.0.22` | File upload support (`pyproject.toml:12`, `src/api/routes/lean_layer.py:51`) |
| AI Protocol | mcp | `>=1.26.0` (locked `1.26.0`) | MCP server (`pyproject.toml:16`, `uv.lock:486`, `src/mcp/navisworks_server.py:15`) |
| HTTP Client | httpx | `>=0.24.0` (locked `0.28.1`) | Python API client requests (`requirements.txt:20`, `uv.lock:405`, `src/clients/python/client.py:10`) |
| Utility | pyyaml | `>=6.0.3` (locked `6.0.3`) | YAML fixture/manifest parsing (`pyproject.toml:15`, `uv.lock:867`, `tests/conftest.py:8`) |
| Utility | requests | `>=2.31.0` | GraphDB import/export calls (`requirements.txt:25`, `src/storage/graphdb_store.py:91`) |
| Utility | python-dotenv | `>=1.0.0` | Declared dependency; direct usage not detected (`requirements.txt:23`) |
| Frontend | Tailwind CSS (CDN) | `2.2.19` | Dashboard styling (`src/dashboard/index.html:8`) |
| Frontend | Chart.js (CDN) | `4.4.0` | Dashboard charts (`src/dashboard/index.html:9`) |
| Frontend | Three.js (CDN) | `0.137.0` | 3D visualization (`src/dashboard/index.html:10`) |
| Frontend | OrbitControls | `three@0.137.0` examples | 3D camera controls (`src/dashboard/index.html:11`) |
| Frontend | GLTFLoader | `three@0.137.0` examples | 3D mesh loading (`src/dashboard/index.html:12`) |
| Site Framework | Astro | `^5.17.1` (resolved `5.17.1`) | Portfolio/docs static site (`site/package.json:12`, `site/package-lock.json:1664`) |
| Testing | pytest | `>=9.0.2` / `>=7.0.0` | Test runner (`pyproject.toml:26`, `requirements.txt:18`, `tests/test_integration.py:9`) |
| Testing | pytest-asyncio | `>=1.3.0` | Async test support (`pyproject.toml:27`, `tests/test_nl2sparql.py:260`) |
| Testing | pytest-cov | `>=7.0.0` / `>=4.0.0` | Coverage reports/gates (`pyproject.toml:28`, `.github/workflows/ci.yml:31`) |
| Database | SQLite (`sqlite3`) | stdlib (runtime-linked) | Persistent object/workforce store (`src/storage/object_store.py:12`, `src/storage/object_store.py:63`) |
| Package Manager | uv | Lockfile-based | Primary Python dependency manager (`uv.lock:1`, `README.md:133`) |
| Package Manager | pip | requirements-based | CI/container installs (`.github/workflows/ci.yml:25`, `Dockerfile:12`) |
| Package Manager | npm | lockfile-based | Astro site installs/build (`site/package-lock.json:4`, `.github/workflows/deploy-site.yml:34`) |
| DevOps | Docker | In-repo Dockerfile | API image build/run (`Dockerfile:1`, `Dockerfile:22`) |
| DevOps | Docker Compose | In-repo compose | Multi-service orchestration (`docker-compose.yml:1`) |
| CI/CD | GitHub Actions | Workflow YAML | CI tests + Pages deployment (`.github/workflows/ci.yml:1`, `.github/workflows/deploy-site.yml:1`) |
| Deployment | GitHub Pages | Actions deploy-pages | Static site hosting target (`.github/workflows/deploy-site.yml:49`, `.github/workflows/deploy-site.yml:53`) |


---

# Summary

## bim-ontology Analysis Summary

### Key Insights

- **Semantic BIM Platform**: Navisworks CSV/IFC -> RDF ontology conversion -> SPARQL query + OWL/RDFS reasoning + SHACL validation pipeline for construction intelligence
- **2.8M Triple Dataset**: 12,009 BIM objects x 9 hierarchy levels. Oxigraph (Rust) backend delivers 34-64x speedup over rdflib (p95 < 517ms)
- **155 REST Endpoints**: 15 route modules covering spatial (26), store (23), workforce (19), workbench (18), ontology (13), reasoning (10), lean layer (9), ops (8), analytics (6), properties (5), buildings (4), statistics (4), llm (3), sparql (2), simulation (2), plus 3 app-level
- **Multi-Channel Access**: REST API, NL2SPARQL (natural language -> SPARQL), MCP server (AI agent integration), 23-panel dashboard, Python client — all sharing the same semantic knowledge base
- **3-Week MVP Depth**: 61 commits, 49,937 LOC (27,755 Python + 13,129 JS + 4,382 HTML + 1,641 Astro), 347 test functions, 40 Golden Queries, 15 SHACL shapes, Shadow/Canary deployment, Delta incremental updates

### Recommended Template

`astro-landing` — reasons:

1. **Existing Astro Setup**: `site/` directory already has Astro 5.17.1 + GitHub Pages deploy workflow
2. **Research/Academic Positioning**: BIM ontology is a construction intelligence research platform. Astro's content-first static approach fits perfectly
3. **0KB JS Default**: Static generation for fast loading. Appropriate for academic/professional audience
4. **Operational Dashboard Exists**: 23-panel interactive dashboard already exists as a separate app (`src/dashboard/`). Portfolio site should be narrative-focused, not duplicating the dashboard

### Design Direction

#### Palette
- **Background**: `#0F172A` (Dark Navy) — existing dashboard/site tokens baseline
- **Surface**: `#1E293B` (Dark Slate) — cards, containers
- **Border**: `#334155` (Slate) — dividers, outlines
- **Primary Accent**: `#3B82F6` (Blue) — links, headers, CTAs
- **Success**: `#4ADE80` (Green) — validation passed, positive metrics
- **Warning**: `#FBBF24` (Amber) — attention states
- **Error**: `#F87171` (Red) — validation failures
- **Secondary Text**: `#94A3B8` (Light Slate) — muted text

**Rationale**: Aligned to existing tokens in `site/src/layouts/Layout.astro:20` and `src/dashboard/index.html:37`. Dark palette matches the technical/research positioning.

#### Typography
- **Headings**: Space Grotesk — technical + narrative tone
- **Body**: IBM Plex Sans — clean, professional readability
- **Code/Data**: IBM Plex Mono or Cascadia Code — SPARQL examples, RDF snippets

#### Layout
- **Hero**: Pipeline statement + CTA (IFC -> RDF -> SPARQL -> Dashboard)
- **KPI Band**: 2.8M triples | 12,009 objects | 155 endpoints | 347 tests | 40 golden queries
- **Architecture Strip**: Layered diagram (Parser -> Storage -> API -> Clients)
- **Capability Cards**: Reasoning, Validation, Spatial, Workforce, NL2SPARQL, MCP
- **API Quickstart**: Code panel with SPARQL example
- **Case Study**: Screenshots from 23-panel dashboard
- **Footer**: Repo + docs + GitHub Pages links

#### Domain-Specific Visual Elements
1. IFC-to-RDF pipeline flow diagram
2. SPARQL query/result cards with syntax highlighting
3. Ontology class-link mini graph
4. SHACL validation badge/violation summary
5. Spatial adjacency/mesh overlay thumbnails
6. Hierarchy (Miller Columns) snapshot
7. Performance comparison chart (Oxigraph vs rdflib, 34-64x)
8. Work-package/timeline miniature

### Notable

#### Unique Technical Achievements
- **Golden Query System**: 40 SPARQL queries as baseline across both backends (Oxigraph, rdflib). Automated comparison ensures data integrity during backend transitions
- **Shadow/Canary Pattern**: Zero-downtime backend cutover system. Gradual traffic shifting from rdflib to Oxigraph with automated result comparison
- **PropertyValue Reification**: 414K property values preserved via RDF reification. Restores context lost during IFC export
- **NL2SPARQL Evidence Chain**: LLM-generated SPARQL with ontology provenance tracking. Transparent debugging and audit trail
- **Pluggable Triple Store**: `BaseTripleStore` interface with 3 implementations (Oxigraph, rdflib, GraphDB). Runtime selection via env var
- **Delta Update Engine**: Hash-based diff, manifest persistence, SPARQL INSERT/DELETE patches. Replaces 5-minute full reloads with sub-second incremental updates

#### Observations
- **Backend default mismatch**: Code defaults to `oxigraph` (`src/storage/__init__.py:16`), Compose defaults to `local` (`docker-compose.yml:11`), `.env.example` defaults to `rdflib` (`.env.example:8`)
- **Dashboard monolith**: 13,129 LOC single JS file (`src/dashboard/app.js`). No framework, vanilla JS
- **Coverage threshold 35%**: Conservative compared to industry 70-80% (`--cov-fail-under=35`)
- **Dependency split**: Core deps in `pyproject.toml`, extra deps in `requirements.txt`. Some optional imports at runtime (ifcopenshell, trimesh)
- **Large spatial module**: `src/api/routes/spatial.py` is 1,765 LOC (route concentration)

#### Further Investigation Needed
- GraphDB profile utilization: performance/operations trade-off analysis
- IFC pipeline vs CSV pipeline data consistency verification
- Spatial Index divergence between CSV mode and SPARQL mode

### Stack Summary

| Category | Technology | Version |
|----------|-----------|---------|
| Language | Python | >=3.11 (CI: 3.12, Docker: 3.12-slim) |
| Framework | FastAPI | 0.128.1 (locked) |
| ASGI Server | Uvicorn | 0.40.0 (locked) |
| Data Models | Pydantic | 2.12.5 (locked) |
| RDF Store (default) | pyoxigraph (Oxigraph) | 0.5.4 (locked) |
| RDF Store (fallback) | rdflib | 7.5.0 (locked) |
| RDF Store (external) | GraphDB | 10.6 |
| Reasoning | owlrl | 7.1.4 (locked) |
| Validation | pyshacl | 0.31.0 (locked) |
| IFC | ifcopenshell | >=0.7.0 |
| AI/MCP | mcp (FastMCP) | 1.26.0 (locked) |
| NL2SPARQL | Claude/GPT (multi-provider) | - |
| Frontend | Vanilla JS + Tailwind 2.2.19 + Chart.js 4.4.0 + Three.js 0.137.0 | 13,129 LOC |
| Static Site | Astro | 5.17.1 |
| Testing | pytest + pytest-asyncio + pytest-cov | 9.0.2 / 1.3.0 / 7.0.0 |
| Package Mgr | uv (primary) + pip (CI) + npm (site) | latest |
| Database | SQLite (ObjectStore, 12 tables + R-tree) | stdlib |
| DevOps | Docker + Docker Compose + GitHub Actions | - |
| HTTP Client | httpx | 0.28.1 (locked) |

### Project Scale

| Metric | Value |
|--------|-------|
| Total LOC | 49,937 |
| Python LOC (src) | 20,126 |
| Python LOC (tests) | 4,534 |
| JS LOC (Dashboard) | 13,129 |
| Astro LOC (Site) | 1,641 |
| API Endpoints | 155 (GET 100, POST 44, PUT 4, PATCH 4, DELETE 3) |
| Route Modules | 15 |
| Test Functions | 347 |
| Golden Queries | 40 (5 categories) |
| RDF Triples | 2.8M |
| SHACL Shapes | 15 (6 domains) |
| BIM Objects | 12,009 |
| Hierarchy Levels | 9 |
| Dashboard Panels | 23 tab-content |
| Commits | 61 (3 weeks) |
| Tracked Files | 477 |
| SQLite Tables | 12 + R-tree index |

### Analysis Agents

| Agent | CLI | Model | Output |
|-------|-----|-------|--------|
| code-analyst | Codex | gpt-5.3-codex (xhigh) | architecture.md (489 lines) |
| story-analyst | Claude | claude-opus-4-6 | narrative.md (219 lines) |
| stack-detector | Codex | gpt-5.3-codex (xhigh) | stack-profile.md (285 lines) |

---

# Experience Blocks

## bim-ontology — Experience Blocks

> 6블록 사고력 템플릿 기반 경험 구조화. 분석 데이터 + 사용자 인터뷰 결합.
> 생성일: 2026-02-22 | 경험 수: 6개 | 프로젝트 목표: 논문 발표 + 실제 건설현장 적용 (둘 다)

---

### Experience 1: Oxigraph 백엔드 전환 — rdflib에서 Rust 기반 트리플스토어로

#### 목표(KPI)
BIM 온톨로지 시스템의 쿼리 응답속도를 현장 의사결정에 활용 가능한 수준으로 개선. Conference paper용 MVP를 빠르게 완성하면서도, 2.8M 트리플 규모의 방대한 BIM 데이터에서 실시간 대시보드 인터랙션이 가능해야 함.

#### 현상(문제 증상)
- rdflib(Python-native) 백엔드에서 복합 hierarchy 쿼리 시 5분 이상 소요 (출처: narrative.md)
- 13개 대시보드 탭 전환 시 UX 붕괴. cold query 65ms이지만 복합 쿼리가 병목
- Navisworks에서 IFC 데이터의 ontology 관계가 명확하게 나오지 않아 raw data(mesh, csv, ttl, owl)로 출력하는 방향으로 전환 → 데이터 규모 증가로 성능 문제 심화

#### 원인 가설
1. **rdflib의 로딩 속도 한계** → 검증: 프로파일링으로 rdflib의 Python 인터프리터 오버헤드 확인. 2.8M 트리플 로딩 시 메모리/시간 측정
2. **SPARQL 쿼리 최적화기 부재** → 검증: 동일 쿼리를 rdflib vs Oxigraph(Spargebat 옵티마이저 내장)에서 실행 비교. Golden Query 40개 벤치마크
3. **Navisworks IFC 출력의 ontology 관계 불명확** → 검증: IFC export 데이터와 CSV AllHierarchy 데이터의 관계 보존율 비교

#### 판단 기준(Decision Rule)
- **조건**: ontology 관계가 IFC에서 명확히 나오는가?
- **전략 A (기각)**: IFC 기반 ontology 직접 구현
- **전략 B (채택)**: raw data(mesh, csv, ttl, owl)로 출력 후 RDF 변환
- **기각 근거**: Navisworks IFC exporter가 parent-child, property context를 누락. raw data가 더 충실한 소스

- **조건**: rdflib 로딩 속도가 대시보드 UX를 감당하는가?
- **전략 A (채택)**: Oxigraph(Rust) 전환 — pyoxigraph가 pip install 한 줄. Shadow/Canary로 안전 전환
- **전략 B (기각)**: rdflib 최적화/캐싱만으로 해결 시도
- **기각 근거**: Python-native의 근본적 한계. 캐싱만으로는 복합 쿼리 5분+ 해결 불가

#### 실행
1. Golden Query 40개 정의 (5 카테고리: Statistics, Hierarchy, Properties, Spatial, Cross-domain) — 양 백엔드 결과 비교 기준 확립
2. Shadow/Canary 패턴 구현 — rdflib를 primary로 두고 Oxigraph를 shadow로 병렬 실행, 결과 자동 비교 (도구: `src/api/utils/shadow_executor.py`)
3. 점진적 트래픽 전환 — shadow → canary → primary 단계별 이동. 40/40 쿼리 일치 확인 후 전환 완료
4. LRU TTL 캐시 추가 — hot query 경로 추가 최적화

#### 결과

| 지표 | Before (rdflib) | After (Oxigraph) | 변화 |
|------|-----------------|-------------------|------|
| 복합 쿼리 응답 | 5분+ | 4-20ms | **34-64x 개선** |
| p95 latency | 측정 불가 (타임아웃) | 517ms | 실시간 가능 |
| 캐시 적중 시 | N/A | 14,869x speedup | - |
| 전환 중 다운타임 | - | **0** | Shadow/Canary 패턴 |
| Golden Query 일치 | - | **40/40 (100%)** | 데이터 무결성 보장 |

**핵심 성과**: Python rdflib → Rust Oxigraph 전환으로 34-64x 성능 개선. Shadow/Canary 패턴으로 무중단 전환 달성. 40개 Golden Query로 결과 일치 검증.

---

### Experience 2: BIM 데이터 손실 복원 — IFC 스펙 한계를 이중 경로로 극복

#### 목표(KPI)
건설공사 전 생애주기에서 BIM 데이터를 추적 가능하도록 온톨로지화. Navisworks에서 추출한 12,009개 객체의 계층구조, 속성, 관계를 유실 없이 RDF로 변환.

#### 현상(문제 증상)
- IFC 내보내기 시 parent-child 관계 붕괴, property context 소실, type 정보 유실 (출처: narrative.md)
- Navisworks InstanceGuid ≠ IFC GlobalId ≠ 커스텀 ID. 식별자 불안정으로 하류 시스템(스케줄링, 원가 배분) 연동 실패
- 복잡한 plant project 설계 특성상 관계 파악이 핵심인데, 내보내기 과정에서 정보 손실

#### 원인 가설
1. **IFC 스펙 자체의 한계** → 검증: IFC 표준이 Navisworks의 계층구조(AllHierarchy)를 완전히 표현하지 못함. IFC export vs CSV export 데이터 비교로 확인
2. **Navisworks IFC exporter의 구현 제한** → 검증: 동일 모델을 IFC vs CSV(AllHierarchy)로 각각 내보내고 관계 보존율 비교
3. **식별자 체계 불일치** → 검증: InstanceGuid, Item GUID, Authoring ID 각각의 안정성을 여러 export에서 교차 확인

#### 판단 기준(Decision Rule)
- **조건**: IFC export가 계층구조와 속성을 충분히 보존하는가?
- **전략 A (기각)**: IFC 단일 경로만 사용
- **전략 B (채택)**: IFC + CSV 이중 경로. CSV(AllHierarchy)가 더 충실한 데이터 소스
- **기각 근거**: IFC 스펙 자체의 한계. Navisworks의 9단계 계층과 속성 컨텍스트를 IFC가 완전히 담지 못함

- **조건**: 식별자가 안정적인가?
- **전략 A (채택)**: Synthetic ID fallback chain (InstanceGuid → Item GUID → Authoring ID → Path Hash). 결정론적이되 도구 업데이트에 견고
- **전략 B (기각)**: 단일 식별자 의존
- **기각 근거**: 어떤 단일 ID도 모든 상황에서 안정적이지 않음

#### 실행
1. IFC 파싱 파이프라인 구축 — `ifcopenshell` 기반 (`src/parser/ifc_parser.py`)
2. CSV → RDF 변환기 개발 — Navisworks AllHierarchy CSV에서 ObjectId, ParentId, Level, Properties 추출 (`src/converter/navis_to_rdf.py`)
3. Name-based category inference — 29개 패턴으로 type 정보 복원 (`src/converter/ifc_to_rdf.py`)
4. PropertyValue reification — RDF reification으로 414K 속성값의 컨텍스트 보존
5. Synthetic ID fallback chain 구현 — 4단계 ID 해소 전략

#### 결과

| 지표 | Before (IFC only) | After (IFC+CSV) | 변화 |
|------|-------------------|------------------|------|
| 보존된 객체 | 부분적 (계층 붕괴) | **12,009개** (9 계층) | 완전 보존 |
| 속성값 | context 유실 | **414K** reified values | 컨텍스트 복원 |
| 카테고리 인식 | type 유실 | **29 패턴** 자동 분류 | 자동화 |
| ID 안정성 | 단일 ID 의존 | **4단계 fallback** | 도구 독립적 |

**핵심 성과**: IFC 스펙 한계를 CSV 이중 경로 + Synthetic ID + PropertyValue reification으로 극복. 12,009 객체 × 9 계층 완전 보존.

---

### Experience 3: NL2SPARQL — 온톨로지 스키마 기반 자연어 인터페이스

#### 목표(KPI)
SPARQL 전문 지식 없는 도메인 전문가(프로젝트 매니저, 안전 엔지니어)가 한국어/영어 자연어로 BIM 데이터 질의 가능하도록 함. Conference paper 핵심 기여 포인트.

#### 현상(문제 증상)
- SPARQL 문법 장벽으로 도메인 전문가가 직접 데이터 조회 불가
- "Zone A의 모든 파이프 총 무게는?" 같은 질문에 SPARQL 작성 필요 → 개발자 의존
- 건설현장에서 빠른 의사결정을 위해 반복작업/처리시간 단축이 필수인데, 쿼리 작성이 병목

#### 원인 가설
1. **SPARQL 문법의 높은 진입장벽** → 검증: 도메인 전문가에게 SPARQL 교육 시간 대비 효과 측정
2. **GUI 쿼리빌더의 유연성 부족** → 검증: 프리셋 대시보드/쿼리빌더는 미리 정의된 패턴만 가능. 예상 못한 질문 처리 불가
3. **LLM의 SPARQL 생성 정확도 성숙** → 검증: GPT/Claude에 ontology schema를 제공하면 SPARQL 생성 정확도 검증

#### 판단 기준(Decision Rule)
- **전제 조건**: ontology DB schema 설계가 잘 되어 있어야 함
- **조건**: schema가 충분히 구조화되어 있으면 LLM이 읽고 정확한 SPARQL 생성 가능
- **전략 A (채택)**: LLM 기반 NL2SPARQL — schema를 LLM에 제공하여 자연어 → SPARQL 자동 변환
- **전략 B (기각)**: GUI 쿼리빌더 / 프리셋 대시보드
- **기각 근거**: GUI는 미리 정의된 패턴만 처리. 자연어는 예상 못한 질문도 처리 가능. 건설현장 의사결정의 유연성 필요

#### 실행
1. Schema Retriever 구현 — ontology에서 entity/predicate 매핑 자동 추출
2. Multi-provider LLM 통합 — Anthropic(Claude) + OpenAI(GPT) 지원. 단일 벤더 의존 방지
3. Static Validator — SPARQL injection 공격 방지 (UNION, DROP, DELETE 차단)
4. Evidence chain 기록 — 어떤 ontology fact가 번역에 사용되었는지 투명하게 추적
5. 대시보드 통합 — SPARQL 탭에 NL 입력 박스, 템플릿 라이브러리, 쿼리 히스토리 구현

#### 결과

| 지표 | Before | After | 변화 |
|------|--------|-------|------|
| SPARQL 작성 주체 | 개발자 전용 | **도메인 전문가 직접** | 접근성 해결 |
| 지원 언어 | N/A | **한국어 + 영어** | 다국어 |
| 구현 규모 | 0 | **7 모듈, 39 unit tests** | - |
| LLM 벤더 | N/A | **2 providers** (Anthropic, OpenAI) | 단일 벤더 비의존 |
| 보안 | N/A | **Static Validator** (injection 차단) | - |

**핵심 성과**: 잘 설계된 ontology schema를 전제로 LLM이 자연어를 SPARQL로 변환. SPARQL 진입장벽 제거, 도메인 전문가의 직접 데이터 접근 실현.

---

### Experience 4: SHACL 데이터 품질 검증 — W3C 표준 기반 BIM 데이터 무결성

#### 목표(KPI)
BIM 데이터의 무결성을 자동으로 검증하여 수동 검수 시간 단축. RDF 생태계와 자연스럽게 통합되는 검증 체계 구축. 논문에서 표준 기반 검증 방법론으로 제시.

#### 현상(문제 증상)
- BIM 데이터에서 잘못된 데이터(누락된 ObjectId, 범위 밖 좌표, 끊어진 parent-child 관계)를 발견하려면 수동 검수 필요
- "이 건물이 구역 규정을 위반하는가?" 같은 질문은 수천 개 요소를 수동 검사해야 답변 가능
- 데이터 품질 문제가 하류 분석(공간 검증, 일정 계획)의 신뢰도를 떨어뜨림

#### 원인 가설
1. **구조화된 검증 규칙 부재** → 검증: 기존에는 코드로 개별 검증 로직 작성. 규칙 추가/수정이 코드 변경을 요구
2. **검증과 데이터 모델의 분리** → 검증: 코드 기반 룰은 데이터 스키마와 별도 관리. 스키마 변경 시 검증 로직 동기화 필요
3. **재사용 불가능한 검증 로직** → 검증: 프로젝트별로 검증 코드를 다시 작성. 표준 기반이면 재사용 가능

#### 판단 기준(Decision Rule)
- **조건**: 이미 RDF/OWL 기반 시스템인가?
- **전략 A (채택)**: SHACL (W3C 표준) — RDF 그래프 형태로 shape 정의. 온톨로지와 자연스러운 통합
- **전략 B (기각)**: 코드 기반 커스텀 validator
- **기각 근거**: RDF 생태계와 자연스럽게 통합. shape 자체가 그래프로 관리 가능. W3C 표준이라 논문 근거로 강하고 다른 BIM 프로젝트에도 재사용 가능

#### 실행
1. 6개 도메인별 SHACL shape 설계 — Identity, Geometry, Numeric, Classification, Relationship, Completeness
2. 15개 shape 구현 — `data/ontology/shapes/core/` (도구: pyshacl 0.31.0)
3. 대시보드 Validation 탭 구현 — SHACL 실행 → 위반사항 도메인별 리포트
4. NL2SPARQL root cause engine 연동 — "왜 요소 X가 검증 실패했는가?" 자연어 분석

#### 결과

| 지표 | Before | After | 변화 |
|------|--------|-------|------|
| 검증 방식 | 수동 검수 | **자동 SHACL** | 자동화 |
| 검증 규칙 | 0 (코드 산재) | **15 shapes, 6 도메인** | 체계화 |
| 표준 준수 | 비표준 | **W3C SHACL** | 논문 + 재사용 |
| 검증-분석 연계 | 불가 | **NL2SPARQL root cause** 연동 | 원인 추적 |

**핵심 성과**: W3C SHACL 표준으로 BIM 데이터 품질 검증 자동화. 15 shapes × 6 도메인. RDF 생태계 자연 통합 + 논문 기여.

---

### Experience 5: 공간 검증 프레임워크 — Navisworks 의존성 탈피

#### 목표(KPI)
Plant project의 복잡한 3D 공간 관계(인접성, 충돌, 연결성)를 Navisworks 없이 웹에서 검증 가능하도록 함. Navisworks API의 read-only 한계를 극복하고 ontology 기반 공간 데이터 관리 체계 구축.

#### 현상(문제 증상)
- Plant project는 x, y, z축으로 사방으로 퍼지는 구조 → BBox 기반 object 연결성 검증이 어려움
- Navisworks Clash Detection은 있지만, API가 write 기능이 없어 schema update/커스텀 분류가 불편
- 충돌 감지 결과를 온톨로지와 연결하여 자동 분류/추적하려면 별도 시스템 필요
- Navisworks 라이선스 없이도 동작하는 웹 기반 검증 필요

#### 원인 가설
1. **BBox의 공간 표현 한계** → 검증: plant 구조물에서 BBox overlap과 실제 물리적 인접성의 불일치율 측정
2. **Navisworks API의 write 불가** → 검증: API 문서 확인. schema 수정, 커스텀 속성 주입이 API로 불가능
3. **Clash Detection 결과의 온톨로지 연결 부재** → 검증: Navisworks clash 결과가 구조화되지 않은 텍스트/CSV로만 출력

#### 판단 기준(Decision Rule)
- **조건**: Navisworks API에 write 기능이 있는가?
- **전략 A (기각)**: Navisworks API 기반 확장
- **전략 B (채택)**: 별도 공간 검증 시스템 구축 (웹 기반, ontology 연동)
- **기각 근거**: Navisworks API 자체에 write 기능이 없어 schema update 불편. 온톨로지 시스템으로 만들려면 독립 시스템 필수

- **조건**: BBox만으로 plant 구조물의 연결성 검증이 가능한가?
- **전략 A (기각)**: BBox overlap만 사용
- **전략 B (채택)**: BBox + 실제 mesh collision + connected components 복합 검증
- **기각 근거**: plant project는 사방으로 퍼지는 구조. BBox만으로는 오탐/미탐 과다

#### 실행
1. CSV 기반 SpatialHierarchyIndex 구축 — Navisworks CSV에서 계층+좌표 추출 (`src/spatial/hierarchy_index.py`)
2. BBox adjacency 계산 — axis-aligned bounding box overlap 감지
3. Connected components — Union-Find로 인접 요소 그룹핑 (`src/spatial/connected_components.py`)
4. Mesh collision — trimesh 기반 실제 메시 거리 계산 (`src/spatial/mesh_collision.py`)
5. Validation UX — Y/N/Skip verdict 시스템, 색상 코딩 3D 시각화, 배치 어노테이션 API
6. CSV verdict persistence — 수동 검증 결과를 CSV로 저장, pipeline stale 마킹으로 재계산 트리거

#### 결과

| 지표 | Before (Navisworks 의존) | After (독립 시스템) | 변화 |
|------|--------------------------|---------------------|------|
| 라이선스 의존 | Navisworks 필수 | **웹 브라우저만 필요** | 의존성 제거 |
| Schema 수정 | API write 불가 | **자유로운 ontology update** | 유연성 확보 |
| 검증 방식 | BBox만 | **BBox + Mesh + Components** | 정확도 향상 |
| 결과 추적 | 비구조화 텍스트 | **CSV verdict + 온톨로지 연동** | 자동 분류 |
| 공간 API | 0 | **26 endpoints** | - |

**핵심 성과**: Navisworks write 불가 한계를 독립 공간 검증 시스템으로 극복. BBox+Mesh+Components 복합 검증으로 plant project 특성 대응.

---

### Experience 6: Delta 증분 업데이트 엔진

> [미확인 — 사용자 스킵] 사용자가 해당 기능의 배경을 기억하지 못하여 인터뷰 미완.
> 분석 데이터만으로 구성된 부분적 블록입니다.

#### 목표(KPI)
[미확인]

#### 현상(문제 증상)
2.8M 트리플 스토어에 속성 몇 개를 추가할 때 전체 데이터셋 리로드 필요 → 5분 소요 (출처: narrative.md)

#### 원인 가설
[미확인]

#### 판단 기준(Decision Rule)
[미확인]

#### 실행
- Manifest: 메타데이터 해시 기반 변경 감지 (`src/delta/manifest_store.py`)
- Diff Engine: old vs new 비교 (`src/delta/diff_engine.py`)
- Patch Builder: SPARQL INSERT/DELETE 생성
- Reconciler: 일관성 검증 (`src/delta/reconciler.py`)
(출처: architecture.md)

#### 결과

| 지표 | Before | After | 변화 |
|------|--------|-------|------|
| 업데이트 방식 | 전체 리로드 (5분) | **증분 패치 (초 단위)** | 대폭 단축 |

**핵심 성과**: [부분적] 전체 리로드를 증분 패치로 대체. 정확한 의사결정 배경은 미확인.

---

### Gap Summary

| 경험 | 목표 | 현상 | 가설 | 판단기준 | 실행 | 결과 |
|------|------|------|------|---------|------|------|
| Exp 1: Oxigraph 전환 | O | O | O | O | O | O |
| Exp 2: 데이터 손실 복원 | O | O | O | O | O | O |
| Exp 3: NL2SPARQL | O | O | O | O | O | O |
| Exp 4: SHACL 검증 | O | O | O | O | O | O |
| Exp 5: 공간 검증 | O | O | O | O | O | O |
| Exp 6: Delta 업데이트 | X | O | X | X | △ | △ |

> O = 완성, △ = 부분(보충 필요), X = 미확인

