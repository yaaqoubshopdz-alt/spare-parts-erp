/**
 * Products IPC Handlers — CRUD كامل للمنتجات
 * يعمل مع better-sqlite3 مباشرةً (raw SQL)
 */
import { ipcMain, app } from 'electron';
import fs from 'fs';
import path from 'path';
import { DatabaseService } from '../services/database.service';
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

function normalizeForSpellCheck(str: string): string {
  if (!str) return '';
  return str
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/[ىي]/g, 'ي')
    .replace(/[\u064B-\u0652]/g, '') // remove Arabic diacritics
    .replace(/[^a-zA-Z0-9\u0621-\u064A\s]/g, '') // strip special characters but keep letters & numbers
    .toLowerCase()
    .trim();
}

function getLevenshteinDistance(a: string, b: string): number {
  const tmp = [];
  for (let i = 0; i <= a.length; i++) tmp[i] = [i];
  for (let j = 0; j <= b.length; j++) tmp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      tmp[i][j] = a[i - 1] === b[j - 1] 
        ? tmp[i - 1][j - 1] 
        : Math.min(tmp[i - 1][j - 1] + 1, tmp[i - 1][j] + 1, tmp[i][j - 1] + 1);
    }
  }
  return tmp[a.length][b.length];
}

function extractPartName(fullName: string, vehicleNames: Set<string>, brandNames: Set<string>): string {
  if (!fullName) return '';
  // Split by common separators
  const segments = fullName.split(/[\*\-\|\|\(\[\/]/);
  const candidate = segments[0].trim();
  
  const words = candidate.split(/\s+/);
  const filtered = words.filter(word => {
    const clean = word.toLowerCase().replace(/['".,-\/]/g, '').trim();
    if (!clean) return false;
    if (vehicleNames.has(clean) || brandNames.has(clean)) return false;
    if (/^\d{4}$/.test(clean)) return false;
    if (/^[0-9a-zA-Z\-]{5,}$/.test(clean) && /[a-zA-Z]/.test(clean) && /[0-9]/.test(clean)) return false;
    return true;
  });
  
  return filtered.join(' ').trim();
}

export function registerProductsIPC() {
  const db = () => DatabaseService.getRawDb();

  const SORT_MAP_PRODUCTS: Record<string, string> = {
    barcode: 'p.barcode',
    internal_code: 'p.internal_code',
    name: 'p.name',
    purchase_price: 'p.purchase_price',
    retail_price: 'p.retail_price',
    total_stock: 'sb.quantity',
    category_name: 'c.name',
  };

  // ── Get All Products ───────────────────────────────────────
  ipcMain.handle('db:products:getAll', async (_e, filters?: {
    search?: string;
    category_id?: number;
    brand_id?: number;
    is_active?: boolean;
    page?: number;
    limit?: number;
    sortKey?: string;
    sortDir?: string;
  }) => {
    try {
      const raw = db();
      let where = 'WHERE 1=1';
      const params: any[] = [];

      if (filters?.search && filters.search.trim()) {
        const query = filters.search;
        const ftsQuery = compileFTS5Query(query);
        let matchingIds: number[] = [];
        if (ftsQuery) {
          try {
            const matches = raw.prepare(`
              SELECT product_id 
              FROM product_search_fts 
              WHERE product_search_fts MATCH ? 
              LIMIT 500
            `).all(ftsQuery) as any[];
            matchingIds = matches.map(m => m.product_id);
          } catch (ftsError) {
            console.error('[Products IPC] getAll FTS match error:', ftsError);
          }
        }

        if (matchingIds.length > 0) {
          where += ` AND (p.id IN (${matchingIds.join(',')}) OR p.barcode = ? OR p.internal_code = ? OR p.id IN (SELECT product_id FROM product_barcodes WHERE barcode = ?))`;
          params.push(query, query, query);
        } else {
          where += ` AND (p.name LIKE ? OR p.name_fr LIKE ? OR p.barcode LIKE ? OR p.internal_code LIKE ? OR p.id IN (SELECT product_id FROM product_barcodes WHERE barcode LIKE ?))`;
          const s = `%${query}%`;
          params.push(s, s, s, s, s);
        }
      }
      if (filters?.category_id) {
        where += ` AND p.category_id = ?`;
        params.push(filters.category_id);
      }
      if (filters?.brand_id) {
        where += ` AND p.brand_id = ?`;
        params.push(filters.brand_id);
      }
      if (filters?.is_active !== undefined) {
        where += ` AND p.is_active = ?`;
        params.push(filters.is_active ? 1 : 0);
      } else {
        where += ` AND p.is_active = 1`;
      }

      // Count total
      const countRow: any = raw.prepare(`SELECT COUNT(*) as total FROM products p ${where}`).get(...params);
      const total = countRow?.total || 0;

      // Pagination
      const page = filters?.page || 1;
      const limit = filters?.limit || 50;
      const offset = (page - 1) * limit;
      const safeCol = SORT_MAP_PRODUCTS[filters?.sortKey || ''] || 'p.id';
      const safeDir = filters?.sortDir === 'desc' ? 'DESC' : 'ASC';

      const products = raw.prepare(`
        SELECT p.*,
               c.name as category_name,
               c.name_fr as category_name_fr,
               b.name as brand_name,
               u.name as unit_name,
               u.symbol as unit_symbol,
               COALESCE(sb.quantity, 0) as total_stock
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        LEFT JOIN brands b ON p.brand_id = b.id
        LEFT JOIN units u ON p.unit_id = u.id
        LEFT JOIN (
          SELECT product_id, SUM(quantity) as quantity
          FROM stock_balances
          GROUP BY product_id
        ) sb ON p.id = sb.product_id
        ${where}
        ORDER BY ${safeCol} ${safeDir}
        LIMIT ? OFFSET ?
      `).all(...params, limit, offset);

      return { success: true, data: products, total, page, limit };
    } catch (error: any) {
      console.error('[Products IPC] getAll error:', error);
      return { success: false, error: error.message };
    }
  });

  // ── Get Product By ID ──────────────────────────────────────
  ipcMain.handle('db:products:getById', async (_e, id: number) => {
    try {
      const raw = db();
      const product = raw.prepare(`
        SELECT p.*,
               c.name as category_name,
               b.name as brand_name,
               u.name as unit_name,
               COALESCE(sb.quantity, 0) as total_stock
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        LEFT JOIN brands b ON p.brand_id = b.id
        LEFT JOIN units u ON p.unit_id = u.id
        LEFT JOIN (
          SELECT product_id, SUM(quantity) as quantity
          FROM stock_balances
          GROUP BY product_id
        ) sb ON p.id = sb.product_id
        WHERE p.id = ?
      `).get(id);

      if (!product) return { success: false, error: 'المنتج غير موجود' };

      // Get barcodes
      const barcodes = raw.prepare('SELECT * FROM product_barcodes WHERE product_id = ?').all(id);

      // Get fitments
      const fitments = raw.prepare(`
        SELECT pf.*, vb.name as vehicle_brand_name, vm.name as vehicle_model_name
        FROM product_fitments pf
        LEFT JOIN vehicle_brands vb ON pf.vehicle_brand_id = vb.id
        LEFT JOIN vehicle_models vm ON pf.vehicle_model_id = vm.id
        WHERE pf.product_id = ?
      `).all(id);

      // Get batches
      const batches = raw.prepare(`
        SELECT pb.*, l.name as location_name
        FROM product_batches pb
        LEFT JOIN locations l ON pb.location_id = l.id
        WHERE pb.product_id = ? AND pb.status != 'closed'
        ORDER BY pb.created_at DESC
      `).all(id);

      return { success: true, data: { ...(product as any), barcodes, fitments, batches } };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  // ── Get Product by Exact Barcode or Code (shortcuts) ───────────
  ipcMain.handle('db:products:getByBarcodeOrCode', async (_e, code: string) => {
    try {
      const raw = db();
      const product = raw.prepare(`
        SELECT p.*,
               u.name as unit_name,
               COALESCE(sb.quantity, 0) as total_stock
        FROM products p
        LEFT JOIN units u ON p.unit_id = u.id
        LEFT JOIN (
          SELECT product_id, SUM(quantity) as quantity
          FROM stock_balances
          GROUP BY product_id
        ) sb ON p.id = sb.product_id
        WHERE p.is_active = 1
          AND (
            p.barcode = ? 
            OR p.internal_code = ? 
            OR p.id IN (SELECT product_id FROM product_barcodes WHERE barcode = ?)
          )
        LIMIT 1
      `).get(code, code, code);

      if (product) {
        return { success: true, data: product };
      }
      return { success: false, error: 'المنتج غير موجود' };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  // ── Search Products (Quick Search with Bulbul FTS5 + exact barcode fallback) ──────
  ipcMain.handle('db:products:search', async (_e, queryOrObj: any, categoryIdParam?: number | null) => {
    try {
      const raw = db();
      let query = '';
      let categoryId: number | null = null;
      if (queryOrObj && typeof queryOrObj === 'object') {
        query = queryOrObj.query || '';
        categoryId = queryOrObj.category_id || null;
      } else {
        query = queryOrObj || '';
        categoryId = categoryIdParam || null;
      }

      if (!query || !query.trim()) {
        return { success: true, data: [] };
      }

      const normQuery = query
        .replace(/[أإآ]/g, 'ا')
        .replace(/ة/g, 'ه')
        .replace(/[\u064B-\u0652]/g, '')
        .toLowerCase()
        .trim();

      // 1. Try matching with FTS5
      const ftsQuery = compileFTS5Query(query);
      let matchingIds: number[] = [];
      if (ftsQuery) {
        try {
          const matches = raw.prepare(`
            SELECT product_id 
            FROM product_search_fts 
            WHERE product_search_fts MATCH ? 
            LIMIT 100
          `).all(ftsQuery) as any[];
          matchingIds = matches.map(m => m.product_id);
        } catch (ftsError) {
          console.error('[Products IPC] FTS match error:', ftsError);
        }
      }

      // 2. Query actual products with matches or fallback
      let where = 'WHERE p.is_active = 1 AND p.is_hidden_from_sales = 0';
      const params: any[] = [];

      if (categoryId) {
        where += ' AND p.category_id = ?';
        params.push(categoryId);
      }

      if (matchingIds.length > 0) {
        // If FTS has matches, match by FTS product IDs or exact barcode/internal_code (in case of direct scan)
        where += ` AND (p.id IN (${matchingIds.join(',')}) OR p.barcode = ? OR p.internal_code = ? OR p.id IN (SELECT product_id FROM product_barcodes WHERE barcode = ?))`;
        params.push(query, query, query);
      } else {
        // If no FTS matches found, do standard LIKE fallback
        where += ` AND (p.name LIKE ? OR p.name_fr LIKE ? OR p.barcode LIKE ? OR p.internal_code LIKE ? OR p.id IN (SELECT product_id FROM product_barcodes WHERE barcode LIKE ?))`;
        const s = `%${query}%`;
        params.push(s, s, s, s, s);
      }

      const products = raw.prepare(`
        SELECT p.id, p.barcode, p.internal_code, p.name, p.name_fr,
               p.purchase_price, p.wholesale_price, p.retail_price,
               p.unit_id, u.name as unit_name,
               COALESCE(sb.quantity, 0) as total_stock,
               COALESCE(su.usage_count, 0) as term_usage,
               COALESCE(pu.usage_count, 0) as global_usage
        FROM products p
        LEFT JOIN units u ON p.unit_id = u.id
        LEFT JOIN categories c ON p.category_id = c.id
        LEFT JOIN (
          SELECT product_id, SUM(quantity) as quantity
          FROM stock_balances
          GROUP BY product_id
        ) sb ON p.id = sb.product_id
        LEFT JOIN search_usage su ON su.product_id = p.id AND su.search_term = ?
        LEFT JOIN product_usage pu ON pu.product_id = p.id
        ${where}
        ORDER BY 
          term_usage DESC,
          global_usage DESC,
          (CASE WHEN p.barcode = ? OR p.internal_code = ? THEN 0 ELSE 1 END) ASC,
          (CASE WHEN p.name LIKE ? THEN 0 ELSE 1 END) ASC,
          p.name ASC
        LIMIT 30
      `).all(normQuery, ...params, query, query, `%${query}%`);

      return { success: true, data: products };
    } catch (error: any) {
      console.error('[Products IPC] Smart search error:', error);
      return { success: false, error: error.message };
    }
  });

  // ── Record Usage (Self-Learning logging) ──────
  ipcMain.handle('db:products:recordUsage', async (_e, data: { query: string; productId: number }) => {
    try {
      const raw = db();
      const { query, productId } = data;
      if (!productId) return { success: false, error: 'Product ID is required' };

      // Get product details for name and barcode
      const product = raw.prepare("SELECT barcode, internal_code, name FROM products WHERE id = ?").get(productId) as { barcode?: string; internal_code?: string; name: string } | undefined;
      if (!product) return { success: false, error: 'Product not found' };

      const productName = product.name;
      const productBarcode = product.barcode || product.internal_code || null;

      // 1. Record global product usage
      const existingProductUsage = raw.prepare(`
        SELECT id, usage_count FROM product_usage 
        WHERE product_name = ? AND (product_barcode = ? OR (product_barcode IS NULL AND ? IS NULL))
      `).get(productName, productBarcode, productBarcode) as { id: number; usage_count: number } | undefined;

      if (existingProductUsage) {
        raw.prepare(`
          UPDATE product_usage 
          SET product_id = ?, usage_count = usage_count + 1, last_used_at = datetime('now')
          WHERE id = ?
        `).run(productId, existingProductUsage.id);
      } else {
        raw.prepare(`
          INSERT INTO product_usage (product_id, product_barcode, product_name, usage_count, last_used_at)
          VALUES (?, ?, ?, 1, datetime('now'))
        `).run(productId, productBarcode, productName);
      }

      // 2. Record search term usage
      if (query && query.trim()) {
        const normQuery = query
          .replace(/[أإآ]/g, 'ا')
          .replace(/ة/g, 'ه')
          .replace(/[\u064B-\u0652]/g, '')
          .toLowerCase()
          .trim();

        if (normQuery.length > 0) {
          const existingSearchUsage = raw.prepare(`
            SELECT id, usage_count FROM search_usage 
            WHERE search_term = ? AND product_name = ? AND (product_barcode = ? OR (product_barcode IS NULL AND ? IS NULL))
          `).get(normQuery, productName, productBarcode, productBarcode) as { id: number; usage_count: number } | undefined;

          if (existingSearchUsage) {
            raw.prepare(`
              UPDATE search_usage 
              SET product_id = ?, usage_count = usage_count + 1, last_used_at = datetime('now')
              WHERE id = ?
            `).run(productId, existingSearchUsage.id);
          } else {
            raw.prepare(`
              INSERT INTO search_usage (search_term, product_id, product_barcode, product_name, usage_count, last_used_at)
              VALUES (?, ?, ?, ?, 1, datetime('now'))
            `).run(normQuery, productId, productBarcode, productName);
          }
        }
      }
      return { success: true };
    } catch (error: any) {
      console.error('[Products IPC] Record usage error:', error);
      return { success: false, error: error.message };
    }
  });

  // ── Autocomplete Suggestions (NEW) ──────
  ipcMain.handle('db:products:suggest', async (_e, data: { query: string; category_id?: number | null }) => {
    try {
      const raw = db();
      const { query, category_id } = data;
      if (!query || !query.trim()) {
        return { success: true, data: [] };
      }

      const normQuery = normalizeForSpellCheck(query);
      if (!normQuery) {
        return { success: true, data: [] };
      }

      // 1. Fetch vehicle brands, models, and product brands to clean up suggestions
      const vehicleBrands = raw.prepare('SELECT name FROM vehicle_brands WHERE is_active = 1').all() as { name: string }[];
      const vehicleModels = raw.prepare('SELECT name FROM vehicle_models WHERE is_active = 1').all() as { name: string }[];
      const productBrands = raw.prepare('SELECT name FROM brands WHERE is_active = 1').all() as { name: string }[];

      const vehicleNamesSet = new Set<string>();
      const brandNamesSet = new Set<string>();

      for (const b of vehicleBrands) {
        vehicleNamesSet.add(b.name.toLowerCase().trim());
        vehicleNamesSet.add(normalizeForSpellCheck(b.name));
      }
      for (const m of vehicleModels) {
        vehicleNamesSet.add(m.name.toLowerCase().trim());
        vehicleNamesSet.add(normalizeForSpellCheck(m.name));
        // Split model name into individual words if it contains spaces (e.g. "Land Cruiser")
        const parts = m.name.toLowerCase().split(/\s+/);
        for (const part of parts) {
          if (part.length > 2) {
            vehicleNamesSet.add(part);
            vehicleNamesSet.add(normalizeForSpellCheck(part));
          }
        }
      }
      for (const pb of productBrands) {
        brandNamesSet.add(pb.name.toLowerCase().trim());
        brandNamesSet.add(normalizeForSpellCheck(pb.name));
      }

      // Add common vehicle names/brands hardcoded for safety
      const commonVehicles = ['toyota', 'mazda', 'hyundai', 'kia', 'peugeot', 'renault', 'chevrolet', 'ford', 'nissan', 'honda', 'suzuki', 'mitsubishi', 'mercedes', 'bmw', 'audi', 'volkswagen', 'fiat', 'dacia', 'golf', 'accent', 'corolla', 'civic', 'clio', 'megane', 'ibiza', 'leon', 'octavia', 'yaris', 'tucson', 'sportage', 'picanto', 'atos', 'spark', 'cruze', 'aveo', 'optra', 'symbol', 'logan', 'duster', 'sandero', 'stepway', 'hilux', 'amarok', 'ranger', 'l200', 'navara', 'transit', 'boxer', 'jumper', 'master', 'ducato', 'partner', 'berlingo', 'caddy', 'kangoo'];
      for (const v of commonVehicles) {
        vehicleNamesSet.add(v);
      }

      // Fetch category ID to category name mapping
      const categoryRows = raw.prepare('SELECT id, name, name_fr FROM categories WHERE is_active = 1').all() as { id: number; name: string; name_fr: string }[];
      const categoryNameToIdMap = new Map<string, number>();
      for (const row of categoryRows) {
        categoryNameToIdMap.set(row.name.toLowerCase().trim(), row.id);
        if (row.name_fr) {
          categoryNameToIdMap.set(row.name_fr.toLowerCase().trim(), row.id);
        }
      }

      // 2. Fetch and build candidate list
      interface Candidate {
        original: string;
        normalized: string;
        source: 'dict' | 'product' | 'category';
        category_id?: number | null;
      }

      const candidatesMap = new Map<string, Candidate>();

      const addCandidate = (original: string, source: 'dict' | 'product' | 'category', catId?: number | null) => {
        const clean = extractPartName(original, vehicleNamesSet, brandNamesSet);
        if (!clean || clean.length < 2) return;
        const norm = normalizeForSpellCheck(clean);
        if (!norm) return;
        if (!candidatesMap.has(norm)) {
          candidatesMap.set(norm, { original: clean, normalized: norm, source, category_id: catId });
        }
      };

      // A. Standard search dictionary
      const dictRows = raw.prepare('SELECT term, category FROM search_dictionary').all() as { term: string; category: string }[];
      for (const row of dictRows) {
        const catId = categoryNameToIdMap.get(row.category.toLowerCase().trim()) || null;
        addCandidate(row.term, 'dict', catId);
      }

      // B. Products from current inventory (to learn from active inventory)
      const prodRows = raw.prepare('SELECT name, name_fr, category_id FROM products WHERE is_active = 1 AND is_hidden_from_sales = 0').all() as { name: string; name_fr?: string; category_id?: number | null }[];
      for (const row of prodRows) {
        addCandidate(row.name, 'product', row.category_id);
        if (row.name_fr) {
          addCandidate(row.name_fr, 'product', row.category_id);
        }
      }

      // C. Category names
      for (const row of categoryRows) {
        addCandidate(row.name, 'category', row.id);
        if (row.name_fr) {
          addCandidate(row.name_fr, 'category', row.id);
        }
      }

      // 3. Typo-to-selection historical learning (search_usage)
      const searchUsages = raw.prepare(`
        SELECT search_term, product_id, product_name, usage_count 
        FROM search_usage 
        WHERE usage_count >= 1
      `).all() as { search_term: string; product_id: number; product_name: string; usage_count: number }[];

      const usageLearningMap = new Map<string, { term: string; count: number }[]>();
      for (const usage of searchUsages) {
        const termNorm = normalizeForSpellCheck(usage.search_term);
        const partName = extractPartName(usage.product_name, vehicleNamesSet, brandNamesSet);
        if (!partName) continue;
        const normPart = normalizeForSpellCheck(partName);
        if (!normPart) continue;

        const list = usageLearningMap.get(termNorm) || [];
        list.push({ term: partName, count: usage.usage_count });
        usageLearningMap.set(termNorm, list);
      }

      // 4. Score and filter candidates
      const scoredCandidates: { candidate: Candidate; score: number }[] = [];

      for (const [norm, candidate] of candidatesMap.entries()) {
        // Filter by category_id if provided
        if (category_id && candidate.category_id && candidate.category_id !== category_id) {
          continue;
        }

        let score = 0;
        
        // Match query to candidate term
        const candNorm = candidate.normalized;
        if (candNorm === normQuery) {
          score += 150; // Perfect match
        } else if (candNorm.startsWith(normQuery)) {
          score += 100 - (candNorm.length - normQuery.length); // Prefix match
        } else {
          // Word level match
          const candWords = candNorm.split(/\s+/);
          let bestWordScore = 0;
          for (const word of candWords) {
            if (word === normQuery) {
              bestWordScore = Math.max(bestWordScore, 80);
            } else if (word.startsWith(normQuery)) {
              bestWordScore = Math.max(bestWordScore, 60 - (word.length - normQuery.length));
            } else if (normQuery.length >= 3) {
              // Fuzzy prefix edit distance (e.g. "plaket" vs "plaquet...")
              const wordPrefix = word.substring(0, normQuery.length);
              const distPrefix = getLevenshteinDistance(normQuery, wordPrefix);
              if (distPrefix <= 1) {
                bestWordScore = Math.max(bestWordScore, 50 - distPrefix * 10);
              }
              // Fuzzy whole word edit distance
              const distWhole = getLevenshteinDistance(normQuery, word);
              if (distWhole <= 2) {
                bestWordScore = Math.max(bestWordScore, 40 - distWhole * 10);
              }
            }
          }
          score += bestWordScore;
        }

        // Apply dynamic boost from spelling learning (search_usage)
        // If the user's normalized query (or a term very similar to it) was historically used
        // to select this candidate, boost its score based on user selection frequency.
        for (const [historicalTermNorm, associations] of usageLearningMap.entries()) {
          // Exact or fuzzy match between current input and historical search term
          let isMatch = false;
          let boostMultiplier = 1;
          if (historicalTermNorm === normQuery) {
            isMatch = true;
            boostMultiplier = 2.0;
          } else if (historicalTermNorm.startsWith(normQuery)) {
            isMatch = true;
            boostMultiplier = 1.5;
          } else if (normQuery.length >= 3 && getLevenshteinDistance(normQuery, historicalTermNorm) <= 1) {
            isMatch = true;
            boostMultiplier = 1.2;
          }

          if (isMatch) {
            for (const assoc of associations) {
              const assocNorm = normalizeForSpellCheck(assoc.term);
              if (assocNorm === candNorm) {
                // Boost score!
                score += assoc.count * 15 * boostMultiplier;
              }
            }
          }
        }

        // Only include if there is some level of match/score
        if (score > 0) {
          // Slight bias based on source (dictionary & categories are verified standard terms)
          if (candidate.source === 'category') score += 10;
          if (candidate.source === 'dict') score += 5;
          
          scoredCandidates.push({ candidate, score });
        }
      }

      // Sort by score descending, then by length ascending
      scoredCandidates.sort((a, b) => {
        if (Math.abs(a.score - b.score) > 0.001) {
          return b.score - a.score;
        }
        return a.candidate.original.length - b.candidate.original.length;
      });

      const uniqueResults = new Set<string>();
      const resultList: string[] = [];

      for (const item of scoredCandidates) {
        const word = item.candidate.original;
        if (!uniqueResults.has(word.toLowerCase())) {
          uniqueResults.add(word.toLowerCase());
          resultList.push(word);
          if (resultList.length >= 10) break;
        }
      }

      return { success: true, data: resultList };
    } catch (error: any) {
      console.error('[Products IPC] Autocomplete suggest error:', error);
      return { success: false, error: error.message };
    }
  });

  // ── Advanced Search (with Vehicle Fitment Reverse Search) ──
  ipcMain.handle('db:products:advancedSearch', async (_e, filters?: {
    search?: string;
    category_id?: number;
    brand_id?: number;
    vehicle_brand_id?: number;
    vehicle_model_id?: number;
    stock_status?: 'all' | 'in_stock' | 'out_of_stock';
    exclude_hidden?: boolean;
    page?: number;
    limit?: number;
  }) => {
    try {
      const raw = db();
      let where = 'WHERE p.is_active = 1';
      if (filters?.exclude_hidden) where += ' AND p.is_hidden_from_sales = 0';
      const params: any[] = [];

      let normSearch = '';
      if (filters?.search && filters.search.trim()) {
        normSearch = filters.search
          .replace(/[أإآ]/g, 'ا')
          .replace(/ة/g, 'ه')
          .replace(/[\u064B-\u0652]/g, '')
          .toLowerCase()
          .trim();
      }

      if (filters?.search && filters.search.trim()) {
        const query = filters.search;
        const ftsQuery = compileFTS5Query(query);
        let matchingIds: number[] = [];
        if (ftsQuery) {
          try {
            const matches = raw.prepare(`
              SELECT product_id 
              FROM product_search_fts 
              WHERE product_search_fts MATCH ? 
              LIMIT 200
            `).all(ftsQuery) as any[];
            matchingIds = matches.map(m => m.product_id);
          } catch (ftsError) {
            console.error('[Products IPC] advancedSearch FTS match error:', ftsError);
          }
        }

        if (matchingIds.length > 0) {
          where += ` AND (p.id IN (${matchingIds.join(',')}) OR p.barcode = ? OR p.internal_code = ? OR p.id IN (SELECT product_id FROM product_barcodes WHERE barcode = ?))`;
          params.push(query, query, query);
        } else {
          where += ` AND (p.name LIKE ? OR p.name_fr LIKE ? OR p.barcode LIKE ? OR p.internal_code LIKE ? OR p.id IN (SELECT product_id FROM product_barcodes WHERE barcode LIKE ?))`;
          const s = `%${query}%`;
          params.push(s, s, s, s, s);
        }
      }
      if (filters?.category_id) {
        where += ` AND p.category_id = ?`;
        params.push(filters.category_id);
      }
      if (filters?.brand_id) {
        where += ` AND p.brand_id = ?`;
        params.push(filters.brand_id);
      }

      // Reverse search: filter by vehicle
      if (filters?.vehicle_model_id) {
        where += ` AND p.id IN (SELECT product_id FROM product_fitments WHERE vehicle_model_id = ?)`;
        params.push(filters.vehicle_model_id);
      } else if (filters?.vehicle_brand_id) {
        where += ` AND p.id IN (SELECT product_id FROM product_fitments WHERE vehicle_brand_id = ?)`;
        params.push(filters.vehicle_brand_id);
      }

      // Stock status filter
      if (filters?.stock_status === 'in_stock') {
        where += ` AND COALESCE(sb.quantity, 0) > 0`;
      } else if (filters?.stock_status === 'out_of_stock') {
        where += ` AND COALESCE(sb.quantity, 0) <= 0`;
      }

      const countRow: any = raw.prepare(`
        SELECT COUNT(*) as total FROM products p
        LEFT JOIN (SELECT product_id, SUM(quantity) as quantity FROM stock_balances GROUP BY product_id) sb ON p.id = sb.product_id
        ${where}
      `).get(...params);

      const page = filters?.page || 1;
      const limit = filters?.limit || 30;
      const offset = (page - 1) * limit;

      // NOTE: purchase_price intentionally excluded from results
      const products = raw.prepare(`
         SELECT p.id, p.barcode, p.internal_code, p.name, p.name_fr,
               p.wholesale_price, p.retail_price,
               p.category_id, p.brand_id, p.unit_id,
               c.name as category_name,
               b.name as brand_name,
               u.name as unit_name,
               u.symbol as unit_symbol,
               COALESCE(sb.quantity, 0) as total_stock,
               COALESCE(fc.fitment_count, 0) as fitment_count,
               (
                 SELECT GROUP_CONCAT(vb.name || ' ' || vm.name, ' | ') 
                 FROM product_fitments pf
                 JOIN vehicle_models vm ON pf.vehicle_model_id = vm.id
                 JOIN vehicle_brands vb ON vm.vehicle_brand_id = vb.id
                 WHERE pf.product_id = p.id
               ) as fitments_list,
               COALESCE(su.usage_count, 0) as term_usage,
               COALESCE(pu.usage_count, 0) as global_usage
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        LEFT JOIN brands b ON p.brand_id = b.id
        LEFT JOIN units u ON p.unit_id = u.id
        LEFT JOIN (SELECT product_id, SUM(quantity) as quantity FROM stock_balances GROUP BY product_id) sb ON p.id = sb.product_id
        LEFT JOIN (SELECT product_id, COUNT(*) as fitment_count FROM product_fitments GROUP BY product_id) fc ON p.id = fc.product_id
        LEFT JOIN search_usage su ON su.product_id = p.id AND su.search_term = ?
        LEFT JOIN product_usage pu ON pu.product_id = p.id
        ${where}
        ORDER BY 
          term_usage DESC,
          global_usage DESC,
          p.name ASC
        LIMIT ? OFFSET ?
      `).all(normSearch, ...params, limit, offset);

      return { success: true, data: products, total: countRow?.total || 0, page, limit };
    } catch (error: any) {
      console.error('[Products IPC] advancedSearch error:', error);
      return { success: false, error: error.message };
    }
  });

  // ── Create Product ─────────────────────────────────────────
  ipcMain.handle('db:products:create', async (_e, data: {
    barcode?: string;
    internal_code?: string;
    name: string;
    name_fr?: string;
    category_id?: number;
    brand_id?: number;
    unit_id: number;
    has_sub_unit?: boolean;
    pieces_per_box?: number;
    purchase_price: number;
    wholesale_price: number;
    retail_price: number;
    min_stock_level?: number;
    initial_stock?: number;
    is_batch_tracked?: boolean;
    track_expiry?: boolean;
    description?: string;
    additional_barcodes?: string[];
    fitments?: { vehicle_brand_id: number; vehicle_model_id: number }[];
    _user_id?: number;
  }) => {
    try {
      const raw = db();

      // Check barcode uniqueness
      if (data.barcode) {
        const exists: any = raw.prepare('SELECT id FROM products WHERE barcode = ?').get(data.barcode);
        if (exists) return { success: false, error: 'الباركود موجود مسبقاً' };
      }

      raw.exec('BEGIN TRANSACTION');
      try {
        const result = raw.prepare(`
          INSERT INTO products (
          barcode, internal_code, name, name_fr, category_id, brand_id, unit_id,
          has_sub_unit, pieces_per_box,
          purchase_price, wholesale_price, retail_price,
          min_stock_level, is_batch_tracked, track_expiry, description,
          is_active, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, datetime('now'), datetime('now'))
      `).run(
        data.barcode || null,
        data.internal_code || null,
        data.name,
        data.name_fr || null,
        data.category_id || null,
        data.brand_id || null,
        data.unit_id,
        data.has_sub_unit ? 1 : 0,
        data.pieces_per_box || 1,
        data.purchase_price,
        data.wholesale_price,
        data.retail_price,
        data.min_stock_level || 0,
        data.is_batch_tracked ? 1 : 0,
        data.track_expiry ? 1 : 0,
        data.description || null,
      );

        const productId = result.lastInsertRowid;

        // Insert additional barcodes
        if (data.additional_barcodes?.length) {
          const insertBarcode = raw.prepare('INSERT INTO product_barcodes (product_id, barcode, is_primary) VALUES (?, ?, 0)');
          for (const bc of data.additional_barcodes) {
            if (bc.trim()) insertBarcode.run(productId, bc.trim());
          }
        }

        // Insert fitments
        if (data.fitments?.length) {
          const insertFitment = raw.prepare(`
            INSERT INTO product_fitments (product_id, vehicle_brand_id, vehicle_model_id, product_barcode, product_name)
            VALUES (?, ?, ?, (SELECT barcode FROM products WHERE id = ?), (SELECT name FROM products WHERE id = ?))
          `);
          for (const f of data.fitments) {
            insertFitment.run(productId, f.vehicle_brand_id, f.vehicle_model_id, productId, productId);
          }
        }

        // Initialize stock balance at default location (scale if sub-unit product)
        const initialQty = data.has_sub_unit && data.pieces_per_box
          ? (data.initial_stock ?? 0) * (data.pieces_per_box || 1)
          : (data.initial_stock ?? 0);

        raw.prepare(`
          INSERT OR IGNORE INTO stock_balances (product_id, location_id, quantity, updated_at)
          VALUES (?, 1, ?, datetime('now'))
        `).run(productId, initialQty);

        const totalValue = initialQty * (data.purchase_price || 0);
        if (totalValue > 0) {
          AccountingEngine._initAccounts(raw);
          AccountingEngine.createJournalEntry(raw, {
            date: new Date().toISOString().split('T')[0],
            description: `رصيد أول المدة للمنتج: ${data.name}`,
            reference_type: 'initial_stock',
            reference_id: Number(productId),
            user_id: data._user_id || 1,
            lines: [
              { account_id: AccountingEngine.ACCOUNTS.INVENTORY, debit: totalValue, credit: 0 },
              { account_id: AccountingEngine.ACCOUNTS.OTHER_REVENUE, debit: 0, credit: totalValue, party_type: 'product', party_id: Number(productId) }
            ]
          });
        }

        raw.exec('COMMIT');
        
        // Recompile search terms for the new product
        try {
          DatabaseService.recompileProductSearchTerms(Number(productId));
        } catch (e) {
          console.error('[Products IPC] Failed to compile search terms:', e);
        }

        // Heal usage table links to connect any orphan search learnings to this newly created product
        try {
          DatabaseService.healUsageTables();
        } catch (e) {
          console.error('[Products IPC] Failed to heal usage tables on product creation:', e);
        }

        return { success: true, id: productId };
      } catch (err) {
        raw.exec('ROLLBACK');
        throw err;
      }
    } catch (error: any) {
      console.error('[Products IPC] create error:', error);
      return { success: false, error: error.message };
    }
  });

  // ── Update Product ─────────────────────────────────────────
  ipcMain.handle('db:products:update', async (_e, id: number, data: Record<string, any>) => {
    try {
      const raw = db();

      // Check barcode uniqueness if changed
      if (data.barcode) {
        const exists: any = raw.prepare('SELECT id FROM products WHERE barcode = ? AND id != ?').get(data.barcode, id);
        if (exists) return { success: false, error: 'الباركود موجود مسبقاً لمنتج آخر' };
      }

      raw.exec('BEGIN TRANSACTION');

      // Get old product for price history
      const oldProduct: any = raw.prepare('SELECT * FROM products WHERE id = ?').get(id);
      if (!oldProduct) return { success: false, error: 'المنتج غير موجود' };

      // Build SET clause dynamically
      const allowedFields = [
        'barcode', 'internal_code', 'name', 'name_fr',
        'category_id', 'brand_id', 'unit_id', 'has_sub_unit', 'pieces_per_box',
        'purchase_price', 'wholesale_price', 'retail_price',
        'min_stock_level', 'is_batch_tracked', 'track_expiry',
        'description', 'is_active',
      ];
      const setClauses: string[] = [];
      const values: any[] = [];
      for (const field of allowedFields) {
        if (data[field] !== undefined) {
          setClauses.push(`${field} = ?`);
          let val = data[field];
          if (typeof val === 'boolean') {
            val = val ? 1 : 0;
          }
          values.push(val);
        }
      }
      setClauses.push("updated_at = datetime('now')");

      if (setClauses.length > 0) {
        values.push(id);
        raw.prepare(`UPDATE products SET ${setClauses.join(', ')} WHERE id = ?`).run(...values);

        // Record price changes
        const priceFields = ['purchase_price', 'wholesale_price', 'retail_price'];
        const insertPriceHistory = raw.prepare(`
          INSERT INTO price_history (product_id, field_name, old_value, new_value, changed_by, created_at)
          VALUES (?, ?, ?, ?, ?, datetime('now'))
        `);
        for (const pf of priceFields) {
          if (data[pf] !== undefined && data[pf] !== oldProduct[pf]) {
            insertPriceHistory.run(id, pf, oldProduct[pf], data[pf], data._user_id || null);
          }
        }
      }

      // Update fitments if provided
      if (data.fitments !== undefined) {
        // Delete old fitments
        raw.prepare('DELETE FROM product_fitments WHERE product_id = ?').run(id);
        
        // Insert new fitments
        if (Array.isArray(data.fitments) && data.fitments.length > 0) {
          const insertFitment = raw.prepare(`
            INSERT INTO product_fitments (product_id, vehicle_brand_id, vehicle_model_id, product_barcode, product_name)
            VALUES (?, ?, ?, (SELECT barcode FROM products WHERE id = ?), (SELECT name FROM products WHERE id = ?))
          `);
          for (const f of data.fitments) {
            insertFitment.run(id, f.vehicle_brand_id, f.vehicle_model_id, id, id);
          }
        }
      }

      // Propagate name and barcode updates to related tables (fitments, usage, and draft invoices)
      if (data.name !== undefined || data.barcode !== undefined) {
        // 1. Update product_fitments table
        const pfCols: string[] = [];
        const pfVals: any[] = [];
        if (data.name !== undefined) {
          pfCols.push('product_name = ?');
          pfVals.push(data.name);
        }
        if (data.barcode !== undefined) {
          pfCols.push('product_barcode = ?');
          pfVals.push(data.barcode);
        }
        if (pfCols.length > 0) {
          pfVals.push(id);
          raw.prepare(`UPDATE product_fitments SET ${pfCols.join(', ')} WHERE product_id = ?`).run(...pfVals);
        }

        // 2. Update usage tables
        const usageCols: string[] = [];
        const usageVals: any[] = [];
        if (data.name !== undefined) {
          usageCols.push('product_name = ?');
          usageVals.push(data.name);
        }
        if (data.barcode !== undefined) {
          usageCols.push('product_barcode = ?');
          usageVals.push(data.barcode);
        }
        if (usageCols.length > 0) {
          usageVals.push(id);
          raw.prepare(`UPDATE search_usage SET ${usageCols.join(', ')} WHERE product_id = ?`).run(...usageVals);
          raw.prepare(`UPDATE product_usage SET ${usageCols.join(', ')} WHERE product_id = ?`).run(...usageVals);
        }

        // 3. Update snapshots in Draft invoices (Sales & Purchases)
        if (data.name !== undefined) {
          raw.prepare(`
            UPDATE sales_invoice_items 
            SET product_name_snapshot = ? 
            WHERE product_id = ? AND invoice_id IN (SELECT id FROM sales_invoices WHERE status = 'draft')
          `).run(data.name, id);

          raw.prepare(`
            UPDATE purchase_invoice_items 
            SET product_name_snapshot = ? 
            WHERE product_id = ? AND invoice_id IN (SELECT id FROM purchase_invoices WHERE status = 'draft')
          `).run(data.name, id);
        }

        if (data.barcode !== undefined) {
          raw.prepare(`
            UPDATE sales_invoice_items 
            SET product_barcode_snapshot = ? 
            WHERE product_id = ? AND invoice_id IN (SELECT id FROM sales_invoices WHERE status = 'draft')
          `).run(data.barcode, id);
        }
      }

      raw.exec('COMMIT');

      // Recompile search terms for the updated product
      try {
        DatabaseService.recompileProductSearchTerms(id);
      } catch (e) {
        console.error('[Products IPC] Failed to compile search terms on update:', e);
      }

      // Heal usage table links to connect/re-connect search learnings to this updated product
      try {
        DatabaseService.healUsageTables();
      } catch (e) {
        console.error('[Products IPC] Failed to heal usage tables on product update:', e);
      }

      return { success: true };
    } catch (error: any) {
      db().exec('ROLLBACK');
      return { success: false, error: error.message };
    }
  });

  // ── Delete Product (soft) ──────────────────────────────────
  ipcMain.handle('db:products:delete', async (_e, id: number) => {
    try {
      const raw = db();
      raw.prepare("UPDATE products SET is_active = 0, updated_at = datetime('now') WHERE id = ?").run(id);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  // ── Get Low Stock Products ─────────────────────────────────
  const SORT_MAP_LOW_STOCK: Record<string, string> = {
    name: 'p.name',
    barcode: 'p.barcode',
    category_name: 'c.name',
    min_stock_level: 'p.min_stock_level',
    current_stock: 'sb.qty',
    shortage: '(p.min_stock_level - COALESCE(sb.qty, 0))',
  };

  ipcMain.handle('db:products:getLowStock', async (_e, filters?: { category_id?: number, muted?: boolean, sortKey?: string, sortDir?: string }) => {
    try {
      const raw = db();
      let query = `
        SELECT p.id, p.name, p.barcode, p.internal_code,
               p.min_stock_level, p.is_low_stock_muted,
               COALESCE(sb.qty, 0) as current_stock,
               (p.min_stock_level - COALESCE(sb.qty, 0)) as shortage,
               COALESCE(c.name, 'بدون تصنيف') as category_name,
               c.id as category_id
        FROM products p
        LEFT JOIN (
          SELECT product_id, SUM(quantity) as qty
          FROM stock_balances GROUP BY product_id
        ) sb ON p.id = sb.product_id
        LEFT JOIN categories c ON p.category_id = c.id
        WHERE p.is_active = 1
          AND COALESCE(sb.qty, 0) <= p.min_stock_level
          AND p.min_stock_level > 0
      `;
      const params: any[] = [];

      if (filters?.category_id) {
        query += ` AND p.category_id = ?`;
        params.push(filters.category_id);
      }

      if (filters?.muted === false) {
        query += ` AND p.is_low_stock_muted = 0`;
      }

      const safeCol = SORT_MAP_LOW_STOCK[filters?.sortKey || ''];
      if (safeCol && filters?.sortDir) {
        const dir = filters.sortDir === 'desc' ? 'DESC' : 'ASC';
        query += ` ORDER BY ${safeCol} ${dir}`;
      } else {
        query += ` ORDER BY COALESCE(sb.qty, 0) ASC, p.name ASC`;
      }

      const products = raw.prepare(query).all(...params);
      return { success: true, data: products };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  // ── Toggle Mute Low Stock ───────────────────────────────────
  ipcMain.handle('db:products:toggleMuteLowStock', async (_e, productId: number) => {
    try {
      const raw = db();
      const product: any = raw.prepare('SELECT is_low_stock_muted FROM products WHERE id = ?').get(productId);
      if (!product) return { success: false, error: 'المنتج غير موجود' };

      const newVal = product.is_low_stock_muted ? 0 : 1;
      raw.prepare('UPDATE products SET is_low_stock_muted = ?, updated_at = datetime(\'now\') WHERE id = ?').run(newVal, productId);
      return { success: true, data: { is_low_stock_muted: newVal } };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  // ── Get Product Images (NEW) ─────────────────────────────────
  ipcMain.handle('db:products:getImages', async (_e, productId: number) => {
    try {
      const raw = db();
      const images = raw.prepare(`
        SELECT id, file_path as filePath, is_primary as isPrimary, created_at as createdAt
        FROM product_images
        WHERE product_id = ?
        ORDER BY is_primary DESC, created_at DESC
      `).all(productId);
      return { success: true, data: images };
    } catch (error: any) {
      console.error('[Products IPC] Get product images error:', error);
      return { success: false, error: error.message };
    }
  });

  // ── Delete Product Image (NEW) ───────────────────────────────
  ipcMain.handle('db:products:deleteImage', async (_e, id: number) => {
    try {
      const raw = db();
      const img = raw.prepare('SELECT file_path FROM product_images WHERE id = ?').get(id) as { file_path: string } | undefined;
      if (!img) return { success: false, error: 'الصورة غير موجودة' };

      // Delete from database
      raw.prepare('DELETE FROM product_images WHERE id = ?').run(id);

      // Delete from disk
      try {
        const baseDir = path.join(app.getPath('userData'), 'SparePartsERP');
        const filePath = path.join(baseDir, 'product_images', img.file_path);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      } catch (fsErr) {
        console.warn('[Products IPC] Failed to delete file on disk:', fsErr);
      }

      return { success: true };
    } catch (error: any) {
      console.error('[Products IPC] Delete product image error:', error);
      return { success: false, error: error.message };
    }
  });

  console.log('[IPC] Products handlers registered');
}
