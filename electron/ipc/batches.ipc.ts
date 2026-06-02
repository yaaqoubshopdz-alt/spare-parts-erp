/**
 * Batches IPC — معالجة تواريخ الصلاحية والدفعات للمنتجات
 */
import { ipcMain } from 'electron';
import { DatabaseService } from '../services/database.service';

export function registerBatchesIPC() {
  const db = () => DatabaseService.getRawDb();

  // الحصول على كل الدفعات المرتبطة بمنتج معين
  ipcMain.handle('db:batches:getByProduct', async (_e, productId: number) => {
    try {
      const batches = db().prepare(`
        SELECT * FROM product_batches 
        WHERE product_id = ? AND quantity > 0
        ORDER BY expiry_date ASC
      `).all(productId);
      return { success: true, data: batches };
    } catch (e: any) { return { success: false, error: e.message }; }
  });

  // الحصول على المنتجات القريبة من انتهاء الصلاحية
  ipcMain.handle('db:batches:getExpiring', async (_e, days: number = 30) => {
    try {
      const batches = db().prepare(`
        SELECT b.*, p.name as product_name, p.barcode 
        FROM product_batches b
        LEFT JOIN products p ON b.product_id = p.id
        WHERE b.quantity > 0 AND b.expiry_date IS NOT NULL 
        AND b.expiry_date <= date('now', '+${days} days')
        ORDER BY b.expiry_date ASC
      `).all();
      return { success: true, data: batches };
    } catch (e: any) { return { success: false, error: e.message }; }
  });

  console.log('[IPC] Batches handlers registered');
}
