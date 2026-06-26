/**
 * Inventory IPC Handlers — Stock management
 */
import { ipcMain } from 'electron';
import { DatabaseService } from '../services/database.service';
import { AuthService } from '../services/auth.service';
import { AccountingEngine } from '../services/accounting.service';

export function registerInventoryIPC() {
  const db = () => DatabaseService.getRawDb();

  function isBoxUnit(unit?: string): boolean {
    if (!unit) return false;
    const u = unit.trim().toLowerCase();
    return !['قطعة', 'قطعه', 'حبة', 'حبه', 'pcs', 'pc'].includes(u);
  }

  // ── Adjust Stock (Initial, Manual, etc.) ───────────────────
  ipcMain.handle('db:inventory:adjustStock', async (_e, data: {
    product_id: number;
    location_id: number;
    quantity: number;
    type: string;
    notes?: string;
    _user_id?: number;
    supplier_id?: number;
    purchase_price?: number;
    purchase_invoice_item_id?: number;
  }) => {
    try {
      const session = await AuthService.checkSession();
      if (!session.success) return { success: false, error: 'غير مصرح' };
      const userId = session.user.id;

      const raw = db();
      
      const tx = raw.transaction(() => {
        // Check Period Closing Date
        AccountingEngine._checkClosingDate(raw, new Date().toISOString().split('T')[0]);

        // 0. Validate quantity is not zero
        if (!data.quantity || isNaN(data.quantity) || Math.round(data.quantity * 10000) / 10000 === 0) {
          throw new Error('فشلت العملية: كمية التسوية لا يمكن أن تكون صفراً.');
        }

        // Get product details
        const product: any = raw.prepare('SELECT name, purchase_price, has_sub_unit, pieces_per_box FROM products WHERE id = ?').get(data.product_id);
        if (!product) {
          throw new Error('المنتج المحدد غير موجود');
        }

        const scaleFactor = (product.has_sub_unit && product.pieces_per_box > 0) ? product.pieces_per_box : 1;
        const dbInputQty = Math.round((data.quantity / scaleFactor) * 10000) / 10000;

        // 1. If linked to a purchase invoice item for return, validate batch and remaining quantity
        let actualCostPrice = data.purchase_price || 0;
        let returnQtyNeeded = 0;
        let isItemUnitBox = false;
        if (dbInputQty < 0 && data.purchase_invoice_item_id) {
          const item: any = raw.prepare('SELECT quantity_remaining, unit, unit_price FROM purchase_invoice_items WHERE id = ?').get(data.purchase_invoice_item_id);
          if (!item) {
            throw new Error('بند فاتورة الشراء المحدد غير موجود');
          }
          isItemUnitBox = isBoxUnit(item.unit);
          returnQtyNeeded = isItemUnitBox ? Math.abs(dbInputQty) : Math.abs(data.quantity);
          const currentRem = item.quantity_remaining !== null ? item.quantity_remaining : 0;
          if (currentRem < returnQtyNeeded) {
            throw new Error(`الكمية المراد إرجاعها (${returnQtyNeeded}) أكبر من الكمية المتبقية في هذه الدفعة (${currentRem})`);
          }
          
          // Deduct from purchase invoice item's remaining quantity
          const nextRem = Math.round((currentRem - returnQtyNeeded) * 10000) / 10000;
          raw.prepare('UPDATE purchase_invoice_items SET quantity_remaining = ? WHERE id = ?')
             .run(nextRem, data.purchase_invoice_item_id);
             
          actualCostPrice = item.unit_price;
        }

        // 2. Get current balance and check negative stock protection
        const balance: any = raw.prepare('SELECT quantity FROM stock_balances WHERE product_id = ? AND location_id = ?').get(data.product_id, data.location_id);
        const currentQty = balance ? balance.quantity : 0;
        const newQty = Math.round((currentQty + dbInputQty) * 10000) / 10000;

        if (newQty < 0) {
          throw new Error('فشلت العملية: كمية المخزون لا يمكن أن تصبح سالبة.');
        }

        // 3. Update or Insert stock balance
        if (balance) {
          raw.prepare('UPDATE stock_balances SET quantity = ?, updated_at = datetime(\'now\') WHERE product_id = ? AND location_id = ?')
             .run(newQty, data.product_id, data.location_id);
        } else {
          raw.prepare('INSERT INTO stock_balances (product_id, location_id, quantity, updated_at) VALUES (?, ?, ?, datetime(\'now\'))')
             .run(data.product_id, data.location_id, newQty);
        }

        // 4. Record stock movement
        const moveRes = raw.prepare(`
          INSERT INTO stock_movements (
            product_id, location_id, movement_type, quantity, balance_after, user_id, notes, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
        `).run(
          data.product_id,
          data.location_id,
          dbInputQty < 0 && data.supplier_id ? 'purchase_return' : data.type,
          dbInputQty,
          newQty,
          userId,
          data.notes || null
        );
        const moveId = moveRes.lastInsertRowid as number;

        // 5. If quantity < 0 and supplier_id is provided, record payment/debit adjustment and update WAC
        if (dbInputQty < 0 && data.supplier_id) {
          const costAmount = Math.round((data.purchase_invoice_item_id ? returnQtyNeeded * actualCostPrice : Math.abs(data.quantity) * actualCostPrice) * 100) / 100;
          if (costAmount > 0) {
            // Update supplier balance (decrease balance/debt)
            raw.prepare('UPDATE suppliers SET balance = balance - ? WHERE id = ?')
               .run(costAmount, data.supplier_id);

            const retNotes = `إرجاع بضاعة: ${product.name} (الكمية: ${Math.abs(data.quantity)})` + (data.notes ? ` - ${data.notes}` : '');
            
            // Recalculate WAC on product
            const currentWac = product ? (product.purchase_price || 0) : 0;
            const remainingQty = newQty;
            if (remainingQty > 0) {
              const originalValue = currentQty * currentWac * scaleFactor;
              const returnedValue = data.purchase_invoice_item_id ? (returnQtyNeeded * actualCostPrice) : (Math.abs(data.quantity) * actualCostPrice);
              const newValue = Math.max(0, originalValue - returnedValue);
              const nextWac = newValue / (remainingQty * scaleFactor);
              
              raw.prepare('UPDATE products SET purchase_price = ?, updated_at = datetime(\'now\') WHERE id = ?')
                 .run(Math.round(nextWac * 100) / 100, data.product_id);
            }

            // قيد محاسبي لمرتجع المورد
            AccountingEngine.recordSupplierReturn(raw, {
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
      return { success: true };
    } catch (error: any) {
      console.error('[Inventory IPC] adjustStock error:', error);
      return { success: false, error: error.message };
    }
  });

  // ── Get Stock for Product ──────────────────────────────────
  ipcMain.handle('db:inventory:getStock', async (_e, productId: number) => {
    try {
      const raw = db();
      const stock = raw.prepare(`
        SELECT sb.*, l.name as location_name
        FROM stock_balances sb
        JOIN locations l ON sb.location_id = l.id
        WHERE sb.product_id = ?
      `).all(productId);
      return { success: true, data: stock };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  // ── Mark Defective (تالف) ──────────────────────────────────
  ipcMain.handle('db:inventory:markDefective', async (_e, data: {
    product_id: number;
    location_id: number;
    quantity: number;
    notes?: string;
    _user_id?: number;
  }) => {
    try {
      const session = await AuthService.checkSession();
      if (!session.success) return { success: false, error: 'غير مصرح' };
      const userId = session.user.id;

      const raw = db();
      const tx = raw.transaction(() => {
        // Check Period Closing Date
        AccountingEngine._checkClosingDate(raw, new Date().toISOString().split('T')[0]);

        // 0. Validate quantity
        if (!data.quantity || isNaN(data.quantity) || data.quantity <= 0) {
          throw new Error('فشلت العملية: الكمية التالفة يجب أن تكون قيمة موجبة أكبر من الصفر.');
        }

        // Get product details
        const product: any = raw.prepare('SELECT purchase_price, name, has_sub_unit, pieces_per_box FROM products WHERE id = ?').get(data.product_id);
        if (!product) {
          throw new Error('المنتج المحدد غير موجود');
        }

        const scaleFactor = (product.has_sub_unit && product.pieces_per_box > 0) ? product.pieces_per_box : 1;
        const dbInputQty = Math.round((data.quantity / scaleFactor) * 10000) / 10000;

        // 1. Check stock
        const balance: any = raw.prepare('SELECT quantity FROM stock_balances WHERE product_id = ? AND location_id = ?').get(data.product_id, data.location_id);
        const currentQty = balance ? balance.quantity : 0;
        if (currentQty < dbInputQty) {
          throw new Error('الكمية المتوفرة في المخزون أقل من الكمية المحددة كـ تالف');
        }
        const newQty = Math.round((currentQty - dbInputQty) * 10000) / 10000;

        // 2. Update balance
        raw.prepare('UPDATE stock_balances SET quantity = ?, updated_at = datetime(\'now\') WHERE product_id = ? AND location_id = ?')
           .run(newQty, data.product_id, data.location_id);

        // 3. Record movement
        const moveRes = raw.prepare(`
          INSERT INTO stock_movements (
            product_id, location_id, movement_type, quantity, balance_after, user_id, notes, created_at
          ) VALUES (?, ?, 'damage', ?, ?, ?, ?, datetime('now'))
        `).run(data.product_id, data.location_id, -dbInputQty, newQty, userId, data.notes || null);
        
        const moveId = moveRes.lastInsertRowid as number;

        // 4. Calculate cost to record an expense (with fallback to latest purchase invoice item price if WAC is 0)
        let purchasePrice = product ? (product.purchase_price || 0) : 0;
        
        if (purchasePrice <= 0) {
          const lastPurchase: any = raw.prepare(`
            SELECT unit_price, unit FROM purchase_invoice_items pii
            JOIN purchase_invoices pi ON pii.invoice_id = pi.id
            WHERE pii.product_id = ? AND pi.status = 'confirmed'
            ORDER BY pi.date DESC, pi.id DESC LIMIT 1
          `).get(data.product_id);
          if (lastPurchase) {
            purchasePrice = isBoxUnit(lastPurchase.unit) ? lastPurchase.unit_price / scaleFactor : lastPurchase.unit_price;
          }
        }

        const costAmount = Math.round(purchasePrice * data.quantity * 100) / 100;

        if (costAmount > 0) {
          const expenseNumber = 'EXP-DMG-' + Date.now();
          const expenseDesc = `تسجيل تالف: ${product.name} (الكمية: ${data.quantity})${data.notes ? ' - ' + data.notes : ''}`;
          
          // إدخل المصروف في جدول المصروفات للتوثيق
          const expRes = raw.prepare(`
            INSERT INTO expenses (expense_number, category, description, amount, payment_method, date, user_id, notes, created_at, is_active)
            VALUES (?, 'تالف', ?, ?, 'non-cash', date('now', 'localtime'), ?, ?, datetime('now', 'localtime'), 1)
          `).run(expenseNumber, expenseDesc, costAmount, userId, data.notes || null);
          
          const expenseId = expRes.lastInsertRowid as number;

          // توجيه المحرك المحاسبي لتسجيل القيد دون المساس بالصندوق (Non-Cash Expense)
          AccountingEngine.recordDefectiveGoods(raw, {
            id: expenseId,
            amount: costAmount,
            notes: expenseDesc,
            date: new Date().toISOString().split('T')[0]
          }, userId);
        }
      });

      tx();
      return { success: true };
    } catch (error: any) {
      console.error('[Inventory IPC] markDefective error:', error);
      return { success: false, error: error.message };
    }
  });

  console.log('[IPC] Inventory handlers registered');
  
  // ── Get Last Suppliers for Product ─────────────────────────
  ipcMain.handle('db:inventory:getProductSuppliers', async (_e, productId: number) => {
    try {
      const raw = db();
      const query = `
        SELECT 
          pii.id as purchase_invoice_item_id,
          pi.supplier_id,
          s.name as supplier_name,
          pii.unit_price as purchase_price,
          pii.quantity as quantity_purchased,
          COALESCE(pii.quantity_remaining, pii.quantity) as quantity_remaining,
          pi.invoice_number,
          pi.date,
          pi.total as invoice_total
        FROM purchase_invoice_items pii
        JOIN purchase_invoices pi ON pii.invoice_id = pi.id
        JOIN suppliers s ON pi.supplier_id = s.id
        WHERE pii.product_id = ? AND pi.status = 'confirmed' AND COALESCE(pii.quantity_remaining, pii.quantity) > 0
        ORDER BY pi.date DESC
        LIMIT 10
      `;
      const data = raw.prepare(query).all(productId);
      return { success: true, data };
    } catch (error: any) {
      console.error('[Inventory IPC] getProductSuppliers error:', error);
      return { success: false, error: error.message };
    }
  });
}
