const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(process.env.APPDATA, 'spare-parts-erp', 'SparePartsERP', 'spare_parts.db');
const db = new Database(dbPath);

const suffix = Date.now();
const barcode = `TEST-PROD-${suffix}`;
const internalCode = `TP-${suffix}`;
const name = `منتج اختبار Codex ${suffix}`;

try {
  console.log('Starting product create simulation...');
  const tx = db.transaction(() => {
    const exists = db.prepare('SELECT id FROM products WHERE barcode = ?').get(barcode);
    if (exists) throw new Error('Test barcode already exists');

    const result = db.prepare(`
      INSERT INTO products (
        barcode, internal_code, name, name_fr, category_id, brand_id, unit_id,
        has_sub_unit, pieces_per_box,
        purchase_price, wholesale_price, retail_price,
        min_stock_level, is_batch_tracked, track_expiry, description,
        is_active, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, datetime('now'), datetime('now'))
    `).run(
      barcode,
      internalCode,
      name,
      'Codex Test Product',
      1,
      null,
      1,
      0,
      1,
      100,
      120,
      150,
      2,
      0,
      0,
      'Temporary product create test'
    );

    const productId = Number(result.lastInsertRowid);
    console.log('Inserted product ID:', productId);

    db.prepare(`
      INSERT OR IGNORE INTO stock_balances (product_id, location_id, quantity, updated_at)
      VALUES (?, 1, 0, datetime('now'))
    `).run(productId);

    const product = db.prepare(`
      SELECT p.id, p.name, p.barcode, sb.quantity
      FROM products p
      LEFT JOIN stock_balances sb ON sb.product_id = p.id
      WHERE p.id = ?
    `).get(productId);
    console.log('Verified product:', JSON.stringify(product));

    const hasSearchTerms = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'product_search_terms'").get();
    if (hasSearchTerms) {
      db.prepare('DELETE FROM product_search_terms WHERE product_id = ?').run(productId);
    }
    db.prepare('DELETE FROM product_barcodes WHERE product_id = ?').run(productId);
    db.prepare('DELETE FROM product_fitments WHERE product_id = ?').run(productId);
    db.prepare('DELETE FROM stock_balances WHERE product_id = ?').run(productId);
    db.prepare('DELETE FROM products WHERE id = ?').run(productId);
    console.log('Test cleanup done.');
  });

  tx();
  console.log('Product create simulation completed successfully!');
} catch (err) {
  console.error('Product create simulation failed:', err);
  process.exitCode = 1;
} finally {
  db.close();
}
