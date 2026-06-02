/**
 * NF_13 - System Schema
 * تسلسل الأرقام، تاريخ الأسعار، سجل المراجعة، سجل النسخ الاحتياطي
 */
import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
import { products } from './products.schema';
import { users } from './users.schema';

export const numberSequences = sqliteTable('number_sequences', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  prefix: text('prefix').notNull().unique(),
  last_number: integer('last_number').notNull().default(0),
  last_date: text('last_date'),
  format: text('format').notNull().default('{PREFIX}-{DATE}-{SEQ}'),
});

export const priceHistory = sqliteTable('price_history', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  product_id: integer('product_id').notNull().references(() => products.id),
  field_name: text('field_name').notNull(),
  old_value: real('old_value'),
  new_value: real('new_value'),
  changed_by: integer('changed_by').references(() => users.id),
  reference_type: text('reference_type'),
  reference_id: integer('reference_id'),
  created_at: text('created_at').notNull().default(sql`(datetime('now'))`),
});

export const auditLog = sqliteTable('audit_log', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  user_id: integer('user_id').references(() => users.id),
  username_snapshot: text('username_snapshot'),
  action: text('action').notNull(),
  table_name: text('table_name').notNull(),
  record_id: integer('record_id'),
  description: text('description'),
  old_data: text('old_data'),
  new_data: text('new_data'),
  app_version: text('app_version'),
  created_at: text('created_at').notNull().default(sql`(datetime('now'))`),
});

export const backupLog = sqliteTable('backup_log', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  filename: text('filename').notNull(),
  file_path: text('file_path').notNull(),
  size_bytes: integer('size_bytes'),
  type: text('type', { enum: ['manual', 'auto'] }).notNull(),
  status: text('status', { enum: ['success', 'failed'] }).notNull(),
  error_message: text('error_message'),
  created_at: text('created_at').notNull().default(sql`(datetime('now'))`),
});
