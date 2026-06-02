const { app } = require('electron');
const Database = require('better-sqlite3');
const path = require('path');

app.whenReady().then(() => {
  const dbPath = 'C:\\Users\\blbl\\AppData\\Roaming\\spare-parts-erp\\SparePartsERP\\spare_parts.db';
  console.log('DB Path:', dbPath);
  
  let db;
  try {
    db = new Database(dbPath);
  } catch (err) {
    if (err.message.includes('database is locked')) {
       console.error('Database is locked! Please close the application first.');
       app.quit();
       return;
    }
    throw err;
  }
  
  console.log('Clearing database...');
  
  const tablesToClear = [
    'sales_invoice_items', 'sales_invoices',
    'purchase_invoice_items', 'purchase_invoices',
    'sales_return_items', 'sales_returns',
    'purchase_return_items', 'purchase_returns',
    'stock_movements', 'stock_balances', 'product_batches',
    'product_fitments', 'product_barcodes', 'products',
    'customers', 'suppliers',
    'payments', 'cash_transactions', 'cash_closings', 'expenses',
    'price_history', 'audit_log', 'backup_log',
    'journal_entry_lines', 'journal_entries'
  ];
  
  db.transaction(() => {
    // Clear the tables
    for (const table of tablesToClear) {
      try {
        db.prepare(`DELETE FROM ${table}`).run();
        // Reset auto-increment sequence
        db.prepare(`DELETE FROM sqlite_sequence WHERE name='${table}'`).run();
        console.log(`Cleared ${table}`);
      } catch (err) {
        if (err.message.includes('no such table')) {
          console.log(`Skipped ${table} (table does not exist yet)`);
        } else {
          throw err;
        }
      }
    }
  
    // Reset sequences in our custom table
    db.prepare(`UPDATE number_sequences SET last_number = 0`).run();
    
    // Reset cash box
    db.prepare(`UPDATE cash_boxes SET current_balance = 0`).run();
  })();
  
  db.close();
  console.log('Database cleared successfully.');
  app.quit();
}).catch(err => {
  console.error(err);
  app.quit();
});
