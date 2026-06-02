# Project Structure

## Root Layout

```
spare-parts-erp/
├── electron/          # Main process (Node.js / Electron)
├── src/               # Renderer process (React)
├── database/          # DB schema (Drizzle ORM)
├── dist/              # Build output (gitignored)
├── release/           # Packaged installer output
├── index.html         # Vite entry point
├── vite.config.ts
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

## `electron/` — Main Process

```
electron/
├── main.ts            # App entry, window creation, IPC registration
├── preload.ts         # IPC whitelist exposed to renderer via contextBridge
├── ipc/               # One file per domain, registers IPC handlers
│   ├── sales.ipc.ts
│   ├── purchases.ipc.ts
│   ├── inventory.ipc.ts
│   └── ...            # (batches, cashbox, catalog, dashboard, expenses,
│                      #  parties, print, products, reports, returns,
│                      #  settings, users, vehicles)
└── services/
    ├── database.service.ts   # SQLite connection, migrations, WAL setup
    └── auth.service.ts       # Login, session, bcrypt verification
```

**Convention**: Each IPC file handles one domain. Handlers call `database.service` directly using prepared statements. Never import `better-sqlite3` in the renderer.

## `src/` — Renderer Process

```
src/
├── main.tsx           # React entry, i18n init, router setup
├── App.tsx            # Root component, route definitions
├── index.css          # Global CSS (minimal — only what Tailwind can't do)
│
├── features/          # One folder per app module (page-level components)
│   ├── auth/          # LoginPage
│   ├── sales/         # POSPage, SalesPage
│   ├── purchases/     # PurchasesPage, PurchaseFormPage
│   ├── inventory/     # InventoryPage, modals
│   ├── parties/       # Customers, Suppliers pages + modals
│   ├── returns/       # ReturnsPage
│   ├── cashbox/       # CashboxPage
│   ├── expenses/      # ExpensesPage
│   ├── reports/       # ReportsPage
│   ├── vehicles/      # VehiclesPage
│   ├── dashboard/     # DashboardPage
│   └── settings/      # SettingsPage
│
├── shared/
│   ├── components/
│   │   ├── ui/        # Reusable UI primitives (buttons, inputs, modals…)
│   │   ├── layout/    # Sidebar, topbar, page shell
│   │   ├── print/     # Print-specific components
│   │   └── providers/ # Context providers (theme, i18n, etc.)
│   └── utils/
│       ├── calculations.ts   # roundTo2() and all financial math
│       ├── formatters.ts     # Currency, date, number display helpers
│       ├── invoice-number.ts # Invoice number generation
│       └── validators.ts     # Shared Zod schemas / validation helpers
│
├── store/
│   ├── app.store.ts   # Language, theme, sidebar state (persisted)
│   └── auth.store.ts  # Authenticated user, login/logout actions
│
├── hooks/
│   └── useAuth.ts     # Auth guard hook
│
├── constants/
│   └── config.ts      # APP_CONFIG constants + IPC_CHANNELS enum
│
├── types/
│   ├── database.types.ts  # TypeScript types mirroring DB schema
│   ├── electron.d.ts      # window.electronAPI type declaration
│   └── ui.types.ts        # Shared UI prop types
│
├── i18n/
│   ├── ar.json            # Arabic translations
│   ├── fr.json            # French translations
│   └── i18n.config.ts     # i18next configuration
│
└── utils/
    └── calculations.ts    # (legacy path — prefer src/shared/utils/calculations.ts)
```

## `database/` — Schema

```
database/
└── schema/
    ├── index.ts           # Re-exports all schemas
    ├── products.schema.ts
    ├── inventory.schema.ts
    ├── invoices.schema.ts
    ├── users.schema.ts
    ├── finance.schema.ts
    ├── returns.schema.ts
    ├── vehicles.schema.ts
    ├── categories.schema.ts
    ├── brands.schema.ts
    ├── units.schema.ts
    ├── locations.schema.ts
    ├── app_settings.schema.ts
    └── system.schema.ts
```

## Key Conventions

- **Feature isolation**: Each module in `src/features/` is self-contained. Shared logic goes in `src/shared/`.
- **IPC channel names**: Follow the pattern `domain:action` (e.g. `db:sales:create`, `auth:login`). All channels are declared in `src/constants/config.ts`.
- **Financial calculations**: Always use `roundTo2()` from `src/shared/utils/calculations.ts`. Never use `toFixed()` for math.
- **Translations**: All user-visible strings go through `i18next` (`t('key')`). Keys are defined in `ar.json` and `fr.json`.
- **Styling**: Tailwind utility classes only. Colors come from `tailwind.config.ts` tokens (e.g. `bg-primary_blue`, `text-danger_red`). No hardcoded hex values in components.
- **DB access**: Only the main process (`electron/`) touches `better-sqlite3`. Renderer communicates exclusively via IPC.
