const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbPath = path.join(process.env.APPDATA, 'spare-parts-erp', 'SparePartsERP', 'spare_parts.db');
console.log('Inspecting DB at path:', dbPath);

if (!fs.existsSync(dbPath)) {
  console.error('Database file does not exist at path:', dbPath);
  process.exit(1);
}

const db = new Database(dbPath);

try {
  const salesSchema = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='sales_invoices'").get();
  console.log('--- sales_invoices table schema ---');
  console.log(salesSchema ? salesSchema.sql : 'NOT FOUND');

  const purchaseSchema = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='purchase_invoices'").get();
  console.log('--- purchase_invoices table schema ---');
  console.log(purchaseSchema ? purchaseSchema.sql : 'NOT FOUND');

  const triggers = db.prepare("SELECT name, sql FROM sqlite_master WHERE type='trigger'").all();
  console.log('--- triggers ---');
  console.log(JSON.stringify(triggers, null, 2));

} catch (err) {
  console.error('Error querying DB:', err);
}
db.close();
process.exit(0);
