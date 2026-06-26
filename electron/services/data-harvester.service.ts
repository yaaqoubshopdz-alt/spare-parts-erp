/**
 * Data Harvester Service — SparePartsERP
 * يستخلص ملخصاً شاملاً لبيانات المحل من SQLite
 * ويحوّله إلى نص منظم لإرساله مع الـ System Prompt للذكاء الاصطناعي.
 *
 * الهدف: تشغيل < 500ms حتى على قواعد بيانات كبيرة (استعلامات مُجمّعة)
 */
import type { Database } from 'better-sqlite3';

// ─── Business Context Types ────────────────────────────────────────────────────

export interface ShopInfo {
  name: string;
  owner: string;
  phone: string;
  address: string;
}

export interface MonthlyStat {
  month: string;          // "2026-05"
  revenue: number;
  cost: number;
  profit: number;
  invoice_count: number;
}

export interface TopProduct {
  name: string;
  category: string;
  qty_sold: number;
  revenue: number;
  profit: number;
}

export interface TopCustomer {
  name: string;
  total_purchased: number;
  debt: number;
  last_purchase_days_ago: number;
}

export interface TopSupplier {
  name: string;
  total_paid: number;
  pending_debt: number;
}

export interface DeadStockItem {
  name: string;
  current_stock: number;
  days_since_last_sale: number;
  stock_value: number;
}

export interface OverstockedItem {
  name: string;
  current_stock: number;
  months_of_supply: number;   // كم شهر يكفي المخزون الحالي
  stock_value: number;
}

export interface LowStockAlertItem {
  name: string;
  current_stock: number;
  min_stock_level: number;
  shortage: number;
}

export interface OverdueCustomer {
  name: string;
  debt_amount: number;
  days_overdue: number;        // منذ كم يوم بدون سداد
  last_payment_date: string | null;
}

export interface ExpenseByCategory {
  category: string;
  amount: number;
  count: number;
}

export interface BusinessContext {
  generated_at: string;        // ISO timestamp
  period_days: number;         // كم يوم تغطيه البيانات

  shop: ShopInfo;

  financials: {
    cash_balance: number;
    total_customer_debt: number;
    total_supplier_debt: number;
    net_position: number;      // نقدي + مديونيات عملاء - مديونيات موردين
    expenses_last_30_days: number;
    expenses_by_category: ExpenseByCategory[];
  };

  sales: {
    total_revenue: number;
    total_invoices: number;
    by_month: MonthlyStat[];
    top_products: TopProduct[];
    top_customers: TopCustomer[];
  };

  purchases: {
    total_spent: number;
    top_suppliers: TopSupplier[];
  };

  inventory: {
    total_products: number;
    total_stock_value: number;
    dead_stock: DeadStockItem[];        // لم تُبَع منذ > 60 يوم
    overstocked: OverstockedItem[];     // مخزون يكفي > 6 أشهر
    low_stock_alerts: LowStockAlertItem[];
  };

  debt_risks: {
    overdue_customers: OverdueCustomer[];
    concentration_risk_pct: number;    // % من الديون على أعلى 3 عملاء
  };
}

// ─── DataHarvesterService ──────────────────────────────────────────────────────

export class DataHarvesterService {
  private static PERIOD_DAYS = 90;
  private static DEAD_STOCK_DAYS = 60;
  private static OVERSTOCK_MONTHS = 6;

  /**
   * الدالة الرئيسية — تجمع كل البيانات في استعلامات محسّنة
   */
  static harvest(db: Database): BusinessContext {
    const now = new Date();
    const periodStart = new Date(now);
    periodStart.setDate(periodStart.getDate() - DataHarvesterService.PERIOD_DAYS);
    const periodStartStr = periodStart.toISOString().split('T')[0];

    return {
      generated_at: now.toISOString(),
      period_days: DataHarvesterService.PERIOD_DAYS,
      shop: DataHarvesterService.getShopInfo(db),
      financials: DataHarvesterService.getFinancials(db),
      sales: DataHarvesterService.getSalesData(db, periodStartStr),
      purchases: DataHarvesterService.getPurchasesData(db, periodStartStr),
      inventory: DataHarvesterService.getInventoryData(db),
      debt_risks: DataHarvesterService.getDebtRisks(db),
    };
  }

