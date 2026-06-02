/**
 * NF_14 - Idempotency Keys Schema
 * منع تكرار العمليات المالية (Idempotency Pattern)
 * مستخدم في: Stripe, Banking Systems, Enterprise ERP
 */
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
import { users } from './users.schema';

export const idempotencyKeys = sqliteTable('idempotency_keys', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  key: text('key').notNull().unique(),
  request_type: text('request_type', { enum: ['sale', 'purchase', 'sale_return', 'purchase_return', 'payment', 'expense'] }).notNull(),
  request_hash: text('request_hash'),
  response_body: text('response_body').notNull(),
  status: text('status', { enum: ['pending', 'completed', 'failed'] }).notNull().default('pending'),
  invoice_id: integer('invoice_id'),
  user_id: integer('user_id').references(() => users.id),
  created_at: text('created_at').notNull().default(sql`(datetime('now'))`),
  completed_at: text('completed_at'),
});
