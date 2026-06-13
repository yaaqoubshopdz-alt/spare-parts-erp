import { test } from 'vitest';
import path from 'path';
import os from 'os';

test('print actual schema on disk', () => {
  const dbPath = path.join(os.homedir(), 'AppData', 'Roaming', 'spare-parts-erp', 'SparePartsERP', 'spare_parts.db');
  console.log('--- DIAGNOSTIC INFO ---');
  console.log('DB Path:', dbPath);

  let Database;
  try {
    Database = require('better-sqlite3');
  } catch (error) {
    console.warn('[db_diagnostic] better-sqlite3 is not loadable in this Node runtime; skipping diagnostic print.', error);
    return;
  }

  let db;
  try {
    db = new Database(dbPath);
  } catch (error) {
    console.warn('[db_diagnostic] Could not open diagnostic database; skipping diagnostic print.', error);
    return;
  }

  const salesSchema = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='sales_invoices'").get() as any;
  console.log('sales_invoices table structure:');
  console.log(salesSchema ? salesSchema.sql : 'NOT FOUND');
  
  const purchaseSchema = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='purchase_invoices'").get() as any;
  console.log('purchase_invoices table structure:');
  console.log(purchaseSchema ? purchaseSchema.sql : 'NOT FOUND');
  
  db.close();
});
