import Database from 'better-sqlite3';
import { join } from 'path';

// Connect to existing DB
const dbPath = join(process.cwd(), 'database', 'app.db');
const db = new Database(dbPath, { fileMustExist: true });

function run() {
  console.log('Starting realistic data seed...');

  try {
    db.prepare('BEGIN').run();

    // 1. Create or get Categories
    const categories = [
      { name: 'الزيوت ومواد التشحيم', color: '#f59e0b' },
      { name: 'فرامل', color: '#ef4444' },
      { name: 'فلاتر', color: '#eab308' },
      { name: 'بطاريات', color: '#3b82f6' },
      { name: 'أجزاء المحرك', color: '#8b5cf6' },
      { name: 'التعليق والتوجيه', color: '#10b981' },
      { name: 'التبريد والتكييف', color: '#06b6d4' },
      { name: 'الإضاءة والكهرباء', color: '#f97316' }
    ];

    const categoryIds = {};
    for (const cat of categories) {
      let existing = db.prepare('SELECT id FROM categories WHERE name = ?').get(cat.name);
      if (!existing) {
        const info = db.prepare('INSERT INTO categories (name, color, type) VALUES (?, ?, ?)')
          .run(cat.name, cat.color, 'product');
        categoryIds[cat.name] = info.lastInsertRowid;
      } else {
        categoryIds[cat.name] = existing.id;
      }
    }

    // 2. Create Brands
    const brands = ['Bosch', 'Valeo', 'NGK', 'Brembo', 'Varta', 'Liqui Moly', 'Castrol', 'Total', 'Denso', 'Mann Filter', 'Monroe', 'LUK'];
    const brandIds = {};
    for (const b of brands) {
      let existing = db.prepare('SELECT id FROM brands WHERE name = ?').get(b);
      if (!existing) {
        const info = db.prepare('INSERT INTO brands (name) VALUES (?)').run(b);
        brandIds[b] = info.lastInsertRowid;
      } else {
        brandIds[b] = existing.id;
      }
    }

    // 3. Create or get Base Unit
    let pieceUnit = db.prepare('SELECT id FROM units WHERE name = ?').get('قطعة');
    if (!pieceUnit) {
      const info = db.prepare('INSERT INTO units (name, symbol, type) VALUES (?, ?, ?)').run('قطعة', 'pcs', 'base');
      pieceUnit = { id: info.lastInsertRowid };
    }
    
    let literUnit = db.prepare('SELECT id FROM units WHERE name = ?').get('لتر');
    if (!literUnit) {
      const info = db.prepare('INSERT INTO units (name, symbol, type) VALUES (?, ?, ?)').run('لتر', 'L', 'base');
      literUnit = { id: info.lastInsertRowid };
    }

    // 4. Products Data
    const productsList = [
      // Oils
      { name: 'زيت محرك 5W-40', cat: 'الزيوت ومواد التشحيم', brand: 'Liqui Moly', price: 6500, stock: 15, min: 5, unit: literUnit.id, cost: 5000 },
      { name: 'زيت محرك 10W-40', cat: 'الزيوت ومواد التشحيم', brand: 'Castrol', price: 4200, stock: 24, min: 10, unit: literUnit.id, cost: 3500 },
      { name: 'زيت فرامل DOT 4', cat: 'الزيوت ومواد التشحيم', brand: 'Bosch', price: 800, stock: 3, min: 5, unit: literUnit.id, cost: 600 },
      { name: 'زيت محرك 5W-30', cat: 'الزيوت ومواد التشحيم', brand: 'Total', price: 5500, stock: 40, min: 8, unit: literUnit.id, cost: 4200 },
      
      // Brakes
      { name: 'تيل فرامل أمامي كليو 4', cat: 'فرامل', brand: 'Brembo', price: 4500, stock: 2, min: 5, unit: pieceUnit.id, cost: 3200 },
      { name: 'طقم فرامل خلفي بيجو 208', cat: 'فرامل', brand: 'Bosch', price: 5200, stock: 12, min: 4, unit: pieceUnit.id, cost: 4000 },
      { name: 'أقراص فرامل أمامية داسيا لوغان', cat: 'فرامل', brand: 'Valeo', price: 8500, stock: 8, min: 6, unit: pieceUnit.id, cost: 6500 },
      { name: 'تيل فرامل جولف 7', cat: 'فرامل', brand: 'Brembo', price: 6800, stock: 1, min: 4, unit: pieceUnit.id, cost: 5000 },
      
      // Filters
      { name: 'فلتر زيت رينو داسيا', cat: 'فلاتر', brand: 'Mann Filter', price: 850, stock: 50, min: 20, unit: pieceUnit.id, cost: 550 },
      { name: 'فلتر هواء بيجو 301', cat: 'فلاتر', brand: 'Bosch', price: 1200, stock: 15, min: 10, unit: pieceUnit.id, cost: 800 },
      { name: 'فلتر مازوت تويوتا هيلوكس', cat: 'فلاتر', brand: 'Denso', price: 3500, stock: 5, min: 8, unit: pieceUnit.id, cost: 2500 },
      { name: 'فلتر مكيف هيونداي أكسنت', cat: 'فلاتر', brand: 'Valeo', price: 1500, stock: 0, min: 5, unit: pieceUnit.id, cost: 1000 },
      
      // Batteries
      { name: 'بطارية سيارة 60Ah', cat: 'بطاريات', brand: 'Varta', price: 12500, stock: 4, min: 5, unit: pieceUnit.id, cost: 10000 },
      { name: 'بطارية سيارة 74Ah', cat: 'بطاريات', brand: 'Bosch', price: 15000, stock: 8, min: 4, unit: pieceUnit.id, cost: 12500 },
      { name: 'بطارية سيارة 45Ah', cat: 'بطاريات', brand: 'Varta', price: 9500, stock: 2, min: 3, unit: pieceUnit.id, cost: 8000 },
      
      // Engine Parts
      { name: 'شمعات احتراق (بواجي)', cat: 'أجزاء المحرك', brand: 'NGK', price: 2500, stock: 30, min: 12, unit: pieceUnit.id, cost: 1800 },
      { name: 'طقم دبرياج (Embrayage)', cat: 'أجزاء المحرك', brand: 'LUK', price: 18500, stock: 3, min: 2, unit: pieceUnit.id, cost: 15000 },
      { name: 'مضخة ماء بيجو 208', cat: 'أجزاء المحرك', brand: 'Valeo', price: 4800, stock: 6, min: 3, unit: pieceUnit.id, cost: 3500 },
      { name: 'حزام محرك (Courroie)', cat: 'أجزاء المحرك', brand: 'Bosch', price: 3200, stock: 14, min: 5, unit: pieceUnit.id, cost: 2200 },
      
      // Suspension
      { name: 'ممتص صدمات أمامي (Amortisseur)', cat: 'التعليق والتوجيه', brand: 'Monroe', price: 9000, stock: 10, min: 4, unit: pieceUnit.id, cost: 7000 },
      { name: 'ممتص صدمات خلفي سيات ليون', cat: 'التعليق والتوجيه', brand: 'Monroe', price: 8500, stock: 2, min: 4, unit: pieceUnit.id, cost: 6500 },
      { name: 'مقص تعليق (Bras de suspension)', cat: 'التعليق والتوجيه', brand: 'Valeo', price: 6500, stock: 5, min: 4, unit: pieceUnit.id, cost: 5000 },
      
      // AC & Cooling
      { name: 'رادياتير جولف 6', cat: 'التبريد والتكييف', brand: 'Valeo', price: 16000, stock: 2, min: 2, unit: pieceUnit.id, cost: 13000 },
      { name: 'كومبريسور مكيف ياريس', cat: 'التبريد والتكييف', brand: 'Denso', price: 45000, stock: 1, min: 1, unit: pieceUnit.id, cost: 38000 },
      { name: 'ماء رادياتير G12 وردي', cat: 'التبريد والتكييف', brand: 'Total', price: 1500, stock: 25, min: 10, unit: literUnit.id, cost: 1000 },
      
      // Lighting
      { name: 'لمبة هالوجين H7', cat: 'الإضاءة والكهرباء', brand: 'Bosch', price: 600, stock: 45, min: 20, unit: pieceUnit.id, cost: 400 },
      { name: 'طقم ليد LED أمامي', cat: 'الإضاءة والكهرباء', brand: 'Bosch', price: 4500, stock: 8, min: 5, unit: pieceUnit.id, cost: 3000 },
      { name: 'لمبة هالوجين H4', cat: 'الإضاءة والكهرباء', brand: 'Valeo', price: 550, stock: 18, min: 15, unit: pieceUnit.id, cost: 350 },
    ];

    // Generate ~70 more products by mixing brands and car models
    const carModels = ['بيجو 208', 'كليو 4', 'جولف 7', 'داسيا لوغان', 'تويوتا هيلوكس', 'هيونداي أكسنت', 'سيات إيبيزا', 'كيا بيكانتو', 'فولكسفاجن بولو'];
    const partTypes = [
      { name: 'فلتر هواء', cat: 'فلاتر', min: 800, max: 2000, qty: 20, minQty: 5 },
      { name: 'تيل فرامل', cat: 'فرامل', min: 3000, max: 8000, qty: 10, minQty: 3 },
      { name: 'مضخة ماء', cat: 'أجزاء المحرك', min: 4000, max: 9000, qty: 4, minQty: 2 },
      { name: 'طقم دبرياج', cat: 'أجزاء المحرك', min: 12000, max: 25000, qty: 2, minQty: 1 },
      { name: 'ممتص صدمات', cat: 'التعليق والتوجيه', min: 6000, max: 12000, qty: 6, minQty: 4 },
    ];

    for (const car of carModels) {
      for (const part of partTypes) {
        const brand = brands[Math.floor(Math.random() * brands.length)];
        const cost = Math.floor(Math.random() * (part.max - part.min) + part.min);
        const price = Math.floor(cost * (1.2 + Math.random() * 0.3)); // 20-50% margin
        const stock = Math.floor(Math.random() * part.qty);
        const minStock = part.minQty;
        
        productsList.push({
          name: `${part.name} ${car}`,
          cat: part.cat,
          brand: brand,
          price: price,
          cost: cost,
          stock: stock,
          min: minStock,
          unit: pieceUnit.id
        });
      }
    }

    const insertStmt = db.prepare(`
      INSERT INTO products (
        name,
        barcode,
        internal_code,
        category_id,
        brand_id,
        base_unit_id,
        purchase_price,
        selling_price,
        min_stock_level,
        current_stock,
        is_active,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
    `);

    let count = 0;
    for (const prod of productsList) {
      count++;
      const barcode = Math.floor(1000000000000 + Math.random() * 9000000000000).toString();
      const code = `PRD-${count.toString().padStart(4, '0')}`;
      const date = new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString();
      
      insertStmt.run(
        prod.name,
        barcode,
        code,
        categoryIds[prod.cat],
        brandIds[prod.brand],
        prod.unit,
        prod.cost,
        prod.price,
        prod.min,
        prod.stock,
        date
      );
    }

    db.prepare('COMMIT').run();
    console.log(`Successfully seeded ${count} realistic products!`);

  } catch (error) {
    db.prepare('ROLLBACK').run();
    console.error('Error seeding realistic data:', error);
  } finally {
    db.close();
  }
}

run();