  // ─── Shop Info ─────────────────────────────────────────────────────────────

  private static getShopInfo(db: Database): ShopInfo {
    const rows = db.prepare(`SELECT key, value FROM app_settings WHERE key IN
      ('shop_name','shop_owner','shop_phone','shop_address')`).all() as any[];
    const map: Record<string, string> = {};
    for (const r of rows) map[r.key] = r.value || '';
    return {
      name: map['shop_name'] || 'المحل',
      owner: map['shop_owner'] || '',
      phone: map['shop_phone'] || '',
      address: map['shop_address'] || '',
    };
  }

  // ─── Financials ────────────────────────────────────────────────────────────

  private static getFinancials(db: Database): BusinessContext['financials'] {
    // رصيد النقد
    const cashRow = db.prepare(
      `SELECT COALESCE(SUM(current_balance), 0) as total FROM cash_boxes`
    ).get() as any;
    const cashBalance = cashRow?.total ?? 0;

    // إجمالي ديون العملاء
    const custDebtRow = db.prepare(
      `SELECT COALESCE(SUM(balance), 0) as total FROM customers WHERE balance > 0`
    ).get() as any;
    const totalCustomerDebt = custDebtRow?.total ?? 0;

    // إجمالي ما على المحل للموردين
    const suppDebtRow = db.prepare(
      `SELECT COALESCE(SUM(balance), 0) as total FROM suppliers WHERE balance > 0`
    ).get() as any;
    const totalSupplierDebt = suppDebtRow?.total ?? 0;

    // مصاريف آخر 30 يوم
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyStart = thirtyDaysAgo.toISOString().split('T')[0];

    const expRow = db.prepare(
      `SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE date >= ?`
    ).get(thirtyStart) as any;
    const expenses30 = expRow?.total ?? 0;

    // مصاريف حسب الفئة (آخر 90 يوم)
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    const ninetyStart = ninetyDaysAgo.toISOString().split('T')[0];

    const expByCat = db.prepare(`
      SELECT COALESCE(category, 'أخرى') as category,
             SUM(amount) as amount,
             COUNT(*) as count
      FROM expenses
      WHERE date >= ?
      GROUP BY category
      ORDER BY amount DESC
      LIMIT 10
    `).all(ninetyStart) as any[];

    return {
      cash_balance: cashBalance,
      total_customer_debt: totalCustomerDebt,
      total_supplier_debt: totalSupplierDebt,
      net_position: cashBalance + totalCustomerDebt - totalSupplierDebt,
      expenses_last_30_days: expenses30,
      expenses_by_category: expByCat.map((r) => ({
        category: r.category,
        amount: r.amount,
        count: r.count,
      })),
    };
  }

  // ─── Sales Data ────────────────────────────────────────────────────────────

