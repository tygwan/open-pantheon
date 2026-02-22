# bim-ontology — Project Narrative

## Project Origin & Purpose

**bim-ontology** is an ambitious semantic BIM (Building Information Modeling) pipeline that transforms raw construction data into queryable, reasoning-capable knowledge graphs. Born from frustration with data loss and integration brittleness in traditional BIM export workflows, the project converts Industry Foundation Classes (IFC) files and Navisworks CSV exports into RDF ontologies that can answer complex questions about building structure, properties, and relationships through SPARQL queries.

The core problem the project solves is profound: IFC exporters and Navisworks data pipelines leak critical information—hierarchical relationships collapse, property contexts disappear, identification becomes unstable. Engineers need to know not just "what elements exist," but "what rooms are adjacent to this space?" and "which components share a system?" The bim-ontology solution uses semantic web standards (OWL, RDFS, SHACL, SPARQL) to restore this lost context and add reasoning capability that wasn't possible with raw IFC data.

The vision extends beyond a technical tool: it's establishing **construction intelligence as a solved problem domain**. By layering semantic reasoning, automated validation (SHACL), and natural language query capabilities (NL2SPARQL) on top of standardized RDF representations, the project positions BIM ontologies as the foundation for autonomous construction analytics.

## Evolution Timeline

The project's evolution spans **61 commits across ~3 weeks** (February 3-18, 2026), concentrated in a structured MVP execution phase:

### Phase 1: Foundation Week (Feb 3-4)
- **Commit 9d57fbe** (Feb 3): "implement IFC to RDF ontology conversion pipeline" — the first commit, establishing the core ETL backbone
- Commits 18120f1, 9f297fb (Feb 9): Introduction of MVPStructure and 12-week development planning with comprehensive Codex-generated specification
- **Key milestone**: 40 "Golden Queries" defined as the quality baseline — 40 SPARQL test queries across 5 semantic categories (Statistics, Hierarchy, Properties, Spatial, Cross-domain), each validated against both rdflib and Oxigraph backends. This represents a shift from "it works on my machine" to machine-verified semantic contracts.

### Phase 2: Intelligence Acceleration (Feb 9-10)
- **Commit bd54d70** (Feb 9): "implement Golden Query 40 test harness" — automated test infrastructure for baseline validation
- **Commit c2898fb** (Feb 9): "implement Shadow/Canary execution mode" — introduces safe backend cutover patterns, allowing Oxigraph to shadow rdflib queries before production traffic
- **Commit e4664ff** (Feb 9): "implement SHACL v1 core rules with 15 shapes" — data quality validation through semantic schemas
- **Commit 9a2dec0** (Feb 9): "switch default backend to Oxigraph + ops API" — committed to modern Rust-based triple store (34-64x faster than rdflib)
- **Commit 47c2d8b** (Feb 10): "implement NL2SPARQL pipeline with LLM providers and dashboard UI" — enables business users to ask questions in English/Korean, auto-translated to SPARQL
- **Commit ea68b52** (Feb 10): "implement MCP v0 server with resources, tools, and prompts" — AI agent integration layer (Model Context Protocol)

### Phase 3: Production Hardening (Feb 10)
- **Commit 234efba** (Feb 10): "implement Delta Update engine with manifest, diff, patch, reconciler" — replaces full data reloads with surgical incremental updates
- **Commit 4084bc1** (Feb 10): "add Delta ops API endpoints and benchmark harness" — operationalizes delta updates at API level

### Phase 4: Dashboard & Integration (Feb 4-6)
- **Commit e175f85** (Feb 5): "add dxtnavis CSV to RDF converter (MVP)" — bridges Navisworks export tooling into the RDF pipeline
- **Commit ace5f1f** (Feb 5): "add Hierarchy visualization tab to dashboard" — Miller Columns UI for hierarchical exploration
- **Commit 2a409d5** (Feb 6): "add Navisworks Miller Columns drill-down, property aggregation, and dashboard guide"
- **Commit 6e1fb1e** (Feb 6): "add UnifiedExport CSV v2 converter with geometry support"

