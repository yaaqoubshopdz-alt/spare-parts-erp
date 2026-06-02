/**
 * NF_05 - Categories Schema
 * تصنيفات المنتجات (هرمية)
 */
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const categories = sqliteTable('categories', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  name_fr: text('name_fr'),
  parent_id: integer('parent_id').references((): any => categories.id),
  sort_order: integer('sort_order').notNull().default(0),
  is_active: integer('is_active', { mode: 'boolean' }).notNull().default(true),
});
