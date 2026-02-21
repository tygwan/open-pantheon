# References

Design patterns extracted from existing portfolio sites.

## Source Projects

| Project | Path | Patterns |
|---------|------|----------|
| frontend-template | `/home/coffin/dev/frontend-template/` | Terminal aesthetic, JetBrains Mono, dark theme tokens |
| n8n site | `/home/coffin/dev/n8n/site/` | Dashboard layout, node-type colors, glassmorphism cards |
| DXTnavis site | `/home/coffin/dev/DXTnavis/site/` | Tailwind dual-theme, clean landing, animation utilities |
| portfolio | `/home/coffin/dev/portfolio/` | TypeScript data models, timeline, resume structure |
| openfolio | `/home/coffin/dev/openfolio/` | Agent definitions, agentic loop pattern, OEF schema |

## Key Patterns

### CSS Token System
- Semantic naming: `--bg-primary`, `--text-secondary`, `--accent` over color names
- Hierarchical: category → role → variant (e.g., `--pn-bg-card`)
- All tokens under single prefix (`--pn-`)

### Data-Driven Components
- TypeScript interfaces define data shape
- Components receive data as props, no hardcoded content
- Single source of truth in `content.json`

### Agent Pipeline
- Sequential phases with clear input/output contracts
- Parallel execution within phases (Phase 1: 3 agents)
- Evidence-based validation (file:line references)