### Phase 5: Spatial & Validation (Feb 15-18, current)
- **Commit 2f945cd** (Feb 18): "feat(spatial): add CSV-based hierarchy index and spatial API"
- **Commit adf143a** (Feb 18): "feat(dashboard): implement Validation UX Phase A+B"
- **Commit 49e5f40** (Feb 18): "feat(validation): batch annotate API + stable layout updates"
- **Latest commits** (Feb 18): Focus on spatial validation edge cases, stale response guards

## Key Milestones

### Milestone 1: Golden Query Baseline (Week 1, Feb 3)
**What**: Defined 40 SPARQL queries covering all semantic domains, with expected results captured as JSON snapshots.
**Why**: Establishes machine-verifiable contracts. Any backend can claim "SPARQL compliant," but not every backend returns identical results across complex queries involving hierarchy traversal, numeric aggregation, and multi-predicate joins.
**Impact**: Enables safe backend switching (Shadow/Canary) and prevents silent data corruption during refactoring.

### Milestone 2: Oxigraph Cutover (Week 4, Feb 9)
**What**: Successfully switched default triple store from rdflib (Python, slower) to Oxigraph (Rust, 34-64x faster).
**Why**: rdflib became a bottleneck; Oxigraph + Spargebat SPARQL optimizer could handle 2.8M triple dataset with p95 latency < 517ms.
**Technical Achievement**: Implemented Shadow/Canary pattern to run both backends in parallel, compare results, and gradually shift traffic. Zero production outages during transition.
**Impact**: From a 5-minute page load to near-instant query response. Unlocked real-time dashboard interactions.

### Milestone 3: Natural Language Interface (Week 6, Feb 10)
**What**: Integrated NL2SPARQL pipeline enabling English/Korean natural language queries.
**How**: Schema retriever extracts entity/predicate mappings → LLM generates SPARQL → Static validator catches injection attacks → Query executes → Evidence chain recorded.
**Significance**: Breaks the "SPARQL is only for experts" ceiling. Domain experts (project managers, safety engineers) can now ask questions in English/Korean without learning SPARQL syntax.
**Implementation**: 7 Python modules, 39 unit tests, multi-provider support (Anthropic, OpenAI).

### Milestone 4: AI Integration via MCP (Week 8, Feb 10)
**What**: Model Context Protocol v0 server exposing BIM data as structured resources and tools.
**Resources**: Dataset summary, ontology prefixes, element details, latest validation results.
**Tools**: search_elements, get_properties, run_select_sparql, get_validation_issues.
**Prompts**: Pre-written system prompts for Korean/English NL2SPARQL, root cause analysis.
**Impact**: Claude, Gemini, and other AI agents can now autonomously query and reason about BIM data without human-written SQL/SPARQL.

### Milestone 5: Incremental Updates (Week 10-12, Feb 10)
**What**: Delta Update engine that replaces full TTL reloads with smart diffs.
**Problem Solved**: Inserting 5 new properties into a 2.8M-triple store previously required reloading the entire dataset (5 minutes). Delta approach: compute diff, generate patches, reconcile in seconds.
**Architecture**: Manifest (metadata hash) → Diff Engine (old vs new) → Patch Builder (SPARQL INSERT/DELETE) → Reconciler (consistency check).

### Milestone 6: Spatial Validation Framework (Week 15-18, Feb 18, in progress)
**What**: Integration of 3D spatial geometry with BIM topology.
**Components**:
  - BBox collision detection (axis-aligned bounding box overlap)
  - Adjacency index (which elements touch/overlap/near each other)
  - Connected components (transitive grouping of adjacent zones)
  - Mesh collision (real mesh vs simplified BBox comparison)
**Dashboard**: Spatial Validation tab with Y/N/Skip verdicts on edges, color-coded 3D visualization, batch annotation API.
**Real-world Use**: Identify constraint violations (pipes inside walls), optimize MEP routing, validate contractor-reported "clashes."

## Technical Challenges Solved

### Challenge 1: Data Loss Through Export Pipelines
**Problem**: IFC export loses parent-child relationships, property contexts, and type information. Navisworks export preserves some structure but uses unstable object IDs.
**Solution**:
  - Built dual-path import (IFC + CSV) with fallback strategy
  - Navisworks CSV → RDF converter extracts ObjectId, ParentId, Level, Properties
  - Name-based category inference (29 patterns) recovers type information
  - PropertyValue reification (414K values in v3) restores property context
**Evidence**: `src/converter/` modules, 12,009 objects × 9 hierarchy levels preserved