  private static getSalesData(db: Database, periodStart: string): BusinessContext['sales'] {
    // إجمالي المبيعات في الفترة
    const totRow = db.prepare(`
      SELECT COALESCE(SUM(total), 0) as revenue,
             COUNT(*) as invoice_count
      FROM sales_invoices
      WHERE status = 'confirmed' AND created_at >= ?
    `).get(periodStart) as any;

    // شهرياً
    const byMonth = db.prepare(`
      SELECT strftime('%Y-%m', si.created_at) as month,
             SUM(si.total) as revenue,
             SUM(COALESCE(items_cost.cost, 0)) as cost,
             SUM(si.total - COALESCE(items_cost.cost, 0)) as profit,
             COUNT(si.id) as invoice_count
      FROM sales_invoices si
      LEFT JOIN (
        SELECT invoice_id, SUM(quantity * cost_price_snapshot) as cost
        FROM sales_invoice_items
        GROUP BY invoice_id
      ) items_cost ON si.id = items_cost.invoice_id
      WHERE si.status = 'confirmed' AND si.created_at >= ?
      GROUP BY month
      ORDER BY month DESC
      LIMIT 6
    `).all(periodStart) as any[];

    // أعلى المنتجات مبيعاً
    const topProducts = db.prepare(`
      SELECT p.name,
             COALESCE(c.name, 'بدون تصنيف') as category,
             SUM(sii.quantity) as qty_sold,
             SUM(sii.total) as revenue,
             SUM(sii.total - (sii.quantity * COALESCE(sii.cost_price_snapshot, 0))) as profit
      FROM sales_invoice_items sii
      JOIN sales_invoices si ON sii.invoice_id = si.id
      JOIN products p ON sii.product_id = p.id
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE si.status = 'confirmed' AND si.created_at >= ?
      GROUP BY p.id
      ORDER BY revenue DESC
      LIMIT 10
    `).all(periodStart) as any[];

    // أعلى العملاء شراءً
    const topCustomers = db.prepare(`
      SELECT cu.name,
             SUM(si.total) as total_purchased,
             COALESCE(cu.balance, 0) as debt,
             CAST((julianday('now') - julianday(MAX(si.created_at))) AS INTEGER) as last_purchase_days_ago
      FROM sales_invoices si
      JOIN customers cu ON si.customer_id = cu.id
      WHERE si.status = 'confirmed' AND si.created_at >= ?
      GROUP BY cu.id
      ORDER BY total_purchased DESC
      LIMIT 10
    `).all(periodStart) as any[];

    return {
      total_revenue: totRow?.revenue ?? 0,
      total_invoices: totRow?.invoice_count ?? 0,
      by_month: byMonth.map((r) => ({
        month: r.month,
        revenue: r.revenue ?? 0,
        cost: r.cost ?? 0,
        profit: r.profit ?? 0,
        invoice_count: r.invoice_count ?? 0,
      })),
      top_products: topProducts.map((r) => ({
        name: r.name,
        category: r.category,
        qty_sold: r.qty_sold ?? 0,
        revenue: r.revenue ?? 0,
        profit: r.profit ?? 0,
      })),
      top_customers: topCustomers.map((r) => ({
        name: r.name,
        total_purchased: r.total_purchased ?? 0,
        debt: r.debt ?? 0,
        last_purchase_days_ago: r.last_purchase_days_ago ?? 0,
      })),
    };
  }

  // ─── Purchases Data ────────────────────────────────────────────────────────

  private static getPurchasesData(db: Database, periodStart: string): BusinessContext['purchases'] {
    const totRow = db.prepare(`
      SELECT COALESCE(SUM(total), 0) as total_spent
      FROM purchase_invoices
      WHERE status = 'confirmed' AND created_at >= ?
    `).get(periodStart) as any;

    const topSuppliers = db.prepare(`
      SELECT s.name,
             SUM(pi.total) as total_paid,
             COALESCE(s.balance, 0) as pending_debt
      FROM purchase_invoices pi
      JOIN suppliers s ON pi.supplier_id = s.id
      WHERE pi.status = 'confirmed' AND pi.created_at >= ?
      GROUP BY s.id
      ORDER BY total_paid DESC
      LIMIT 8
    `).all(periodStart) as any[];

    return {
      total_spent: totRow?.total_spent ?? 0,
      top_suppliers: topSuppliers.map((r) => ({
        name: r.name,
        total_paid: r.total_paid ?? 0,
        pending_debt: r.pending_debt ?? 0,
      })),
    };
  }

  // ─── Inventory Data ────────────────────────────────────────────────────────

