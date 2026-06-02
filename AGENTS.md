# Spare Parts ERP — Agent Guide

## Architecture

- **Desktop ERP** (Electron + React 18 + Vite + Tailwind + SQLite/better-sqlite3)
- 3 build outputs: `dist/renderer/` (React), `dist/electron/main.js`, `dist/electron/preload.js`
- IPC bridge: `electron/preload.ts` whitelists all allowed channels in `ALLOWED_INVOKE_CHANNELS`. New IPC handlers **must** be added to that whitelist or they are silently rejected.
- Directory entrypoints: `electron/main.ts`, `electron/preload.ts`, `src/main.tsx`
- `@/` → `src/`, `@electron/` → `electron/`, `@db/` → `database/`
- No Supabase, no sync, no cloud — fully local SQLite.

## Critical Commands

```bash
npm run build          # tsc && vite build (both renderer + electron + preload)
npm run dev            # vite dev server (renderer only, no Electron)
npm run lint           # eslint --max-warnings 0 (strict)
npm run test           # vitest
```

**Build order matters:** always run `npm run build` (not just vite build) because `tsc` catches type errors first.

## Unique Conventions

- **Theme system**: CSS variables in `src/index.css` (light + `.dark`). Tailwind uses `rgb(var(--var-name) / <alpha-value>)`. Never hardcode colors.
- **Table sorting cycle**: ASC (↑ green) → DESC (↓ red) → RESET (null, server default). 3-state toggle via `useCallback` with `[sortKey]` dep, avoiding nested state updates.
- **Server-side sort**: Pass `sortKey`/`sortDir` via IPC, use `SORT_MAP` to prevent SQL injection.
- **IPC naming**: `db:<entity>:<action>` for CRUD, `icount:*` for inventory count, `accounting:*` for accounting.
- **Window**: frameless (`frame: false`), transparent, `contextIsolation: true`, `sandbox: true`, `nodeIntegration: false`.

## Testing & QA

- Tests use vitest with `environment: 'node'`
- `src/main.tsx` provides a browser mock for `window.electronAPI` when running outside Electron — mocked channels return fake data for development
- No snapshot tests found
- Database: SQLite file at `database.sqlite`

## Key Files to Know

| File | Role |
|---|---|
| `src/index.css` | Light/dark theme CSS variables |
| `src/main.tsx` | React root + Electron API mock for browser dev |
| `electron/main.ts` | App lifecycle, window creation, IPC registration |
| `electron/preload.ts` | IPC channel whitelist (must update when adding channels) |
| `tailwind.config.ts` | Custom theme colors (all reference CSS variables) |
| `src/shared/components/layout/ProInvoiceLayout.tsx` | Shared invoice layout used by POS and purchase form |
| `BULBUL_CONSTITUTION.md` | AI persona and strict coding rules for this project |

## Gotchas

- Adding a new IPC channel? Add to `electron/preload.ts` `ALLOWED_INVOKE_CHANNELS` AND register the handler in `electron/main.ts` `registerAllIPC()` (or a new module called from there).
- SQL in IPC handlers uses `better-sqlite3` (synchronous). Always use `SORT_MAP` pattern for `ORDER BY` — never interpolate column names directly.
- `setSortDir(d => ...)` inside `setSortKey(prev => ...)` is a **nested state update** — don't do it. Use separate state setters with `useCallback` closure instead.
