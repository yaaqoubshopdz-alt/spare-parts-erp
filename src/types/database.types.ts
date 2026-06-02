/**
 * Database Types - SparePartsERP
 * بدون sync، بدون branch_id، بدون cloud_id
 */

// ── Enums ─────────────────────────────────────────────────────
export type UserRole = 'owner' | 'manager' | 'accountant' | 'cashier' | 'storekeeper' | 'employee';
export type SaleType = 'retail' | 'wholesale';
export type PaymentMethod = 'cash' | 'check' | 'transfer' | 'mixed';
export type InvoiceStatus = 'confirmed' | 'cancelled';
export type PaymentDirection = 'in' | 'out';
export type PartyType = 'customer' | 'supplier';
export type DiscountType = 'percent' | 'amount';
export type SettingValueType = 'string' | 'number' | 'boolean' | 'json';
export type LocationType = 'showroom' | 'warehouse' | 'service' | 'returns' | 'damaged';
export type BatchStatus = 'open' | 'closed' | 'expired';
export type MovementType = 'purchase' | 'sale' | 'sale_return' | 'purchase_return' | 'adjustment' | 'transfer_in' | 'transfer_out' | 'damage' | 'initial';
export type RefundMethod = 'cash' | 'credit' | 'exchange';
export type CashTransactionType = 'in' | 'out';

// ── Users ─────────────────────────────────────────────────────
export interface User {
  id: number;
  username: string;
  password_hash?: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
  pin_code: string | null;
  permissions?: string | null;
  created_at: string;
  last_login: string | null;
}

// ── Locations ─────────────────────────────────────────────────
export interface Location {
  id: number;
  code: string;
  name: string;
  type: LocationType;
  is_active: boolean;
}

// ── Units ─────────────────────────────────────────────────────
export interface Unit {
  id: number;
  code: string;
  name: string;
  symbol: string | null;
  base_unit_id: number | null;
  factor_to_base: number;
  is_active: boolean;
}

// ── Categories ────────────────────────────────────────────────
export interface Category {
  id: number;
  name: string;
  name_fr: string | null;
  parent_id: number | null;
  sort_order: number;
  is_active: boolean;
}

// ── Brands ────────────────────────────────────────────────────
export interface Brand {
  id: number;
  name: string;
  is_active: boolean;
}

// ── Vehicles ──────────────────────────────────────────────────
export interface VehicleBrand {
  id: number;
  name: string;
  is_active: boolean;
}

export interface VehicleModel {
  id: number;
  vehicle_brand_id: number;
  name: string;
  year_from: number | null;
  year_to: number | null;
  engine: string | null;
  is_active: boolean;
}

