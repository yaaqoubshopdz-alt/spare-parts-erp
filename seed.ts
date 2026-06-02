import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(process.env.APPDATA || '', 'spare-parts-erp', 'SparePartsERP', 'spare_parts.db');
const db = new Database(dbPath);

console.log('Seeding data into', dbPath);

db.pragma('journal_mode = WAL');

db.transaction(() => {
    // Categories
    const categories = ['فرامل', 'فلاتر', 'زيوت ومواد التشحيم', 'محرك', 'كهرباء', 'تكييف', 'نظام التعليق', 'أجزاء الهيكل', 'أنظمة التبريد', 'أنظمة العادم'];
    const catIds: any[] = [];
    for (const cat of categories) {
        const res = db.prepare('INSERT OR IGNORE INTO categories (name) VALUES (?)').run(cat);
        const row = db.prepare('SELECT id FROM categories WHERE name = ?').get(cat) as any;
        catIds.push(row.id);
    }

    // Units
    const units = ['قطعة', 'لتر', 'طقم', 'علبة'];
    const unitIds: any[] = [];
    for (const unit of units) {
        const res = db.prepare('INSERT OR IGNORE INTO units (name) VALUES (?)').run(unit);
        const row = db.prepare('SELECT id FROM units WHERE name = ?').get(unit) as any;
        unitIds.push(row.id);
    }

    // 100+ Products
    console.log('Generating products...');
    const brands = ['Bosch', 'Valeo', 'NGK', 'Brembo', 'Mann Filter', 'Total', 'Castrol', 'Denso'];
    const insertProduct = db.prepare(`
        INSERT INTO products (
            code, barcode, name, description, category_id, unit_id, brand, 
            purchase_price, wholesale_price, retail_price, 
            min_stock_level, is_active
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
    `);

    const insertStock = db.prepare('INSERT INTO stock_balances (product_id, location_id, quantity) VALUES (?, 1, ?)');

    for (let i = 1; i <= 150; i++) {
        const catId = catIds[Math.floor(Math.random() * catIds.length)];
        const unitId = unitIds[Math.floor(Math.random() * unitIds.length)];
        const brand = brands[Math.floor(Math.random() * brands.length)];
        const code = `P-${Date.now()}-${i}`;
        const barcode = `1000${Date.now()}${i}`.substring(0, 13);
        const name = `منتج تجريبي ${i} - ${brand}`;
        
        const purchase = Math.floor(Math.random() * 5000) + 500;
        const wholesale = purchase * 1.15;
        const retail = purchase * 1.30;
        const min_stock = Math.floor(Math.random() * 10) + 2;

        try {
            const pRes = insertProduct.run(code, barcode, name, '', catId, unitId, brand, purchase, wholesale, retail, min_stock);
            // add stock
            const currentStock = Math.floor(Math.random() * 50); // some might be below min_stock
            insertStock.run(pRes.lastInsertRowid, currentStock);
        } catch (e) {
            // ignore duplicate
        }
    }

    // 10 Suppliers
    console.log('Generating suppliers...');
    const insertSupplier = db.prepare(`
        INSERT INTO suppliers (code, name, phone, balance) VALUES (?, ?, ?, ?)
    `);
    for (let i = 1; i <= 10; i++) {
        try {
            insertSupplier.run(`SUP-${Date.now()}-${i}`, `المورد ${i}`, `05500000${i}`, Math.floor(Math.random() * 100000));
        } catch (e) {}
    }

    // 10 Customers
    console.log('Generating customers...');
    const insertCustomer = db.prepare(`
        INSERT INTO customers (code, name, phone, balance) VALUES (?, ?, ?, ?)
    `);
    for (let i = 1; i <= 10; i++) {
        try {
            insertCustomer.run(`CUST-${Date.now()}-${i}`, `الزبون ${i}`, `06600000${i}`, Math.floor(Math.random() * 50000));
        } catch (e) {}
    }
})();

console.log('Seeding completed!');
