# bim-ontology — Architecture Analysis

**Audit Scope**
Directly inspected source/config files include (sample, >15): `src/api/server.py:1`, `src/storage/base_store.py:1`, `src/storage/__init__.py:1`, `src/storage/triple_store.py:1`, `src/storage/oxigraph_store.py:1`, `src/storage/graphdb_store.py:1`, `src/storage/object_store.py:1`, `src/parser/ifc_parser.py:1`, `src/converter/ifc_to_rdf.py:1`, `src/converter/csv_to_rdf.py:1`, `src/converter/navis_to_rdf.py:1`, `src/converter/lean_layer_injector.py:1`, `src/spatial/hierarchy_index.py:1`, `src/spatial/adjacency_detector.py:1`, `src/spatial/connected_components.py:1`, `src/spatial/mesh_collision.py:1`, `src/api/utils/query_executor.py:1`, `src/api/utils/shadow_executor.py:1`, `src/inference/reasoner.py:1`, `src/inference/shacl_validator.py:1`, `src/delta/diff_engine.py:1`, `src/mcp/navisworks_server.py:1`.

## 1. Tech Stack

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

## 2. Architecture Pattern

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

## 3. Directory Structure

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

## 4. Key Modules & Components

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

## 5. Data Flow

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

## 6. Code Metrics

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

## 7. Dependencies (External, Versions, Roles)

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

## 8. API Surface

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

## 9. Configuration

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

## 10. Build & Deployment

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

## 11. Design Decisions

### Decision 1
- **CONTEXT**: The system supports local and external triplestore backends.
- **DECISION**: Define `BaseTripleStore` interface and choose implementation through `create_store`.
- **RATIONALE**: API/query code targets a stable interface (`query/insert/load/save`) while backend selection remains configurable.
- **ALTERNATIVES**: Implementations present in code are `OxigraphStore`, `GraphDBStore`, and fallback `TripleStore`.
- **EVIDENCE**: `src/storage/base_store.py:10`, `src/storage/__init__.py:16`, `src/storage/__init__.py:19`, `src/storage/__init__.py:23`, `src/storage/__init__.py:26`.

### Decision 2
- **CONTEXT**: Startup must ingest data either from cached RDF or IFC source.
- **DECISION**: Prefer existing RDF cache load; fallback to IFC parse/convert/save when cache is missing.
- **RATIONALE**: Cache path is explicitly marked as the fast path; IFC conversion path exists as fallback.
- **ALTERNATIVES**: Fallback branch converts IFC via `IFCParser` and `RDFConverter`, then reloads cached TTL.
- **EVIDENCE**: `src/api/server.py:62`, `src/api/server.py:64`, `src/api/server.py:80`, `src/api/server.py:84`, `src/api/server.py:87`, `src/api/server.py:94`, `src/api/server.py:98`.

### Decision 3
- **CONTEXT**: Spatial validation and continuity planning require both machine-generated edges and manual verdicts.
- **DECISION**: Persist manual verdicts in CSV and recompute groups/continuity pipeline from in-memory index + verdict map.
- **RATIONALE**: API supports loading cached validation CSV, generating index-backed fallback edges, writing annotations, then re-running union-find/enrichment/bin-packing.
- **ALTERNATIVES**: Pure CSV mode and pure index-generated mode are both implemented.
- **EVIDENCE**: `src/api/routes/spatial.py:581`, `src/api/routes/spatial.py:765`, `src/api/routes/spatial.py:1003`, `src/api/routes/spatial.py:1028`, `src/api/routes/spatial.py:1415`, `src/api/routes/spatial.py:1452`, `src/api/routes/spatial.py:1503`.

## 12. Key Findings

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