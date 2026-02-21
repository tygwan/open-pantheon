# sveltekit-dashboard

SvelteKit template for interactive dashboard-style portfolio pages.

## When to use

- Workflow visualization (n8n, CI/CD tools)
- Interactive dashboards with animations
- Projects needing scroll reveal, hover effects, transitions

## Stack

- **SvelteKit** with `adapter-static` for SSG
- **Svelte 5** runes syntax
- **CSS custom properties** via `tokens.css` (`--pn-*` prefix)
- **content.json** for data-driven rendering

## How it works

1. `page-writer` copies this template to `workspace/{project}/site/`
2. Replaces `src/lib/styles/tokens.css` with generated design tokens
3. Replaces `src/lib/data/content.json` with project content
4. Adds section components as needed

## Development

```bash
npm install
npm run dev      # localhost:5173
npm run build    # → build/
npm run preview  # localhost:4173
```
