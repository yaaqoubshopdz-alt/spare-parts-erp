/**
 * Cashbox IPC — إدارة الصناديق المالية، العمليات، وحركة الدخول والخروج النقدي
 */
import { ipcMain } from 'electron';
import { DatabaseService } from '../services/database.service';

export function registerCashboxIPC() {
  const db = () => DatabaseService.getRawDb();

  // ── الحصول على ملخص الصندوق (الحالي) ──────────────────────────────
  ipcMain.handle('db:cashbox:getSummary', async (_e, boxId: number = 1) => {
    try {
      const box = db().prepare('SELECT * FROM cash_boxes WHERE id = ?').get(boxId);
      if (!box) return { success: false, error: 'الصندوق غير موجود' };

      // جلب عمليات اليوم (التي لم تقفل بعد أو التي تمت في تاريخ اليوم)
      const today = new Date().toISOString().split('T')[0];
      const todayTotalIn: any = db().prepare(`
        SELECT SUM(amount) as total FROM payments 
        WHERE cash_box_id = ? AND direction = 'in' AND date = ?
      `).get(boxId, today);

      const todayTotalOut: any = db().prepare(`
        SELECT SUM(amount) as total FROM payments 
        WHERE cash_box_id = ? AND direction = 'out' AND date = ?
      `).get(boxId, today);

      return { 
        success: true, 
        data: {
          ...box,
          today_in: todayTotalIn.total || 0,
          today_out: todayTotalOut.total || 0,
        }
      };
    } catch (e: any) { return { success: false, error: e.message }; }
  });

  // ── الحصول على حركة الصندوق (العمليات) ────────────────────────────
  ipcMain.handle('db:cashbox:getTransactions', async (_e, filters?: { cash_box_id?: number; date?: string; limit?: number }) => {
    try {
      const boxId = filters?.cash_box_id || 1;
      const limit = filters?.limit || 100;
      let query = `
        SELECT p.*, 
               CASE 
                 WHEN p.party_type = 'customer' THEN c.name 
                 WHEN p.party_type = 'supplier' THEN s.name 
                 ELSE NULL 
               END as party_name,
               u.full_name as user_name
        FROM payments p
        LEFT JOIN customers c ON p.party_id = c.id AND p.party_type = 'customer'
        LEFT JOIN suppliers s ON p.party_id = s.id AND p.party_type = 'supplier'
        LEFT JOIN users u ON p.user_id = u.id
        WHERE p.cash_box_id = ?
      `;
      const params: any[] = [boxId];

      if (filters?.date) {
        query += ' AND p.date = ?';
        params.push(filters.date);
      }

      query += ' ORDER BY p.created_at DESC LIMIT ?';
      params.push(limit);

      const transactions = db().prepare(query).all(...params);
      return { success: true, data: transactions };
    } catch (e: any) { return { success: false, error: e.message }; }
  });

  // ── إضافة عملية يدوية للصندوق (إيداع أو سحب) ──────────────────────
  ipcMain.handle('db:cashbox:addTransaction', async (_e, data: {
    cash_box_id?: number;
    amount: number;
    direction: 'in' | 'out';
    notes: string;
    _user_id: number;
  }) => {
    const raw = db();
    const boxId = data.cash_box_id || 1;

    const tx = raw.transaction(() => {
      // 1. تسجيل العملية
      const paymentNumber = `MAN-${Date.now()}`;
      raw.prepare(`
        INSERT INTO payments (
          payment_number, party_type, type, amount, direction, payment_method,
          date, notes, cash_box_id, user_id, created_at
        ) VALUES (?, 'system', 'manual', ?, ?, 'cash', date('now'), ?, ?, ?, datetime('now'))
      `).run(paymentNumber, data.amount, data.direction, data.notes, boxId, data._user_id);

      // 2. تحديث رصيد الصندوق
      const operator = data.direction === 'in' ? '+' : '-';
      raw.prepare(`
        UPDATE cash_boxes 
        SET current_balance = current_balance ${operator} ?, updated_at = datetime('now')
        WHERE id = ?
      `).run(data.amount, boxId);

      return true;
    });

    try {
      tx();
      return { success: true };
    } catch (e: any) { return { success: false, error: e.message }; }
  });

  console.log('[IPC] Cashbox handlers registered');
}
