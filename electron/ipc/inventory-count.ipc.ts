import { ipcMain } from 'electron';
import { DatabaseService } from '../services/database.service';
import { AuthService } from '../services/auth.service';
import { AccountingEngine } from '../services/accounting.service';

function compileFTS5Query(query: string): string {
  if (!query) return '';
  // Normalize Arabic (أ، إ، آ -> ا) and (ة -> ه) and strip diacritics
  const normalized = query
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/[\u064B-\u0652]/g, '') // strip diacritics
    .toLowerCase()
    .trim();
    
  const words = normalized.split(/[\s,\.\-\_\/\\\(\)\{\}\[\]\+]+/);
  const ftsWords = words
    .map(w => w.trim())
    .filter(w => w.length > 0)
    .map(w => `${w}*`);
    
  return ftsWords.join(' AND ');
}

export function registerInventoryCountIPC() {
  const db = () => DatabaseService.getRawDb();

  // ── Helper: Generate session number ──────────────────────────
  function generateSessionNumber(raw: any): string {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    const prefix = `ICT-${y}${m}${d}-`;
    const last: any = raw.prepare("SELECT session_number FROM inventory_count_sessions WHERE session_number LIKE ? ORDER BY id DESC LIMIT 1").get(`${prefix}%`);
    let seq = 1;
    if (last) {
      const parts = last.session_number.split('-');
      seq = (parseInt(parts[parts.length - 1], 10) || 0) + 1;
    }
    return `${prefix}${String(seq).padStart(3, '0')}`;
  }

  // ── Helper: Query products with optional category filter ─────
  function getProductsForCount(raw: any, categoryId?: number): any[] {
    let where = 'WHERE p.is_active = 1';
    const params: any[] = [];
    if (categoryId) {
      where += ' AND p.category_id = ?';
      params.push(categoryId);
    }
    return raw.prepare(`
      SELECT p.id,
             p.barcode,
             p.name,
             c.name as category_name,
             u.name as unit_name,
             p.is_hidden_from_sales,
             COALESCE(sb.quantity, 0) as system_qty
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN units u ON p.unit_id = u.id
      LEFT JOIN (SELECT product_id, SUM(quantity) as quantity FROM stock_balances GROUP BY product_id) sb ON p.id = sb.product_id
      ${where}
      ORDER BY p.name
    `).all(...params);
  }

  // ── Create Session ─────────────────────────────────────────────
  ipcMain.handle('icount:createSession', async (_e, params?: { category_id?: number }) => {
    try {
      const session = await AuthService.checkSession();
      if (!session.success) return { success: false, error: 'غير مصرح' };
      const userId = session.user.id;

      const raw = db();
      const categoryId = params?.category_id || null;
      let categoryName: string | null = null;
      if (categoryId) {
        const cat: any = raw.prepare('SELECT name FROM categories WHERE id = ?').get(categoryId);
        categoryName = cat?.name || null;
      }

      const products = getProductsForCount(raw, categoryId || undefined);
      if (products.length === 0) {
        return { success: false, error: 'لا توجد منتجات متاحة للجرد' };
      }

      const sessionNumber = generateSessionNumber(raw);
      let sessionId: number | null = null;

      const tx = raw.transaction(() => {
        const res = raw.prepare(`
          INSERT INTO inventory_count_sessions (session_number, started_by, category_id, category_name_snapshot, total_products, status, started_at)
          VALUES (?, ?, ?, ?, ?, 'counting', datetime('now'))
        `).run(sessionNumber, userId, categoryId, categoryName, products.length);
        sessionId = res.lastInsertRowid as number;

        const insertItem = raw.prepare(`
          INSERT INTO inventory_count_items (session_id, product_id, barcode_snapshot, product_name_snapshot, category_name_snapshot, unit_name_snapshot, is_hidden_from_sales, system_qty_at_start, expected_qty)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        for (const p of products) {
          insertItem.run(sessionId, p.id, p.barcode, p.name, p.category_name, p.unit_name, p.is_hidden_from_sales ? 1 : 0, p.system_qty, p.system_qty);
        }
      });

      tx();
      return { success: true, data: { id: sessionId, session_number: sessionNumber, total_products: products.length } };
    } catch (error: any) {
      console.error('[InventoryCount IPC] createSession error:', error);
      return { success: false, error: error.message };
    }
  });

  // ── Get Sessions (paginated) ───────────────────────────────────
  ipcMain.handle('icount:getSessions', async (_e, filters?: { status?: string; page?: number; limit?: number }) => {
    try {
      const raw = db();
      let where = 'WHERE 1=1';
      const params: any[] = [];

      if (filters?.status) {
        where += ' AND s.status = ?';
        params.push(filters.status);
      }

      const countRow: any = raw.prepare(`SELECT COUNT(*) as total FROM inventory_count_sessions s ${where}`).get(...params);
      const total = countRow?.total || 0;
      const page = filters?.page || 1;
      const limit = filters?.limit || 50;
      const offset = (page - 1) * limit;

      const sessions = raw.prepare(`
        SELECT s.*, u.full_name as started_by_name
        FROM inventory_count_sessions s
        LEFT JOIN users u ON s.started_by = u.id
        ${where}
        ORDER BY s.id DESC
        LIMIT ? OFFSET ?
      `).all(...params, limit, offset);

      return { success: true, data: sessions, total, page, limit };
    } catch (error: any) {
      console.error('[InventoryCount IPC] getSessions error:', error);
      return { success: false, error: error.message };
    }
  });

  // ── Get Session By ID (with stats) ─────────────────────────────
  ipcMain.handle('icount:getSessionById', async (_e, id: number) => {
    try {
      const raw = db();
      const session: any = raw.prepare(`
        SELECT s.*, u.full_name as started_by_name
        FROM inventory_count_sessions s
        LEFT JOIN users u ON s.started_by = u.id
        WHERE s.id = ?
      `).get(id);

      if (!session) return { success: false, error: 'الجلسة غير موجودة' };

      return { success: true, data: session };
    } catch (error: any) {
      console.error('[InventoryCount IPC] getSessionById error:', error);
      return { success: false, error: error.message };
    }
  });

  // ── Get Session Items (paginated, sorted) ──────────────────────
  const SORT_MAP: Record<string, string> = {
    product_name_snapshot: 'i.product_name_snapshot',
    barcode_snapshot: 'i.barcode_snapshot',
    category_name_snapshot: 'i.category_name_snapshot',
    system_qty_at_start: 'i.system_qty_at_start',
    counted_qty: 'i.counted_qty',
    final_difference: 'i.final_difference',
  };
  ipcMain.handle('icount:getSessionItems', async (_e, params: { session_id: number; page?: number; limit?: number; status?: string; search?: string; sortKey?: string; sortDir?: string }) => {
    try {
      const raw = db();
      let where = 'WHERE i.session_id = ?';
      const queryParams: any[] = [params.session_id];

      if (params.status) {
        if (params.status === 'checked') {
          where += " AND i.status IN ('matched', 'mismatch')";
        } else {
          where += ' AND i.status = ?';
          queryParams.push(params.status);
        }
      }
      if (params.search && params.search.trim()) {
        const query = params.search;
        const ftsQuery = compileFTS5Query(query);
        let matchingIds: number[] = [];
        if (ftsQuery) {
          try {
            const matches = raw.prepare(`
              SELECT product_id 
              FROM product_search_fts 
              WHERE product_search_fts MATCH ? 
              LIMIT 300
            `).all(ftsQuery) as any[];
            matchingIds = matches.map(m => m.product_id);
          } catch (ftsError) {
            console.error('[InventoryCount IPC] getSessionItems FTS match error:', ftsError);
          }
        }

        if (matchingIds.length > 0) {
          where += ` AND (i.product_id IN (${matchingIds.join(',')}) OR i.barcode_snapshot = ? OR i.product_name_snapshot LIKE ?)`;
          queryParams.push(query, `%${query}%`);
        } else {
          where += ' AND (i.product_name_snapshot LIKE ? OR i.barcode_snapshot LIKE ?)';
          const s = `%${query}%`;
          queryParams.push(s, s);
        }
      }

      const countRow: any = raw.prepare(`SELECT COUNT(*) as total FROM inventory_count_items i ${where}`).get(...queryParams);
      const total = countRow?.total || 0;
      const page = params.page || 1;
      const limit = params.limit || 50;
      const offset = (page - 1) * limit;

      const safeCol = SORT_MAP[params.sortKey || 'product_name_snapshot'] || 'i.product_name_snapshot';
      const safeDir = params.sortDir === 'desc' ? 'DESC' : 'ASC';

      const items = raw.prepare(`
        SELECT i.*, p.purchase_price, COALESCE(sb.quantity, 0) as current_system_qty
        FROM inventory_count_items i
        JOIN products p ON i.product_id = p.id
        LEFT JOIN (SELECT product_id, SUM(quantity) as quantity FROM stock_balances GROUP BY product_id) sb ON i.product_id = sb.product_id
        ${where}
        ORDER BY ${safeCol} ${safeDir}
        LIMIT ? OFFSET ?
      `).all(...queryParams, limit, offset);

      // Get session info for counts
      const session: any = raw.prepare('SELECT checked_count, match_count, mismatch_count, total_products, status FROM inventory_count_sessions WHERE id = ?').get(params.session_id);

      return { success: true, data: items, total, page, limit, session };
    } catch (error: any) {
      console.error('[InventoryCount IPC] getSessionItems error:', error);
      return { success: false, error: error.message };
    }
  });

  // ── Update Item Count (Auto-Save) ──────────────────────────────
  ipcMain.handle('icount:updateItemCount', async (_e, params: { session_id: number; item_id: number; counted_qty: number | null }) => {
    try {
      const session = await AuthService.checkSession();
      if (!session.success) return { success: false, error: 'غير مصرح' };
      const userId = session.user.id;

      const raw = db();
      const item: any = raw.prepare('SELECT * FROM inventory_count_items WHERE id = ? AND session_id = ?').get(params.item_id, params.session_id);
      if (!item) return { success: false, error: 'العنصر غير موجود' };
      if (item.status === 'mismatch' && params.counted_qty === null) {
        return { success: false, error: 'لا يمكن إلغاء قيم العناصر غير المتطابقة. يرجى تصحيح الكمية أو استخدام التعليقات.' };
      }

      const sessionObj: any = raw.prepare('SELECT status FROM inventory_count_sessions WHERE id = ?').get(params.session_id);
      const isSessionCounting = sessionObj?.status === 'counting';

      const balance: any = raw.prepare('SELECT SUM(quantity) as qty FROM stock_balances WHERE product_id = ?').get(item.product_id);
      const currentSystemQty = balance?.qty || 0;

      const expectedQty = isSessionCounting ? currentSystemQty : (item.expected_qty || 0);

      const prevChecked = item.counted_qty !== null ? 1 : 0;
      const countedQty = params.counted_qty !== null ? Math.round(params.counted_qty * 10000) / 10000 : null;
      const isCounted = countedQty !== null;

      // Determine new status
      let newStatus = 'unchecked';
      if (isCounted) {
        newStatus = Math.abs(countedQty! - expectedQty) < 0.001 ? 'matched' : 'mismatch';
      }

      const finalDiff = isCounted ? Math.round((countedQty! - expectedQty) * 10000) / 10000 : null;
      const tx = raw.transaction(() => {
        // Update item
        raw.prepare(`
          UPDATE inventory_count_items
          SET counted_qty = ?,
              status = ?,
              final_difference = ?,
              checked_at = ?,
              checked_by = ?
          WHERE id = ?
        `).run(
          countedQty,
          newStatus,
          finalDiff,
          isCounted ? new Date().toISOString() : null,
          isCounted ? userId : null,
          params.item_id
        );

        // Recalculate session counts
        const stats: any = raw.prepare(`
          SELECT
            SUM(CASE WHEN status != 'unchecked' THEN 1 ELSE 0 END) as checked_count,
            SUM(CASE WHEN status = 'matched' THEN 1 ELSE 0 END) as match_count,
            SUM(CASE WHEN status = 'mismatch' THEN 1 ELSE 0 END) as mismatch_count
          FROM inventory_count_items WHERE session_id = ?
        `).get(params.session_id);

        raw.prepare(`
          UPDATE inventory_count_sessions
          SET checked_count = ?, match_count = ?, mismatch_count = ?
          WHERE id = ?
        `).run(
          stats.checked_count || 0,
          stats.match_count || 0,
          stats.mismatch_count || 0,
          params.session_id
        );
      });

      tx();
      return { success: true, data: { status: newStatus, counted_qty: countedQty, final_difference: finalDiff } };
    } catch (error: any) {
      console.error('[InventoryCount IPC] updateItemCount error:', error);
      return { success: false, error: error.message };
    }
  });

  // ── Update Item Notes ──────────────────────────────────────────
  ipcMain.handle('icount:updateItemNotes', async (_e, params: { item_id: number; mismatch_reason?: string; notes?: string }) => {
    try {
      const raw = db();
      const updates: string[] = [];
      const vals: any[] = [];

      if (params.mismatch_reason !== undefined) {
        updates.push('mismatch_reason = ?');
        vals.push(params.mismatch_reason || null);
      }
      if (params.notes !== undefined) {
        updates.push('notes = ?');
        vals.push(params.notes || null);
      }

      if (updates.length === 0) return { success: true };

      vals.push(params.item_id);
      raw.prepare(`UPDATE inventory_count_items SET ${updates.join(', ')} WHERE id = ?`).run(...vals);
      return { success: true };
    } catch (error: any) {
      console.error('[InventoryCount IPC] updateItemNotes error:', error);
      return { success: false, error: error.message };
    }
  });

  // ── Finish Session → Set to 'reviewing' ────────────────────────
  ipcMain.handle('icount:finishSession', async (_e, sessionId: number) => {
    try {
      const session = await AuthService.checkSession();
      if (!session.success) return { success: false, error: 'غير مصرح' };

      const raw = db();
      const countSession: any = raw.prepare('SELECT status, total_products FROM inventory_count_sessions WHERE id = ?').get(sessionId);
      if (!countSession) return { success: false, error: 'الجلسة غير موجودة' };
      if (countSession.status !== 'counting') return { success: false, error: 'لا يمكن إنهاء جلسة في حالتها الحالية' };

      const tx = raw.transaction(() => {
        // Calculate movements_during_count for each item
        const items: any[] = raw.prepare('SELECT id, product_id, system_qty_at_start FROM inventory_count_items WHERE session_id = ?').all(sessionId);
        const updateItem = raw.prepare(`
          UPDATE inventory_count_items
          SET movements_during_count = ?,
              expected_qty = ?,
              final_difference = ?,
              status = ?
          WHERE id = ?
        `);

        for (const item of items) {
          const currentQty: any = raw.prepare('SELECT COALESCE(SUM(quantity), 0) as qty FROM stock_balances WHERE product_id = ?').get(item.product_id);
          const movements = (currentQty?.qty || 0) - (item.system_qty_at_start || 0);
          const expected = (item.system_qty_at_start || 0) + movements;
          const countedRow: any = raw.prepare('SELECT counted_qty, status FROM inventory_count_items WHERE id = ?').get(item.id);
          const counted = countedRow?.counted_qty;
          
          let diff: number | null = null;
          let newStatus = countedRow?.status || 'unchecked';
          
          if (counted !== null && counted !== undefined) {
            diff = Math.round((counted - expected) * 10000) / 10000;
            newStatus = Math.abs(counted - expected) < 0.001 ? 'matched' : 'mismatch';
          } else {
            diff = null;
            newStatus = 'unchecked';
          }

          updateItem.run(movements, expected, diff, newStatus, item.id);
        }

        // Recalculate session counts
        const stats: any = raw.prepare(`
          SELECT
            SUM(CASE WHEN status != 'unchecked' THEN 1 ELSE 0 END) as checked_count,
            SUM(CASE WHEN status = 'matched' THEN 1 ELSE 0 END) as match_count,
            SUM(CASE WHEN status = 'mismatch' THEN 1 ELSE 0 END) as mismatch_count
          FROM inventory_count_items WHERE session_id = ?
        `).get(sessionId);

        // Update session status and counts
        raw.prepare(`
          UPDATE inventory_count_sessions 
          SET status = 'reviewing', 
              finished_at = datetime('now'),
              checked_count = ?,
              match_count = ?,
              mismatch_count = ?
          WHERE id = ?
        `).run(
          stats.checked_count || 0,
          stats.match_count || 0,
          stats.mismatch_count || 0,
          sessionId
        );
      });

      tx();
      return { success: true };
    } catch (error: any) {
      console.error('[InventoryCount IPC] finishSession error:', error);
      return { success: false, error: error.message };
    }
  });

  // ── Approve Session ─────────────────────────────────────────────
  ipcMain.handle('icount:approveSession', async (_e, params: { session_id: number; user_id: number }) => {
    try {
      const raw = db();
      const userId = params.user_id;
      const countSession: any = raw.prepare('SELECT status, category_id FROM inventory_count_sessions WHERE id = ?').get(params.session_id);
      if (!countSession) return { success: false, error: 'الجلسة غير موجودة' };
      if (countSession.status !== 'reviewing') return { success: false, error: 'لا يمكن اعتماد جلسة في حالتها الحالية' };

      const mismatches: any[] = raw.prepare(`
        SELECT i.*, p.purchase_price
        FROM inventory_count_items i
        JOIN products p ON i.product_id = p.id
        WHERE i.session_id = ? AND i.status = 'mismatch' AND ABS(i.final_difference) > 0.001
      `).all(params.session_id);

      const tx = raw.transaction(() => {
        for (const item of mismatches) {
          const diff = item.final_difference || 0;
          const location: any = raw.prepare('SELECT id FROM locations ORDER BY id ASC LIMIT 1').get();
          const locationId = location?.id || 1;

          // Update stock balance
          const balance: any = raw.prepare('SELECT quantity FROM stock_balances WHERE product_id = ? AND location_id = ?').get(item.product_id, locationId);
          const currentQty = balance ? balance.quantity : 0;
          const newQty = Math.round((currentQty + diff) * 10000) / 10000;

          if (balance) {
            raw.prepare('UPDATE stock_balances SET quantity = ?, updated_at = datetime(\'now\') WHERE product_id = ? AND location_id = ?')
              .run(newQty, item.product_id, locationId);
          } else {
            raw.prepare('INSERT INTO stock_balances (product_id, location_id, quantity, updated_at) VALUES (?, ?, ?, datetime(\'now\'))')
              .run(item.product_id, locationId, newQty);
          }

          // Record stock movement
          raw.prepare(`
            INSERT INTO stock_movements (product_id, location_id, movement_type, quantity, balance_after, user_id, notes, created_at)
            VALUES (?, ?, 'count_adjustment', ?, ?, ?, ?, datetime('now'))
          `).run(item.product_id, locationId, diff, newQty, userId, `تسوية جرد: ${item.product_name_snapshot} (الفرق: ${diff > 0 ? '+' : ''}${diff})`);

          // Accounting entry for significant differences
          if (Math.abs(diff) > 0 && (item.purchase_price || 0) > 0) {
            const amount = Math.round(Math.abs(diff) * (item.purchase_price || 0) * 100) / 100;
            if (amount > 0) {
              AccountingEngine.recordCountAdjustment(raw, {
                product_id: item.product_id,
                product_name: item.product_name_snapshot,
                quantity: Math.abs(diff),
                type: diff > 0 ? 'surplus' : 'deficit',
                amount,
                date: new Date().toISOString().split('T')[0],
                notes: `تسوية جرد: ${item.product_name_snapshot}`,
              }, userId);
            }
          }
        }

        // Update session
        raw.prepare(`UPDATE inventory_count_sessions SET status = 'approved', approved_at = datetime('now') WHERE id = ?`).run(params.session_id);
      });

      tx();
      return { success: true, adjustments_applied: mismatches.length };
    } catch (error: any) {
      console.error('[InventoryCount IPC] approveSession error:', error);
      return { success: false, error: error.message };
    }
  });

  // ── Cancel Session ─────────────────────────────────────────────
  ipcMain.handle('icount:cancelSession', async (_e, sessionId: number) => {
    try {
      const raw = db();
      const countSession: any = raw.prepare('SELECT status FROM inventory_count_sessions WHERE id = ?').get(sessionId);
      if (!countSession) return { success: false, error: 'الجلسة غير موجودة' };
      if (countSession.status === 'approved') return { success: false, error: 'لا يمكن إلغاء جلسة معتمدة' };

      raw.prepare(`UPDATE inventory_count_sessions SET status = 'cancelled' WHERE id = ?`).run(sessionId);
      return { success: true };
    } catch (error: any) {
      console.error('[InventoryCount IPC] cancelSession error:', error);
      return { success: false, error: error.message };
    }
  });

  // ── Toggle Hide From Sales ─────────────────────────────────────
  ipcMain.handle('icount:toggleHideFromSales', async (_e, productId: number) => {
    try {
      const session = await AuthService.checkSession();
      if (!session.success) return { success: false, error: 'غير مصرح' };

      const raw = db();
      const product: any = raw.prepare('SELECT is_hidden_from_sales FROM products WHERE id = ?').get(productId);
      if (!product) return { success: false, error: 'المنتج غير موجود' };

      const newValue = product.is_hidden_from_sales ? 0 : 1;

      const tx = raw.transaction(() => {
        raw.prepare('UPDATE products SET is_hidden_from_sales = ?, updated_at = datetime(\'now\') WHERE id = ?').run(newValue, productId);

        raw.prepare(`
          UPDATE inventory_count_items
          SET is_hidden_from_sales = ?
          WHERE product_id = ?
        `).run(newValue, productId);
      });

      tx();

      return { success: true, data: { is_hidden_from_sales: !!newValue } };
    } catch (error: any) {
      console.error('[InventoryCount IPC] toggleHideFromSales error:', error);
      return { success: false, error: error.message };
    }
  });

  // ── Delete Session (for archive management) ────────────────────
  ipcMain.handle('icount:deleteSession', async (_e, sessionId: number) => {
    try {
      const raw = db();

      const countSession: any = raw.prepare('SELECT status FROM inventory_count_sessions WHERE id = ?').get(sessionId);
      if (!countSession) return { success: false, error: 'الجلسة غير موجودة' };
      if (countSession.status === 'counting' || countSession.status === 'reviewing') {
        return { success: false, error: 'لا يمكن حذف جلسة جاري العمل عليها' };
      }

      raw.prepare('DELETE FROM inventory_count_sessions WHERE id = ?').run(sessionId);
      return { success: true };
    } catch (error: any) {
      console.error('[InventoryCount IPC] deleteSession error:', error);
      return { success: false, error: error.message };
    }
  });

  // ── Get Active Session (auto-resume) ─────────────────────────────
  ipcMain.handle('icount:getActiveSession', async () => {
    try {
      const raw = db();
      const session: any = raw.prepare(`
        SELECT s.*, u.full_name as started_by_name
        FROM inventory_count_sessions s
        LEFT JOIN users u ON s.started_by = u.id
        WHERE s.status = 'counting'
        ORDER BY s.id DESC LIMIT 1
      `).get();

      return { success: true, data: session || null };
    } catch (error: any) {
      console.error('[InventoryCount IPC] getActiveSession error:', error);
      return { success: false, error: error.message };
    }
  });

  console.log('[IPC] Inventory Count handlers registered');
}