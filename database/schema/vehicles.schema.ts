/**
 * NF_07 - Vehicles Schema
 * ماركات وموديلات المركبات
 */
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const vehicleBrands = sqliteTable('vehicle_brands', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull().unique(),
  is_active: integer('is_active', { mode: 'boolean' }).notNull().default(true),
});

export const vehicleModels = sqliteTable('vehicle_models', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  vehicle_brand_id: integer('vehicle_brand_id').notNull().references(() => vehicleBrands.id),
  name: text('name').notNull(),
  year_from: integer('year_from'),
  year_to: integer('year_to'),
  engine: text('engine'),
  is_active: integer('is_active', { mode: 'boolean' }).notNull().default(true),
});
