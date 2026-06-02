/**
 * NF_06 - Brands Schema
 * ماركات المنتجات
 */
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const brands = sqliteTable('brands', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull().unique(),
  is_active: integer('is_active', { mode: 'boolean' }).notNull().default(true),
});
