/**
 * Accounting IPC — نظام محاسبي احترافي متكامل
 * يشمل: الإقفال المالي، Audit Trail، التقارير المتقدمة، الصلاحيات، WAC
 */
import { ipcMain } from 'electron';
import { DatabaseService } from '../services/database.service';
import { AccountingEngine } from '../services/accounting.service';
import { AuthService } from '../services/auth.service';

export function registerAccountingIPC() {
  const db = () => DatabaseService.getRawDb();

  // ══════════════════════════════════════════════════════════════════
  //  1. ACCOUNTING CLOSING SYSTEM (نظام الإقفال المالي)
  // ══════════════════════════════════════════════════════════════════

  /** الحصول على تاريخ الإقفال الحالي */
  ipcMain.handle('accounting:getClosingDate', async () => {
    try {
      const raw = db();
      const setting: any = raw.prepare(`SELECT value FROM app_settings WHERE key = 'accounting_closing_date'`).get();
      return { success: true, data: setting?.value || '2000-01-01' };
    } catch (e: any) { return { success: false, error: e.message }; }
  });

  /** إقفال فترة مالية (قفل التعديلات حتى تاريخ معين) */
  ipcMain.handle('accounting:lockPeriod', async (_e, closingDate: string, _oldUserId?: number) => {
    try {
      const session = await AuthService.checkSession();
      if (!session.success) return { success: false, error: 'غير مصرح' };
      const userId = session.user.id;

      const raw = db();
      // التحقق من صلاحية المستخدم (owner أو manager فقط)
      const user: any = raw.prepare(`SELECT role FROM users WHERE id = ?`).get(userId);
      if (!user || !['owner', 'manager'].includes(user.role)) {
        return { success: false, error: 'لا تملك صلاحية إقفال الفترة المالية' };
      }

      // التحقق من توازن ميزان المراجعة قبل الإقفال
      const balance: any = raw.prepare(`
        SELECT 
          COALESCE(SUM(jel.debit), 0) as total_debit, 
          COALESCE(SUM(jel.credit), 0) as total_credit
        FROM journal_entry_lines jel
        JOIN journal_entries je ON jel.entry_id = je.id
        WHERE je.status = 'posted' AND je.date <= ?
      `).get(closingDate);

      if (Math.abs(balance.total_debit - balance.total_credit) > 0.01) {
        return { success: false, error: `ميزان المراجعة غير متوازن! مدين: ${balance.total_debit} / دائن: ${balance.total_credit}` };
      }

      // تحديث تاريخ الإقفال
      const tx = raw.transaction(() => {
        const exists: any = raw.prepare(`SELECT id FROM app_settings WHERE key = 'accounting_closing_date'`).get();
        if (exists) {
          raw.prepare(`UPDATE app_settings SET value = ?, updated_at = datetime('now') WHERE key = 'accounting_closing_date'`).run(closingDate);
        } else {
          raw.prepare(`INSERT INTO app_settings (key, value, type, description, updated_at) VALUES ('accounting_closing_date', ?, 'string', 'تاريخ الإقفال المالي', datetime('now'))`).run(closingDate);
        }
        // تسجيل في Audit Log
        raw.prepare(`INSERT INTO audit_log (user_id, action, table_name, description, created_at) VALUES (?, 'lock_period', 'app_settings', ?, datetime('now'))`).run(userId, `إقفال الفترة المالية حتى ${closingDate}`);
      });
      tx();

      return { success: true };
    } catch (e: any) { return { success: false, error: e.message }; }
  });

  /** فتح فترة مالية مغلقة (owner فقط) */
  ipcMain.handle('accounting:unlockPeriod', async (_e, newDate: string, _oldUserId?: number) => {
    try {
      const session = await AuthService.checkSession();
      if (!session.success) return { success: false, error: 'غير مصرح' };
      const userId = session.user.id;

      const raw = db();
      const user: any = raw.prepare(`SELECT role FROM users WHERE id = ?`).get(userId);
      if (!user || user.role !== 'owner') {
        return { success: false, error: 'فقط مالك النظام يمكنه فتح فترة مالية مغلقة' };
      }

      const tx = raw.transaction(() => {
        raw.prepare(`UPDATE app_settings SET value = ?, updated_at = datetime('now') WHERE key = 'accounting_closing_date'`).run(newDate);
        raw.prepare(`INSERT INTO audit_log (user_id, action, table_name, description, created_at) VALUES (?, 'unlock_period', 'app_settings', ?, datetime('now'))`).run(userId, `فتح الفترة المالية - تاريخ الإقفال الجديد: ${newDate}`);
      });
      tx();

      return { success: true };
    } catch (e: any) { return { success: false, error: e.message }; }
  });

  /** إقفال سنة مالية (ترحيل الأرباح المحتجزة) */
  ipcMain.handle('accounting:yearClose', async (_e, yearEndDate: string, _oldUserId?: number) => {
    try {
      const session = await AuthService.checkSession();
      if (!session.success) return { success: false, error: 'غير مصرح' };
      const userId = session.user.id;

      const raw = db();
      const user: any = raw.prepare(`SELECT role FROM users WHERE id = ?`).get(userId);
      if (!user || user.role !== 'owner') {
        return { success: false, error: 'فقط مالك النظام يمكنه إقفال السنة المالية' };
      }

      const tx = raw.transaction(() => {
        // حساب صافي الربح (الإيرادات - المصروفات)
        const revenues: any = raw.prepare(`
          SELECT COALESCE(SUM(jel.credit - jel.debit), 0) as val
          FROM journal_entry_lines jel
          JOIN journal_entries je ON jel.entry_id = je.id
          JOIN accounts a ON jel.account_id = a.id
          WHERE je.status = 'posted' AND a.type = 'revenue' AND je.date <= ?
        `).get(yearEndDate);

        const expenses: any = raw.prepare(`
          SELECT COALESCE(SUM(jel.debit - jel.credit), 0) as val
          FROM journal_entry_lines jel
          JOIN journal_entries je ON jel.entry_id = je.id
          JOIN accounts a ON jel.account_id = a.id
          WHERE je.status = 'posted' AND a.type = 'expense' AND je.date <= ?
        `).get(yearEndDate);

        const netIncome = (revenues.val || 0) - (expenses.val || 0);

        if (Math.abs(netIncome) > 0.01) {
          // قيد ترحيل الأرباح المحتجزة
          const RETAINED_EARNINGS_ID = 11; // 3200 - الأرباح المحتجزة
          const lines = [];

          // إقفال حسابات الإيرادات
          const revenueAccounts = raw.prepare(`
            SELECT a.id, COALESCE(SUM(jel.credit - jel.debit), 0) as balance
            FROM journal_entry_lines jel
            JOIN journal_entries je ON jel.entry_id = je.id
            JOIN accounts a ON jel.account_id = a.id
            WHERE je.status = 'posted' AND a.type = 'revenue' AND je.date <= ?
            GROUP BY a.id HAVING balance != 0
          `).all(yearEndDate);

          for (const acc of revenueAccounts as any[]) {
            lines.push({ account_id: acc.id, debit: acc.balance, credit: 0 });
          }

          // إقفال حسابات المصروفات
          const expenseAccounts = raw.prepare(`
            SELECT a.id, COALESCE(SUM(jel.debit - jel.credit), 0) as balance
            FROM journal_entry_lines jel
            JOIN journal_entries je ON jel.entry_id = je.id
            JOIN accounts a ON jel.account_id = a.id
            WHERE je.status = 'posted' AND a.type = 'expense' AND je.date <= ?
            GROUP BY a.id HAVING balance != 0
          `).all(yearEndDate);

          for (const acc of expenseAccounts as any[]) {
            lines.push({ account_id: acc.id, debit: 0, credit: acc.balance });
          }

          // ترحيل صافي الربح إلى الأرباح المحتجزة
          if (netIncome > 0) {
            lines.push({ account_id: RETAINED_EARNINGS_ID, debit: 0, credit: netIncome });
          } else {
            lines.push({ account_id: RETAINED_EARNINGS_ID, debit: Math.abs(netIncome), credit: 0 });
          }

          AccountingEngine.createJournalEntry(raw, {
            date: yearEndDate,
            description: `قيد إقفال السنة المالية ${yearEndDate}`,
            reference_type: 'year_closing',
            reference_id: 0,
            user_id: userId,
            lines: lines as any
          });
        }

        // قفل الفترة
        raw.prepare(`UPDATE app_settings SET value = ?, updated_at = datetime('now') WHERE key = 'accounting_closing_date'`).run(yearEndDate);
        raw.prepare(`INSERT INTO audit_log (user_id, action, table_name, description, created_at) VALUES (?, 'year_close', 'journal_entries', ?, datetime('now'))`).run(userId, `إقفال السنة المالية ${yearEndDate} - صافي الربح: ${netIncome}`);
      });
      tx();

      return { success: true };
    } catch (e: any) { return { success: false, error: e.message }; }
  });

  // ══════════════════════════════════════════════════════════════════
  //  2. AUDIT TRAIL (نظام التتبع والمراجعة)
  // ══════════════════════════════════════════════════════════════════

  /** تسجيل حدث في سجل المراجعة */
  ipcMain.handle('audit:log', async (_e, data: {
    action: string; table_name: string;
    record_id?: number; description?: string;
    old_data?: any; new_data?: any;
    user_id?: number; // legacy
  }) => {
    try {
      const session = await AuthService.checkSession();
      if (!session.success) return { success: false, error: 'غير مصرح' };
      const userId = session.user.id;

      const raw = db();
      raw.prepare(`
        INSERT INTO audit_log (user_id, action, table_name, record_id, description, old_data, new_data, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
      `).run(
        userId, data.action, data.table_name,
        data.record_id || null, data.description || null,
        data.old_data ? JSON.stringify(data.old_data) : null,
        data.new_data ? JSON.stringify(data.new_data) : null
      );
      return { success: true };
    } catch (e: any) { return { success: false, error: e.message }; }
  });

  /** تسجيل حدث في سجل المراجعة عبر db:audit:log للواجهة الأمامية */
  ipcMain.handle('db:audit:log', async (_e, data: {
    action: string;
    details?: string;
    description?: string;
    table_name?: string;
    record_id?: number;
    user_id?: number;
  }) => {
    try {
      const session = await AuthService.checkSession();
      if (!session.success) return { success: false, error: 'غير مصرح' };
      const userId = session.user.id;

      const raw = db();
      const action = data.action || 'general';
      let tableName = data.table_name;
      if (!tableName) {
        if (action.includes('sale') || action.includes('pos')) {
          tableName = 'sales_invoices';
        } else if (action.includes('purchase')) {
          tableName = 'purchase_invoices';
        } else {
          tableName = 'general';
        }
      }
      const desc = data.description || data.details || '';

      raw.prepare(`
        INSERT INTO audit_log (user_id, action, table_name, record_id, description, created_at)
        VALUES (?, ?, ?, ?, ?, datetime('now'))
      `).run(
        userId, action, tableName,
        data.record_id || null, desc
      );
      return { success: true };
    } catch (e: any) {
      console.error('[db:audit:log] error:', e);
      return { success: false, error: e.message };
    }
  });

  /** استعراض سجل المراجعة */
  ipcMain.handle('audit:getLog', async (_e, filters?: {
    user_id?: number; action?: string; table_name?: string;
    date_from?: string; date_to?: string;
    page?: number; limit?: number;
  }) => {
    try {
      const raw = db();
      let where = 'WHERE 1=1';
      const params: any[] = [];

      if (filters?.user_id) { where += ' AND al.user_id = ?'; params.push(filters.user_id); }
      if (filters?.action) { where += ' AND al.action = ?'; params.push(filters.action); }
      if (filters?.table_name) { where += ' AND al.table_name = ?'; params.push(filters.table_name); }
      if (filters?.date_from) { where += ' AND al.created_at >= ?'; params.push(filters.date_from); }
      if (filters?.date_to) { where += ' AND al.created_at <= ?'; params.push(filters.date_to + ' 23:59:59'); }

      const page = filters?.page || 1;
      const limit = filters?.limit || 50;

      const countRow: any = raw.prepare(`SELECT COUNT(*) as total FROM audit_log al ${where}`).get(...params);

      const logs = raw.prepare(`
        SELECT al.*, u.full_name as user_name, u.role as user_role
        FROM audit_log al
        LEFT JOIN users u ON al.user_id = u.id
        ${where}
        ORDER BY al.id DESC LIMIT ? OFFSET ?
      `).all(...params, limit, (page - 1) * limit);

      return { success: true, data: logs, total: countRow.total };
    } catch (e: any) { return { success: false, error: e.message }; }
  });

  // ══════════════════════════════════════════════════════════════════
  //  3. ADVANCED FINANCIAL REPORTS (التقارير المالية المتقدمة)
  // ══════════════════════════════════════════════════════════════════

  /** الأرباح والخسائر (Profit & Loss) */
  ipcMain.handle('accounting:getProfitAndLoss', async (_e, filters: { date_from: string, date_to: string }) => {
    try {
      const raw = db();
      
      const accounts = raw.prepare(`
        SELECT 
          a.id, a.code, a.name, a.type,
          COALESCE(SUM(jel.debit), 0) as total_debit,
          COALESCE(SUM(jel.credit), 0) as total_credit
        FROM accounts a
        LEFT JOIN journal_entry_lines jel ON a.id = jel.account_id
        LEFT JOIN journal_entries je ON jel.entry_id = je.id AND je.status = 'posted' AND je.date >= ? AND je.date <= ?
        WHERE a.type IN ('revenue', 'expense') AND a.parent_id IS NOT NULL
        GROUP BY a.id
      `).all(filters.date_from, filters.date_to) as any[];

      const revenue = accounts.filter(a => a.type === 'revenue').map(a => ({
        ...a, balance: a.total_credit - a.total_debit
      })).filter(a => a.balance !== 0);

      const cogs = accounts.filter(a => a.type === 'expense' && a.code.startsWith('51')).map(a => ({
        ...a, balance: a.total_debit - a.total_credit
      })).filter(a => a.balance !== 0);

      const expenses = accounts.filter(a => a.type === 'expense' && !a.code.startsWith('51')).map(a => ({
        ...a, balance: a.total_debit - a.total_credit
      })).filter(a => a.balance !== 0);

      const totalRevenue = revenue.reduce((sum, a) => sum + a.balance, 0);
      const totalCogs = cogs.reduce((sum, a) => sum + a.balance, 0);
      const totalExpenses = expenses.reduce((sum, a) => sum + a.balance, 0);

      const grossProfit = totalRevenue - totalCogs;
      const netProfit = grossProfit - totalExpenses;

      return {
        success: true,
        data: {
          revenue, totalRevenue,
          cogs, totalCogs,
          grossProfit,
          expenses, totalExpenses,
          netProfit
        }
      };
    } catch (e: any) { return { success: false, error: e.message }; }
  });

  /** الميزانية العمومية (Balance Sheet) */
  ipcMain.handle('accounting:getBalanceSheet', async (_e, asOfDate?: string) => {
    try {
      const raw = db();
      const dateParam = asOfDate || new Date().toISOString().split('T')[0];

      // جلب أرصدة جميع الحسابات حتى التاريخ المحدد
      const accountBalances = raw.prepare(`
        SELECT 
          a.id, a.code, a.name, a.type, a.parent_id,
          COALESCE(SUM(jel.debit - jel.credit), 0) as balance
        FROM accounts a
        LEFT JOIN journal_entry_lines jel ON a.id = jel.account_id
        LEFT JOIN journal_entries je ON jel.entry_id = je.id AND je.status = 'posted' AND je.date <= ?
        GROUP BY a.id
        ORDER BY a.code ASC
      `).all(dateParam) as any[];

      // حساب صافي ربح الفترة الحالية (لم يُرحّل بعد)
      const revenues: any = raw.prepare(`
        SELECT COALESCE(SUM(jel.credit - jel.debit), 0) as val
        FROM journal_entry_lines jel
        JOIN journal_entries je ON jel.entry_id = je.id
        JOIN accounts a ON jel.account_id = a.id
        WHERE je.status = 'posted' AND a.type = 'revenue' AND je.date <= ?
      `).get(dateParam);

      const expenses: any = raw.prepare(`
        SELECT COALESCE(SUM(jel.debit - jel.credit), 0) as val
        FROM journal_entry_lines jel
        JOIN journal_entries je ON jel.entry_id = je.id
        JOIN accounts a ON jel.account_id = a.id
        WHERE je.status = 'posted' AND a.type = 'expense' AND je.date <= ?
      `).get(dateParam);

      const netIncome = (revenues.val || 0) - (expenses.val || 0);

      // تصنيف الحسابات
      const assets = accountBalances.filter(a => a.type === 'asset' && a.parent_id !== null);
      const liabilities = accountBalances.filter(a => a.type === 'liability' && a.parent_id !== null);
      const equity = accountBalances.filter(a => a.type === 'equity' && a.parent_id !== null);

      const totalAssets = assets.reduce((sum, a) => sum + a.balance, 0);
      const totalLiabilities = liabilities.reduce((sum, a) => sum + Math.abs(a.balance), 0);
      const totalEquity = equity.reduce((sum, a) => sum + Math.abs(a.balance), 0) + netIncome;

      return {
        success: true,
        data: {
          as_of_date: dateParam,
          assets: { accounts: assets, total: totalAssets },
          liabilities: { accounts: liabilities.map(l => ({ ...l, balance: Math.abs(l.balance) })), total: totalLiabilities },
          equity: { accounts: equity.map(e => ({ ...e, balance: Math.abs(e.balance) })), total: totalEquity, net_income: netIncome },
          is_balanced: Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 0.01
        }
      };
    } catch (e: any) { return { success: false, error: e.message }; }
  });

  /** قائمة الدخل المفصلة (Income Statement) */
  ipcMain.handle('accounting:getIncomeStatement', async (_e, filters?: { date_from?: string; date_to?: string }) => {
    try {
      const raw = db();
      let dateFilter = " AND je.reference_type != 'year_closing'";
      const params: any[] = [];

      if (filters?.date_from) { dateFilter += ' AND je.date >= ?'; params.push(filters.date_from); }
      if (filters?.date_to) { dateFilter += ' AND je.date <= ?'; params.push(filters.date_to); }

      // الإيرادات مفصلة بحسب الحساب الفرعي
      const revenueDetails = raw.prepare(`
        SELECT a.id, a.code, a.name, COALESCE(SUM(jel.credit - jel.debit), 0) as balance
        FROM accounts a
        LEFT JOIN journal_entry_lines jel ON a.id = jel.account_id
        LEFT JOIN journal_entries je ON jel.entry_id = je.id AND je.status = 'posted' ${dateFilter}
        WHERE a.type = 'revenue' AND a.parent_id IS NOT NULL
        GROUP BY a.id ORDER BY a.code
      `).all(...params) as any[];

      // المصروفات مفصلة
      const expenseDetails = raw.prepare(`
        SELECT a.id, a.code, a.name, COALESCE(SUM(jel.debit - jel.credit), 0) as balance
        FROM accounts a
        LEFT JOIN journal_entry_lines jel ON a.id = jel.account_id
        LEFT JOIN journal_entries je ON jel.entry_id = je.id AND je.status = 'posted' ${dateFilter}
        WHERE a.type = 'expense' AND a.parent_id IS NOT NULL
        GROUP BY a.id ORDER BY a.code
      `).all(...params) as any[];

      const totalRevenue = revenueDetails.reduce((s, r) => s + r.balance, 0);
      const cogsAccounts = expenseDetails.filter(e => e.code.startsWith('51'));
      const opexAccounts = expenseDetails.filter(e => !e.code.startsWith('51'));
      const totalCOGS = cogsAccounts.reduce((s, c) => s + c.balance, 0);
      const totalOpex = opexAccounts.reduce((s, o) => s + o.balance, 0);

      return {
        success: true,
        data: {
          revenue: { accounts: revenueDetails, total: totalRevenue },
          cogs: { accounts: cogsAccounts, total: totalCOGS },
          gross_profit: totalRevenue - totalCOGS,
          operating_expenses: { accounts: opexAccounts, total: totalOpex },
          net_income: totalRevenue - totalCOGS - totalOpex
        }
      };
    } catch (e: any) { return { success: false, error: e.message }; }
  });

  /** كشف التدفقات النقدية (Cash Flow Statement) */
  ipcMain.handle('accounting:getCashFlow', async (_e, filters?: { date_from?: string; date_to?: string }) => {
    try {
      const raw = db();
      let dateFilter = '';
      const params: any[] = [];

      if (filters?.date_from) { dateFilter += ' AND je.date >= ?'; params.push(filters.date_from); }
      if (filters?.date_to) { dateFilter += ' AND je.date <= ?'; params.push(filters.date_to); }

      // تدفقات نقدية من العمليات التشغيلية
      const cashFromSales: any = raw.prepare(`
        SELECT COALESCE(SUM(jel.debit), 0) as val
        FROM journal_entry_lines jel
        JOIN journal_entries je ON jel.entry_id = je.id
        JOIN accounts a ON jel.account_id = a.id
        WHERE a.code = '1100' AND je.status = 'posted' AND je.reference_type IN ('sales_invoice', 'payment') ${dateFilter}
      `).get(...params);

      const cashToPurchases: any = raw.prepare(`
        SELECT COALESCE(SUM(jel.credit), 0) as val
        FROM journal_entry_lines jel
        JOIN journal_entries je ON jel.entry_id = je.id
        JOIN accounts a ON jel.account_id = a.id
        WHERE a.code = '1100' AND je.status = 'posted' AND je.reference_type IN ('purchase_invoice', 'payment') AND jel.credit > 0 ${dateFilter}
      `).get(...params);

      const cashToExpenses: any = raw.prepare(`
        SELECT COALESCE(SUM(jel.credit), 0) as val
        FROM journal_entry_lines jel
        JOIN journal_entries je ON jel.entry_id = je.id
        JOIN accounts a ON jel.account_id = a.id
        WHERE a.code = '1100' AND je.status = 'posted' AND je.reference_type = 'expense' ${dateFilter}
      `).get(...params);

      // الرصيد الافتتاحي والختامي
      let openingCash = 0;
      if (filters?.date_from) {
        const ob: any = raw.prepare(`
          SELECT COALESCE(SUM(jel.debit - jel.credit), 0) as val
          FROM journal_entry_lines jel
          JOIN journal_entries je ON jel.entry_id = je.id
          JOIN accounts a ON jel.account_id = a.id
          WHERE a.code = '1100' AND je.status = 'posted' AND je.date < ?
        `).get(filters.date_from);
        openingCash = ob.val || 0;
      }

      const netOperating = (cashFromSales.val || 0) - (cashToPurchases.val || 0) - (cashToExpenses.val || 0);

      const dailyFlows = raw.prepare(`
        SELECT 
          je.date,
          SUM(CASE WHEN je.reference_type IN ('sales_invoice', 'payment') THEN jel.debit ELSE 0 END) as inflow,
          SUM(CASE WHEN (je.reference_type IN ('purchase_invoice', 'payment') AND jel.credit > 0) OR je.reference_type = 'expense' THEN jel.credit ELSE 0 END) as outflow
        FROM journal_entry_lines jel
        JOIN journal_entries je ON jel.entry_id = je.id
        JOIN accounts a ON jel.account_id = a.id
        WHERE a.code = '1100' AND je.status = 'posted' ${dateFilter}
        GROUP BY je.date
        ORDER BY je.date ASC
      `).all(...params);

      return {
        success: true,
        data: {
          opening_cash: openingCash,
          operating: {
            cash_from_sales: cashFromSales.val || 0,
            cash_to_purchases: cashToPurchases.val || 0,
            cash_to_expenses: cashToExpenses.val || 0,
            net: netOperating
          },
          closing_cash: openingCash + netOperating,
          dailyFlows: dailyFlows || []
        }
      };
    } catch (e: any) { return { success: false, error: e.message }; }
  });

  /** تقرير أعمار الديون (Aging Report) */
  ipcMain.handle('accounting:getAgingReport', async (_e, partyType: 'customer' | 'supplier', thresholds?: { days1?: number; days2?: number; days3?: number }) => {
    try {
      const raw = db();
      AccountingEngine._initAccounts(raw);
      const accountId = partyType === 'customer' ? AccountingEngine.ACCOUNTS.AR : AccountingEngine.ACCOUNTS.AP;
      const balanceExpr = partyType === 'customer' ? 'jel.debit - jel.credit' : 'jel.credit - jel.debit';

      const days1 = thresholds?.days1 ?? 30;
      const days2 = thresholds?.days2 ?? 60;
      const days3 = thresholds?.days3 ?? 90;

      const aging = raw.prepare(`
        SELECT 
          CASE jel.party_type WHEN '${partyType}' THEN jel.party_id END as party_id,
          CASE 
            WHEN '${partyType}' = 'customer' THEN c.name
            ELSE s.name
          END as party_name,
          SUM(CASE WHEN julianday('now') - julianday(je.date) <= ? THEN (${balanceExpr}) ELSE 0 END) as current_30,
          SUM(CASE WHEN julianday('now') - julianday(je.date) > ? AND julianday('now') - julianday(je.date) <= ? THEN (${balanceExpr}) ELSE 0 END) as days_31_60,
          SUM(CASE WHEN julianday('now') - julianday(je.date) > ? AND julianday('now') - julianday(je.date) <= ? THEN (${balanceExpr}) ELSE 0 END) as days_61_90,
          SUM(CASE WHEN julianday('now') - julianday(je.date) > ? THEN (${balanceExpr}) ELSE 0 END) as over_90,
          SUM(${balanceExpr}) as total,
          COALESCE((
            SELECT SUM(CASE WHEN '${partyType}' = 'customer' THEN jel2.credit - jel2.debit ELSE jel2.debit - jel2.credit END)
            FROM journal_entry_lines jel2
            JOIN journal_entries je2 ON jel2.entry_id = je2.id
            WHERE jel2.account_id = ? 
              AND jel2.party_type = jel.party_type 
              AND jel2.party_id = jel.party_id
              AND je2.reference_type IN ('debt_write_off', 'debt_write_off_reversal', 'debt_recovery_reversal')
              AND je2.status = 'posted'
          ), 0) as written_off_amount
        FROM journal_entry_lines jel
        JOIN journal_entries je ON jel.entry_id = je.id
        LEFT JOIN customers c ON jel.party_type = 'customer' AND jel.party_id = c.id
        LEFT JOIN suppliers s ON jel.party_type = 'supplier' AND jel.party_id = s.id
        WHERE jel.account_id = ? 
          AND jel.party_type = ? 
          AND je.status = 'posted'
          AND je.reference_type NOT IN ('debt_write_off', 'debt_write_off_reversal', 'debt_recovery_reversal')
        GROUP BY jel.party_id
        HAVING total > 0.01 OR written_off_amount > 0.01
        ORDER BY total DESC, written_off_amount DESC
      `).all(days1, days1, days2, days2, days3, days3, accountId, accountId, partyType) as any[];

      return { success: true, data: aging };
    } catch (e: any) { return { success: false, error: e.message }; }
  });

  /** شطب دين زبون كديون معدومة (خسائر) */
  ipcMain.handle('accounting:writeOffCustomerDebt', async (_e, data: { customerId: number, amount: number, notes?: string, _user_id?: number }) => {
    try {
      const raw = db();
      const tx = raw.transaction(() => {
        const today = new Date().toISOString().split('T')[0];
        
        // التحقق من تاريخ الإقفال
        AccountingEngine._checkClosingDate(raw, today);
        AccountingEngine._initAccounts(raw);

        // إنشاء قيد شطب دين كديون معدومة
        const entryId = AccountingEngine.createJournalEntry(raw, {
          date: today,
          description: `شطب دين كديون معدومة للزبون - ${data.notes || ''}`,
          reference_type: 'debt_write_off',
          reference_id: Date.now(),
          user_id: data._user_id || 1,
          lines: [
            { account_id: AccountingEngine.ACCOUNTS.OP_EXPENSE, debit: data.amount, credit: 0 },
            { 
              account_id: AccountingEngine.ACCOUNTS.AR, 
              debit: 0, 
              credit: data.amount, 
              party_type: 'customer', 
              party_id: data.customerId 
            }
          ]
        });

        // تحديث رصيد الزبون في قاعدة البيانات
        raw.prepare('UPDATE customers SET balance = balance - ? WHERE id = ?').run(data.amount, data.customerId);

        // تسجيل في سجل المراجعة (Audit Log)
        raw.prepare(`
          INSERT INTO audit_log (user_id, action, table_name, record_id, description, created_at)
          VALUES (?, 'debt_write_off', 'customers', ?, ?, datetime('now'))
        `).run(data._user_id || 1, data.customerId, `شطب دين كديون معدومة للزبون بمبلغ ${data.amount}`);
      });
      tx();
      return { success: true };
    } catch (e: any) { return { success: false, error: e.message }; }
  });

  /** إلغاء شطب دين زبون (إرجاع الخسائر) */
  ipcMain.handle('accounting:reverseWriteOffCustomerDebt', async (_e, data: { customerId: number, amount: number, notes?: string, _user_id?: number }) => {
    try {
      const raw = db();
      const tx = raw.transaction(() => {
        const today = new Date().toISOString().split('T')[0];
        
        // التحقق من تاريخ الإقفال
        AccountingEngine._checkClosingDate(raw, today);
        AccountingEngine._initAccounts(raw);

        // إنشاء قيد إلغاء شطب الدين كخسائر معدومة
        const entryId = AccountingEngine.createJournalEntry(raw, {
          date: today,
          description: `إلغاء شطب دين (إرجاع الخسائر) للزبون - ${data.notes || ''}`,
          reference_type: 'debt_write_off_reversal',
          reference_id: Date.now(),
          user_id: data._user_id || 1,
          lines: [
            { account_id: AccountingEngine.ACCOUNTS.AR, debit: data.amount, credit: 0, party_type: 'customer', party_id: data.customerId },
            { account_id: AccountingEngine.ACCOUNTS.OP_EXPENSE, debit: 0, credit: data.amount }
          ]
        });

        // تحديث رصيد الزبون في قاعدة البيانات بإضافة المبلغ المشطوب
        raw.prepare('UPDATE customers SET balance = balance + ? WHERE id = ?').run(data.amount, data.customerId);

        // تسجيل في سجل المراجعة (Audit Log)
        raw.prepare(`
          INSERT INTO audit_log (user_id, action, table_name, record_id, description, created_at)
          VALUES (?, 'debt_write_off_reversal', 'customers', ?, ?, datetime('now'))
        `).run(data._user_id || 1, data.customerId, `إلغاء شطب دين للزبون بمبلغ ${data.amount}`);
      });
      tx();
      return { success: true };
    } catch (e: any) { return { success: false, error: e.message }; }
  });

  /** ربحية المنتجات والتصنيفات (Product and Category Profitability Analysis) */
  ipcMain.handle('accounting:getProductProfitability', async (_e, filters?: { date_from?: string; date_to?: string }) => {
    try {
      const raw = db();
      let dateFilter = '';
      const params: any[] = [];

      if (filters?.date_from) { dateFilter += ' AND si.date >= ?'; params.push(filters.date_from); }
      if (filters?.date_to) { dateFilter += ' AND si.date <= ?'; params.push(filters.date_to); }

      const productProfits = raw.prepare(`
        SELECT 
          p.id as product_id,
          p.name as product_name,
          COALESCE(c.name, 'غير مصنف') as category_name,
          SUM(sii.quantity) as quantity_sold,
          SUM(sii.total) as total_revenue,
          SUM(sii.quantity * sii.cost_price_snapshot) as total_cost,
          SUM(sii.total - (sii.quantity * sii.cost_price_snapshot)) as net_profit
        FROM sales_invoice_items sii
        JOIN sales_invoices si ON sii.invoice_id = si.id
        JOIN products p ON sii.product_id = p.id
        LEFT JOIN categories c ON p.category_id = c.id
        WHERE si.status = 'confirmed' ${dateFilter}
        GROUP BY p.id
        ORDER BY net_profit DESC
      `).all(...params) as any[];

      const categoryProfits = raw.prepare(`
        SELECT 
          c.id as category_id,
          c.name as category_name,
          SUM(sii.quantity) as items_sold,
          SUM(sii.total) as total_revenue,
          SUM(sii.quantity * sii.cost_price_snapshot) as total_cost,
          SUM(sii.total - (sii.quantity * sii.cost_price_snapshot)) as net_profit
        FROM sales_invoice_items sii
        JOIN sales_invoices si ON sii.invoice_id = si.id
        JOIN products p ON sii.product_id = p.id
        JOIN categories c ON p.category_id = c.id
        WHERE si.status = 'confirmed' ${dateFilter}
        GROUP BY c.id
        ORDER BY net_profit DESC
      `).all(...params) as any[];

      return {
        success: true,
        data: {
          productProfits,
          categoryProfits
        }
      };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

  /** تفاصيل قيد يومية محدد (Journal Entry Details) */
  ipcMain.handle('accounting:getJournalEntry', async (_e, entryId: number) => {
    try {
      const raw = db();
      
      const entry: any = raw.prepare(`
        SELECT id, entry_number, date, description, status, reference_type, reference_id, user_id, created_at 
        FROM journal_entries 
        WHERE id = ?
      `).get(entryId);

      if (!entry) return { success: false, error: 'القيد غير موجود' };

      const lines = raw.prepare(`
        SELECT jel.*, a.name as account_name, a.code as account_code 
        FROM journal_entry_lines jel 
        JOIN accounts a ON jel.account_id = a.id 
        WHERE jel.entry_id = ?
        ORDER BY jel.debit DESC
      `).all(entryId);

      return { success: true, data: { ...entry, lines } };
    } catch (e: any) { return { success: false, error: e.message }; }
  });

  /** النظرة المالية الشاملة (Financial Overview) */
  ipcMain.handle('accounting:getFinancialOverview', async (_e, filters: { date_from: string, date_to: string }) => {
    try {
      const raw = db();
      
      // 1. Current Cash Balance (رصيد الصندوق الحالي - رصيد حساب 1100 الصندوق)
      const cashObj: any = raw.prepare(`
        SELECT COALESCE(SUM(jel.debit - jel.credit), 0) as bal 
        FROM journal_entry_lines jel 
        JOIN journal_entries je ON jel.entry_id = je.id 
        JOIN accounts a ON jel.account_id = a.id
        WHERE a.code = '1100' AND je.status = 'posted' AND je.date <= ?
      `).get(filters.date_to);
      const currentCash = cashObj?.bal || 0;

      // 2. Inventory Value (قيمة المخزون الحالية من جدول المنتجات والمخزون مباشرة)
      const invObj: any = raw.prepare(`
        SELECT COALESCE(SUM(p.purchase_price * sb.quantity), 0) as bal
        FROM products p
        JOIN (
          SELECT product_id, SUM(quantity) as quantity
          FROM stock_balances
          GROUP BY product_id
        ) sb ON p.id = sb.product_id
        WHERE p.is_active = 1
      `).get();
      const inventoryValue = invObj?.bal || 0;

      // 3. Receivables (ديون الزبائن - رصيد حساب 1300)
      const arObj: any = raw.prepare(`
        SELECT COALESCE(SUM(jel.debit - jel.credit), 0) as bal 
        FROM journal_entry_lines jel 
        JOIN journal_entries je ON jel.entry_id = je.id 
        JOIN accounts a ON jel.account_id = a.id
        WHERE a.code = '1300' AND je.status = 'posted' AND je.date <= ?
      `).get(filters.date_to);
      const receivables = arObj?.bal || 0;

      // 4. Payables (ديون الموردين - حساب 2100 دائن، الرصيد الطبيعي دائن)
      const apObj: any = raw.prepare(`
        SELECT COALESCE(SUM(jel.credit - jel.debit), 0) as bal 
        FROM journal_entry_lines jel 
        JOIN journal_entries je ON jel.entry_id = je.id 
        JOIN accounts a ON jel.account_id = a.id
        WHERE a.code = '2100' AND je.status = 'posted' AND je.date <= ?
      `).get(filters.date_to);
      const payables = apObj?.bal || 0;

      // 5. Total Sales in period (إجمالي المبيعات للفترة - حساب 4100)
      const salesObj: any = raw.prepare(`
        SELECT COALESCE(SUM(jel.credit - jel.debit), 0) as bal 
        FROM journal_entry_lines jel 
        JOIN journal_entries je ON jel.entry_id = je.id 
        JOIN accounts a ON jel.account_id = a.id
        WHERE a.code = '4100' AND je.status = 'posted' AND je.date >= ? AND je.date <= ?
      `).get(filters.date_from, filters.date_to);
      const periodSales = salesObj?.bal || 0;

      // 6. Net Profit in period (الإيرادات - المصروفات وتكلفة البضاعة)
      const pnlObj: any = raw.prepare(`
        SELECT 
          COALESCE(SUM(CASE WHEN a.type = 'revenue' THEN jel.credit - jel.debit ELSE 0 END), 0) as rev,
          COALESCE(SUM(CASE WHEN a.type = 'expense' THEN jel.debit - jel.credit ELSE 0 END), 0) as exp
        FROM journal_entry_lines jel 
        JOIN journal_entries je ON jel.entry_id = je.id 
        JOIN accounts a ON jel.account_id = a.id
        WHERE je.status = 'posted' AND je.date >= ? AND je.date <= ?
      `).get(filters.date_from, filters.date_to);
      const periodProfit = (pnlObj?.rev || 0) - (pnlObj?.exp || 0);

      // 7. Total Expenses in period (المصروفات التشغيلية بدون تكلفة البضاعة)
      const expObj: any = raw.prepare(`
        SELECT COALESCE(SUM(jel.debit - jel.credit), 0) as bal 
        FROM journal_entry_lines jel 
        JOIN journal_entries je ON jel.entry_id = je.id 
        JOIN accounts a ON jel.account_id = a.id
        WHERE a.type = 'expense' AND a.code NOT LIKE '51%' AND je.status = 'posted' AND je.date >= ? AND je.date <= ?
      `).get(filters.date_from, filters.date_to);
      const periodExpenses = expObj?.bal || 0;

      return {
        success: true,
        data: {
          currentCash,
          inventoryValue,
          receivables,
          payables,
          periodSales,
          periodProfit,
          periodExpenses
        }
      };
    } catch (e: any) { return { success: false, error: e.message }; }
  });

  /** التقرير الموحد المبسط والمنحنى المالي - يدعم فلترة الفترة الزمنية */
  ipcMain.handle('accounting:getSimpleReports', async (_e, period?: string) => {
    try {
      const raw = db();
      const today = new Date().toISOString().split('T')[0];

      // تحديد نطاق التاريخ حسب الفترة المختارة
      const periodDays = period === 'year' ? 364 : period === 'week' ? 6 : 29;
      const sqlDateOffset = `-${periodDays} days`;

      // 1. رصيد الصندوق الحالي (كود 1100) — رصيد تراكمي دائماً
      const cashObj: any = raw.prepare(`
        SELECT COALESCE(SUM(jel.debit - jel.credit), 0) as bal 
        FROM journal_entry_lines jel 
        JOIN journal_entries je ON jel.entry_id = je.id 
        JOIN accounts a ON jel.account_id = a.id
        WHERE a.code = '1100' AND je.status = 'posted'
      `).get();
      const cashBalance = cashObj?.bal || 0;

      // 2. قيمة المخزون الحالي من جدول المنتجات والمخزون مباشرة
      const invObj: any = raw.prepare(`
        SELECT COALESCE(SUM(p.purchase_price * sb.quantity), 0) as val
        FROM products p
        JOIN (
          SELECT product_id, SUM(quantity) as quantity
          FROM stock_balances
          GROUP BY product_id
        ) sb ON p.id = sb.product_id
        WHERE p.is_active = 1
      `).get();
      const inventoryValue = invObj?.val || 0;

      // 3. ديون الزبائن (كود 1300) — رصيد تراكمي من جدول الزبائن مباشرة
      const arObj: any = raw.prepare(`
        SELECT COALESCE(SUM(balance), 0) as bal FROM customers
      `).get();
      const receivables = arObj?.bal || 0;

      // 4. ديون الموردين (كود 2100) — رصيد تراكمي من جدول الموردين مباشرة
      const apObj: any = raw.prepare(`
        SELECT COALESCE(SUM(balance), 0) as bal FROM suppliers
      `).get();
      const payables = apObj?.bal || 0;

      // 5. صافي الربح للفترة المحددة
      const pnlObj: any = raw.prepare(`
        SELECT 
          COALESCE(SUM(CASE WHEN a.type = 'revenue' THEN jel.credit - jel.debit ELSE 0 END), 0) as rev,
          COALESCE(SUM(CASE WHEN a.type = 'expense' THEN jel.debit - jel.credit ELSE 0 END), 0) as exp
        FROM journal_entry_lines jel 
        JOIN journal_entries je ON jel.entry_id = je.id 
        JOIN accounts a ON jel.account_id = a.id
        WHERE je.status = 'posted' AND je.date >= date('now', ?)
      `).get(sqlDateOffset);
      const netProfit = (pnlObj?.rev || 0) - (pnlObj?.exp || 0);

      // 6. إجمالي المصروفات للفترة المحددة (بدون تكلفة البضاعة)
      const expObj: any = raw.prepare(`
        SELECT COALESCE(SUM(jel.debit - jel.credit), 0) as bal 
        FROM journal_entry_lines jel 
        JOIN journal_entries je ON jel.entry_id = je.id 
        JOIN accounts a ON jel.account_id = a.id
        WHERE a.type = 'expense' AND a.code NOT LIKE '51%' AND je.status = 'posted' AND je.date >= date('now', ?)
      `).get(sqlDateOffset);
      const expenses = expObj?.bal || 0;

      // 7. إجمالي المبيعات للفترة المحددة
      const totalSalesObj: any = raw.prepare(`
        SELECT COALESCE(SUM(total), 0) as val
        FROM sales_invoices
        WHERE status = 'confirmed' AND date >= date('now', ?)
      `).get(sqlDateOffset);
      const totalSales = totalSalesObj?.val || 0;

      // 8. أرباح اليوم
      const todayProfitObj: any = raw.prepare(`
        SELECT COALESCE(SUM(
          si.total - (si.quantity * si.cost_price_snapshot)
        ), 0) as profit
        FROM sales_invoice_items si
        JOIN sales_invoices s ON si.invoice_id = s.id
        WHERE s.date = ? AND s.status = 'confirmed'
      `).get(today);
      const todayProfit = todayProfitObj?.profit || 0;

      // 9. أفضل المنتجات مبيعاً للفترة المحددة
      const bestLimit = period === 'year' ? 5 : 3;
      const bestSellers = raw.prepare(`
        SELECT 
          p.name,
          SUM(si.quantity) as quantity_sold
        FROM sales_invoice_items si
        JOIN sales_invoices s ON si.invoice_id = s.id
        JOIN products p ON si.product_id = p.id
        WHERE s.status = 'confirmed' AND s.date >= date('now', ?)
        GROUP BY si.product_id
        ORDER BY quantity_sold DESC
        LIMIT ?
      `).all(sqlDateOffset, bestLimit) as any[];

      // 10. منحنى المبيعات حسب الفترة المختارة
      let salesTrend: any[];
      if (period === 'year') {
        // تجميع شهري لآخر 12 شهرًا
        salesTrend = raw.prepare(`
          SELECT 
            strftime('%Y-%m', date) as date,
            COALESCE(SUM(total), 0) as total_sales
          FROM sales_invoices
          WHERE date >= date('now', '-11 months', 'start of month') AND status = 'confirmed'
          GROUP BY strftime('%Y-%m', date)
          ORDER BY date ASC
        `).all() as any[];
      } else if (period === 'week') {
        // يومي لآخر 7 أيام
        salesTrend = raw.prepare(`
          SELECT 
            date,
            COALESCE(SUM(total), 0) as total_sales
          FROM sales_invoices
          WHERE date >= date('now', '-6 days') AND status = 'confirmed'
          GROUP BY date
          ORDER BY date ASC
        `).all() as any[];
      } else {
        // يومي لآخر 30 يومًا
        salesTrend = raw.prepare(`
          SELECT 
            date,
            COALESCE(SUM(total), 0) as total_sales
          FROM sales_invoices
          WHERE date >= date('now', '-29 days') AND status = 'confirmed'
          GROUP BY date
          ORDER BY date ASC
        `).all() as any[];
      }

      return {
        success: true,
        data: {
          cashBalance,
          inventoryValue,
          receivables,
          payables,
          netProfit,
          expenses,
          totalSales,
          todayProfit,
          bestSellers,
          salesTrend
        }
      };
    } catch (e: any) {
      console.error('[Accounting IPC] getSimpleReports error:', e);
      return { success: false, error: e.message };
    }
  });

  /** قائمة الحسابات (شجرة الحسابات) */
  ipcMain.handle('accounting:getChartOfAccounts', async () => {
    try {
      const raw = db();
      const accounts = raw.prepare(`
        SELECT a.*, 
          COALESCE((SELECT SUM(jel.debit - jel.credit) FROM journal_entry_lines jel 
          JOIN journal_entries je ON jel.entry_id = je.id WHERE jel.account_id = a.id AND je.status = 'posted'), 0) as balance
        FROM accounts a ORDER BY a.code ASC
      `).all();
      return { success: true, data: accounts };
    } catch (e: any) { return { success: false, error: e.message }; }
  });

  // ══════════════════════════════════════════════════════════════════
  //  4. PERMISSIONS CHECK (فحص الصلاحيات المحاسبية)
  // ══════════════════════════════════════════════════════════════════

  ipcMain.handle('accounting:checkPermission', async (_e, _oldUserId: number, permission: string) => {
    try {
      const session = await AuthService.checkSession();
      if (!session.success) return { success: false, error: 'غير مصرح' };
      const userId = session.user.id;

      const raw = db();
      const user: any = raw.prepare(`SELECT role, permissions FROM users WHERE id = ? AND is_active = 1`).get(userId);
      if (!user) return { success: false, error: 'المستخدم غير موجود' };

      // Check if user has custom permissions
      if (user.permissions) {
        try {
          const customPerms = JSON.parse(user.permissions);
          if (Array.isArray(customPerms)) {
            return { success: true, data: { allowed: customPerms.includes(permission), role: user.role } };
          }
        } catch (err) {
          console.error('[Accounting IPC] Failed to parse custom permissions:', err);
        }
      }

      // مصفوفة الصلاحيات
      const PERMISSIONS: Record<string, string[]> = {
        'view_reports':      ['owner', 'manager', 'accountant'],
        'view_ledger':       ['owner', 'manager', 'accountant'],
        'view_trial_balance': ['owner', 'manager', 'accountant'],
        'view_balance_sheet': ['owner', 'manager', 'accountant'],
        'view_cash_flow':    ['owner', 'manager', 'accountant'],
        'reverse_entry':     ['owner', 'manager'],
        'lock_period':       ['owner', 'manager'],
        'unlock_period':     ['owner'],
        'year_close':        ['owner'],
        'delete_entry':      [],  // ممنوع على الجميع
        'edit_posted_entry': [],  // ممنوع على الجميع
        'manage_users':      ['owner', 'manager'],
        'view_audit_log':    ['owner', 'manager'],
        'manage_cashbox':    ['owner', 'manager', 'cashier'],
        'create_invoice':    ['owner', 'manager', 'accountant', 'cashier'],
        'cancel_invoice':    ['owner', 'manager'],
      };

      const allowedRoles = PERMISSIONS[permission] || [];
      const allowed = allowedRoles.includes(user.role);

      return { success: true, data: { allowed, role: user.role } };
    } catch (e: any) { return { success: false, error: e.message }; }
  });

  console.log('[IPC] Accounting handlers registered (closing, audit, reports, permissions)');
}
