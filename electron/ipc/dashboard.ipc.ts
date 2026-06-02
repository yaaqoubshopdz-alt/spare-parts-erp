/**
 * Dashboard IPC — بيانات حقيقية للوحة التحكم
 */
import { ipcMain } from 'electron';
import { DatabaseService } from '../services/database.service';

export function registerDashboardIPC() {
  const db = () => DatabaseService.getRawDb();

  // ── Dashboard Summary ──────────────────────────────────────
  ipcMain.handle('db:dashboard:summary', async () => {
    try {
      const raw = db();
      const today = new Date().toISOString().split('T')[0];

      // Today's sales
      const todaySales: any = raw.prepare(`
        SELECT COUNT(*) as count, COALESCE(SUM(total), 0) as total
        FROM sales_invoices
        WHERE date = ? AND status = 'confirmed'
      `).get(today);

      // Today's purchases
      const todayPurchases: any = raw.prepare(`
        SELECT COUNT(*) as count, COALESCE(SUM(total), 0) as total
        FROM purchase_invoices
        WHERE date = ? AND status = 'confirmed'
      `).get(today);

      // Total products
      const totalProducts: any = raw.prepare(
        'SELECT COUNT(*) as count FROM products WHERE is_active = 1'
      ).get();

      // Low stock products
      const lowStock: any = raw.prepare(`
        SELECT COUNT(*) as count
        FROM products p
        LEFT JOIN (
          SELECT product_id, SUM(quantity) as qty
          FROM stock_balances GROUP BY product_id
        ) sb ON p.id = sb.product_id
        WHERE p.is_active = 1 AND COALESCE(sb.qty, 0) <= p.min_stock_level AND p.min_stock_level > 0
      `).get();

      // Expiring batches (next 30 days)
      const expiringBatches: any = raw.prepare(`
        SELECT COUNT(*) as count
        FROM product_batches
        WHERE status = 'open'
          AND expiry_date IS NOT NULL
          AND expiry_date <= date('now', '+30 days')
          AND expiry_date >= date('now')
      `).get();

      // Total customers with debt
      const customersDebt: any = raw.prepare(`
        SELECT COUNT(*) as count, COALESCE(SUM(balance), 0) as total
        FROM customers WHERE balance > 0 AND is_active = 1
      `).get();

      // Total supplier debt
      const supplierDebt: any = raw.prepare(`
        SELECT COALESCE(SUM(balance), 0) as total
        FROM suppliers WHERE balance > 0 AND is_active = 1
      `).get();

      // Cash box balance
      const cashBalance: any = raw.prepare(
        'SELECT COALESCE(SUM(current_balance), 0) as total FROM cash_boxes WHERE is_active = 1'
      ).get();

      // Today's profit estimate
      const todayProfit: any = raw.prepare(`
        SELECT COALESCE(SUM(
          si.quantity * (si.unit_price - si.cost_price_snapshot)
        ), 0) as profit
        FROM sales_invoice_items si
        JOIN sales_invoices s ON si.invoice_id = s.id
        WHERE s.date = ? AND s.status = 'confirmed'
      `).get(today);

      return {
        success: true,
        data: {
          todaySalesCount: todaySales.count,
          todaySalesTotal: todaySales.total,
          todayPurchasesCount: todayPurchases.count,
          todayPurchasesTotal: todayPurchases.total,
          totalProducts: totalProducts.count,
          lowStockCount: lowStock.count,
          expiringBatchesCount: expiringBatches.count,
          customersDebtCount: customersDebt.count,
          customersDebtTotal: customersDebt.total,
          supplierDebtTotal: supplierDebt.total,
          cashBalance: cashBalance.total,
          todayProfit: todayProfit.profit,
        },
      };
    } catch (error: any) {
      console.error('[Dashboard IPC] summary error:', error);
      return { success: false, error: error.message };
    }
  });

  // ── Low Stock Products List ────────────────────────────────
  ipcMain.handle('db:dashboard:lowStock', async () => {
    try {
      const raw = db();
      const products = raw.prepare(`
        SELECT p.id, p.name, p.barcode, p.min_stock_level,
               COALESCE(sb.qty, 0) as current_stock,
               COALESCE(c.name, 'بدون تصنيف') as category_name
        FROM products p
        LEFT JOIN (
          SELECT product_id, SUM(quantity) as qty
          FROM stock_balances GROUP BY product_id
        ) sb ON p.id = sb.product_id
        LEFT JOIN categories c ON p.category_id = c.id
        WHERE p.is_active = 1 AND COALESCE(sb.qty, 0) <= p.min_stock_level AND p.min_stock_level > 0
        ORDER BY COALESCE(sb.qty, 0) ASC
        LIMIT 50
      `).all();
      return { success: true, data: products };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  // ── Today's Invoices ───────────────────────────────────────
  ipcMain.handle('db:dashboard:todayInvoices', async () => {
    try {
      const raw = db();
      const invoices = raw.prepare(`
        SELECT s.id, s.invoice_number, s.sale_type, s.total, s.status, s.time, s.date,
               s.paid as paid, s.remaining as remaining_amount,
               c.name as customer_name
        FROM sales_invoices s
        LEFT JOIN customers c ON s.customer_id = c.id
        ORDER BY s.id DESC
        LIMIT 30
      `).all();
      return { success: true, data: invoices };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  // ── Expiring Batches ───────────────────────────────────────
  ipcMain.handle('db:dashboard:expiringBatches', async () => {
    try {
      const raw = db();
      const batches = raw.prepare(`
        SELECT pb.id, pb.batch_number, pb.expiry_date, pb.quantity_remaining,
               p.name as product_name, p.barcode
        FROM product_batches pb
        JOIN products p ON pb.product_id = p.id
        WHERE pb.status = 'open'
          AND pb.expiry_date IS NOT NULL
          AND pb.expiry_date <= date('now', '+30 days')
        ORDER BY pb.expiry_date ASC
        LIMIT 20
      `).all();
      return { success: true, data: batches };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  // ── Recent Low Stock (last 24h) ────────────────────────────
  ipcMain.handle('db:dashboard:getRecentLowStock', async () => {
    try {
      const raw = db();
      const products = raw.prepare(`
        SELECT p.id, p.name, p.barcode,
               p.min_stock_level,
               COALESCE(sb.qty, 0) as current_stock,
               (p.min_stock_level - COALESCE(sb.qty, 0)) as shortage,
               COALESCE(c.name, 'بدون تصنيف') as category_name,
               p.updated_at
        FROM products p
        LEFT JOIN (
          SELECT product_id, SUM(quantity) as qty
          FROM stock_balances GROUP BY product_id
        ) sb ON p.id = sb.product_id
        LEFT JOIN categories c ON p.category_id = c.id
        WHERE p.is_active = 1
          AND COALESCE(sb.qty, 0) <= p.min_stock_level
          AND p.min_stock_level > 0
          AND p.is_low_stock_muted = 0
          AND p.updated_at >= datetime('now', '-1 day')
        ORDER BY p.updated_at DESC
        LIMIT 20
      `).all();

      // Calculate relative time for each
      const now = new Date();
      const data = products.map((p: any) => {
        const updated = new Date(p.updated_at + 'Z');
        const diffMs = now.getTime() - updated.getTime();
        const diffMin = Math.floor(diffMs / 60000);
        let relativeTime = '';
        if (diffMin < 1) relativeTime = 'الآن';
        else if (diffMin < 60) relativeTime = `منذ ${diffMin} دقيقة`;
        else if (diffMin < 1440) relativeTime = `منذ ${Math.floor(diffMin / 60)} ساعة`;
        else relativeTime = `منذ ${Math.floor(diffMin / 1440)} يوم`;
        return { ...p, relativeTime };
      });

      return { success: true, data };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  // ── المسودات القديمة (أكثر من 24 ساعة) ──────────────────────
  ipcMain.handle('db:dashboard:staleDrafts', async () => {
    try {
      const raw = db();

      // Sales drafts older than 24h
      const salesDrafts = raw.prepare(`
        SELECT 'sales' as type, id, invoice_number, date, time, total,
               (julianday('now') - julianday(updated_at)) * 24 as hours_old
        FROM sales_invoices
        WHERE status = 'draft'
          AND updated_at <= datetime('now', '-24 hours')
        ORDER BY updated_at ASC
        LIMIT 20
      `).all();

      // Purchase drafts older than 24h
      const purchaseDrafts = raw.prepare(`
        SELECT 'purchase' as type, id, invoice_number, date, total,
               (julianday('now') - julianday(updated_at)) * 24 as hours_old
        FROM purchase_invoices
        WHERE status = 'draft'
          AND updated_at <= datetime('now', '-24 hours')
        ORDER BY updated_at ASC
        LIMIT 20
      `).all();

      const allDrafts = [...(salesDrafts as any[]), ...(purchaseDrafts as any[])]
        .sort((a: any, b: any) => b.hours_old - a.hours_old)
        .slice(0, 20);

      // Format hours_old to readable
      const data = allDrafts.map((d: any) => ({
        ...d,
        hours_old_display: d.hours_old < 48
          ? `منذ ${Math.round(d.hours_old)} ساعة`
          : `منذ ${Math.round(d.hours_old / 24)} يوم`,
      }));

      return { success: true, data, total: allDrafts.length };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  // ── Recent drafts (ALL drafts in last 24h, newest first — for notification dropdown) ──
  ipcMain.handle('db:dashboard:recentDrafts', async () => {
    try {
      const raw = db();

      const salesDrafts = raw.prepare(`
        SELECT 'sales' as type, id, invoice_number, date, time, total,
               (julianday('now') - julianday(updated_at)) * 24 as hours_old
        FROM sales_invoices
        WHERE status = 'draft'
          AND updated_at >= datetime('now', '-24 hours')
        ORDER BY updated_at DESC
        LIMIT 10
      `).all();

      const purchaseDrafts = raw.prepare(`
        SELECT 'purchase' as type, id, invoice_number, date, total,
               (julianday('now') - julianday(updated_at)) * 24 as hours_old
        FROM purchase_invoices
        WHERE status = 'draft'
          AND updated_at >= datetime('now', '-24 hours')
        ORDER BY updated_at DESC
        LIMIT 10
      `).all();

      const allDrafts = [...(salesDrafts as any[]), ...(purchaseDrafts as any[])]
        .sort((a: any, b: any) => a.hours_old - b.hours_old)
        .slice(0, 10);

      const data = allDrafts.map((d: any) => ({
        ...d,
        hours_old_display: d.hours_old < 1
          ? 'منذ لحظات'
          : d.hours_old < 48
            ? `منذ ${Math.round(d.hours_old)} ساعة`
            : `منذ ${Math.round(d.hours_old / 24)} يوم`,
      }));

      return { success: true, data, total: allDrafts.length };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  console.log('[IPC] Dashboard handlers registered');
}
