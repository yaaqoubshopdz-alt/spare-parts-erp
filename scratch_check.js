const Database = require('better-sqlite3');
const path = require('path');
const os = require('os');
const fs = require('fs');

const possibleDirs = [
  path.join(os.homedir(), 'AppData', 'Roaming', 'SparePartsERP', 'spare_parts.db'),
  path.join(os.homedir(), 'AppData', 'Roaming', 'spare-parts-erp', 'SparePartsERP', 'spare_parts.db'),
  path.join(os.homedir(), 'AppData', 'Roaming', 'spare-parts-erp-app', 'SparePartsERP', 'spare_parts.db')
];

let dbPath = null;
for (const p of possibleDirs) {
  if (fs.existsSync(p)) {
    dbPath = p;
    break;
  }
}

if (!dbPath) {
  const searchBase = path.join(os.homedir(), 'AppData', 'Roaming');
  function findDb(dir) {
    try {
      const files = fs.readdirSync(dir);
      for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
          if (file !== 'node_modules' && file !== '.git' && file !== 'Cache' && file !== 'Local Storage') {
            const found = findDb(fullPath);
            if (found) return found;
          }
        } else if (file === 'spare_parts.db') {
          return fullPath;
        }
      }
    } catch (e) {}
    return null;
  }
  dbPath = findDb(searchBase);
}

if (!dbPath) {
  console.error('Could not find spare_parts.db on your system.');
  process.exit(1);
}

console.log('Using database file:', dbPath);
const db = new Database(dbPath);

try {
  const salesSchema = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='sales_invoices'").get();
  console.log('\n--- SALES INVOICES SCHEMA ---');
  console.log(salesSchema ? salesSchema.sql : 'NOT FOUND');

  const purchaseSchema = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='purchase_invoices'").get();
  console.log('\n--- PURCHASE INVOICES SCHEMA ---');
  console.log(purchaseSchema ? purchaseSchema.sql : 'NOT FOUND');

  const salesDraftsCount = db.prepare("SELECT COUNT(*) as count FROM sales_invoices WHERE status = 'draft'").get();
  console.log('\nSales Drafts Count:', salesDraftsCount.count);

  const purchaseDraftsCount = db.prepare("SELECT COUNT(*) as count FROM purchase_invoices WHERE status = 'draft'").get();
  console.log('Purchase Drafts Count:', purchaseDraftsCount.count);

  console.log('\n--- TRIGGERS ---');
  const triggers = db.prepare("SELECT name, tbl_name, sql FROM sqlite_master WHERE type='trigger'").all();
  console.log(JSON.stringify(triggers, null, 2));

} catch (e) {
  console.error('Diagnostic error:', e);
} finally {
  db.close();
}
