/**
 * NF_12 - Finance Schema
 * الزبائن، الموردين، المدفوعات، الصندوق، المصروفات
 */
import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
import { users } from './users.schema';

export const customers = sqliteTable('customers', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  code: text('code').notNull().unique(),
  name: text('name').notNull(),
  name_fr: text('name_fr'),
  phone: text('phone'),
  phone2: text('phone2'),
  address: text('address'),
  email: text('email'),
  balance: real('balance').notNull().default(0),
  credit_limit: real('credit_limit').default(0),
  notes: text('notes'),
  is_active: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  created_at: text('created_at').notNull().default(sql`(datetime('now'))`),
  updated_at: text('updated_at').notNull().default(sql`(datetime('now'))`),
});

export const suppliers = sqliteTable('suppliers', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  code: text('code').notNull().unique(),
  name: text('name').notNull(),
  name_fr: text('name_fr'),
  phone: text('phone'),
  phone2: text('phone2'),
  address: text('address'),
  email: text('email'),
  balance: real('balance').notNull().default(0),
  notes: text('notes'),
  is_active: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  created_at: text('created_at').notNull().default(sql`(datetime('now'))`),
  updated_at: text('updated_at').notNull().default(sql`(datetime('now'))`),
});

export const payments = sqliteTable('payments', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  payment_number: text('payment_number').notNull().unique(),
  type: text('type', { enum: ['collection', 'disbursement'] }).notNull(),
  direction: text('direction', { enum: ['in', 'out'] }).notNull(),
  party_id: integer('party_id').notNull(),
  party_type: text('party_type', { enum: ['customer', 'supplier'] }).notNull(),
  invoice_id: integer('invoice_id'),
  invoice_type: text('invoice_type'),
  amount: real('amount').notNull(),
  payment_method: text('payment_method', { enum: ['cash', 'check', 'transfer'] }).notNull(),
  check_number: text('check_number'),
  bank_reference: text('bank_reference'),
  date: text('date').notNull(),
  cash_box_id: integer('cash_box_id').references(() => cashBoxes.id),
  user_id: integer('user_id').references(() => users.id),
  notes: text('notes'),
  created_at: text('created_at').notNull().default(sql`(datetime('now'))`),
});

export const cashBoxes = sqliteTable('cash_boxes', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  code: text('code').notNull().unique(),
  name: text('name').notNull(),
  current_balance: real('current_balance').notNull().default(0),
  is_active: integer('is_active', { mode: 'boolean' }).notNull().default(true),
});

export const cashTransactions = sqliteTable('cash_transactions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  cash_box_id: integer('cash_box_id').notNull().references(() => cashBoxes.id),
  type: text('type', { enum: ['in', 'out'] }).notNull(),
  amount: real('amount').notNull(),
  category: text('category').notNull(),
  reference_type: text('reference_type'),
  reference_id: integer('reference_id'),
  description: text('description'),
  user_id: integer('user_id').references(() => users.id),
  date: text('date').notNull(),
  created_at: text('created_at').notNull().default(sql`(datetime('now'))`),
});

export const cashClosings = sqliteTable('cash_closings', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  cash_box_id: integer('cash_box_id').notNull().references(() => cashBoxes.id),
  closing_number: text('closing_number').notNull().unique(),
  date: text('date').notNull(),
  expected_balance: real('expected_balance').notNull(),
  actual_balance: real('actual_balance').notNull(),
  difference: real('difference').notNull().default(0),
  total_sales_cash: real('total_sales_cash').default(0),
  total_expenses: real('total_expenses').default(0),
  total_payments_in: real('total_payments_in').default(0),
  total_payments_out: real('total_payments_out').default(0),
  user_id: integer('user_id').references(() => users.id),
  notes: text('notes'),
  created_at: text('created_at').notNull().default(sql`(datetime('now'))`),
});

export const expenses = sqliteTable('expenses', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  expense_number: text('expense_number').notNull().unique(),
  category: text('category').notNull(),
  description: text('description'),
  amount: real('amount').notNull(),
  payment_method: text('payment_method', { enum: ['cash', 'check', 'transfer'] }).default('cash'),
  date: text('date').notNull(),
  user_id: integer('user_id').references(() => users.id),
  receipt_reference: text('receipt_reference'),
  notes: text('notes'),
  created_at: text('created_at').notNull().default(sql`(datetime('now'))`),
});
