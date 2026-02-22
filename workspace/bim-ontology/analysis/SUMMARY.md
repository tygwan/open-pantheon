# bim-ontology Analysis Summary

## Key Insights

- **Semantic BIM Platform**: Navisworks CSV/IFC -> RDF ontology conversion -> SPARQL query + OWL/RDFS reasoning + SHACL validation pipeline for construction intelligence
- **2.8M Triple Dataset**: 12,009 BIM objects x 9 hierarchy levels. Oxigraph (Rust) backend delivers 34-64x speedup over rdflib (p95 < 517ms)
- **155 REST Endpoints**: 15 route modules covering spatial (26), store (23), workforce (19), workbench (18), ontology (13), reasoning (10), lean layer (9), ops (8), analytics (6), properties (5), buildings (4), statistics (4), llm (3), sparql (2), simulation (2), plus 3 app-level
- **Multi-Channel Access**: REST API, NL2SPARQL (natural language -> SPARQL), MCP server (AI agent integration), 23-panel dashboard, Python client — all sharing the same semantic knowledge base
- **3-Week MVP Depth**: 61 commits, 49,937 LOC (27,755 Python + 13,129 JS + 4,382 HTML + 1,641 Astro), 347 test functions, 40 Golden Queries, 15 SHACL shapes, Shadow/Canary deployment, Delta incremental updates

## Recommended Template

`astro-landing` — reasons:

1. **Existing Astro Setup**: `site/` directory already has Astro 5.17.1 + GitHub Pages deploy workflow
2. **Research/Academic Positioning**: BIM ontology is a construction intelligence research platform. Astro's content-first static approach fits perfectly
3. **0KB JS Default**: Static generation for fast loading. Appropriate for academic/professional audience
4. **Operational Dashboard Exists**: 23-panel interactive dashboard already exists as a separate app (`src/dashboard/`). Portfolio site should be narrative-focused, not duplicating the dashboard

## Design Direction

### Palette
- **Background**: `#0F172A` (Dark Navy) — existing dashboard/site tokens baseline
- **Surface**: `#1E293B` (Dark Slate) — cards, containers
- **Border**: `#334155` (Slate) — dividers, outlines
- **Primary Accent**: `#3B82F6` (Blue) — links, headers, CTAs
- **Success**: `#4ADE80` (Green) — validation passed, positive metrics
- **Warning**: `#FBBF24` (Amber) — attention states
- **Error**: `#F87171` (Red) — validation failures
- **Secondary Text**: `#94A3B8` (Light Slate) — muted text

**Rationale**: Aligned to existing tokens in `site/src/layouts/Layout.astro:20` and `src/dashboard/index.html:37`. Dark palette matches the technical/research positioning.

### Typography
- **Headings**: Space Grotesk — technical + narrative tone
- **Body**: IBM Plex Sans — clean, professional readability
- **Code/Data**: IBM Plex Mono or Cascadia Code — SPARQL examples, RDF snippets

### Layout
- **Hero**: Pipeline statement + CTA (IFC -> RDF -> SPARQL -> Dashboard)
- **KPI Band**: 2.8M triples | 12,009 objects | 155 endpoints | 347 tests | 40 golden queries
- **Architecture Strip**: Layered diagram (Parser -> Storage -> API -> Clients)
- **Capability Cards**: Reasoning, Validation, Spatial, Workforce, NL2SPARQL, MCP
- **API Quickstart**: Code panel with SPARQL example
- **Case Study**: Screenshots from 23-panel dashboard
- **Footer**: Repo + docs + GitHub Pages links

### Domain-Specific Visual Elements
1. IFC-to-RDF pipeline flow diagram
2. SPARQL query/result cards with syntax highlighting
3. Ontology class-link mini graph
4. SHACL validation badge/violation summary
5. Spatial adjacency/mesh overlay thumbnails
6. Hierarchy (Miller Columns) snapshot
7. Performance comparison chart (Oxigraph vs rdflib, 34-64x)
8. Work-package/timeline miniature

## Notable

### Unique Technical Achievements
- **Golden Query System**: 40 SPARQL queries as baseline across both backends (Oxigraph, rdflib). Automated comparison ensures data integrity during backend transitions
- **Shadow/Canary Pattern**: Zero-downtime backend cutover system. Gradual traffic shifting from rdflib to Oxigraph with automated result comparison
- **PropertyValue Reification**: 414K property values preserved via RDF reification. Restores context lost during IFC export
- **NL2SPARQL Evidence Chain**: LLM-generated SPARQL with ontology provenance tracking. Transparent debugging and audit trail
- **Pluggable Triple Store**: `BaseTripleStore` interface with 3 implementations (Oxigraph, rdflib, GraphDB). Runtime selection via env var
- **Delta Update Engine**: Hash-based diff, manifest persistence, SPARQL INSERT/DELETE patches. Replaces 5-minute full reloads with sub-second incremental updates

### Observations
- **Backend default mismatch**: Code defaults to `oxigraph` (`src/storage/__init__.py:16`), Compose defaults to `local` (`docker-compose.yml:11`), `.env.example` defaults to `rdflib` (`.env.example:8`)
- **Dashboard monolith**: 13,129 LOC single JS file (`src/dashboard/app.js`). No framework, vanilla JS
- **Coverage threshold 35%**: Conservative compared to industry 70-80% (`--cov-fail-under=35`)
- **Dependency split**: Core deps in `pyproject.toml`, extra deps in `requirements.txt`. Some optional imports at runtime (ifcopenshell, trimesh)
- **Large spatial module**: `src/api/routes/spatial.py` is 1,765 LOC (route concentration)

### Further Investigation Needed
- GraphDB profile utilization: performance/operations trade-off analysis
- IFC pipeline vs CSV pipeline data consistency verification
- Spatial Index divergence between CSV mode and SPARQL mode

## Stack Summary

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

## Project Scale

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

## Analysis Agents

| Agent | CLI | Model | Output |
|-------|-----|-------|--------|
| code-analyst | Codex | gpt-5.3-codex (xhigh) | architecture.md (489 lines) |
| story-analyst | Claude | claude-opus-4-6 | narrative.md (219 lines) |
| stack-detector | Codex | gpt-5.3-codex (xhigh) | stack-profile.md (285 lines) |
