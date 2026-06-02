/**
 * Expenses IPC — تسجيل وإدارة المصاريف اليومية للمؤسسة
 */
import { ipcMain } from 'electron';
import { DatabaseService } from '../services/database.service';
import { AccountingEngine } from '../services/accounting.service';
import { AuthService } from '../services/auth.service';

export function registerExpensesIPC() {
  const db = () => DatabaseService.getRawDb();

  const SORT_MAP_EXPENSES: Record<string, string> = {
    time: 'e.created_at',
    description: 'e.description',
    amount: 'e.amount',
    category: 'e.category',
    date: 'e.date',
  };

  // الحصول على قائمة المصاريف
  ipcMain.handle('db:expenses:getList', async (_e, filters?: { date?: string; category?: string; limit?: number; sortKey?: string; sortDir?: string }) => {
    try {
      let query = `
        SELECT e.*, u.full_name as created_by_name
        FROM expenses e
        LEFT JOIN users u ON e.user_id = u.id
        WHERE e.is_active = 1
      `;
      const params: any[] = [];

      if (filters?.date) {
        query += ' AND e.date = ?';
        params.push(filters.date);
      }
      if (filters?.category) {
        query += ' AND e.category = ?';
        params.push(filters.category);
      }

      const safeCol = SORT_MAP_EXPENSES[filters?.sortKey || ''] || 'e.id';
      const safeDir = filters?.sortDir === 'desc' ? 'DESC' : 'ASC';
      query += ` ORDER BY ${safeCol} ${safeDir} LIMIT ?`;
      params.push(filters?.limit || 100);

      const expenses = db().prepare(query).all(...params);
      return { success: true, data: expenses };
    } catch (e: any) { return { success: false, error: e.message }; }
  });

  // إضافة مصروف جديد
  ipcMain.handle('db:expenses:create', async (_e, data: {
    amount: number;
    category: string;
    description?: string;
    _user_id: number;
  }) => {
    try {
      const session = await AuthService.checkSession();
      if (!session.success) return { success: false, error: 'غير مصرح' };
      const userId = session.user.id;

      const raw = db();
      const tx = raw.transaction(() => {
      // 1. إدخال المصروف
      const expenseNumber = `EXP-${Date.now()}`;
      const res = raw.prepare(`
        INSERT INTO expenses (
          expense_number, amount, category, description, date, 
          user_id, created_at, is_active
        ) VALUES (?, ?, ?, ?, date('now'), ?, datetime('now'), 1)
      `).run(expenseNumber, data.amount, data.category, data.description || null, userId);
      
      const expenseId = res.lastInsertRowid;

      // خصم المبلغ من الصندوق
      raw.prepare('UPDATE cash_boxes SET current_balance = current_balance - ? WHERE id = 1').run(data.amount);

      // المحرك المحاسبي
      AccountingEngine.recordExpense(raw, {
        id: expenseId,
        amount: data.amount,
        title: data.category,
        notes: data.description || null,
        date: new Date().toISOString().split('T')[0]
      }, userId);

      return expenseId;
    });

      const id = tx();
      return { success: true, id };
    } catch (e: any) { return { success: false, error: e.message }; }
  });

  // حذف مصروف
  ipcMain.handle('db:expenses:delete', async (_e, id: number) => {
    try {
      const session = await AuthService.checkSession();
      if (!session.success) return { success: false, error: 'غير مصرح' };
      const userId = session.user.id;

      const raw = db();
      const tx = raw.transaction(() => {
      const expense: any = raw.prepare('SELECT * FROM expenses WHERE id = ?').get(id);
      if (!expense) throw new Error('المصروف غير موجود');

      // فحص الإقفال المالي — منع إلغاء مصاريف في فترة مقفلة
      AccountingEngine._checkClosingDate(raw, expense.date);

      // 1. استرجاع المبلغ للصندوق
      raw.prepare('UPDATE cash_boxes SET current_balance = current_balance + ? WHERE id = 1').run(expense.amount);

      // المحرك المحاسبي (قيد عكسي)
      AccountingEngine.reverseEntry(raw, 'expense', id, userId, 'إلغاء مصروف');

      // 2. تحديث المصروف ليكون محذوفاً بدلاً من حذفه نهائياً
      raw.prepare('UPDATE expenses SET is_active = 0, notes = COALESCE(notes, "") || " [تم الإلغاء]" WHERE id = ?').run(id);

      return true;
    });

      tx();
      return { success: true };
    } catch (e: any) { return { success: false, error: e.message }; }
  });

  console.log('[IPC] Expenses handlers registered');
}
