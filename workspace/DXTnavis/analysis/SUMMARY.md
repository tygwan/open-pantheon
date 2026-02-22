# DXTnavis Analysis Summary

> Lead synthesis | 2026-02-22
> Source: architecture.md, narrative.md, stack-profile.md

---

## Key Insights

- **Navisworks 2025 plugin** for BIM property management and 4D construction simulation automation. A desktop C#/WPF application (not web), tightly coupled to the Autodesk Navisworks runtime environment.

- **18,916 LOC of C#** across 58 source files, developed in an intensive 44-day sprint (2025-12-29 to 2026-02-10) with 16 development phases and 40 commits. The velocity is exceptional -- roughly one major feature release every 3 days.

- **Core differentiator**: The AWP 4D Automation Pipeline -- a 5-phase workflow (CSV -> Object Matching -> Property Write -> Selection Set -> TimeLiner Task) that reduces manual 4D simulation setup from a multi-hour process to one-click execution. Evidence: `Services/AWP4DAutomationService.cs:51-300`

- **Critical performance innovation**: Grouped data structure refactoring (Phase 12) that reduces 445K individual property records to ~5K object groups, solving the WPF data binding performance wall. Evidence: `Models/ObjectGroupModel.cs`, `CHANGELOG.md [1.0.0]`

- **Dual API strategy**: Uses .NET API for reads and COM API for writes, working around Navisworks' read-only .NET API limitation for property write operations. This is documented in ADR-001.

- **Active frontier**: Geometry export (BoundingBox/Centroid/Mesh) and Unified CSV for knowledge graph integration, bridging BIM data to external 3D viewers (Three.js, CesiumJS) and ontology systems.

- **Professional-grade error handling**: `[HandleProcessCorruptedStateExceptions]` attributes throughout to handle Navisworks' notorious `AccessViolationException`, with retry logic and graceful degradation.

---

## Recommended Template

`astro-landing` -- Professional BIM product landing page

**Rationale**:
1. DXTnavis is a desktop plugin, not a web dashboard -- needs a showcase page, not an interactive demo
2. The project already has an Astro portfolio site (`site/` directory with GitHub Pages deployment)
3. Static content (features, architecture diagrams, screenshots) is the primary content type
4. Clean, professional presentation befitting an enterprise BIM tool
5. Explicitly mapped in CLAUDE.md project-template table

---

## Design Direction

- **Palette**: Dark navy primary (#0d1117) with Autodesk orange (#FF6D00) accent and blueprint blue (#0078D4) secondary. Professional engineering aesthetic -- think Autodesk product pages, not startup landing pages.

- **Typography**: Inter or Space Grotesk for headings (technical precision), IBM Plex Sans for body text, JetBrains Mono for code blocks. No decorative fonts -- this is a professional tool.

- **Layout**: Hero with plugin screenshot, 8-feature card grid, AWP 4D pipeline architecture diagram, development timeline (16 phases), tech stack badges, performance stats (445K->5K optimization highlight).

---

## Notable

1. **No automated tests**: Zero test files. BIM plugin testing requires Navisworks runtime, making CI/CD integration challenging. The project compensates with validation services and DryRun modes.

2. **Disabled ontology features**: Phase 14 (dotNetRdf, Neo4j, FuzzySharp, AngleSharp) is entirely commented out in the .csproj due to assembly loading conflicts with the Navisworks plugin host. This is a significant capability gap.

3. **Korean/English bilingual**: UI labels, CSV column mapping, error messages, and commit messages are bilingual (Korean primary, English for API/technical terms). Portfolio design should accommodate this.

4. **Companion project**: `bim-ontology` (in open-pantheon workspace) is a companion project that consumes the Unified CSV export for knowledge graph construction. The portfolio page should reference this ecosystem.

5. **Plugin deployment model**: The DLL is auto-deployed to `C:\Program Files\Autodesk\Navisworks Manage 2025\Plugins\` via PostBuild script. No separate installer or distribution mechanism.

6. **Existing portfolio site**: There is already an Astro site at `DXTnavis/site/` deployed to GitHub Pages. The craft pipeline should enhance/replace this rather than creating from scratch.
