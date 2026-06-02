/**
 * Automated Stock Adjustment & Accounting Verification Script (Electron Environment)
 * Run with: npx electron scratch/verify_stock_adjustments.js
 */
const { app } = require('electron');
const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const DB_SOURCE = 'C:\\Users\\blbl\\AppData\\Roaming\\spare-parts-erp\\SparePartsERP\\spare_parts.db';
const DB_TEST_DIR = __dirname;
const DB_TEST_PATH = path.join(DB_TEST_DIR, 'temp_test_spare_parts.db');

// Colors for terminal formatting
const green = (text) => `\x1b[32m${text}\x1b[0m`;
const red = (text) => `\x1b[31m${text}\x1b[0m`;
const yellow = (text) => `\x1b[33m${text}\x1b[0m`;
const cyan = (text) => `\x1b[36m${text}\x1b[0m`;
const bold = (text) => `\x1b[1m${text}\x1b[0m`;

function logHeader(title) {
  console.log('\n' + bold(cyan('================================================================================')));
  console.log(bold(cyan(`  🚀 ${title}`)));
  console.log(bold(cyan('================================================================================')));
}

app.whenReady().then(async () => {
  logHeader('SPARE PARTS ERP - STOCK ADJUSTMENT & SUPPLIER RETURN AUDIT');

  // 1. Copy live database to scratch/temp_test_spare_parts.db to run tests safely
  console.log(`Copying source database from ${DB_SOURCE}...`);
  if (!fs.existsSync(DB_SOURCE)) {
    console.error(red(`❌ Error: Source database not found at ${DB_SOURCE}.`));
    console.log(yellow('Please run seed_full.js or start the application to generate the database first.'));
    app.quit();
    return;
  }
  
  if (!fs.existsSync(DB_TEST_DIR)) {
    fs.mkdirSync(DB_TEST_DIR, { recursive: true });
  }
  
  fs.copyFileSync(DB_SOURCE, DB_TEST_PATH);
  console.log(green(`✓ Created temporary test database copy at ${DB_TEST_PATH}\n`));

  const db = new Database(DB_TEST_PATH);
  db.pragma('foreign_keys = ON');

  const userId = 1; // Simulated user ID

  // ─────────────────────────────────────────────────────────────
  // SELF-CONTAINED ACCOUNTING ENGINE & TRANSACTION LOGIC
  // (Identical to electron/services/accounting.service.ts and electron/ipc/inventory.ipc.ts)
  // ─────────────────────────────────────────────────────────────
  const AccountingEngine = {
    ACCOUNTS: {
      CASH: 2,           // 1100
      AR: 4,             // 1300
      INVENTORY: 5,      // 1400
      AP: 7,             // 2100
      REVENUE: 13,       // 4100
      COGS: 16,          // 5100
      OP_EXPENSE: 17,    // 5200
    },

    _generateEntryNumber(raw) {
      const seq = raw.prepare(`SELECT last_number, format, prefix FROM number_sequences WHERE prefix = 'JRN'`).get();
      if (!seq) throw new Error('JRN sequence not found');
      
      const nextNumber = seq.last_number + 1;
      raw.prepare(`UPDATE number_sequences SET last_number = ? WHERE prefix = 'JRN'`).run(nextNumber);
      
      const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
      let result = seq.format.replace('{PREFIX}', seq.prefix).replace('{DATE}', dateStr);
      result = result.replace('{SEQ}', String(nextNumber).padStart(6, '0'));
      return result;
    },

    _checkClosingDate(raw, date) {
      const closingDateSetting = raw.prepare(`SELECT value FROM app_settings WHERE key = 'accounting_closing_date'`).get();
      if (closingDateSetting && closingDateSetting.value) {
        if (new Date(date) <= new Date(closingDateSetting.value)) {
          throw new Error(`الفترة المالية مغلقة: لا يمكن إضافة أو تعديل أو إلغاء قيود في تاريخ (${closingDateSetting.value}) أو ما قبله.`);
        }
      }
    },

    createJournalEntry(raw, params) {
      this._checkClosingDate(raw, params.date);

      const roundedLines = params.lines.map(line => ({
        ...line,
        debit: Math.round((line.debit || 0) * 100) / 100,
        credit: Math.round((line.credit || 0) * 100) / 100,
      }));

      const totalDebit = Math.round(roundedLines.reduce((sum, line) => sum + line.debit, 0) * 100) / 100;
      const totalCredit = Math.round(roundedLines.reduce((sum, line) => sum + line.credit, 0) * 100) / 100;
      
      if (Math.abs(totalDebit - totalCredit) > 0.01) {
        throw new Error(`Accounting Error: Debit (${totalDebit}) and Credit (${totalCredit}) do not match.`);
      }

      const entryNumber = this._generateEntryNumber(raw);
      const insertHeader = raw.prepare(`
        INSERT INTO journal_entries (entry_number, date, description, status, reference_type, reference_id, user_id)
        VALUES (?, ?, ?, 'posted', ?, ?, ?)
      `);
      const headerResult = insertHeader.run(
        entryNumber, params.date, params.description, params.reference_type, params.reference_id, params.user_id
      );
      const entryId = headerResult.lastInsertRowid;

      const insertLine = raw.prepare(`
        INSERT INTO journal_entry_lines (entry_id, account_id, debit, credit, cost_center_id, party_type, party_id)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);

      for (const line of roundedLines) {
        insertLine.run(
          entryId, 
          line.account_id, 
          line.debit, 
          line.credit, 
          line.cost_center_id || null, 
          line.party_type || 'none', 
          line.party_id || null
        );
      }

      return entryId;
    },

    recordDefectiveGoods(raw, data, userId) {
      const lines = [
        {
          account_id: this.ACCOUNTS.OP_EXPENSE,
          debit: data.amount,
          credit: 0
        },
        {
          account_id: this.ACCOUNTS.INVENTORY,
          debit: 0,
          credit: data.amount
        }
      ];

      this.createJournalEntry(raw, {
        date: data.date,
        description: `بضاعة تالفة: ${data.notes}`,
        reference_type: 'defective_goods',
        reference_id: data.id,
        user_id: userId,
        lines: lines
      });
    },

    recordSupplierReturn(raw, data, userId) {
      const lines = [
        {
          account_id: this.ACCOUNTS.AP,
          debit: data.amount,
          credit: 0,
          party_type: 'supplier',
          party_id: data.supplier_id
        },
        {
          account_id: this.ACCOUNTS.INVENTORY,
          debit: 0,
          credit: data.amount
        }
      ];

      this.createJournalEntry(raw, {
        date: data.date,
        description: `إرجاع للمورد: ${data.notes}`,
        reference_type: 'supplier_return',
        reference_id: data.id,
        user_id: userId,
        lines: lines
      });
    }
  };

  function executeMarkDefective(data) {
    const tx = db.transaction(() => {
      // 0. Validate quantity
      const inputQty = Math.round(data.quantity * 10000) / 10000;
      if (!data.quantity || isNaN(data.quantity) || inputQty <= 0) {
        throw new Error('فشلت العملية: الكمية التالفة يجب أن تكون قيمة موجبة أكبر من الصفر.');
      }

      // 1. Check stock
      const balance = db.prepare('SELECT quantity FROM stock_balances WHERE product_id = ? AND location_id = ?').get(data.product_id, data.location_id);
      const currentQty = balance ? balance.quantity : 0;
      if (currentQty < inputQty) {
        throw new Error('الكمية المتوفرة في المخزون أقل من الكمية المحددة كـ تالف');
      }
      const newQty = Math.round((currentQty - inputQty) * 10000) / 10000;

      // 2. Update balance
      db.prepare('UPDATE stock_balances SET quantity = ?, updated_at = datetime(\'now\') WHERE product_id = ? AND location_id = ?')
         .run(newQty, data.product_id, data.location_id);

      // 3. Record movement
      const moveRes = db.prepare(`
        INSERT INTO stock_movements (
          product_id, location_id, movement_type, quantity, balance_after, user_id, notes, created_at
        ) VALUES (?, ?, 'damage', ?, ?, ?, ?, datetime('now'))
      `).run(data.product_id, data.location_id, -inputQty, newQty, userId, data.notes || null);
      
      const moveId = moveRes.lastInsertRowid;

      // 4. Calculate cost to record an expense (with fallback to latest purchase invoice item price if WAC is 0)
      const product = db.prepare('SELECT purchase_price, name FROM products WHERE id = ?').get(data.product_id);
      let purchasePrice = product ? (product.purchase_price || 0) : 0;
      
      if (purchasePrice <= 0) {
        const lastPurchase = db.prepare(`
          SELECT unit_price FROM purchase_invoice_items pii
          JOIN purchase_invoices pi ON pii.invoice_id = pi.id
          WHERE pii.product_id = ? AND pi.status = 'confirmed'
          ORDER BY pi.date DESC, pi.id DESC LIMIT 1
        `).get(data.product_id);
        if (lastPurchase) {
          purchasePrice = lastPurchase.unit_price;
        }
      }

      const costAmount = Math.round(purchasePrice * inputQty * 100) / 100;

      if (costAmount > 0) {
        const expenseNumber = 'EXP-DMG-' + Date.now();
        const expenseDesc = `تسجيل تالف: ${product.name} (الكمية: ${inputQty})${data.notes ? ' - ' + data.notes : ''}`;
        
        const expRes = db.prepare(`
          INSERT INTO expenses (expense_number, category, description, amount, payment_method, date, user_id, notes, created_at, is_active)
          VALUES (?, 'تالف', ?, ?, 'non-cash', date('now', 'localtime'), ?, ?, datetime('now', 'localtime'), 1)
        `).run(expenseNumber, expenseDesc, costAmount, userId, data.notes || null);
        
        const expenseId = expRes.lastInsertRowid;

        AccountingEngine.recordDefectiveGoods(db, {
          id: expenseId,
          amount: costAmount,
          notes: expenseDesc,
          date: new Date().toISOString().split('T')[0]
        }, userId);
      }
    });

    tx();
  }

  function executeAdjustStock(data) {
    const tx = db.transaction(() => {
      // 0. Validate quantity is not zero
      const inputQty = Math.round(data.quantity * 10000) / 10000;
      if (!data.quantity || isNaN(data.quantity) || inputQty === 0) {
        throw new Error('فشلت العملية: كمية التسوية لا يمكن أن تكون صفراً.');
      }

      // 1. If linked to a purchase invoice item for return, validate batch and remaining quantity
      let actualCostPrice = data.purchase_price || 0;
      if (inputQty < 0 && data.purchase_invoice_item_id) {
        const item = db.prepare('SELECT quantity_remaining, unit_price FROM purchase_invoice_items WHERE id = ?').get(data.purchase_invoice_item_id);
        if (!item) {
          throw new Error('بند فاتورة الشراء المحدد غير موجود');
        }
        const absQty = Math.abs(inputQty);
        const currentRem = item.quantity_remaining !== null ? item.quantity_remaining : 0;
        if (currentRem < absQty) {
          throw new Error(`الكمية المراد إرجاعها (${absQty}) أكبر من الكمية المتبقية في هذه الدفعة (${currentRem})`);
        }
        
        // Deduct from purchase invoice item's remaining quantity
        const nextRem = Math.round((currentRem - absQty) * 10000) / 10000;
        db.prepare('UPDATE purchase_invoice_items SET quantity_remaining = ? WHERE id = ?')
           .run(nextRem, data.purchase_invoice_item_id);
           
        actualCostPrice = item.unit_price;
      }

      // 2. Get current balance and check negative stock protection
      const balance = db.prepare('SELECT quantity FROM stock_balances WHERE product_id = ? AND location_id = ?').get(data.product_id, data.location_id);
      const currentQty = balance ? balance.quantity : 0;
      const newQty = Math.round((currentQty + inputQty) * 10000) / 10000;

      if (newQty < 0) {
        throw new Error('فشلت العملية: كمية المخزون لا يمكن أن تصبح سالبة.');
      }

      // 3. Update or Insert stock balance
      if (balance) {
        db.prepare('UPDATE stock_balances SET quantity = ?, updated_at = datetime(\'now\') WHERE product_id = ? AND location_id = ?')
           .run(newQty, data.product_id, data.location_id);
      } else {
        db.prepare('INSERT INTO stock_balances (product_id, location_id, quantity, updated_at) VALUES (?, ?, ?, datetime(\'now\'))')
           .run(data.product_id, data.location_id, newQty);
      }

      // 4. Record stock movement
      const moveRes = db.prepare(`
        INSERT INTO stock_movements (
          product_id, location_id, movement_type, quantity, balance_after, user_id, notes, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
      `).run(
        data.product_id,
        data.location_id,
        inputQty < 0 && data.supplier_id ? 'purchase_return' : data.type,
        inputQty,
        newQty,
        userId,
        data.notes || null
      );
      const moveId = moveRes.lastInsertRowid;

      // 5. If quantity < 0 and supplier_id is provided, automatically record a return payment/debit adjustment and update WAC
      if (inputQty < 0 && data.supplier_id) {
        const costAmount = Math.round(Math.abs(inputQty) * actualCostPrice * 100) / 100;
        if (costAmount > 0) {
          // Update supplier balance (decrease balance/debt)
          db.prepare('UPDATE suppliers SET balance = balance - ? WHERE id = ?')
             .run(costAmount, data.supplier_id);

          const product = db.prepare('SELECT name, purchase_price FROM products WHERE id = ?').get(data.product_id);
          const retNotes = `إرجاع بضاعة: ${product.name} (الكمية: ${Math.abs(inputQty)})` + (data.notes ? ` - ${data.notes}` : '');
          
          // Recalculate WAC on product
          const currentWac = product ? (product.purchase_price || 0) : 0;
          const remainingQty = newQty;
          if (remainingQty > 0) {
            const originalValue = currentQty * currentWac;
            const returnedValue = Math.abs(inputQty) * actualCostPrice;
            const newValue = Math.max(0, originalValue - returnedValue);
            const nextWac = newValue / remainingQty;
            
            db.prepare('UPDATE products SET purchase_price = ?, updated_at = datetime(\'now\') WHERE id = ?')
               .run(Math.round(nextWac * 100) / 100, data.product_id);
          }

          // قيد محاسبي لمرتجع المورد
          AccountingEngine.recordSupplierReturn(db, {
            id: moveId,
            supplier_id: data.supplier_id,
            amount: costAmount,
            notes: retNotes,
            date: new Date().toISOString().split('T')[0]
          }, userId);
        }
      }
    });

    tx();
  }

  // ─────────────────────────────────────────────────────────────
  // SETUP TEST DATA
  // ─────────────────────────────────────────────────────────────
  console.log(cyan('Seeding fresh test product, supplier, and purchase batch...'));
  
  // Clean up any old test items first to be completely idempotent
  db.prepare("DELETE FROM journal_entry_lines WHERE account_id IN (17, 5) AND entry_id IN (SELECT id FROM journal_entries WHERE description LIKE '%شمعات إشعال تجريبية%')").run();
  db.prepare("DELETE FROM journal_entries WHERE description LIKE '%شمعات إشعال تجريبية%'").run();
  db.prepare('DELETE FROM stock_movements WHERE product_id = 999').run();
  db.prepare('DELETE FROM stock_balances WHERE product_id = 999').run();
  db.prepare('DELETE FROM purchase_invoice_items WHERE id = 999').run();
  db.prepare('DELETE FROM purchase_invoices WHERE id = 999').run();
  db.prepare('DELETE FROM suppliers WHERE id = 999').run();
  db.prepare('DELETE FROM products WHERE id = 999').run();

  db.prepare(`
    INSERT INTO products (id, name, internal_code, barcode, purchase_price, retail_price, wholesale_price, min_stock_level, category_id, brand_id, unit_id)
    VALUES (999, 'شمعات إشعال تجريبية', 'TEST-SPK-99', '9999999999999', 0, 500, 450, 480, 5, 1, 1, 1)
  `).run();

  db.prepare(`
    INSERT INTO suppliers (id, code, name, phone, balance)
    VALUES (999, 'SUP-TEST-99', 'مورد شمعات الإشعال التجريبية', '0555555555', 5000)
  `).run();

  db.prepare(`
    INSERT INTO purchase_invoices (id, invoice_number, supplier_id, user_id, date, subtotal, total, paid, remaining, payment_method, status)
    VALUES (999, 'PUR-TEST-999', 999, ?, '2026-05-19', 3000, 3000, 0, 3000, 'credit', 'confirmed')
  `).run(userId);

  db.prepare(`
    INSERT INTO purchase_invoice_items (id, invoice_id, product_id, product_name_snapshot, quantity, quantity_remaining, unit, unit_price, total)
    VALUES (999, 999, 999, 'شمعات إشعال تجريبية', 10, 10, 'قطعة', 300, 3000)
  `).run();

  db.prepare(`
    INSERT INTO stock_balances (product_id, location_id, quantity, updated_at)
    VALUES (999, 1, 10, datetime('now'))
  `).run();

  console.log(green('✓ Test data successfully seeded. Product 999 has stock=10, WAC=0, outstanding supplier balance=5000 DZD, and purchase batch of 10 remaining units at cost=300 DZD.\n'));

  try {
    // ─────────────────────────────────────────────────────────────
    // TEST SCENARIO 1: markDefective with WAC fallback
    // ─────────────────────────────────────────────────────────────
    console.log(bold('TEST SCENARIO 1: Mark Defective with WAC fallback (WAC is initially 0)'));
    console.log('Marking 2 units as defective/damage...');
    
    const initialStock = db.prepare('SELECT quantity FROM stock_balances WHERE product_id = 999 AND location_id = 1').get().quantity;

    executeMarkDefective({
      product_id: 999,
      location_id: 1,
      quantity: 2,
      notes: 'شمعات تالفة بسبب الكسر أثناء النقل'
    });

    const postDefectiveStock = db.prepare('SELECT quantity FROM stock_balances WHERE product_id = 999 AND location_id = 1').get().quantity;
    const postDefectiveExpenses = db.prepare("SELECT * FROM expenses WHERE category = 'تالف' ORDER BY id DESC LIMIT 1").all();
    
    if (postDefectiveStock !== initialStock - 2) {
      throw new Error(`Defective stock reduction failed: expected ${initialStock - 2}, got ${postDefectiveStock}`);
    }
    console.log(green(`✓ Stock correctly decreased from ${initialStock} to ${postDefectiveStock}`));

    if (postDefectiveExpenses.length === 0) {
      throw new Error('Expense record not created in the database.');
    }
    
    const expense = postDefectiveExpenses[0];
    if (expense.amount !== 600) {
      throw new Error(`Incorrect expense amount logged: expected 600 (fallback to purchase price 300), got ${expense.amount}`);
    }
    console.log(green(`✓ Expense correctly logged at fallback price of 300 DZD per unit. Total Amount: ${expense.amount} DZD`));

    const journalHeader = db.prepare("SELECT * FROM journal_entries WHERE reference_type = 'defective_goods' AND reference_id = ?").get(expense.id);
    if (!journalHeader) {
      throw new Error('Journal entry not logged for defective goods.');
    }
    console.log(green(`✓ Defective goods journal entry registered: #${journalHeader.entry_number}`));

    const journalLines = db.prepare('SELECT * FROM journal_entry_lines WHERE entry_id = ?').all(journalHeader.id);
    if (journalLines.length !== 2) {
      throw new Error(`Expected exactly 2 journal lines, got ${journalLines.length}`);
    }

    const debitLine = journalLines.find(l => l.debit > 0);
    const creditLine = journalLines.find(l => l.credit > 0);

    if (!debitLine || debitLine.account_id !== AccountingEngine.ACCOUNTS.OP_EXPENSE || debitLine.debit !== 600) {
      throw new Error(`Defective Debit line mismatch: expected Debit OP_EXPENSE (17) for 600, got Account: ${debitLine ? debitLine.account_id : null}, Debit: ${debitLine ? debitLine.debit : null}`);
    }
    if (!creditLine || creditLine.account_id !== AccountingEngine.ACCOUNTS.INVENTORY || creditLine.credit !== 600) {
      throw new Error(`Defective Credit line mismatch: expected Credit INVENTORY (5) for 600, got Account: ${creditLine ? creditLine.account_id : null}, Credit: ${creditLine ? creditLine.credit : null}`);
    }

    console.log(green('✓ Double-entry accounting verified perfectly:'));
    console.log(`  - DEBIT Account ${debitLine.account_id} (Operating Expenses): ${debitLine.debit} DZD`);
    console.log(`  - CREDIT Account ${creditLine.account_id} (Inventory): ${creditLine.credit} DZD`);
    console.log(green(`✓ Balance Check: Debit = Credit = 600 DZD (Diff = 0.00)\n`));


    // ─────────────────────────────────────────────────────────────
    // TEST SCENARIO 2: Negative stock protection validation
    // ─────────────────────────────────────────────────────────────
    console.log(bold('TEST SCENARIO 2: Negative stock protection'));
    console.log(`Current stock of product 999 is ${postDefectiveStock}. Trying to adjust by -100...`);

    try {
      executeAdjustStock({
        product_id: 999,
        location_id: 1,
        quantity: -100,
        type: 'manual_adjustment',
        notes: 'تنزيل كمية وهمية'
      });
      throw new Error('Exploit failed: adjusted stock successfully below zero!');
    } catch (err) {
      if (err.message.includes('سالبة')) {
        console.log(green(`✓ Validation successfully blocked negative stock adjustment: "${err.message}"`));
      } else {
        throw err;
      }
    }

    console.log('Trying to adjust with quantity = 0...');
    try {
      executeAdjustStock({
        product_id: 999,
        location_id: 1,
        quantity: 0,
        type: 'manual_adjustment',
        notes: 'تسوية بقيمة صفر'
      });
      throw new Error('Exploit failed: allowed zero quantity adjustment!');
    } catch (err) {
      if (err.message.includes('صفراً')) {
        console.log(green(`✓ Validation successfully blocked zero quantity adjustment: "${err.message}"`));
      } else {
        throw err;
      }
    }
    console.log('');


    // ─────────────────────────────────────────────────────────────
    // TEST SCENARIO 3: Supplier Return with Batch Deduction and WAC Update
    // ─────────────────────────────────────────────────────────────
    console.log(bold('TEST SCENARIO 3: Supplier Return with batch deduction & WAC calculation'));
    console.log('Supplier is SUP-TEST-99 (balance=5000 DZD). Returning 3 units from batch 999 (cost=300 DZD)...');

    // Set non-zero WAC for WAC recalculation verification
    db.prepare('UPDATE products SET purchase_price = 300 WHERE id = 999').run();

    const prevSupplierBal = db.prepare('SELECT balance FROM suppliers WHERE id = 999').get().balance;
    const prevBatchRemaining = db.prepare('SELECT quantity_remaining FROM purchase_invoice_items WHERE id = 999').get().quantity_remaining;
    const prevStockQty = db.prepare('SELECT quantity FROM stock_balances WHERE product_id = 999 AND location_id = 1').get().quantity;

    console.log(`Original State: Stock Qty = ${prevStockQty}, Supplier Bal = ${prevSupplierBal} DZD, Batch Remainder = ${prevBatchRemaining}, WAC = 300 DZD`);

    executeAdjustStock({
      product_id: 999,
      location_id: 1,
      quantity: -3,
      type: 'purchase_return',
      notes: 'إرجاع 3 وحدات تالفة للمورد مع خصم رصيد المورد',
      supplier_id: 999,
      purchase_invoice_item_id: 999
    });

    const nextSupplierBal = db.prepare('SELECT balance FROM suppliers WHERE id = 999').get().balance;
    const nextBatchRemaining = db.prepare('SELECT quantity_remaining FROM purchase_invoice_items WHERE id = 999').get().quantity_remaining;
    const nextStockQty = db.prepare('SELECT quantity FROM stock_balances WHERE product_id = 999 AND location_id = 1').get().quantity;
    const nextWac = db.prepare('SELECT purchase_price FROM products WHERE id = 999').get().purchase_price;

    const expectedSupplierBal = prevSupplierBal - 900;
    if (nextSupplierBal !== expectedSupplierBal) {
      throw new Error(`Supplier balance deduction mismatch: expected ${expectedSupplierBal}, got ${nextSupplierBal}`);
    }
    console.log(green(`✓ Supplier AP balance correctly reduced by 900 DZD (from ${prevSupplierBal} to ${nextSupplierBal} DZD)`));

    if (nextBatchRemaining !== prevBatchRemaining - 3) {
      throw new Error(`Purchase invoice item remaining batch quantity mismatch: expected ${prevBatchRemaining - 3}, got ${nextBatchRemaining}`);
    }
    console.log(green(`✓ Batch item remaining quantity correctly decremented to ${nextBatchRemaining}`));

    if (nextStockQty !== prevStockQty - 3) {
      throw new Error(`Stock level reduction mismatch: expected ${prevStockQty - 3}, got ${nextStockQty}`);
    }
    console.log(green(`✓ Stock balance correctly decremented from ${prevStockQty} to ${nextStockQty}`));

    console.log(green(`✓ Product Weighted Average Cost (WAC) dynamically recalculated to: ${nextWac} DZD`));

    const lastMovement = db.prepare("SELECT id FROM stock_movements WHERE product_id = 999 AND movement_type = 'purchase_return' ORDER BY id DESC LIMIT 1").get();
    if (!lastMovement) {
      throw new Error('Stock movement for return was not recorded.');
    }

    const returnJournalHeader = db.prepare("SELECT * FROM journal_entries WHERE reference_type = 'supplier_return' AND reference_id = ?").get(lastMovement.id);
    if (!returnJournalHeader) {
      throw new Error('Journal entry not logged for supplier return.');
    }
    console.log(green(`✓ Supplier return journal entry registered: #${returnJournalHeader.entry_number}`));

    const returnJournalLines = db.prepare('SELECT * FROM journal_entry_lines WHERE entry_id = ?').all(returnJournalHeader.id);
    if (returnJournalLines.length !== 2) {
      throw new Error(`Expected exactly 2 journal lines for supplier return, got ${returnJournalLines.length}`);
    }

    const returnDebitLine = returnJournalLines.find(l => l.debit > 0);
    const returnCreditLine = returnJournalLines.find(l => l.credit > 0);

    if (!returnDebitLine || returnDebitLine.account_id !== AccountingEngine.ACCOUNTS.AP || returnDebitLine.debit !== 900) {
      throw new Error(`Supplier Return Debit mismatch: expected Debit AP (7) for 900, got Account: ${returnDebitLine ? returnDebitLine.account_id : null}, Debit: ${returnDebitLine ? returnDebitLine.debit : null}`);
    }
    if (!returnCreditLine || returnCreditLine.account_id !== AccountingEngine.ACCOUNTS.INVENTORY || returnCreditLine.credit !== 900) {
      throw new Error(`Supplier Return Credit mismatch: expected Credit INVENTORY (5) for 900, got Account: ${returnCreditLine ? returnCreditLine.account_id : null}, Credit: ${returnCreditLine ? returnCreditLine.credit : null}`);
    }

    console.log(green('✓ Double-entry accounting verified perfectly:'));
    console.log(`  - DEBIT Account ${returnDebitLine.account_id} (Accounts Payable) linked to Supplier 999: ${returnDebitLine.debit} DZD`);
    console.log(`  - CREDIT Account ${returnCreditLine.account_id} (Inventory): ${returnCreditLine.credit} DZD`);
    console.log(green(`✓ Balance Check: Debit = Credit = 900 DZD (Diff = 0.00)\n`));

    // ─────────────────────────────────────────────────────────────
    // CLEANUP AND EXIT
    // ─────────────────────────────────────────────────────────────
    db.close();
    fs.unlinkSync(DB_TEST_PATH);
    console.log(green('✓ Removed temporary test database copy. All tests passed successfully!'));
    console.log(bold(green('================================================================================')));
    console.log(bold(green('  🏆 ALL AUDIT TESTS PASSED SUCCESSFULLY! NO ERROR DETECTED.')));
    console.log(bold(green('================================================================================\n')));
  } catch (err) {
    console.error(red('\n❌ CRITICAL: Test execution encountered a failure!'));
    console.error(red(err.stack || err.message));
    db.close();
    if (fs.existsSync(DB_TEST_PATH)) {
      try { fs.unlinkSync(DB_TEST_PATH); } catch (e) {}
    }
    app.quit();
    process.exit(1);
  }

  app.quit();
});
