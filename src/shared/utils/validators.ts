/**
 * Validators — shared validation rules for forms.
 */
import { z } from 'zod';

export const usernameSchema = z
  .string()
  .min(3, 'اسم المستخدم يجب أن يكون 3 أحرف على الأقل')
  .max(50, 'اسم المستخدم يجب ألا يتجاوز 50 حرفاً');

export const passwordSchema = z
  .string()
  .min(6, 'كلمة المرور يجب أن تكون 6 أحرف على الأقل');

export const loginSchema = z.object({
  username: usernameSchema,
  password: passwordSchema,
});

export const productSchema = z.object({
  name: z.string().min(1, 'اسم المنتج إلزامي').max(200),
  barcode: z.string().nullable().optional(),
  internal_code: z.string().nullable().optional(),
  purchase_price: z.number().min(0, 'السعر يجب أن يكون 0 أو أكثر'),
  wholesale_price: z.number().min(0),
  retail_price: z.number().min(0),
  min_stock_level: z.number().min(0),
  category_id: z.number().nullable().optional(),
  unit: z.string().default('قطعة'),
});

export const customerSchema = z.object({
  name: z.string().min(1, 'اسم الزبون إلزامي').max(150),
  phone: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  credit_limit: z.number().min(0).default(0),
});

export const supplierSchema = z.object({
  name: z.string().min(1, 'اسم المورد إلزامي').max(150),
  phone: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type ProductInput = z.infer<typeof productSchema>;
export type CustomerInput = z.infer<typeof customerSchema>;
export type SupplierInput = z.infer<typeof supplierSchema>;
