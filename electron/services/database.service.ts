/**
 * NF_14 - Database Service
 * إدارة اتصال SQLite + Drizzle ORM + Seed Data
 */
import path from 'path';
import { app } from 'electron';
import Database from 'better-sqlite3';
import { drizzle, BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { sql } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import * as schema from '../../database/schema';

let db: BetterSQLite3Database<typeof schema> | null = null;
let rawDb: Database.Database | null = null;

export const DatabaseService = {
  /**
   * Initialize database connection with WAL mode and foreign keys
   */
  initialize(): BetterSQLite3Database<typeof schema> {
    if (db) return db;

    const dbDir = path.join(app.getPath('userData'), 'SparePartsERP');
    const fs = require('fs');
    if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

    const dbPath = path.join(dbDir, 'spare_parts.db');
    console.log('[DatabaseService] DB path:', dbPath);

    rawDb = new Database(dbPath);
    rawDb.pragma('journal_mode = WAL');
    rawDb.pragma('foreign_keys = ON');
    rawDb.pragma('busy_timeout = 5000');

    // Obligatory DB Diagnostics: PRAGMA integrity_check & PRAGMA foreign_key_check
    try {
      console.log('[DatabaseService] Obligatory DB Diagnostics: PRAGMA integrity_check...');
      const integrityCheck = rawDb.prepare('PRAGMA integrity_check').all();
      console.log('[DatabaseService] Integrity check results:', JSON.stringify(integrityCheck));
      const ok = integrityCheck.some((row: any) => 
        Object.values(row).some(v => String(v).toLowerCase() === 'ok')
      );
      if (!ok) {
        console.warn('[DatabaseService] Database integrity check failed! Attempting recovery via REINDEX...');
        rawDb.exec('REINDEX;');
        const integrityCheck2 = rawDb.prepare('PRAGMA integrity_check').all();
        console.log('[DatabaseService] Integrity check after REINDEX:', JSON.stringify(integrityCheck2));
      }

      console.log('[DatabaseService] Obligatory DB Diagnostics: PRAGMA foreign_key_check...');
      const fkCheck = rawDb.prepare('PRAGMA foreign_key_check').all();
      console.log('[DatabaseService] Foreign key check results:', JSON.stringify(fkCheck));
      if (fkCheck.length > 0) {
        console.warn('[DatabaseService] Foreign key violations detected:', JSON.stringify(fkCheck));
      }
    } catch (e) {
      console.error('[DatabaseService] Error running database diagnostics:', e);
    }

    db = drizzle(rawDb, { schema });

    this.createTables();
    this.migrateDb();
    this.seedData();
    this.seedSearchDictionary();
    this.healUsageTables();

    console.log('[DatabaseService] Initialized successfully');
    return db;
  },

  /**
   * Get Drizzle instance
   */
  getDb(): BetterSQLite3Database<typeof schema> {
    if (!db) throw new Error('Database not initialized');
    return db;
  },

  /**
   * Get raw better-sqlite3 instance for direct queries
   */
  getRawDb(): Database.Database {
    if (!rawDb) throw new Error('Database not initialized');
    return rawDb;
  },

  /**
   * Create all tables using raw SQL (Drizzle push alternative)
   */
  createTables(): void {
    const raw = this.getRawDb();

    raw.exec(`
      -- NF_01: Users
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        full_name TEXT NOT NULL,
        role TEXT NOT NULL CHECK(role IN ('owner','manager','accountant','cashier','storekeeper','employee')),
        is_active INTEGER NOT NULL DEFAULT 1,
        pin_code TEXT,
        avatar TEXT,
        color TEXT,
        permissions TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        last_login TEXT
      );

      -- NF_02: App Settings
      CREATE TABLE IF NOT EXISTS app_settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        key TEXT NOT NULL UNIQUE,
        value TEXT,
        type TEXT NOT NULL CHECK(type IN ('string','number','boolean','json')),
        description TEXT,
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      -- NF_03: Locations
      CREATE TABLE IF NOT EXISTS locations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        code TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        type TEXT NOT NULL CHECK(type IN ('showroom','warehouse','service','returns','damaged')),
        is_active INTEGER NOT NULL DEFAULT 1
      );

      -- NF_04: Units
      CREATE TABLE IF NOT EXISTS units (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        code TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        symbol TEXT,
        base_unit_id INTEGER REFERENCES units(id),
        factor_to_base REAL NOT NULL DEFAULT 1,
        is_active INTEGER NOT NULL DEFAULT 1
      );

      -- NF_05: Categories
      CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        name_fr TEXT,
        parent_id INTEGER REFERENCES categories(id),
        sort_order INTEGER NOT NULL DEFAULT 0,
        is_active INTEGER NOT NULL DEFAULT 1
      );

      -- NF_06: Brands
      CREATE TABLE IF NOT EXISTS brands (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        is_active INTEGER NOT NULL DEFAULT 1
      );

      -- NF_07: Vehicle Brands
      CREATE TABLE IF NOT EXISTS vehicle_brands (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        is_active INTEGER NOT NULL DEFAULT 1
      );

      -- NF_07: Vehicle Models
      CREATE TABLE IF NOT EXISTS vehicle_models (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        vehicle_brand_id INTEGER NOT NULL REFERENCES vehicle_brands(id),
        name TEXT NOT NULL,
        year_from INTEGER,
        year_to INTEGER,
        engine TEXT,
        is_active INTEGER NOT NULL DEFAULT 1
      );

      -- NF_08: Products
      CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        barcode TEXT UNIQUE,
        internal_code TEXT UNIQUE,
        name TEXT NOT NULL,
        name_fr TEXT,
        category_id INTEGER REFERENCES categories(id),
        brand_id INTEGER REFERENCES brands(id),
        unit_id INTEGER NOT NULL REFERENCES units(id),
        has_sub_unit INTEGER NOT NULL DEFAULT 0,
        pieces_per_box REAL NOT NULL DEFAULT 1,
        purchase_price REAL NOT NULL DEFAULT 0,
        wholesale_price REAL NOT NULL DEFAULT 0,
        retail_price REAL NOT NULL DEFAULT 0,
        min_stock_level REAL NOT NULL DEFAULT 0,
        is_batch_tracked INTEGER NOT NULL DEFAULT 0,
        track_expiry INTEGER NOT NULL DEFAULT 0,
        description TEXT,
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      -- NF_08: Product Barcodes
      CREATE TABLE IF NOT EXISTS product_barcodes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        barcode TEXT NOT NULL UNIQUE,
        is_primary INTEGER NOT NULL DEFAULT 0
      );

      -- NF_08: Product Fitments
      CREATE TABLE IF NOT EXISTS product_fitments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        product_id INTEGER REFERENCES products(id),
        product_barcode TEXT,
        product_name TEXT NOT NULL,
        vehicle_brand_id INTEGER NOT NULL REFERENCES vehicle_brands(id),
        vehicle_model_id INTEGER REFERENCES vehicle_models(id),
        year_from INTEGER,
        year_to INTEGER,
        engine TEXT,
        notes TEXT
      );

      -- NF_09: Product Batches
      CREATE TABLE IF NOT EXISTS product_batches (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        product_id INTEGER NOT NULL REFERENCES products(id),
        batch_number TEXT NOT NULL,
        expiry_date TEXT,
        purchase_price REAL NOT NULL DEFAULT 0,
        quantity_initial REAL NOT NULL DEFAULT 0,
        quantity_remaining REAL NOT NULL DEFAULT 0,
        location_id INTEGER NOT NULL REFERENCES locations(id),
        status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open','closed','expired')),
        reference_type TEXT,
        reference_id INTEGER,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      -- NF_09: Stock Balances
      CREATE TABLE IF NOT EXISTS stock_balances (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        product_id INTEGER NOT NULL REFERENCES products(id),
        location_id INTEGER NOT NULL REFERENCES locations(id),
        quantity REAL NOT NULL DEFAULT 0,
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE(product_id, location_id)
      );

      -- NF_09: Stock Movements
      CREATE TABLE IF NOT EXISTS stock_movements (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        product_id INTEGER NOT NULL REFERENCES products(id),
        location_id INTEGER NOT NULL REFERENCES locations(id),
        batch_id INTEGER REFERENCES product_batches(id),
        movement_type TEXT NOT NULL CHECK(movement_type IN ('purchase','sale','sale_return','purchase_return','adjustment','transfer_in','transfer_out','damage','initial')),
        quantity REAL NOT NULL,
        balance_after REAL NOT NULL,
        reference_type TEXT,
        reference_id INTEGER,
        user_id INTEGER REFERENCES users(id),
        notes TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      -- NF_10: Sales Invoices
      CREATE TABLE IF NOT EXISTS sales_invoices (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT UNIQUE,
        invoice_number TEXT NOT NULL UNIQUE,
        sale_type TEXT NOT NULL DEFAULT 'retail' CHECK(sale_type IN ('retail','wholesale')),
        customer_id INTEGER,
        user_id INTEGER REFERENCES users(id),
        date TEXT NOT NULL,
        time TEXT,
        subtotal REAL NOT NULL DEFAULT 0,
        global_discount_type TEXT DEFAULT 'percent',
        global_discount_value REAL DEFAULT 0,
        global_discount_amount REAL DEFAULT 0,
        total_before_tax REAL DEFAULT 0,
        tax_percent REAL DEFAULT 0,
        tax_amount REAL DEFAULT 0,
        total REAL NOT NULL DEFAULT 0,
        paid REAL NOT NULL DEFAULT 0,
        remaining REAL NOT NULL DEFAULT 0,
        payment_method TEXT DEFAULT 'cash',
        status TEXT NOT NULL DEFAULT 'confirmed' CHECK(status IN ('confirmed','cancelled','draft')),
        notes TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      -- NF_10: Sales Invoice Items
      CREATE TABLE IF NOT EXISTS sales_invoice_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        invoice_id INTEGER NOT NULL REFERENCES sales_invoices(id) ON DELETE CASCADE,
        product_id INTEGER NOT NULL REFERENCES products(id),
        batch_id INTEGER REFERENCES product_batches(id),
        product_name_snapshot TEXT NOT NULL,
        product_barcode_snapshot TEXT,
        quantity REAL NOT NULL,
        unit TEXT,
        unit_price REAL NOT NULL,
        cost_price_snapshot REAL NOT NULL DEFAULT 0,
        item_discount_type TEXT DEFAULT 'percent',
        item_discount_value REAL DEFAULT 0,
        item_discount_amount REAL DEFAULT 0,
        total REAL NOT NULL,
        sort_order INTEGER DEFAULT 0
      );

      -- NF_10: Purchase Invoices
      CREATE TABLE IF NOT EXISTS purchase_invoices (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT UNIQUE,
        invoice_number TEXT NOT NULL UNIQUE,
        supplier_invoice_number TEXT,
        supplier_id INTEGER,
        user_id INTEGER REFERENCES users(id),
        date TEXT NOT NULL,
        subtotal REAL NOT NULL DEFAULT 0,
        discount_amount REAL DEFAULT 0,
        tax_amount REAL DEFAULT 0,
        total REAL NOT NULL DEFAULT 0,
        paid REAL NOT NULL DEFAULT 0,
        remaining REAL NOT NULL DEFAULT 0,
        payment_method TEXT DEFAULT 'cash',
        status TEXT NOT NULL DEFAULT 'confirmed' CHECK(status IN ('confirmed','cancelled','draft')),
        notes TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      -- NF_10: Purchase Invoice Items
      CREATE TABLE IF NOT EXISTS purchase_invoice_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        invoice_id INTEGER NOT NULL REFERENCES purchase_invoices(id) ON DELETE CASCADE,
        product_id INTEGER NOT NULL REFERENCES products(id),
        product_name_snapshot TEXT NOT NULL,
        quantity REAL NOT NULL,
        unit TEXT,
        unit_price REAL NOT NULL,
        wholesale_price REAL DEFAULT 0,
        retail_price REAL DEFAULT 0,
        total REAL NOT NULL,
        quantity_remaining REAL
      );

      -- NF_11: Sales Returns
      CREATE TABLE IF NOT EXISTS sales_returns (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT UNIQUE,
        return_number TEXT NOT NULL UNIQUE,
        original_invoice_id INTEGER NOT NULL REFERENCES sales_invoices(id),
        customer_id INTEGER,
        user_id INTEGER REFERENCES users(id),
        date TEXT NOT NULL,
        total REAL NOT NULL DEFAULT 0,
        refund_method TEXT NOT NULL DEFAULT 'credit' CHECK(refund_method IN ('cash','credit','exchange')),
        status TEXT NOT NULL DEFAULT 'confirmed' CHECK(status IN ('confirmed','cancelled')),
        reason TEXT,
        notes TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS sales_return_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        return_id INTEGER NOT NULL REFERENCES sales_returns(id) ON DELETE CASCADE,
        product_id INTEGER NOT NULL REFERENCES products(id),
        batch_id INTEGER REFERENCES product_batches(id),
        product_name_snapshot TEXT NOT NULL,
        quantity REAL NOT NULL,
        unit_price REAL NOT NULL,
        total REAL NOT NULL
      );

      -- NF_11: Purchase Returns
      CREATE TABLE IF NOT EXISTS purchase_returns (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT UNIQUE,
        return_number TEXT NOT NULL UNIQUE,
        original_invoice_id INTEGER NOT NULL REFERENCES purchase_invoices(id),
        supplier_id INTEGER,
        user_id INTEGER REFERENCES users(id),
        date TEXT NOT NULL,
        total REAL NOT NULL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'confirmed' CHECK(status IN ('confirmed','cancelled')),
        reason TEXT,
        notes TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS purchase_return_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        return_id INTEGER NOT NULL REFERENCES purchase_returns(id) ON DELETE CASCADE,
        product_id INTEGER NOT NULL REFERENCES products(id),
        batch_id INTEGER REFERENCES product_batches(id),
        product_name_snapshot TEXT NOT NULL,
        quantity REAL NOT NULL,
        unit_price REAL NOT NULL,
        total REAL NOT NULL
      );

      -- NF_12: Customers
      CREATE TABLE IF NOT EXISTS customers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        code TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        name_fr TEXT,
        phone TEXT,
        phone2 TEXT,
        address TEXT,
        email TEXT,
        balance REAL NOT NULL DEFAULT 0,
        credit_limit REAL DEFAULT 0,
        notes TEXT,
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      -- NF_12: Suppliers
      CREATE TABLE IF NOT EXISTS suppliers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        code TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        name_fr TEXT,
        phone TEXT,
        phone2 TEXT,
        address TEXT,
        email TEXT,
        balance REAL NOT NULL DEFAULT 0,
        notes TEXT,
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      -- NF_12: Payments
      CREATE TABLE IF NOT EXISTS payments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        payment_number TEXT NOT NULL UNIQUE,
        type TEXT NOT NULL,
        direction TEXT NOT NULL CHECK(direction IN ('in','out')),
        party_id INTEGER NOT NULL,
        party_type TEXT NOT NULL CHECK(party_type IN ('customer','supplier')),
        invoice_id INTEGER,
        invoice_type TEXT,
        amount REAL NOT NULL,
        payment_method TEXT NOT NULL CHECK(payment_method IN ('cash','check','transfer')),
        check_number TEXT,
        bank_reference TEXT,
        date TEXT NOT NULL,
        cash_box_id INTEGER REFERENCES cash_boxes(id),
        user_id INTEGER REFERENCES users(id),
        notes TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      -- NF_12: Cash Boxes
      CREATE TABLE IF NOT EXISTS cash_boxes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        code TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        current_balance REAL NOT NULL DEFAULT 0,
        is_active INTEGER NOT NULL DEFAULT 1
      );

      -- NF_12: Cash Transactions
      CREATE TABLE IF NOT EXISTS cash_transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        cash_box_id INTEGER NOT NULL REFERENCES cash_boxes(id),
        type TEXT NOT NULL CHECK(type IN ('in','out')),
        amount REAL NOT NULL,
        category TEXT NOT NULL,
        reference_type TEXT,
        reference_id INTEGER,
        description TEXT,
        user_id INTEGER REFERENCES users(id),
        date TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      -- NF_12: Cash Closings
      CREATE TABLE IF NOT EXISTS cash_closings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        cash_box_id INTEGER NOT NULL REFERENCES cash_boxes(id),
        closing_number TEXT NOT NULL UNIQUE,
        date TEXT NOT NULL,
        expected_balance REAL NOT NULL,
        actual_balance REAL NOT NULL,
        difference REAL NOT NULL DEFAULT 0,
        total_sales_cash REAL DEFAULT 0,
        total_expenses REAL DEFAULT 0,
        total_payments_in REAL DEFAULT 0,
        total_payments_out REAL DEFAULT 0,
        user_id INTEGER REFERENCES users(id),
        notes TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      -- NF_12: Expenses
      CREATE TABLE IF NOT EXISTS expenses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        expense_number TEXT NOT NULL UNIQUE,
        category TEXT NOT NULL,
        description TEXT,
        amount REAL NOT NULL,
        payment_method TEXT DEFAULT 'cash',
        date TEXT NOT NULL,
        user_id INTEGER REFERENCES users(id),
        receipt_reference TEXT,
        notes TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      -- NF_13: Number Sequences
      CREATE TABLE IF NOT EXISTS number_sequences (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        prefix TEXT NOT NULL UNIQUE,
        last_number INTEGER NOT NULL DEFAULT 0,
        last_date TEXT,
        format TEXT NOT NULL DEFAULT '{PREFIX}-{DATE}-{SEQ}'
      );

      -- NF_13: Price History
      CREATE TABLE IF NOT EXISTS price_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        product_id INTEGER NOT NULL REFERENCES products(id),
        field_name TEXT NOT NULL,
        old_value REAL,
        new_value REAL,
        changed_by INTEGER REFERENCES users(id),
        reference_type TEXT,
        reference_id INTEGER,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      -- NF_13: Audit Log
      CREATE TABLE IF NOT EXISTS audit_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER REFERENCES users(id),
        username_snapshot TEXT,
        action TEXT NOT NULL,
        table_name TEXT NOT NULL,
        record_id INTEGER,
        description TEXT,
        old_data TEXT,
        new_data TEXT,
        app_version TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      -- NF_13: Backup Log
      CREATE TABLE IF NOT EXISTS backup_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        filename TEXT NOT NULL,
        file_path TEXT NOT NULL,
        size_bytes INTEGER,
        type TEXT NOT NULL CHECK(type IN ('manual','auto')),
        status TEXT NOT NULL CHECK(status IN ('success','failed')),
        error_message TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      -- NF_15: Accounting Engine
      CREATE TABLE IF NOT EXISTS accounts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        code TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        type TEXT NOT NULL CHECK(type IN ('asset', 'liability', 'equity', 'revenue', 'expense')),
        parent_id INTEGER,
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS cost_centers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        code TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        parent_id INTEGER,
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS journal_entries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        entry_number TEXT NOT NULL UNIQUE,
        date TEXT NOT NULL,
        description TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'posted' CHECK(status IN ('draft', 'posted')),
        reference_type TEXT,
        reference_id INTEGER,
        user_id INTEGER REFERENCES users(id),
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS journal_entry_lines (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        entry_id INTEGER NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE,
        account_id INTEGER NOT NULL REFERENCES accounts(id),
        debit REAL NOT NULL DEFAULT 0,
        credit REAL NOT NULL DEFAULT 0,
        cost_center_id INTEGER REFERENCES cost_centers(id),
        party_type TEXT DEFAULT 'none' CHECK(party_type IN ('customer', 'supplier', 'cashbox', 'none')),
        party_id INTEGER
      );

      -- NF_14: Idempotency Keys (Enterprise Duplicate Prevention)
      CREATE TABLE IF NOT EXISTS idempotency_keys (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        key TEXT NOT NULL UNIQUE,
        request_type TEXT NOT NULL,
        request_hash TEXT,
        response_body TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        invoice_id INTEGER,
        user_id INTEGER REFERENCES users(id),
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        completed_at TEXT
      );

      -- NF_16: Inventory Count Sessions
      CREATE TABLE IF NOT EXISTS inventory_count_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_number TEXT NOT NULL UNIQUE,
        started_by INTEGER NOT NULL REFERENCES users(id),
        started_at TEXT NOT NULL DEFAULT (datetime('now')),
        finished_at TEXT,
        approved_at TEXT,
        status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','counting','reviewing','approved','cancelled')),
        category_id INTEGER REFERENCES categories(id),
        category_name_snapshot TEXT,
        total_products INTEGER NOT NULL DEFAULT 0,
        checked_count INTEGER NOT NULL DEFAULT 0,
        match_count INTEGER NOT NULL DEFAULT 0,
        mismatch_count INTEGER NOT NULL DEFAULT 0,
        notes TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS inventory_count_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id INTEGER NOT NULL REFERENCES inventory_count_sessions(id) ON DELETE CASCADE,
        product_id INTEGER NOT NULL REFERENCES products(id),
        barcode_snapshot TEXT,
        product_name_snapshot TEXT,
        category_name_snapshot TEXT,
        unit_name_snapshot TEXT,
        is_hidden_from_sales INTEGER NOT NULL DEFAULT 0,
        system_qty_at_start REAL NOT NULL DEFAULT 0,
        movements_during_count REAL NOT NULL DEFAULT 0,
        expected_qty REAL NOT NULL DEFAULT 0,
        counted_qty REAL,
        final_difference REAL,
        status TEXT NOT NULL DEFAULT 'unchecked' CHECK(status IN ('unchecked','matched','mismatch')),
        mismatch_reason TEXT,
        notes TEXT,
        checked_at TEXT,
        checked_by INTEGER REFERENCES users(id),
        UNIQUE(session_id, product_id)
      );

      CREATE INDEX IF NOT EXISTS idx_count_items_session ON inventory_count_items(session_id, status);

      -- NF_17: Bulbul Smart Search Dictionary & FTS5 Indexing
      CREATE TABLE IF NOT EXISTS search_dictionary (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        category TEXT NOT NULL,
        standard_term TEXT NOT NULL,
        term TEXT NOT NULL UNIQUE,
        term_type TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS product_search_index (
        product_id INTEGER PRIMARY KEY REFERENCES products(id) ON DELETE CASCADE,
        compiled_terms TEXT NOT NULL
      );

      CREATE VIRTUAL TABLE IF NOT EXISTS product_search_fts USING fts5(
        product_id UNINDEXED,
        search_text,
        tokenize = 'unicode61 remove_diacritics 2'
      );

      CREATE TABLE IF NOT EXISTS search_usage (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        search_term TEXT NOT NULL,
        product_id INTEGER,
        product_barcode TEXT,
        product_name TEXT NOT NULL,
        usage_count INTEGER NOT NULL DEFAULT 1,
        last_used_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
      );

      CREATE TABLE IF NOT EXISTS product_usage (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        product_id INTEGER,
        product_barcode TEXT,
        product_name TEXT NOT NULL,
        usage_count INTEGER NOT NULL DEFAULT 1,
        last_used_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
      );

      CREATE INDEX IF NOT EXISTS idx_search_usage_term ON search_usage(search_term);
      CREATE INDEX IF NOT EXISTS idx_product_usage_prod ON product_usage(product_id);

      -- Mobile Assistant Tables
      CREATE TABLE IF NOT EXISTS product_images (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        file_path TEXT NOT NULL,
        thumbnail BLOB,
        is_primary INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS photo_requests (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'received', 'cancelled')),
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        received_at TEXT
      );

      CREATE TABLE IF NOT EXISTS invoice_captures (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        file_path TEXT NOT NULL,
        prompt_used TEXT,
        status TEXT NOT NULL DEFAULT 'new' CHECK(status IN ('new', 'processed')),
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `);

    console.log('[DatabaseService] All tables created');
  },

  /**
   * Seed initial data if database is empty
   */
  seedData(): void {
    const raw = this.getRawDb();

    // Check if already seeded
    const userCount = raw.prepare('SELECT COUNT(*) as c FROM users').get() as any;
    if (userCount.c > 0) {
      console.log('[DatabaseService] Users already seeded, checking vehicles...');
    } else {
      console.log('[DatabaseService] Seeding initial data...');

      const tx = raw.transaction(() => {
      // 1. Location
      raw.prepare(`INSERT INTO locations (code, name, type) VALUES (?, ?, ?)`).run('MAIN', 'المحل الرئيسي', 'showroom');

      // 2. Admin user (bcrypt cost 12)
      const hash = bcrypt.hashSync('admin123', 12);
      raw.prepare(`INSERT INTO users (username, password_hash, full_name, role, pin_code, avatar, color) VALUES (?, ?, ?, ?, ?, ?, ?)`).run('admin', hash, 'مدير النظام', 'owner', '1234', '👑', 'blue');

      // 3. Units (7 units)
      const insertUnit = raw.prepare(`INSERT INTO units (code, name, symbol) VALUES (?, ?, ?)`);
      insertUnit.run('PCS', 'قطعة', 'قطعة');
      insertUnit.run('BOX', 'صندوق', 'صندوق');
      insertUnit.run('LTR', 'لتر', 'لتر');
      insertUnit.run('PKG', 'عبوة', 'عبوة');
      insertUnit.run('SET', 'طقم', 'طقم');
      insertUnit.run('MTR', 'متر', 'متر');
      insertUnit.run('KG', 'كيلوغرام', 'كغ');

      // 4. Categories (8 categories)
      const insertCat = raw.prepare(`INSERT INTO categories (name, sort_order) VALUES (?, ?)`);
      insertCat.run('فلاتر', 1);
      insertCat.run('زيوت ومواد التشحيم', 2);
      insertCat.run('فرامل', 3);
      insertCat.run('كهرباء السيارة', 4);
      insertCat.run('محرك', 5);
      insertCat.run('تعليق وتوجيه', 6);
      insertCat.run('إطارات وعجلات', 7);
      insertCat.run('إكسسوارات', 8);

      // 5. Cash Box
      raw.prepare(`INSERT INTO cash_boxes (code, name, current_balance) VALUES (?, ?, ?)`).run('MAIN_CASH', 'الصندوق الرئيسي', 0);

      // 6. Number Sequences
      const insertSeq = raw.prepare(`INSERT INTO number_sequences (prefix, last_number, format) VALUES (?, ?, ?)`);
      insertSeq.run('SAL', 0, '{PREFIX}-{DATE}-{SEQ}');
      insertSeq.run('PUR', 0, '{PREFIX}-{DATE}-{SEQ}');
      insertSeq.run('SRT', 0, '{PREFIX}-{DATE}-{SEQ}');
      insertSeq.run('PRT', 0, '{PREFIX}-{DATE}-{SEQ}');
      insertSeq.run('PAY', 0, '{PREFIX}-{DATE}-{SEQ}');
      insertSeq.run('EXP', 0, '{PREFIX}-{DATE}-{SEQ}');
      insertSeq.run('ADJ', 0, '{PREFIX}-{DATE}-{SEQ}');
      insertSeq.run('CSH', 0, '{PREFIX}-{DATE}-{SEQ}');
      insertSeq.run('JRN', 0, '{PREFIX}-{DATE}-{SEQ}'); // Journal Entry Sequence

      // 7. App Settings
      const insertSetting = raw.prepare(`INSERT OR IGNORE INTO app_settings (key, value, type, description) VALUES (?, ?, ?, ?)`);
      insertSetting.run('company_name', 'SparePartsERP', 'string', 'اسم الشركة');
      insertSetting.run('company_phone', '', 'string', 'هاتف الشركة');
      insertSetting.run('company_address', '', 'string', 'عنوان الشركة');
      insertSetting.run('default_tax_percent', '0', 'number', 'نسبة الضريبة الافتراضية');
      insertSetting.run('auto_backup_enabled', 'true', 'boolean', 'تفعيل النسخ الاحتياطي التلقائي');
      insertSetting.run('auto_backup_time', '23:00', 'string', 'وقت النسخ الاحتياطي');
      insertSetting.run('expiry_warning_days', '30', 'number', 'أيام التحذير قبل انتهاء الصلاحية');
      insertSetting.run('currency', 'د.ج', 'string', 'العملة');
      insertSetting.run('app_language', 'ar', 'string', 'لغة التطبيق');
      insertSetting.run('accounting_closing_date', '2000-01-01', 'string', 'تاريخ الإقفال المالي (لا يمكن الإضافة أو التعديل قبله)');
      insertSetting.run('allow_negative_stock', 'false', 'boolean', 'السماح بالبيع بالسالب (البيع بالنقص)');

      // 8. Chart of Accounts (شجرة الحسابات الأساسية)
      const insertAccount = raw.prepare(`INSERT INTO accounts (code, name, type, parent_id) VALUES (?, ?, ?, ?)`);
      
      // Assets (الأصول)
      insertAccount.run('1000', 'الأصول المتداولة', 'asset', null);
      insertAccount.run('1100', 'الصندوق', 'asset', 1);
      insertAccount.run('1200', 'البنك', 'asset', 1);
      insertAccount.run('1300', 'ذمم مدينة - زبائن', 'asset', 1);
      insertAccount.run('1400', 'المخزون', 'asset', 1);

      // Liabilities (الخصوم)
      insertAccount.run('2000', 'الخصوم المتداولة', 'liability', null);
      insertAccount.run('2100', 'ذمم دائنة - موردين', 'liability', 6);
      insertAccount.run('2200', 'ضرائب مستحقة', 'liability', 6);

      // Equity (حقوق الملكية)
      insertAccount.run('3000', 'حقوق الملكية', 'equity', null);
      insertAccount.run('3100', 'رأس المال', 'equity', 9);
      insertAccount.run('3200', 'الأرباح المحتجزة', 'equity', 9);

      // Revenues (الإيرادات)
      insertAccount.run('4000', 'الإيرادات', 'revenue', null);
      insertAccount.run('4100', 'إيرادات المبيعات', 'revenue', 12);
      insertAccount.run('4200', 'إيرادات أخرى', 'revenue', 12);

      // Expenses (المصروفات)
      insertAccount.run('5000', 'المصروفات', 'expense', null);
      insertAccount.run('5100', 'تكلفة البضاعة المباعة', 'expense', 15);
      insertAccount.run('5200', 'مصروفات تشغيلية', 'expense', 15);
      insertAccount.run('5300', 'مصروفات رواتب', 'expense', 15);
      insertAccount.run('5400', 'مصروفات إيجار', 'expense', 15);
    });

    tx();
    console.log('[DatabaseService] Seed data inserted successfully');
    }

    // =========================================================================
    // 🚙 🇩🇿 Massive Algerian Vehicles Database Seed (Deep Research)
    // =========================================================================
    const brandCount: any = raw.prepare('SELECT COUNT(*) as c FROM vehicle_brands').get();
    const hasRenault = raw.prepare("SELECT 1 FROM vehicle_brands WHERE name LIKE 'Renault%'").get();
    if (brandCount.c < 10 || !hasRenault) {
      console.log('[DatabaseService] Verifying and Seeding Comprehensive Algerian vehicles data...');
      const txVehicles = raw.transaction(() => {
        const insertBrand = raw.prepare(`INSERT OR IGNORE INTO vehicle_brands (name) VALUES (?)`);
        const getBrand = raw.prepare(`SELECT id FROM vehicle_brands WHERE name = ?`);
        const getModel = raw.prepare(`SELECT id FROM vehicle_models WHERE vehicle_brand_id = ? AND name = ?`);
        const insertModel = raw.prepare(`INSERT INTO vehicle_models (vehicle_brand_id, name) VALUES (?, ?)`);
        
        const vehicleData = [
          { brand: 'Renault (رينو)', models: ['Clio 2', 'Clio 3', 'Clio 4', 'Clio 5', 'Kangoo', 'Symbol', 'Megane', 'Master', 'Trafic', 'Express', 'Laguna', 'Kadjar', 'Captur', 'Stepway'] },
          { brand: 'Dacia (داسيا)', models: ['Logan', 'Sandero', 'Sandero Stepway', 'Duster', 'Dokker', 'Lodgy'] },
          { brand: 'Peugeot (بيجو)', models: ['206', '207', '208', '301', '307', '308', '406', '508', 'Partner', 'Expert', 'Boxer', '2008', '3008', 'Rifter'] },
          { brand: 'Hyundai (هيونداي)', models: ['Accent', 'Accent RB', 'Atos', 'i10', 'Grand i10', 'i20', 'i30', 'Tucson', 'Santa Fe', 'Elantra', 'H100', 'Creta'] },
          { brand: 'Chevrolet (شيفروليه)', models: ['Spark', 'Sail', 'Aveo', 'Optra', 'Cruze', 'N300 (Harbina)', 'Colorado', 'Captiva'] },
          { brand: 'Toyota (تويوتا)', models: ['Hilux', 'Yaris', 'Corolla', 'Land Cruiser', 'Prado', 'RAV4', 'Hiace', 'Coaster'] },
          { brand: 'Volkswagen (فولكس فاجن)', models: ['Golf 4', 'Golf 5', 'Golf 6', 'Golf 7', 'Golf 8', 'Polo', 'Caddy', 'Crafter', 'Transporter', 'Tiguan', 'Passat', 'Amarok'] },
          { brand: 'Seat (سيات)', models: ['Ibiza', 'Leon', 'Arona', 'Ateca'] },
          { brand: 'Skoda (سكودا)', models: ['Fabia', 'Octavia', 'Rapid', 'Superb', 'Yeti'] },
          { brand: 'Kia (كيا)', models: ['Picanto', 'Rio', 'Sportage', 'K2700', 'Sorento', 'Cerato', 'Optima', 'Seltos'] },
          { brand: 'Suzuki (سوزوكي)', models: ['Maruti 800', 'Alto', 'Swift', 'Celerio', 'Vitara', 'Jimny', 'Ertiga'] },
          { brand: 'DFSK', models: ['K01', 'K02', 'K07', 'V21', 'V22', 'Glory', 'C31', 'C32'] },
          { brand: 'Harbin (هاربين - Hafei)', models: ['Ruiyi', 'Zhongyi', 'Minyi', 'HFJ'] },
          { brand: 'Changan (شانجان)', models: ['Star Truck', 'Star Van', 'CS35', 'CS75', 'Alsvin'] },
          { brand: 'Nissan (نيسان)', models: ['Navara', 'Sunny', 'Micra', 'Qashqai', 'Patrol', 'X-Trail'] },
          { brand: 'Ford (فورد)', models: ['Ranger', 'Fiesta', 'Focus', 'Transit', 'Kuga'] },
          { brand: 'Fiat (فيات)', models: ['Tipo', '500', 'Ducato', 'Fiorino', 'Doblo', 'Panda', 'Titano'] },
          { brand: 'Chery (شيري)', models: ['QQ', 'Tiggo 2', 'Tiggo 4', 'Tiggo 7', 'Tiggo 8', 'Arrizo 5'] },
          { brand: 'Geely (جيلي)', models: ['GX3', 'Coolray', 'Emgrand'] },
          { brand: 'Isuzu (إيسوزو)', models: ['D-Max', 'NPR', 'NQR'] },
          { brand: 'Mitsubishi (ميتسوبيشي)', models: ['L200', 'Pajero', 'Lancer'] },
          { brand: 'Mercedes-Benz', models: ['Sprinter', 'Vito', 'Class C', 'Class A', 'Class G'] }
        ];

        for (const b of vehicleData) {
          insertBrand.run(b.brand);
          const brandRow: any = getBrand.get(b.brand);
          if (brandRow) {
            const brandId = brandRow.id;
            for (const m of b.models) {
              const modelRow: any = getModel.get(brandId, m);
              if (!modelRow) {
                insertModel.run(brandId, m);
              }
            }
          }
        }
      });
      txVehicles();
      console.log('[DatabaseService] Comprehensive Algerian Vehicles seeded successfully');
    }
  },

  /**
   * Seed Bulbul Smart Search dictionary terms for Algerian dialects, French, and common typos.
   */
  seedSearchDictionary(): void {
    const raw = this.getRawDb();
    const count: any = raw.prepare('SELECT COUNT(*) as c FROM search_dictionary').get();
    if (count.c > 900) {
      console.log('[DatabaseService] Search dictionary already seeded with expanded terms.');
      return;
    }

    console.log('[DatabaseService] Clearing old search dictionary and seeding 1000+ Algerian terms...');
    raw.prepare('DELETE FROM search_dictionary').run();

    const addedTerms = new Set<string>();

    const txDict = raw.transaction(() => {
      const insert = raw.prepare(`
        INSERT OR IGNORE INTO search_dictionary (category, standard_term, term, term_type)
        VALUES (?, ?, ?, ?)
      `);

      const baseParts = [
        // 1. Filters
        { cat: 'Filters', std: 'Filtre à huile', ar: 'فلتر زيت', fr: 'filtre a huile', darja: 'فيلتر زيت', abbrev: 'f.huile' },
        { cat: 'Filters', std: 'Filtre à air', ar: 'فلتر هواء', fr: 'filtre a air', darja: 'فيلتر هوا', abbrev: 'f.air' },
        { cat: 'Filters', std: 'Filtre à carburant', ar: 'فلتر مازوت', fr: 'filtre a carburant', darja: 'فيلتر مازوت', abbrev: 'f.carb' },
        { cat: 'Filters', std: 'Filtre habitacle', ar: 'فلتر مكيف', fr: 'filtre habitacle', darja: 'فيلتر كابين', abbrev: 'f.habitacle' },
        { cat: 'Filters', std: 'Filtre à essence', ar: 'فلتر بنزين', fr: 'filtre a essence', darja: 'فيلتر ايصونص', abbrev: 'f.ess' },
        { cat: 'Filters', std: 'Filtre gasoil', ar: 'فلتر ديازيل', fr: 'filtre gasoil', darja: 'فيلتر مازوت', abbrev: 'f.gas' },
        
        // 2. Brakes
        { cat: 'Brakes', std: 'Plaquettes de frein', ar: 'تيل فرامل', fr: 'plaquettes de frein', darja: 'بلاكيط', abbrev: 'plaq' },
        { cat: 'Brakes', std: 'Disque de frein', ar: 'ديسك فرامل', fr: 'disque de frein', darja: 'ديسكات', abbrev: 'disq' },
        { cat: 'Brakes', std: 'Tambour de frein', ar: 'طمبور فرامل', fr: 'tambour de frein', darja: 'طمبور', abbrev: 'tamb' },
        { cat: 'Brakes', std: 'Segment de frein', ar: 'فرامل خلفية', fr: 'machoires de frein', darja: 'ماشوار', abbrev: 'mach' },
        { cat: 'Brakes', std: 'Flexible de frein', ar: 'خرطوم فرامل', fr: 'flexible de frein', darja: 'فليكسيبل', abbrev: 'flex' },
        { cat: 'Brakes', std: 'Étrier de frein', ar: 'فك فرامل', fr: 'etrier de frein', darja: 'إتريي', abbrev: 'etr' },
        { cat: 'Brakes', std: 'Maître-cylindre', ar: 'أسطوانة فرامل رئيسية', fr: 'maitre cylindre', darja: 'ميتري سيلاندر', abbrev: 'mc' },
        { cat: 'Brakes', std: 'Cylindre de roue', ar: 'سيلاندر عجلة', fr: 'cylindre de roue', darja: 'سيلاندر رو', abbrev: 'cyl' },
        
        // 3. Oils
        { cat: 'Oils', std: 'Huile moteur 10W40', ar: 'زيت محرك 10W40', fr: 'huile moteur 10w40', darja: 'زيت موتور 10w40', abbrev: '10w40' },
        { cat: 'Oils', std: 'Huile moteur 5W40', ar: 'زيت محرك 5W40', fr: 'huile moteur 5w40', darja: 'زيت موتور 5w40', abbrev: '5w40' },
        { cat: 'Oils', std: 'Huile moteur 15W40', ar: 'زيت محرك 15W40', fr: 'huile moteur 15w40', darja: 'زيت موتور 15w40', abbrev: '15w40' },
        { cat: 'Oils', std: 'Huile de boîte', ar: 'زيت علبة السرعة', fr: 'huile de boite', darja: 'زيت بواط', abbrev: 'huile boite' },
        { cat: 'Oils', std: 'Liquide de frein', ar: 'زيت فرامل ليكيد', fr: 'liquide de frein', darja: 'ليكيد دو فرام', abbrev: 'lockheed' },
        { cat: 'Oils', std: 'Graisse', ar: 'شحم تشحيم', fr: 'graisse lubrifiante', darja: 'لاغريس', abbrev: 'grais' },
        { cat: 'Oils', std: 'Huile direction', ar: 'زيت توجيه', fr: 'huile direction assistee', darja: 'زيت لاسيستي', abbrev: 'huile assist' },

        // 4. Batteries
        { cat: 'Batteries', std: 'Batterie 50A', ar: 'بطارية 50 أمبير', fr: 'batterie 50a', darja: 'باتري 50', abbrev: 'bat50' },
        { cat: 'Batteries', std: 'Batterie 60A', ar: 'بطارية 60 أمبير', fr: 'batterie 60a', darja: 'باتري 60', abbrev: 'bat60' },
        { cat: 'Batteries', std: 'Batterie 70A', ar: 'بطارية 70 أمبير', fr: 'batterie 70a', darja: 'باتري 70', abbrev: 'bat70' },
        { cat: 'Batteries', std: 'Batterie 74A', ar: 'بطارية 74 أمبير', fr: 'batterie 74a', darja: 'باتري 74', abbrev: 'bat74' },
        { cat: 'Batteries', std: 'Batterie 80A', ar: 'بطارية 80 أمبير', fr: 'batterie 80a', darja: 'باتري 80', abbrev: 'bat80' },
        { cat: 'Batteries', std: 'Batterie 90A', ar: 'بطارية 90 أمبير', fr: 'batterie 90a', darja: 'باتري 90', abbrev: 'bat90' },
        { cat: 'Batteries', std: 'Batterie 100A', ar: 'بطارية 100 أمبير', fr: 'batterie 100a', darja: 'باتري 100', abbrev: 'bat100' },
        { cat: 'Batteries', std: 'Cosse de batterie', ar: 'كليب بطارية', fr: 'cosse de batterie', darja: 'كوس باتري', abbrev: 'coss' },
        
        // 5. Electrical
        { cat: 'Electrical', std: 'Alternateur', ar: 'مولد كهرباء', fr: 'alternateur', darja: 'دينامو', abbrev: 'alt' },
        { cat: 'Electrical', std: 'Démarreur', ar: 'بادئ حركة', fr: 'demarreur', darja: 'ديمارور', abbrev: 'dem' },
        { cat: 'Electrical', std: 'Bougie d\'allumage', ar: 'شمعة إشعال', fr: 'bougie d allumage', darja: 'بوجي موتور', abbrev: 'boug' },
        { cat: 'Electrical', std: 'Bougie de préchauffage', ar: 'شمعة تسخين ديزل', fr: 'bougie de prechauffage', darja: 'بوجي شوفاج', abbrev: 'boug diesel' },
        { cat: 'Electrical', std: 'Bobine d\'allumage', ar: 'ملف إشعال بوبينة', fr: 'bobine d allumage', darja: 'بوبينة كويل', abbrev: 'bob' },
        { cat: 'Electrical', std: 'Faisceau d\'allumage', ar: 'أسلاك البوجيات', fr: 'faisceau d allumage', darja: 'فيسو بوجي', abbrev: 'fais' },
        { cat: 'Electrical', std: 'Fusible', ar: 'مصهير كهربائي', fr: 'fusibles', darja: 'فيزيبل', abbrev: 'fus' },
        { cat: 'Electrical', std: 'Relais', ar: 'مرحل كهرباء', fr: 'relais electrique', darja: 'رولي', abbrev: 'rel' },
        { cat: 'Electrical', std: 'Commodo', ar: 'مفتاح إشارة الضوء', fr: 'commodo', darja: 'كومودو سويتش', abbrev: 'com' },
        { cat: 'Electrical', std: 'Klaxon', ar: 'بوق سيارة', fr: 'klaxon horn', darja: 'كلاكسون', abbrev: 'klax' },
        
        // 6. Cooling
        { cat: 'Cooling', std: 'Radiateur', ar: 'مبرد ماء', fr: 'radiateur d eau', darja: 'رادياتور', abbrev: 'rad' },
        { cat: 'Cooling', std: 'Pompe à eau', ar: 'مضخة ماء', fr: 'pompe a eau', darja: 'بومبة ماء', abbrev: 'p.eau' },
        { cat: 'Cooling', std: 'Thermostat', ar: 'منظم حرارة ترموستات', fr: 'thermostat calorstat', darja: 'تيرموستا كالورستا', abbrev: 'term' },
        { cat: 'Cooling', std: 'Vase d\'expansion', ar: 'خزان ماء التبريد', fr: 'vase d expansion', darja: 'قرعة ماء', abbrev: 'vase' },
        { cat: 'Cooling', std: 'Ventilateur', ar: 'مروحة رادياتور', fr: 'ventilateur moteur', darja: 'فونتيلور', abbrev: 'vent' },
        { cat: 'Cooling', std: 'Durite d\'eau', ar: 'أنبوب ماء رادياتور', fr: 'durite de refroidissement', darja: 'دوريت ماء', abbrev: 'dur' },
        { cat: 'Cooling', std: 'Sonde de température', ar: 'مستشعر حرارة', fr: 'sonde temperature', darja: 'مانو رادياتور', abbrev: 's.temp' },
        
        // 7. Suspension
        { cat: 'Suspension', std: 'Amortisseur avant', ar: 'مساعد تعليق أمامي', fr: 'amortisseur avant', darja: 'امورتيسور افون', abbrev: 'am.av' },
        { cat: 'Suspension', std: 'Amortisseur arrière', ar: 'مساعد تعليق خلفي', fr: 'amortisseur arriere', darja: 'امورتيسور اريار', abbrev: 'am.arr' },
        { cat: 'Suspension', std: 'Ressort d\'amortisseur', ar: 'زنبرك مساعد', fr: 'ressort de suspension', darja: 'رسور', abbrev: 'ress' },
        { cat: 'Suspension', std: 'Triangle de suspension', ar: 'مثلث تعليق مقص', fr: 'triangle de suspension', darja: 'تريونغل', abbrev: 'tri' },
        { cat: 'Suspension', std: 'Rotule de suspension', ar: 'جوزة تعليق', fr: 'rotule de suspension', darja: 'روتيل', abbrev: 'rot' },
        { cat: 'Suspension', std: 'Silentbloc', ar: 'جلبة تعليق مطاطية', fr: 'silentbloc de triangle', darja: 'سيلان بلوك', abbrev: 'sb' },
        { cat: 'Suspension', std: 'Barre stabilisatrice', ar: 'قضيب توازن', fr: 'barre stabilisatrice', darja: 'بار سطابيليزاتريس', abbrev: 'bar.stab' },
        { cat: 'Suspension', std: 'Biellette de direction', ar: 'ذراع توجيه داخلي', fr: 'biellette de direction', darja: 'بيليت ديريكسيون', abbrev: 'biel.dir' },
        { cat: 'Suspension', std: 'Biellette de barre stable', ar: 'ذراع قضيب توازن', fr: 'biellette de barre', darja: 'بيليت سطابيليزاتريس', abbrev: 'biel.stab' },
        { cat: 'Suspension', std: 'Roulement de roue', ar: 'محمل عجلات رولمان', fr: 'roulement de roue', darja: 'رولمو', abbrev: 'roul' },
        { cat: 'Suspension', std: 'Moyeu de roue', ar: 'صرة عجلة مويو', fr: 'moyeu de roue', darja: 'مويو رو', abbrev: 'moy' },
        
        // 8. Engine
        { cat: 'Engine', std: 'Culasse', ar: 'رأس المحرك غطاء', fr: 'culasse moteur', darja: 'كيلاس', abbrev: 'cul' },
        { cat: 'Engine', std: 'Piston', ar: 'مكبس محرك', fr: 'piston moteur', darja: 'بيستون', abbrev: 'pist' },
        { cat: 'Engine', std: 'Segment de piston', ar: 'حلقات مكبس', fr: 'segments de piston', darja: 'سيغمون', abbrev: 'seg' },
        { cat: 'Engine', std: 'Soupape d\'admission', ar: 'صمام دخول وقود', fr: 'soupape admission', darja: 'سوباب ادميسيون', abbrev: 'sop.ad' },
        { cat: 'Engine', std: 'Soupape d\'échappement', ar: 'صمام خروج غازات', fr: 'soupape echappement', darja: 'سوباب اريار', abbrev: 'sop.ech' },
        { cat: 'Engine', std: 'Joint de culasse', ar: 'حشية رأس محرك جوان', fr: 'joint de culasse', darja: 'جوان كيلاس', abbrev: 'j.culasse' },
        { cat: 'Engine', std: 'Vilebrequin', ar: 'عمود مرفقي كرنك', fr: 'vilebrequin', darja: 'فيلبروكان الكرنك', abbrev: 'vileb' },
        { cat: 'Engine', std: 'Bielle', ar: 'ذراع توصيل مكبس', fr: 'bielle moteur', darja: 'بيال', abbrev: 'biel' },
        { cat: 'Engine', std: 'Carter d\'huile', ar: 'وعاء زيت كارتير', fr: 'carter d huile', darja: 'كارتير زيت', abbrev: 'cart' },
        { cat: 'Engine', std: 'Support moteur', ar: 'قاعدة تثبيت محرك', fr: 'support moteur silentbloc', darja: 'سيبور موتور', abbrev: 'sup.mot' },
        
        // 9. Clutch
        { cat: 'Clutch', std: 'Kit d\'embrayage', ar: 'طقم دبرياج كلتش', fr: 'kit embrayage d embrayage', darja: 'كيت اومبرياج دبرياج', abbrev: 'kit.emb' },
        { cat: 'Clutch', std: 'Disque d\'embrayage', ar: 'قرص دبرياج', fr: 'disque d embrayage', darja: 'ديسك اومبرياج', abbrev: 'disq.emb' },
        { cat: 'Clutch', std: 'Plateau d\'embrayage', ar: 'غطاء دبرياج بلاطو', fr: 'plateau d embrayage', darja: 'بلاطو اومبرياج', abbrev: 'plat.emb' },
        { cat: 'Clutch', std: 'Butée d\'embrayage', ar: 'فحمة دبرياج بيتي', fr: 'butee d embrayage', darja: 'بيتي اومبرياج', abbrev: 'but.emb' },
        { cat: 'Clutch', std: 'Volant moteur', ar: 'حذافة محرك فولان', fr: 'volant moteur', darja: 'فولان موتور', abbrev: 'vm' },
        { cat: 'Clutch', std: 'Émetteur d\'embrayage', ar: 'مضخة كلتش علوية', fr: 'emetteur d embrayage', darja: 'اميتر اومبرياج', abbrev: 'emet' },
        { cat: 'Clutch', std: 'Récepteur d\'embrayage', ar: 'مضخة كلتش سفلية', fr: 'recepteur d embrayage', darja: 'ريسبتور اومبرياج', abbrev: 'recep' },
        { cat: 'Clutch', std: 'Câble d\'embrayage', ar: 'سلك دبرياج كابل', fr: 'cable d embrayage', darja: 'كابل اومبرياج', abbrev: 'c.emb' },
        
        // 10. Belts
        { cat: 'Belts', std: 'Courroie de distribution', ar: 'سير الكاتينة كاتينة', fr: 'courroie de distribution', darja: 'لاشين كوروا', abbrev: 'cour.dist' },
        { cat: 'Belts', std: 'Kit de distribution', ar: 'طقم سير كاتينة', fr: 'kit de distribution', darja: 'كيت كوروا لاشين', abbrev: 'kit.dist' },
        { cat: 'Belts', std: 'Courroie d\'accessoire', ar: 'سير ملحقات دينامو', fr: 'courroie d accessoire', darja: 'كوروا دينامو', abbrev: 'cour.acc' },
        { cat: 'Belts', std: 'Galet tendeur', ar: 'بكرة شداد سير', fr: 'galet tendeur de courroie', darja: 'كالي توندور', abbrev: 'galet' },
        { cat: 'Belts', std: 'Galet enrouleur', ar: 'بكرة توجيه سير', fr: 'galet enrouleur', darja: 'كالي انفولور', abbrev: 'enr' },
        { cat: 'Belts', std: 'Poulie damper', ar: 'بكرة عمود مرفقي', fr: 'poulie damper vilebrequin', darja: 'بولي دامبر', abbrev: 'poulie' }
      ];

      const dictionary: { category: string; standard_term: string; term: string; term_type: string }[] = [];
      const addedTerms = new Set<string>();

      const addTerm = (cat: string, std: string, term: string, type: string) => {
        const clean = term.toLowerCase().trim();
        if (!clean || addedTerms.has(clean)) return;
        addedTerms.add(clean);
        dictionary.push({ category: cat, standard_term: std, term: clean, term_type: type });
      };

      for (const p of baseParts) {
        // 1. Standard term itself
        addTerm(p.cat, p.std, p.std, 'fr');
        
        // 2. Arabic standard
        addTerm(p.cat, p.std, p.ar, 'ar');
        // Arabic variation 1: replacing ة with ه
        if (p.ar.includes('ة')) addTerm(p.cat, p.std, p.ar.replace(/ة/g, 'ه'), 'typo');
        // Arabic variation 2: replacing أإآ with ا
        const arNorm = p.ar.replace(/[أإآ]/g, 'ا');
        addTerm(p.cat, p.std, arNorm, 'ar');
        // Arabic variation 3: adding/removing ال
        if (p.ar.startsWith('ال')) {
          addTerm(p.cat, p.std, p.ar.substring(2), 'ar');
        } else {
          addTerm(p.cat, p.std, 'ال' + p.ar, 'ar');
        }

        // 3. French term
        addTerm(p.cat, p.std, p.fr, 'fr');
        // French variations (without apostrophe/accents)
        const frClean = p.fr.replace(/['`’]/g, ' ').replace(/[àâä]/g, 'a').replace(/[éèêë]/g, 'e').replace(/[ûü]/g, 'u').replace(/[îï]/g, 'i').replace(/[ôö]/g, 'o');
        addTerm(p.cat, p.std, frClean, 'fr');
        // French without 'de' or 'd'
        const frNoPrep = frClean.replace(/\bde\b/g, ' ').replace(/\bd\b/g, ' ').replace(/\s+/g, ' ').trim();
        addTerm(p.cat, p.std, frNoPrep, 'fr');

        // 4. Darja term
        addTerm(p.cat, p.std, p.darja, 'darja');
        if (p.darja.includes('ة')) addTerm(p.cat, p.std, p.darja.replace(/ة/g, 'ه'), 'typo');
        const darjaNorm = p.darja.replace(/[أإآ]/g, 'ا');
        addTerm(p.cat, p.std, darjaNorm, 'darja');
        if (!p.darja.startsWith('ال')) addTerm(p.cat, p.std, 'ال' + p.darja, 'darja');

        // 5. Abbreviation
        addTerm(p.cat, p.std, p.abbrev, 'en');

        // 6. Common typos & phonetic variants
        // French typos
        addTerm(p.cat, p.std, frClean.replace(/e\b/g, ''), 'typo'); // remove trailing e
        addTerm(p.cat, p.std, frClean.replace(/tt/g, 't'), 'typo');
        addTerm(p.cat, p.std, frClean.replace(/ll/g, 'l'), 'typo');
        addTerm(p.cat, p.std, frClean.replace(/ss/g, 's'), 'typo');
        addTerm(p.cat, p.std, frClean.replace(/qu/g, 'k'), 'typo');
        addTerm(p.cat, p.std, frClean.replace(/eau/g, 'o'), 'typo');
        addTerm(p.cat, p.std, frClean.replace(/ou/g, 'u'), 'typo');
        
        // Specific spare parts typos
        if (frClean.includes('filtre')) {
          addTerm(p.cat, p.std, frClean.replace('filtre', 'filte'), 'typo');
          addTerm(p.cat, p.std, frClean.replace('filtre', 'filtr'), 'typo');
        }
        if (frClean.includes('amortisseur')) {
          addTerm(p.cat, p.std, frClean.replace('amortisseur', 'amortiseur'), 'typo');
        }
        if (frClean.includes('embrayage')) {
          addTerm(p.cat, p.std, frClean.replace('embrayage', 'embreyage'), 'typo');
          addTerm(p.cat, p.std, frClean.replace('embrayage', 'embriyage'), 'typo');
        }
        if (frClean.includes('courroie')) {
          addTerm(p.cat, p.std, frClean.replace('courroie', 'coroua'), 'typo');
          addTerm(p.cat, p.std, frClean.replace('courroie', 'coroi'), 'typo');
        }
        if (frClean.includes('roulement')) {
          addTerm(p.cat, p.std, frClean.replace('roulement', 'roulment'), 'typo');
          addTerm(p.cat, p.std, frClean.replace('roulement', 'roulemon'), 'typo');
        }
        if (frClean.includes('butee')) {
          addTerm(p.cat, p.std, frClean.replace('butee', 'bute'), 'typo');
        }
      }

      for (const item of dictionary) {
        insert.run(item.category, item.standard_term, item.term, item.term_type);
      }
    });

    txDict();
    console.log('[DatabaseService] Seeding Bulbul Smart Search Dictionary completed successfully. Seeded count:', addedTerms.size);
  },

  /**
   * Run schema migrations
   */
  migrateDb(): void {
    try {
      const raw = this.getRawDb();

      // Migrate search_usage & product_usage to support persistence across product deletion
      try {
        const pragmaSU = raw.prepare("PRAGMA table_info(search_usage)").all();
        const suColumns = pragmaSU.map((col: any) => col.name);
        
        if (!suColumns.includes('product_barcode')) {
          console.log('[DatabaseService] Migrating search_usage: adding product_barcode and product_name...');
          raw.exec(`
            DROP TABLE IF EXISTS search_usage;
            DROP TABLE IF EXISTS product_usage;
            
            CREATE TABLE search_usage (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              search_term TEXT NOT NULL,
              product_id INTEGER,
              product_barcode TEXT,
              product_name TEXT NOT NULL,
              usage_count INTEGER NOT NULL DEFAULT 1,
              last_used_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
            );
            
            CREATE TABLE product_usage (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              product_id INTEGER,
              product_barcode TEXT,
              product_name TEXT NOT NULL,
              usage_count INTEGER NOT NULL DEFAULT 1,
              last_used_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
            );
            
            CREATE INDEX IF NOT EXISTS idx_search_usage_term ON search_usage(search_term);
            CREATE INDEX IF NOT EXISTS idx_product_usage_prod ON product_usage(product_id);
          `);
          console.log('[DatabaseService] ✅ search_usage & product_usage recreated for persistent learning');
        }
      } catch (e) {
        console.error('[DatabaseService] Recreating usage tables failed:', e);
      }

      // Migrate product_fitments to support persistence across product deletion
      try {
        const pragmaPF = raw.prepare("PRAGMA table_info(product_fitments)").all();
        const pfColumns = pragmaPF.map((col: any) => col.name);
        
        if (!pfColumns.includes('product_barcode')) {
          console.log('[DatabaseService] Migrating product_fitments: adding product_barcode and product_name...');
          
          // Disable foreign keys temporarily for the migration transaction
          raw.exec('PRAGMA foreign_keys = OFF;');
          
          raw.exec(`
            ALTER TABLE product_fitments RENAME TO product_fitments_old;
            
            CREATE TABLE product_fitments (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              product_id INTEGER REFERENCES products(id),
              product_barcode TEXT,
              product_name TEXT NOT NULL,
              vehicle_brand_id INTEGER NOT NULL REFERENCES vehicle_brands(id),
              vehicle_model_id INTEGER REFERENCES vehicle_models(id),
              year_from INTEGER,
              year_to INTEGER,
              engine TEXT,
              notes TEXT
            );
            
            INSERT INTO product_fitments (id, product_id, product_barcode, product_name, vehicle_brand_id, vehicle_model_id, year_from, year_to, engine, notes)
            SELECT 
              id, 
              product_id, 
              (SELECT barcode FROM products WHERE id = product_fitments_old.product_id),
              COALESCE((SELECT name FROM products WHERE id = product_fitments_old.product_id), 'Unknown Product'),
              vehicle_brand_id, 
              vehicle_model_id, 
              year_from, 
              year_to, 
              engine, 
              notes
            FROM product_fitments_old;
            
            DROP TABLE IF EXISTS product_fitments_old;
            
            CREATE INDEX IF NOT EXISTS idx_product_fitments_prod ON product_fitments(product_id);
            CREATE INDEX IF NOT EXISTS idx_product_fitments_barcode ON product_fitments(product_barcode);
          `);
          
          raw.exec('PRAGMA foreign_keys = ON;');
          console.log('[DatabaseService] ✅ product_fitments migrated successfully for persistent mapping');
        }
      } catch (e) {
        console.error('[DatabaseService] Migrating product_fitments table failed:', e);
      }

      const pragma = raw.prepare("PRAGMA table_info(products)").all();
      const columns = pragma.map((col: any) => col.name);

      if (!columns.includes('has_sub_unit')) {
        console.log('[DatabaseService] Migrating products: adding has_sub_unit...');
        raw.prepare("ALTER TABLE products ADD COLUMN has_sub_unit INTEGER NOT NULL DEFAULT 0").run();
      }
      if (!columns.includes('pieces_per_box')) {
        console.log('[DatabaseService] Migrating products: adding pieces_per_box...');
        raw.prepare("ALTER TABLE products ADD COLUMN pieces_per_box REAL NOT NULL DEFAULT 1").run();
      }

      const pragmaExpenses = raw.prepare("PRAGMA table_info(expenses)").all();
      const expensesColumns = pragmaExpenses.map((col: any) => col.name);
      if (!expensesColumns.includes('is_active')) {
        console.log('[DatabaseService] Migrating expenses: adding is_active...');
        raw.prepare("ALTER TABLE expenses ADD COLUMN is_active INTEGER NOT NULL DEFAULT 1").run();
      }

      // Migrate purchase_invoice_items to add quantity_remaining
      const pragmaPII = raw.prepare("PRAGMA table_info(purchase_invoice_items)").all();
      const piiColumns = pragmaPII.map((col: any) => col.name);
      if (!piiColumns.includes('quantity_remaining')) {
        console.log('[DatabaseService] Migrating purchase_invoice_items: adding quantity_remaining...');
        raw.prepare("ALTER TABLE purchase_invoice_items ADD COLUMN quantity_remaining REAL").run();
        raw.prepare("UPDATE purchase_invoice_items SET quantity_remaining = quantity WHERE quantity_remaining IS NULL").run();
      }

      // Migrate session_id for double save prevention
      // NOTE: SQLite does NOT support ALTER TABLE ADD COLUMN with UNIQUE constraint
      // So we add the column first, then create a unique index separately
      const tablesToCheck = ['sales_invoices', 'purchase_invoices', 'sales_returns', 'purchase_returns'];
      for (const table of tablesToCheck) {
        const pragmaTable = raw.prepare(`PRAGMA table_info(${table})`).all();
        const tableColumns = pragmaTable.map((col: any) => col.name);
        if (!tableColumns.includes('session_id')) {
          console.log(`[DatabaseService] Migrating ${table}: adding session_id...`);
          raw.prepare(`ALTER TABLE ${table} ADD COLUMN session_id TEXT`).run();
          raw.prepare(`CREATE UNIQUE INDEX IF NOT EXISTS idx_${table}_session_id ON ${table}(session_id)`).run();
          console.log(`[DatabaseService] ✅ session_id added to ${table}`);
        }
      }

      // Migrate payments to add cash_box_id if missing
      const pragmaPayments = raw.prepare("PRAGMA table_info(payments)").all();
      const paymentsColumns = pragmaPayments.map((col: any) => col.name);
      if (!paymentsColumns.includes('cash_box_id')) {
        console.log('[DatabaseService] Migrating payments: adding cash_box_id...');
        raw.prepare("ALTER TABLE payments ADD COLUMN cash_box_id INTEGER REFERENCES cash_boxes(id)").run();
        console.log('[DatabaseService] ✅ cash_box_id added to payments table');
      }
      // Migrate: drop half_wholesale_price from products (removed feature)
      const productCols = raw.prepare("PRAGMA table_info(products)").all().map((col: any) => col.name);
      if (productCols.includes('half_wholesale_price')) {
        console.log('[DatabaseService] Migrating products: dropping half_wholesale_price...');
        raw.prepare("ALTER TABLE products DROP COLUMN half_wholesale_price").run();
      }
      if (!productCols.includes('is_hidden_from_sales')) {
        console.log('[DatabaseService] Migrating products: adding is_hidden_from_sales...');
        raw.prepare("ALTER TABLE products ADD COLUMN is_hidden_from_sales INTEGER NOT NULL DEFAULT 0").run();
      }
    } catch (e) {
      console.error('[DatabaseService] Migration failed:', e);
    }

      // ── Idempotency Keys Migration (Enterprise Duplicate Prevention) ──
    try {
      const raw = this.getRawDb();
      const idempotencyExists: any = raw.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='idempotency_keys'").get();
      if (!idempotencyExists) {
        console.log('[DatabaseService] Creating idempotency_keys table...');
        raw.exec(`
          CREATE TABLE idempotency_keys (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            key TEXT NOT NULL UNIQUE,
            request_type TEXT NOT NULL,
            request_hash TEXT,
            response_body TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'pending',
            invoice_id INTEGER,
            user_id INTEGER REFERENCES users(id),
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            completed_at TEXT
          );
          CREATE INDEX IF NOT EXISTS idx_idempotency_key ON idempotency_keys(key);
          CREATE INDEX IF NOT EXISTS idx_idempotency_status ON idempotency_keys(status);
        `);
        console.log('[DatabaseService] ✅ idempotency_keys table created');
      }

      // ── Additional Constraints for Duplicate Prevention ──
      // UNIQUE on journal_entries(reference_type, reference_id) to prevent duplicate accounting entries
      raw.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_je_unique_ref ON journal_entries(reference_type, reference_id)`);
      
      // UNIQUE on payments(invoice_id, party_type) to prevent duplicate payments
      raw.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_unique ON payments(invoice_id, party_type)`);
      
      // ── Triggers: منع تعديل/حذف الفواتير المؤكدة ──
      // Drop blocking triggers to allow transaction-based invoice editing (revert & reapply)
      raw.exec(`DROP TRIGGER IF EXISTS prevent_confirmed_sales_update`);
      raw.exec(`DROP TRIGGER IF EXISTS prevent_confirmed_purchases_update`);
      
      // Drop old delete triggers to recreate them with the draft bypass rule
      raw.exec(`DROP TRIGGER IF EXISTS prevent_sales_delete`);
      raw.exec(`DROP TRIGGER IF EXISTS prevent_purchases_delete`);
      
      raw.exec(`
        CREATE TRIGGER IF NOT EXISTS prevent_sales_delete
        BEFORE DELETE ON sales_invoices
        FOR EACH ROW WHEN OLD.status != 'draft'
        BEGIN
          SELECT RAISE(ABORT, 'لا يمكن حذف فواتير المبيعات. يجب إلغاؤها.');
        END;
      `);
      
      raw.exec(`
        CREATE TRIGGER IF NOT EXISTS prevent_purchases_delete
        BEFORE DELETE ON purchase_invoices
        FOR EACH ROW WHEN OLD.status != 'draft'
        BEGIN
          SELECT RAISE(ABORT, 'لا يمكن حذف فواتير المشتريات. يجب إلغاؤها.');
        END;
      `);
      
      console.log('[DatabaseService] ✅ Additional duplicate prevention constraints and delete triggers added, edit triggers dropped');
    } catch (e) {
      console.error('[DatabaseService] Migration failed:', e);
    }

    // ── Accounting Migrations ──
    try {
      const raw = this.getRawDb();
      
      // Ensure accounting_closing_date setting exists
      const closingSetting: any = raw.prepare(`SELECT id FROM app_settings WHERE key = 'accounting_closing_date'`).get();
      if (!closingSetting) {
        raw.prepare(`INSERT INTO app_settings (key, value, type, description, updated_at) VALUES ('accounting_closing_date', '2000-01-01', 'string', 'تاريخ الإقفال المالي', datetime('now'))`).run();
        console.log('[DatabaseService] Migrated: added accounting_closing_date setting');
      }

      // Ensure allow_negative_stock setting exists
      const negativeStockSetting: any = raw.prepare(`SELECT id FROM app_settings WHERE key = 'allow_negative_stock'`).get();
      if (!negativeStockSetting) {
        raw.prepare(`INSERT INTO app_settings (key, value, type, description, updated_at) VALUES ('allow_negative_stock', 'false', 'boolean', 'السماح بالبيع بالسالب (البيع بالنقص)', datetime('now'))`).run();
        console.log('[DatabaseService] Migrated: added allow_negative_stock setting');
      }

      // Performance indexes for accounting queries
      raw.exec(`
        CREATE INDEX IF NOT EXISTS idx_jel_account ON journal_entry_lines(account_id);
        CREATE INDEX IF NOT EXISTS idx_jel_party ON journal_entry_lines(party_type, party_id);
        CREATE INDEX IF NOT EXISTS idx_je_date ON journal_entries(date);
        CREATE INDEX IF NOT EXISTS idx_je_status ON journal_entries(status);
        CREATE INDEX IF NOT EXISTS idx_je_ref ON journal_entries(reference_type, reference_id);
        CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_log(user_id);
        CREATE INDEX IF NOT EXISTS idx_audit_date ON audit_log(created_at);
      `);
      console.log('[DatabaseService] Accounting indexes ensured');
    } catch (e) {
      console.error('[DatabaseService] Accounting migration failed:', e);
    }

    // ── Low Stock Features Migration ──
    try {
      const raw = this.getRawDb();

      // Add is_low_stock_muted column to products
      const hasMutedCol: any = raw.prepare(`PRAGMA table_info(products)`).all()
        .find((col: any) => col.name === 'is_low_stock_muted');
      if (!hasMutedCol) {
        raw.exec(`ALTER TABLE products ADD COLUMN is_low_stock_muted INTEGER NOT NULL DEFAULT 0`);
        console.log('[DatabaseService] ✅ Added is_low_stock_muted column to products');
      }

      // Trigger: auto-unmute when stock increases (on INSERT to stock_balances)
      raw.exec(`
        CREATE TRIGGER IF NOT EXISTS auto_unmute_low_stock_on_insert
        AFTER INSERT ON stock_balances
        FOR EACH ROW
        BEGIN
          UPDATE products SET is_low_stock_muted = 0
          WHERE id = NEW.product_id AND is_low_stock_muted = 1;
        END;
      `);

      // Trigger: auto-unmute when stock quantity changes (on UPDATE to stock_balances)
      raw.exec(`
        CREATE TRIGGER IF NOT EXISTS auto_unmute_low_stock_on_update
        AFTER UPDATE OF quantity ON stock_balances
        FOR EACH ROW
        WHEN NEW.quantity > OLD.quantity
        BEGIN
          UPDATE products SET is_low_stock_muted = 0
          WHERE id = NEW.product_id AND is_low_stock_muted = 1;
        END;
      `);
      console.log('[DatabaseService] ✅ Low stock triggers added');
    } catch (e) {
      console.error('[DatabaseService] Low stock migration failed:', e);
    }

    // ── YK MS ERP User Customizations Migration & Employee/Permissions Support ──
    try {
      const raw = this.getRawDb();
      const pragmaUsers = raw.prepare("PRAGMA table_info(users)").all();
      const usersColumns = pragmaUsers.map((col: any) => col.name);
      
      const usersCreateSql = raw.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='users'").get() as any;
      const needsEmployeeRole = usersCreateSql && usersCreateSql.sql && !usersCreateSql.sql.includes('employee');
      const needsPermissions = !usersColumns.includes('permissions');
      const needsAvatar = !usersColumns.includes('avatar');
      const needsColor = !usersColumns.includes('color');
      
      if (needsEmployeeRole || needsPermissions || needsAvatar || needsColor) {
        console.log('[DatabaseService] Migrating users table schema (roles check, permissions, avatar, color)...');
        raw.exec("PRAGMA foreign_keys=OFF;");
        
        // Recreate users table safely to include employee in the check constraint and add columns
        raw.exec(`
          CREATE TABLE IF NOT EXISTS users_new (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL UNIQUE,
            password_hash TEXT NOT NULL,
            full_name TEXT NOT NULL,
            role TEXT NOT NULL CHECK(role IN ('owner','manager','accountant','cashier','storekeeper','employee')),
            is_active INTEGER NOT NULL DEFAULT 1,
            pin_code TEXT,
            avatar TEXT,
            color TEXT,
            permissions TEXT,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            last_login TEXT
          );
        `);
        
        // Copy columns that exist in the old table
        const selectCols = ['id', 'username', 'password_hash', 'full_name', 'role', 'is_active', 'pin_code'];
        if (usersColumns.includes('avatar')) selectCols.push('avatar');
        if (usersColumns.includes('color')) selectCols.push('color');
        if (usersColumns.includes('permissions')) selectCols.push('permissions');
        if (usersColumns.includes('created_at')) selectCols.push('created_at');
        if (usersColumns.includes('last_login')) selectCols.push('last_login');
        
        const selectStr = selectCols.join(', ');
        const targetStr = selectCols.join(', ');
        
        raw.exec(`
          INSERT INTO users_new (${targetStr})
          SELECT ${selectStr} FROM users;
        `);
        
        raw.exec("DROP TABLE users;");
        raw.exec("ALTER TABLE users_new RENAME TO users;");
        raw.exec("PRAGMA foreign_keys=ON;");
        console.log('[DatabaseService] ✅ users table migrated successfully');
      }
      
      // Update existing admin default values for testing fast PIN
      raw.prepare("UPDATE users SET pin_code = '1234', avatar = '👑', color = 'blue' WHERE username = 'admin' AND (pin_code IS NULL OR avatar IS NULL)").run();
      
      console.log('[DatabaseService] ✅ Users avatar, color, permissions columns, roles and default admin PIN ensured');
    } catch (e) {
      console.error('[DatabaseService] Users migration failed:', e);
    }

    // ── Invoice Status Drafts Migration ──
    try {
      const raw = this.getRawDb();
      
      // 1. Migrate sales_invoices
      const salesSchema = raw.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='sales_invoices'").get() as { sql: string } | undefined;
      if (salesSchema && !salesSchema.sql.includes("'draft'")) {
        console.log('[DatabaseService] Migrating sales_invoices: allowing status = "draft"...');
        
        raw.exec('PRAGMA foreign_keys = OFF;');
        
        // Drop delete trigger before renaming/dropping
        raw.exec('DROP TRIGGER IF EXISTS prevent_sales_delete;');
        
        raw.exec(`
          ALTER TABLE sales_invoices RENAME TO sales_invoices_old;
          
          CREATE TABLE sales_invoices (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id TEXT UNIQUE,
            invoice_number TEXT NOT NULL UNIQUE,
            sale_type TEXT NOT NULL DEFAULT 'retail' CHECK(sale_type IN ('retail','wholesale')),
            customer_id INTEGER,
            user_id INTEGER REFERENCES users(id),
            date TEXT NOT NULL,
            time TEXT,
            subtotal REAL NOT NULL DEFAULT 0,
            global_discount_type TEXT DEFAULT 'percent',
            global_discount_value REAL DEFAULT 0,
            global_discount_amount REAL DEFAULT 0,
            total_before_tax REAL DEFAULT 0,
            tax_percent REAL DEFAULT 0,
            tax_amount REAL DEFAULT 0,
            total REAL NOT NULL DEFAULT 0,
            paid REAL NOT NULL DEFAULT 0,
            remaining REAL NOT NULL DEFAULT 0,
            payment_method TEXT DEFAULT 'cash',
            status TEXT NOT NULL DEFAULT 'confirmed' CHECK(status IN ('confirmed','cancelled','draft')),
            notes TEXT,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            updated_at TEXT NOT NULL DEFAULT (datetime('now'))
          );
          
          INSERT INTO sales_invoices (
            id, session_id, invoice_number, sale_type, customer_id, user_id, date, time, 
            subtotal, global_discount_type, global_discount_value, global_discount_amount, 
            total_before_tax, tax_percent, tax_amount, total, paid, remaining, 
            payment_method, status, notes, created_at, updated_at
          )
          SELECT 
            id, session_id, invoice_number, sale_type, customer_id, user_id, date, time, 
            subtotal, global_discount_type, global_discount_value, global_discount_amount, 
            total_before_tax, tax_percent, tax_amount, total, paid, remaining, 
            payment_method, status, notes, created_at, updated_at
          FROM sales_invoices_old;
          
          DROP TABLE sales_invoices_old;
        `);
        
        // Re-create delete trigger
        raw.exec(`
          CREATE TRIGGER IF NOT EXISTS prevent_sales_delete
          BEFORE DELETE ON sales_invoices
          FOR EACH ROW WHEN OLD.status != 'draft'
          BEGIN
            SELECT RAISE(ABORT, 'لا يمكن حذف فواتير المبيعات. يجب إلغاؤها.');
          END;
        `);
        
        raw.exec('PRAGMA foreign_keys = ON;');
        console.log('[DatabaseService] ✅ sales_invoices migrated successfully to support drafts');
      }

      // 2. Migrate purchase_invoices
      const purchaseSchema = raw.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='purchase_invoices'").get() as { sql: string } | undefined;
      if (purchaseSchema && !purchaseSchema.sql.includes("'draft'")) {
        console.log('[DatabaseService] Migrating purchase_invoices: allowing status = "draft"...');
        
        raw.exec('PRAGMA foreign_keys = OFF;');
        
        // Drop delete trigger before renaming/dropping
        raw.exec('DROP TRIGGER IF EXISTS prevent_purchases_delete;');
        
        raw.exec(`
          ALTER TABLE purchase_invoices RENAME TO purchase_invoices_old;
          
          CREATE TABLE purchase_invoices (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id TEXT UNIQUE,
            invoice_number TEXT NOT NULL UNIQUE,
            supplier_invoice_number TEXT,
            supplier_id INTEGER,
            user_id INTEGER REFERENCES users(id),
            date TEXT NOT NULL,
            subtotal REAL NOT NULL DEFAULT 0,
            discount_amount REAL DEFAULT 0,
            tax_amount REAL DEFAULT 0,
            total REAL NOT NULL DEFAULT 0,
            paid REAL NOT NULL DEFAULT 0,
            remaining REAL NOT NULL DEFAULT 0,
            payment_method TEXT DEFAULT 'cash',
            status TEXT NOT NULL DEFAULT 'confirmed' CHECK(status IN ('confirmed','cancelled','draft')),
            notes TEXT,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            updated_at TEXT NOT NULL DEFAULT (datetime('now'))
          );
          
          INSERT INTO purchase_invoices (
            id, session_id, invoice_number, supplier_invoice_number, supplier_id, user_id, 
            date, subtotal, discount_amount, tax_amount, total, paid, remaining, 
            payment_method, status, notes, created_at, updated_at
          )
          SELECT 
            id, session_id, invoice_number, supplier_invoice_number, supplier_id, user_id, 
            date, subtotal, discount_amount, tax_amount, total, paid, remaining, 
            payment_method, status, notes, created_at, updated_at
          FROM purchase_invoices_old;
          
          DROP TABLE purchase_invoices_old;
        `);
        
        // Re-create delete trigger
        raw.exec(`
          CREATE TRIGGER IF NOT EXISTS prevent_purchases_delete
          BEFORE DELETE ON purchase_invoices
          FOR EACH ROW WHEN OLD.status != 'draft'
          BEGIN
            SELECT RAISE(ABORT, 'لا يمكن حذف فواتير المشتريات. يجب إلغاؤها.');
          END;
        `);
        
        raw.exec('PRAGMA foreign_keys = ON;');
        console.log('[DatabaseService] ✅ purchase_invoices migrated successfully to support drafts');
      }
    } catch (e) {
      console.error('[DatabaseService] Invoice draft migration failed:', e);
    }
  },

  /**
   * Recompiles search terms for a given product and synchronizes the FTS5 virtual table.
   * Compiles: Product Name, name_fr, category name, brand name, fitment vehicle models,
   * and matching dictionary synonyms, translations, Darja, and typos.
   */
  recompileProductSearchTerms(productId: number): void {
    try {
      const raw = this.getRawDb();
      
      // 1. Get base product info
      const product = raw.prepare(`
        SELECT p.id, p.name, p.name_fr, p.barcode, p.internal_code, c.name as category_name, c.name_fr as category_name_fr, b.name as brand_name
        FROM products p
        LEFT JOIN categories c ON c.id = p.category_id
        LEFT JOIN brands b ON b.id = p.brand_id
        WHERE p.id = ?
      `).get(productId) as any;
      
      if (!product) {
        // Product deleted, clean up index and FTS
        raw.prepare('DELETE FROM product_search_index WHERE product_id = ?').run(productId);
        raw.prepare('DELETE FROM product_search_fts WHERE product_id = ?').run(productId);
        return;
      }
      
      // 2. Gather all compatibility vehicles (fitments)
      const fitments = raw.prepare(`
        SELECT DISTINCT vm.name as model_name, vb.name as brand_name
        FROM product_fitments pf
        LEFT JOIN vehicle_models vm ON vm.id = pf.vehicle_model_id
        LEFT JOIN vehicle_brands vb ON vb.id = pf.vehicle_brand_id
        WHERE pf.product_id = ?
      `).all(productId) as any[];
      
      // 3. Find matching dictionary terms for product name, name_fr, or category name
      const allTextToMatch = [product.name, product.name_fr, product.category_name, product.category_name_fr]
        .filter(Boolean)
        .map(t => String(t).toLowerCase());
        
      const synonyms: string[] = [];
      if (allTextToMatch.length > 0) {
        const dictRows = raw.prepare(`
          SELECT DISTINCT term, standard_term 
          FROM search_dictionary
        `).all() as any[];
        
        for (const row of dictRows) {
          const stdLower = String(row.standard_term).toLowerCase();
          const termLower = String(row.term).toLowerCase();
          
          const matches = allTextToMatch.some(text => 
            text.includes(stdLower) || 
            text.includes(termLower) || 
            stdLower.includes(text) || 
            termLower.includes(text)
          );
          if (matches) {
            synonyms.push(row.term);
            synonyms.push(row.standard_term);
          }
        }
      }
      
      // Compile terms set to avoid duplicates
      const termsSet = new Set<string>();
      
      // Helper to split and add words
      const addWords = (text: string) => {
        if (!text) return;
        // Normalize Arabic (أ، إ، آ -> ا) and (ة -> ه) and strip diacritics
        const normalized = text
          .replace(/[أإآ]/g, 'ا')
          .replace(/ة/g, 'ه')
          .replace(/[\u064B-\u0652]/g, '') // strip diacritics
          .toLowerCase();
          
        const words = normalized.split(/[\s,\.\-\_\/\\\(\)\{\}\[\]\+]+/);
        for (const w of words) {
          if (w && w.trim().length > 1) {
            termsSet.add(w.trim());
          }
        }
      };
      
      // Add all textual fields
      addWords(product.name);
      addWords(product.name_fr);
      addWords(product.category_name);
      addWords(product.category_name_fr);
      addWords(product.brand_name);
      
      // Add barcodes to search index compiled terms
      addWords(product.barcode);
      addWords(product.internal_code);
      try {
        const altBarcodes = raw.prepare('SELECT barcode FROM product_barcodes WHERE product_id = ?').all(productId) as any[];
        if (altBarcodes && altBarcodes.length > 0) {
          for (const alt of altBarcodes) {
            addWords(alt.barcode);
          }
        }
      } catch (err) {
        console.error('[DatabaseService] Error fetching alt barcodes for search compiling:', err);
      }
      
      // Add fitment vehicles
      for (const f of fitments) {
        addWords(f.model_name);
        addWords(f.brand_name);
      }
      
      // Add matching synonyms & typos
      for (const syn of synonyms) {
        addWords(syn);
      }
      
      const compiledTermsString = Array.from(termsSet).join(' ');
      
      // 4. Update index and FTS tables in transaction
      raw.transaction(() => {
        // Standard index table
        raw.prepare(`
          INSERT INTO product_search_index (product_id, compiled_terms)
          VALUES (?, ?)
          ON CONFLICT(product_id) DO UPDATE SET compiled_terms = excluded.compiled_terms
        `).run(productId, compiledTermsString);
        
        // FTS5 Virtual Table
        raw.prepare('DELETE FROM product_search_fts WHERE product_id = ?').run(productId);
        raw.prepare(`
          INSERT INTO product_search_fts (product_id, search_text)
          VALUES (?, ?)
        `).run(productId, compiledTermsString);
      })();
    } catch (e) {
      console.error(`[DatabaseService] Error compiling search index for product ${productId}:`, e);
    }
  },

  /**
   * Recompiles search terms for all products in the database.
   */
  recompileAllProductsSearchTerms(): void {
    try {
      const raw = this.getRawDb();
      const productsList = raw.prepare('SELECT id FROM products').all() as any[];
      console.log(`[DatabaseService] Recompiling search index for ${productsList.length} products...`);
      
      let count = 0;
      for (const p of productsList) {
        try {
          this.recompileProductSearchTerms(p.id);
          count++;
        } catch (e) {
          console.error(`[DatabaseService] Error compiling product ${p.id}:`, e);
        }
      }
      console.log(`[DatabaseService] Successfully recompiled ${count}/${productsList.length} products.`);
    } catch (e) {
      console.error('[DatabaseService] Failed to compile search index for all products:', e);
    }
  },

  /**
   * Run self-healing to reconnect usage tables (search_usage and product_usage)
   * with new product IDs using stored barcodes and names.
   */
  healUsageTables(): void {
    try {
      const raw = this.getRawDb();
      console.log('[DatabaseService] Running self-healing for usage learning and fitment tables...');
      
      // Update product_ids based on barcode/internal_code
      raw.exec(`
        UPDATE search_usage 
        SET product_id = (SELECT id FROM products WHERE barcode = search_usage.product_barcode OR internal_code = search_usage.product_barcode)
        WHERE product_barcode IS NOT NULL AND (product_id IS NULL OR product_id NOT IN (SELECT id FROM products));
        
        UPDATE product_usage 
        SET product_id = (SELECT id FROM products WHERE barcode = product_usage.product_barcode OR internal_code = product_usage.product_barcode)
        WHERE product_barcode IS NOT NULL AND (product_id IS NULL OR product_id NOT IN (SELECT id FROM products));

        UPDATE product_fitments 
        SET product_id = (SELECT id FROM products WHERE barcode = product_fitments.product_barcode OR internal_code = product_fitments.product_barcode)
        WHERE product_barcode IS NOT NULL AND (product_id IS NULL OR product_id NOT IN (SELECT id FROM products));
      `);
      
      // Update product_ids based on name if barcode lookup did not match
      raw.exec(`
        UPDATE search_usage 
        SET product_id = (SELECT id FROM products WHERE name = search_usage.product_name)
        WHERE product_id IS NULL OR product_id NOT IN (SELECT id FROM products);
        
        UPDATE product_usage 
        SET product_id = (SELECT id FROM products WHERE name = product_usage.product_name)
        WHERE product_id IS NULL OR product_id NOT IN (SELECT id FROM products);

        UPDATE product_fitments 
        SET product_id = (SELECT id FROM products WHERE name = product_fitments.product_name)
        WHERE product_id IS NULL OR product_id NOT IN (SELECT id FROM products);
      `);
      
      console.log('[DatabaseService] ✅ Usage learning and fitment tables healed successfully.');
    } catch (e) {
      console.error('[DatabaseService] Failed to heal usage tables:', e);
    }
  },

  /**
   * Get database file path
   */
  getDbPath(): string {
    return path.join(app.getPath('userData'), 'SparePartsERP', 'spare_parts.db');
  },

  /**
   * Close database connection
   */
  close(): void {
    if (rawDb) {
      rawDb.close();
      rawDb = null;
      db = null;
      console.log('[DatabaseService] Closed');
    }
  },
};
