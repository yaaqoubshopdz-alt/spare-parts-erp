/**
 * Customers & Suppliers IPC — CRUD + كشف حساب
 */
import { ipcMain } from 'electron';
import { DatabaseService } from '../services/database.service';
import { AccountingEngine } from '../services/accounting.service';

export function registerPartiesIPC() {
  const db = () => DatabaseService.getRawDb();

  const SORT_MAP_CUSTOMERS: Record<string, string> = {
    name: 'name',
    code: 'code',
    phone: 'phone',
    balance: 'balance',
    credit_limit: 'credit_limit',
  };

  const SORT_MAP_SUPPLIERS: Record<string, string> = {
    name: 'name',
    code: 'code',
    phone: 'phone',
    balance: 'balance',
  };

  // ═══════════ CUSTOMERS ═══════════
  ipcMain.handle('db:customers:getAll', async (_e, filters?: { search?: string; page?: number; limit?: number; sortKey?: string; sortDir?: string }) => {
    try {
      const raw = db();
      let where = 'WHERE 1=1';
      const params: any[] = [];

      if (filters?.search) {
        where += ' AND (name LIKE ? OR code LIKE ? OR phone LIKE ?)';
        const s = `%${filters.search}%`;
        params.push(s, s, s);
      }

      const countRow: any = raw.prepare(`SELECT COUNT(*) as total FROM customers ${where}`).get(...params);
      const page = filters?.page || 1;
      const limit = filters?.limit || 50;
      const safeCol = SORT_MAP_CUSTOMERS[filters?.sortKey || ''] || 'id';
      const safeDir = filters?.sortDir === 'desc' ? 'DESC' : 'ASC';

      const customers = raw.prepare(`
        SELECT * FROM customers ${where}
        ORDER BY ${safeCol} ${safeDir} LIMIT ? OFFSET ?
      `).all(...params, limit, (page - 1) * limit);

      return { success: true, data: customers, total: countRow.total };
    } catch (e: any) { return { success: false, error: e.message }; }
  });

  ipcMain.handle('db:customers:search', async (_e, query: string) => {
    try {
      const s = `%${query}%`;
      const data = db().prepare(`
        SELECT id, code, name, phone, address, balance FROM customers
        WHERE is_active = 1 AND (name LIKE ? OR code LIKE ? OR phone LIKE ? OR address LIKE ?)
        ORDER BY name ASC LIMIT 20
      `).all(s, s, s, s);
      return { success: true, data };
    } catch (e: any) { return { success: false, error: e.message }; }
  });

  ipcMain.handle('db:customers:create', async (_e, data: {
    code: string; name: string; name_fr?: string;
    phone?: string; phone2?: string; address?: string; email?: string;
    credit_limit?: number; notes?: string;
    initial_balance?: number;
  }) => {
    try {
      const raw = db();
      // Check code uniqueness
      const exists: any = raw.prepare('SELECT id FROM customers WHERE code = ?').get(data.code);
      if (exists) return { success: false, error: 'رمز الزبون موجود مسبقاً' };

      const initBal = Number(data.initial_balance) || 0;

      const tx = raw.transaction(() => {
        const result = raw.prepare(`
          INSERT INTO customers (code, name, name_fr, phone, phone2, address, email, balance, credit_limit, notes, is_active, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, datetime('now'), datetime('now'))
        `).run(data.code, data.name, data.name_fr || null, data.phone || null, data.phone2 || null,
               data.address || null, data.email || null, initBal, data.credit_limit || 0, data.notes || null);
        
        const customerId = result.lastInsertRowid;

        if (initBal > 0) {
          AccountingEngine._initAccounts(raw);
          const ACCOUNTS = AccountingEngine.ACCOUNTS;
          AccountingEngine.createJournalEntry(raw, {
            date: new Date().toISOString().split('T')[0],
            description: `رصيد افتتاحي (دين سابق) للزبون: ${data.name}`,
            reference_type: 'opening_balance',
            reference_id: customerId,
            user_id: 1,
            lines: [
              { account_id: ACCOUNTS.AR, debit: initBal, credit: 0, party_type: 'customer', party_id: customerId },
              { account_id: (raw.prepare("SELECT id FROM accounts WHERE code = '3100'").get() as any)?.id || 10, debit: 0, credit: initBal }
            ]
          });
        }
        return customerId;
      });

      const customerId = tx();
      return { success: true, id: customerId };
    } catch (e: any) { return { success: false, error: e.message }; }
  });

  ipcMain.handle('db:customers:update', async (_e, id: number, data: Record<string, any>) => {
    try {
      const fields = ['name', 'name_fr', 'phone', 'phone2', 'address', 'email', 'credit_limit', 'notes', 'is_active']
        .filter(f => data[f] !== undefined);
      if (!fields.length) return { success: false, error: 'لا توجد تعديلات' };
      const set = fields.map(f => `${f} = ?`).join(', ') + ", updated_at = datetime('now')";
      const vals = fields.map(f => {
        const val = data[f];
        return typeof val === 'boolean' ? (val ? 1 : 0) : val;
      });
      db().prepare(`UPDATE customers SET ${set} WHERE id = ?`).run(...vals, id);
      return { success: true };
    } catch (e: any) { return { success: false, error: e.message }; }
  });

  ipcMain.handle('db:customers:getStatement', async (_e, customerId: number, dateFrom?: string, dateTo?: string) => {
    try {
      const raw = db();
      let openingBalance = 0;
      
      // 1. حساب الرصيد الافتتاحي للزبون (طبيعة الحساب مدين: Debit - Credit)
      if (dateFrom) {
        const obQuery: any = raw.prepare(`
          SELECT COALESCE(SUM(jel.debit - jel.credit), 0) as val
          FROM journal_entry_lines jel
          JOIN journal_entries je ON jel.entry_id = je.id
          WHERE jel.party_type = 'customer' AND jel.party_id = ? AND je.status = 'posted' AND je.date < ?
        `).get(customerId, dateFrom);
        openingBalance = obQuery.val || 0;
      }

      // 2. جلب حركة العميل مع حساب الرصيد التراكمي (Window Function)
      let dateFilter = '';
      const params: any[] = [openingBalance, customerId];
      
      if (dateFrom) {
        dateFilter += ' AND je.date >= ?';
        params.push(dateFrom);
      }
      if (dateTo) {
        dateFilter += ' AND je.date <= ?';
        params.push(dateTo);
      }

      const ledger = raw.prepare(`
        SELECT 
          je.id as entry_id,
          je.entry_number,
          je.date,
          je.description,
          je.reference_type,
          je.reference_id,
          jel.debit,
          jel.credit,
          ? + SUM(jel.debit - jel.credit) OVER (ORDER BY je.date ASC, je.id ASC) as running_balance
        FROM journal_entry_lines jel
        JOIN journal_entries je ON jel.entry_id = je.id
        WHERE jel.party_type = 'customer' AND jel.party_id = ? AND je.status = 'posted' ${dateFilter}
        ORDER BY je.date ASC, je.id ASC
      `).all(...params);

      const customer: any = raw.prepare('SELECT * FROM customers WHERE id = ?').get(customerId);

      return { 
        success: true, 
        data: { 
          customer, 
          opening_balance: openingBalance,
          transactions: ledger 
        } 
      };
    } catch (e: any) { return { success: false, error: e.message }; }
  });

  // ═══════════ SUPPLIERS ═══════════
  ipcMain.handle('db:suppliers:getAll', async (_e, filters?: { search?: string; sortKey?: string; sortDir?: string }) => {
    try {
      let where = 'WHERE 1=1';
      const params: any[] = [];
      if (filters?.search) {
        where += ' AND (name LIKE ? OR code LIKE ? OR phone LIKE ? OR address LIKE ?)';
        const s = `%${filters.search}%`;
        params.push(s, s, s, s);
      }
      const safeCol = SORT_MAP_SUPPLIERS[filters?.sortKey || ''] || 'id';
      const safeDir = filters?.sortDir === 'desc' ? 'DESC' : 'ASC';
      const data = db().prepare(`SELECT * FROM suppliers ${where} ORDER BY ${safeCol} ${safeDir}`).all(...params);
      return { success: true, data };
    } catch (e: any) { return { success: false, error: e.message }; }
  });

  ipcMain.handle('db:suppliers:search', async (_e, query: string) => {
    try {
      const s = `%${query}%`;
      const data = db().prepare(`
        SELECT id, code, name, phone, address, balance FROM suppliers
        WHERE is_active = 1 AND (name LIKE ? OR code LIKE ? OR phone LIKE ? OR address LIKE ?)
        ORDER BY name ASC LIMIT 20
      `).all(s, s, s, s);
      return { success: true, data };
    } catch (e: any) { return { success: false, error: e.message }; }
  });

  ipcMain.handle('db:suppliers:create', async (_e, data: {
    code: string; name: string; name_fr?: string;
    phone?: string; phone2?: string; address?: string; email?: string; notes?: string;
    initial_balance?: number;
  }) => {
    try {
      const raw = db();
      const exists: any = raw.prepare('SELECT id FROM suppliers WHERE code = ?').get(data.code);
      if (exists) return { success: false, error: 'رمز المورد موجود مسبقاً' };

      const initBal = Number(data.initial_balance) || 0;

      const tx = raw.transaction(() => {
        const result = raw.prepare(`
          INSERT INTO suppliers (code, name, name_fr, phone, phone2, address, email, balance, notes, is_active, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, datetime('now'), datetime('now'))
        `).run(data.code, data.name, data.name_fr || null, data.phone || null, data.phone2 || null,
               data.address || null, data.email || null, initBal, data.notes || null);
        
        const supplierId = result.lastInsertRowid;

        if (initBal > 0) {
          AccountingEngine._initAccounts(raw);
          const ACCOUNTS = AccountingEngine.ACCOUNTS;
          AccountingEngine.createJournalEntry(raw, {
            date: new Date().toISOString().split('T')[0],
            description: `رصيد افتتاحي (دين سابق) للمورد: ${data.name}`,
            reference_type: 'opening_balance',
            reference_id: supplierId,
            user_id: 1,
            lines: [
              { account_id: (raw.prepare("SELECT id FROM accounts WHERE code = '3100'").get() as any)?.id || 10, debit: initBal, credit: 0 },
              { account_id: ACCOUNTS.AP, debit: 0, credit: initBal, party_type: 'supplier', party_id: supplierId }
            ]
          });
        }
        return supplierId;
      });

      const supplierId = tx();
      return { success: true, id: supplierId };
    } catch (e: any) { return { success: false, error: e.message }; }
  });

  ipcMain.handle('db:suppliers:update', async (_e, id: number, data: Record<string, any>) => {
    try {
      const fields = ['name', 'name_fr', 'phone', 'phone2', 'address', 'email', 'notes', 'is_active']
        .filter(f => data[f] !== undefined);
      if (!fields.length) return { success: false, error: 'لا توجد تعديلات' };
      const set = fields.map(f => `${f} = ?`).join(', ') + ", updated_at = datetime('now')";
      const vals = fields.map(f => {
        const val = data[f];
        return typeof val === 'boolean' ? (val ? 1 : 0) : val;
      });
      db().prepare(`UPDATE suppliers SET ${set} WHERE id = ?`).run(...vals, id);
      return { success: true };
    } catch (e: any) { return { success: false, error: e.message }; }
  });

  ipcMain.handle('db:suppliers:getStatement', async (_e, supplierId: number, dateFrom?: string, dateTo?: string) => {
    try {
      const raw = db();
      let openingBalance = 0;
      
      // 1. حساب الرصيد الافتتاحي للمورد (طبيعة الحساب دائن: Credit - Debit)
      if (dateFrom) {
        const obQuery: any = raw.prepare(`
          SELECT COALESCE(SUM(jel.credit - jel.debit), 0) as val
          FROM journal_entry_lines jel
          JOIN journal_entries je ON jel.entry_id = je.id
          WHERE jel.party_type = 'supplier' AND jel.party_id = ? AND je.status = 'posted' AND je.date < ?
        `).get(supplierId, dateFrom);
        openingBalance = obQuery.val || 0;
      }

      // 2. جلب حركة المورد مع حساب الرصيد التراكمي (Window Function)
      let dateFilter = '';
      const params: any[] = [openingBalance, supplierId];
      
      if (dateFrom) {
        dateFilter += ' AND je.date >= ?';
        params.push(dateFrom);
      }
      if (dateTo) {
        dateFilter += ' AND je.date <= ?';
        params.push(dateTo);
      }

      const ledger = raw.prepare(`
        SELECT 
          je.id as entry_id,
          je.entry_number,
          je.date,
          je.description,
          je.reference_type,
          je.reference_id,
          jel.debit,
          jel.credit,
          ? + SUM(jel.credit - jel.debit) OVER (ORDER BY je.date ASC, je.id ASC) as running_balance
        FROM journal_entry_lines jel
        JOIN journal_entries je ON jel.entry_id = je.id
        WHERE jel.party_type = 'supplier' AND jel.party_id = ? AND je.status = 'posted' ${dateFilter}
        ORDER BY je.date ASC, je.id ASC
      `).all(...params);

      const supplier: any = raw.prepare('SELECT * FROM suppliers WHERE id = ?').get(supplierId);

      return { 
        success: true, 
        data: { 
          supplier, 
          opening_balance: openingBalance,
          transactions: ledger 
        } 
      };
    } catch (e: any) { return { success: false, error: e.message }; }
  });

  ipcMain.handle('db:customers:addPayment', async (_e, data: { customer_id: number, amount: number, payment_method: string, notes?: string, _user_id?: number }) => {
    try {
      const raw = db();
      const tx = raw.transaction(() => {
        const paymentNumber = 'PAY-C-' + Date.now();
        const insertRes = raw.prepare(`
          INSERT INTO payments (payment_number, type, direction, party_id, party_type, amount, payment_method, date, notes, created_at)
          VALUES (?, 'collection', 'in', ?, 'customer', ?, ?, date('now'), ?, datetime('now', 'localtime'))
        `).run(paymentNumber, data.customer_id, data.amount, data.payment_method, data.notes || null);
        
        raw.prepare('UPDATE customers SET balance = balance - ? WHERE id = ?').run(data.amount, data.customer_id);
        raw.prepare('UPDATE cash_boxes SET current_balance = current_balance + ? WHERE id = 1').run(data.amount);

        // المحرك المحاسبي
        AccountingEngine.recordPayment(raw, {
          id: insertRes.lastInsertRowid,
          payment_number: paymentNumber,
          direction: 'in',
          amount: data.amount,
          party_type: 'customer',
          party_id: data.customer_id,
          date: new Date().toISOString().split('T')[0]
        }, data._user_id || 1);
      });
      tx();
      return { success: true };
    } catch (e: any) { return { success: false, error: e.message }; }
  });

  ipcMain.handle('db:suppliers:addPayment', async (_e, data: { supplier_id: number, amount: number, payment_method: string, notes?: string, _user_id?: number }) => {
    try {
      const raw = db();
      const tx = raw.transaction(() => {
        const paymentNumber = 'PAY-S-' + Date.now();
        const insertRes = raw.prepare(`
          INSERT INTO payments (payment_number, type, direction, party_id, party_type, amount, payment_method, date, notes, created_at)
          VALUES (?, 'disbursement', 'out', ?, 'supplier', ?, ?, date('now'), ?, datetime('now', 'localtime'))
        `).run(paymentNumber, data.supplier_id, data.amount, data.payment_method, data.notes || null);
        
        raw.prepare('UPDATE suppliers SET balance = balance - ? WHERE id = ?').run(data.amount, data.supplier_id);
        raw.prepare('UPDATE cash_boxes SET current_balance = current_balance - ? WHERE id = 1').run(data.amount);

        // المحرك المحاسبي
        AccountingEngine.recordPayment(raw, {
          id: insertRes.lastInsertRowid,
          payment_number: paymentNumber,
          direction: 'out',
          amount: data.amount,
          party_type: 'supplier',
          party_id: data.supplier_id,
          date: new Date().toISOString().split('T')[0]
        }, data._user_id || 1);
      });
      tx();
      return { success: true };
    } catch (e: any) { return { success: false, error: e.message }; }
  });

  // ═══════════ PAYMENT UPDATE / DELETE ═══════════
  ipcMain.handle('db:payments:update', async (_e, data: { id: number, amount: number, payment_method?: string, notes?: string }) => {
    try {
      const raw = db();
      const oldPayment: any = raw.prepare('SELECT * FROM payments WHERE id = ?').get(data.id);
      if (!oldPayment) return { success: false, error: 'الدفعة غير موجودة' };
      if (oldPayment.amount === data.amount) {
        // Same amount — just update metadata
        raw.prepare(`UPDATE payments SET payment_method = ?, notes = ?, updated_at = datetime('now', 'localtime') WHERE id = ?`)
          .run(data.payment_method || oldPayment.payment_method, data.notes || oldPayment.notes, data.id);
        return { success: true };
      }

      const diff = oldPayment.amount - data.amount; // positive = less money moved, negative = more money moved

      const tx = raw.transaction(() => {
        // Update payment record
        raw.prepare(`UPDATE payments SET amount = ?, payment_method = ?, notes = ?, updated_at = datetime('now', 'localtime') WHERE id = ?`)
          .run(data.amount, data.payment_method || oldPayment.payment_method, data.notes || oldPayment.notes, data.id);

        // Adjust party balance: if new amount is smaller, party owes more; if larger, party owes less
        if (oldPayment.party_type === 'customer') {
          // Customer payment: was collected, so balance decreased by old amount
          // Now balance should decrease by new amount instead → add diff back
          raw.prepare('UPDATE customers SET balance = balance + ? WHERE id = ?').run(diff, oldPayment.party_id);
          // Cash box: was increased by old amount, now by new amount → subtract diff
          raw.prepare('UPDATE cash_boxes SET current_balance = current_balance - ? WHERE id = 1').run(diff);
        } else if (oldPayment.party_type === 'supplier') {
          // Supplier payment: was disbursed, so balance decreased by old amount
          // Now balance should decrease by new amount → add diff back
          raw.prepare('UPDATE suppliers SET balance = balance + ? WHERE id = ?').run(diff, oldPayment.party_id);
          // Cash box: was decreased by old amount, now by new amount → add diff back
          raw.prepare('UPDATE cash_boxes SET current_balance = current_balance + ? WHERE id = 1').run(diff);
        }
      });
      tx();
      return { success: true };
    } catch (e: any) { return { success: false, error: e.message }; }
  });

  ipcMain.handle('db:payments:delete', async (_e, paymentId: number) => {
    try {
      const raw = db();
      const payment: any = raw.prepare('SELECT * FROM payments WHERE id = ?').get(paymentId);
      if (!payment) return { success: false, error: 'الدفعة غير موجودة' };

      const tx = raw.transaction(() => {
        // Reverse the balance effects
        if (payment.party_type === 'customer') {
          // Payment collected from customer: reverse by adding amount back to balance
          raw.prepare('UPDATE customers SET balance = balance + ? WHERE id = ?').run(payment.amount, payment.party_id);
          // Cash box was increased: reverse by subtracting
          raw.prepare('UPDATE cash_boxes SET current_balance = current_balance - ? WHERE id = 1').run(payment.amount);
        } else if (payment.party_type === 'supplier') {
          // Payment to supplier: reverse by adding amount back to balance
          raw.prepare('UPDATE suppliers SET balance = balance + ? WHERE id = ?').run(payment.amount, payment.party_id);
          // Cash box was decreased: reverse by adding back
          raw.prepare('UPDATE cash_boxes SET current_balance = current_balance + ? WHERE id = 1').run(payment.amount);
        }

        // Delete the payment record
        raw.prepare('DELETE FROM payments WHERE id = ?').run(paymentId);
      });
      tx();
      return { success: true };
    } catch (e: any) { return { success: false, error: e.message }; }
  });

  console.log('[IPC] Parties handlers registered (customers, suppliers)');
}