### Challenge 2: Query Consistency Across Multiple Backends
**Problem**: rdflib and Oxigraph produce different results on complex queries (blank nodes, ORDER BY, aggregate functions vary).
**Solution**:
  - Golden Query framework: 40 canonical SPARQL queries with Oxigraph as ground truth
  - Unit tests verify both backends match on every query
  - `tests/test_golden_queries.py`: 40/40 tests, 12.7s runtime
  - Identified rdflib limitations (non-deterministic LIMIT, weak SPARQL optimization) documented

### Challenge 3: Real-time Interactivity on Large Datasets
**Problem**: 2.8M triple dataset + rdflib SPARQL → 65ms cold query + result materialization. Dashboard needed sub-100ms interaction.
**Solution**:
  - Oxigraph backend (Rust SPARQL engine) reduced base latency to 4-20ms
  - LRU cache with TTL for hot queries (14,869x speedup for cached paths)
  - Shadow/Canary pattern enabled migration without downtime
  - Results: p99 < 517ms on complex hierarchy queries

### Challenge 4: Stable Object Identification Across Tools
**Problem**: Navisworks InstanceGuid ≠ IFC GlobalId ≠ custom ID assignments. Downstream systems (scheduling, cost allocation) break on ID instability.
**Solution** (from DXTnavis integration):
  - Synthetic ID fallback chain: InstanceGuid → Item GUID → Authoring ID → Path Hash
  - Deterministic (same input = same ID) but resilient to tool updates
  - CSV exchange format locks ObjectId contract
  - Enables stable parent-child mapping for scheduling integration

### Challenge 5: Semantic Data Quality at Scale
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

### Challenge 6: Making Semantic Queries Accessible
**Problem**: SPARQL syntax barrier. Project managers can't ask "What's the total weight of all pipes in Zone A?" without learning SPARQL.
**Solution**:
  - NL2SPARQL: English/Korean → SPARQL translation via Claude/GPT
  - Schema Retriever extracts entity/predicate mappings from ontology
  - Static Validator catches injection attacks (forbidding UNION, DROP, DELETE in user queries)
  - Evidence chain records which ontology facts informed the translation
  - Dashboard SPARQL tab with NL input box, template library, query history

## Impact & Value Proposition

### Who Benefits
1. **BIM Managers & Coordinators**: "Show me all coordination issues between MEP trades" — solved via adjacency queries + spatial validation
2. **Safety Engineers**: "Which elements violate fall protection requirements?" — solved via SHACL + custom reasoning rules
3. **Cost/Schedule Planners**: "What's the critical path for this system?" — solved via delta injection of schedule data + path traversal
4. **AI/Automation Teams**: MCP server enables autonomous agents to query BIM without human-written queries
5. **Research Community**: 2.8M triples + SPARQL endpoint for BIM research (papers on ontology fusion, code compliance automation)

### Unique Value Propositions
1. **Complete Data Fidelity**: Preserves parent-child relationships, properties, and type information that IFC export loses
2. **Reasoning + Validation**: OWL/RDFS rules + SHACL shapes enable automated inconsistency detection
3. **Fast, Modern Tech**: Oxigraph (Rust) vs rdflib (Python) is a 30-60x performance leap
4. **Multi-Channel Access**: SPARQL API, NL2SPARQL, MCP, Dashboard, Python client all use the same semantic knowledge base
5. **Safe Operations**: Shadow/Canary cutover patterns, Delta updates, and golden queries enable confident production usage

### Quantified Impact
- **Data Scale**: 2.8M triples from 12,009 objects × 9 hierarchy levels (Navisworks AllHierarchy CSV, 76 MB input)
- **Query Performance**: p95 < 517ms on complex queries (vs 5min+ with naive IFC processing)
- **Test Coverage**: 176 tests across 17 files, 15s runtime. Golden Query baseline: 40 queries, 100% consistency
- **Developer Velocity**: 61 commits in 3 weeks (MVP), structured phases with clear gates (Gate A/B/C/D passed)
- **Reasoning Capacity**: 15 SHACL shapes, OWL/RDFS reasoner, 39 NL2SPARQL unit tests

## Current Status & Roadmap

