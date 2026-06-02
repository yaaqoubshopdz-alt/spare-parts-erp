# Project Rules

## Permanent Rules (Do Not Break)
- Electron: `contextIsolation: true`, `sandbox: true`, `nodeIntegration: false`
- Database: SQLite3 via better-sqlite3 (local, no cloud, no sync)
- SQL: Prepared statements only, no string interpolation
- Transactions: Multi-table operations wrapped in `db.transaction()`
- Financial: Always use `roundTo2()` for monetary calculations
- i18n: All UI text in `ar.json` and `fr.json`, no hardcoded strings
- IPC: Every channel whitelisted in `electron/preload.ts`
- Build: Run `npm run build` after all modifications
- No cloud: Supabase, Firebase, or remote services forbidden
- No sync: No cloud sync, replication, or multi-device sync

## Architecture Constraints
- Offline-first: App must work with zero network connectivity
- Single SQLite file: `database.sqlite`
- No new state frameworks beyond Zustand
- No new styling systems beyond Tailwind CSS
- No new backend services; keep ERP local only
- Component reuse: Extend existing, don't rebuild

## Security Constraints
- Passwords hashed with bcrypt (cost 12), no plaintext storage
- Access checks in IPC handlers (main process), not just UI
- No hardcoded credentials or API keys
- No arbitrary code execution via IPC
- Validate all user inputs before database operations

## Quality Constraints
- TypeScript strict mode enabled
- Linter: ESLint max-warnings 0 (zero warnings)
- Tests: Vitest for unit/integration tests
- Build must pass `npm run build` with no errors
- No unused imports; keep codebase clean

## Process Rules (Strict)
- **ANALYSIS FIRST**: Never write code before analyzing requirements and creating a plan
- **TS/IPC ERROR**: If a TypeScript error or IPC channel mismatch is encountered, STOP everything, analyze the root cause, and fix before proceeding
- **Bulbul Constitution**: Every edit MUST comply with `BULBUL_CONSTITUTION.md` — mandatory, non-negotiable

## Naming Conventions
- Directories: kebab-case (`src/features/my-module/`)
- Components: PascalCase (`MyComponent.tsx`)
- Functions: camelCase (`doSomething()`)
- Constants: UPPER_SNAKE_CASE (`MAX_RETRIES`)
- Database columns: snake_case (`product_id`, `created_at`)