// ── Products ──────────────────────────────────────────────────
export interface Product {
  id: number;
  barcode: string | null;
  internal_code: string | null;
  name: string;
  name_fr: string | null;
  category_id: number | null;
  brand_id: number | null;
  unit_id: number;
  purchase_price: number;
  wholesale_price: number;
  retail_price: number;
  min_stock_level: number;
  is_batch_tracked: boolean;
  track_expiry: boolean;
  description: string | null;
  has_sub_unit?: boolean;
  pieces_per_box?: number;
  total_stock?: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProductBarcode {
  id: number;
  product_id: number;
  barcode: string;
  is_primary: boolean;
}

export interface ProductFitment {
  id: number;
  product_id: number;
  vehicle_brand_id: number;
  vehicle_model_id: number | null;
  year_from: number | null;
  year_to: number | null;
  engine: string | null;
  notes: string | null;
}

// ── Inventory ─────────────────────────────────────────────────
export interface ProductBatch {
  id: number;
  product_id: number;
  batch_number: string;
  expiry_date: string | null;
  purchase_price: number;
  quantity_initial: number;
  quantity_remaining: number;
  location_id: number;
  status: BatchStatus;
  reference_type: string | null;
  reference_id: number | null;
  created_at: string;
}

export interface StockBalance {
  id: number;
  product_id: number;
  location_id: number;
  quantity: number;
  updated_at: string;
}

export interface StockMovement {
  id: number;
  product_id: number;
  location_id: number;
  batch_id: number | null;
  movement_type: MovementType;
  quantity: number;
  balance_after: number;
  reference_type: string | null;
  reference_id: number | null;
  user_id: number | null;
  notes: string | null;
  created_at: string;
}

// ── Sales Invoices ────────────────────────────────────────────
export interface SalesInvoice {
  id: number;
  invoice_number: string;
  sale_type: SaleType;
  customer_id: number | null;
  user_id: number | null;
  date: string;
  time: string | null;
  subtotal: number;
  global_discount_type: DiscountType;
  global_discount_value: number;
  global_discount_amount: number;
  total_before_tax: number;
  tax_percent: number;
  tax_amount: number;
  total: number;
  paid: number;
  remaining: number;
  payment_method: PaymentMethod;
  status: InvoiceStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface SalesInvoiceItem {
  id: number;
  invoice_id: number;
  product_id: number;
  batch_id: number | null;
  product_name_snapshot: string;
  product_barcode_snapshot: string | null;
  quantity: number;
  unit: string | null;
  unit_price: number;
  cost_price_snapshot: number;
  item_discount_type: DiscountType;
  item_discount_value: number;
  item_discount_amount: number;
  total: number;
  sort_order: number;
}

// ── Purchase Invoices ─────────────────────────────────────────
export interface PurchaseInvoice {
  id: number;
  invoice_number: string;
  supplier_invoice_number: string | null;
  supplier_id: number | null;
  user_id: number | null;
  date: string;
  subtotal: number;
  discount_amount: number;
  tax_amount: number;
  total: number;
  paid: number;
  remaining: number;
  payment_method: PaymentMethod;
  status: InvoiceStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface PurchaseInvoiceItem {
  id: number;
  invoice_id: number;
  product_id: number;
  product_name_snapshot: string;
  quantity: number;
  unit: string | null;
  unit_price: number;
  wholesale_price: number;
  retail_price: number;
  total: number;
}

// ── Returns ───────────────────────────────────────────────────
export interface SalesReturn {
  id: number;
  return_number: string;
  original_invoice_id: number;
  customer_id: number | null;
  user_id: number | null;
  date: string;
  total: number;
  refund_method: RefundMethod;
  status: InvoiceStatus;
  reason: string | null;
  notes: string | null;
  created_at: string;
}

export interface SalesReturnItem {
  id: number;
  return_id: number;
  product_id: number;
  batch_id: number | null;
  product_name_snapshot: string;
  quantity: number;
  unit_price: number;
  total: number;
}

export interface PurchaseReturn {
  id: number;
  return_number: string;
  original_invoice_id: number;
  supplier_id: number | null;
  user_id: number | null;
  date: string;
  total: number;
  status: InvoiceStatus;
  reason: string | null;
  notes: string | null;
  created_at: string;
}

export interface PurchaseReturnItem {
  id: number;
  return_id: number;
  product_id: number;
  batch_id: number | null;
  product_name_snapshot: string;
  quantity: number;
  unit_price: number;
  total: number;
}

// ── Finance ───────────────────────────────────────────────────
export interface Customer {
  id: number;
  code: string;
  name: string;
  name_fr: string | null;
  phone: string | null;
  phone2: string | null;
  address: string | null;
  email: string | null;
  balance: number;
  credit_limit: number;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Supplier {
  id: number;
  code: string;
  name: string;
  name_fr: string | null;
  phone: string | null;
  phone2: string | null;
  address: string | null;
  email: string | null;
  balance: number;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Payment {
  id: number;
  payment_number: string;
  type: string;
  direction: PaymentDirection;
  party_id: number;
  party_type: PartyType;
  invoice_id: number | null;
  invoice_type: string | null;
  amount: number;
  payment_method: 'cash' | 'check' | 'transfer';
  check_number: string | null;
  bank_reference: string | null;
  date: string;
  user_id: number | null;
  notes: string | null;
  created_at: string;
}

export interface CashBox {
  id: number;
  code: string;
  name: string;
  current_balance: number;
  is_active: boolean;
}

export interface CashTransaction {
  id: number;
  cash_box_id: number;
  type: CashTransactionType;
  amount: number;
  category: string;
  reference_type: string | null;
  reference_id: number | null;
  description: string | null;
  user_id: number | null;
  date: string;
  created_at: string;
}

export interface CashClosing {
  id: number;
  cash_box_id: number;
  closing_number: string;
  date: string;
  expected_balance: number;
  actual_balance: number;
  difference: number;
  total_sales_cash: number;
  total_expenses: number;
  total_payments_in: number;
  total_payments_out: number;
  user_id: number | null;
  notes: string | null;
  created_at: string;
}

export interface Expense {
  id: number;
  expense_number: string;
  category: string;
  description: string | null;
  amount: number;
  payment_method: string;
  date: string;
  user_id: number | null;
  receipt_reference: string | null;
  notes: string | null;
  created_at: string;
}

// ── System ────────────────────────────────────────────────────
export interface NumberSequence {
  id: number;
  prefix: string;
  last_number: number;
  last_date: string | null;
  format: string;
}

export interface PriceHistory {
  id: number;
  product_id: number;
  field_name: string;
  old_value: number | null;
  new_value: number | null;
  changed_by: number | null;
  reference_type: string | null;
  reference_id: number | null;
  created_at: string;
}

export interface AuditLog {
  id: number;
  user_id: number | null;
  username_snapshot: string | null;
  action: string;
  table_name: string;
  record_id: number | null;
  description: string | null;
  old_data: string | null;
  new_data: string | null;
  app_version: string | null;
  created_at: string;
}

export interface AppSetting {
  id: number;
  key: string;
  value: string | null;
  type: SettingValueType;
  description: string | null;
  updated_at: string;
}
