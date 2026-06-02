/**
 * Vehicles IPC — معالجة ماركات السيارات، الموديلات، وربطها بالقطع (Fitments)
 * أسماء الأعمدة: vehicle_brand_id, vehicle_model_id, year_from, year_to
 */
import { ipcMain } from 'electron';
import { DatabaseService } from '../services/database.service';

export function registerVehiclesIPC() {
  const db = () => DatabaseService.getRawDb();

  // ── Brands ────────────────────────────────────────────────────────
  ipcMain.handle('db:vehicles:getBrands', async () => {
    try {
      const brands = db().prepare('SELECT * FROM vehicle_brands ORDER BY name ASC').all();
      return { success: true, data: brands };
    } catch (e: any) { return { success: false, error: e.message }; }
  });

  ipcMain.handle('db:vehicles:createBrand', async (_e, name: string) => {
    try {
      const res = db().prepare('INSERT INTO vehicle_brands (name) VALUES (?)').run(name);
      return { success: true, id: res.lastInsertRowid };
    } catch (e: any) { return { success: false, error: e.message }; }
  });

  // ── Models ────────────────────────────────────────────────────────
  ipcMain.handle('db:vehicles:getModels', async (_e, brandId?: number) => {
    try {
      let query = `
        SELECT m.*, b.name as brand_name 
        FROM vehicle_models m
        LEFT JOIN vehicle_brands b ON m.vehicle_brand_id = b.id
      `;
      const params = [];
      if (brandId) {
        query += ' WHERE m.vehicle_brand_id = ?';
        params.push(brandId);
      }
      query += ' ORDER BY b.name ASC, m.name ASC';
      const models = db().prepare(query).all(...params);
      return { success: true, data: models };
    } catch (e: any) { return { success: false, error: e.message }; }
  });

  ipcMain.handle('db:vehicles:createModel', async (_e, data: { brand_id: number; name: string; year_from?: number; year_to?: number }) => {
    try {
      const res = db().prepare(`
        INSERT INTO vehicle_models (vehicle_brand_id, name, year_from, year_to) 
        VALUES (?, ?, ?, ?)
      `).run(data.brand_id, data.name, data.year_from || null, data.year_to || null);
      return { success: true, id: res.lastInsertRowid };
    } catch (e: any) { return { success: false, error: e.message }; }
  });

  ipcMain.handle('db:fitments:getByProduct', async (_e, productId: number) => {
    try {
      const fitments = db().prepare(`
        SELECT pf.*, 
               m.name as model_name, b.name as brand_name,
               m.name as vehicle_model_name, b.name as vehicle_brand_name,
               m.year_from, m.year_to
        FROM product_fitments pf
        LEFT JOIN vehicle_models m ON pf.vehicle_model_id = m.id
        LEFT JOIN vehicle_brands b ON m.vehicle_brand_id = b.id
        WHERE pf.product_id = ?
      `).all(productId);
      return { success: true, data: fitments };
    } catch (e: any) { return { success: false, error: e.message }; }
  });

  ipcMain.handle('db:fitments:create', async (_e, data: { product_id: number; model_id: number; notes?: string }) => {
    try {
      const raw = db();
      const product = raw.prepare('SELECT barcode, name FROM products WHERE id = ?').get(data.product_id) as { barcode: string | null; name: string } | undefined;
      const barcode = product?.barcode || null;
      const name = product?.name || 'Unknown Product';

      const res = raw.prepare(`
        INSERT INTO product_fitments (product_id, product_barcode, product_name, vehicle_model_id, vehicle_brand_id, notes) 
        VALUES (?, ?, ?, ?, (SELECT vehicle_brand_id FROM vehicle_models WHERE id = ?), ?)
      `).run(data.product_id, barcode, name, data.model_id, data.model_id, data.notes || null);
      return { success: true, id: res.lastInsertRowid };
    } catch (e: any) { 
      if (e.message.includes('UNIQUE')) return { success: false, error: 'هذا المنتج مربوط بالفعل بهذه المركبة' };
      return { success: false, error: e.message }; 
    }
  });

  ipcMain.handle('db:fitments:delete', async (_e, id: number) => {
    try {
      db().prepare('DELETE FROM product_fitments WHERE id = ?').run(id);
      return { success: true };
    } catch (e: any) { return { success: false, error: e.message }; }
  });

  ipcMain.handle('db:fitments:toggleForProduct', async (_e, data: {
    product_id: number;
    vehicle_brand_id: number;
    vehicle_model_id: number;
  }) => {
    try {
      const raw = db();
      const existing: any = raw.prepare(
        'SELECT id FROM product_fitments WHERE product_id = ? AND vehicle_brand_id = ? AND vehicle_model_id = ?'
      ).get(data.product_id, data.vehicle_brand_id, data.vehicle_model_id);

      if (existing) {
        raw.prepare('DELETE FROM product_fitments WHERE id = ?').run(existing.id);
        return { success: true, action: 'removed' };
      } else {
        const product = raw.prepare('SELECT barcode, name FROM products WHERE id = ?').get(data.product_id) as { barcode: string | null; name: string } | undefined;
        const barcode = product?.barcode || null;
        const name = product?.name || 'Unknown Product';

        const res = raw.prepare(
          'INSERT INTO product_fitments (product_id, product_barcode, product_name, vehicle_brand_id, vehicle_model_id) VALUES (?, ?, ?, ?, ?)'
        ).run(data.product_id, barcode, name, data.vehicle_brand_id, data.vehicle_model_id);
        return { success: true, action: 'added', id: res.lastInsertRowid };
      }
    } catch (e: any) { return { success: false, error: e.message }; }
  });

  // ── Smart Suggestions (learn from similar products) ────────
  ipcMain.handle('db:fitments:suggestForProduct', async (_e, productId: number) => {
    try {
      const raw = db();
      // Get the product's category and brand
      const product: any = raw.prepare('SELECT category_id, brand_id FROM products WHERE id = ?').get(productId);
      if (!product) return { success: true, data: [] };

      // Find fitments from products in the same category+brand that this product doesn't have
      const suggestions = raw.prepare(`
        SELECT DISTINCT pf.vehicle_brand_id, pf.vehicle_model_id,
               vb.name as vehicle_brand_name, vm.name as vehicle_model_name,
               vm.year_from, vm.year_to,
               COUNT(DISTINCT pf.product_id) as used_by_count
        FROM product_fitments pf
        JOIN products p ON pf.product_id = p.id
        LEFT JOIN vehicle_brands vb ON pf.vehicle_brand_id = vb.id
        LEFT JOIN vehicle_models vm ON pf.vehicle_model_id = vm.id
        WHERE p.category_id = ? AND p.brand_id = ? AND p.id != ?
          AND NOT EXISTS (
            SELECT 1 FROM product_fitments pf2
            WHERE pf2.product_id = ? AND pf2.vehicle_brand_id = pf.vehicle_brand_id AND pf2.vehicle_model_id = pf.vehicle_model_id
          )
        GROUP BY pf.vehicle_brand_id, pf.vehicle_model_id
        ORDER BY used_by_count DESC
        LIMIT 10
      `).all(product.category_id, product.brand_id, productId, productId);

      return { success: true, data: suggestions };
    } catch (e: any) { return { success: false, error: e.message }; }
  });

  // ── Parse And Create Vehicle (Smart String parsing) ──────
  ipcMain.handle('db:vehicles:parseAndCreate', async (_e, input: string) => {
    try {
      const raw = db();
      const parts = input.trim().split(/\s+/);
      if (parts.length < 2) {
        return { success: false, error: 'الرجاء إدخال اسم الماركة والموديل على الأقل (مثال: تويوتا كورولا)' };
      }

      const brandName = parts[0];
      const modelName = parts.slice(1).join(' ');

      raw.exec('BEGIN TRANSACTION');
      try {
        // 1. Find or create Brand
        let brandId: number;
        let brandRow = raw.prepare('SELECT id FROM vehicle_brands WHERE name COLLATE NOCASE = ?').get(brandName) as { id: number } | undefined;
        
        if (brandRow) {
          brandId = brandRow.id;
        } else {
          const insertBrand = raw.prepare('INSERT INTO vehicle_brands (name) VALUES (?)').run(brandName);
          brandId = insertBrand.lastInsertRowid as number;
        }

        // 2. Find or create Model
        let modelId: number;
        let modelRow = raw.prepare('SELECT id FROM vehicle_models WHERE vehicle_brand_id = ? AND name COLLATE NOCASE = ?').get(brandId, modelName) as { id: number } | undefined;
        
        if (modelRow) {
          modelId = modelRow.id;
        } else {
          const insertModel = raw.prepare('INSERT INTO vehicle_models (vehicle_brand_id, name) VALUES (?, ?)').run(brandId, modelName);
          modelId = insertModel.lastInsertRowid as number;
        }

        raw.exec('COMMIT');
        return { 
          success: true, 
          data: {
            vehicle_brand_id: brandId,
            vehicle_model_id: modelId,
            vehicle_brand_name: brandName,
            vehicle_model_name: modelName
          }
        };
      } catch (err) {
        raw.exec('ROLLBACK');
        throw err;
      }
    } catch (e: any) { 
      return { success: false, error: e.message }; 
    }
  });

  // ── Update Brand ──────────────────────────────────────────
  ipcMain.handle('db:vehicles:updateBrand', async (_e, idOrData: any, name?: string) => {
    try {
      let id = idOrData;
      let brandName = name;
      if (typeof idOrData === 'object' && idOrData !== null) {
        id = idOrData.id;
        brandName = idOrData.name;
      }
      db().prepare('UPDATE vehicle_brands SET name = ? WHERE id = ?').run(brandName, id);
      return { success: true };
    } catch (e: any) { return { success: false, error: e.message }; }
  });

  // ── Delete Brand ──────────────────────────────────────────
  ipcMain.handle('db:vehicles:deleteBrand', async (_e, id: number) => {
    try {
      const raw = db();
      const linked: any = raw.prepare(
        'SELECT COUNT(*) as cnt FROM product_fitments WHERE vehicle_brand_id = ?'
      ).get(id);
      if (linked.cnt > 0) {
        return { success: false, error: `لا يمكن الحذف — هذه الماركة مرتبطة بـ ${linked.cnt} قطعة` };
      }
      // Delete models first, then brand
      raw.prepare('DELETE FROM vehicle_models WHERE vehicle_brand_id = ?').run(id);
      raw.prepare('DELETE FROM vehicle_brands WHERE id = ?').run(id);
      return { success: true };
    } catch (e: any) { return { success: false, error: e.message }; }
  });

  // ── Update Model ──────────────────────────────────────────
  ipcMain.handle('db:vehicles:updateModel', async (_e, idOrData: any, data?: { name?: string; year_from?: number; year_to?: number }) => {
    try {
      let id = idOrData;
      let modelData = data;
      if (typeof idOrData === 'object' && idOrData !== null) {
        id = idOrData.id;
        modelData = idOrData;
      }
      const sets: string[] = [];
      const vals: any[] = [];
      if (modelData?.name !== undefined) { sets.push('name = ?'); vals.push(modelData.name); }
      if (modelData?.year_from !== undefined) { sets.push('year_from = ?'); vals.push(modelData.year_from || null); }
      if (modelData?.year_to !== undefined) { sets.push('year_to = ?'); vals.push(modelData.year_to || null); }
      if (sets.length === 0) return { success: false, error: 'لا توجد تعديلات' };
      vals.push(id);
      db().prepare(`UPDATE vehicle_models SET ${sets.join(', ')} WHERE id = ?`).run(...vals);
      return { success: true };
    } catch (e: any) { return { success: false, error: e.message }; }
  });

  // ── Delete Model ──────────────────────────────────────────
  ipcMain.handle('db:vehicles:deleteModel', async (_e, id: number) => {
    try {
      const raw = db();
      const linked: any = raw.prepare(
        'SELECT COUNT(*) as cnt FROM product_fitments WHERE vehicle_model_id = ?'
      ).get(id);
      if (linked.cnt > 0) {
        return { success: false, error: `لا يمكن الحذف — هذا الموديل مرتبط بـ ${linked.cnt} قطعة` };
      }
      raw.prepare('DELETE FROM vehicle_models WHERE id = ?').run(id);
      return { success: true };
    } catch (e: any) { return { success: false, error: e.message }; }
  });

  console.log('[IPC] Vehicles handlers registered');
}
