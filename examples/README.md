# Examples

Example workspace outputs demonstrating the foliocraft pipeline.

## Planned Examples

After running `/craft` on target projects:

| Project | Template | Status |
|---------|----------|--------|
| n8n | sveltekit-dashboard | Pending |
| DXTnavis | astro-landing | Pending |

## Workspace Structure Example

```
workspace/n8n/
├── analysis/
│   ├── architecture.md    ← code-analyst output
│   ├── narrative.md       ← story-analyst output
│   ├── stack-profile.md   ← stack-detector output
│   └── SUMMARY.md         ← Lead summary
├── design-profile.yaml    ← Phase 2
├── content.json           ← Phase 3
├── tokens.css             ← Phase 3
└── site/                  ← Built project (gitignored)
```
