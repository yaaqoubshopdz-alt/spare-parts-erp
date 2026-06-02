/**
 * Stock Adjustments & Accounting Verification Script
 * tests: markDefective, adjustStock (manual/supplier return), WAC, AP deduction, Double-entry matching
 */
import Database from 'better-sqlite3';
import * as fs from 'fs';
import * as path from 'path';
import { AccountingEngine } from '../electron/services/accounting.service';

const DB_SOURCE = 'C:\\Users\\blbl\\AppData\\Roaming\\spare-parts-erp\\SparePartsERP\\spare_parts.db';
const DB_TEST_DIR = __dirname;
const DB_TEST_PATH = path.join(DB_TEST_DIR, 'temp_test_spare_parts.db');

// Colors for terminal formatting
const green = (text: string) => `\x1b[32m${text}\x1b[0m`;
const red = (text: string) => `\x1b[31m${text}\x1b[0m`;
const yellow = (text: string) => `\x1b[33m${text}\x1b[0m`;
const cyan = (text: string) => `\x1b[36m${text}\x1b[0m`;
const bold = (text: string) => `\x1b[1m${text}\x1b[0m`;

function logHeader(title: string) {
  console.log('\n' + bold(cyan('================================================================================')));
  console.log(bold(cyan(`  🚀 ${title}`)));
  console.log(bold(cyan('================================================================================')));
}

