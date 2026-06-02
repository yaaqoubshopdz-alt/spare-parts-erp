/**
 * Settings IPC — إدارة إعدادات النظام ومعلومات المحل للطباعة
 * يعمل مع جدول app_settings (key/value)
 */
import { ipcMain, dialog, app, BrowserWindow } from 'electron';
import { DatabaseService } from '../services/database.service';
import fs from 'fs';
import path from 'path';

export function registerSettingsIPC() {
  const db = () => DatabaseService.getRawDb();

  ipcMain.handle('db:settings:getAll', async () => {
    try {
      const settings = db().prepare('SELECT * FROM app_settings').all();
      // تحويل المصفوفة إلى كائن مفتاح/قيمة لتسهيل الاستخدام في الواجهة
      const config: Record<string, string> = {};
      for (const s of settings as any[]) {
        config[s.key] = s.value;
      }
      return { success: true, data: config };
    } catch (e: any) { return { success: false, error: e.message }; }
  });

  ipcMain.handle('db:settings:update', async (_e, data: Record<string, string>) => {
    const raw = db();
    const tx = raw.transaction(() => {
      const checkStmt = raw.prepare('SELECT count(*) as c FROM app_settings WHERE key = ?');
      const insertStmt = raw.prepare("INSERT INTO app_settings (key, value, type, updated_at) VALUES (?, ?, 'string', datetime('now'))");
      const updateStmt = raw.prepare("UPDATE app_settings SET value = ?, updated_at = datetime('now') WHERE key = ?");

      for (const [key, value] of Object.entries(data)) {
        const countRes: any = checkStmt.get(key);
        if (countRes.c > 0) {
          updateStmt.run(value, key);
        } else {
          insertStmt.run(key, value);
        }
      }
      return true;
    });

    try {
      tx();
      return { success: true };
    } catch (e: any) { return { success: false, error: e.message }; }
  });

// ── Backup & Restore Handlers ──
  ipcMain.handle('backup:create', async (event) => {
    try {
      const dbDir = path.join(app.getPath('userData'), 'SparePartsERP');
      const dbPath = path.join(dbDir, 'spare_parts.db');
      
      const win = BrowserWindow.fromWebContents(event.sender) || undefined;
      const { filePath, canceled } = await dialog.showSaveDialog(win!, {
        title: 'حفظ نسخة احتياطية',
        defaultPath: path.join(app.getPath('downloads'), `spare_parts_backup_${new Date().toISOString().split('T')[0]}.db`),
        filters: [{ name: 'SQLite Database', extensions: ['db', 'sqlite'] }]
      });

      if (canceled || !filePath) return { success: false, error: 'Canceled' };

      fs.copyFileSync(dbPath, filePath);
      return { success: true, path: filePath };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle('backup:restore', async (event) => {
    try {
      const dbDir = path.join(app.getPath('userData'), 'SparePartsERP');
      const dbPath = path.join(dbDir, 'spare_parts.db');

      const win = BrowserWindow.fromWebContents(event.sender) || undefined;
      const { filePaths, canceled } = await dialog.showOpenDialog(win!, {
        title: 'استرجاع نسخة احتياطية',
        filters: [{ name: 'SQLite Database', extensions: ['db', 'sqlite'] }],
        properties: ['openFile']
      });

      if (canceled || filePaths.length === 0) return { success: false, error: 'Canceled' };

      const selectedPath = filePaths[0];

      // Close database connection
      DatabaseService.close();

      // Copy backup over DB file
      fs.copyFileSync(selectedPath, dbPath);

      // Re-initialize database
      DatabaseService.initialize();

      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle('db:settings:uploadLogo', async (event) => {
    try {
      const win = BrowserWindow.fromWebContents(event.sender) || undefined;
      const { filePaths, canceled } = await dialog.showOpenDialog(win!, {
        title: 'اختر شعار المحل',
        filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp', 'svg'] }],
        properties: ['openFile']
      });

      if (canceled || filePaths.length === 0) return { success: false, error: 'Canceled' };

      const selectedPath = filePaths[0];
      const data = fs.readFileSync(selectedPath);
      const ext = path.extname(selectedPath).toLowerCase().replace('.', '');
      const mime = ext === 'svg' ? 'image/svg+xml' : `image/${ext === 'jpg' ? 'jpeg' : ext}`;
      const base64 = `data:${mime};base64,${data.toString('base64')}`;

      return { success: true, base64 };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle('db:settings:reset', async () => {
    const raw = db();
    const tx = raw.transaction(() => {
      // Temporarily disable foreign keys
      raw.prepare('PRAGMA foreign_keys = OFF').run();

      raw.prepare('DELETE FROM sales_invoice_items').run();
      raw.prepare('DELETE FROM sales_invoices').run();
      raw.prepare('DELETE FROM purchase_invoice_items').run();
      raw.prepare('DELETE FROM purchase_invoices').run();
      raw.prepare('DELETE FROM sales_return_items').run();
      raw.prepare('DELETE FROM sales_returns').run();
      raw.prepare('DELETE FROM purchase_return_items').run();
      raw.prepare('DELETE FROM purchase_returns').run();
      raw.prepare('DELETE FROM product_barcodes').run();
      // Keep product fitments mapped but orphan them (set product_id = NULL) to persist vehicle mappings across resets
      raw.prepare('UPDATE product_fitments SET product_id = NULL').run();
      raw.prepare('DELETE FROM product_batches').run();
      raw.prepare('DELETE FROM stock_balances').run();
      raw.prepare('DELETE FROM stock_movements').run();
      raw.prepare('DELETE FROM price_history').run();
      raw.prepare('DELETE FROM products').run();
      raw.prepare('DELETE FROM payments').run();
      raw.prepare('DELETE FROM cash_transactions').run();
      raw.prepare('DELETE FROM cash_closings').run();
      raw.prepare('DELETE FROM expenses').run();
      raw.prepare('DELETE FROM audit_log').run();
      raw.prepare('DELETE FROM backup_log').run();
      raw.prepare('DELETE FROM journal_entry_lines').run();
      raw.prepare('DELETE FROM journal_entries').run();
      raw.prepare('DELETE FROM idempotency_keys').run();
      raw.prepare('DELETE FROM inventory_count_items').run();
      raw.prepare('DELETE FROM inventory_count_sessions').run();
      raw.prepare('DELETE FROM customers').run();
      raw.prepare('DELETE FROM suppliers').run();

      // Reset sequences & balances
      raw.prepare('UPDATE cash_boxes SET current_balance = 0').run();
      raw.prepare('UPDATE number_sequences SET last_number = 0, last_date = NULL').run();

      // Re-enable foreign keys
      raw.prepare('PRAGMA foreign_keys = ON').run();
      return true;
    });

    try {
      tx();
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

  console.log('[IPC] Settings & Backup handlers registered');
}
