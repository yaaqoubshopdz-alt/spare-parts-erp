/**
 * NF_08 - Products Schema
 * المنتجات + باركودات متعددة + توافق المركبات
 */
import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
import { categories } from './categories.schema';
import { brands } from './brands.schema';
import { units } from './units.schema';
import { vehicleBrands, vehicleModels } from './vehicles.schema';

export const products = sqliteTable('products', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  barcode: text('barcode').unique(),
  internal_code: text('internal_code').unique(),
  name: text('name').notNull(),
  name_fr: text('name_fr'),
  category_id: integer('category_id').references(() => categories.id),
  brand_id: integer('brand_id').references(() => brands.id),
  unit_id: integer('unit_id').notNull().references(() => units.id),
  has_sub_unit: integer('has_sub_unit', { mode: 'boolean' }).notNull().default(false),
  pieces_per_box: real('pieces_per_box').notNull().default(1),
  purchase_price: real('purchase_price').notNull().default(0),
  wholesale_price: real('wholesale_price').notNull().default(0),
  retail_price: real('retail_price').notNull().default(0),
  min_stock_level: real('min_stock_level').notNull().default(0),
  is_batch_tracked: integer('is_batch_tracked', { mode: 'boolean' }).notNull().default(false),
  track_expiry: integer('track_expiry', { mode: 'boolean' }).notNull().default(false),
  description: text('description'),
  is_active: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  is_hidden_from_sales: integer('is_hidden_from_sales', { mode: 'boolean' }).notNull().default(false),
  created_at: text('created_at').notNull().default(sql`(datetime('now'))`),
  updated_at: text('updated_at').notNull().default(sql`(datetime('now'))`),
});

export const productBarcodes = sqliteTable('product_barcodes', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  product_id: integer('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
  barcode: text('barcode').notNull().unique(),
  is_primary: integer('is_primary', { mode: 'boolean' }).notNull().default(false),
});

export const productFitments = sqliteTable('product_fitments', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  product_id: integer('product_id').references(() => products.id),
  product_barcode: text('product_barcode'),
  product_name: text('product_name').notNull(),
  vehicle_brand_id: integer('vehicle_brand_id').notNull().references(() => vehicleBrands.id),
  vehicle_model_id: integer('vehicle_model_id').references(() => vehicleModels.id),
  year_from: integer('year_from'),
  year_to: integer('year_to'),
  engine: text('engine'),
  notes: text('notes'),
});

