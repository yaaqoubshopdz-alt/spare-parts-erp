/**
 * NF_01 - Users Schema
 * جدول المستخدمين مع 5 أدوار
 */
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  username: text('username').notNull().unique(),
  password_hash: text('password_hash').notNull(),
  full_name: text('full_name').notNull(),
  role: text('role', { enum: ['owner', 'manager', 'accountant', 'cashier', 'storekeeper', 'employee'] }).notNull(),
  is_active: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  pin_code: text('pin_code'),
  avatar: text('avatar'),
  color: text('color'),
  permissions: text('permissions'),
  created_at: text('created_at').notNull().default(sql`(datetime('now'))`),
  last_login: text('last_login'),
});
