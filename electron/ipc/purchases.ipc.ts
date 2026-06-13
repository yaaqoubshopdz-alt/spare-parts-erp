/**
 * Purchases IPC — معالجة المشتريات بنمط UPSERT الذكي
 * - حفظ جديد = CREATE
 * - حفظ موجود = UPDATE (نفس الفاتورة)
 * - BEGIN IMMEDIATE لمنع Race Conditions
 */
import { ipcMain } from 'electron';
import { DatabaseService } from '../services/database.service';
import { AccountingEngine } from '../services/accounting.service';
import { AuthService } from '../services/auth.service';

export function registerPurchasesIPC() {
  const db = () => DatabaseService.getRawDb();
  
  // ── Single-Flight: منع الطلبات المتزامنة ──
  const activeRequests = new Map<string, Promise<any>>();

  const SORT_MAP_PURCHASES: Record<string, string> = {
    invoice_number: 'p.invoice_number',
    date: 'p.date',
    supplier_name: 's.name',
    total: 'p.total',
    paid: 'p.paid',
  };

  // ── الحصول على قائمة الفواتير ───────────────────────────────────
  ipcMain.handle('db:purchases:getAll', async (_e, filters?: {
    search?: string; supplier_id?: number; status?: string;
    date_from?: string; date_to?: string; page?: number; limit?: number;
    sortKey?: string; sortDir?: string;
  }) => {
    try {
      const raw = db();
      let where = 'WHERE 1=1';
      const params: any[] = [];
      if (filters?.search) { where += ' AND (p.invoice_number LIKE ? OR s.name LIKE ? OR p.supplier_invoice_number LIKE ?)'; const s = `%${filters.search}%`; params.push(s, s, s); }
      if (filters?.supplier_id) { where += ' AND p.supplier_id = ?'; params.push(filters.supplier_id); }
      if (filters?.status) { where += ' AND p.status = ?'; params.push(filters.status); }
      if (filters?.date_from) { where += ' AND p.date >= ?'; params.push(filters.date_from); }
      if (filters?.date_to) { where += ' AND p.date <= ?'; params.push(filters.date_to); }
      const countRow: any = raw.prepare(`SELECT COUNT(*) as total FROM purchase_invoices p LEFT JOIN suppliers s ON p.supplier_id = s.id ${where}`).get(...params);
      const page = filters?.page || 1;
      const limit = filters?.limit || 50;
      const safeCol = SORT_MAP_PURCHASES[filters?.sortKey || ''] || 'p.id';
      const safeDir = filters?.sortDir === 'desc' ? 'DESC' : 'ASC';
      const invoices = raw.prepare(`SELECT p.*, s.name as supplier_name, u.full_name as created_by_name FROM purchase_invoices p LEFT JOIN suppliers s ON p.supplier_id = s.id LEFT JOIN users u ON p.user_id = u.id ${where} ORDER BY ${safeCol} ${safeDir} LIMIT ? OFFSET ?`).all(...params, limit, (page - 1) * limit);
      return { success: true, data: invoices, total: countRow.total };
    } catch (e: any) { return { success: false, error: e.message }; }
  });

  // ── الحصول على تفاصيل فاتورة واحدة ──────────────────────────────
  ipcMain.handle('db:purchases:getById', async (_e, id: number) => {
    try {
      const raw = db();
      const invoice = raw.prepare(`SELECT p.*, s.name as supplier_name, s.code as supplier_code, s.phone as supplier_phone, s.balance as supplier_balance FROM purchase_invoices p LEFT JOIN suppliers s ON p.supplier_id = s.id WHERE p.id = ?`).get(id);
      if (!invoice) return { success: false, error: 'الفاتورة غير موجودة' };
      const items = raw.prepare(`
        SELECT pi.*, 
               pr.name as product_name, 
               pr.name_fr as product_name_fr, 
               pr.barcode as product_barcode,
               pr.is_active as product_is_active,
               pr.has_sub_unit,
               pr.pieces_per_box
        FROM purchase_invoice_items pi 
        LEFT JOIN products pr ON pi.product_id = pr.id 
        WHERE pi.invoice_id = ?
      `).all(id);
      return { success: true, data: { ...(invoice as any), items } };
    } catch (e: any) { return { success: false, error: e.message }; }
  });

  // ═══════════════════════════════════════════════════════════════
  // ── SMART SAVE (UPSERT): إنشاء أو تحديث فاتورة شراء ─────────
  // ═══════════════════════════════════════════════════════════════
  ipcMain.handle('db:purchases:save', async (_e, data: {
    id?: number;
    supplier_id?: number;
    supplier_invoice_number?: string;
    subtotal: number;
    tax_amount: number;
    discount_amount: number;
    total: number;
    paid: number;
    cash_box_id?: number;
    status: 'draft' | 'confirmed' | 'cancelled';
    notes?: string;
    items: Array<{
      product_id: number; product_name_snapshot?: string; product_barcode_snapshot?: string;
      quantity: number; unit?: string; unit_price: number; total: number;
      wholesale_price?: number; retail_price?: number; category_id?: number; unit_id?: number;
    }>;
    _user_id?: number;
    session_id?: string;
    custom_date?: string;
  }) => {
    const flightKey = data.session_id || `PURCHASE-${Date.now()}`;
    if (activeRequests.has(flightKey)) return activeRequests.get(flightKey);

    const promise = processPurchaseSave(data);
    activeRequests.set(flightKey, promise);
    try { return await promise; }
    finally { activeRequests.delete(flightKey); }
  });

  async function processPurchaseSave(data: any) {
    const raw = db();
    try {
      const session = await AuthService.checkSession();
      if (!session.success) return { success: false, error: 'غير مصرح' };
      const userId = session.user.id;

      const tx = raw.transaction(() => {
        let invoiceId: number;
        let invoiceNumber: string;
        let isNew = false;
        let needsFirstTimeEffects = false;

        // 1. تحديد (CREATE or UPDATE)
        if (data.id) {
          const existing = raw.prepare('SELECT * FROM purchase_invoices WHERE id = ?').get(data.id) as any;
          if (!existing) throw new Error('الفاتورة غير موجودة');
          
          invoiceId = data.id;
          invoiceNumber = existing.invoice_number;
          isNew = false;

          // 2. تطبيق منطق الـ Hybrid (Delta or Full Reversal)
          if (existing.status === 'confirmed') {
            if (data.status === 'confirmed') {
              applyHybridUpdates(raw, invoiceId, existing, data, userId);
            } else {
              // Revert old effects since invoice is no longer confirmed (moved to draft/cancelled)
              reversePurchaseEffects(raw, invoiceId, existing);
            }
          } else if (data.status === 'confirmed') {
            needsFirstTimeEffects = true;
          }
        } else {
          // CREATE
          invoiceNumber = generatePurchaseInvoiceNumber(raw);
          const customDateVal = data.custom_date || null;
          const ins = raw.prepare(`
            INSERT INTO purchase_invoices (invoice_number, session_id, supplier_invoice_number, supplier_id, date, subtotal, tax_amount, discount_amount, total, paid, remaining, status, notes, user_id)
            VALUES (?, ?, ?, ?, COALESCE(?, date('now')), ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(invoiceNumber, data.session_id || null, data.supplier_invoice_number || null, data.supplier_id || null, customDateVal, data.subtotal, data.tax_amount, data.discount_amount, data.total, data.paid, data.total - data.paid, data.status || 'draft', data.notes || null, userId);
          invoiceId = ins.lastInsertRowid as number;
          isNew = true;
          needsFirstTimeEffects = data.status === 'confirmed';
        }

        // 3. تحديث Header وتخزين العناصر
        updatePurchaseInvoiceHeader(raw, invoiceId, data);
        raw.prepare('DELETE FROM purchase_invoice_items WHERE invoice_id = ?').run(invoiceId);
        
        const insertItem = raw.prepare(`
          INSERT INTO purchase_invoice_items (invoice_id, product_id, product_name_snapshot, quantity, unit, unit_price, total, wholesale_price, retail_price)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        for (const item of data.items) {
          insertItem.run(invoiceId, item.product_id, item.product_name_snapshot || 'Unknown', item.quantity, item.unit || null, item.unit_price, item.total, item.wholesale_price || 0, item.retail_price || 0);
        }

        // 4. تطبيق تأثيرات المخزون والمحاسبة للفواتير الجديدة أو المؤكدة أول مرة
        if (needsFirstTimeEffects) {
          applyPurchaseEffects(raw, invoiceId, invoiceNumber, data, userId);
        }

        // 5. Audit Trail الصامت
        raw.prepare("INSERT INTO audit_log (action, table_name, record_id, description, user_id, created_at) VALUES (?, ?, ?, ?, ?, datetime('now'))")
          .run(isNew ? 'CREATE_PURCHASE' : 'UPDATE_PURCHASE', 'purchase_invoices', invoiceId, `Purchase: ${invoiceNumber}`, userId);

        return { success: true, id: invoiceId, invoiceNumber, status: data.status, isNew };
      });

      return tx.immediate();
    } catch (e: any) {
      console.error('[Purchases IPC] Save error:', e);
      return { success: false, error: e.message };
    }
  }

  // ── منطق الـ Hybrid Updates: مقارنة Delta للمشتريات ──
  function applyHybridUpdates(raw: any, invoiceId: number, oldInvoice: any, newData: any, userId: number) {
    const oldItems = raw.prepare('SELECT * FROM purchase_invoice_items WHERE invoice_id = ?').all(invoiceId) as any[];
    
    for (const newItem of newData.items) {
      const oldItem = oldItems.find(i => i.product_id === newItem.product_id);
      
      const prod: any = raw.prepare('SELECT has_sub_unit, pieces_per_box FROM products WHERE id = ?').get(newItem.product_id);
      let newQty = newItem.quantity;
      if (prod?.has_sub_unit && newItem.unit === 'علبة') {
        newQty = newItem.quantity * (prod.pieces_per_box || 1);
      }

      if (oldItem) {
        let oldQty = oldItem.quantity;
        if (prod?.has_sub_unit && oldItem.unit === 'علبة') {
          oldQty = oldItem.quantity * (prod.pieces_per_box || 1);
        }
        const delta = newQty - oldQty;
        if (delta !== 0) {
          raw.prepare('UPDATE stock_balances SET quantity = quantity + ? WHERE product_id = ? AND location_id = 1').run(delta, newItem.product_id);
        }
      } else {
        raw.prepare('UPDATE stock_balances SET quantity = quantity + ? WHERE product_id = ? AND location_id = 1').run(newQty, newItem.product_id);
      }
      // تحديث أسعار المنتج وحفظ السعر القديم
      const oldProd = raw.prepare('SELECT purchase_price, wholesale_price, retail_price FROM products WHERE id = ?').get(newItem.product_id) as any;
      if (oldProd) {
        const insertHistory = raw.prepare(`
          INSERT INTO price_history (product_id, field_name, old_value, new_value, changed_by, reference_type, reference_id, created_at)
          VALUES (?, ?, ?, ?, ?, 'purchase_invoice', ?, datetime('now'))
        `);
        if (oldProd.purchase_price !== newItem.unit_price) {
          insertHistory.run(newItem.product_id, 'purchase_price', oldProd.purchase_price, newItem.unit_price, userId, invoiceId);
        }
        if (newItem.wholesale_price !== undefined && newItem.wholesale_price !== null && oldProd.wholesale_price !== newItem.wholesale_price) {
          insertHistory.run(newItem.product_id, 'wholesale_price', oldProd.wholesale_price, newItem.wholesale_price, userId, invoiceId);
        }
        if (newItem.retail_price !== undefined && newItem.retail_price !== null && oldProd.retail_price !== newItem.retail_price) {
          insertHistory.run(newItem.product_id, 'retail_price', oldProd.retail_price, newItem.retail_price, userId, invoiceId);
        }
      }
      raw.prepare('UPDATE products SET purchase_price = ?, wholesale_price = COALESCE(?, wholesale_price), retail_price = COALESCE(?, retail_price), updated_at = datetime(\'now\') WHERE id = ?').run(newItem.unit_price, newItem.wholesale_price || null, newItem.retail_price || null, newItem.product_id);
    }
    
    for (const oldItem of oldItems) {
      if (!newData.items.find((i: any) => i.product_id === oldItem.product_id)) {
        const prod: any = raw.prepare('SELECT has_sub_unit, pieces_per_box FROM products WHERE id = ?').get(oldItem.product_id);
        let oldQty = oldItem.quantity;
        if (prod?.has_sub_unit && oldItem.unit === 'علبة') {
          oldQty = oldItem.quantity * (prod.pieces_per_box || 1);
        }
        raw.prepare('UPDATE stock_balances SET quantity = quantity - ? WHERE product_id = ? AND location_id = 1').run(oldQty, oldItem.product_id);
      }
    }

    // عكس الدفعة القديمة
    if (oldInvoice.paid > 0) {
      raw.prepare('UPDATE cash_boxes SET current_balance = current_balance + ? WHERE id = 1').run(oldInvoice.paid);
      raw.prepare("DELETE FROM payments WHERE invoice_id = ? AND party_type = 'supplier'").run(invoiceId);
    }

    // عكس دين المورد القديم
    const oldDebt = oldInvoice.total - oldInvoice.paid;
    if (oldDebt > 0 && oldInvoice.supplier_id) {
      raw.prepare('UPDATE suppliers SET balance = balance - ? WHERE id = ?').run(oldDebt, oldInvoice.supplier_id);
    }

    // تطبيق الدفعة الجديدة
    if (newData.paid > 0) {
      const cashBoxId = newData.cash_box_id || 1;
      const paymentDate = newData.custom_date || new Date().toISOString().split('T')[0];
      raw.prepare(`INSERT INTO payments (payment_number, type, party_type, party_id, amount, direction, payment_method, date, invoice_id, user_id) VALUES (?, 'purchase', 'supplier', ?, ?, 'out', 'cash', ?, ?, ?)`).run(`PAY-${Date.now()}`, newData.supplier_id || 0, newData.paid, paymentDate, invoiceId, userId);
      raw.prepare('UPDATE cash_boxes SET current_balance = current_balance - ? WHERE id = ?').run(newData.paid, cashBoxId);
    }

    // تطبيق دين المورد الجديد
    const newDebt = Math.round((newData.total - newData.paid) * 100) / 100;
    if (newDebt > 0 && newData.supplier_id) {
      raw.prepare('UPDATE suppliers SET balance = balance + ? WHERE id = ?').run(newDebt, newData.supplier_id);
    }

    // تحديث المحاسبة (Adjustment)
    AccountingEngine.updatePurchaseEntry(raw, { oldTotal: oldInvoice.total, newTotal: newData.total, invoiceId, supplier_id: oldInvoice.supplier_id, date: newData.custom_date || oldInvoice.date }, userId);
  }

  // ── دوال مساعدة ──
  function generatePurchaseInvoiceNumber(raw: any) {
    const today = new Date();
    const prefix = `PUR-${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}-`;
    const maxRow: any = raw.prepare("SELECT invoice_number FROM purchase_invoices WHERE invoice_number LIKE ? ORDER BY id DESC LIMIT 1").get(`${prefix}%`);
    const nextSeq = maxRow ? parseInt(maxRow.invoice_number.split('-')[2]) + 1 : 1;
    return `${prefix}${String(nextSeq).padStart(3, '0')}`;
  }

  function updatePurchaseInvoiceHeader(raw: any, invoiceId: number, data: any) {
    const customDateVal = data.custom_date || null;
    raw.prepare(`
      UPDATE purchase_invoices SET 
        supplier_id = ?, supplier_invoice_number = ?, subtotal = ?, tax_amount = ?, discount_amount = ?,
        total = ?, paid = ?, remaining = ?, status = ?, notes = ?, date = COALESCE(?, date), updated_at = datetime('now')
      WHERE id = ?
    `).run(data.supplier_id || null, data.supplier_invoice_number || null, data.subtotal, data.tax_amount, data.discount_amount, data.total, data.paid, data.total - data.paid, data.status || 'draft', data.notes || null, customDateVal, invoiceId);
  }

  // ═══════════════════════════════════════════════════════════════
  // ── عكس تأثيرات فاتورة شراء ─────────────────────────────────
  // ═══════════════════════════════════════════════════════════════
  function reversePurchaseEffects(raw: any, invoiceId: number, invoice: any) {
    const items = raw.prepare('SELECT * FROM purchase_invoice_items WHERE invoice_id = ?').all(invoiceId);
    
    // خصم المخزون (عكس الإضافة)
    for (const item of items as any[]) {
      const prod: any = raw.prepare('SELECT has_sub_unit, pieces_per_box FROM products WHERE id = ?').get(item.product_id);
      let qty = item.quantity;
      if (prod?.has_sub_unit && item.unit === 'علبة') {
        qty = item.quantity * (prod.pieces_per_box || 1);
      }
      raw.prepare('UPDATE stock_balances SET quantity = quantity - ? WHERE product_id = ? AND location_id = 1').run(qty, item.product_id);
    }

    // عكس الصندوق
    if (invoice.paid > 0) {
      raw.prepare('UPDATE cash_boxes SET current_balance = current_balance + ? WHERE id = 1').run(invoice.paid);
      raw.prepare("DELETE FROM payments WHERE invoice_id = ? AND party_type = 'supplier'").run(invoiceId);
    }

    // عكس دين المورد
    const debt = invoice.total - invoice.paid;
    if (debt > 0 && invoice.supplier_id) {
      raw.prepare('UPDATE suppliers SET balance = balance - ? WHERE id = ?').run(debt, invoice.supplier_id);
    }

    // إرجاع الأسعار السابقة من تاريخ الأسعار
    const historyEntries = raw.prepare(`
      SELECT product_id, field_name, old_value 
      FROM price_history 
      WHERE reference_type = 'purchase_invoice' AND reference_id = ?
    `).all(invoiceId) as any[];

    for (const entry of historyEntries) {
      if (entry.field_name === 'purchase_price') {
        raw.prepare('UPDATE products SET purchase_price = ?, updated_at = datetime(\'now\') WHERE id = ?').run(entry.old_value, entry.product_id);
      } else if (entry.field_name === 'wholesale_price') {
        raw.prepare('UPDATE products SET wholesale_price = ?, updated_at = datetime(\'now\') WHERE id = ?').run(entry.old_value, entry.product_id);
      } else if (entry.field_name === 'retail_price') {
        raw.prepare('UPDATE products SET retail_price = ?, updated_at = datetime(\'now\') WHERE id = ?').run(entry.old_value, entry.product_id);
      }
    }

    // حذف سجلات التاريخ الخاصة بهذه الفاتورة
    raw.prepare(`
      DELETE FROM price_history 
      WHERE reference_type = 'purchase_invoice' AND reference_id = ?
    `).run(invoiceId);

    // قيد محاسبي عكسي
    AccountingEngine.reverseEntry(raw, 'purchase_invoice', invoiceId, invoice.user_id, `تعديل فاتورة شراء ${invoice.invoice_number}`);
  }

  // ═══════════════════════════════════════════════════════════════
  // ── تطبيق تأثيرات فاتورة شراء ───────────────────────────────
  // ═══════════════════════════════════════════════════════════════
  function applyPurchaseEffects(raw: any, invoiceId: number, invoiceNumber: string, data: any, userId: number) {
    // إضافة للمخزون + تحديث أسعار المنتج
    for (const item of data.items) {
      const prod: any = raw.prepare('SELECT has_sub_unit, pieces_per_box FROM products WHERE id = ?').get(item.product_id);
      let qty = item.quantity;
      if (prod?.has_sub_unit && item.unit === 'علبة') {
        qty = item.quantity * (prod.pieces_per_box || 1);
      }

      const stock: any = raw.prepare('SELECT id FROM stock_balances WHERE product_id = ? AND location_id = 1').get(item.product_id);
      if (!stock) {
        raw.prepare('INSERT INTO stock_balances (product_id, location_id, quantity) VALUES (?, 1, ?)').run(item.product_id, qty);
      } else {
        raw.prepare('UPDATE stock_balances SET quantity = quantity + ? WHERE product_id = ? AND location_id = 1').run(qty, item.product_id);
      }

      // تحديث سعر الشراء والبيع للمنتج وحفظ السعر القديم
      const oldProd = raw.prepare('SELECT purchase_price, wholesale_price, retail_price FROM products WHERE id = ?').get(item.product_id) as any;
      if (oldProd) {
        const insertHistory = raw.prepare(`
          INSERT INTO price_history (product_id, field_name, old_value, new_value, changed_by, reference_type, reference_id, created_at)
          VALUES (?, ?, ?, ?, ?, 'purchase_invoice', ?, datetime('now'))
        `);
        if (oldProd.purchase_price !== item.unit_price) {
          insertHistory.run(item.product_id, 'purchase_price', oldProd.purchase_price, item.unit_price, userId, invoiceId);
        }
        if (item.wholesale_price !== undefined && item.wholesale_price !== null && oldProd.wholesale_price !== item.wholesale_price) {
          insertHistory.run(item.product_id, 'wholesale_price', oldProd.wholesale_price, item.wholesale_price, userId, invoiceId);
        }
        if (item.retail_price !== undefined && item.retail_price !== null && oldProd.retail_price !== item.retail_price) {
          insertHistory.run(item.product_id, 'retail_price', oldProd.retail_price, item.retail_price, userId, invoiceId);
        }
      }
      raw.prepare('UPDATE products SET purchase_price = ?, wholesale_price = COALESCE(?, wholesale_price), retail_price = COALESCE(?, retail_price), updated_at = datetime(\'now\') WHERE id = ?').run(item.unit_price, item.wholesale_price || null, item.retail_price || null, item.product_id);
    }

    // الصندوق
    if (data.paid > 0) {
      const cashBoxId = data.cash_box_id || 1;
      const paymentDate = data.custom_date || new Date().toISOString().split('T')[0];
      raw.prepare(`INSERT INTO payments (payment_number, type, party_type, party_id, amount, direction, payment_method, date, invoice_id, user_id) VALUES (?, 'purchase', 'supplier', ?, ?, 'out', 'cash', ?, ?, ?)`).run(`PAY-${Date.now()}`, data.supplier_id || 0, data.paid, paymentDate, invoiceId, userId);
      raw.prepare('UPDATE cash_boxes SET current_balance = current_balance - ? WHERE id = ?').run(data.paid, cashBoxId);
    }

    // دين المورد
    const debt = Math.round((data.total - data.paid) * 100) / 100;
    if (debt > 0 && data.supplier_id) {
      raw.prepare('UPDATE suppliers SET balance = balance + ? WHERE id = ?').run(debt, data.supplier_id);
    }

    // قيد محاسبي
    const entryDate = data.custom_date || new Date().toISOString().split('T')[0];
    AccountingEngine.recordPurchase(raw, { id: invoiceId, invoice_number: invoiceNumber, date: entryDate, total: data.total, paid: data.paid, remaining: debt, supplier_id: data.supplier_id || null }, userId);
  }

  // ── إلغاء فاتورة شراء ─────────────────────────────────────────
  ipcMain.handle('db:purchases:cancel', async (_e, id: number) => {
    try {
      const session = await AuthService.checkSession();
      if (!session.success) return { success: false, error: 'غير مصرح' };
      const userId = session.user.id;
      const raw = db();
      const tx = raw.transaction(() => {
        const invoice: any = raw.prepare('SELECT * FROM purchase_invoices WHERE id = ?').get(id);
        if (!invoice) throw new Error('الفاتورة غير موجودة');
        AccountingEngine._checkClosingDate(raw, invoice.date);
        if (invoice.status === 'confirmed') {
          reversePurchaseEffects(raw, id, invoice);
        }
        // Completely delete corresponding journal entries
        raw.prepare("DELETE FROM journal_entries WHERE reference_id = ? AND reference_type IN ('purchase_invoice', 'purchase_invoice_adjustment', 'purchase_invoice_reversal')").run(id);
        // Mark the invoice as cancelled instead of deleting
        raw.prepare("UPDATE purchase_invoices SET status = 'cancelled', updated_at = datetime('now') WHERE id = ?").run(id);
      });
      tx.immediate();
      return { success: true };
    } catch (e: any) { return { success: false, error: e.message }; }
  });

  // ── جلب المسودات المحفوظة ─────────────────────────────────────
  ipcMain.handle('db:purchases:getDrafts', async () => {
    try {
      const raw = db();
      const drafts = raw.prepare(`
        SELECT p.id, p.invoice_number, p.date, p.total, p.status,
               s.name as supplier_name, p.supplier_invoice_number,
               COALESCE(pi.item_count, 0) as items_count
        FROM purchase_invoices p
        LEFT JOIN suppliers s ON p.supplier_id = s.id
        LEFT JOIN (SELECT invoice_id, COUNT(*) as item_count FROM purchase_invoice_items GROUP BY invoice_id) pi ON pi.invoice_id = p.id
        WHERE p.status = 'draft'
        ORDER BY p.updated_at DESC
        LIMIT 50
      `).all();
      return { success: true, data: drafts };
    } catch (e: any) { return { success: false, error: e.message }; }
  });

  // ── حذف كل المسودات ────────────────────────────────────────────
  ipcMain.handle('db:purchases:deleteAllDrafts', async () => {
    try {
      const raw = db();
      const drafts = raw.prepare("SELECT id FROM purchase_invoices WHERE status = 'draft'").all() as any[];
      const tx = raw.transaction(() => {
        for (const d of drafts) {
          raw.prepare('DELETE FROM purchase_invoice_items WHERE invoice_id = ?').run(d.id);
          raw.prepare('DELETE FROM purchase_invoices WHERE id = ?').run(d.id);
        }
      });
      tx.immediate();
      return { success: true, deleted: drafts.length };
    } catch (e: any) { return { success: false, error: e.message }; }
  });

  // ── حذف مسودة ──────────────────────────────────────────────────
  ipcMain.handle('db:purchases:deleteDraft', async (_e, id: number) => {
    try {
      const raw = db();
      const existing = raw.prepare("SELECT * FROM purchase_invoices WHERE id = ? AND status = 'draft'").get(id) as any;
      if (!existing) return { success: false, error: 'المسودة غير موجودة' };
      raw.prepare('DELETE FROM purchase_invoice_items WHERE invoice_id = ?').run(id);
      raw.prepare('DELETE FROM purchase_invoices WHERE id = ?').run(id);
      return { success: true };
    } catch (e: any) { return { success: false, error: e.message }; }
  });

  console.log('[IPC] Purchases handlers registered');
}
