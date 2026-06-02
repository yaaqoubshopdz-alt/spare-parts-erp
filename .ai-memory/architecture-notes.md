# Architecture Notes

## Core Architecture
- **Desktop**: Electron + React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS with CSS variable theming
- **State**: Zustand for local/feature state
- **Database**: SQLite via better-sqlite3 (local only, no cloud)
- **Security**: contextIsolation + preload IPC whitelist + sandbox mode

## IPC Patterns
- All Main↔Renderer communication via `window.electronAPI` (preload)
- Channel naming: `db:<entity>:<action>`, `icount:*`, `accounting:*`
- Every IPC handler must return `{ success: boolean, data?, error? }`
- Whitelist all channels in `electron/preload.ts` before use
- Never enable nodeIntegration or bypass contextIsolation

## Database Rules
- Use prepared statements only; no string concatenation in SQL
- Transactions for multi-table operations (invoices, inventory updates)
- Location-based inventory movement (`location_id` tracking)
- Foreign keys enabled, WAL mode for SQLite
- Schema source of truth: `database/schema/*.schema.ts`

## Component Structure
- Small, focused components in `src/features/<module>/components/`
- Shared atoms in `src/shared/components/`
- Hooks in `src/hooks/`
- Utils in `src/shared/utils/` (reuse before adding)
- No monolithic page files; split into sub-components

## Financial Calculations
- MANDATORY: Use `roundTo2()` from `src/shared/utils/calculations.ts`
- Never use floating-point arithmetic without rounding
- Use `toFixed()` only for display, not in calculations
- Every financial operation: `Math.round(value * 100) / 100`

## Translation System
- i18n keys in `src/i18n/ar.json` (Arabic, RTL) and `src/i18n/fr.json` (French, LTR)
- No hardcoded strings in component files
- Use `useTranslation()` hook for string lookup
- Always add translations before shipping

## Module Boundaries
- `src/features/sales/`, `src/features/purchases/`, `src/features/inventory/`, etc.
- Each module has isolated state, components, and business logic
- Shared utils and components in `src/shared/`
- Keep modules independent; reuse via shared utils only

## Services
- Database service: `electron/services/database.service.ts`
- Auth service: `electron/services/auth.service.ts`
- IPC handlers register in `electron/main.ts` and map to services

