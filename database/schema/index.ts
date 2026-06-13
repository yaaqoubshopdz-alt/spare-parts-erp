/**
 * Database Schema Index
 * تصدير كل الجداول من ملف واحد
 */

// NF_01: Users
export { users } from './users.schema';

// NF_02: App Settings
export { appSettings } from './app_settings.schema';

// NF_03: Locations
export { locations } from './locations.schema';

// NF_04: Units
export { units } from './units.schema';

// NF_05: Categories
export { categories } from './categories.schema';

// NF_06: Brands
export { brands } from './brands.schema';

// NF_07: Vehicles
export { vehicleBrands, vehicleModels } from './vehicles.schema';

// NF_08: Products
export { products, productBarcodes, productFitments } from './products.schema';

// NF_09: Inventory
export { productBatches, stockBalances, stockMovements } from './inventory.schema';

// NF_10: Invoices
export { salesInvoices, salesInvoiceItems, purchaseInvoices, purchaseInvoiceItems } from './invoices.schema';

// NF_12: Finance
export { customers, suppliers, payments, cashBoxes, cashTransactions, cashClosings, expenses } from './finance.schema';

// NF_13: System
export { numberSequences, priceHistory, auditLog, backupLog } from './system.schema';

// NF_14: Idempotency Keys
export { idempotencyKeys } from './idempotency.schema';

// NF_15: Accounting Engine
export { accounts, costCenters, journalEntries, journalEntryLines } from './accounting.schema';

// NF_16: Inventory Count
export { inventoryCountSessions, inventoryCountItems } from './inventory-count.schema';
export { searchDictionary, productSearchIndex } from './search.schema';

// Mobile Assistant
export { productImages, photoRequests, invoiceCaptures } from './mobile.schema';

