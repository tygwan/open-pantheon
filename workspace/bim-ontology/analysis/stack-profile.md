# bim-ontology — Stack Profile

## 1. Primary Languages
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

## 2. Frameworks & Libraries (All Declared Dependencies)

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

## 3. Package Manager
- Primary: `uv` for Python dependency locking/sync.
Evidence: `uv.lock:1`, `README.md:133`, `README.md:136`.
Confidence: High.
- Secondary: `pip` in CI/container build.
Evidence: `.github/workflows/ci.yml:25`, `Dockerfile:12`.
Confidence: High.
- Secondary (site): `npm` for Astro site.
Evidence: `site/package-lock.json:4`, `.github/workflows/deploy-site.yml:34`.
Confidence: High.

## 4. Database & Storage
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

## 5. API Framework
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

## 6. Frontend Stack
### Dashboard Frontend (`src/dashboard`)
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

### Dashboard Tab Inventory
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

### Existing Site Check (`site/`, `docs/`, GitHub Pages)
- Existing Astro site present with 3 pages + 1 layout.
Evidence: `site/src/pages/index.astro:1`, `site/src/pages/guide.astro:1`, `site/src/pages/api.astro:1`, `site/src/layouts/Layout.astro:1`.
- Existing docs tree present.
Evidence: `docs/guides/DEPLOY.md:1`.
- Existing GitHub Pages deployment workflow for `site/dist`.
Evidence: `.github/workflows/deploy-site.yml:1`, `.github/workflows/deploy-site.yml:43`, `.github/workflows/deploy-site.yml:53`.

## 7. Testing Framework
- Test runner: `pytest`.
Evidence: `pyproject.toml:19`, `tests/test_integration.py:9`.
- Plugins: `pytest-asyncio`, `pytest-cov`.
Evidence: `pyproject.toml:27`, `pyproject.toml:28`, `tests/test_nl2sparql.py:260`, `.github/workflows/ci.yml:28`.
- Coverage threshold: `--cov-fail-under=35`.
Evidence: `.github/workflows/ci.yml:31`.

### Test Count by Category (module-based)
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

## 8. DevOps & Infrastructure
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

## 9. Domain-Specific Tools
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

## 10. Domain Classification
- Primary domain: BIM / AEC semantic data platform.
Rationale evidence: project description `pyproject.toml:4`; IFC parser `src/parser/ifc_parser.py:1`; IFC→RDF converter `src/converter/ifc_to_rdf.py:1`.
Confidence: High.
- Secondary domain: Semantic Web / Knowledge Graph + construction operations intelligence.
Rationale evidence: SPARQL API routes `src/api/routes/sparql.py:14`; OWL reasoning `src/inference/reasoner.py:1`; SHACL validation `src/inference/shacl_validator.py:1`; workforce/simulation operational modules `src/api/routes/workforce.py:16`, `src/api/routes/simulation.py:13`.
Confidence: High.

## 11. Template Recommendation
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

## 12. Design Direction
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

## 13. Complete Stack Summary Table

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

