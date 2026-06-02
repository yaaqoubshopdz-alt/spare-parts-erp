# Product: Spare Parts ERP (نظام إدارة قطع الغيار)

A desktop ERP application for spare parts shops. Manages sales, purchases, inventory, customers, suppliers, expenses, cash box, and reporting.

## Key Characteristics

- **Offline-first**: All data lives in a local SQLite database. No internet required for core operations.
- **Single-store**: One shop, no multi-branch logic.
- **Bilingual UI**: Arabic (RTL, primary) and French (LTR). Arabic is the default language.
- **Desktop only**: Packaged as a Windows installer via Electron + electron-builder.

## User Roles

| Role | Access |
|------|--------|
| `owner` | Full access to everything |
| `manager` | Manages their branch scope |
| `accountant` | Financial operations |
| `cashier` | Sales only |
| `storekeeper` | Inventory only |

## Core Modules

- **Sales / POS** — invoices, confirmations, cancellations
- **Purchases** — supplier invoices, receiving
- **Inventory** — stock levels, adjustments, batch/expiry tracking
- **Returns** — sales and purchase returns
- **Parties** — customers and suppliers with balance tracking
- **Cash Box** — daily open/close, transactions
- **Expenses** — expense recording
- **Reports** — daily sales, profit/loss
- **Settings** — app configuration, users, backup/restore

## Currency

Algerian Dinar (د.ج / DA). All financial values use 2 decimal places via `roundTo2()`.
