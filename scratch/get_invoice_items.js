const Database = require('better-sqlite3');
const path = require('path');
const dbDir = path.join(process.env.APPDATA || '', 'spare-parts-erp', 'SparePartsERP');
const dbPath = path.join(dbDir, 'spare_parts.db');
const db = new Database(dbPath);

console.log('=== Active Invoice Items Diagnosis ===');
const invoice = db.prepare("SELECT * FROM purchase_invoices WHERE invoice_number LIKE '%04552%' OR supplier_invoice_number LIKE '%04552%'").get();
if (invoice) {
  console.log('Invoice found:', invoice);
  const items = db.prepare('SELECT * FROM purchase_invoice_items WHERE invoice_id = ?').all(invoice.id);
  console.log('Invoice Items:', items);
} else {
  console.log('Invoice not found in purchase_invoices');
}

db.close();
