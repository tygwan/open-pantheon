# astro-landing

Astro template for static product landing / research showcase pages.

## When to use

- Product landing pages (DXTnavis, browser extensions)
- Research/academic showcases (bim-ontology)
- Content-heavy pages with minimal interactivity

## Stack

- **Astro 5** for zero-JS static output
- **Tailwind CSS v4** via `@tailwindcss/vite`
- **CSS custom properties** via `tokens.css` (`--pn-*` prefix)
- **content.json** for data-driven rendering

## How it works

1. `page-writer` copies this template to `workspace/{project}/site/`
2. Replaces `src/styles/tokens.css` with generated design tokens
3. Replaces `src/data/content.json` with project content
4. Adds section components as needed

## Development

```bash
npm install
npm run dev      # localhost:4321
npm run build    # → dist/
npm run preview  # localhost:4321
```
