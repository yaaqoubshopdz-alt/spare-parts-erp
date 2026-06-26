const Database = require('better-sqlite3');
const path = require('path');
const dbDir = path.join(process.env.APPDATA || '', 'spare-parts-erp', 'SparePartsERP');
const dbPath = path.join(dbDir, 'spare_parts.db');
const db = new Database(dbPath);

console.log('=== Specific Product Diagnosis ===');
const product = db.prepare("SELECT p.*, u.name as unit_name FROM products p JOIN units u ON p.unit_id = u.id WHERE p.name LIKE '%كابل غيارات نيو كينج%'").get();
console.log('Product:', product);

db.close();