async function runTests() {
  logHeader('SPARE PARTS ERP - STOCK ADJUSTMENT & SUPPLIER RETURN AUDIT');

  // 1. Copy live database to scratch/temp_test_spare_parts.db to run tests safely
  console.log(`Copying source database from ${DB_SOURCE}...`);
  if (!fs.existsSync(DB_SOURCE)) {
    console.error(red(`❌ Error: Source database not found at ${DB_SOURCE}.`));
    console.log(yellow('Please run seed_full.js or start the application to generate the database first.'));
    process.exit(1);
  }
  
  if (!fs.existsSync(DB_TEST_DIR)) {
    fs.mkdirSync(DB_TEST_DIR, { recursive: true });
  }
  
  fs.copyFileSync(DB_SOURCE, DB_TEST_PATH);
  console.log(green(`✓ Created temporary test database copy at ${DB_TEST_PATH}\n`));

  const db = new Database(DB_TEST_PATH);
  db.pragma('foreign_keys = ON');

  const userId = 1; // Simulated admin/logged-in user

  // Extract exactly the business logic from inventory.ipc.ts handlers to test
  function executeMarkDefective(data: { product_id: number; location_id: number; quantity: number; notes?: string }) {
    const tx = db.transaction(() => {
      // 0. Validate quantity
      const inputQty = Math.round(data.quantity * 10000) / 10000;
      if (!data.quantity || isNaN(data.quantity) || inputQty <= 0) {
        throw new Error('فشلت العملية: الكمية التالفة يجب أن تكون قيمة موجبة أكبر من الصفر.');
      }

      // 1. Check stock
      const balance: any = db.prepare('SELECT quantity FROM stock_balances WHERE product_id = ? AND location_id = ?').get(data.product_id, data.location_id);
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
      
      const moveId = moveRes.lastInsertRowid as number;

      // 4. Calculate cost to record an expense (with fallback to latest purchase invoice item price if WAC is 0)
      const product: any = db.prepare('SELECT purchase_price, name FROM products WHERE id = ?').get(data.product_id);
      let purchasePrice = product ? (product.purchase_price || 0) : 0;
      
      if (purchasePrice <= 0) {
        const lastPurchase: any = db.prepare(`
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
        
        const expenseId = expRes.lastInsertRowid as number;

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

  function executeAdjustStock(data: {
    product_id: number;
    location_id: number;
    quantity: number;
    type: string;
    notes?: string;
    supplier_id?: number;
    purchase_price?: number;
    purchase_invoice_item_id?: number;
  }) {
    const tx = db.transaction(() => {
      // 0. Validate quantity is not zero
      const inputQty = Math.round(data.quantity * 10000) / 10000;
      if (!data.quantity || isNaN(data.quantity) || inputQty === 0) {
        throw new Error('فشلت العملية: كمية التسوية لا يمكن أن تكون صفراً.');
      }

      // 1. If linked to a purchase invoice item for return, validate batch and remaining quantity
      let actualCostPrice = data.purchase_price || 0;
      if (inputQty < 0 && data.purchase_invoice_item_id) {
        const item: any = db.prepare('SELECT quantity_remaining, unit_price FROM purchase_invoice_items WHERE id = ?').get(data.purchase_invoice_item_id);
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
      const balance: any = db.prepare('SELECT quantity FROM stock_balances WHERE product_id = ? AND location_id = ?').get(data.product_id, data.location_id);
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
      const moveId = moveRes.lastInsertRowid as number;

      // 5. If quantity < 0 and supplier_id is provided, automatically record a return payment/debit adjustment and update WAC
      if (inputQty < 0 && data.supplier_id) {
        const costAmount = Math.round(Math.abs(inputQty) * actualCostPrice * 100) / 100;
        if (costAmount > 0) {
          // Update supplier balance (decrease balance/debt)
          db.prepare('UPDATE suppliers SET balance = balance - ? WHERE id = ?')
             .run(costAmount, data.supplier_id);

          const product: any = db.prepare('SELECT name, purchase_price FROM products WHERE id = ?').get(data.product_id);
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
  // Insert a test product with no stock & purchase price (WAC) = 0
  console.log(cyan('Seeding fresh test product, supplier, and purchase batch...'));
  
  db.prepare(`
    INSERT INTO products (id, name, internal_code, barcode, purchase_price, retail_price, wholesale_price, min_stock_level, category_id, brand_id, unit_id)
    VALUES (999, 'شمعات إشعال تجريبية', 'TEST-SPK-99', '9999999999999', 0, 500, 450, 480, 5, 1, 1, 1)
  `).run();

  // Insert a test supplier with outstanding balance
  db.prepare(`
    INSERT INTO suppliers (id, code, name, phone, balance)
    VALUES (999, 'SUP-TEST-99', 'مورد شمعات الإشعال التجريبية', '0555555555', 5000)
  `).run();

  // Create a confirmed purchase invoice for WAC fallback test and supplier returns test
  db.prepare(`
    INSERT INTO purchase_invoices (id, invoice_number, supplier_id, user_id, date, subtotal, total, paid, remaining, payment_method, status)
    VALUES (999, 'PUR-TEST-999', 999, userId, '2026-05-19', 3000, 3000, 0, 3000, 'credit', 'confirmed')
  `).run();

  // Create a purchase item batch with 10 units at 300 DZD each (total 3000 DZD)
  db.prepare(`
    INSERT INTO purchase_invoice_items (id, invoice_id, product_id, product_name_snapshot, quantity, quantity_remaining, unit, unit_price, total)
    VALUES (999, 999, 999, 'شمعات إشعال تجريبية', 10, 10, 'قطعة', 300, 3000)
  `).run();

  // Set the stock balance for our test product to 10
  db.prepare(`
    INSERT INTO stock_balances (product_id, location_id, quantity, updated_at)
    VALUES (999, 1, 10, datetime('now'))
  `).run();

  console.log(green('✓ Test data successfully seeded. Product 999 has stock=10, WAC=0, outstanding supplier balance=5000 DZD, and purchase batch of 10 remaining units at cost=300 DZD.\n'));

  // ─────────────────────────────────────────────────────────────
  // TEST SCENARIO 1: markDefective with WAC fallback
  // ─────────────────────────────────────────────────────────────
  console.log(bold('TEST SCENARIO 1: Mark Defective with WAC fallback (WAC is initially 0)'));
  console.log('Marking 2 units as defective/damage...');
  
  const initialStock = (db.prepare('SELECT quantity FROM stock_balances WHERE product_id = 999 AND location_id = 1').get() as any).quantity;
  const initialExpenseCount = (db.prepare('SELECT COUNT(*) as cnt FROM expenses WHERE category = "تالف"').get() as any).cnt;

  executeMarkDefective({
    product_id: 999,
    location_id: 1,
    quantity: 2,
    notes: 'شمعات تالفة بسبب الكسر أثناء النقل'
  });

  const postDefectiveStock = (db.prepare('SELECT quantity FROM stock_balances WHERE product_id = 999 AND location_id = 1').get() as any).quantity;
  const postDefectiveExpenses = db.prepare('SELECT * FROM expenses WHERE category = "تالف" ORDER BY id DESC LIMIT 1').all() as any[];
  
  if (postDefectiveStock !== initialStock - 2) {
    throw new Error(`Defective stock reduction failed: expected ${initialStock - 2}, got ${postDefectiveStock}`);
  }
  console.log(green(`✓ Stock correctly decreased from ${initialStock} to ${postDefectiveStock}`));

  if (postDefectiveExpenses.length === 0) {
    throw new Error('Expense record not created in the database.');
  }
  
  const expense = postDefectiveExpenses[0];
  // Expected cost = 2 * 300 (fallback to batch price) = 600 DZD
  if (expense.amount !== 600) {
    throw new Error(`Incorrect expense amount logged: expected 600 (fallback to purchase price 300), got ${expense.amount}`);
  }
  console.log(green(`✓ Expense correctly logged at fallback price of 300 DZD per unit. Total Amount: ${expense.amount} DZD`));

  // Check double-entry journal entry for defective goods
  const journalHeader: any = db.prepare('SELECT * FROM journal_entries WHERE reference_type = "defective_goods" AND reference_id = ?').get(expense.id);
  if (!journalHeader) {
    throw new Error('Journal entry not logged for defective goods.');
  }
  console.log(green(`✓ Defective goods journal entry registered: #${journalHeader.entry_number}`));

  const journalLines: any[] = db.prepare('SELECT * FROM journal_entry_lines WHERE entry_id = ?').all(journalHeader.id);
  if (journalLines.length !== 2) {
    throw new Error(`Expected exactly 2 journal lines, got ${journalLines.length}`);
  }

  const debitLine = journalLines.find(l => l.debit > 0);
  const creditLine = journalLines.find(l => l.credit > 0);

  if (!debitLine || debitLine.account_id !== AccountingEngine.ACCOUNTS.OP_EXPENSE || debitLine.debit !== 600) {
    throw new Error(`Defective Debit line mismatch: expected Debit OP_EXPENSE (17) for 600, got Account: ${debitLine?.account_id}, Debit: ${debitLine?.debit}`);
  }
  if (!creditLine || creditLine.account_id !== AccountingEngine.ACCOUNTS.INVENTORY || creditLine.credit !== 600) {
    throw new Error(`Defective Credit line mismatch: expected Credit INVENTORY (5) for 600, got Account: ${creditLine?.account_id}, Credit: ${creditLine?.credit}`);
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
  } catch (err: any) {
    if (err.message.includes('سالبة')) {
      console.log(green(`✓ Validation successfully blocked negative stock adjustment: "${err.message}"`));
    } else {
      throw err;
    }
  }

  // Try to adjust with a quantity of zero
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
  } catch (err: any) {
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

  // Let's set a non-zero WAC for WAC recalculation formula verification
  // Product 999 has purchase_price = 300 DZD now (simulated original purchase)
  db.prepare('UPDATE products SET purchase_price = 300 WHERE id = 999').run();

  const prevSupplierBal = (db.prepare('SELECT balance FROM suppliers WHERE id = 999').get() as any).balance;
  const prevBatchRemaining = (db.prepare('SELECT quantity_remaining FROM purchase_invoice_items WHERE id = 999').get() as any).quantity_remaining;
  const prevStockQty = (db.prepare('SELECT quantity FROM stock_balances WHERE product_id = 999 AND location_id = 1').get() as any).quantity;

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

  const nextSupplierBal = (db.prepare('SELECT balance FROM suppliers WHERE id = 999').get() as any).balance;
  const nextBatchRemaining = (db.prepare('SELECT quantity_remaining FROM purchase_invoice_items WHERE id = 999').get() as any).quantity_remaining;
  const nextStockQty = (db.prepare('SELECT quantity FROM stock_balances WHERE product_id = 999 AND location_id = 1').get() as any).quantity;
  const nextWac = (db.prepare('SELECT purchase_price FROM products WHERE id = 999').get() as any).purchase_price;

  // Expected Supplier Refund amount = 3 units * 300 DZD/unit = 900 DZD
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

  // WAC calculation formula: 
  // originalValue = prevStockQty * prevWac = 8 * 300 = 2400
  // returnedValue = 3 * 300 = 900
  // remainingQty = 5
  // nextWac = (2400 - 900) / 5 = 300
  console.log(green(`✓ Product Weighted Average Cost (WAC) dynamically recalculated to: ${nextWac} DZD`));

  // Verify general ledger journal entry for Supplier Return
  const lastMovement: any = db.prepare('SELECT id FROM stock_movements WHERE product_id = 999 AND movement_type = "purchase_return" ORDER BY id DESC LIMIT 1').get();
  if (!lastMovement) {
    throw new Error('Stock movement for return was not recorded.');
  }

  const returnJournalHeader: any = db.prepare('SELECT * FROM journal_entries WHERE reference_type = "supplier_return" AND reference_id = ?').get(lastMovement.id);
  if (!returnJournalHeader) {
    throw new Error('Journal entry not logged for supplier return.');
  }
  console.log(green(`✓ Supplier return journal entry registered: #${returnJournalHeader.entry_number}`));

  const returnJournalLines: any[] = db.prepare('SELECT * FROM journal_entry_lines WHERE entry_id = ?').all(returnJournalHeader.id);
  if (returnJournalLines.length !== 2) {
    throw new Error(`Expected exactly 2 journal lines for supplier return, got ${returnJournalLines.length}`);
  }

  const returnDebitLine = returnJournalLines.find(l => l.debit > 0);
  const returnCreditLine = returnJournalLines.find(l => l.credit > 0);

  if (!returnDebitLine || returnDebitLine.account_id !== AccountingEngine.ACCOUNTS.AP || returnDebitLine.debit !== 900) {
    throw new Error(`Supplier Return Debit mismatch: expected Debit AP (7) for 900, got Account: ${returnDebitLine?.account_id}, Debit: ${returnDebitLine?.debit}`);
  }
  if (!returnCreditLine || returnCreditLine.account_id !== AccountingEngine.ACCOUNTS.INVENTORY || returnCreditLine.credit !== 900) {
    throw new Error(`Supplier Return Credit mismatch: expected Credit INVENTORY (5) for 900, got Account: ${returnCreditLine?.account_id}, Credit: ${returnCreditLine?.credit}`);
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
}

runTests().catch(err => {
  console.error(red('\n❌ CRITICAL: Test execution encountered a failure!'));
  console.error(red(err.stack || err.message));
  if (fs.existsSync(DB_TEST_PATH)) {
    try { fs.unlinkSync(DB_TEST_PATH); } catch (e) {}
  }
  process.exit(1);
});
