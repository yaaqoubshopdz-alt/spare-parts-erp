const db = require('better-sqlite3')('C:\\Users\\blbl\\AppData\\Roaming\\spare-parts-erp\\SparePartsERP\\spare_parts.db');

console.time('pnl');
const accounts = db.prepare(`
  SELECT 
    a.id, a.code, a.name, a.type,
    COALESCE(SUM(jel.debit), 0) as total_debit,
    COALESCE(SUM(jel.credit), 0) as total_credit
  FROM accounts a
  LEFT JOIN journal_entry_lines jel ON a.id = jel.account_id
  LEFT JOIN journal_entries je ON jel.entry_id = je.id AND je.status = 'posted' AND je.date >= ? AND je.date <= ?
  WHERE a.type IN ('revenue', 'expense') AND a.parent_id IS NOT NULL
  GROUP BY a.id
`).all('2025-01-01', '2026-12-31');
console.timeEnd('pnl');
console.log('PnL Accounts:', accounts.length);

console.time('cashflow');
const cashFromSales = db.prepare(`
  SELECT COALESCE(SUM(jel.debit), 0) as val
  FROM journal_entry_lines jel
  JOIN journal_entries je ON jel.entry_id = je.id
  WHERE jel.account_id IN (2, 3) AND je.status = 'posted' AND je.reference_type IN ('sales_invoice', 'payment')
`).get();
console.timeEnd('cashflow');
console.log('Cash from sales:', cashFromSales);

console.log('Done.');
