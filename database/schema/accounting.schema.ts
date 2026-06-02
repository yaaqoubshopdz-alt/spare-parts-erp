/**
 * NF_15 - Accounting Schema
 * شجرة الحسابات، مراكز التكلفة، القيود المزدوجة
 */
import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
import { users } from './users.schema';

export const accounts = sqliteTable('accounts', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  code: text('code').notNull().unique(),
  name: text('name').notNull(),
  type: text('type', { enum: ['asset', 'liability', 'equity', 'revenue', 'expense'] }).notNull(),
  parent_id: integer('parent_id'), // Self reference for hierarchy
  is_active: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  created_at: text('created_at').notNull().default(sql`(datetime('now'))`),
});

export const costCenters = sqliteTable('cost_centers', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  code: text('code').notNull().unique(),
  name: text('name').notNull(),
  parent_id: integer('parent_id'),
  is_active: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  created_at: text('created_at').notNull().default(sql`(datetime('now'))`),
});

export const journalEntries = sqliteTable('journal_entries', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  entry_number: text('entry_number').notNull().unique(),
  date: text('date').notNull(),
  description: text('description').notNull(),
  status: text('status', { enum: ['draft', 'posted'] }).notNull().default('posted'),
  reference_type: text('reference_type'), // e.g., 'sales_invoice', 'payment'
  reference_id: integer('reference_id'),
  user_id: integer('user_id').references(() => users.id),
  created_at: text('created_at').notNull().default(sql`(datetime('now'))`),
});

export const journalEntryLines = sqliteTable('journal_entry_lines', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  entry_id: integer('entry_id').notNull().references(() => journalEntries.id, { onDelete: 'cascade' }),
  account_id: integer('account_id').notNull().references(() => accounts.id),
  debit: real('debit').notNull().default(0),
  credit: real('credit').notNull().default(0),
  cost_center_id: integer('cost_center_id').references(() => costCenters.id),
  party_type: text('party_type', { enum: ['customer', 'supplier', 'cashbox', 'none'] }).default('none'),
  party_id: integer('party_id'),
});