  private static getInventoryData(db: Database): BusinessContext['inventory'] {
    // إجمالي المنتجات وقيمة المخزون
    const totRow = db.prepare(`
      SELECT COUNT(*) as total_products,
             COALESCE(SUM(sb.quantity * p.purchase_price), 0) as total_stock_value
      FROM products p
      LEFT JOIN stock_balances sb ON sb.product_id = p.id
      WHERE p.is_active = 1
    `).get() as any;

    // البضاعة الراكدة (لم تُبَع منذ DEAD_STOCK_DAYS يوم وفي المخزون)
    const deadStockCutoff = new Date();
    deadStockCutoff.setDate(deadStockCutoff.getDate() - DataHarvesterService.DEAD_STOCK_DAYS);
    const deadCutoffStr = deadStockCutoff.toISOString().split('T')[0];

    const deadStock = db.prepare(`
      SELECT p.name,
             COALESCE(sb.quantity, 0) as current_stock,
             CAST((julianday('now') - julianday(COALESCE(last_sale.last_date, p.created_at))) AS INTEGER) as days_since_last_sale,
             COALESCE(sb.quantity, 0) * COALESCE(p.purchase_price, 0) as stock_value
      FROM products p
      LEFT JOIN stock_balances sb ON sb.product_id = p.id
      LEFT JOIN (
        SELECT sii.product_id, MAX(si.created_at) as last_date
        FROM sales_invoice_items sii
        JOIN sales_invoices si ON sii.invoice_id = si.id
        WHERE si.status = 'confirmed'
        GROUP BY sii.product_id
      ) last_sale ON last_sale.product_id = p.id
      WHERE p.is_active = 1
        AND COALESCE(sb.quantity, 0) > 0
        AND (last_sale.last_date IS NULL OR last_sale.last_date < ?)
      ORDER BY days_since_last_sale DESC
      LIMIT 15
    `).all(deadCutoffStr) as any[];

    // المخزون الزائد (يكفي أكثر من OVERSTOCK_MONTHS شهر)
    const overstocked = db.prepare(`
      SELECT p.name,
             COALESCE(sb.quantity, 0) as current_stock,
             COALESCE(sb.quantity, 0) * COALESCE(p.purchase_price, 0) as stock_value,
             CASE
               WHEN COALESCE(monthly_avg.avg_qty, 0) > 0
               THEN CAST(COALESCE(sb.quantity, 0) / monthly_avg.avg_qty AS INTEGER)
               ELSE 999
             END as months_of_supply
      FROM products p
      LEFT JOIN stock_balances sb ON sb.product_id = p.id
      LEFT JOIN (
        SELECT sii.product_id,
               SUM(sii.quantity) / 3.0 as avg_qty  -- متوسط شهري على 3 أشهر
        FROM sales_invoice_items sii
        JOIN sales_invoices si ON sii.invoice_id = si.id
        WHERE si.status = 'confirmed'
          AND si.created_at >= date('now', '-90 days')
        GROUP BY sii.product_id
      ) monthly_avg ON monthly_avg.product_id = p.id
      WHERE p.is_active = 1
        AND COALESCE(sb.quantity, 0) > 0
        AND CASE
              WHEN COALESCE(monthly_avg.avg_qty, 0) > 0
              THEN COALESCE(sb.quantity, 0) / monthly_avg.avg_qty
              ELSE 999
            END > ?
      ORDER BY months_of_supply DESC
      LIMIT 10
    `).all(DataHarvesterService.OVERSTOCK_MONTHS) as any[];

    // تنبيهات المخزون المنخفض
    const lowStock = db.prepare(`
      SELECT p.name,
             COALESCE(sb.quantity, 0) as current_stock,
             p.min_stock_level,
             p.min_stock_level - COALESCE(sb.quantity, 0) as shortage
      FROM products p
      LEFT JOIN stock_balances sb ON sb.product_id = p.id
      WHERE p.is_active = 1
        AND p.min_stock_level > 0
        AND COALESCE(sb.quantity, 0) < p.min_stock_level
      ORDER BY shortage DESC
      LIMIT 10
    `).all() as any[];

    return {
      total_products: totRow?.total_products ?? 0,
      total_stock_value: totRow?.total_stock_value ?? 0,
      dead_stock: deadStock.map((r) => ({
        name: r.name,
        current_stock: r.current_stock,
        days_since_last_sale: r.days_since_last_sale,
        stock_value: r.stock_value,
      })),
      overstocked: overstocked.map((r) => ({
        name: r.name,
        current_stock: r.current_stock,
        months_of_supply: r.months_of_supply,
        stock_value: r.stock_value,
      })),
      low_stock_alerts: lowStock.map((r) => ({
        name: r.name,
        current_stock: r.current_stock,
        min_stock_level: r.min_stock_level,
        shortage: r.shortage,
      })),
    };
  }

