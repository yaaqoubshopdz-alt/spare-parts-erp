/**
 * NF_02 - App Settings Schema
 * إعدادات التطبيق (key/value)
 */
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const appSettings = sqliteTable('app_settings', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  key: text('key').notNull().unique(),
  value: text('value'),
  type: text('type', { enum: ['string', 'number', 'boolean', 'json'] }).notNull(),
  description: text('description'),
  updated_at: text('updated_at').notNull().default(sql`(datetime('now'))`),
});
