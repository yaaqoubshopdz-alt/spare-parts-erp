/**
 * NF_09 - Inventory Schema
 * الدُفعات + أرصدة المخزون + حركات المخزون
 */
import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
import { products } from './products.schema';
import { locations } from './locations.schema';
import { users } from './users.schema';

export const productBatches = sqliteTable('product_batches', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  product_id: integer('product_id').notNull().references(() => products.id),
  batch_number: text('batch_number').notNull(),
  expiry_date: text('expiry_date'),
  purchase_price: real('purchase_price').notNull().default(0),
  quantity_initial: real('quantity_initial').notNull().default(0),
  quantity_remaining: real('quantity_remaining').notNull().default(0),
  location_id: integer('location_id').notNull().references(() => locations.id),
  status: text('status', { enum: ['open', 'closed', 'expired'] }).notNull().default('open'),
  reference_type: text('reference_type'),
  reference_id: integer('reference_id'),
  created_at: text('created_at').notNull().default(sql`(datetime('now'))`),
});

export const stockBalances = sqliteTable('stock_balances', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  product_id: integer('product_id').notNull().references(() => products.id),
  location_id: integer('location_id').notNull().references(() => locations.id),
  quantity: real('quantity').notNull().default(0),
  updated_at: text('updated_at').notNull().default(sql`(datetime('now'))`),
});

export const stockMovements = sqliteTable('stock_movements', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  product_id: integer('product_id').notNull().references(() => products.id),
  location_id: integer('location_id').notNull().references(() => locations.id),
  batch_id: integer('batch_id').references(() => productBatches.id),
  movement_type: text('movement_type', {
    enum: ['purchase', 'sale', 'sale_return', 'purchase_return', 'adjustment', 'transfer_in', 'transfer_out', 'damage', 'initial']
  }).notNull(),
  quantity: real('quantity').notNull(),
  balance_after: real('balance_after').notNull(),
  reference_type: text('reference_type'),
  reference_id: integer('reference_id'),
  user_id: integer('user_id').references(() => users.id),
  notes: text('notes'),
  created_at: text('created_at').notNull().default(sql`(datetime('now'))`),
});
