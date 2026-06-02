import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
import { products } from './products.schema';
import { users } from './users.schema';
import { categories } from './categories.schema';

export const inventoryCountSessions = sqliteTable('inventory_count_sessions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  session_number: text('session_number').notNull().unique(),
  started_by: integer('started_by').notNull().references(() => users.id),
  started_at: text('started_at').notNull().default(sql`(datetime('now'))`),
  finished_at: text('finished_at'),
  approved_at: text('approved_at'),
  status: text('status', {
    enum: ['draft', 'counting', 'reviewing', 'approved', 'cancelled']
  }).notNull().default('draft'),
  category_id: integer('category_id').references(() => categories.id),
  category_name_snapshot: text('category_name_snapshot'),
  total_products: integer('total_products').notNull().default(0),
  checked_count: integer('checked_count').notNull().default(0),
  match_count: integer('match_count').notNull().default(0),
  mismatch_count: integer('mismatch_count').notNull().default(0),
  notes: text('notes'),
  created_at: text('created_at').notNull().default(sql`(datetime('now'))`),
});

export const inventoryCountItems = sqliteTable('inventory_count_items', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  session_id: integer('session_id').notNull().references(() => inventoryCountSessions.id, { onDelete: 'cascade' }),
  product_id: integer('product_id').notNull().references(() => products.id),
  barcode_snapshot: text('barcode_snapshot'),
  product_name_snapshot: text('product_name_snapshot'),
  category_name_snapshot: text('category_name_snapshot'),
  unit_name_snapshot: text('unit_name_snapshot'),
  is_hidden_from_sales: integer('is_hidden_from_sales', { mode: 'boolean' }).notNull().default(false),
  system_qty_at_start: real('system_qty_at_start').notNull().default(0),
  movements_during_count: real('movements_during_count').notNull().default(0),
  expected_qty: real('expected_qty').notNull().default(0),
  counted_qty: real('counted_qty'),
  final_difference: real('final_difference'),
  status: text('status', {
    enum: ['unchecked', 'matched', 'mismatch']
  }).notNull().default('unchecked'),
  mismatch_reason: text('mismatch_reason'),
  notes: text('notes'),
  checked_at: text('checked_at'),
  checked_by: integer('checked_by').references(() => users.id),
});
