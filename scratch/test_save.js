const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(process.env.APPDATA, 'spare-parts-erp', 'SparePartsERP', 'spare_parts.db');
const db = new Database(dbPath);

const testData = {
  id: undefined,
  customer_id: undefined,
  sale_type: 'retail',
  subtotal: 1500,
  tax_amount: 0,
  global_discount_amount: 0,
  total: 1500,
  paid: 0,
  status: 'draft',
  notes: 'تجربة مسودة',
  items: [
    {
      product_id: 1,
      product_name_snapshot: 'منتج تجريبي',
      product_barcode_snapshot: '123456789',
      quantity: 2,
      unit: 'حبة',
      unit_price: 750,
      cost_price_snapshot: 500,
      item_discount_type: 'percent',
      item_discount_value: 0,
      item_discount_amount: 0,
      total: 1500,
      sort_order: 0
    }
  ],
  _user_id: 1,
  session_id: 'TEST-SESSION-' + Date.now()
};

try {
  console.log('Starting transaction simulation...');
  const tx = db.transaction(() => {
    // Generate invoice number
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const prefix = `SAL-${yyyy}${mm}${dd}-`;
    const rows = db.prepare("SELECT invoice_number FROM sales_invoices WHERE invoice_number LIKE ?").all(`${prefix}%`);
    let maxSeq = 0;
    for (const row of rows) {
      if (row && row.invoice_number) {
        const parts = row.invoice_number.split('-');
        const lastPart = parts[parts.length - 1];
        const seq = parseInt(lastPart, 10);
        if (!isNaN(seq) && seq > maxSeq) {
          maxSeq = seq;
        }
      }
    }
    const invoiceNumber = `${prefix}${String(maxSeq + 1).padStart(3, '0')}`;
    console.log('Generated Invoice Number:', invoiceNumber);

    // Insert invoice header
    const ins = db.prepare(`
      INSERT INTO sales_invoices (invoice_number, session_id, customer_id, sale_type, date, time, subtotal, tax_amount, global_discount_amount, total, paid, remaining, status, notes, user_id)
      VALUES (?, ?, ?, ?, date('now'), time('now'), ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      invoiceNumber,
      testData.session_id,
      testData.customer_id || null,
      testData.sale_type,
      testData.subtotal,
      testData.tax_amount,
      testData.global_discount_amount,
      testData.total,
      testData.paid,
      testData.total - testData.paid,
      testData.status,
      testData.notes,
      testData._user_id
    );

    const invoiceId = ins.lastInsertRowid;
    console.log('Inserted invoice ID:', invoiceId);

    // Update Header (this mimics updateInvoiceHeader)
    db.prepare(`
      UPDATE sales_invoices SET 
        customer_id = ?, sale_type = ?, subtotal = ?, tax_amount = ?, global_discount_amount = ?,
        total = ?, paid = ?, remaining = ?, status = ?, notes = ?, date = COALESCE(?, date), updated_at = datetime('now')
      WHERE id = ?
    `).run(
      testData.customer_id || null,
      testData.sale_type,
      testData.subtotal,
      testData.tax_amount,
      testData.global_discount_amount,
      testData.total,
      testData.paid,
      testData.total - testData.paid,
      testData.status,
      testData.notes || null,
      null,
      invoiceId
    );
    console.log('Updated header successfully.');

    // Delete items
    db.prepare('DELETE FROM sales_invoice_items WHERE invoice_id = ?').run(invoiceId);

    // Insert items
    const insertItem = db.prepare(`
      INSERT INTO sales_invoice_items (invoice_id, product_id, product_name_snapshot, quantity, unit, unit_price, total)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    for (const item of testData.items) {
      insertItem.run(invoiceId, item.product_id, item.product_name_snapshot, item.quantity, item.unit, item.unit_price, item.total);
    }
    console.log('Inserted items successfully.');

    return invoiceId;
  });

  const id = tx();
  console.log('Transaction completed successfully! New Invoice ID:', id);

  // Clean up
  db.prepare('DELETE FROM sales_invoice_items WHERE invoice_id = ?').run(id);
  db.prepare('DELETE FROM sales_invoices WHERE id = ?').run(id);
  console.log('Test cleanup done.');

} catch (err) {
  console.error('SQL Execution failed:', err);
}

db.close();