  // ─── Debt Risks ────────────────────────────────────────────────────────────

  private static getDebtRisks(db: Database): BusinessContext['debt_risks'] {
    // العملاء المتأخرون في السداد (آخر دفعة منذ > 30 يوم ولديهم دين)
    const overdue = db.prepare(`
      SELECT c.name,
             c.balance as debt_amount,
             CAST((julianday('now') - julianday(COALESCE(last_pay.last_date, c.created_at))) AS INTEGER) as days_overdue,
             last_pay.last_date as last_payment_date
      FROM customers c
      LEFT JOIN (
        SELECT party_id, MAX(date) as last_date
        FROM payments
        WHERE party_type = 'customer'
        GROUP BY party_id
      ) last_pay ON last_pay.party_id = c.id
      WHERE c.balance > 0
        AND (last_pay.last_date IS NULL OR last_pay.last_date < date('now', '-30 days'))
      ORDER BY debt_amount DESC
      LIMIT 10
    `).all() as any[];

    // نسبة تركز الديون على أعلى 3 عملاء
    const totalDebtRow = db.prepare(
      `SELECT COALESCE(SUM(balance), 0) as total FROM customers WHERE balance > 0`
    ).get() as any;
    const top3DebtRow = db.prepare(`
      SELECT COALESCE(SUM(balance), 0) as top3
      FROM (SELECT balance FROM customers WHERE balance > 0 ORDER BY balance DESC LIMIT 3)
    `).get() as any;

    const totalDebt = totalDebtRow?.total ?? 0;
    const top3Debt = top3DebtRow?.top3 ?? 0;
    const concentrationPct = totalDebt > 0 ? Math.round((top3Debt / totalDebt) * 100) : 0;

    return {
      overdue_customers: overdue.map((r) => ({
        name: r.name,
        debt_amount: r.debt_amount,
        days_overdue: r.days_overdue,
        last_payment_date: r.last_payment_date,
      })),
      concentration_risk_pct: concentrationPct,
    };
  }

  // ─── Prompt Text Formatter ─────────────────────────────────────────────────

