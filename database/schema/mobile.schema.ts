/**
 * Mobile Assistant Schema
 * جداول المساعد المحمول (الصور وطلبات الصور والفواتير المصورة)
 */
import { sqliteTable, text, integer, blob } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
import { products } from './products.schema';

export const productImages = sqliteTable('product_images', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  product_id: integer('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
  file_path: text('file_path').notNull(), // Relative path in file storage
  thumbnail: blob('thumbnail'), // Tiny blob for preview
  is_primary: integer('is_primary', { mode: 'boolean' }).notNull().default(false),
  created_at: text('created_at').notNull().default(sql`(datetime('now'))`),
});

export const photoRequests = sqliteTable('photo_requests', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  product_id: integer('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
  status: text('status', { enum: ['pending', 'received', 'cancelled'] }).notNull().default('pending'),
  created_at: text('created_at').notNull().default(sql`(datetime('now'))`),
  received_at: text('received_at'),
});

export const invoiceCaptures = sqliteTable('invoice_captures', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  file_path: text('file_path').notNull(),
  prompt_used: text('prompt_used'),
  status: text('status', { enum: ['new', 'processed'] }).notNull().default('new'),
  created_at: text('created_at').notNull().default(sql`(datetime('now'))`),
});