### Project Maturity
- **Active Development**: MVP 12-week plan (Feb 9 — May 3), currently Week 16
- **Phase Completion**: Phases 1-4 complete (100% each), Phase 5 in progress (55%)
- **Stability**: All gates passed (Gate A: Oxigraph cutover, Gate B: NL2SPARQL/MCP, Gate C: Delta engine, Gate D: Validation UX)
- **Code Health**: 11,082 lines of Python, 176 tests, ~35% coverage (intentionally conservative CI threshold)

### Current Phase (Phase 5: Spatial & Validation)
- Spatial adjacency indexing from CSV hierarchy
- Validation UX (Edges, Groups, Mesh collision sub-tabs)
- Batch annotation API for edge verdicts
- Connected component auto-computation
- 3D spatial visualization (Blue/Orange for source/target, Red/Green/Cyan for Overlap/Touch/Near)

### Immediate Roadmap (Weeks 17-22)
- Phase 5 completion: Mesh collision refinement, validation report export
- Production hardening: Error handling, graceful degradation, logging
- Documentation: API guide, MCP integration examples, SHACL rule authoring
- Performance tuning: Benchmark suite, profile critical paths

### Future Horizons (Post-MVP)
- **Phase 6+**: Multi-project federation (query across building portfolio)
- **Data Integration**: Schedule injection (4D), cost injection (5D), AWP (Activity Work Package) synchronization
- **AI Extensions**: Autonomous reasoning agents for compliance checking, auto-generated design alternatives
- **Ecosystem**: Public SPARQL endpoint, linked data federation with industry standards (ifcOWL, BuildingSMART)
- **Research**: Papers on BIM ontology fusion, semantic code compliance automation

## Project Identity & Personality

**bim-ontology** is a **research-meets-production project**. It carries the DNA of academic semantic web work (OWL, SHACL, SPARQL) but is relentlessly focused on real construction data and practitioner workflows.

The project's personality emerges in several ways:

1. **Meticulous Documentation**: Every feature is documented with evidence (file paths, line numbers). The PROJECTS.json includes "whatWasDone" + "evidence" pairs, bridging spec and implementation.
2. **Experimental Rigor**: Golden Queries, Shadow/Canary patterns, and Delta engines are deployed only after proving equivalence/safety with prior state.
3. **Multi-Persona Design**: SPARQL editor for data engineers, NL2SPARQL for domain experts, MCP for AI agents, Miller Columns for visual explorers.
4. **Iterative Refinement**: The MVP structure (3 phases, 12 weeks, 4 gates) shows willingness to **pivot on evidence**, not speculation.
5. **Ownership Across Domains**: A single developer across IFC parsing, RDF conversion, SPARQL optimization, API design, UI/UX, and research.

## Community & Collaboration

### Contributor Profile
- **Primary Author**: tygwan (57/61 commits) — owner-builder model
- **Automation**: GitHub Actions (2 commits) for documentation syncing
- **Organizational**: Part of broader ecosystem (bim-ontology + dxtnavis companion projects)

### Knowledge Artifacts
- **CONTRIBUTING.md**: Python 3.12+ with type hints, Korean docstrings, Conventional Commits, 176 tests required
- **PROJECTS.json**: Meta-documentation format (schema-driven, evidence-backed) for portfolio generation
- **Docs Structure**: `/docs/mvp/`, `/docs/phases/`, `/docs/technical/`, `/docs/guides/`, `/docs/research/`

## Story Summary

**bim-ontology** is a 3-week MVP that solves a 20-year BIM data problem: how to recover lost information from proprietary export formats and enable semantic reasoning over building data. By layering RDF ontologies, SPARQL queries, SHACL validation, and natural language interfaces on top of Navisworks CSV and IFC files, the project transforms raw hierarchical data into a queryable, reasoning-capable knowledge base. The technical execution is meticulous—Golden Query baselines ensure correctness, Shadow/Canary patterns enable safe cutover, and Delta updates replace slow full reloads with surgical patches. The breadth is impressive: a 13-tab dashboard, 40+ API endpoints, MCP server integration, and NL2SPARQL natural language support all feed from a single RDF backend, creating a unified construction intelligence platform that bridges research (semantic web standards) and production (real Navisworks projects). The project's identity is one of experimental rigor paired with relentless practicality—every feature is measured, every decision is evidence-driven, and every workflow (data engineer, domain expert, AI agent, visual explorer) is supported.
