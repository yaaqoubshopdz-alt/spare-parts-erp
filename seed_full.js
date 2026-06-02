const { app } = require('electron');
const Database = require('better-sqlite3');
const path = require('path');

app.whenReady().then(async () => {
  const dbPath = 'C:\\Users\\blbl\\AppData\\Roaming\\spare-parts-erp\\SparePartsERP\\spare_parts.db';
  console.log('Connecting to database:', dbPath);

  let db;
  try {
    db = new Database(dbPath);
  } catch (err) {
    console.error('Database connection failed. Is the app running?', err.message);
    app.quit();
    return;
  }

  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  console.log('=== Starting Algeria Auto Parts High-Density Seeder ===');

  const seedTransaction = db.transaction(() => {
    // 1. Seed accounts if missing (Chart of Accounts)
    console.log('Ensuring Chart of Accounts is present...');
    const insertAccount = db.prepare('INSERT OR IGNORE INTO accounts (code, name, type, parent_id) VALUES (?, ?, ?, ?)');
    
    // Parent Accounts
    insertAccount.run('1000', 'الأصول المتداولة', 'asset', null);
    insertAccount.run('2000', 'الخصوم المتداولة', 'liability', null);
    insertAccount.run('3000', 'حقوق الملكية', 'equity', null);
    insertAccount.run('4000', 'الإيرادات', 'revenue', null);
    insertAccount.run('5000', 'المصروفات', 'expense', null);

    const getAccountId = (code) => {
      const row = db.prepare('SELECT id FROM accounts WHERE code = ?').get(code);
      return row ? row.id : null;
    };

    const idAsset = getAccountId('1000');
    const idLiability = getAccountId('2000');
    const idEquity = getAccountId('3000');
    const idRevenue = getAccountId('4000');
    const idExpense = getAccountId('5000');

    // Sub-Accounts
    insertAccount.run('1100', 'الصندوق', 'asset', idAsset);
    insertAccount.run('1200', 'البنك', 'asset', idAsset);
    insertAccount.run('1300', 'ذمم مدينة - زبائن', 'asset', idAsset);
    insertAccount.run('1400', 'المخزون', 'asset', idAsset);

    insertAccount.run('2100', 'ذمم دائنة - موردين', 'liability', idLiability);
    insertAccount.run('2200', 'ضرائب مستحقة', 'liability', idLiability);

    insertAccount.run('3100', 'رأس المال', 'equity', idEquity);
    insertAccount.run('3200', 'الأرباح المحتجزة', 'equity', idEquity);

    insertAccount.run('4100', 'إيرادات المبيعات', 'revenue', idRevenue);
    insertAccount.run('4200', 'إيرادات أخرى', 'revenue', idRevenue);

    insertAccount.run('5100', 'تكلفة البضاعة المباعة', 'expense', idExpense);
    insertAccount.run('5200', 'مصروفات تشغيلية', 'expense', idExpense);
    insertAccount.run('5300', 'مصروفات رواتب', 'expense', idExpense);
    insertAccount.run('5400', 'مصروفات إيجار', 'expense', idExpense);

    // Resolve Account IDs dynamically
    const ACC_CASH = getAccountId('1100');
    const ACC_AR = getAccountId('1300');
    const ACC_INVENTORY = getAccountId('1400');
    const ACC_AP = getAccountId('2100');
    const ACC_CAPITAL = getAccountId('3100');
    const ACC_REVENUE = getAccountId('4100');
    const ACC_COGS = getAccountId('5100');
    const ACC_OP_EXPENSE = getAccountId('5200');

    console.log('Accounting accounts loaded successfully:', {
      ACC_CASH, ACC_AR, ACC_INVENTORY, ACC_AP, ACC_CAPITAL, ACC_REVENUE, ACC_COGS, ACC_OP_EXPENSE
    });

    // 2. Ensure cash box exists
    console.log('Ensuring cash boxes exist...');
    db.prepare("INSERT OR IGNORE INTO cash_boxes (id, code, name, current_balance) VALUES (1, 'MAIN_CASH', 'الصندوق الرئيسي', 0)").run();

    // 3. Ensure number sequences exist
    console.log('Ensuring number sequences exist...');
    const insertSeq = db.prepare(`INSERT OR IGNORE INTO number_sequences (prefix, last_number, format) VALUES (?, ?, ?)`);
    insertSeq.run('SAL', 0, '{PREFIX}-{DATE}-{SEQ}');
    insertSeq.run('PUR', 0, '{PREFIX}-{DATE}-{SEQ}');
    insertSeq.run('SRT', 0, '{PREFIX}-{DATE}-{SEQ}');
    insertSeq.run('PRT', 0, '{PREFIX}-{DATE}-{SEQ}');
    insertSeq.run('PAY', 0, '{PREFIX}-{DATE}-{SEQ}');
    insertSeq.run('EXP', 0, '{PREFIX}-{DATE}-{SEQ}');
    insertSeq.run('ADJ', 0, '{PREFIX}-{DATE}-{SEQ}');
    insertSeq.run('CSH', 0, '{PREFIX}-{DATE}-{SEQ}');
    insertSeq.run('JRN', 0, '{PREFIX}-{DATE}-{SEQ}');

    // Clean previous simulated transactions to allow clean seed
    console.log('Cleaning previous transaction data...');
    db.prepare("DELETE FROM sales_invoice_items").run();
    db.prepare("DELETE FROM sales_invoices").run();
    db.prepare("DELETE FROM purchase_invoice_items").run();
    db.prepare("DELETE FROM purchase_invoices").run();
    db.prepare("DELETE FROM sales_return_items").run();
    db.prepare("DELETE FROM sales_returns").run();
    db.prepare("DELETE FROM purchase_return_items").run();
    db.prepare("DELETE FROM purchase_returns").run();
    db.prepare("DELETE FROM stock_movements").run();
    db.prepare("DELETE FROM stock_balances").run();
    db.prepare("DELETE FROM product_batches").run();
    db.prepare("DELETE FROM product_fitments").run();
    db.prepare("DELETE FROM product_barcodes").run();
    db.prepare("DELETE FROM products").run();
    db.prepare("DELETE FROM customers").run();
    db.prepare("DELETE FROM suppliers").run();
    db.prepare("DELETE FROM payments").run();
    db.prepare("DELETE FROM cash_transactions").run();
    db.prepare("DELETE FROM cash_closings").run();
    db.prepare("DELETE FROM expenses").run();
    db.prepare("DELETE FROM journal_entry_lines").run();
    db.prepare("DELETE FROM journal_entries").run();

    // Reset sqlite sequences
    const tablesToReset = [
      'sales_invoice_items', 'sales_invoices', 'purchase_invoice_items', 'purchase_invoices',
      'sales_return_items', 'sales_returns', 'purchase_return_items', 'purchase_returns',
      'stock_movements', 'stock_balances', 'product_batches', 'product_fitments', 'product_barcodes',
      'products', 'customers', 'suppliers', 'payments', 'cash_transactions', 'cash_closings',
      'expenses', 'journal_entry_lines', 'journal_entries'
    ];
    for (const t of tablesToReset) {
      db.prepare(`DELETE FROM sqlite_sequence WHERE name='${t}'`).run();
    }

    db.prepare(`UPDATE number_sequences SET last_number = 0`).run();
    db.prepare(`UPDATE cash_boxes SET current_balance = 0 WHERE id = 1`).run();

    console.log('Database cleared for seeding.');

    // Fetch existing units, categories, vehicle brands, vehicle models
    const categories = db.prepare('SELECT id, name FROM categories').all();
    const units = db.prepare('SELECT id, code, name FROM units').all();
    const vehicleBrands = db.prepare('SELECT id, name FROM vehicle_brands').all();
    const vehicleModels = db.prepare('SELECT id, name, vehicle_brand_id FROM vehicle_models').all();

    const catMap = {}; categories.forEach(c => catMap[c.name] = c.id);
    const unitMap = {}; units.forEach(u => unitMap[u.code] = u.id);
    const brandMap = {}; vehicleBrands.forEach(b => brandMap[b.name.split(' ')[0]] = b.id);

    // Seeding spare parts brands
    console.log('Seeding spare parts brands...');
    const spareBrands = ['Bosch', 'Valeo', 'NGK', 'Brembo', 'Mann Filter', 'Total', 'Castrol', 'Denso', 'Gates', 'Varta'];
    const brandIds = {};
    const insertBrand = db.prepare('INSERT OR IGNORE INTO brands (name) VALUES (?)');
    const getBrand = db.prepare('SELECT id FROM brands WHERE name = ?');
    spareBrands.forEach(b => {
      insertBrand.run(b);
      const row = getBrand.get(b);
      brandIds[b] = row.id;
    });

    // Seeding real auto spare parts
    console.log('Seeding high-fidelity products...');
    const productsData = [
      {
        name: 'بواجي إيريديوم ليزر NGK', name_fr: 'Bougies Iridium Laser NGK',
        cat: 'كهرباء السيارة', brand: 'NGK', unit: 'PCS',
        purchase: 1200, wholesale: 1500, retail: 1800,
        sku: 'NGK-IRID-09', barcode: '4008916362810',
        fitments: [
          { brandName: 'Toyota', modelName: 'Corolla' },
          { brandName: 'Hyundai', modelName: 'Accent' },
          { brandName: 'Kia', modelName: 'Rio' }
        ]
      },
      {
        name: 'زيت محرك كاسترول 5W40 4L', name_fr: 'Huile Moteur Castrol 5W40 4L',
        cat: 'زيوت ومواد التشحيم', brand: 'Castrol', unit: 'PCS',
        purchase: 4200, wholesale: 4900, retail: 5800,
        sku: 'CAS-5W40-4L', barcode: '5011987140812',
        fitments: [
          { brandName: 'Renault', modelName: 'Clio 4' },
          { brandName: 'Peugeot', modelName: '208' },
          { brandName: 'Volkswagen', modelName: 'Golf 7' }
        ]
      },
      {
        name: 'زيت محرك توتال 10W40 4L', name_fr: 'Huile Moteur Total 10W40 4L',
        cat: 'زيوت ومواد التشحيم', brand: 'Total', unit: 'PCS',
        purchase: 3100, wholesale: 3600, retail: 4300,
        sku: 'TOT-10W40-4L', barcode: '3425901004123',
        fitments: [
          { brandName: 'Renault', modelName: 'Symbol' },
          { brandName: 'Peugeot', modelName: '301' },
          { brandName: 'Hyundai', modelName: 'Accent RB' }
        ]
      },
      {
        name: 'تيل فرامل بريمبو أمامية', name_fr: 'Plaquettes de Frein Brembo Avant',
        cat: 'فرامل', brand: 'Brembo', unit: 'PCS',
        purchase: 2800, wholesale: 3400, retail: 4100,
        sku: 'BRE-BRK-F', barcode: '8020584059123',
        fitments: [
          { brandName: 'Renault', modelName: 'Clio 4' },
          { brandName: 'Peugeot', modelName: '208' }
        ]
      },
      {
        name: 'طقم فرامل بوش خلفية', name_fr: 'Disques de Frein Bosch Arrière',
        cat: 'فرامل', brand: 'Bosch', unit: 'PCS',
        purchase: 5200, wholesale: 6100, retail: 7300,
        sku: 'BOS-BRK-R', barcode: '3165141258904',
        fitments: [
          { brandName: 'Volkswagen', modelName: 'Golf 7' },
          { brandName: 'Seat', modelName: 'Leon' }
        ]
      },
      {
        name: 'فلتر زيت مان كورولا / ياريس', name_fr: 'Filtre à Huile Mann Corolla/Yaris',
        cat: 'فلاتر', brand: 'Mann Filter', unit: 'PCS',
        purchase: 650, wholesale: 800, retail: 1000,
        sku: 'MAN-OIL-01', barcode: '4011558231204',
        fitments: [
          { brandName: 'Toyota', modelName: 'Corolla' },
          { brandName: 'Toyota', modelName: 'Yaris' }
        ]
      },
      {
        name: 'فلتر هواء مان كليو 4 / سيمبول', name_fr: 'Filtre à Air Mann Clio 4/Symbol',
        cat: 'فلاتر', brand: 'Mann Filter', unit: 'PCS',
        purchase: 850, wholesale: 1050, retail: 1300,
        sku: 'MAN-AIR-02', barcode: '4011558064903',
        fitments: [
          { brandName: 'Renault', modelName: 'Clio 4' },
          { brandName: 'Renault', modelName: 'Symbol' }
        ]
      },
      {
        name: 'بطارية فارتا 74 أمبير شحن متقدم', name_fr: 'Batterie Varta 74Ah Silver Dynamic',
        cat: 'كهرباء السيارة', brand: 'Varta', unit: 'PCS',
        purchase: 11500, wholesale: 13500, retail: 16000,
        sku: 'VAR-BAT-74', barcode: '4013000185901',
        fitments: [
          { brandName: 'Volkswagen', modelName: 'Golf 7' },
          { brandName: 'Peugeot', modelName: '308' },
          { brandName: 'Renault', modelName: 'Megane' }
        ]
      },
      {
        name: 'سير محرك جيتس 6PK1120', name_fr: 'Courroie Gates 6PK1120',
        cat: 'محرك', brand: 'Gates', unit: 'PCS',
        purchase: 1100, wholesale: 1400, retail: 1750,
        sku: 'GAT-BELT-6PK', barcode: '5414465359124',
        fitments: [
          { brandName: 'Hyundai', modelName: 'Accent' },
          { brandName: 'Kia', modelName: 'Rio' }
        ]
      },
      {
        name: 'مضخة مياه فاليو محرك 1.6 HDI', name_fr: 'Pompe à Eau Valeo 1.6 HDI',
        cat: 'محرك', brand: 'Valeo', unit: 'PCS',
        purchase: 4800, wholesale: 5700, retail: 6900,
        sku: 'VAL-WP-HDI', barcode: '3276425063124',
        fitments: [
          { brandName: 'Peugeot', modelName: '207' },
          { brandName: 'Peugeot', modelName: '308' },
          { brandName: 'Partner', modelName: 'Partner' }
        ]
      }
    ];

    const insertedProducts = [];
    const insertProduct = db.prepare(`
      INSERT INTO products (
        internal_code, barcode, name, name_fr, category_id, brand_id, unit_id,
        purchase_price, wholesale_price, retail_price, min_stock_level
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 5)
    `);
    const insertFitment = db.prepare(`
      INSERT INTO product_fitments (product_id, vehicle_brand_id, vehicle_model_id)
      VALUES (?, ?, ?)
    `);

    productsData.forEach(p => {
      const catId = catMap[p.cat] || categories[0].id;
      const unitId = unitMap[p.unit] || units[0].id;
      const bId = brandIds[p.brand];

      const res = insertProduct.run(p.sku, p.barcode, p.name, p.name_fr, catId, bId, unitId, p.purchase, p.wholesale, p.retail);
      const productId = res.lastInsertRowid;
      insertedProducts.push({ id: productId, ...p });

      // Link fitments
      p.fitments.forEach(f => {
        const vBrand = vehicleBrands.find(vb => vb.name.toLowerCase().includes(f.brandName.toLowerCase()));
        if (vBrand) {
          const vModel = vehicleModels.find(vm => vm.vehicle_brand_id === vBrand.id && vm.name.toLowerCase().includes(f.modelName.toLowerCase()));
          insertFitment.run(productId, vBrand.id, vModel ? vModel.id : null);
        }
      });
    });
    console.log(`Seeded ${insertedProducts.length} premium products.`);

    // Seeding Customers & Suppliers
    console.log('Seeding customers and suppliers...');
    const suppliersData = [
      { code: 'WALK-IN-SUP', name: 'مورد عابر', phone: '', balance: 0 },
      { code: 'SUP-ALG-01', name: 'المتحدون لقطع الغيار الجزائر', phone: '021456789', balance: 0 },
      { code: 'SUP-WEST-02', name: 'موزع الغرب للزيوت والفلاتر وهران', phone: '041556677', balance: 0 },
      { code: 'SUP-BOS-03', name: 'وكيل بوش للكهرباء والفرامل سطيف', phone: '036889900', balance: 0 }
    ];
    const supplierIds = {};
    const insertSupplier = db.prepare(`
      INSERT INTO suppliers (code, name, phone, balance) VALUES (?, ?, ?, ?)
    `);
    suppliersData.forEach(s => {
      const res = insertSupplier.run(s.code, s.name, s.phone, s.balance);
      supplierIds[s.code] = res.lastInsertRowid;
    });

    const customersData = [
      { code: 'WALK-IN', name: 'زبون عابر', phone: '', balance: 0 },
      { code: 'CUST-DIST-01', name: 'موزع تيزي وزو للنخبة', phone: '026778899', balance: 0 },
      { code: 'CUST-WORK-02', name: 'ورشة السلامة وهران', phone: '041998877', balance: 0 },
      { code: 'CUST-SHOP-03', name: 'محل الفوز قسنطينة', phone: '031554433', balance: 0 }
    ];
    const customerIds = {};
    const insertCustomer = db.prepare(`
      INSERT INTO customers (code, name, phone, balance) VALUES (?, ?, ?, ?)
    `);
    customersData.forEach(c => {
      const res = insertCustomer.run(c.code, c.name, c.phone, c.balance);
      customerIds[c.code] = res.lastInsertRowid;
    });

    // Simulation of 6 Months Daily Transactions (accounting double-entry fully synced)
    console.log('Simulating 6 months of logical financial data (Double-Entry)...');
    
    // Daily loop settings
    const startDate = new Date('2025-11-20');
    const endDate = new Date('2026-05-19');
    
    // Helper to generate sequences
    const getSeqNum = (prefix, dateStr) => {
      const row = db.prepare('SELECT last_number FROM number_sequences WHERE prefix = ?').get(prefix);
      const nextNum = (row ? row.last_number : 0) + 1;
      db.prepare('UPDATE number_sequences SET last_number = ? WHERE prefix = ?').run(nextNum, prefix);
      
      const cleanDate = dateStr.replace(/-/g, '');
      const seqStr = String(nextNum).padStart(4, '0');
      return `${prefix}-${cleanDate}-${seqStr}`;
    };

    // Helper to insert journal entries
    const postJournalEntry = (date, desc, refType, refId, lines) => {
      const entryNum = getSeqNum('JRN', date);
      const res = db.prepare(`
        INSERT INTO journal_entries (entry_number, date, description, status, reference_type, reference_id, user_id)
        VALUES (?, ?, ?, 'posted', ?, ?, 1)
      `).run(entryNum, date, desc, refType, refId);
      
      const entryId = res.lastInsertRowid;
      const insertLine = db.prepare(`
        INSERT INTO journal_entry_lines (entry_id, account_id, debit, credit, party_type, party_id)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      
      lines.forEach(l => {
        insertLine.run(entryId, l.account, l.debit, l.credit, l.partyType || 'none', l.partyId || null);
      });
    };

    // Running inventory stock levels to calculate WAC and prevent negative stocks
    const stockLevels = {};
    insertedProducts.forEach(p => {
      stockLevels[p.id] = { qty: 0, totalCost: 0, wac: p.purchase };
    });

    // Step 1: Record Capital investment on Day 1
    const day1Str = '2025-11-20';
    console.log('Seeding initial capital investment on Day 1...');
    postJournalEntry(day1Str, 'إيداع رأس المال الافتتاحي لتأسيس النشاط المحاسبي', 'initial_capital', 1, [
      { account: ACC_CASH, debit: 5000000, credit: 0, partyType: 'cashbox', partyId: 1 },
      { account: ACC_CAPITAL, debit: 0, credit: 5000000 }
    ]);
    db.prepare('UPDATE cash_boxes SET current_balance = current_balance + 5000000 WHERE id = 1').run();

    // Step 2: Loop day-by-day to simulate real sales, purchases, payments, expenses
    let currentDate = new Date(startDate);
    let invoiceCounter = 1;
    let purchaseCounter = 1;
    let paymentCounter = 1;
    let expenseCounter = 1;

    const algerianCities = ['الجزائر العاصمة', 'وهران', 'قسنطينة', 'سطيف', 'تيزي وزو', 'بومرداس', 'عنابة', 'باتنة', 'الجزائر'];

    while (currentDate <= endDate) {
      const dateStr = currentDate.toISOString().split('T')[0];
      const dayOfWeek = currentDate.getDay(); // 5 = Friday (weekend in Algeria)

      // Skip heavy operations on Fridays, just simulate minor cash sales
      const salesCount = dayOfWeek === 5 ? 1 : Math.floor(Math.random() * 4) + 1;

      // A. Replenish inventory (Purchase) every 10 days
      if (currentDate.getDate() % 10 === 0 && dayOfWeek !== 5) {
        const supCode = Math.random() > 0.5 ? 'SUP-ALG-01' : 'SUP-WEST-02';
        const supId = supplierIds[supCode];
        
        // Randomly purchase 3 to 6 products
        const purchaseItems = [];
        let invoiceSubtotal = 0;

        const shuffledProducts = [...insertedProducts].sort(() => 0.5 - Math.random()).slice(0, Math.floor(Math.random() * 3) + 3);
        shuffledProducts.forEach(p => {
          const qty = Math.floor(Math.random() * 30) + 15;
          const totalCost = qty * p.purchase;
          invoiceSubtotal += totalCost;
          purchaseItems.push({
            product_id: p.id,
            name: p.name,
            qty,
            price: p.purchase
          });

          // WAC stock calculation
          const st = stockLevels[p.id];
          st.totalCost += totalCost;
          st.qty += qty;
          st.wac = st.totalCost / st.qty;
        });

        const invoiceNum = getSeqNum('PUR', dateStr);
        const paidAmount = Math.random() > 0.3 ? invoiceSubtotal : Math.floor(invoiceSubtotal * 0.5);
        const remAmount = invoiceSubtotal - paidAmount;

        const purchaseRes = db.prepare(`
          INSERT INTO purchase_invoices (invoice_number, supplier_id, user_id, date, subtotal, total, paid, remaining, payment_method, status)
          VALUES (?, ?, 1, ?, ?, ?, ?, ?, 'cash', 'confirmed')
        `).run(invoiceNum, supId, dateStr, invoiceSubtotal, invoiceSubtotal, paidAmount, remAmount);

        const purchaseId = purchaseRes.lastInsertRowid;

        // Insert items and movements
        const insertPurItem = db.prepare(`
          INSERT INTO purchase_invoice_items (invoice_id, product_id, product_name_snapshot, quantity, unit, unit_price, total)
          VALUES (?, ?, ?, ?, 'قطعة', ?, ?)
        `);
        const insertMovement = db.prepare(`
          INSERT INTO stock_movements (product_id, location_id, movement_type, quantity, balance_after, reference_type, reference_id, user_id, notes, created_at)
          VALUES (?, 1, 'purchase', ?, ?, 'purchase_invoice', ?, 1, 'شراء بضاعة', ?)
        `);
        const upsertBalance = db.prepare(`
          INSERT INTO stock_balances (product_id, location_id, quantity, updated_at)
          VALUES (?, 1, ?, datetime('now'))
          ON CONFLICT(product_id, location_id) DO UPDATE SET quantity = quantity + EXCLUDED.quantity
        `);

        purchaseItems.forEach(item => {
          insertPurItem.run(purchaseId, item.product_id, item.name, item.qty, item.price, item.qty * item.price);
          upsertBalance.run(item.product_id, item.qty);
          insertMovement.run(item.product_id, item.qty, stockLevels[item.product_id].qty, purchaseId, dateStr);
        });

        // Update supplier balance if credit
        if (remAmount > 0) {
          db.prepare('UPDATE suppliers SET balance = balance + ? WHERE id = ?').run(remAmount, supId);
        }

        // Write Journal Entry
        const journalLines = [
          { account: ACC_INVENTORY, debit: invoiceSubtotal, credit: 0 }
        ];
        if (paidAmount > 0) {
          journalLines.push({ account: ACC_CASH, debit: 0, credit: paidAmount, partyType: 'cashbox', partyId: 1 });
          db.prepare('UPDATE cash_boxes SET current_balance = current_balance - ? WHERE id = 1').run(paidAmount);
        }
        if (remAmount > 0) {
          journalLines.push({ account: ACC_AP, debit: 0, credit: remAmount, partyType: 'supplier', partyId: supId });
        }

        postJournalEntry(dateStr, `فاتورة مشتريات مخزنية رقم ${invoiceNum}`, 'purchase_invoice', purchaseId, journalLines);
      }

      // B. Simulate Sales
      for (let s = 0; s < salesCount; s++) {
        let isWalkIn = Math.random() > 0.4;
        let custId = customerIds['WALK-IN'];
        let saleType = 'retail';
        let priceField = 'retail';

        if (!isWalkIn) {
          const randCust = ['CUST-DIST-01', 'CUST-WORK-02', 'CUST-SHOP-03'][Math.floor(Math.random() * 3)];
          custId = customerIds[randCust];
          saleType = 'wholesale';
          priceField = 'wholesale';
        }

        // Pick 1 to 4 random products that have positive stock
        const saleItems = [];
        let invoiceSubtotal = 0;
        let invoiceCogs = 0;

        const shuffledProductsForSale = [...insertedProducts].sort(() => 0.5 - Math.random()).slice(0, Math.floor(Math.random() * 3) + 1);
        
        shuffledProductsForSale.forEach(p => {
          const stock = stockLevels[p.id];
          if (stock.qty > 2) {
            const qty = Math.floor(Math.random() * Math.min(stock.qty - 1, 5)) + 1;
            const price = p[priceField];
            const itemTotal = qty * price;
            const itemCogs = qty * stock.wac;

            invoiceSubtotal += itemTotal;
            invoiceCogs += itemCogs;

            saleItems.push({
              product_id: p.id,
              name: p.name,
              barcode: p.barcode,
              qty,
              price,
              cogs: itemCogs
            });

            // Adjust stock
            stock.qty -= qty;
            stock.totalCost -= itemCogs;
          }
        });

        if (saleItems.length > 0) {
          const isCredit = !isWalkIn && Math.random() > 0.4;
          const paidAmount = isCredit ? Math.floor(invoiceSubtotal * 0.3) : invoiceSubtotal;
          const remAmount = invoiceSubtotal - paidAmount;

          // Special case: if Walk-in customer buys on credit, convert them to temporary customer
          if (isWalkIn && remAmount > 0) {
            const tempSeq = String(invoiceCounter).padStart(4, '0');
            const tempCode = `Walk-In-2026-${tempSeq}`;
            const tempRes = db.prepare(`
              INSERT INTO customers (code, name, phone, balance)
              VALUES (?, ?, ?, 0)
            `).run(tempCode, `زبون عابر - مؤقت ${tempSeq}`, `055${Math.floor(Math.random() * 90000000 + 10000000)}`);
            custId = tempRes.lastInsertRowid;
            isWalkIn = false;
          }

          const invoiceNum = getSeqNum('SAL', dateStr);
          const saleRes = db.prepare(`
            INSERT INTO sales_invoices (invoice_number, sale_type, customer_id, user_id, date, subtotal, total, paid, remaining, payment_method, status)
            VALUES (?, ?, ?, 1, ?, ?, ?, ?, ?, 'cash', 'confirmed')
          `).run(invoiceNum, saleType, custId, dateStr, invoiceSubtotal, invoiceSubtotal, paidAmount, remAmount);

          const saleId = saleRes.lastInsertRowid;

          // Insert items and movements
          const insertSaleItem = db.prepare(`
            INSERT INTO sales_invoice_items (invoice_id, product_id, product_name_snapshot, product_barcode_snapshot, quantity, unit, unit_price, cost_price_snapshot, total)
            VALUES (?, ?, ?, ?, ?, 'قطعة', ?, ?, ?)
          `);
          const insertMovement = db.prepare(`
            INSERT INTO stock_movements (product_id, location_id, movement_type, quantity, balance_after, reference_type, reference_id, user_id, notes, created_at)
            VALUES (?, 1, 'sale', ?, ?, 'sales_invoice', ?, 1, 'بيع بضاعة', ?)
          `);
          const subtractBalance = db.prepare(`
            UPDATE stock_balances SET quantity = quantity - ? WHERE product_id = ? AND location_id = 1
          `);

          saleItems.forEach(item => {
            insertSaleItem.run(saleId, item.product_id, item.name, item.barcode, item.qty, item.price, stockLevels[item.product_id].wac, item.qty * item.price);
            subtractBalance.run(item.qty, item.product_id);
            insertMovement.run(item.product_id, item.qty, stockLevels[item.product_id].qty, saleId, dateStr);
          });

          // Update customer balance if credit
          if (remAmount > 0) {
            db.prepare('UPDATE customers SET balance = balance + ? WHERE id = ?').run(remAmount, custId);
          }

          // Write Journal Entry
          const journalLines = [
            { account: ACC_REVENUE, debit: 0, credit: invoiceSubtotal }
          ];
          if (paidAmount > 0) {
            journalLines.push({ account: ACC_CASH, debit: paidAmount, credit: 0, partyType: 'cashbox', partyId: 1 });
            db.prepare('UPDATE cash_boxes SET current_balance = current_balance + ? WHERE id = 1').run(paidAmount);
          }
          if (remAmount > 0) {
            journalLines.push({ account: ACC_AR, debit: remAmount, credit: 0, partyType: 'customer', partyId: custId });
          }

          // COGS
          if (invoiceCogs > 0) {
            journalLines.push({ account: ACC_COGS, debit: invoiceCogs, credit: 0 });
            journalLines.push({ account: ACC_INVENTORY, debit: 0, credit: invoiceCogs });
          }

          postJournalEntry(dateStr, `فاتورة مبيعات رقم ${invoiceNum}`, 'sales_invoice', saleId, journalLines);
          invoiceCounter++;
        }
      }

      // C. Customer repayments & Supplier payments every few days
      if (currentDate.getDate() % 7 === 0) {
        const debtors = db.prepare('SELECT id, name, balance FROM customers WHERE balance > 0').all();
        debtors.forEach(d => {
          const payAmt = Math.floor(d.balance * 0.4);
          if (payAmt > 500) {
            const payNum = getSeqNum('PAY', dateStr);
            const payRes = db.prepare(`
              INSERT INTO payments (payment_number, type, direction, party_id, party_type, amount, payment_method, date, user_id, notes)
              VALUES (?, 'collection', 'in', ?, 'customer', ?, 'cash', ?, 1, 'سداد جزء من المديونية للزبون')
            `).run(payNum, d.id, payAmt, dateStr);

            db.prepare('UPDATE customers SET balance = balance - ? WHERE id = ?').run(payAmt, d.id);
            db.prepare('UPDATE cash_boxes SET current_balance = current_balance + ? WHERE id = 1').run(payAmt);

            postJournalEntry(dateStr, `سند قبض نقدي رقم ${payNum} من الزبون ${d.name}`, 'payment', payRes.lastInsertRowid, [
              { account: ACC_CASH, debit: payAmt, credit: 0, partyType: 'cashbox', partyId: 1 },
              { account: ACC_AR, debit: 0, credit: payAmt, partyType: 'customer', partyId: d.id }
            ]);
          }
        });
      }

      if (currentDate.getDate() % 14 === 0) {
        const creditors = db.prepare('SELECT id, name, balance FROM suppliers WHERE balance > 0').all();
        creditors.forEach(s => {
          const payAmt = Math.floor(s.balance * 0.6);
          if (payAmt > 500) {
            const payNum = getSeqNum('PAY', dateStr);
            const payRes = db.prepare(`
              INSERT INTO payments (payment_number, type, direction, party_id, party_type, amount, payment_method, date, user_id, notes)
              VALUES (?, 'payment', 'out', ?, 'supplier', ?, 'cash', ?, 1, 'دفع مستحقات للمورد نقدياً')
            `).run(payNum, s.id, payAmt, dateStr);

            db.prepare('UPDATE suppliers SET balance = balance - ? WHERE id = ?').run(payAmt, s.id);
            db.prepare('UPDATE cash_boxes SET current_balance = current_balance - ? WHERE id = 1').run(payAmt);

            postJournalEntry(dateStr, `سند صرف نقدي رقم ${payNum} للمورد ${s.name}`, 'payment', payRes.lastInsertRowid, [
              { account: ACC_AP, debit: payAmt, credit: 0, partyType: 'supplier', partyId: s.id },
              { account: ACC_CASH, debit: 0, credit: payAmt, partyType: 'cashbox', partyId: 1 }
            ]);
          }
        });
      }

      // D. Expenses & Salaries
      if (currentDate.getDate() === 1) {
        const expNum = getSeqNum('EXP', dateStr);
        const expRes = db.prepare(`
          INSERT INTO expenses (expense_number, category, description, amount, payment_method, date, user_id, notes)
          VALUES (?, 'إيجارات', 'إيجار المحل الشهري', 50000, 'cash', ?, 1, 'مصروف إيجار مقر النشاط المالي')
        `).run(expNum, dateStr);

        db.prepare('UPDATE cash_boxes SET current_balance = current_balance - 50000 WHERE id = 1').run();

        postJournalEntry(dateStr, `مصروف إيجار المحل الشهري - سند ${expNum}`, 'expense', expRes.lastInsertRowid, [
          { account: ACC_OP_EXPENSE, debit: 50000, credit: 0 },
          { account: ACC_CASH, debit: 0, credit: 50000, partyType: 'cashbox', partyId: 1 }
        ]);
      }

      if (currentDate.getDate() === 25) {
        const expNum = getSeqNum('EXP', dateStr);
        const expRes = db.prepare(`
          INSERT INTO expenses (expense_number, category, description, amount, payment_method, date, user_id, notes)
          VALUES (?, 'رواتب وأجور', 'رواتب موظفي المتجر', 80000, 'cash', ?, 1, 'رواتب تشغيل متجر قطع الغيار')
        `).run(expNum, dateStr);

        db.prepare('UPDATE cash_boxes SET current_balance = current_balance - 80000 WHERE id = 1').run();

        postJournalEntry(dateStr, `مصروف رواتب الموظفين - سند ${expNum}`, 'expense', expRes.lastInsertRowid, [
          { account: ACC_OP_EXPENSE, debit: 80000, credit: 0 },
          { account: ACC_CASH, debit: 0, credit: 80000, partyType: 'cashbox', partyId: 1 }
        ]);
      }

      if (currentDate.getDate() % 5 === 0) {
        const amt = Math.floor(Math.random() * 2000) + 1000;
        const expNum = getSeqNum('EXP', dateStr);
        const expRes = db.prepare(`
          INSERT INTO expenses (expense_number, category, description, amount, payment_method, date, user_id, notes)
          VALUES (?, 'مصاريف تشغيلية', 'شاي وقهوة ومستلزمات نظافة وضيافة ورقية للزبائن', ?, 'cash', ?, 1, 'مصاريف تشغيلية متنوعة')
        `).run(expNum, amt, dateStr);

        db.prepare('UPDATE cash_boxes SET current_balance = current_balance - ? WHERE id = 1').run(amt);

        postJournalEntry(dateStr, `مصاريف ضيافة وتشغيل متنوعة - سند ${expNum}`, 'expense', expRes.lastInsertRowid, [
          { account: ACC_OP_EXPENSE, debit: amt, credit: 0 },
          { account: ACC_CASH, debit: 0, credit: amt, partyType: 'cashbox', partyId: 1 }
        ]);
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }
  });
  seedTransaction();

  db.close();
  console.log(' Algeria Auto Parts Simulation Seeder completed successfully!');
  app.quit();
}).catch(err => {
  console.error(err);
  app.quit();
});
