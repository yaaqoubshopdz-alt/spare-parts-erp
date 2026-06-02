/**
 * Categories, Brands, Units IPC — بيانات مرجعية
 */
import { ipcMain } from 'electron';
import { DatabaseService } from '../services/database.service';

export function registerCatalogIPC() {
  const db = () => DatabaseService.getRawDb();

  // ═══════════ CATEGORIES ═══════════
  ipcMain.handle('db:categories:getAll', async () => {
    try {
      const categories = db().prepare(`
        SELECT c.*, p.name as parent_name
        FROM categories c
        LEFT JOIN categories p ON c.parent_id = p.id
        ORDER BY c.sort_order ASC, c.name ASC
      `).all();
      return { success: true, data: categories };
    } catch (e: any) { return { success: false, error: e.message }; }
  });

  ipcMain.handle('db:categories:create', async (_e, data: { name: string; name_fr?: string; parent_id?: number; sort_order?: number }) => {
    try {
      const result = db().prepare(
        "INSERT INTO categories (name, name_fr, parent_id, sort_order, is_active) VALUES (?, ?, ?, ?, 1)"
      ).run(data.name, data.name_fr || null, data.parent_id || null, data.sort_order || 0);
      return { success: true, id: result.lastInsertRowid };
    } catch (e: any) { return { success: false, error: e.message }; }
  });

  ipcMain.handle('db:categories:update', async (_e, id: number, data: Record<string, any>) => {
    try {
      const fields = ['name', 'name_fr', 'parent_id', 'sort_order', 'is_active'].filter(f => data[f] !== undefined);
      if (!fields.length) return { success: false, error: 'لا توجد تعديلات' };
      const set = fields.map(f => `${f} = ?`).join(', ');
      const vals = fields.map(f => data[f]);
      db().prepare(`UPDATE categories SET ${set} WHERE id = ?`).run(...vals, id);
      return { success: true };
    } catch (e: any) { return { success: false, error: e.message }; }
  });

  ipcMain.handle('db:categories:delete', async (_e, id: number) => {
    try {
      const raw = db();
      const hasProducts: any = raw.prepare('SELECT COUNT(*) as c FROM products WHERE category_id = ?').get(id);
      if (hasProducts.c > 0) return { success: false, error: 'لا يمكن حذف تصنيف مرتبط بمنتجات' };
      raw.prepare('UPDATE categories SET is_active = 0 WHERE id = ?').run(id);
      return { success: true };
    } catch (e: any) { return { success: false, error: e.message }; }
  });

  // ═══════════ BRANDS ═══════════
  ipcMain.handle('db:brands:getAll', async () => {
    try {
      return { success: true, data: db().prepare('SELECT * FROM brands ORDER BY name ASC').all() };
    } catch (e: any) { return { success: false, error: e.message }; }
  });

  ipcMain.handle('db:brands:create', async (_e, data: { name: string }) => {
    try {
      const result = db().prepare("INSERT INTO brands (name, is_active) VALUES (?, 1)").run(data.name);
      return { success: true, id: result.lastInsertRowid };
    } catch (e: any) { return { success: false, error: e.message }; }
  });

  ipcMain.handle('db:brands:update', async (_e, id: number, data: { name?: string; is_active?: boolean }) => {
    try {
      if (data.name !== undefined) db().prepare('UPDATE brands SET name = ? WHERE id = ?').run(data.name, id);
      if (data.is_active !== undefined) db().prepare('UPDATE brands SET is_active = ? WHERE id = ?').run(data.is_active ? 1 : 0, id);
      return { success: true };
    } catch (e: any) { return { success: false, error: e.message }; }
  });

  ipcMain.handle('db:brands:delete', async (_e, id: number) => {
    try {
      const has: any = db().prepare('SELECT COUNT(*) as c FROM products WHERE brand_id = ?').get(id);
      if (has.c > 0) return { success: false, error: 'لا يمكن حذف ماركة مرتبطة بمنتجات' };
      db().prepare('UPDATE brands SET is_active = 0 WHERE id = ?').run(id);
      return { success: true };
    } catch (e: any) { return { success: false, error: e.message }; }
  });

  // ═══════════ UNITS ═══════════
  ipcMain.handle('db:units:getAll', async () => {
    try {
      return { success: true, data: db().prepare('SELECT * FROM units ORDER BY name ASC').all() };
    } catch (e: any) { return { success: false, error: e.message }; }
  });

  ipcMain.handle('db:units:create', async (_e, data: { code: string; name: string; symbol?: string }) => {
    try {
      const result = db().prepare("INSERT INTO units (code, name, symbol, factor_to_base, is_active) VALUES (?, ?, ?, 1, 1)")
        .run(data.code, data.name, data.symbol || null);
      return { success: true, id: result.lastInsertRowid };
    } catch (e: any) { return { success: false, error: e.message }; }
  });

  // ═══════════ LOCATIONS ═══════════
  ipcMain.handle('db:locations:getAll', async () => {
    try {
      return { success: true, data: db().prepare('SELECT * FROM locations ORDER BY id ASC').all() };
    } catch (e: any) { return { success: false, error: e.message }; }
  });

  console.log('[IPC] Catalog handlers registered (categories, brands, units, locations)');
}
