# Tech Stack

## Runtime & Build

| Layer | Technology |
|-------|-----------|
| Desktop wrapper | Electron 28 (`contextIsolation: true`, no `nodeIntegration`) |
| Frontend framework | React 18 + TypeScript 5.3 |
| Build tool | Vite 5 (`vite-plugin-electron` + `vite-plugin-electron-renderer`) |
| Styling | Tailwind CSS 3.4 (utility-first, no manual CSS except `index.css` exceptions) |
| Package manager | npm |

## Key Libraries

| Purpose | Library |
|---------|---------|
| State management | Zustand 4.4 (with `persist` middleware for app settings) |
| Routing | React Router 6 |
| Forms & validation | React Hook Form 7 + Zod 3 |
| Local database | better-sqlite3 (WAL mode, synchronous API, main process only) |
| ORM / schema | Drizzle ORM + Drizzle Kit |
| UI components | Radix UI primitives + custom components |
| Icons | Lucide React + React Icons |
| Charts | Recharts |
| Tables | TanStack Table v8 + TanStack Virtual |
| Animations | Framer Motion |
| i18n | i18next + react-i18next |
| PDF export | jsPDF + jspdf-autotable |
| Excel export | xlsx |
| Barcode | react-barcode + @ericblade/quagga2 |
| Notifications | Sonner + react-hot-toast |
| Date utilities | date-fns |
| Number formatting | numeral |
| Scheduling | node-schedule |
| Persistence (Electron) | electron-store |
| Password hashing | bcryptjs (cost factor 12) |
| Testing | Vitest + Chai |

## TypeScript Path Aliases

```
@/*        → src/*
@electron/* → electron/*
@db/*      → database/*
```

## IPC Communication Pattern

All renderer ↔ main process communication goes through `window.electronAPI.invoke(channel, ...args)`.  
Allowed channels are whitelisted in `electron/preload.ts` and defined as constants in `src/constants/config.ts` (`IPC_CHANNELS`).  
**Never add a new IPC channel without updating both files.**

## Database

- Engine: SQLite via `better-sqlite3` (main process only, never imported in renderer)
- Schema defined with Drizzle ORM in `database/schema/`
- All queries use **prepared statements** — no string concatenation in SQL
- Multi-step operations (invoices, stock updates) must use `db.transaction(() => { ... })()`

## Fonts

| Font | Usage |
|------|-------|
| Cairo | Arabic text |
| Inter | French / Latin text |
| JetBrains Mono | Financial numbers, codes |

## Common Commands

```bash
# Development (Electron + Vite hot reload)
npm run dev

# Production build (tsc + vite build + electron-builder)
npm run build:win

# Lint
npm run lint

# Tests (single run)
npx vitest --run

# DB schema generation
npm run db:generate

# DB migration
npm run db:migrate
```

## Build Output

| Path | Contents |
|------|---------|
| `dist/renderer/` | Vite-built React app |
| `dist/electron/` | Compiled Electron main + preload |
| `release/` | Final Windows installer (NSIS) |
