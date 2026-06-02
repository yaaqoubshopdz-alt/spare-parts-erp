# SparePartsERP - التوثيق الشامل للمشروع
## نظام إدارة قطع غيار المركبات v1.0.0

---

## الفهرس

1. [نظرة عامة على المشروع](#1-نظرة-عامة-على-المشروع)
2. [فكرة المشروع والهدف منه](#2-فكرة-المشروع-والهدف-منه)
3. [البنية التقنية](#3-البنية-التقنية)
4. [معمارية التطبيق](#4-معمارية-التطبيق)
5. [قاعدة البيانات](#5-قاعدة-البيانات)
6. [الوحدات والوظائف](#6-الوحدات-والوظائف)
7. [نظام الصلاحيات](#7-نظام-الصلاحيات)
8. [الواجهات والصفحات](#8-الواجهات-والصفحات)
9. [نظام الترجمة واللغات](#9-نظام-الترجمة-واللغات)
10. [نظام الطباعة](#10-نظام-الطباعة)
11. [نظام النسخ الاحتياطي](#11-نظام-النسخ-الاحتياطي)
12. [اختصارات لوحة المفاتيح](#12-اختصارات-لوحة-المفاتيح)
13. [دورة حياة الفاتورة](#13-دورة-حياة-الفاتورة)
14. [إدارة المخزون](#14-إدارة-المخزون)
15. [نظام الدفعات](#15-نظام-الدفعات)
16. [نظام المركبات والتوافق](#16-نظام-المركبات-والتوافق)
17. [الإدارة المالية](#17-الإدارة-المالية)
18. [المرتجعات](#18-المرتجعات)
19. [التقارير](#19-التقارير)
20. [الأمان](#20-الأمان)
21. [قائمة الملفات والمجلدات](#21-قائمة-الملفات-والمجلدات)
22. [قنوات IPC](#22-قنوات-ipc)
23. [الأوامر والتشغيل](#23-الأوامر-والتشغيل)

---

## 1. نظرة عامة على المشروع

### المعلومات الأساسية

| البند | القيمة |
|-------|--------|
| **اسم المشروع** | SparePartsERP |
| **الوصف** | نظام إدارة قطع الغيار - نظام ERP متكامل لمتاجر قطع غيار المركبات |
| **الإصدار** | 1.0.0 |
| **نوع التطبيق** | تطبيق سطح مكتب (Desktop App) |
| **الإطار الرئيسي** | Electron + React + TypeScript |
| **قاعدة البيانات** | SQLite (محلية - بدون سحابة) |
| **نظام ORM** | Drizzle ORM |
| **اللغات المدعومة** | العربية (ar)، الفرنسية (fr) |
| **العملة الافتراضية** | الدينار الجزائري (د.ج / DA) |
| **نظام البناء** | Vite + electron-builder |
| **إدارة الحالة** | Zustand |
| **التصميم** | TailwindCSS + Framer Motion |

### المميزات الرئيسية

- تطبيق سطح مكتب يعمل بدون اتصال بالإنترنت (100% Offline)
- قاعدة بيانات SQLite محلية - لا تحتاج سيرفر
- واجهة عربية/فرنسية مع دعم RTL
- نظام صلاحيات متعدد الأدوار (5 أدوار)
- نقطة بيع (POS) سريعة
- إدارة مخزون متقدمة مع دفعات وتواريخ انتهاء
- تتبع توافق القطع مع المركبات
- نظام فواتير مبيعات ومشتريات
- مرتجعات مبيعات ومشتريات
- إدارة مالية شاملة (صندوق، مصاريف، مدفوعات)
- تقارير ولوحة تحكم
- طباعة فواتير
- نسخ احتياطي تلقائي

---

## 2. فكرة المشروع والهدف منه

### المشكلة التي يحلها

متاجر قطع غيار المركبات تحتاج نظاماً متكاملاً لإدارة:
- المخزون الكبير من القطع مع باركود متعدد
- توافق كل قطعة مع ماركات وموديلات مركبات مختلفة
- فواتير المبيعات بأنواع (تجزئة، جملة، نصف جملة)
- فواتير المشتريات من الموردين
- المرتجعات
- الصندوق والمصاريف
- كشف حساب الزبائن والموردين

### الحل المقدم

SparePartsERP هو نظام ERP **محلي بالكامل** يعمل على سطح المكتب بدون حاجة لاتصال إنترنت أو سيرفر خارجي. يستخدم:
- **Electron** لتطبيق سطح مكتب متعدد المنصات
- **SQLite** كقاعدة بيانات محلية
- **React** لواجهة مستخدم تفاعلية
- **Drizzle ORM** للتعامل مع قاعدة البيانات

### ما يميزه عن الأنظمة الأخرى

| الميزة | الوصف |
|--------|-------|
| **بدون إنترنت** | يعمل 100% offline - لا يحتاج سيرفر |
| **بدون اشتراكات** | لا رسوم شهرية أو سنوية |
| **تتبع المركبات** | ربط كل قطعة بماركات وموديلات وسنوات |
| **باركود متعدد** | كل منتج يمكن أن يكون له عدة باركودات |
| **دفعات وتواريخ انتهاء** | تتبع كل دفعة مع تاريخ انتهاء |
| **ثلاث أسعار بيع** | تجزئة، جملة، نصف جملة |
| **صناديق متعددة** | إدارة عدة صناديق نقدية |
| **سجل مراجعة** | تتبع كل عملية في النظام |

---

## 3. البنية التقنية

### التقنيات المستخدمة

#### Frontend (الواجهة الأمامية)

| التقنية | الإصدار | الاستخدام |
|---------|---------|-----------|
| React | 18.2.0 | بناء واجهة المستخدم |
| TypeScript | 5.3.0 | كتابة كود آمن النوع |
| React Router | 6.21.0 | التنقل بين الصفحات |
| Zustand | 4.4.0 | إدارة حالة التطبيق |
| TailwindCSS | 3.4.0 | تنسيق الواجهة |
| Framer Motion | 12.38.0 | الحركات والتأثيرات |
| Lucide React | 0.303.0 | الأيقونات |
| React Hook Form | 7.49.0 | إدارة النماذج |
| Zod | 3.22.0 | التحقق من البيانات |
| Recharts | 2.15.4 | الرسوم البيانية |
| react-i18next | 14.0.0 | الترجمة |
| date-fns | 3.0.0 | تنسيق التواريخ |
| react-to-print | 2.15.0 | الطباعة |
| react-barcode | 1.5.0 | إنشاء باركود |
| jspdf | 2.5.1 | إنشاء PDF |
| xlsx | 0.18.5 | تصدير Excel |
| sonner | 2.0.7 | الإشعارات |
| @tanstack/react-table | 8.12.0 | جداول متقدمة |
| @tanstack/react-virtual | 3.0.0 | تمرير افتراضي |
| @ericblade/quagga2 | 1.8.4 | مسح الباركود |

#### Backend (الخلفية - Electron)

| التقنية | الإصدار | الاستخدام |
|---------|---------|-----------|
| Electron | 28.0.0 | إطار تطبيق سطح المكتب |
| better-sqlite3 | 11.10.0 | قاعدة بيانات SQLite |
| Drizzle ORM | 0.29.0 | ORM لقاعدة البيانات |
| bcryptjs | 2.4.3 | تشفير كلمات المرور |
| electron-store | 8.1.0 | تخزين إعدادات Electron |
| node-schedule | 2.1.1 | جدولة المهام |
| numeral | 2.0.6 | تنسيق الأرقام |

#### أدوات التطوير

| الأداة | الإصدار | الاستخدام |
|--------|---------|-----------|
| Vite | 5.0.0 | بناء وتطوير سريع |
| vite-plugin-electron | 0.29.1 | تكامل Vite مع Electron |
| electron-builder | 24.9.0 | بناء وتغليف التطبيق |
| drizzle-kit | 0.20.0 | إدارة مخططات قاعدة البيانات |
| ESLint | 8.55.0 | فحص جودة الكود |
| Prettier | 3.1.1 | تنسيق الكود |
| Vitest | 1.0.4 | اختبار الوحدات |

---

## 4. معمارية التطبيق

### هيكل الطبقات

```
┌─────────────────────────────────────────────────────┐
│                  واجهة المستخدم (React)               │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐   │
│  │  Pages  │ │Components│ │  Hooks  │ │  Store  │   │
│  └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘   │
│       └───────────┴───────────┴───────────┘          │
│                         │                             │
│                    window.electronAPI                 │
└─────────────────────────┬───────────────────────────┘
                          │ IPC (invoke/handle)
┌─────────────────────────┴───────────────────────────┐
│              Electron Main Process                   │
│  ┌─────────────────────────────────────────────┐    │
│  │            IPC Handlers (16 وحدة)             │    │
│  │  products, sales, purchases, returns,       │    │
│  │  inventory, batches, vehicles, cashbox,     │    │
│  │  expenses, reports, settings, print,        │    │
│  │  dashboard, catalog, parties, users          │    │
│  └─────────────────────┬───────────────────────┘    │
│                        │                              │
│  ┌─────────────────────┴───────────────────────┐    │
│  │          Database Service                    │    │
│  │     (better-sqlite3 + Drizzle ORM)           │    │
│  └─────────────────────┬───────────────────────┘    │
│                        │                              │
│  ┌─────────────────────┴───────────────────────┐    │
│  │          Auth Service                        │    │
│  │     (bcryptjs + localStorage session)        │    │
│  └─────────────────────────────────────────────┘    │
└─────────────────────────┬───────────────────────────┘
                          │
┌─────────────────────────┴───────────────────────────┐
│              SQLite Database (database.sqlite)        │
│  ┌─────────────────────────────────────────────┐    │
│  │  22 جدول: users, products, invoices,         │    │
│  │  inventory, finance, returns, vehicles, ...  │    │
│  └─────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────┘
```

### تدفق البيانات

1. **المستخدم** يتفاعل مع واجهة React
2. React تستدعي `window.electronAPI.invoke(channel, data)`
3. **preload.ts** يتحقق من أن القناة مسموحة
4. **Electron Main** يستدعي المعالج المناسب (IPC Handler)
5. **IPC Handler** يستخدم **DatabaseService** لتنفيذ استعلام SQL
6. **DatabaseService** يتعامل مع **SQLite** عبر better-sqlite3
7. النتيجة تعود عبر IPC إلى React
8. React تُحدّث الواجهة

### نمط الاتصال

| الاتجاه | الآلية |
|---------|--------|
| Renderer → Main | `ipcRenderer.invoke()` عبر `window.electronAPI` |
| Main → Renderer | غير مستخدم حالياً (لا إشعارات دفع) |
| المصادقة | جلسة محلية بدون JWT |

---

## 5. قاعدة البيانات

### نظرة عامة

| البند | القيمة |
|-------|--------|
| **نوع قاعدة البيانات** | SQLite 3 |
| **المحرك** | better-sqlite3 |
| **ORM** | Drizzle ORM |
| **الموقع** | `database.sqlite` (في مجلد بيانات المستخدم) |
| **عدد الجداول** | 22 جدول |
| **نظام الترحيل** | drizzle-kit generate/migrate |

### الجداول (22 جدول)

#### NF_01: users - المستخدمون

| العمود | النوع | الوصف |
|--------|-------|-------|
| id | INTEGER PK | معرف تلقائي |
| username | TEXT UNIQUE | اسم المستخدم |
| password_hash | TEXT | كلمة المرور المشفرة (bcrypt) |
| full_name | TEXT | الاسم الكامل |
| role | TEXT ENUM | الدور: owner, manager, accountant, cashier, storekeeper |
| is_active | BOOLEAN | هل الحساب نشط |
| pin_code | TEXT | رمز PIN للموافقات السريعة |
| created_at | TEXT | تاريخ الإنشاء |
| last_login | TEXT | آخر تسجيل دخول |

#### NF_02: app_settings - إعدادات التطبيق

| العمود | النوع | الوصف |
|--------|-------|-------|
| id | INTEGER PK | معرف تلقائي |
| key | TEXT UNIQUE | مفتاح الإعداد |
| value | TEXT | قيمة الإعداد |
| type | TEXT ENUM | النوع: string, number, boolean, json |
| description | TEXT | وصف الإعداد |
| updated_at | TEXT | تاريخ آخر تحديث |

#### NF_03: locations - مواقع التخزين

| العمود | النوع | الوصف |
|--------|-------|-------|
| id | INTEGER PK | معرف تلقائي |
| code | TEXT UNIQUE | رمز الموقع |
| name | TEXT | اسم الموقع |
| type | TEXT ENUM | النوع: showroom, warehouse, service, returns, damaged |
| is_active | BOOLEAN | هل الموقع نشط |

#### NF_04: units - وحدات القياس

| العمود | النوع | الوصف |
|--------|-------|-------|
| id | INTEGER PK | معرف تلقائي |
| code | TEXT UNIQUE | رمز الوحدة |
| name | TEXT | اسم الوحدة |
| symbol | TEXT | الرمز (مثال: قطعة، صندوق) |
| base_unit_id | INTEGER FK | الوحدة الأساسية (للتحويل) |
| factor_to_base | REAL | معامل التحويل للوحدة الأساسية |
| is_active | BOOLEAN | هل الوحدة نشطة |

#### NF_05: categories - تصنيفات المنتجات

| العمود | النوع | الوصف |
|--------|-------|-------|
| id | INTEGER PK | معرف تلقائي |
| name | TEXT | اسم التصنيف (عربي) |
| name_fr | TEXT | اسم التصنيف (فرنسي) |
| parent_id | INTEGER FK | التصنيف الأب (هرمي) |
| sort_order | INTEGER | ترتيب العرض |
| is_active | BOOLEAN | هل التصنيف نشط |

#### NF_06: brands - ماركات المنتجات

| العمود | النوع | الوصف |
|--------|-------|-------|
| id | INTEGER PK | معرف تلقائي |
| name | TEXT UNIQUE | اسم الماركة |
| is_active | BOOLEAN | هل الماركة نشطة |

#### NF_07: vehicles - المركبات

**vehicle_brands** - ماركات المركبات:
| id | name | is_active |

**vehicle_models** - موديلات المركبات:
| العمود | النوع | الوصف |
|--------|-------|-------|
| id | INTEGER PK | معرف تلقائي |
| vehicle_brand_id | INTEGER FK | ماركة المركبة |
| name | TEXT | اسم الموديل |
| year_from | INTEGER | سنة البداية |
| year_to | INTEGER | سنة النهاية |
| engine | TEXT | نوع المحرك |
| is_active | BOOLEAN | هل الموديل نشط |

#### NF_08: products - المنتجات

| العمود | النوع | الوصف |
|--------|-------|-------|
| id | INTEGER PK | معرف تلقائي |
| barcode | TEXT UNIQUE | الباركود الرئيسي |
| internal_code | TEXT UNIQUE | الكود الداخلي |
| name | TEXT | اسم المنتج (عربي) |
| name_fr | TEXT | اسم المنتج (فرنسي) |
| category_id | INTEGER FK | التصنيف |
| brand_id | INTEGER FK | الماركة |
| unit_id | INTEGER FK | وحدة القياس |
| has_sub_unit | BOOLEAN | هل له وحدة فرعية |
| pieces_per_box | REAL | عدد القطع في الصندوق |
| purchase_price | REAL | سعر الشراء |
| wholesale_price | REAL | سعر الجملة |
| half_wholesale_price | REAL | سعر نصف الجملة |
| retail_price | REAL | سعر التجزئة |
| min_stock_level | REAL | الحد الأدنى للمخزون |
| is_batch_tracked | BOOLEAN | هل يتتبع بالدفعات |
| track_expiry | BOOLEAN | هل يتتبع تاريخ الانتهاء |
| description | TEXT | وصف المنتج |
| is_active | BOOLEAN | هل المنتج نشط |
| created_at | TEXT | تاريخ الإنشاء |
| updated_at | TEXT | تاريخ آخر تحديث |

**product_barcodes** - باركودات إضافية:
| id | product_id FK | barcode | is_primary |

**product_fitments** - توافق المركبات:
| id | product_id FK | vehicle_brand_id FK | vehicle_model_id FK | year_from | year_to | engine | notes |

#### NF_09: inventory - المخزون

**product_batches** - الدفعات:
| العمود | النوع | الوصف |
|--------|-------|-------|
| id | INTEGER PK | معرف تلقائي |
| product_id | INTEGER FK | المنتج |
| batch_number | TEXT | رقم الدفعة |
| expiry_date | TEXT | تاريخ الانتهاء |
| purchase_price | REAL | سعر شراء الدفعة |
| quantity_initial | REAL | الكمية الأولية |
| quantity_remaining | REAL | الكمية المتبقية |
| location_id | INTEGER FK | موقع التخزين |
| status | TEXT ENUM | الحالة: open, closed, expired |
| reference_type | TEXT | نوع المرجع |
| reference_id | INTEGER | معرف المرجع |
| created_at | TEXT | تاريخ الإنشاء |

**stock_balances** - أرصدة المخزون:
| id | product_id FK | location_id FK | quantity | updated_at |

**stock_movements** - حركات المخزون:
| العمود | النوع | الوصف |
|--------|-------|-------|
| id | INTEGER PK | معرف تلقائي |
| product_id | INTEGER FK | المنتج |
| location_id | INTEGER FK | الموقع |
| batch_id | INTEGER FK | الدفعة |
| movement_type | TEXT ENUM | نوع الحركة: purchase, sale, sale_return, purchase_return, adjustment, transfer_in, transfer_out, damage, initial |
| quantity | REAL | الكمية |
| balance_after | REAL | الرصيد بعد الحركة |
| reference_type | TEXT | نوع المرجع |
| reference_id | INTEGER | معرف المرجع |
| user_id | INTEGER FK | المستخدم |
| notes | TEXT | ملاحظات |
| created_at | TEXT | تاريخ الإنشاء |

#### NF_10: invoices - الفواتير

**sales_invoices** - فواتير المبيعات:
| العمود | النوع | الوصف |
|--------|-------|-------|
| id | INTEGER PK | معرف تلقائي |
| invoice_number | TEXT UNIQUE | رقم الفاتورة |
| sale_type | TEXT ENUM | نوع البيع: retail, wholesale, half_wholesale |
| customer_id | INTEGER | الزبون |
| user_id | INTEGER FK | المستخدم |
| date | TEXT | التاريخ |
| time | TEXT | الوقت |
| subtotal | REAL | المجموع الفرعي |
| global_discount_type | TEXT ENUM | نوع الخصم: percent, amount |
| global_discount_value | REAL | قيمة الخصم |
| global_discount_amount | REAL | مبلغ الخصم المحسوب |
| total_before_tax | REAL | المجموع قبل الضريبة |
| tax_percent | REAL | نسبة الضريبة |
| tax_amount | REAL | مبلغ الضريبة |
| total | REAL | الإجمالي |
| paid | REAL | المدفوع |
| remaining | REAL | المتبقي |
| payment_method | TEXT ENUM | طريقة الدفع: cash, check, transfer, mixed |
| status | TEXT ENUM | الحالة: draft, confirmed, cancelled |
| notes | TEXT | ملاحظات |
| created_at | TEXT | تاريخ الإنشاء |
| updated_at | TEXT | تاريخ آخر تحديث |

**sales_invoice_items** - بنود فاتورة المبيعات:
| id | invoice_id FK | product_id FK | batch_id FK | product_name_snapshot | product_barcode_snapshot | quantity | unit | unit_price | cost_price_snapshot | item_discount_type | item_discount_value | item_discount_amount | total | sort_order |

**purchase_invoices** - فواتير المشتريات:
| العمود | النوع | الوصف |
|--------|-------|-------|
| id | INTEGER PK | معرف تلقائي |
| invoice_number | TEXT UNIQUE | رقم الفاتورة |
| supplier_invoice_number | TEXT | رقم فاتورة المورد |
| supplier_id | INTEGER | المورد |
| user_id | INTEGER FK | المستخدم |
| date | TEXT | التاريخ |
| subtotal | REAL | المجموع الفرعي |
| discount_amount | REAL | مبلغ الخصم |
| tax_amount | REAL | مبلغ الضريبة |
| total | REAL | الإجمالي |
| paid | REAL | المدفوع |
| remaining | REAL | المتبقي |
| payment_method | TEXT ENUM | طريقة الدفع |
| status | TEXT ENUM | الحالة: draft, confirmed, cancelled |
| notes | TEXT | ملاحظات |
| created_at | TEXT | تاريخ الإنشاء |
| updated_at | TEXT | تاريخ آخر تحديث |

**purchase_invoice_items** - بنود فاتورة المشتريات:
| id | invoice_id FK | product_id FK | product_name_snapshot | quantity | unit | unit_price | wholesale_price | retail_price | total |

#### NF_11: returns - المرتجعات

**sales_returns** - مرتجعات المبيعات:
| id | return_number | original_invoice_id FK | customer_id | user_id FK | date | total | refund_method ENUM | status ENUM | reason | notes | created_at |

**sales_return_items** - بنود مرتجع المبيعات:
| id | return_id FK | product_id FK | batch_id FK | product_name_snapshot | quantity | unit_price | total |

**purchase_returns** - مرتجعات المشتريات:
| id | return_number | original_invoice_id FK | supplier_id | user_id FK | date | total | status ENUM | reason | notes | created_at |

**purchase_return_items** - بنود مرتجع المشتريات:
| id | return_id FK | product_id FK | batch_id FK | product_name_snapshot | quantity | unit_price | total |

#### NF_12: finance - المالية

**customers** - الزبائن:
| id | code UNIQUE | name | name_fr | phone | phone2 | address | email | balance | credit_limit | notes | is_active | created_at | updated_at |

**suppliers** - الموردون:
| id | code UNIQUE | name | name_fr | phone | phone2 | address | email | balance | notes | is_active | created_at | updated_at |

**payments** - المدفوعات:
| id | payment_number UNIQUE | type ENUM | direction ENUM | party_id | party_type ENUM | invoice_id | invoice_type | amount | payment_method ENUM | check_number | bank_reference | date | cash_box_id FK | user_id FK | notes | created_at |

**cash_boxes** - الصناديق النقدية:
| id | code UNIQUE | name | current_balance | is_active |

**cash_transactions** - حركات الصندوق:
| id | cash_box_id FK | type ENUM | amount | category | reference_type | reference_id | description | user_id FK | date | created_at |

**cash_closings** - إغلاق الصناديق:
| id | cash_box_id FK | closing_number UNIQUE | date | expected_balance | actual_balance | difference | total_sales_cash | total_expenses | total_payments_in | total_payments_out | user_id FK | notes | created_at |

**expenses** - المصاريف:
| id | expense_number UNIQUE | category | description | amount | payment_method ENUM | date | user_id FK | receipt_reference | notes | created_at |

#### NF_13: system - النظام

**number_sequences** - تسلسل الأرقام:
| id | prefix UNIQUE | last_number | last_date | format |

**price_history** - تاريخ الأسعار:
| id | product_id FK | field_name | old_value | new_value | changed_by FK | reference_type | reference_id | created_at |

**audit_log** - سجل المراجعة:
| id | user_id FK | username_snapshot | action | table_name | record_id | description | old_data | new_data | app_version | created_at |

**backup_log** - سجل النسخ الاحتياطي:
| id | filename | file_path | size_bytes | type ENUM | status ENUM | error_message | created_at |

### العلاقات بين الجداول

```
users ─────────────────────────────────────────────────┐
  │                                                     │
  ├─ sales_invoices.user_id                            │
  ├─ purchase_invoices.user_id                         │
  ├─ stock_movements.user_id                           │
  ├─ cash_transactions.user_id                         │
  ├─ expenses.user_id                                  │
  ├─ audit_log.user_id                                 │
  └─ price_history.changed_by                          │

categories ─── products.category_id                    │
  │            (هرمي: parent_id → categories.id)       │
brands ─────── products.brand_id                       │
units ───────── products.unit_id                       │

locations ──── product_batches.location_id             │
               stock_balances.location_id              │
               stock_movements.location_id             │

vehicle_brands ── vehicle_models.vehicle_brand_id      │
                    │                                  │
                    └─ product_fitments.vehicle_brand_id
                       product_fitments.vehicle_model_id

products ──────── product_barcodes.product_id          │
                 product_fitments.product_id           │
                 sales_invoice_items.product_id        │
                 purchase_invoice_items.product_id     │
                 sales_return_items.product_id         │
                 purchase_return_items.product_id      │
                 product_batches.product_id            │
                 stock_balances.product_id             │
                 stock_movements.product_id            │
                 price_history.product_id              │

sales_invoices ── sales_invoice_items.invoice_id       │
                 sales_returns.original_invoice_id     │

purchase_invoices ─ purchase_invoice_items.invoice_id  │
                    purchase_returns.original_invoice_id

customers ────── sales_invoices.customer_id            │
                payments.party_id (when party_type='customer')

suppliers ────── purchase_invoices.supplier_id         │
                payments.party_id (when party_type='supplier')

cash_boxes ───── cash_transactions.cash_box_id         │
                 cash_closings.cash_box_id             │
                 payments.cash_box_id                  │

sales_returns ─── sales_return_items.return_id         │
purchase_returns ─ purchase_return_items.return_id     │
```

---

## 6. الوحدات والوظائف

### 6.1 وحدة المصادقة (Auth Service)

**الملف:** `electron/services/auth.service.ts`

**الوظائف:**
| الوظيفة | الوصف |
|---------|-------|
| `authenticate(username, password)` | التحقق من بيانات الدخول وتشفير الجلسة |
| `logout()` | إنهاء الجلسة وحذف البيانات |
| `checkSession()` | التحقق من وجود جلسة نشطة |
| `changePassword(userId, oldPw, newPw)` | تغيير كلمة المرور |

**آلية العمل:**
1. المستخدم يدخل اسم المستخدم وكلمة المرور
2. bcryptjs يقارن كلمة المرور مع hash المخزن
3. إذا صحيحة، تُحفظ بيانات المستخدم في localStorage
4. الجلسة تنتهي عند إغلاق التطبيق أو تسجيل الخروج

### 6.2 وحدة قاعدة البيانات (Database Service)

**الملف:** `electron/services/database.service.ts`

**الوظائف:**
| الوظيفة | الوصف |
|---------|-------|
| `initialize()` | إنشاء/فتح قاعدة البيانات وإنشاء الجداول |
| `seedInitialData()` | إدخال البيانات الأولية (مواقع، وحدات، تصنيفات، صناديق، إعدادات، مستخدم مدير) |
| `close()` | إغلاق الاتصال بقاعدة البيانات |

**البيانات الأولية:**
- 5 مواقع تخزين (showroom, warehouse, service, returns, damaged)
- وحدات قياس أساسية
- تصنيفات منتجات فارغة
- صندوق نقدي افتراضي
- إعدادات التطبيق الافتراضية
- مستخدم مدير افتراضي (owner)

### 6.3 وحدة المنتجات (Products IPC)

**الملف:** `electron/ipc/products.ipc.ts`

**القنوات:**
| القناة | الوصف |
|--------|-------|
| `db:products:search` | بحث في المنتجات (بالاسم، الباركود، الكود) |
| `db:products:getAll` | جلب جميع المنتجات |
| `db:products:getById` | جلب منتج محدد |
| `db:products:create` | إنشاء منتج جديد |
| `db:products:update` | تحديث منتج |
| `db:products:delete` | حذف منتج |

**المميزات:**
- بحث متعدد المعايير (اسم، باركود، كود داخلي)
- حساب إجمالي المخزون من جدول stock_balances
- دعم الباركودات المتعددة
- تتبع تاريخ الأسعار

### 6.4 وحدة المبيعات (Sales IPC)

**الملف:** `electron/ipc/sales.ipc.ts`

**القنوات:**
| القناة | الوصف |
|--------|-------|
| `db:sales:getNextNumber` | الحصول على رقم الفاتورة التالي |
| `db:sales:create` | إنشاء فاتورة مبيعات جديدة (مسودة) |
| `db:sales:confirm` | تأكيد فاتورة مبيعات |
| `db:sales:cancel` | إلغاء فاتورة مبيعات |
| `db:sales:getList` | جلب قائمة فواتير المبيعات |
| `db:sales:getById` | جلب فاتورة محددة مع بنودها |

**دورة حياة الفاتورة:**
1. **إنشاء (draft):** تُنشأ كمسودة مع بنودها
2. **تأكيد (confirmed):** تُخصم من المخزون وتُسجل حركة مخزونية
3. **إلغاء (cancelled):** تُرجع الكميات للمخزون وتُسجل حركة عكسية

### 6.5 وحدة المشتريات (Purchases IPC)

**الملف:** `electron/ipc/purchases.ipc.ts`

**القنوات:**
| القناة | الوصف |
|--------|-------|
| `db:purchases:getNextNumber` | الحصول على رقم فاتورة الشراء التالي |
| `db:purchases:create` | إنشاء فاتورة شراء جديدة |
| `db:purchases:confirm` | تأكيد فاتورة شراء |
| `db:purchases:cancel` | إلغاء فاتورة شراء |
| `db:purchases:getList` | جلب قائمة فواتير المشتريات |
| `db:purchases:getById` | جلب فاتورة محددة مع بنودها |

**عند التأكيد:**
- إضافة كميات للمخزون (stock_balances)
- إنشاء دفعة جديدة إذا كان المنتج يتتبع الدفعات
- تسجيل حركة مخزونية من نوع 'purchase'
- تحديث رصيد المورد

### 6.6 وحدة المرتجعات (Returns IPC)

**الملف:** `electron/ipc/returns.ipc.ts`

**القنوات:**
| القناة | الوصف |
|--------|-------|
| `db:returns:sales:create` | إنشاء مرتجع مبيعات |
| `db:returns:sales:confirm` | تأكيد مرتجع مبيعات |
| `db:returns:purchases:create` | إنشاء مرتجع مشتريات |
| `db:returns:purchases:confirm` | تأكيد مرتجع مشتريات |

**عند تأكيد مرتجع مبيعات:**
- إرجاع الكميات للمخزون
- تسجيل حركة من نوع 'sale_return'
- تحديث رصيد الزبون
- إنشاء دفالة مرتجع إذا لزم الأمر

**عند تأكيد مرتجع مشتريات:**
- خصم الكميات من المخزون
- تسجيل حركة من نوع 'purchase_return'
- تحديث رصيد المورد

### 6.7 وحدة المخزون (Inventory IPC)

**الملف:** `electron/ipc/inventory.ipc.ts`

**القنوات:**
| القناة | الوصف |
|--------|-------|
| `db:inventory:getStock` | جلب رصيد مخزون منتج في موقع |
| `db:inventory:getMovements` | جلب حركات مخزون منتج |
| `db:inventory:adjustStock` | تعديل رصيد المخزون (جرد) |

### 6.8 وحدة الدفعات (Batches IPC)

**الملف:** `electron/ipc/batches.ipc.ts`

**القنوات:**
| القناة | الوصف |
|--------|-------|
| `db:batches:getAll` | جلب جميع الدفعات |
| `db:batches:getByProduct` | جلب دفعات منتج محدد |
| `db:batches:getExpiring` | جلب الدفعات المنتهية أو القريبة من الانتهاء |

### 6.9 وحدة المركبات (Vehicles IPC)

**الملف:** `electron/ipc/vehicles.ipc.ts`

**القنوات:**
| القناة | الوصف |
|--------|-------|
| `db:vehicles:getBrands` | جلب ماركات المركبات |
| `db:vehicles:getModels` | جلب موديلات مركبة |
| `db:fitments:getByProduct` | جلب توافق منتج مع مركبات |

### 6.10 وحدة الصندوق (Cashbox IPC)

**الملف:** `electron/ipc/cashbox.ipc.ts`

**القنوات:**
| القناة | الوصف |
|--------|-------|
| `db:cashbox:getSummary` | جلب ملخص الصندوق |
| `db:cashbox:close` | إغلاق الصندوق |
| `db:cashbox:addTransaction` | إضافة حركة صندوق يدوية |

### 6.11 وحدة المصاريف (Expenses IPC)

**الملف:** `electron/ipc/expenses.ipc.ts`

**القنوات:**
| القناة | الوصف |
|--------|-------|
| `db:expenses:create` | إنشاء مصروف جديد |
| `db:expenses:getList` | جلب قائمة المصاريف |

### 6.12 وحدة التقارير (Reports IPC)

**الملف:** `electron/ipc/reports.ipc.ts`

**القنوات:**
| القناة | الوصف |
|--------|-------|
| `db:reports:getDailySales` | جلب مبيعات يومية |
| `db:reports:getProfitLoss` | جلب تقرير الأرباح والخسائر |
| `db:reports:getExpiringBatches` | جلب الدفعات المنتهية |

### 6.13 وحدة الإعدادات (Settings IPC)

**الملف:** `electron/ipc/settings.ipc.ts`

**القنوات:**
| القناة | الوصف |
|--------|-------|
| `db:settings:getAll` | جلب جميع الإعدادات |
| `db:settings:update` | تحديث إعداد |

### 6.14 وحدة الطباعة (Print IPC)

**الملف:** `electron/ipc/print.ipc.ts`

**القنوات:**
| القناة | الوصف |
|--------|-------|
| `print:invoice` | طباعة فاتورة |

### 6.15 وحدة لوحة التحكم (Dashboard IPC)

**الملف:** `electron/ipc/dashboard.ipc.ts`

**القنوات:**
| القناة | الوصف |
|--------|-------|
| `db:dashboard:getStats` | جلب إحصائيات لوحة التحكم |

### 6.16 وحدة الكتالوج (Catalog IPC)

**الملف:** `electron/ipc/catalog.ipc.ts`

**القنوات:**
| القناة | الوصف |
|--------|-------|
| `db:categories:getAll` | جلب جميع التصنيفات |
| `db:categories:create` | إنشاء تصنيف |
| `db:categories:update` | تحديث تصنيف |
| `db:categories:delete` | حذف تصنيف |
| `db:brands:getAll` | جلب جميع الماركات |
| `db:brands:create` | إنشاء ماركة |
| `db:units:getAll` | جلب جميع الوحدات |
| `db:units:update` | تحديث وحدة |
| `db:units:delete` | حذف وحدة |

### 6.17 وحدة الأطراف (Parties IPC)

**الملف:** `electron/ipc/parties.ipc.ts`

**القنوات:**
| القناة | الوصف |
|--------|-------|
| `db:customers:getAll` | جلب جميع الزبائن |
| `db:customers:search` | بحث في الزبائن |
| `db:customers:create` | إنشاء زبون |
| `db:customers:update` | تحديث زبون |
| `db:suppliers:getAll` | جلب جميع الموردين |
| `db:suppliers:create` | إنشاء مورد |
| `db:suppliers:update` | تحديث مورد |

### 6.18 وحدة المستخدمين (Users IPC)

**الملف:** `electron/ipc/users.ipc.ts`

**القنوات:**
| القناة | الوصف |
|--------|-------|
| `db:users:getAll` | جلب جميع المستخدمين |
| `db:users:create` | إنشاء مستخدم |
| `db:users:update` | تحديث مستخدم |
| `db:users:resetPassword` | إعادة تعيين كلمة المرور |

---

## 7. نظام الصلاحيات

### الأدوار (5 أدوار)

| الدور | الوصف |
|-------|-------|
| **owner** | المالك - صلاحيات كاملة |
| **manager** | المدير - صلاحيات واسعة بدون إدارة المستخدمين |
| **accountant** | المحاسب - عرض فقط + مالية |
| **cashier** | الكاشير - نقطة بيع + عرض زبائن |
| **storekeeper** | أمين المخزن - مشتريات + مخزون + دفعات |

### مصفوفة الصلاحيات

| الصلاحية | owner | manager | accountant | cashier | storekeeper |
|----------|-------|---------|------------|---------|-------------|
| view_dashboard | ✅ | ✅ | ✅ | ✅ | ✅ |
| view_sales | ✅ | ✅ | ✅ | ✅ | ❌ |
| create_sale | ✅ | ✅ | ❌ | ✅ | ❌ |
| edit_sale | ✅ | ✅ | ❌ | ❌ | ❌ |
| cancel_sale | ✅ | ✅ | ❌ | ❌ | ❌ |
| view_purchases | ✅ | ✅ | ✅ | ❌ | ✅ |
| create_purchase | ✅ | ✅ | ❌ | ❌ | ✅ |
| cancel_purchase | ✅ | ✅ | ❌ | ❌ | ❌ |
| view_inventory | ✅ | ✅ | ❌ | ❌ | ✅ |
| adjust_stock | ✅ | ✅ | ❌ | ❌ | ✅ |
| view_customers | ✅ | ✅ | ✅ | ✅ | ❌ |
| manage_customers | ✅ | ✅ | ✅ | ❌ | ❌ |
| view_suppliers | ✅ | ✅ | ✅ | ❌ | ❌ |
| manage_suppliers | ✅ | ✅ | ✅ | ❌ | ❌ |
| view_returns | ✅ | ✅ | ❌ | ✅ | ❌ |
| create_return | ✅ | ✅ | ❌ | ✅ | ❌ |
| confirm_return | ✅ | ✅ | ❌ | ❌ | ❌ |
| view_cashbox | ✅ | ✅ | ✅ | ✅ | ❌ |
| close_cashbox | ✅ | ✅ | ❌ | ✅ | ❌ |
| view_finance | ✅ | ✅ | ✅ | ❌ | ❌ |
| view_profits | ✅ | ❌ | ✅ | ❌ | ❌ |
| view_prices | ✅ | ✅ | ✅ | ❌ | ❌ |
| view_reports | ✅ | ✅ | ✅ | ❌ | ❌ |
| view_settings | ✅ | ❌ | ❌ | ❌ | ❌ |
| manage_users | ✅ | ❌ | ❌ | ❌ | ❌ |
| view_vehicles | ✅ | ✅ | ❌ | ❌ | ✅ |
| manage_vehicles | ✅ | ✅ | ❌ | ❌ | ❌ |
| view_batches | ✅ | ✅ | ❌ | ❌ | ✅ |
| manage_batches | ✅ | ✅ | ❌ | ❌ | ✅ |
| cancel_documents | ✅ | ✅ | ❌ | ❌ | ❌ |

---

## 8. الواجهات والصفحات

### الصفحات المتاحة

| الصفحة | المسار | الوصف | الملف |
|--------|--------|-------|-------|
| تسجيل الدخول | `/login` | صفحة المصادقة | `features/auth/LoginPage.tsx` |
| لوحة التحكم | `/dashboard` | إحصائيات ومؤشرات | `features/dashboard/DashboardPage.tsx` |
| نقطة البيع | `/pos` | شاشة البيع السريع | `features/sales/POSPage.tsx` |
| فواتير المبيعات | `/sales` | قائمة وإدارة فواتير البيع | `features/sales/SalesPage.tsx` |
| المشتريات | `/purchases` | قائمة فواتير الشراء | `features/purchases/PurchasesPage.tsx` |
| فاتورة شراء جديدة | `/purchases/new` | إنشاء فاتورة شراء | `features/purchases/PurchaseFormPage.tsx` |
| المخزون | `/inventory` | إدارة المخزون والأرصدة | `features/inventory/InventoryPage.tsx` |
| الزبائن | `/customers` | إدارة الزبائن | `features/parties/CustomersPage.tsx` |
| الموردون | `/suppliers` | إدارة الموردين | `features/parties/SuppliersPage.tsx` |
| المصاريف | `/expenses` | تسجيل المصاريف | `features/expenses/ExpensesPage.tsx` |
| التقارير | `/reports` | تقارير متنوعة | `features/reports/ReportsPage.tsx` |
| الإعدادات | `/settings` | إعدادات التطبيق | `features/settings/SettingsPage.tsx` |

### الصفحات الموجودة كملفات لكن بدون Route

| الصفحة | الملف | الحالة |
|--------|-------|--------|
| المرتجعات | `features/returns/ReturnsPage.tsx` | ⚠️ بدون Route |
| المركبات | `features/vehicles/VehiclesPage.tsx` | ⚠️ بدون Route |
| الصندوق | `features/cashbox/CashboxPage.tsx` | ⚠️ بدون Route |

### المكونات المشتركة

| المكون | المسار | الوصف |
|--------|--------|-------|
| MainLayout | `shared/components/layout/MainLayout.tsx` | التخطيط الرئيسي (Sidebar + TopBar + محتوى) |
| Sidebar | `shared/components/layout/Sidebar.tsx` | الشريط الجانبي للتنقل |
| TopBar | `shared/components/layout/TopBar.tsx` | الشريط العلوي |
| ProInvoiceLayout | `shared/components/layout/ProInvoiceLayout.tsx` | تخطيط الفواتير الاحترافي |
| ErrorBoundary | `shared/components/ui/ErrorBoundary.tsx` | معالجة أخطاء React |
| LoadingSpinner | `shared/components/ui/LoadingSpinner.tsx` | مؤشر التحميل |
| AdminPinModal | `shared/components/ui/AdminPinModal.tsx` | نافذة PIN المدير |
| InvoicePrintTemplate | `shared/components/print/InvoicePrintTemplate.tsx` | قالب طباعة الفاتورة |

---

## 9. نظام الترجمة واللغات

### اللغات المدعومة

| اللغة | الكود | الاتجاه |
|-------|-------|---------|
| العربية | `ar` | RTL (من اليمين لليسار) |
| الفرنسية | `fr` | LTR (من اليسار لليمين) |

### الإعداد

**الملف:** `src/i18n/i18n.config.ts`

```typescript
i18n.use(initReactI18next).init({
  resources: {
    ar: { translation: ar },
    fr: { translation: fr },
  },
  lng: 'ar',
  fallbackLng: 'ar',
});
```

### ملفات الترجمة

| الملف | المحتوى |
|-------|---------|
| `src/i18n/ar.json` | الترجمات العربية |
| `src/i18n/fr.json` | الترجمات الفرنسية |

### الاستخدام

```typescript
const { t, i18n } = useTranslation();
// t('common.save') → "حفظ" (عربي) أو "Enregistrer" (فرنسي)
```

---

## 10. نظام الطباعة

### الآلية

**الملف:** `electron/ipc/print.ipc.ts`

1. الواجهة تستدعي `print:invoice` مع بيانات الفاتورة
2. Electron ينشئ نافذة BrowserWindow جديدة
3. يُحمّل قالب HTML للفاتورة
4. يُستدعى `webContents.print()` تلقائياً
5. تُغلق النافذة بعد الطباعة

### قالب الطباعة

**الملف:** `src/shared/components/print/InvoicePrintTemplate.tsx`

يحتوي على:
- شعار الشركة واسمها
- بيانات الفاتورة (رقم، تاريخ، وقت)
- بيانات الزبون
- جدول البنود (المنتج، الكمية، السعر، الإجمالي)
- الملخص (المجموع، الخصم، الضريبة، الإجمالي)
- المدفوع والمتبقي
- ملاحظات

---

## 11. نظام النسخ الاحتياطي

### الآلية

**الجداول المتعلقة:** `backup_log`

**القنوات المعرفة في preload:**
| القناة | الحالة |
|--------|--------|
| `backup:create` | ⚠️ بدون معالج |
| `backup:restore` | ⚠️ بدون معالج |
| `backup:list` | ⚠️ بدون معالج |

### الإعدادات الافتراضية

| الإعداد | القيمة |
|---------|--------|
| مدة الاحتفاظ | 30 يوم |
| وقت النسخ الافتراضي | 23:00 |
| النوع | يدوي أو تلقائي |

---

## 12. اختصارات لوحة المفاتيح

| المفتاح | الوظيفة | المسار |
|---------|---------|-------|
| **F6** | نقطة البيع | `/pos` |
| **F7** | فاتورة شراء جديدة | `/purchases/new` |
| **F8** | المخزون | `/inventory` |
| **F9** | لوحة التحكم | `/dashboard` |
| **F10** | الإعدادات | `/settings` |

### أزرار النافذة

| الزر | القناة |
|------|--------|
| تصغير | `window:minimize` |
| تكبير/استعادة | `window:maximize` |
| إغلاق | `window:close` |

---

## 13. دورة حياة الفاتورة

### فاتورة المبيعات

```
┌─────────────┐     ┌──────────────┐     ┌──────────────┐
│   مسودة     │────▶│   مؤكدة      │────▶│   ملغاة      │
│   (draft)   │     │ (confirmed)  │     │ (cancelled)  │
└─────────────┘     └──────────────┘     └──────────────┘
     │                     │                     │
     │                     │                     │
     ▼                     ▼                     ▼
  لا تأثير           خصم من المخزون        إرجاع للمخزون
  على المخزون        تسجيل مدفوعات         عكس المدفوعات
                     تحديث رصيد الزبون     تحديث رصيد الزبون
                     تسجيل Audit Log       تسجيل Audit Log
```

### فاتورة المشتريات

```
┌─────────────┐     ┌──────────────┐     ┌──────────────┐
│   مسودة     │────▶│   مؤكدة      │────▶│   ملغاة      │
│   (draft)   │     │ (confirmed)  │     │ (cancelled)  │
└─────────────┘     └──────────────┘     └──────────────┘
     │                     │                     │
     ▼                     ▼                     ▼
  لا تأثير           إضافة للمخزون         خصم من المخزون
  على المخزون        إنشاء دفعة جديدة      عكس رصيد المورد
                     تحديث رصيد المورد     تسجيل Audit Log
                     تسجيل Audit Log
```

---

## 14. إدارة المخزون

### أنواع المواقع

| النوع | الوصف |
|-------|-------|
| showroom | صالة العرض |
| warehouse | مستودع |
| service | قسم الخدمة |
| returns | منطقة المرتجعات |
| damaged | منطقة التالف |

### أنواع حركات المخزون

| النوع | الوصف |
|-------|-------|
| purchase | شراء (إضافة) |
| sale | بيع (خصم) |
| sale_return | مرتجع مبيعات (إضافة) |
| purchase_return | مرتجع مشتريات (خصم) |
| adjustment | تعديل جرد |
| transfer_in | تحويل وارد |
| transfer_out | تحويل صادر |
| damage | تالف (خصم) |
| initial | رصيد أولي |

### آلية حساب المخزون

1. **stock_balances** يحتفظ بالرصيد الحالي لكل منتج في كل موقع
2. **stock_movements** يسجل كل حركة مع الرصيد بعد الحركة
3. عند البيع: يُخصم من stock_balances + تُسجل حركة من نوع 'sale'
4. عند الشراء: يُضاف إلى stock_balances + تُسجل حركة من نوع 'purchase'
5. عند التعديل: يُحدّث stock_balances + تُسجل حركة من نوع 'adjustment'

---

## 15. نظام الدفعات

### ما هي الدفعة؟

الدفعة (Batch) هي مجموعة من المنتجات التي تم شراؤها معاً في عملية شراء واحدة. كل دفعة لها:
- رقم دفعة فريد
- تاريخ انتهاء (اختياري)
- سعر شراء خاص
- كمية أولية ومتبقية
- موقع تخزين
- حالة (مفتوحة، مغلقة، منتهية)

### تتبع الدفعات

| المنتج يتتبع الدفعات؟ | السلوك |
|-----------------------|--------|
| نعم (`is_batch_tracked = true`) | إنشاء دفعة جديدة عند كل شراء |
| لا | تحديث الرصيد فقط بدون دفعة |

### تتبع تاريخ الانتهاء

| المنتج يتتبع الانتهاء؟ | السلوك |
|-----------------------|--------|
| نعم (`track_expiry = true`) | تسجيل تاريخ انتهاء لكل دفعة |
| لا | لا تاريخ انتهاء |

### حالة الدفعات

| الحالة | الوصف |
|--------|-------|
| open | الدفعة نشطة ومتاحة للبيع |
| closed | الدفعة أُغلقت (نفدت أو أُلغيت) |
| expired | الدفعة منتهية الصلاحية |

---

## 16. نظام المركبات والتوافق

### الهيكل

```
vehicle_brands (ماركات المركبات)
    │
    └─ vehicle_models (موديلات المركبات)
           │
           └─ product_fitments (توافق المنتجات)
                  │
                  └─ products (المنتجات)
```

### مثال

```
تويوتا (ماركة)
  └─ كورولا (موديل)
       └─ 2020-2024 (سنوات)
            └─ فلتر زيت (منتج متوافق)
```

### الاستخدام

- عند البحث عن منتج، يمكن تصفيته حسب المركبة
- عند إنشاء فاتورة، يمكن اقتراح منتجات متوافقة
- إدارة توافق القطع مع المركبات في صفحة المركبات

---

## 17. الإدارة المالية

### المكونات

| المكون | الوصف |
|--------|-------|
| **الزبائن** | إدارة بيانات وأرصدة الزبائن مع حد ائتماني |
| **الموردون** | إدارة بيانات وأرصدة الموردين |
| **المدفوعات** | تسجيل دفعات الزبائن والموردين |
| **الصناديق** | إدارة عدة صناديق نقدية مع إغلاق يومي |
| **المصاريف** | تسجيل المصاريف التشغيلية |

### أنواع المدفوعات

| النوع | الاتجاه | الوصف |
|-------|---------|-------|
| collection | in | قبض من زبون |
| disbursement | out | دفع لمورد |

### طرق الدفع

| الطريقة | الوصف |
|---------|-------|
| cash | نقداً |
| check | شيك |
| transfer | تحويل بنكي |
| mixed | مختلط (فقط للفواتير) |

### إغلاق الصندوق

عند إغلاق الصندوق:
1. حساب الرصيد المتوقع
2. إدخال الرصيد الفعلي
3. حساب الفرق
4. تسجيل إجمالي المبيعات النقدية
5. تسجيل إجمالي المصاريف
6. تسجيل إجمالي المدفوعات الداخلة والخارجة

---

## 18. المرتجعات

### مرتجع المبيعات

1. اختيار فاتورة المبيعات الأصلية
2. تحديد المنتجات المرتجعة والكميات
3. اختيار طريقة الاسترداد (نقدي، رصيد، تبادل)
4. تأكيد المرتجع
5. إرجاع الكميات للمخزون
6. تحديث رصيد الزبون

### مرتجع المشتريات

1. اختيار فاتورة الشراء الأصلية
2. تحديد المنتجات المرتجعة والكميات
3. تأكيد المرتجع
4. خصم الكميات من المخزون
5. تحديث رصيد المورد

---

## 19. التقارير

### التقارير المتاحة

| التقرير | القناة | الوصف |
|---------|--------|-------|
| مبيعات يومية | `db:reports:getDailySales` | مبيعات اليوم مع الإجمالي |
| الأرباح والخسائر | `db:reports:getProfitLoss` | تقرير الربحية |
| الدفعات المنتهية | `db:reports:getExpiringBatches` | دفعات قريبة من الانتهاء |
| لوحة التحكم | `db:dashboard:getStats` | إحصائيات شاملة |

### إحصائيات لوحة التحكم

- إجمالي المبيعات اليوم
- إجمالي المشتريات اليوم
- عدد الفواتير
- المنتجات منخفضة المخزون
- الدفعات المنتهية
- أرصدة الصناديق

---

## 20. الأمان

### طبقات الأمان

| الطبقة | الآلية |
|--------|--------|
| **المصادقة** | bcryptjs لتشفير كلمات المرور (cost factor: 12) |
| **الجلسة** | localStorage مع تحقق عند كل بدء |
| **الصلاحيات** | مصفوفة صلاحيات حسب الدور |
| **PIN المدير** | رمز PIN للموافقات الحساسة |
| **قاعدة البيانات** | SQLite محلية - لا وصول خارجي |
| **Electron** | contextIsolation: true, nodeIntegration: false |
| **سجل المراجعة** | audit_log يسجل كل عملية |

### محاولات الدخول

| الإعداد | القيمة |
|---------|--------|
| الحد الأقصى للمحاولات | 5 |
| مدة الحظر | 5 دقائق |

### تسجيل الخروج التلقائي

| الإعداد | القيمة |
|---------|--------|
| وقت الخمول | 30 دقيقة |

---

## 21. قائمة الملفات والمجلدات

### هيكل المشروع الكامل

```
C:\aissa\
├── database/
│   └── schema/
│       ├── index.ts                  # تصدير جميع الجداول
│       ├── users.schema.ts           # NF_01: المستخدمون
│       ├── app_settings.schema.ts    # NF_02: إعدادات التطبيق
│       ├── locations.schema.ts       # NF_03: مواقع التخزين
│       ├── units.schema.ts           # NF_04: وحدات القياس
│       ├── categories.schema.ts      # NF_05: تصنيفات المنتجات
│       ├── brands.schema.ts          # NF_06: ماركات المنتجات
│       ├── vehicles.schema.ts        # NF_07: المركبات
│       ├── products.schema.ts        # NF_08: المنتجات
│       ├── inventory.schema.ts       # NF_09: المخزون
│       ├── invoices.schema.ts        # NF_10: الفواتير
│       ├── returns.schema.ts         # NF_11: المرتجعات
│       ├── finance.schema.ts         # NF_12: المالية
│       └── system.schema.ts          # NF_13: النظام
│
├── electron/
│   ├── main.ts                       # نقطة دخول Electron
│   ├── preload.ts                    # الجسر بين Renderer و Main
│   ├── services/
│   │   ├── database.service.ts       # خدمة قاعدة البيانات
│   │   └── auth.service.ts           # خدمة المصادقة
│   └── ipc/
│       ├── products.ipc.ts           # معالجات المنتجات
│       ├── sales.ipc.ts              # معالجات المبيعات
│       ├── purchases.ipc.ts          # معالجات المشتريات
│       ├── returns.ipc.ts            # معالجات المرتجعات
│       ├── inventory.ipc.ts          # معالجات المخزون
│       ├── batches.ipc.ts            # معالجات الدفعات
│       ├── vehicles.ipc.ts           # معالجات المركبات
│       ├── cashbox.ipc.ts            # معالجات الصندوق
│       ├── expenses.ipc.ts           # معالجات المصاريف
│       ├── reports.ipc.ts            # معالجات التقارير
│       ├── settings.ipc.ts           # معالجات الإعدادات
│       ├── print.ipc.ts              # معالجات الطباعة
│       ├── dashboard.ipc.ts          # معالجات لوحة التحكم
│       ├── catalog.ipc.ts            # معالجات الكتالوج
│       ├── parties.ipc.ts            # معالجات الأطراف
│       └── users.ipc.ts              # معالجات المستخدمين
│
├── src/
│   ├── App.tsx                       # المكون الرئيسي والراوتر
│   ├── main.tsx                      # نقطة دخول React
│   ├── index.css                     # الأنماط العامة
│   ├── constants/
│   │   └── config.ts                 # ثوابت التطبيق وقنوات IPC
│   ├── types/
│   │   └── database.types.ts         # أنواع TypeScript
│   ├── store/
│   │   ├── auth.store.ts             # Zustand للمصادقة
│   │   └── app.store.ts              # Zustand للتطبيق
│   ├── hooks/
│   │   └── useAuth.ts                # خطاف المصادقة + مصفوفة الصلاحيات
│   ├── i18n/
│   │   ├── i18n.config.ts            # إعداد الترجمة
│   │   ├── ar.json                   # الترجمات العربية
│   │   └── fr.json                   # الترجمات الفرنسية
│   ├── utils/
│   │   ├── calculations.ts           # دوال الحسابات
│   │   └── formatters.ts             # دوال التنسيق
│   ├── features/
│   │   ├── auth/
│   │   │   └── LoginPage.tsx         # صفحة تسجيل الدخول
│   │   ├── dashboard/
│   │   │   └── DashboardPage.tsx     # لوحة التحكم
│   │   ├── sales/
│   │   │   ├── POSPage.tsx           # نقطة البيع
│   │   │   └── SalesPage.tsx         # فواتير المبيعات
│   │   ├── purchases/
│   │   │   ├── PurchasesPage.tsx     # قائمة المشتريات
│   │   │   └── PurchaseFormPage.tsx  # نموذج فاتورة شراء
│   │   ├── inventory/
│   │   │   └── InventoryPage.tsx     # إدارة المخزون
│   │   ├── parties/
│   │   │   ├── CustomersPage.tsx     # إدارة الزبائن
│   │   │   └── SuppliersPage.tsx     # إدارة الموردين
│   │   ├── returns/
│   │   │   └── ReturnsPage.tsx       # المرتجعات
│   │   ├── vehicles/
│   │   │   └── VehiclesPage.tsx      # المركبات
│   │   ├── cashbox/
│   │   │   └── CashboxPage.tsx       # الصندوق
│   │   ├── expenses/
│   │   │   └── ExpensesPage.tsx      # المصاريف
│   │   ├── reports/
│   │   │   └── ReportsPage.tsx       # التقارير
│   │   └── settings/
│   │       └── SettingsPage.tsx      # الإعدادات
│   ├── shared/
│   │   ├── components/
│   │   │   ├── layout/
│   │   │   │   ├── MainLayout.tsx    # التخطيط الرئيسي
│   │   │   │   ├── Sidebar.tsx       # الشريط الجانبي
│   │   │   │   ├── TopBar.tsx        # الشريط العلوي
│   │   │   │   └── ProInvoiceLayout.tsx # تخطيط الفواتير
│   │   │   ├── ui/
│   │   │   │   ├── ErrorBoundary.tsx # معالجة الأخطاء
│   │   │   │   ├── LoadingSpinner.tsx # مؤشر التحميل
│   │   │   │   └── AdminPinModal.tsx # نافذة PIN
│   │   │   └── print/
│   │   │       └── InvoicePrintTemplate.tsx # قالب الطباعة
│   │   └── utils/
│   │       ├── calculations.ts       # دوال الحسابات (مكرر)
│   │       └── formatters.ts         # دوال التنسيق
│   └── components/
│       └── print/
│           └── InvoicePrintTemplate.tsx # قالب الطباعة (مكرر)
│
├── scripts/
│   └── (ملفات السكربتات)
│
├── resources/
│   └── icon.ico                      # أيقونة التطبيق
│
├── package.json                      # تعريف المشروع والتبعيات
├── vite.config.ts                    # إعداد Vite
├── tsconfig.json                     # إعداد TypeScript
├── tsconfig.node.json                # إعداد TypeScript للعقدة
├── tailwind.config.ts                # إعداد TailwindCSS
├── postcss.config.js                 # إعداد PostCSS
├── index.html                        # نقطة دخول HTML
├── .gitignore                        # ملفات مستبعدة من Git
├── database.sqlite                   # قاعدة البيانات (يتم إنشاؤها تلقائياً)
├── TESTING_PLAN.md                   # خطة الاختبار
├── comprehensive.test.ts             # ملف الاختبار الشامل
├── ERRORS_REPORT.md                  # تقرير الأخطاء
└── GAP_ANALYSIS.md                   # تحليل الفجوات
```

---

## 22. قنوات IPC

### جميع القنوات المعرفة

#### المصادقة
| القناة | المعالج | الوصف |
|--------|---------|-------|
| `auth:login` | main.ts | تسجيل الدخول |
| `auth:logout` | main.ts | تسجيل الخروج |
| `auth:checkSession` | main.ts | التحقق من الجلسة |
| `auth:changePassword` | main.ts | تغيير كلمة المرور |

#### المنتجات
| القناة | المعالج | الوصف |
|--------|---------|-------|
| `db:products:search` | products.ipc.ts | بحث في المنتجات |
| `db:products:getAll` | products.ipc.ts | جلب جميع المنتجات |
| `db:products:getById` | products.ipc.ts | جلب منتج محدد |
| `db:products:create` | products.ipc.ts | إنشاء منتج |
| `db:products:update` | products.ipc.ts | تحديث منتج |
| `db:products:delete` | products.ipc.ts | حذف منتج |

#### المبيعات
| القناة | المعالج | الوصف |
|--------|---------|-------|
| `db:sales:getNextNumber` | sales.ipc.ts | رقم الفاتورة التالي |
| `db:sales:create` | sales.ipc.ts | إنشاء فاتورة |
| `db:sales:confirm` | sales.ipc.ts | تأكيد فاتورة |
| `db:sales:cancel` | sales.ipc.ts | إلغاء فاتورة |
| `db:sales:getList` | sales.ipc.ts | قائمة الفواتير |
| `db:sales:getById` | sales.ipc.ts | فاتورة محددة |

#### المشتريات
| القناة | المعالج | الوصف |
|--------|---------|-------|
| `db:purchases:getNextNumber` | purchases.ipc.ts | رقم فاتورة الشراء التالي |
| `db:purchases:create` | purchases.ipc.ts | إنشاء فاتورة شراء |
| `db:purchases:confirm` | purchases.ipc.ts | تأكيد فاتورة شراء |
| `db:purchases:cancel` | purchases.ipc.ts | إلغاء فاتورة شراء |
| `db:purchases:getList` | purchases.ipc.ts | قائمة فواتير الشراء |
| `db:purchases:getById` | purchases.ipc.ts | فاتورة شراء محددة |

#### المرتجعات
| القناة | المعالج | الوصف |
|--------|---------|-------|
| `db:returns:sales:create` | returns.ipc.ts | إنشاء مرتجع مبيعات |
| `db:returns:sales:confirm` | returns.ipc.ts | تأكيد مرتجع مبيعات |
| `db:returns:purchases:create` | returns.ipc.ts | إنشاء مرتجع مشتريات |
| `db:returns:purchases:confirm` | returns.ipc.ts | تأكيد مرتجع مشتريات |

#### المخزون
| القناة | المعالج | الوصف |
|--------|---------|-------|
| `db:inventory:getStock` | inventory.ipc.ts | رصيد المخزون |
| `db:inventory:getMovements` | inventory.ipc.ts | حركات المخزون |
| `db:inventory:adjustStock` | inventory.ipc.ts | تعديل المخزون |

#### الدفعات
| القناة | المعالج | الوصف |
|--------|---------|-------|
| `db:batches:getAll` | batches.ipc.ts | جميع الدفعات |
| `db:batches:getByProduct` | batches.ipc.ts | دفعات منتج |
| `db:batches:getExpiring` | batches.ipc.ts | دفعات منتهية |

#### المركبات
| القناة | المعالج | الوصف |
|--------|---------|-------|
| `db:vehicles:getBrands` | vehicles.ipc.ts | ماركات المركبات |
| `db:vehicles:getModels` | vehicles.ipc.ts | موديلات مركبة |
| `db:fitments:getByProduct` | vehicles.ipc.ts | توافق منتج |

#### الصندوق
| القناة | المعالج | الوصف |
|--------|---------|-------|
| `db:cashbox:getSummary` | cashbox.ipc.ts | ملخص الصندوق |
| `db:cashbox:close` | cashbox.ipc.ts | إغلاق الصندوق |
| `db:cashbox:addTransaction` | cashbox.ipc.ts | إضافة حركة |

#### المصاريف
| القناة | المعالج | الوصف |
|--------|---------|-------|
| `db:expenses:create` | expenses.ipc.ts | إنشاء مصروف |
| `db:expenses:getList` | expenses.ipc.ts | قائمة المصاريف |

#### التقارير
| القناة | المعالج | الوصف |
|--------|---------|-------|
| `db:reports:getDailySales` | reports.ipc.ts | مبيعات يومية |
| `db:reports:getProfitLoss` | reports.ipc.ts | أرباح وخسائر |
| `db:reports:getExpiringBatches` | reports.ipc.ts | دفعات منتهية |

#### الإعدادات
| القناة | المعالج | الوصف |
|--------|---------|-------|
| `db:settings:getAll` | settings.ipc.ts | جميع الإعدادات |
| `db:settings:update` | settings.ipc.ts | تحديث إعداد |

#### الكتالوج
| القناة | المعالج | الوصف |
|--------|---------|-------|
| `db:categories:getAll` | catalog.ipc.ts | جميع التصنيفات |
| `db:categories:create` | catalog.ipc.ts | إنشاء تصنيف |
| `db:categories:update` | catalog.ipc.ts | تحديث تصنيف |
| `db:categories:delete` | catalog.ipc.ts | حذف تصنيف |
| `db:brands:getAll` | catalog.ipc.ts | جميع الماركات |
| `db:brands:create` | catalog.ipc.ts | إنشاء ماركة |
| `db:units:getAll` | catalog.ipc.ts | جميع الوحدات |
| `db:units:update` | catalog.ipc.ts | تحديث وحدة |
| `db:units:delete` | catalog.ipc.ts | حذف وحدة |

#### الأطراف
| القناة | المعالج | الوصف |
|--------|---------|-------|
| `db:customers:getAll` | parties.ipc.ts | جميع الزبائن |
| `db:customers:search` | parties.ipc.ts | بحث زبائن |
| `db:customers:create` | parties.ipc.ts | إنشاء زبون |
| `db:customers:update` | parties.ipc.ts | تحديث زبون |
| `db:suppliers:getAll` | parties.ipc.ts | جميع الموردين |
| `db:suppliers:create` | parties.ipc.ts | إنشاء مورد |
| `db:suppliers:update` | parties.ipc.ts | تحديث مورد |

#### المستخدمين
| القناة | المعالج | الوصف |
|--------|---------|-------|
| `db:users:getAll` | users.ipc.ts | جميع المستخدمين |
| `db:users:create` | users.ipc.ts | إنشاء مستخدم |
| `db:users:update` | users.ipc.ts | تحديث مستخدم |
| `db:users:resetPassword` | users.ipc.ts | إعادة تعيين كلمة المرور |

#### لوحة التحكم
| القناة | المعالج | الوصف |
|--------|---------|-------|
| `db:dashboard:getStats` | dashboard.ipc.ts | إحصائيات |

#### المالية
| القناة | المعالج | الوصف |
|--------|---------|-------|
| `db:finance:getSummary` | ⚠️ بدون معالج | ملخص مالي |
| `db:payments:create` | ⚠️ بدون معالج | إنشاء دفالة |
| `db:payments:getList` | ⚠️ بدون معالج | قائمة المدفوعات |

#### النسخ الاحتياطي
| القناة | المعالج | الوصف |
|--------|---------|-------|
| `backup:create` | ⚠️ بدون معالج | إنشاء نسخة |
| `backup:restore` | ⚠️ بدون معالج | استعادة نسخة |
| `backup:list` | ⚠️ بدون معالج | قائمة النسخ |

#### أخرى
| القناة | المعالج | الوصف |
|--------|---------|-------|
| `print:invoice` | print.ipc.ts | طباعة فاتورة |
| `window:minimize` | main.ts | تصغير النافذة |
| `window:maximize` | main.ts | تكبير/استعادة |
| `window:close` | main.ts | إغلاق النافذة |
| `shell:openExternal` | main.ts | فتح رابط خارجي |
| `db:audit:getRecent` | ⚠️ بدون معالج | سجل مراجعة حديث |
| `db:audit:log` | ⚠️ بدون معالج | تسجيل عملية |
| `db:users:verifyPin` | ⚠️ بدون معالج | التحقق من PIN |
| `db:cashbox:getClosings` | ⚠️ بدون معالج | إغلاقات الصندوق |

---

## 23. الأوامر والتشغيل

### التطوير

| الأمر | الوصف |
|-------|-------|
| `npm run dev` | تشغيل Vite للتطوير (واجهة فقط) |
| `npm run electron:dev` | تشغيل Electron + Vite للتطوير |
| `npm run lint` | فحص جودة الكود بـ ESLint |
| `npm run preview` | معاينة البناء |
| `npm run test` | تشغيل الاختبارات بـ Vitest |

### البناء

| الأمر | الوصف |
|-------|-------|
| `npm run build` | بناء الواجهة بـ Vite + TypeScript |
| `npm run electron:build` | بناء + تغليف التطبيق |
| `npm run build:win` | بناء لنظام Windows |

### قاعدة البيانات

| الأمر | الوصف |
|-------|-------|
| `npm run db:generate` | توليد ملفات الترحيل بـ drizzle-kit |
| `npm run db:migrate` | تطبيق الترحيلات على قاعدة البيانات |

### متطلبات النظام

| البند | الحد الأدنى |
|-------|-------------|
| **Node.js** | 18+ |
| **npm** | 9+ |
| **RAM** | 4 GB |
| **تخزين** | 500 MB |
| **نظام التشغيل** | Windows 10+, macOS 11+, Linux |

---

## ملخص المشروع

SparePartsERP هو نظام ERP **محلي بالكامل** مصمم خصيصاً لمتاجر قطع غيار المركبات. يتميز بـ:

- **13 وحدة وظيفية** تغطي جميع جوانب العمل
- **22 جدول** في قاعدة بيانات SQLite محلية
- **5 أدوار** مع نظام صلاحيات مفصل
- **لغتين** (عربية وفرنسية) مع دعم RTL
- **16 معالج IPC** للتواصل بين الواجهة وقاعدة البيانات
- **نظام دفعات** مع تتبع تاريخ الانتهاء
- **نظام مركبات** لتوافق القطع
- **3 أسعار بيع** (تجزئة، جملة، نصف جملة)
- **صناديق متعددة** مع إغلاق يومي
- **سجل مراجعة** لتتبع كل عملية
- **طباعة فواتير** مدمجة
- **نسخ احتياطي** تلقائي

التطبيق يعمل **بدون اتصال بالإنترنت** ولا يحتاج أي سيرفر خارجي، مما يجعله مثالياً للمتاجر التي تريد نظاماً مستقلاً وآمناً.
