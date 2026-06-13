/**
 * Mobile HTTP Server
 * خادم HTTP لاستقبال الصور المرفوعة وخدمتها للواجهة الأمامية
 */
import http from 'http';
import fs from 'fs';
import path from 'path';
import url from 'url';
import { app, BrowserWindow } from 'electron';
import { DatabaseService } from '../services/database.service';

let httpServer: http.Server | null = null;

// Determine storage directories
const getStorageDirs = () => {
  const baseDir = path.join(app.getPath('userData'), 'SparePartsERP');
  const imagesDir = path.join(baseDir, 'product_images');
  const invoicesDir = path.join(baseDir, 'invoice_captures');

  if (!fs.existsSync(imagesDir)) fs.mkdirSync(imagesDir, { recursive: true });
  if (!fs.existsSync(invoicesDir)) fs.mkdirSync(invoicesDir, { recursive: true });

  return { imagesDir, invoicesDir };
};

export function startHttpServer(port: number): void {
  if (httpServer) return;

  const { imagesDir, invoicesDir } = getStorageDirs();

  httpServer = http.createServer((req, res) => {
    // Enable CORS for frontend requests
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      res.writeHead(200);
      res.end();
      return;
    }

    const parsedUrl = url.parse(req.url || '', true);
    const pathname = parsedUrl.pathname || '';

    // Route: GET /images/:filename - Serve product images
    if (req.method === 'GET' && pathname.startsWith('/images/')) {
      const filename = path.basename(pathname);
      const filePath = path.join(imagesDir, filename);

      if (fs.existsSync(filePath)) {
        res.writeHead(200, { 'Content-Type': 'image/jpeg' });
        fs.createReadStream(filePath).pipe(res);
      } else {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Image not found / الصورة غير موجودة');
      }
      return;
    }

    // Route: GET /invoices/:filename - Serve invoice images
    if (req.method === 'GET' && pathname.startsWith('/invoices/')) {
      const filename = path.basename(pathname);
      const filePath = path.join(invoicesDir, filename);

      if (fs.existsSync(filePath)) {
        res.writeHead(200, { 'Content-Type': 'image/jpeg' });
        fs.createReadStream(filePath).pipe(res);
      } else {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Invoice not found / الفاتورة غير موجودة');
      }
      return;
    }

    // Route: POST /upload-image - Upload product photo
    if (req.method === 'POST' && pathname === '/upload-image') {
      const productIdStr = parsedUrl.query.productId as string;
      const isPrimaryStr = parsedUrl.query.isPrimary as string;
      const productId = parseInt(productIdStr, 10);

      if (isNaN(productId)) {
        res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Invalid product ID / رقم المنتج غير صالح');
        return;
      }

      const timestamp = Date.now();
      const uniqueId = Math.round(Math.random() * 1e9);
      const filename = `${productId}_${timestamp}_${uniqueId}.jpg`;
      const filePath = path.join(imagesDir, filename);

      const writeStream = fs.createWriteStream(filePath);
      req.pipe(writeStream);

      writeStream.on('finish', () => {
        try {
          const isPrimary = isPrimaryStr === 'true';
          const rawDb = DatabaseService.getRawDb();

          rawDb.transaction(() => {
            if (isPrimary) {
              // Unset previous primary images for this product
              rawDb.prepare('UPDATE product_images SET is_primary = 0 WHERE product_id = ?').run(productId);
            }

            // Insert new image path
            rawDb.prepare(`
              INSERT INTO product_images (product_id, file_path, is_primary) 
              VALUES (?, ?, ?)
            `).run(productId, filename, isPrimary ? 1 : 0);

            // Update photo request if exists
            rawDb.prepare(`
              UPDATE photo_requests 
              SET status = 'received', received_at = datetime('now') 
              WHERE product_id = ? AND status = 'pending'
            `).run(productId);
          })();

          console.log(`[HttpServer] Image saved for product ${productId}: ${filename}`);
          
          // Broadcast event to React renderer
          const windows = BrowserWindow.getAllWindows();
          if (windows.length > 0 && windows[0]) {
            let productName = 'منتج';
            try {
              const pObj = rawDb.prepare('SELECT name FROM products WHERE id = ?').get(productId) as any;
              if (pObj) productName = pObj.name;
            } catch {}
            windows[0].webContents.send('mobile:photo-uploaded', { productId, filename, productName });
          }

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, filename }));
        } catch (dbErr: any) {
          console.error('[HttpServer] Database error saving image metadata:', dbErr);
          res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
          res.end('Database error / خطأ في قاعدة البيانات');
        }
      });

      writeStream.on('error', (err) => {
        console.error('[HttpServer] Error writing image file:', err);
        res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('File write error / خطأ في كتابة الملف');
      });
      return;
    }

    // Route: POST /upload-invoice - Upload invoice scan
    if (req.method === 'POST' && pathname === '/upload-invoice') {
      const timestamp = Date.now();
      const uniqueId = Math.round(Math.random() * 1e9);
      const filename = `invoice_${timestamp}_${uniqueId}.jpg`;
      const filePath = path.join(invoicesDir, filename);

      const writeStream = fs.createWriteStream(filePath);
      req.pipe(writeStream);

      writeStream.on('finish', () => {
        try {
          const rawDb = DatabaseService.getRawDb();
          const defaultPrompt = `قم بتحليل صورة الفاتورة هذه واستخرج البيانات بدقة بصيغة JSON التالية:
{
  "supplier_name": "اسم المورد",
  "invoice_number": "رقم الفاتورة",
  "date": "التاريخ بالصيغة YYYY-MM-DD",
  "items": [
    {
      "name": "اسم المنتج",
      "quantity": "الكمية",
      "price": "سعر الشراء"
    }
  ],
  "total": "المجموع الكلي"
}`;

          rawDb.prepare(`
            INSERT INTO invoice_captures (file_path, prompt_used, status) 
            VALUES (?, ?, 'new')
          `).run(filename, defaultPrompt);

          console.log(`[HttpServer] Invoice scan saved: ${filename}`);

          // Broadcast event to React renderer
          const windows = BrowserWindow.getAllWindows();
          if (windows.length > 0 && windows[0]) {
            windows[0].webContents.send('mobile:invoice-uploaded', { filename });
          }

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, filename }));
        } catch (dbErr: any) {
          console.error('[HttpServer] Database error saving invoice metadata:', dbErr);
          res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
          res.end('Database error / خطأ في قاعدة البيانات');
        }
      });

      writeStream.on('error', (err) => {
        console.error('[HttpServer] Error writing invoice file:', err);
        res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('File write error / خطأ في كتابة الملف');
      });
      return;
    }

    // Route: GET /search-products - Search for products
    if (req.method === 'GET' && pathname === '/search-products') {
      const query = (parsedUrl.query.query as string) || '';
      try {
        const rawDb = DatabaseService.getRawDb();
        let results;
        if (!query.trim()) {
          // Fetch recently added products
          results = rawDb.prepare(`
            SELECT p.id, p.name, p.barcode, p.retail_price as price, COALESCE(SUM(sb.quantity), 0) as quantity
            FROM products p
            LEFT JOIN stock_balances sb ON p.id = sb.product_id
            GROUP BY p.id
            ORDER BY p.id DESC
            LIMIT 30
          `).all();
        } else {
          const searchVal = `%${query}%`;
          results = rawDb.prepare(`
            SELECT p.id, p.name, p.barcode, p.retail_price as price, COALESCE(SUM(sb.quantity), 0) as quantity
            FROM products p
            LEFT JOIN stock_balances sb ON p.id = sb.product_id
            WHERE p.name LIKE ? 
               OR p.barcode = ? 
               OR p.id IN (SELECT product_id FROM product_barcodes WHERE barcode = ?)
            GROUP BY p.id
            LIMIT 30
          `).all(searchVal, query, query);
        }

        res.writeHead(200, { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify(results));
      } catch (dbErr: any) {
        console.error('[HttpServer] Search products error:', dbErr);
        res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Search error / خطأ في البحث');
      }
      return;
    }

    // Route: POST /link-barcode - Link new barcode to product
    if (req.method === 'POST' && pathname === '/link-barcode') {
      const productIdStr = parsedUrl.query.productId as string;
      const barcode = parsedUrl.query.barcode as string;
      const productId = parseInt(productIdStr, 10);

      if (isNaN(productId) || !barcode) {
        res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Invalid parameters / معلمات غير صالحة');
        return;
      }

      try {
        const rawDb = DatabaseService.getRawDb();
        rawDb.transaction(() => {
          // Check if barcode is already linked or primary
          const exists = rawDb.prepare('SELECT id FROM product_barcodes WHERE barcode = ?').get(barcode);
          if (!exists) {
            rawDb.prepare(`
              INSERT INTO product_barcodes (product_id, barcode, is_primary)
              VALUES (?, ?, 0)
            `).run(productId, barcode);
          }

          // Update products main barcode if it is empty
          const product = rawDb.prepare('SELECT barcode FROM products WHERE id = ?').get(productId) as any;
          if (product && !product.barcode) {
            rawDb.prepare('UPDATE products SET barcode = ? WHERE id = ?').run(barcode, productId);
          }
        })();

        // Recompile search terms for the product to include the newly linked barcode
        try {
          DatabaseService.recompileProductSearchTerms(productId);
        } catch (ftsErr) {
          console.error('[HttpServer] Failed to recompile product search terms on barcode link:', ftsErr);
        }

        console.log(`[HttpServer] Linked barcode ${barcode} to product ${productId}`);

        // Broadcast event to React renderer
        const windows = BrowserWindow.getAllWindows();
        if (windows.length > 0 && windows[0]) {
          let productName = 'منتج';
          try {
            const pObj = rawDb.prepare('SELECT name FROM products WHERE id = ?').get(productId) as any;
            if (pObj) productName = pObj.name;
          } catch {}
          windows[0].webContents.send('mobile:barcode-linked', { productId, barcode, productName });
        }

        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ success: true }));
      } catch (dbErr: any) {
        console.error('[HttpServer] Link barcode error:', dbErr);
        res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Database error / خطأ في قاعدة البيانات');
      }
      return;
    }

    // Route: GET /icount/active-session - Get active counting session
    if (req.method === 'GET' && pathname === '/icount/active-session') {
      try {
        const rawDb = DatabaseService.getRawDb();
        const session: any = rawDb.prepare(`
          SELECT s.*, u.full_name as started_by_name
          FROM inventory_count_sessions s
          LEFT JOIN users u ON s.started_by = u.id
          WHERE s.status = 'counting'
          ORDER BY s.id DESC LIMIT 1
        `).get();

        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ success: true, session: session || null }));
      } catch (dbErr: any) {
        console.error('[HttpServer] active-session error:', dbErr);
        res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Database error');
      }
      return;
    }

    // Route: GET /icount/search-item - Search product inside active session
    if (req.method === 'GET' && pathname === '/icount/search-item') {
      const sessionIdStr = parsedUrl.query.sessionId as string;
      const query = (parsedUrl.query.query as string) || '';
      const sessionId = parseInt(sessionIdStr, 10);

      if (isNaN(sessionId) || !query) {
        res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Invalid parameters');
        return;
      }

      try {
        const rawDb = DatabaseService.getRawDb();
        // Search inside session items by barcode or name
        const items = rawDb.prepare(`
          SELECT i.*, p.name as product_name, u.name as unit_name
          FROM inventory_count_items i
          JOIN products p ON i.product_id = p.id
          LEFT JOIN units u ON p.unit_id = u.id
          WHERE i.session_id = ? AND (i.barcode_snapshot = ? OR i.product_name_snapshot LIKE ?)
          LIMIT 20
        `).all(sessionId, query, `%${query}%`);

        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ success: true, items: items || [] }));
      } catch (dbErr: any) {
        console.error('[HttpServer] search-item error:', dbErr);
        res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Database error');
      }
      return;
    }

    // Route: POST /icount/update-count - Update quantity and mismatch reason/notes
    if (req.method === 'POST' && pathname === '/icount/update-count') {
      let body = '';
      req.on('data', chunk => {
        body += chunk.toString();
      });
      req.on('end', () => {
        try {
          const payload = JSON.parse(body);
          const { session_id, item_id, counted_qty, notes, mismatch_reason } = payload;

          if (session_id === undefined || item_id === undefined || counted_qty === undefined) {
            res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
            res.end('Missing required fields');
            return;
          }

          const rawDb = DatabaseService.getRawDb();
          const item: any = rawDb.prepare('SELECT * FROM inventory_count_items WHERE id = ? AND session_id = ?').get(item_id, session_id);
          if (!item) {
            res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
            res.end('Item not found');
            return;
          }

          const sessionObj: any = rawDb.prepare('SELECT status FROM inventory_count_sessions WHERE id = ?').get(session_id);
          const isSessionCounting = sessionObj?.status === 'counting';

          const balance: any = rawDb.prepare('SELECT SUM(quantity) as qty FROM stock_balances WHERE product_id = ?').get(item.product_id);
          const currentSystemQty = balance?.qty || 0;
          const expectedQty = isSessionCounting ? currentSystemQty : (item.expected_qty || 0);

          const countedQtyNum = counted_qty !== null ? Math.round(Number(counted_qty) * 10000) / 10000 : null;
          const isCounted = countedQtyNum !== null;

          let newStatus = 'unchecked';
          if (isCounted) {
            newStatus = Math.abs(countedQtyNum! - expectedQty) < 0.001 ? 'matched' : 'mismatch';
          }
          const finalDiff = isCounted ? Math.round((countedQtyNum! - expectedQty) * 10000) / 10000 : null;

          rawDb.transaction(() => {
            rawDb.prepare(`
              UPDATE inventory_count_items
              SET counted_qty = ?,
                  status = ?,
                  final_difference = ?,
                  checked_at = ?,
                  checked_by = 1,
                  notes = ?,
                  mismatch_reason = ?
              WHERE id = ?
            `).run(
              countedQtyNum,
              newStatus,
              finalDiff,
              isCounted ? new Date().toISOString() : null,
              notes !== undefined ? (notes || null) : (item.notes || null),
              mismatch_reason !== undefined ? (mismatch_reason || null) : (item.mismatch_reason || null),
              item_id
            );

            // Recalculate session counts
            const stats: any = rawDb.prepare(`
              SELECT
                SUM(CASE WHEN status != 'unchecked' THEN 1 ELSE 0 END) as checked_count,
                SUM(CASE WHEN status = 'matched' THEN 1 ELSE 0 END) as match_count,
                SUM(CASE WHEN status = 'mismatch' THEN 1 ELSE 0 END) as mismatch_count
              FROM inventory_count_items WHERE session_id = ?
            `).get(session_id);

            rawDb.prepare(`
              UPDATE inventory_count_sessions
              SET checked_count = ?, match_count = ?, mismatch_count = ?
              WHERE id = ?
            `).run(
              stats.checked_count || 0,
              stats.match_count || 0,
              stats.mismatch_count || 0,
              session_id
            );
          })();

          // Broadcast update to desktop interface
          const windows = BrowserWindow.getAllWindows();
          if (windows.length > 0 && windows[0]) {
            windows[0].webContents.send('mobile:inventory-count-updated', { 
              session_id, 
              item_id, 
              counted_qty: countedQtyNum, 
              status: newStatus 
            });
          }

          res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ success: true, status: newStatus, final_difference: finalDiff }));
        } catch (err: any) {
          console.error('[HttpServer] update-count error:', err);
          res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
          res.end('Error processing request: ' + err.message);
        }
      });
      return;
    }

    // Route not found
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Route not found / المسار غير موجود');
  });

  httpServer.on('error', (err: any) => {
    console.error('[HttpServer] Server error:', err);
    stopHttpServer();
  });

  try {
    httpServer.listen(port, () => {
      console.log(`[HttpServer] Listening on port ${port}`);
    });
  } catch (err: any) {
    console.error('[HttpServer] Server listen exception:', err);
    stopHttpServer();
  }
}

export function stopHttpServer(): void {
  if (!httpServer) return;

  const serverToClose = httpServer;
  httpServer = null;

  try {
    serverToClose.removeAllListeners('error');
    serverToClose.close(() => {
      console.log('[HttpServer] Stopped');
    });
  } catch (err) {
    console.error('[HttpServer] Error closing server:', err);
  }
}
