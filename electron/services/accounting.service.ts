import { DatabaseService } from './database.service';

/**
 * Accounting Engine Service
 */
export const AccountingEngine = {
  ACCOUNTS: {
    CASH: 2, AR: 4, INVENTORY: 5, AP: 7, REVENUE: 13, OTHER_REVENUE: 14, COGS: 16, OP_EXPENSE: 17,
  },

  _initAccounts(raw: any) {
    try {
      const cash = raw.prepare("SELECT id FROM accounts WHERE code = '1100'").get()?.id || 2;
      const ar = raw.prepare("SELECT id FROM accounts WHERE code = '1300'").get()?.id || 4;
      const inventory = raw.prepare("SELECT id FROM accounts WHERE code = '1400'").get()?.id || 5;
      const ap = raw.prepare("SELECT id FROM accounts WHERE code = '2100'").get()?.id || 7;
      const revenue = raw.prepare("SELECT id FROM accounts WHERE code = '4100'").get()?.id || 13;
      const other_revenue = raw.prepare("SELECT id FROM accounts WHERE code = '4200'").get()?.id || 14;
      const cogs = raw.prepare("SELECT id FROM accounts WHERE code = '5100'").get()?.id || 16;
      const op_expense = raw.prepare("SELECT id FROM accounts WHERE code = '5200'").get()?.id || 17;

      this.ACCOUNTS = {
        CASH: cash,
        AR: ar,
        INVENTORY: inventory,
        AP: ap,
        REVENUE: revenue,
        OTHER_REVENUE: other_revenue,
        COGS: cogs,
        OP_EXPENSE: op_expense
      };
    } catch (e) {
      console.error('[AccountingEngine] Failed to resolve account IDs from database, using defaults:', e);
    }
  },

  _generateEntryNumber(raw: any): string {
    const seq = raw.prepare(`SELECT last_number, format, prefix FROM number_sequences WHERE prefix = 'JRN'`).get();
    if (!seq) throw new Error('JRN sequence not found');
    const nextNumber = seq.last_number + 1;
    raw.prepare(`UPDATE number_sequences SET last_number = ? WHERE prefix = 'JRN'`).run(nextNumber);
    const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
    return seq.format.replace('{PREFIX}', seq.prefix).replace('{DATE}', dateStr).replace('{SEQ}', String(nextNumber).padStart(6, '0'));
  },

  _checkClosingDate(raw: any, date: string) {
    const closingDateSetting = raw.prepare(`SELECT value FROM app_settings WHERE key = 'accounting_closing_date'`).get();
    if (closingDateSetting && closingDateSetting.value && new Date(date) <= new Date(closingDateSetting.value)) {
      throw new Error(`الفترة المالية مغلقة.`);
    }
  },

  createJournalEntry(raw: any, params: any) {
    this._checkClosingDate(raw, params.date);
    const entryNumber = this._generateEntryNumber(raw);
    const headerResult = raw.prepare(`INSERT INTO journal_entries (entry_number, date, description, status, reference_type, reference_id, user_id) VALUES (?, ?, ?, 'posted', ?, ?, ?)`).run(entryNumber, params.date, params.description, params.reference_type, params.reference_id, params.user_id);
    const entryId = headerResult.lastInsertRowid;
    const insertLine = raw.prepare(`INSERT INTO journal_entry_lines (entry_id, account_id, debit, credit, cost_center_id, party_type, party_id) VALUES (?, ?, ?, ?, ?, ?, ?)`);
    for (const line of params.lines) {
      insertLine.run(entryId, line.account_id, line.debit, line.credit, line.cost_center_id || null, line.party_type || 'none', line.party_id || null);
    }
    return entryId;
  },

  updateSaleEntry(raw: any, data: { oldTotal: number, newTotal: number, invoiceId: number, date?: string, oldCogs?: number, newCogs?: number }, userId: number) {
    this._initAccounts(raw);
    
    // Delete any existing adjustment entry for this invoice (cascades to lines)
    raw.prepare("DELETE FROM journal_entries WHERE reference_type = 'sales_invoice_adjustment' AND reference_id = ?").run(data.invoiceId);

    // Fetch original total from the original sales_invoice journal entry
    const originalEntry = raw.prepare("SELECT id FROM journal_entries WHERE reference_type = 'sales_invoice' AND reference_id = ?").get(data.invoiceId);
    let originalTotal = data.oldTotal; // fallback
    if (originalEntry) {
      const line = raw.prepare("SELECT credit FROM journal_entry_lines WHERE entry_id = ? AND account_id = ?").get(originalEntry.id, this.ACCOUNTS.REVENUE);
      if (line) originalTotal = line.credit;
    }

    const diff = data.newTotal - originalTotal;
    const diffCogs = (data.newCogs !== undefined && data.oldCogs !== undefined) ? (data.newCogs - data.oldCogs) : 0;

    if (Math.abs(diff) < 0.01 && Math.abs(diffCogs) < 0.01) return;

    const lines: any[] = [];
    if (Math.abs(diff) >= 0.01) {
      lines.push(
        { account_id: this.ACCOUNTS.REVENUE, debit: diff < 0 ? Math.abs(diff) : 0, credit: diff > 0 ? diff : 0 },
        { account_id: this.ACCOUNTS.AR, debit: diff > 0 ? diff : 0, credit: diff < 0 ? Math.abs(diff) : 0 }
      );
    }
    if (Math.abs(diffCogs) >= 0.01) {
      lines.push(
        { account_id: this.ACCOUNTS.COGS, debit: diffCogs > 0 ? diffCogs : 0, credit: diffCogs < 0 ? Math.abs(diffCogs) : 0 },
        { account_id: this.ACCOUNTS.INVENTORY, debit: diffCogs < 0 ? Math.abs(diffCogs) : 0, credit: diffCogs > 0 ? diffCogs : 0 }
      );
    }
    this.createJournalEntry(raw, { date: data.date || new Date().toISOString().split('T')[0], description: `تسوية فاتورة مبيعات ${data.invoiceId}`, reference_type: 'sales_invoice_adjustment', reference_id: data.invoiceId, user_id: userId, lines });
  },

  updatePurchaseEntry(raw: any, data: { oldTotal: number, newTotal: number, invoiceId: number, supplier_id: number, date?: string }, userId: number) {
    this._initAccounts(raw);
    
    // Delete any existing adjustment entry for this invoice (cascades to lines)
    raw.prepare("DELETE FROM journal_entries WHERE reference_type = 'purchase_invoice_adjustment' AND reference_id = ?").run(data.invoiceId);

    // Fetch the original total from the original purchase_invoice journal entry
    const originalEntry = raw.prepare("SELECT id FROM journal_entries WHERE reference_type = 'purchase_invoice' AND reference_id = ?").get(data.invoiceId);
    let originalTotal = data.oldTotal; // fallback
    if (originalEntry) {
      const line = raw.prepare("SELECT debit FROM journal_entry_lines WHERE entry_id = ? AND account_id = ?").get(originalEntry.id, this.ACCOUNTS.INVENTORY);
      if (line) originalTotal = line.debit;
    }

    const diff = data.newTotal - originalTotal;
    if (Math.abs(diff) < 0.01) return;
    const lines = [
      { account_id: this.ACCOUNTS.INVENTORY, debit: diff > 0 ? diff : 0, credit: diff < 0 ? Math.abs(diff) : 0 },
      { account_id: this.ACCOUNTS.AP, debit: diff < 0 ? Math.abs(diff) : 0, credit: diff > 0 ? diff : 0, party_type: 'supplier', party_id: data.supplier_id }
    ];
    this.createJournalEntry(raw, { date: data.date || new Date().toISOString().split('T')[0], description: `تسوية فاتورة مشتريات ${data.invoiceId}`, reference_type: 'purchase_invoice_adjustment', reference_id: data.invoiceId, user_id: userId, lines });
  },

  reverseEntry(raw: any, referenceType: string, referenceId: number, userId: number, reason: string) {
    const originalEntry = raw.prepare('SELECT * FROM journal_entries WHERE reference_type = ? AND reference_id = ?').get(referenceType, referenceId);
    if (!originalEntry) return;
    this._checkClosingDate(raw, originalEntry.date);
    const originalLines = raw.prepare('SELECT * FROM journal_entry_lines WHERE entry_id = ?').all(originalEntry.id);
    const reversedLines = originalLines.map((line: any) => ({ account_id: line.account_id, debit: line.credit, credit: line.debit, cost_center_id: line.cost_center_id, party_type: line.party_type, party_id: line.party_id }));
    this.createJournalEntry(raw, { date: new Date().toISOString().split('T')[0], description: `قيد عكسي: ${reason}`, reference_type: `${referenceType}_reversal`, reference_id: referenceId, user_id: userId, lines: reversedLines });
  },
  
  recordSale(raw: any, invoice: any, userId: number) {
    this._initAccounts(raw);
    this._checkClosingDate(raw, invoice.date);
    const lines: any[] = [
      { account_id: this.ACCOUNTS.REVENUE, debit: 0, credit: invoice.total }
    ];
    if (invoice.paid > 0) {
      lines.push({ account_id: this.ACCOUNTS.CASH, debit: invoice.paid, credit: 0 });
    }
    if (invoice.remaining > 0) {
      lines.push({ 
        account_id: this.ACCOUNTS.AR, 
        debit: invoice.remaining, 
        credit: 0,
        party_type: 'customer',
        party_id: invoice.customer_id
      });
    }
    if (invoice.cogs > 0) {
      lines.push(
        { account_id: this.ACCOUNTS.COGS, debit: invoice.cogs, credit: 0 },
        { account_id: this.ACCOUNTS.INVENTORY, debit: 0, credit: invoice.cogs }
      );
    }
    this.createJournalEntry(raw, {
      date: invoice.date,
      description: `فاتورة مبيعات رقم ${invoice.invoice_number}`,
      reference_type: 'sales_invoice',
      reference_id: invoice.id,
      user_id: userId,
      lines
    });
  },

  recordPurchase(raw: any, invoice: any, userId: number) {
    this._initAccounts(raw);
    this._checkClosingDate(raw, invoice.date);
    const lines: any[] = [
      { account_id: this.ACCOUNTS.INVENTORY, debit: invoice.total, credit: 0 }
    ];
    if (invoice.paid > 0) {
      lines.push({ account_id: this.ACCOUNTS.CASH, debit: 0, credit: invoice.paid });
    }
    if (invoice.remaining > 0) {
      lines.push({ 
        account_id: this.ACCOUNTS.AP, 
        debit: 0, 
        credit: invoice.remaining,
        party_type: 'supplier',
        party_id: invoice.supplier_id
      });
    }
    this.createJournalEntry(raw, {
      date: invoice.date,
      description: `فاتورة مشتريات رقم ${invoice.invoice_number}`,
      reference_type: 'purchase_invoice',
      reference_id: invoice.id,
      user_id: userId,
      lines
    });
  },

  recordPayment(raw: any, payment: any, userId: number) {
    this._initAccounts(raw);
    this._checkClosingDate(raw, payment.date);
    const lines: any[] = [];
    if (payment.direction === 'in') {
      lines.push(
        { account_id: this.ACCOUNTS.CASH, debit: payment.amount, credit: 0 },
        { 
          account_id: this.ACCOUNTS.AR, 
          debit: 0, 
          credit: payment.amount,
          party_type: 'customer',
          party_id: payment.party_id
        }
      );
    } else {
      lines.push(
        { 
          account_id: this.ACCOUNTS.AP, 
          debit: payment.amount, 
          credit: 0,
          party_type: 'supplier',
          party_id: payment.party_id
        },
        { account_id: this.ACCOUNTS.CASH, debit: 0, credit: payment.amount }
      );
    }
    this.createJournalEntry(raw, {
      date: payment.date,
      description: `سند دفع رقم ${payment.payment_number}`,
      reference_type: 'payment',
      reference_id: payment.id,
      user_id: userId,
      lines
    });
  },

  recordExpense(raw: any, expense: any, userId: number) {
    this._initAccounts(raw);
    this._checkClosingDate(raw, expense.date);
    const lines: any[] = [
      { account_id: this.ACCOUNTS.OP_EXPENSE, debit: expense.amount, credit: 0 },
      { account_id: this.ACCOUNTS.CASH, debit: 0, credit: expense.amount }
    ];
    this.createJournalEntry(raw, {
      date: expense.date,
      description: `مصروف: ${expense.title} - ${expense.notes || ''}`,
      reference_type: 'expense',
      reference_id: expense.id,
      user_id: userId,
      lines
    });
  },

  recordDefectiveGoods(raw: any, data: any, userId: number) {
    this._initAccounts(raw);
    this._checkClosingDate(raw, data.date);
    const lines: any[] = [
      { account_id: this.ACCOUNTS.OP_EXPENSE, debit: data.amount, credit: 0 },
      { account_id: this.ACCOUNTS.INVENTORY, debit: 0, credit: data.amount }
    ];
    this.createJournalEntry(raw, {
      date: data.date,
      description: data.notes,
      reference_type: 'expense',
      reference_id: data.id,
      user_id: userId,
      lines
    });
  },

  recordSupplierReturn(raw: any, data: any, userId: number) {
    this._initAccounts(raw);
    this._checkClosingDate(raw, data.date);
    const lines: any[] = [
      { 
        account_id: this.ACCOUNTS.AP, 
        debit: data.amount, 
        credit: 0,
        party_type: 'supplier',
        party_id: data.supplier_id
      },
      { account_id: this.ACCOUNTS.INVENTORY, debit: 0, credit: data.amount }
    ];
    this.createJournalEntry(raw, {
      date: data.date,
      description: data.notes,
      reference_type: 'purchase_return',
      reference_id: data.id,
      user_id: userId,
      lines
    });
  },
  recordCountAdjustment(raw: any, data: {
    product_id: number;
    product_name: string;
    quantity: number;
    type: 'surplus' | 'deficit';
    amount: number;
    date: string;
    notes: string;
  }, userId: number) {
    this._initAccounts(raw);
    this._checkClosingDate(raw, data.date);
    const lines = [];
    if (data.type === 'surplus') {
      lines.push(
        { account_id: this.ACCOUNTS.INVENTORY, debit: data.amount, credit: 0, cost_center_id: null, party_type: 'none', party_id: null },
        { account_id: this.ACCOUNTS.OTHER_REVENUE, debit: 0, credit: data.amount, cost_center_id: null, party_type: 'none', party_id: null }
      );
    } else {
      lines.push(
        { account_id: this.ACCOUNTS.OP_EXPENSE, debit: data.amount, credit: 0, cost_center_id: null, party_type: 'none', party_id: null },
        { account_id: this.ACCOUNTS.INVENTORY, debit: 0, credit: data.amount, cost_center_id: null, party_type: 'none', party_id: null }
      );
    }
    this.createJournalEntry(raw, {
      date: data.date,
      description: data.notes,
      reference_type: 'count_adjustment',
      reference_id: data.product_id,
      user_id: userId,
      lines,
    });
  },

  reconcile(raw: any) {
    console.log('[Accounting Reconciler] Starting financial data reconciliation...');

    // 1. Sync Sales Invoices
    try {
      const sales = raw.prepare(`
        SELECT id, invoice_number, date, total, paid, remaining, customer_id, user_id 
        FROM sales_invoices 
        WHERE status = 'confirmed'
      `).all() as any[];

      for (const sale of sales) {
        const exists = raw.prepare(`
          SELECT 1 FROM journal_entries WHERE reference_type = 'sales_invoice' AND reference_id = ?
        `).get(sale.id);

        if (!exists) {
          console.log(`[Accounting Reconciler] Posting missing journal entry for Sales Invoice: ${sale.invoice_number}`);
          const cogsRow = raw.prepare(`
            SELECT SUM(quantity * cost_price_snapshot) as cogs 
            FROM sales_invoice_items 
            WHERE invoice_id = ?
          `).get(sale.id) as any;
          
          this.recordSale(raw, {
            id: sale.id,
            invoice_number: sale.invoice_number,
            date: sale.date,
            total: sale.total,
            paid: sale.paid,
            remaining: sale.remaining,
            cogs: cogsRow?.cogs || 0,
            customer_id: sale.customer_id
          }, sale.user_id || 1);
        }
      }
    } catch (err: any) {
      console.error('[Accounting Reconciler] Sales sync failed:', err.message);
    }

    // 2. Sync Purchase Invoices
    try {
      const purchases = raw.prepare(`
        SELECT id, invoice_number, date, total, paid, remaining, supplier_id, user_id 
        FROM purchase_invoices 
        WHERE status = 'confirmed'
      `).all() as any[];

      for (const purchase of purchases) {
        const exists = raw.prepare(`
          SELECT 1 FROM journal_entries WHERE reference_type = 'purchase_invoice' AND reference_id = ?
        `).get(purchase.id);

        if (!exists) {
          console.log(`[Accounting Reconciler] Posting missing journal entry for Purchase Invoice: ${purchase.invoice_number}`);
          this.recordPurchase(raw, {
            id: purchase.id,
            invoice_number: purchase.invoice_number,
            date: purchase.date,
            total: purchase.total,
            paid: purchase.paid,
            remaining: purchase.remaining,
            supplier_id: purchase.supplier_id
          }, purchase.user_id || 1);
        }
      }
    } catch (err: any) {
      console.error('[Accounting Reconciler] Purchases sync failed:', err.message);
    }

    // 3. Sync Payments
    try {
      const payments = raw.prepare(`
        SELECT id, payment_number, direction, amount, party_type, party_id, date, user_id 
        FROM payments
      `).all() as any[];

      for (const payment of payments) {
        const exists = raw.prepare(`
          SELECT 1 FROM journal_entries WHERE reference_type = 'payment' AND reference_id = ?
        `).get(payment.id);

        if (!exists) {
          console.log(`[Accounting Reconciler] Posting missing journal entry for Payment: ${payment.payment_number}`);
          this.recordPayment(raw, {
            id: payment.id,
            payment_number: payment.payment_number,
            direction: payment.direction,
            amount: payment.amount,
            party_type: payment.party_type,
            party_id: payment.party_id,
            date: payment.date
          }, payment.user_id || 1);
        }
      }
    } catch (err: any) {
      console.error('[Accounting Reconciler] Payments sync failed:', err.message);
    }

    // 4. Sync Expenses
    try {
      const expenses = raw.prepare(`
        SELECT id, expense_number, category, description, amount, date, user_id 
        FROM expenses 
        WHERE is_active = 1
      `).all() as any[];

      for (const expense of expenses) {
        const exists = raw.prepare(`
          SELECT 1 FROM journal_entries WHERE reference_type = 'expense' AND reference_id = ?
        `).get(expense.id);

        if (!exists) {
          console.log(`[Accounting Reconciler] Posting missing journal entry for Expense: ${expense.expense_number}`);
          this.recordExpense(raw, {
            id: expense.id,
            expense_number: expense.expense_number,
            title: expense.category,
            notes: expense.description,
            amount: expense.amount,
            date: expense.date
          }, expense.user_id || 1);
        }
      }
    } catch (err: any) {
      console.error('[Accounting Reconciler] Expenses sync failed:', err.message);
    }

    // 5. Recalculate and update Customer Balances in the customers table
    try {
      console.log('[Accounting Reconciler] Syncing customer balances with double-entry ledger...');
      raw.prepare(`
        UPDATE customers 
        SET balance = COALESCE((
          SELECT SUM(jel.debit - jel.credit)
          FROM journal_entry_lines jel
          JOIN journal_entries je ON jel.entry_id = je.id
          WHERE jel.party_type = 'customer' AND jel.party_id = customers.id AND je.status = 'posted'
        ), 0)
      `).run();
    } catch (err: any) {
      console.error('[Accounting Reconciler] Customer balance recalculation failed:', err.message);
    }

    // 6. Recalculate and update Supplier Balances in the suppliers table
    try {
      console.log('[Accounting Reconciler] Syncing supplier balances with double-entry ledger...');
      raw.prepare(`
        UPDATE suppliers 
        SET balance = COALESCE((
          SELECT SUM(jel.credit - jel.debit)
          FROM journal_entry_lines jel
          JOIN journal_entries je ON jel.entry_id = je.id
          WHERE jel.party_type = 'supplier' AND jel.party_id = suppliers.id AND je.status = 'posted'
        ), 0)
      `).run();
    } catch (err: any) {
      console.error('[Accounting Reconciler] Supplier balance recalculation failed:', err.message);
    }

    // 7. Recalculate and update Cashbox Balance in the cash_boxes table
    try {
      console.log('[Accounting Reconciler] Syncing cash box balance with double-entry ledger...');
      raw.prepare(`
        UPDATE cash_boxes 
        SET current_balance = COALESCE((
          SELECT SUM(jel.debit - jel.credit)
          FROM journal_entry_lines jel
          JOIN journal_entries je ON jel.entry_id = je.id
          WHERE jel.account_id = (SELECT id FROM accounts WHERE code = '1100') AND je.status = 'posted'
        ), 0)
      `).run();
    } catch (err: any) {
      console.error('[Accounting Reconciler] Cashbox balance recalculation failed:', err.message);
    }

    console.log('[Accounting Reconciler] Financial data reconciliation completed successfully.');
  }
};