/**
 * NF_10 - Invoices Schema
 * فواتير البيع والشراء مع بنودها
 */
import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
import { products } from './products.schema';
import { productBatches } from './inventory.schema';
import { users } from './users.schema';

export const salesInvoices = sqliteTable('sales_invoices', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  session_id: text('session_id').unique(),
  invoice_number: text('invoice_number').notNull().unique(),
  sale_type: text('sale_type', { enum: ['retail', 'wholesale'] }).notNull().default('retail'),
  customer_id: integer('customer_id'),
  user_id: integer('user_id').references(() => users.id),
  date: text('date').notNull(),
  time: text('time'),
  subtotal: real('subtotal').notNull().default(0),
  global_discount_type: text('global_discount_type', { enum: ['percent', 'amount'] }).default('percent'),
  global_discount_value: real('global_discount_value').default(0),
  global_discount_amount: real('global_discount_amount').default(0),
  total_before_tax: real('total_before_tax').default(0),
  tax_percent: real('tax_percent').default(0),
  tax_amount: real('tax_amount').default(0),
  total: real('total').notNull().default(0),
  paid: real('paid').notNull().default(0),
  remaining: real('remaining').notNull().default(0),
  payment_method: text('payment_method', { enum: ['cash', 'check', 'transfer', 'mixed'] }).default('cash'),
  status: text('status', { enum: ['draft', 'confirmed', 'cancelled'] }).notNull().default('draft'),
  notes: text('notes'),
  created_at: text('created_at').notNull().default(sql`(datetime('now'))`),
  updated_at: text('updated_at').notNull().default(sql`(datetime('now'))`),
});

export const salesInvoiceItems = sqliteTable('sales_invoice_items', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  invoice_id: integer('invoice_id').notNull().references(() => salesInvoices.id, { onDelete: 'cascade' }),
  product_id: integer('product_id').notNull().references(() => products.id),
  batch_id: integer('batch_id').references(() => productBatches.id),
  product_name_snapshot: text('product_name_snapshot').notNull(),
  product_barcode_snapshot: text('product_barcode_snapshot'),
  quantity: real('quantity').notNull(),
  unit: text('unit'),
  unit_price: real('unit_price').notNull(),
  cost_price_snapshot: real('cost_price_snapshot').notNull().default(0),
  item_discount_type: text('item_discount_type', { enum: ['percent', 'amount'] }).default('percent'),
  item_discount_value: real('item_discount_value').default(0),
  item_discount_amount: real('item_discount_amount').default(0),
  total: real('total').notNull(),
  sort_order: integer('sort_order').default(0),
});

export const purchaseInvoices = sqliteTable('purchase_invoices', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  session_id: text('session_id').unique(),
  invoice_number: text('invoice_number').notNull().unique(),
  supplier_invoice_number: text('supplier_invoice_number'),
  supplier_id: integer('supplier_id'),
  user_id: integer('user_id').references(() => users.id),
  date: text('date').notNull(),
  subtotal: real('subtotal').notNull().default(0),
  discount_amount: real('discount_amount').default(0),
  tax_amount: real('tax_amount').default(0),
  total: real('total').notNull().default(0),
  paid: real('paid').notNull().default(0),
  remaining: real('remaining').notNull().default(0),
  payment_method: text('payment_method', { enum: ['cash', 'check', 'transfer', 'mixed'] }).default('cash'),
  status: text('status', { enum: ['draft', 'confirmed', 'cancelled'] }).notNull().default('draft'),
  notes: text('notes'),
  created_at: text('created_at').notNull().default(sql`(datetime('now'))`),
  updated_at: text('updated_at').notNull().default(sql`(datetime('now'))`),
});

export const purchaseInvoiceItems = sqliteTable('purchase_invoice_items', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  invoice_id: integer('invoice_id').notNull().references(() => purchaseInvoices.id, { onDelete: 'cascade' }),
  product_id: integer('product_id').notNull().references(() => products.id),
  product_name_snapshot: text('product_name_snapshot').notNull(),
  quantity: real('quantity').notNull(),
  unit: text('unit'),
  unit_price: real('unit_price').notNull(),
  wholesale_price: real('wholesale_price').default(0),
  retail_price: real('retail_price').default(0),
  total: real('total').notNull(),
  quantity_remaining: real('quantity_remaining'),
});

