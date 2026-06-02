/**
 * Reports IPC — استخراج الإحصائيات، الأرباح، وتقييم المخزون
 * يستخدم purchase_price بدل cost_price و retail_price بدل price
 */
import { ipcMain } from 'electron';
import { DatabaseService } from '../services/database.service';

export function registerReportsIPC() {
  const db = () => DatabaseService.getRawDb();

  // ── تقرير الأرباح والخسائر (Income Statement) بناءً على المحرك المحاسبي ────────
  ipcMain.handle('db:reports:getProfitLoss', async (_e, filters?: { date_from?: string; date_to?: string }) => {
    try {
      const raw = db();
      let dateFilter = '';
      const params: any[] = [];
      
      if (filters?.date_from && filters?.date_to) {
        dateFilter = 'AND je.date >= ? AND je.date <= ?';
        params.push(filters.date_from, filters.date_to);
      }

      // حساب إجمالي الإيرادات (Revenues)
      const revenues: any = raw.prepare(`
        SELECT SUM(jel.credit - jel.debit) as val 
        FROM journal_entry_lines jel
        JOIN journal_entries je ON jel.entry_id = je.id
        JOIN accounts a ON jel.account_id = a.id
        WHERE je.status = 'posted' AND a.type = 'revenue' ${dateFilter}
      `).get(...params);
      
      // تكلفة البضاعة المباعة (COGS)
      const cogs: any = raw.prepare(`
        SELECT SUM(jel.debit - jel.credit) as val 
        FROM journal_entry_lines jel
        JOIN journal_entries je ON jel.entry_id = je.id
        JOIN accounts a ON jel.account_id = a.id
        WHERE je.status = 'posted' AND a.code LIKE '51%' ${dateFilter}
      `).get(...params);

      // المصاريف التشغيلية (Operating Expenses)
      const expenses: any = raw.prepare(`
        SELECT SUM(jel.debit - jel.credit) as val 
        FROM journal_entry_lines jel
        JOIN journal_entries je ON jel.entry_id = je.id
        JOIN accounts a ON jel.account_id = a.id
        WHERE je.status = 'posted' AND a.type = 'expense' AND a.code NOT LIKE '51%' ${dateFilter}
      `).get(...params);

      // ديون الزبائن والموردين كـ Cache (للواجهة القديمة فقط إن طلبت)
      const customersDebts: any = raw.prepare(`SELECT SUM(balance) as val FROM customers WHERE balance > 0`).get();
      const suppliersDebts: any = raw.prepare(`SELECT SUM(balance) as val FROM suppliers WHERE balance > 0`).get();

      const totalSales = revenues.val || 0;
      const totalCOGS = cogs.val || 0;
      const totalExpenses = expenses.val || 0;
      
      const grossProfit = totalSales - totalCOGS; // إجمالي الربح
      const netProfit = grossProfit - totalExpenses; // صافي الربح

      return {
        success: true,
        data: {
          total_sales: totalSales,
          cogs: totalCOGS,
          gross_profit: grossProfit,
          total_expenses: totalExpenses,
          net_profit: netProfit,
          customers_debts: customersDebts.val || 0,
          suppliers_debts: suppliersDebts.val || 0
        }
      };
    } catch (e: any) { return { success: false, error: e.message }; }
  });

  // ── ميزان المراجعة (Trial Balance) ───────────────────────────────────────────────
  ipcMain.handle('db:reports:getTrialBalance', async (_e, filters?: { date_to?: string }) => {
    try {
      const raw = db();
      let dateFilter = '';
      const params: any[] = [];
      
      if (filters?.date_to) {
        dateFilter = 'AND je.date <= ?';
        params.push(filters.date_to);
      }

      const trialBalance = raw.prepare(`
        SELECT 
          a.code, 
          a.name, 
          a.type,
          SUM(jel.debit) as total_debit, 
          SUM(jel.credit) as total_credit,
          (SUM(jel.debit) - SUM(jel.credit)) as balance
        FROM accounts a
        JOIN journal_entry_lines jel ON a.id = jel.account_id
        JOIN journal_entries je ON jel.entry_id = je.id AND je.status = 'posted'
        WHERE 1=1 ${dateFilter}
        GROUP BY a.id, a.code, a.name, a.type
        HAVING total_debit > 0 OR total_credit > 0
        ORDER BY a.code ASC
      `).all(...params);

      // إجمالي المدين والدائن في النظام للتأكد من التوازن
      const totals: { debit: number; credit: number } = (trialBalance as any[]).reduce((acc: any, row: any) => {
        acc.debit += row.total_debit;
        acc.credit += row.total_credit;
        return acc;
      }, { debit: 0, credit: 0 }) as { debit: number; credit: number };

      return {
        success: true,
        data: {
          accounts: trialBalance,
          totals,
          is_balanced: Math.abs(totals.debit - totals.credit) < 0.01
        }
      };
    } catch (e: any) { return { success: false, error: e.message }; }
  });

  // ── تقييم المخزون (قيمة البضاعة الموجودة في المحل حالياً) ─────────────────
  ipcMain.handle('db:reports:getStockValuation', async () => {
    try {
      const raw = db();
      
      const valuation: any = raw.prepare(`
        SELECT 
          SUM(sb.quantity * p.purchase_price) as total_cost_value,
          SUM(sb.quantity * p.retail_price) as total_retail_value,
          SUM(sb.quantity) as total_items
        FROM stock_balances sb
        JOIN products p ON sb.product_id = p.id
        WHERE sb.quantity > 0 AND sb.location_id = 1
      `).get();

      return {
        success: true,
        data: {
          total_cost_value: valuation.total_cost_value || 0,     // رأس المال
          total_retail_value: valuation.total_retail_value || 0, // قيمة البيع المتوقعة
          expected_profit: (valuation.total_retail_value || 0) - (valuation.total_cost_value || 0),
          total_items: valuation.total_items || 0
        }
      };
    } catch (e: any) { return { success: false, error: e.message }; }
  });

  // ── الأستاذ العام (General Ledger) ──────────────────────────────────────────
  ipcMain.handle('db:reports:getGeneralLedger', async (_e, filters: { account_id: number; date_from?: string; date_to?: string }) => {
    try {
      const raw = db();
      let openingBalance = 0;
      
      // 1. حساب الرصيد الافتتاحي (ما قبل date_from)
      if (filters.date_from) {
        const obQuery: any = raw.prepare(`
          SELECT COALESCE(SUM(jel.debit - jel.credit), 0) as val
          FROM journal_entry_lines jel
          JOIN journal_entries je ON jel.entry_id = je.id
          WHERE jel.account_id = ? AND je.status = 'posted' AND je.date < ?
        `).get(filters.account_id, filters.date_from);
        openingBalance = obQuery.val || 0;
      }

      // 2. جلب حركة الحساب مع حساب الرصيد التراكمي (Window Function)
      let dateFilter = '';
      const params: any[] = [openingBalance, filters.account_id];
      
      if (filters.date_from) {
        dateFilter += ' AND je.date >= ?';
        params.push(filters.date_from);
      }
      if (filters.date_to) {
        dateFilter += ' AND je.date <= ?';
        params.push(filters.date_to);
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
        WHERE jel.account_id = ? AND je.status = 'posted' ${dateFilter}
        ORDER BY je.date ASC, je.id ASC
      `).all(...params);

      // جلب بيانات الحساب
      const accountInfo: any = raw.prepare('SELECT code, name, type FROM accounts WHERE id = ?').get(filters.account_id);

      return {
        success: true,
        data: {
          account: accountInfo,
          opening_balance: openingBalance,
          transactions: ledger
        }
      };
    } catch (e: any) { return { success: false, error: e.message }; }
  });

  console.log('[IPC] Reports handlers registered');
}
