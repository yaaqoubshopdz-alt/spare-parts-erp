import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { products } from './products.schema';

export const searchDictionary = sqliteTable('search_dictionary', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  category: text('category').notNull(), // e.g. 'Filters', 'Brakes'
  standard_term: text('standard_term').notNull(), // e.g. 'Filtre à huile'
  term: text('term').notNull().unique(), // e.g. 'فلتر زيت', 'filtre a huile'
  term_type: text('term_type').notNull(), // 'ar', 'fr', 'en', 'darja', 'typo'
});

export const productSearchIndex = sqliteTable('product_search_index', {
  product_id: integer('product_id').primaryKey().references(() => products.id, { onDelete: 'cascade' }),
  compiled_terms: text('compiled_terms').notNull(),
});

export const searchUsage = sqliteTable('search_usage', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  search_term: text('search_term').notNull(),
  product_id: integer('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
  usage_count: integer('usage_count').notNull().default(1),
  last_used_at: text('last_used_at').notNull(),
});

export const productUsage = sqliteTable('product_usage', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  product_id: integer('product_id').notNull().unique().references(() => products.id, { onDelete: 'cascade' }),
  usage_count: integer('usage_count').notNull().default(1),
  last_used_at: text('last_used_at').notNull(),
});
