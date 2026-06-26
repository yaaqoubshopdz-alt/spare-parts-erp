const Database = require('better-sqlite3');
const path = require('path');
const dbDir = path.join(process.env.APPDATA || '', 'spare-parts-erp', 'SparePartsERP');
const dbPath = path.join(dbDir, 'spare_parts.db');
const db = new Database(dbPath);

console.log('=== All Products in DB ===');
const products = db.prepare('SELECT p.*, u.name as unit_name FROM products p JOIN units u ON p.unit_id = u.id').all();
console.log(products);

db.close();
