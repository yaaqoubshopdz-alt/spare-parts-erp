/**
 * Sales IPC — معالجة المبيعات بنمط UPSERT الذكي
 * - حفظ جديد = CREATE
 * - حفظ موجود = UPDATE (نفس الفاتورة)
 * - BEGIN IMMEDIATE لمنع Race Conditions
 */
import { ipcMain } from 'electron';
import { DatabaseService } from '../services/database.service';
import { AccountingEngine } from '../services/accounting.service';
import { AuthService } from '../services/auth.service';

export function registerSalesIPC() {
  const db = () => DatabaseService.getRawDb();
  
  // ── Database Self-Healing Repair for malformed "NaN" invoice numbers ──
  try {
    const raw = db();
    const corruptInvoices = raw.prepare("SELECT id, invoice_number, date FROM sales_invoices WHERE invoice_number LIKE '%-NaN'").all() as any[];
    if (corruptInvoices.length > 0) {
      console.log(`[Database Repair] Found ${corruptInvoices.length} malformed invoice records ending in -NaN.`);
      for (const inv of corruptInvoices) {
        // Generate a correct invoice number based on the record's date
        const dateObj = new Date(inv.date || Date.now());
        const yyyy = dateObj.getFullYear();
        const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
        const dd = String(dateObj.getDate()).padStart(2, '0');
        const prefix = `SAL-${yyyy}${mm}${dd}-`;
        
        // Find highest valid sequence for that specific prefix
        const siblingRows = raw.prepare("SELECT invoice_number FROM sales_invoices WHERE invoice_number LIKE ? AND id != ?").all(`${prefix}%`, inv.id) as any[];
        let siblingMaxSeq = 0;
        for (const sib of siblingRows) {
          const parts = sib.invoice_number.split('-');
          const lastPart = parts[parts.length - 1];
          const seq = parseInt(lastPart, 10);
          if (!isNaN(seq) && seq > siblingMaxSeq) {
            siblingMaxSeq = seq;
          }
        }
        const fixedNumber = `${prefix}${String(siblingMaxSeq + 1).padStart(3, '0')}`;
        raw.prepare("UPDATE sales_invoices SET invoice_number = ? WHERE id = ?").run(fixedNumber, inv.id);
        console.log(`[Database Repair] Replaced malformed invoice #${inv.id} '${inv.invoice_number}' with fixed number '${fixedNumber}'`);
      }
    }
  } catch (err) {
    console.error('[Database Repair Error]', err);
  }
  
  // ── Single-Flight: منع الطلبات المتزامنة ──
  const activeRequests = new Map<string, Promise<any>>();

  const SORT_MAP_SALES: Record<string, string> = {
    invoice_number: 's.invoice_number',
    date: 's.date',
    customer_name: 'c.name',
    total: 's.total',
    paid: 's.paid',
  };

  // ─ الحصول على قائمة الفواتير ───────────────────────────────────
  ipcMain.handle('db:sales:getAll', async (_e, filters?: {
    search?: string; customer_id?: number; status?: string;
    date_from?: string; date_to?: string; page?: number; limit?: number;
    sortKey?: string; sortDir?: string;
  }) => {
    try {
      const raw = db();
      let where = 'WHERE 1=1';
      const params: any[] = [];
      if (filters?.search) { where += ' AND (s.invoice_number LIKE ? OR c.name LIKE ?)'; const s = `%${filters.search}%`; params.push(s, s); }
      if (filters?.customer_id) { where += ' AND s.customer_id = ?'; params.push(filters.customer_id); }
      if (filters?.status) { where += ' AND s.status = ?'; params.push(filters.status); }
      if (filters?.date_from) { where += ' AND s.date >= ?'; params.push(filters.date_from); }
      if (filters?.date_to) { where += ' AND s.date <= ?'; params.push(filters.date_to); }
      const countRow: any = raw.prepare(`SELECT COUNT(*) as total FROM sales_invoices s LEFT JOIN customers c ON s.customer_id = c.id ${where}`).get(...params);
      const page = filters?.page || 1;
      const limit = filters?.limit || 50;
      const safeCol = SORT_MAP_SALES[filters?.sortKey || ''] || 's.id';
      const safeDir = filters?.sortDir === 'desc' ? 'DESC' : 'ASC';
      const invoices = raw.prepare(`SELECT s.*, c.name as customer_name, u.full_name as created_by_name FROM sales_invoices s LEFT JOIN customers c ON s.customer_id = c.id LEFT JOIN users u ON s.user_id = u.id ${where} ORDER BY ${safeCol} ${safeDir} LIMIT ? OFFSET ?`).all(...params, limit, (page - 1) * limit);
      return { success: true, data: invoices, total: countRow.total };
    } catch (e: any) { return { success: false, error: e.message }; }
  });

  // ── الحصول على تفاصيل فاتورة واحدة ──────────────────────────────
  ipcMain.handle('db:sales:getById', async (_e, id: number) => {
    try {
      const raw = db();
      const invoice = raw.prepare(`SELECT s.*, c.name as customer_name, c.code as customer_code, c.phone as customer_phone, c.balance as customer_balance FROM sales_invoices s LEFT JOIN customers c ON s.customer_id = c.id WHERE s.id = ?`).get(id);
      if (!invoice) return { success: false, error: 'الفاتورة غير موجودة' };
      const items = raw.prepare(`
        SELECT si.*, 
               p.name as product_name, 
               p.name_fr as product_name_fr, 
               p.barcode as product_barcode,
               p.is_active as product_is_active,
               p.has_sub_unit,
               p.pieces_per_box,
               u.name as unit_name
        FROM sales_invoice_items si 
        LEFT JOIN products p ON si.product_id = p.id 
        LEFT JOIN units u ON p.unit_id = u.id
        WHERE si.invoice_id = ?
      `).all(id);
      return { success: true, data: { ...(invoice as any), items } };
    } catch (e: any) { return { success: false, error: e.message }; }
  });

  // ═══════════════════════════════════════════════════════════════
  // ── SMART SAVE (UPSERT): إنشاء أو تحديث فاتورة ──────────────
  // ═══════════════════════════════════════════════════════════════
  ipcMain.handle('db:sales:save', async (_e, data: {
    id?: number; // إذا موجود = تحديث، إذا لا = إنشاء جديد
    customer_id?: number;
    sale_type: 'retail' | 'wholesale';
    subtotal: number;
    tax_amount: number;
    global_discount_amount: number;
    total: number;
    paid: number;
    cash_box_id?: number;
    status: 'draft' | 'confirmed' | 'cancelled';
    notes?: string;
    items: Array<{
      product_id: number; product_name_snapshot?: string; product_barcode_snapshot?: string;
      quantity: number; unit?: string; unit_price: number; cost_price_snapshot: number;
      item_discount_type?: string; item_discount_value?: number; item_discount_amount?: number;
      total: number; sort_order?: number;
    }>;
    _user_id?: number;
    session_id?: string;
  }) => {
    const flightKey = data.session_id || `SALE-${Date.now()}`;
    if (activeRequests.has(flightKey)) return activeRequests.get(flightKey);

    const promise = processSaleSave(data);
    activeRequests.set(flightKey, promise);
    try { return await promise; }
    finally { activeRequests.delete(flightKey); }
  });

  async function processSaleSave(data: any) {
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

        // Customer Credit Limit Validation
        if (data.customer_id && data.status === 'confirmed') {
          const customer = raw.prepare('SELECT balance, credit_limit FROM customers WHERE id = ?').get(data.customer_id) as { balance: number; credit_limit: number | null } | undefined;
          if (customer && customer.credit_limit !== null && customer.credit_limit > 0) {
            let oldDebt = 0;
            if (data.id) {
              const existing = raw.prepare('SELECT total, paid, status, customer_id FROM sales_invoices WHERE id = ?').get(data.id) as any;
              if (existing && existing.status === 'confirmed' && existing.customer_id === data.customer_id) {
                oldDebt = existing.total - existing.paid;
              }
            }
            const newDebt = data.total - data.paid;
            const netDebtIncrease = newDebt - oldDebt;
            if (netDebtIncrease > 0 && (customer.balance + netDebtIncrease) > customer.credit_limit) {
              throw new Error(`تم تجاوز الحد الائتماني المسموح به لهذا الزبون (${customer.credit_limit}). الرصيد الحالي: ${customer.balance}، الدين الجديد المترتب: ${newDebt}`);
            }
          }
        }

        // 1. تحديد (CREATE or UPDATE)
        if (data.id) {
          const existing = raw.prepare('SELECT * FROM sales_invoices WHERE id = ?').get(data.id) as any;
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
              reverseSaleEffects(raw, invoiceId, existing);
            }
          } else if (data.status === 'confirmed') {
            needsFirstTimeEffects = true;
          }
        } else {
          // CREATE: منطق الإنشاء المعتاد
          invoiceNumber = generateInvoiceNumber(raw);
          const customDateVal = data.custom_date || null;
          const ins = raw.prepare(`
            INSERT INTO sales_invoices (invoice_number, session_id, customer_id, sale_type, date, time, subtotal, tax_amount, global_discount_amount, total, paid, remaining, status, notes, user_id)
            VALUES (?, ?, ?, ?, COALESCE(?, date('now')), time('now'), ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(invoiceNumber, data.session_id || null, data.customer_id || null, data.sale_type, customDateVal, data.subtotal, data.tax_amount, data.global_discount_amount, data.total, data.paid, data.total - data.paid, data.status || 'draft', data.notes || null, userId);
          invoiceId = ins.lastInsertRowid as number;
          isNew = true;
          needsFirstTimeEffects = data.status === 'confirmed';
        }

        // 3. تحديث Header وتخزين العناصر
        updateInvoiceHeader(raw, invoiceId, data);
        raw.prepare('DELETE FROM sales_invoice_items WHERE invoice_id = ?').run(invoiceId);
        
        const insertItem = raw.prepare(`
          INSERT INTO sales_invoice_items (invoice_id, product_id, product_name_snapshot, quantity, unit, unit_price, total)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `);
        for (const item of data.items) {
          insertItem.run(invoiceId, item.product_id, item.product_name_snapshot, item.quantity, item.unit, item.unit_price, item.total);
        }

        // 4. تطبيق تأثيرات المخزون والمحاسبة للفواتير الجديدة أو المؤكدة أول مرة
        if (needsFirstTimeEffects) {
          applySaleEffects(raw, invoiceId, invoiceNumber, data, userId);
        }

        // 5. Audit Trail الصامت
        raw.prepare("INSERT INTO audit_log (action, table_name, record_id, description, user_id, created_at) VALUES (?, ?, ?, ?, ?, datetime('now'))")
          .run(isNew ? 'CREATE_INVOICE' : 'UPDATE_INVOICE', 'sales_invoices', invoiceId, `Invoice: ${invoiceNumber}`, userId);

        return { success: true, id: invoiceId, invoiceNumber, status: data.status, isNew };
      });

      return tx.immediate();
    } catch (e: any) {
      console.error('[Sales IPC] Save error:', e);
      return { success: false, error: e.message };
    }
  }

  // ── منطق الـ Hybrid Updates: مقارنة Delta ──
  function applyHybridUpdates(raw: any, invoiceId: number, oldInvoice: any, newData: any, userId: number) {
    const allowNegativeStockSetting = raw.prepare("SELECT value FROM app_settings WHERE key = 'allow_negative_stock'").get() as { value: string } | undefined;
    const allowNegativeStock = allowNegativeStockSetting?.value === 'true';

    const oldItems = raw.prepare('SELECT * FROM sales_invoice_items WHERE invoice_id = ?').all(invoiceId) as any[];
    
    if (!allowNegativeStock) {
      const netChangeMap = new Map<number, { change: number, name: string }>();

      for (const newItem of newData.items) {
        const oldItem = oldItems.find(i => i.product_id === newItem.product_id);
        const prod: any = raw.prepare('SELECT name, has_sub_unit, pieces_per_box FROM products WHERE id = ?').get(newItem.product_id);
        
        let newQty = newItem.quantity;
        if (prod?.has_sub_unit && newItem.unit === 'علبة') {
          newQty = newItem.quantity * (prod.pieces_per_box || 1);
        }

        let oldQty = 0;
        if (oldItem) {
          oldQty = oldItem.quantity;
          if (prod?.has_sub_unit && oldItem.unit === 'علبة') {
            oldQty = oldItem.quantity * (prod.pieces_per_box || 1);
          }
        }

        const delta = newQty - oldQty;
        if (delta > 0) {
          const entry = netChangeMap.get(newItem.product_id) || { change: 0, name: prod?.name || newItem.product_name_snapshot || 'Unknown' };
          entry.change += delta;
          netChangeMap.set(newItem.product_id, entry);
        }
      }

      for (const [productId, entry] of netChangeMap.entries()) {
        const stockRow = raw.prepare('SELECT quantity FROM stock_balances WHERE product_id = ? AND location_id = 1').get(productId) as { quantity: number } | undefined;
        const currentQty = stockRow?.quantity || 0;
        if (currentQty < entry.change) {
          throw new Error(`الكمية غير كافية في المستودع للمنتج: ${entry.name}. المتوفر: ${currentQty}، المطلوب إضافته: ${entry.change}`);
        }
      }
    }
    
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

        // حالة: نفس المنتج -> Delta
        const delta = newQty - oldQty;
        if (delta !== 0) {
          raw.prepare('UPDATE stock_balances SET quantity = quantity - ? WHERE product_id = ? AND location_id = 1').run(delta, newItem.product_id);
        }
      } else {
        // حالة: منتج جديد -> Full Apply
        raw.prepare('UPDATE stock_balances SET quantity = quantity - ? WHERE product_id = ? AND location_id = 1').run(newQty, newItem.product_id);
      }
    }
    
    // إزالة العناصر المحذوفة
    for (const oldItem of oldItems) {
      if (!newData.items.find((i: any) => i.product_id === oldItem.product_id)) {
        const prod: any = raw.prepare('SELECT has_sub_unit, pieces_per_box FROM products WHERE id = ?').get(oldItem.product_id);
        let oldQty = oldItem.quantity;
        if (prod?.has_sub_unit && oldItem.unit === 'علبة') {
          oldQty = oldItem.quantity * (prod.pieces_per_box || 1);
        }
        raw.prepare('UPDATE stock_balances SET quantity = quantity + ? WHERE product_id = ? AND location_id = 1').run(oldQty, oldItem.product_id);
      }
    }

    // عكس الدفعة القديمة من العميل والصندوق
    if (oldInvoice.paid > 0) {
      raw.prepare('UPDATE cash_boxes SET current_balance = current_balance - ? WHERE id = 1').run(oldInvoice.paid);
      raw.prepare("DELETE FROM payments WHERE invoice_id = ? AND party_type = 'customer'").run(invoiceId);
    }

    // عكس دين الزبون القديم
    const oldDebt = oldInvoice.total - oldInvoice.paid;
    if (oldDebt > 0 && oldInvoice.customer_id) {
      raw.prepare('UPDATE customers SET balance = balance - ? WHERE id = ?').run(oldDebt, oldInvoice.customer_id);
    }

    // تطبيق الدفعة الجديدة
    if (newData.paid > 0) {
      const cashBoxId = newData.cash_box_id || 1;
      const paymentDate = newData.custom_date || new Date().toISOString().split('T')[0];
      raw.prepare(`INSERT INTO payments (payment_number, type, party_type, party_id, amount, direction, payment_method, date, invoice_id, user_id) VALUES (?, 'collection', 'customer', ?, ?, 'in', 'cash', ?, ?, ?)`).run(`REC-${Date.now()}`, newData.customer_id || 0, newData.paid, paymentDate, invoiceId, userId);
      raw.prepare('UPDATE cash_boxes SET current_balance = current_balance + ? WHERE id = ?').run(newData.paid, cashBoxId);
    }

    // تطبيق دين الزبون الجديد
    const newDebt = Math.round((newData.total - newData.paid) * 100) / 100;
    if (newDebt > 0 && newData.customer_id) {
      raw.prepare('UPDATE customers SET balance = balance + ? WHERE id = ?').run(newDebt, newData.customer_id);
    }

    // تحديث المحاسبة (Adjustment)
    AccountingEngine.updateSaleEntry(raw, { oldTotal: oldInvoice.total, newTotal: newData.total, invoiceId, date: newData.custom_date || oldInvoice.date }, userId);
  }

  function reverseItemEffect(raw: any, item: any) {
    const prod: any = raw.prepare('SELECT has_sub_unit, pieces_per_box FROM products WHERE id = ?').get(item.product_id);
    let qty = item.quantity;
    if (prod?.has_sub_unit && item.unit === 'علبة') {
      qty = item.quantity * (prod.pieces_per_box || 1);
    }
    raw.prepare('UPDATE stock_balances SET quantity = quantity + ? WHERE product_id = ? AND location_id = 1').run(qty, item.product_id);
  }

  function applyItemEffect(raw: any, item: any) {
    const prod: any = raw.prepare('SELECT has_sub_unit, pieces_per_box FROM products WHERE id = ?').get(item.product_id);
    let qty = item.quantity;
    if (prod?.has_sub_unit && item.unit === 'علبة') {
      qty = item.quantity * (prod.pieces_per_box || 1);
    }
    raw.prepare('UPDATE stock_balances SET quantity = quantity - ? WHERE product_id = ? AND location_id = 1').run(qty, item.product_id);
  }

  // ── دوال مساعدة لـ IPC ──
  function generateInvoiceNumber(raw: any) {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const prefix = `SAL-${yyyy}${mm}${dd}-`;
    
    // Fetch all invoices for today to parse their actual sequence numbers
    const rows = raw.prepare("SELECT invoice_number FROM sales_invoices WHERE invoice_number LIKE ?").all(`${prefix}%`);
    
    let maxSeq = 0;
    for (const row of rows) {
      if (row && row.invoice_number) {
        const parts = row.invoice_number.split('-');
        const lastPart = parts[parts.length - 1];
        const seq = parseInt(lastPart, 10);
        if (!isNaN(seq) && seq > maxSeq) {
          maxSeq = seq;
        }
      }
    }
    
    const nextSeq = maxSeq + 1;
    return `${prefix}${String(nextSeq).padStart(3, '0')}`;
  }

  function updateInvoiceHeader(raw: any, invoiceId: number, data: any) {
    const customDateVal = data.custom_date || null;
    raw.prepare(`
      UPDATE sales_invoices SET 
        customer_id = ?, sale_type = ?, subtotal = ?, tax_amount = ?, global_discount_amount = ?,
        total = ?, paid = ?, remaining = ?, status = ?, notes = ?, date = COALESCE(?, date), updated_at = datetime('now')
      WHERE id = ?
    `).run(data.customer_id || null, data.sale_type, data.subtotal, data.tax_amount, data.global_discount_amount, data.total, data.paid, data.total - data.paid, data.status || 'draft', data.notes || null, customDateVal, invoiceId);
  }

  // ══════════════════════════════════════════════════════════════
  // ── عكس تأثيرات فاتورة مبيعات ──────────────────────────────
  // ══════════════════════════════════════════════════════════════
  function reverseSaleEffects(raw: any, invoiceId: number, invoice: any) {
    const items = raw.prepare('SELECT * FROM sales_invoice_items WHERE invoice_id = ?').all(invoiceId);
    
    // إرجاع المخزون
    for (const item of items as any[]) {
      const prod: any = raw.prepare('SELECT has_sub_unit, pieces_per_box FROM products WHERE id = ?').get(item.product_id);
      let qty = item.quantity;
      if (prod?.has_sub_unit && item.unit === 'علبة') qty = item.quantity * (prod.pieces_per_box || 1);
      raw.prepare('UPDATE stock_balances SET quantity = quantity + ? WHERE product_id = ? AND location_id = 1').run(qty, item.product_id);
    }

    // عكس الصندوق
    if (invoice.paid > 0) {
      raw.prepare('UPDATE cash_boxes SET current_balance = current_balance - ? WHERE id = 1').run(invoice.paid);
      raw.prepare("DELETE FROM payments WHERE invoice_id = ? AND party_type = 'customer'").run(invoiceId);
    }

    // عكس دين الزبون
    const debt = invoice.total - invoice.paid;
    if (debt > 0 && invoice.customer_id) {
      raw.prepare('UPDATE customers SET balance = balance - ? WHERE id = ?').run(debt, invoice.customer_id);
    }

    // قيد محاسبي عكسي
    AccountingEngine.reverseEntry(raw, 'sales_invoice', invoiceId, invoice.user_id, `تعديل فاتورة مبيعات ${invoice.invoice_number}`);
  }

  // ═══════════════════════════════════════════════════════════════
  // ── تطبيق تأثيرات فاتورة مبيعات ─────────────────────────────
  // ═══════════════════════════════════════════════════════════════
  function applySaleEffects(raw: any, invoiceId: number, invoiceNumber: string, data: any, userId: number) {
    const allowNegativeStockSetting = raw.prepare("SELECT value FROM app_settings WHERE key = 'allow_negative_stock'").get() as { value: string } | undefined;
    const allowNegativeStock = allowNegativeStockSetting?.value === 'true';

    if (!allowNegativeStock) {
      const productQuantities = new Map<number, { qty: number, name: string }>();
      for (const item of data.items) {
        const prod: any = raw.prepare('SELECT name, has_sub_unit, pieces_per_box FROM products WHERE id = ?').get(item.product_id);
        let qty = item.quantity;
        if (prod?.has_sub_unit && item.unit === 'علبة') qty = item.quantity * (prod.pieces_per_box || 1);
        const entry = productQuantities.get(item.product_id) || { qty: 0, name: prod?.name || item.product_name_snapshot || 'Unknown' };
        entry.qty += qty;
        productQuantities.set(item.product_id, entry);
      }

      for (const [productId, entry] of productQuantities.entries()) {
        const stockRow = raw.prepare('SELECT quantity FROM stock_balances WHERE product_id = ? AND location_id = 1').get(productId) as { quantity: number } | undefined;
        const currentQty = stockRow?.quantity || 0;
        if (currentQty < entry.qty) {
          throw new Error(`الكمية غير كافية في المستودع للمنتج: ${entry.name}. المتوفر: ${currentQty}، المطلوب: ${entry.qty}`);
        }
      }
    }

    // التحقق من الائتمان
    if (data.customer_id) {
      const customer = raw.prepare('SELECT credit_limit, balance FROM customers WHERE id = ?').get(data.customer_id) as any;
      if (customer && customer.credit_limit > 0) {
        const newDebt = data.total - data.paid;
        if (customer.balance + newDebt > customer.credit_limit) {
          throw new Error('تجاوز الحد الائتماني للعميل');
        }
      }
    }

    // خصم المخزون
    for (const item of data.items) {
      const prod: any = raw.prepare('SELECT has_sub_unit, pieces_per_box FROM products WHERE id = ?').get(item.product_id);
      let qty = item.quantity;
      if (prod?.has_sub_unit && item.unit === 'علبة') qty = item.quantity * (prod.pieces_per_box || 1);
      
      const stock: any = raw.prepare('SELECT id FROM stock_balances WHERE product_id = ? AND location_id = 1').get(item.product_id);
      if (!stock) {
        raw.prepare('INSERT INTO stock_balances (product_id, location_id, quantity) VALUES (?, 1, ?)').run(item.product_id, -qty);
      } else {
        raw.prepare('UPDATE stock_balances SET quantity = quantity - ? WHERE product_id = ? AND location_id = 1').run(qty, item.product_id);
      }
    }

    // الصندوق
    if (data.paid > 0) {
      const cashBoxId = data.cash_box_id || 1;
      const paymentDate = data.custom_date || new Date().toISOString().split('T')[0];
      raw.prepare(`INSERT INTO payments (payment_number, type, party_type, party_id, amount, direction, payment_method, date, invoice_id, user_id) VALUES (?, 'collection', 'customer', ?, ?, 'in', 'cash', ?, ?, ?)`).run(`REC-${Date.now()}`, data.customer_id || 0, data.paid, paymentDate, invoiceId, userId);
      raw.prepare('UPDATE cash_boxes SET current_balance = current_balance + ? WHERE id = ?').run(data.paid, cashBoxId);
    }

    // دين الزبون
    const debt = Math.round((data.total - data.paid) * 100) / 100;
    if (debt > 0 && data.customer_id) {
      raw.prepare('UPDATE customers SET balance = balance + ? WHERE id = ?').run(debt, data.customer_id);
    }

    // قيد محاسبي
    const totalCogs = data.items.reduce((sum: number, item: any) => sum + (item.quantity * (item.cost_price_snapshot || 0)), 0);
    const entryDate = data.custom_date || new Date().toISOString().split('T')[0];
    AccountingEngine.recordSale(raw, { id: invoiceId, invoice_number: invoiceNumber, date: entryDate, total: data.total, paid: data.paid, remaining: debt, cogs: totalCogs, customer_id: data.customer_id || null }, userId);
  }

  // ── إلغاء فاتورة ───────────────────────────────────────────────
  ipcMain.handle('db:sales:cancel', async (_e, id: number) => {
    try {
      const session = await AuthService.checkSession();
      if (!session.success) return { success: false, error: 'غير مصرح' };
      const userId = session.user.id;
      const raw = db();
      const tx = raw.transaction(() => {
        const invoice: any = raw.prepare('SELECT * FROM sales_invoices WHERE id = ?').get(id);
        if (!invoice) throw new Error('الفاتورة غير موجودة');
        AccountingEngine._checkClosingDate(raw, invoice.date);
        if (invoice.status === 'confirmed') {
          reverseSaleEffects(raw, id, invoice);
        }
        // Completely delete corresponding journal entries
        raw.prepare("DELETE FROM journal_entries WHERE reference_id = ? AND reference_type IN ('sales_invoice', 'sales_invoice_adjustment', 'sales_invoice_reversal')").run(id);
        // Mark the invoice as cancelled instead of deleting
        raw.prepare("UPDATE sales_invoices SET status = 'cancelled', updated_at = datetime('now') WHERE id = ?").run(id);
      });
      tx.immediate();
      return { success: true };
    } catch (e: any) { return { success: false, error: e.message }; }
  });

  // ── جلب المسودات المحفوظة ─────────────────────────────────────
  ipcMain.handle('db:sales:getDrafts', async () => {
    try {
      const raw = db();
      const drafts = raw.prepare(`
        SELECT s.id, s.invoice_number, s.date, s.time, s.total, s.status,
               c.name as customer_name, COALESCE(si.item_count, 0) as items_count
        FROM sales_invoices s
        LEFT JOIN customers c ON s.customer_id = c.id
        LEFT JOIN (SELECT invoice_id, COUNT(*) as item_count FROM sales_invoice_items GROUP BY invoice_id) si ON si.invoice_id = s.id
        WHERE s.status = 'draft'
        ORDER BY s.updated_at DESC
        LIMIT 50
      `).all();
      return { success: true, data: drafts };
    } catch (e: any) { return { success: false, error: e.message }; }
  });

  // ── حذف كل المسودات ────────────────────────────────────────────
  ipcMain.handle('db:sales:deleteAllDrafts', async () => {
    try {
      const raw = db();
      const drafts = raw.prepare("SELECT id FROM sales_invoices WHERE status = 'draft'").all() as any[];
      const tx = raw.transaction(() => {
        for (const d of drafts) {
          raw.prepare('DELETE FROM sales_invoice_items WHERE invoice_id = ?').run(d.id);
          raw.prepare('DELETE FROM sales_invoices WHERE id = ?').run(d.id);
        }
      });
      tx.immediate();
      return { success: true, deleted: drafts.length };
    } catch (e: any) { return { success: false, error: e.message }; }
  });

  // ── حذف مسودة ──────────────────────────────────────────────────
  ipcMain.handle('db:sales:deleteDraft', async (_e, id: number) => {
    try {
      const raw = db();
      const existing = raw.prepare("SELECT * FROM sales_invoices WHERE id = ? AND status = 'draft'").get(id) as any;
      if (!existing) return { success: false, error: 'المسودة غير موجودة' };
      raw.prepare('DELETE FROM sales_invoice_items WHERE invoice_id = ?').run(id);
      raw.prepare('DELETE FROM sales_invoices WHERE id = ?').run(id);
      return { success: true };
    } catch (e: any) { return { success: false, error: e.message }; }
  });

  console.log('[IPC] Sales handlers registered');
}
