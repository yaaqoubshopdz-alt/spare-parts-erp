/**
 * NF_04 - Units Schema
 * وحدات القياس مع تحويل
 */
import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';

export const units = sqliteTable('units', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  code: text('code').notNull().unique(),
  name: text('name').notNull(),
  symbol: text('symbol'),
  base_unit_id: integer('base_unit_id').references((): any => units.id),
  factor_to_base: real('factor_to_base').notNull().default(1),
  is_active: integer('is_active', { mode: 'boolean' }).notNull().default(true),
});
