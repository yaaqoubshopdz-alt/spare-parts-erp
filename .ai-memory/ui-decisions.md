# UI Decisions

## Theme System
- Dark-first professional theme (light mode secondary)
- CSS variables in `src/index.css` with Tailwind rgb() integration
- No hardcoded colors; always use theme variables
- Preserve current desktop ERP look and feel
- **GOLDEN COLORS ARE FORBIDDEN** — no amber, gold, yellow-orange tones anywhere
- **No flashy/bright accent colors** — keep muted, calm, professional palette
- Match the calm aesthetic of Purchase Invoice page

## Layout Patterns
- Desktop window: frameless, transparent, contextIsolation enabled
- Main layout: sidebar navigation + content area
- Forms: vertical stack, compact spacing
- Tables: sortable columns with 3-state toggle (ASC → DESC → RESET)
- Modals: centered, avoid oversized dialogs

## Spacing & Grid
- Reuse existing Tailwind spacing from current components
- Match current Purchase and Sales page spacing
- Keep button sizes and padding consistent
- No new design systems or CSS frameworks

## Header & Navigation
- Consistent toolbar with icon buttons
- Breadcrumb or title area per page
- Action buttons grouped by functionality
- Preserve existing icon library and sizes

## Pagination & Lists
- Use current table sorting and filtering patterns
- Keep list rows consistent height
- Reuse existing column width logic
- No new pagination UI frameworks
- **REAL pagination only** (offset/limit based) — never infinite scroll
- Pagination controls at bottom of tables (page numbers, prev/next)

## Forms & Inputs
- Match existing form field heights and spacing
- Validation errors inline or under field
- Required indicator consistent with current style
- Keep form layouts vertical and readable

