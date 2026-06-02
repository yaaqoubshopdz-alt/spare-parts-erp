/**
 * NF_03 - Locations Schema
 * مواقع التخزين (بديل الفروع)
 */
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const locations = sqliteTable('locations', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  code: text('code').notNull().unique(),
  name: text('name').notNull(),
  type: text('type', { enum: ['showroom', 'warehouse', 'service', 'returns', 'damaged'] }).notNull(),
  is_active: integer('is_active', { mode: 'boolean' }).notNull().default(true),
});
