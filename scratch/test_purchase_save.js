const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(process.env.APPDATA, 'spare-parts-erp', 'SparePartsERP', 'spare_parts.db');
const db = new Database(dbPath);

const testData = {
  id: undefined,
  supplier_invoice_number: 'ACH-TEST',
  supplier_id: undefined,
  subtotal: 1000,
  tax_amount: 0,
  discount_amount: 0,
  total: 1000,
  paid: 0,
  status: 'draft',
  notes: 'تجربة مشتريات مسودة',
  items: [
    {
      product_id: 1,
      product_name_snapshot: 'منتج تجريبي',
      product_barcode_snapshot: '123456789',
      quantity: 2,
      unit: 'حبة',
      unit_price: 500,
      total: 1000,
      wholesale_price: 500,
      retail_price: 600,
      category_id: 1,
      unit_id: 1
    }
  ],
  _user_id: 1,
  session_id: 'TEST-PURCHASE-SESSION-' + Date.now()
};

try {
  console.log('Starting purchases transaction simulation...');
  const tx = db.transaction(() => {
    // Generate invoice number
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const prefix = `ACH-${yyyy}${mm}-`;
    const rows = db.prepare("SELECT invoice_number FROM purchase_invoices WHERE invoice_number LIKE ?").all(`${prefix}%`);
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
    console.log('Generated Purchase Invoice Number:', invoiceNumber);

    // Insert invoice header
    const ins = db.prepare(`
      INSERT INTO purchase_invoices (invoice_number, session_id, supplier_invoice_number, supplier_id, date, subtotal, tax_amount, discount_amount, total, paid, remaining, status, notes, user_id)
      VALUES (?, ?, ?, ?, date('now'), ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      invoiceNumber,
      testData.session_id,
      testData.supplier_invoice_number || null,
      testData.supplier_id || null,
      testData.subtotal,
      testData.tax_amount,
      testData.discount_amount,
      testData.total,
      testData.paid,
      testData.total - testData.paid,
      testData.status,
      testData.notes,
      testData._user_id
    );

    const invoiceId = ins.lastInsertRowid;
    console.log('Inserted purchase invoice ID:', invoiceId);

    // Update Header (mimics updatePurchaseInvoiceHeader)
    db.prepare(`
      UPDATE purchase_invoices SET 
        supplier_invoice_number = ?, supplier_id = ?, subtotal = ?, tax_amount = ?, discount_amount = ?,
        total = ?, paid = ?, remaining = ?, status = ?, notes = ?, date = COALESCE(?, date), updated_at = datetime('now')
      WHERE id = ?
    `).run(
      testData.supplier_invoice_number || null,
      testData.supplier_id || null,
      testData.subtotal,
      testData.tax_amount,
      testData.discount_amount,
      testData.total,
      testData.paid,
      testData.total - testData.paid,
      testData.status,
      testData.notes || null,
      null,
      invoiceId
    );
    console.log('Updated purchase header successfully.');

    // Delete items
    db.prepare('DELETE FROM purchase_invoice_items WHERE invoice_id = ?').run(invoiceId);

    // Insert items
    const insertItem = db.prepare(`
      INSERT INTO purchase_invoice_items (invoice_id, product_id, product_name_snapshot, quantity, unit, unit_price, total, wholesale_price, retail_price)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const item of testData.items) {
      insertItem.run(invoiceId, item.product_id, item.product_name_snapshot, item.quantity, item.unit, item.unit_price, item.total, item.wholesale_price || 0, item.retail_price || 0);
    }
    console.log('Inserted purchase items successfully.');

    return invoiceId;
  });

  const id = tx();
  console.log('Transaction completed successfully! New Purchase Invoice ID:', id);

  // Clean up
  db.prepare('DELETE FROM purchase_invoice_items WHERE invoice_id = ?').run(id);
  db.prepare('DELETE FROM purchase_invoices WHERE id = ?').run(id);
  console.log('Test cleanup done.');

} catch (err) {
  console.error('SQL Execution failed:', err);
}

db.close();
