const Database = require('better-sqlite3');
const path = require('path');
const dbDir = path.join(process.env.APPDATA || '', 'spare-parts-erp', 'SparePartsERP');
const dbPath = path.join(dbDir, 'spare_parts.db');
const db = new Database(dbPath);

console.log('=== Current Products Diagnosis ===');
const products = db.prepare('SELECT name, unit_id, has_sub_unit, pieces_per_box, purchase_price, wholesale_price, retail_price FROM products').all();
console.log('Products:', products);

const units = db.prepare('SELECT * FROM units').all();
console.log('Units:', units);

db.close();
