# User Preferences

## Development Workflow
- Prefers execution-first over long explanations
- Values concise, focused code changes
- Wants build verification after modifications
- Dislikes enormous reports and repeated policy statements

## UI/UX Preferences
- Dark, professional Tailwind theme (no bright colors)
- Desktop ERP layout with compact spacing
- Reuse existing Purchase/Sales patterns as reference
- Prefer extending existing UI over rebuilding
- No heavy animation libraries or new design systems
- **HATE golden colors and flashy/bright colors** — strictly avoid them everywhere
- **Calm interface style** similar to Purchase Invoice page (clean, muted, professional)
- **Full-screen utilization** — no wasted space or excessive margins/padding
- **Real pagination only** — never use infinite scroll patterns
- **Buttons must match Purchase/Sales button style** (same component, same spacing, same variants)
- **Inventory system must support automatic session resumption** — never lose a counting session

## Project Approach
- Offline-first, local SQLite only
- No cloud services or sync systems
- Modular, small incremental changes over full rewrites
- Keep files small and focused
- Respect existing naming and folder structure

## Code Style
- TypeScript strict mode
- React hooks with Zustand for state
- Tailwind CSS with CSS variables for theming
- No hardcoded strings (i18n only)
- Prepared SQL statements mandatory

