import { describe, it, expect, vi } from 'vitest';
import { DataHarvesterService, BusinessContext } from '../electron/services/data-harvester.service';

describe('DataHarvesterService toPromptText', () => {
  it('should format a rich BusinessContext to prompt text correctly', () => {
    const mockContext: BusinessContext = {
      generated_at: '2026-06-20T00:00:00.000Z',
      period_days: 90,
      shop: {
        name: 'ياقوت لقطع الغيار',
        owner: 'عيسى',
        phone: '0555555555',
        address: 'الجزائر',
      },
      financials: {
        cash_balance: 150000,
        total_customer_debt: 75000,
        total_supplier_debt: 40000,
        net_position: 185000,
        expenses_last_30_days: 12000,
        expenses_by_category: [
          { category: 'كهرباء', amount: 5000, count: 1 },
          { category: 'إيجار', amount: 7000, count: 1 },
        ],
      },
      sales: {
        total_revenue: 300000,
        total_invoices: 45,
        by_month: [
          { month: '2026-05', revenue: 160000, cost: 100000, profit: 60000, invoice_count: 25 },
          { month: '2026-06', revenue: 140000, cost: 90000, profit: 50000, invoice_count: 20 },
        ],
        top_products: [
          { name: 'مكابح أمامية Clio 4', category: 'فرامل', qty_sold: 15, revenue: 45000, profit: 15000 },
        ],
        top_customers: [
          { name: 'أحمد', total_purchased: 50000, debt: 10000, last_purchase_days_ago: 5 },
        ],
      },
      purchases: {
        total_spent: 190000,
        top_suppliers: [
          { name: 'شركة التوريد الكبرى', total_paid: 120000, pending_debt: 20000 },
        ],
      },
      inventory: {
        total_products: 120,
        total_stock_value: 850000,
        dead_stock: [
          { name: 'فلتر زيت قديم', current_stock: 10, days_since_last_sale: 75, stock_value: 8000 },
        ],
        overstocked: [
          { name: 'شمعات إشعال بوش', current_stock: 100, months_of_supply: 8, stock_value: 30000 },
        ],
        low_stock_alerts: [
          { name: 'زيت محرك 5W40', current_stock: 2, min_stock_level: 10, shortage: 8 },
        ],
      },
      debt_risks: {
        overdue_customers: [
          { name: 'أحمد', debt_amount: 10000, days_overdue: 35, last_payment_date: '2026-05-15' },
        ],
        concentration_risk_pct: 13,
      },
    };

    const promptText = DataHarvesterService.toPromptText(mockContext);

    // Verify it contains critical elements in Arabic format
    expect(promptText).toContain('ياقوت لقطع الغيار');
    expect(promptText).toContain('عيسى');
    const normalizedPrompt = promptText.replace(/\./g, ',');
    expect(normalizedPrompt).toContain('150,000 دج'); // cash balance formatted
    expect(normalizedPrompt).toContain('75,000 دج');  // customer debt formatted
    expect(normalizedPrompt).toContain('40,000 دج');  // supplier debt formatted
    expect(normalizedPrompt).toContain('185,000 دج'); // net position formatted
    expect(promptText).toContain('مكابح أمامية Clio 4');
    expect(promptText).toContain('شركة التوريد الكبرى');
    expect(promptText).toContain('فلتر زيت قديم');
    expect(promptText).toContain('زيت محرك 5W40');
  });
});
