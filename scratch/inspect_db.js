const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, '..', 'database.sqlite');
console.log('Using DB path:', dbPath);

if (!fs.existsSync(dbPath)) {
  console.error('Database does not exist!');
  process.exit(1);
}

const db = new Database(dbPath);

console.log('\n--- UNITS ---');
const units = db.prepare('SELECT * FROM units').all();
console.log(JSON.stringify(units, null, 2));

console.log('\n--- PRODUCTS WITH HAS_SUB_UNIT ---');
const products = db.prepare(`
  SELECT p.id, p.barcode, p.name, p.has_sub_unit, p.pieces_per_box, p.unit_id, u.name as unit_name 
  FROM products p 
  LEFT JOIN units u ON p.unit_id = u.id
  WHERE p.has_sub_unit = 1
`).all();
console.log(JSON.stringify(products, null, 2));

console.log('\n--- STOCK BALANCES FOR SUB_UNIT PRODUCTS ---');
const stocks = db.prepare(`
  SELECT sb.*, p.name, p.has_sub_unit, p.pieces_per_box
  FROM stock_balances sb
  JOIN products p ON sb.product_id = p.id
  WHERE p.has_sub_unit = 1
`).all();
console.log(JSON.stringify(stocks, null, 2));

console.log('\n--- LATEST PURCHASE INVOICES AND ITEMS ---');
const purchases = db.prepare(`
  SELECT pi.id, pi.invoice_number, pi.date, pi.total, pi.paid, pi.status
  FROM purchase_invoices pi
  ORDER BY pi.id DESC LIMIT 3
`).all();
console.log(JSON.stringify(purchases, null, 2));

for (const p of purchases) {
  console.log(`\nItems for purchase invoice ${p.invoice_number}:`);
  const items = db.prepare(`
    SELECT pii.product_id, pii.quantity, pii.unit, pii.unit_price, pii.total, p.name
    FROM purchase_invoice_items pii
    JOIN products p ON pii.product_id = p.id
    WHERE pii.invoice_id = ?
  `).all(p.id);
  console.log(JSON.stringify(items, null, 2));
}

console.log('\n--- LATEST SALES INVOICES AND ITEMS ---');
const sales = db.prepare(`
  SELECT si.id, si.invoice_number, si.date, si.total, si.paid, si.status
  FROM sales_invoices si
  ORDER BY si.id DESC LIMIT 3
`).all();
console.log(JSON.stringify(sales, null, 2));

for (const s of sales) {
  console.log(`\nItems for sales invoice ${s.invoice_number}:`);
  const items = db.prepare(`
    SELECT sii.product_id, sii.quantity, sii.unit, sii.unit_price, sii.total, p.name
    FROM sales_invoice_items sii
    JOIN products p ON sii.product_id = p.id
    WHERE sii.invoice_id = ?
  `).all(s.id);
  console.log(JSON.stringify(items, null, 2));
}

db.close();