  /**
   * يحوّل BusinessContext إلى نص عربي منظم وقابل للقراءة من الـ AI
   */
  static toPromptText(ctx: BusinessContext): string {
    const fmt = (n: number) => n.toLocaleString('ar-DZ', { maximumFractionDigits: 0 }) + ' دج';

    const lines: string[] = [];

    lines.push(`=== بيانات المحل (${ctx.period_days} يوم الماضية) ===`);
    lines.push(`المحل: ${ctx.shop.name} | صاحب المحل: ${ctx.shop.owner}`);
    lines.push('');

    // المالية
    lines.push('--- الوضع المالي ---');
    lines.push(`رصيد النقد: ${fmt(ctx.financials.cash_balance)}`);
    lines.push(`إجمالي ديون العملاء (مديونيات): ${fmt(ctx.financials.total_customer_debt)}`);
    lines.push(`إجمالي ما على المحل للموردين: ${fmt(ctx.financials.total_supplier_debt)}`);
    lines.push(`الوضع المالي الصافي: ${fmt(ctx.financials.net_position)}`);
    lines.push(`المصاريف آخر 30 يوم: ${fmt(ctx.financials.expenses_last_30_days)}`);
    if (ctx.financials.expenses_by_category.length > 0) {
      lines.push('تفاصيل المصاريف:');
      ctx.financials.expenses_by_category.forEach((e) => {
        lines.push(`  - ${e.category}: ${fmt(e.amount)} (${e.count} عملية)`);
      });
    }
    lines.push('');

    // المبيعات
    lines.push('--- المبيعات ---');
    lines.push(`الإيرادات الإجمالية: ${fmt(ctx.sales.total_revenue)} | عدد الفواتير: ${ctx.sales.total_invoices}`);
    if (ctx.sales.by_month.length > 0) {
      lines.push('المبيعات الشهرية:');
      ctx.sales.by_month.forEach((m) => {
        lines.push(`  ${m.month}: إيراد ${fmt(m.revenue)} | ربح ${fmt(m.profit)} | فواتير ${m.invoice_count}`);
      });
    }
    if (ctx.sales.top_products.length > 0) {
      lines.push('أعلى المنتجات مبيعاً:');
      ctx.sales.top_products.slice(0, 5).forEach((p, i) => {
        lines.push(`  ${i + 1}. ${p.name} — ${p.qty_sold} قطعة — ${fmt(p.revenue)}`);
      });
    }
    if (ctx.sales.top_customers.length > 0) {
      lines.push('أعلى العملاء شراءً:');
      ctx.sales.top_customers.slice(0, 5).forEach((c, i) => {
        lines.push(`  ${i + 1}. ${c.name} — ${fmt(c.total_purchased)} | دين: ${fmt(c.debt)} | آخر شراء منذ ${c.last_purchase_days_ago} يوم`);
      });
    }
    lines.push('');

    // المشتريات
    lines.push('--- المشتريات من الموردين ---');
    lines.push(`إجمالي ما صُرف: ${fmt(ctx.purchases.total_spent)}`);
    if (ctx.purchases.top_suppliers.length > 0) {
      ctx.purchases.top_suppliers.slice(0, 5).forEach((s) => {
        lines.push(`  - ${s.name}: دفعنا ${fmt(s.total_paid)} | ما نزال نديهم ${fmt(s.pending_debt)}`);
      });
    }
    lines.push('');

    // المخزون
    lines.push('--- المخزون ---');
    lines.push(`إجمالي المنتجات: ${ctx.inventory.total_products} | قيمة المخزون: ${fmt(ctx.inventory.total_stock_value)}`);
    if (ctx.inventory.dead_stock.length > 0) {
      lines.push(`البضاعة الراكدة (لم تُبَع منذ > ${DataHarvesterService.DEAD_STOCK_DAYS} يوم):`);
      ctx.inventory.dead_stock.slice(0, 5).forEach((d) => {
        lines.push(`  - ${d.name}: ${d.current_stock} قطعة منذ ${d.days_since_last_sale} يوم — قيمة ${fmt(d.stock_value)}`);
      });
    }
    if (ctx.inventory.overstocked.length > 0) {
      lines.push('مخزون زائد (يكفي أكثر من 6 أشهر):');
      ctx.inventory.overstocked.slice(0, 5).forEach((o) => {
        lines.push(`  - ${o.name}: ${o.current_stock} قطعة تكفي ${o.months_of_supply} شهر — قيمة ${fmt(o.stock_value)}`);
      });
    }
    if (ctx.inventory.low_stock_alerts.length > 0) {
      lines.push('منتجات منخفضة المخزون:');
      ctx.inventory.low_stock_alerts.slice(0, 5).forEach((l) => {
        lines.push(`  - ${l.name}: ${l.current_stock} / ${l.min_stock_level} (ناقص ${l.shortage})`);
      });
    }
    lines.push('');

    // مخاطر الديون
    lines.push('--- مخاطر الديون ---');
    lines.push(`تركز الديون على أعلى 3 عملاء: ${ctx.debt_risks.concentration_risk_pct}% من الإجمالي`);
    if (ctx.debt_risks.overdue_customers.length > 0) {
      lines.push('عملاء متأخرون في السداد (> 30 يوم):');
      ctx.debt_risks.overdue_customers.slice(0, 5).forEach((o) => {
        lines.push(`  - ${o.name}: دين ${fmt(o.debt_amount)} — متأخر ${o.days_overdue} يوم (آخر دفعة: ${o.last_payment_date || 'لا يوجد'})`);
      });
    }

    return lines.join('\n');
  }
}
