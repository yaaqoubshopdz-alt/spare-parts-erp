# تقرير الأخطاء الشامل - SparePartsERP v1.0.0
## كل خطأ موجود في المشروع مع السبب والتأثير والحل

> **تاريخ التدقيق:** 2026-05-18
> **إجمالي الأخطاء المكتشفة:** 32 خطأ
> **الملفات المفحوصة:** 50+ ملف

---

## ملخص الأخطاء حسب الخطورة

| الخطورة | العدد | الوصف |
|---------|-------|-------|
| 🔴 حرج | 13 | يسبب تعطل كامل أو فشل في العمليات الأساسية |
| 🟠 كبير | 7 | يسبب خلل وظيفي كبير لكن لا يعطل النظام بالكامل |
| 🟡 متوسط | 8 | يسبب سلوك غير متوقع أو بيانات خاطئة |
| 🔵 بسيط | 4 | مشاكل تقنية أو أمنية صغيرة |

---

# الأخطاء الحرجة (13 خطأ)

---

## خطأ #1: عمود `cash_box_id` غير موجود في جدول `payments`

**الملفات المتأثرة:**
- `electron/ipc/returns.ipc.ts:62-64` (مرتجع مبيعات)
- `electron/ipc/returns.ipc.ts:127-129` (مرتجع مشتريات)
- `electron/ipc/cashbox.ipc.ts:19-26` (ملخص الصندوق)
- `electron/ipc/cashbox.ipc.ts:56` (حركات الصندوق)
- `electron/ipc/sales.ipc.ts` (حفظ فاتورة مبيعات)
- `electron/ipc/purchases.ipc.ts` (حفظ فاتورة مشتريات)

**السبب:**
جدول `payments` في `database/schema/finance.schema.ts` لا يحتوي على عمود `cash_box_id`. التعريف يحتوي فقط على:
```typescript
id, invoice_id, payment_method, amount, reference, notes, payment_date, created_at
```
لكن معالجات IPC تحاول إدراج `cash_box_id` في كل مكان.

**التأثير:**
```
SQL Error: no such column: cash_box_id
```
- **جميع المرتجعات** ستفشل بالكامل
- **صفحة الصندوق** لن تعرض أي بيانات
- **الفواتير** التي تحاول تسجيل دفالة مع صندوق محدد ستفشل

**الحل:**
إضافة العمود لجدول payments:
```typescript
cash_box_id: integer('cash_box_id').references(() => cashBoxes.id)
```

---

## خطأ #2: `paid_amount` بدلاً من `paid` في فاتورة المشتريات

**الملفات المتأثرة:**
- `electron/ipc/purchases.ipc.ts:251` (إلغاء فاتورة شراء)
- `src/features/purchases/PurchasesPage.tsx:137-142` (عرض قائمة المشتريات)
- `src/features/purchases/PurchaseFormPage.tsx:217` (فتح فاتورة موجودة)
- `src/features/sales/POSPage.tsx:143` (فتح فاتورة مبيعات)
- `src/features/sales/SalesPage.tsx` (عرض قائمة المبيعات)

**السبب:**
اسم العمود في قاعدة البيانات هو `paid` وليس `paid_amount`.

جدول `purchase_invoices`:
```typescript
paid: real('paid').default(0).notNull()
```

جدول `sales_invoices`:
```typescript
paid: real('paid').default(0).notNull()
```

لكن الكود في كل مكان يستخدم `inv.paid_amount`.

**التأثير:**
- **إلغاء فاتورة شراء:** `const debt = invoice.total - invoice.paid_amount` → `debt = NaN`
  - رصيد المورد يتلف
  - المبلغ المرجع للصندوق يصبح `NaN`
- **صفحة المشتريات:** كل الفواتير تظهر كـ "غير مدفوعة" لأن `undefined >= total` = `false`
- **فتح فاتورة موجودة:** المبلغ المدفوع يُفقد ويُعاد تعيينه إلى 0

**الحل:**
تغيير كل `paid_amount` إلى `paid` في جميع الملفات المذكورة.

---

## خطأ #3: دور `'admin'` غير موجود في قيد CHECK

**الملف:** `electron/ipc/users.ipc.ts:61`

**السبب:**
```typescript
WHERE pin_code = ? AND role IN ('owner', 'admin', 'manager')
```

لكن قيد CHECK في جدول `users` يسمح فقط بـ:
```typescript
CHECK(role IN ('owner', 'manager', 'accountant', 'cashier', 'storekeeper'))
```

لا يوجد دور `'admin'` في قاعدة البيانات.

**التأثير:**
الكود الذي يتحقق من PIN المدير لن يتطابق مع أي مستخدم لديه دور `'admin'` لأنه غير موجود. هذا كود ميت لا يعمل.

**الحل:**
إزالة `'admin'` من القائمة:
```typescript
WHERE pin_code = ? AND role IN ('owner', 'manager')
```

---

## خطأ #4: `reference_number` غير موجود في جدول المشتريات

**الملف:** `src/features/purchases/PurchasesPage.tsx:131`

**السبب:**
الواجهة تستخدم `inv.reference_number` لكن العمود في قاعدة البيانات هو `supplier_invoice_number`.

جدول `purchase_invoices`:
```typescript
supplier_invoice_number: text('supplier_invoice_number')
```

**التأثير:**
عمود "المرجع (رقم فاتورة المورد)" يعرض دائماً `"-"` لكل فاتورة شراء.

**الحل:**
تغيير `inv.reference_number` إلى `inv.supplier_invoice_number`.

---

## خطأ #5: معاملة البذور تُستدعى خارج الكتلة الشرطية

**الملف:** `electron/services/database.service.ts:544-604`

**السبب:**
```typescript
if (userCount.c === 0) {
    // أول تشغيل - إنشاء المدير
} else {
    const tx = raw.transaction(() => {
        // إنشاء مواقع، وحدات، تصنيفات، صناديق، إعدادات
    });
}

// هذا خارج الـ else!
if (userCount.c === 0) {
    tx();  // tx غير معرف هنا!
}
```

المتغير `tx` مُعرّف داخل كتلة `else` فقط، لكن `tx()` يُستدعى في كتلة `if` منفصلة خارج `else`.

**التأثير:**
- في أول تشغيل: `tx` غير مُعرّف → خطأ `ReferenceError`
- في كل تشغيل لاحق: البيانات تُحاول الإدخال مرة أخرى → `UNIQUE constraint violation`

**الحل:**
نقل `tx()` داخل كتلة `else` أو استخدام `INSERT OR IGNORE`.

---

## خطأ #6: مفاتيح الإعدادات غير متطابقة

**الملف:** `src/features/settings/SettingsPage.tsx:16-22`

**السبب:**
صفحة الإعدادات تستخدم مفاتيح مختلفة عن الموجودة في قاعدة البيانات:

| صفحة الإعدادات | قاعدة البيانات (Seed) |
|-----------------|----------------------|
| `shop_name` | `company_name` |
| `shop_phone` | `company_phone` |
| `shop_address` | `company_address` |
| `shop_rc` | `company_rc` |
| `shop_nif` | `company_nif` |

**التأثير:**
- صفحة الإعدادات تعرض حقولاً فارغة عند أول استخدام
- عند الحفظ، تُنشئ مفاتيح جديدة (`shop_name`) بدلاً من تحديث المفاتيح الموجودة (`company_name`)
- قوالب الطباعة والميزات الأخرى التي تقرأ `company_name` لن ترى أبداً ما أدخله المستخدم

**الحل:**
تغيير مفاتيح صفحة الإعدادات لتطابق قاعدة البيانات:
```typescript
const [settings, setSettings] = useState({
    company_name: '',
    company_phone: '',
    company_address: '',
    company_rc: '',
    company_nif: '',
    // ...
});
```

---

## خطأ #7: `useState` بدلاً من `useEffect` في صفحة المرتجعات

**الملف:** `src/features/returns/ReturnsPage.tsx:37-38`

**السبب:**
```typescript
useState(() => {
    loadParties(returnType);
});
```

هذا انتهاك لقواعد React Hooks. دالة التهيئة لـ `useState` يجب أن تكون نقية (pure) بدون تأثيرات جانبية.

**التأثير:**
- `loadParties()` يُستدعى في **كل render**
- يسبب حلقة لا نهائية من طلبات API
- تدهور شديد في الأداء
- ظروف سباق محتملة

**الحل:**
```typescript
useEffect(() => {
    loadParties(returnType);
}, [returnType]);
```

---

## خطأ #8: أسماء أعمدة خاطئة في `vehicles.ipc.ts`

**الملف:** `electron/ipc/vehicles.ipc.ts` (عدة أسطر)

**السبب:**
معالج المركبات يستخدم أسماء أعمدة خاطئة:

| المستخدم في IPC | الصحيح في Schema |
|-----------------|------------------|
| `brand_id` | `vehicle_brand_id` |
| `year_start` | `year_from` |
| `year_end` | `year_to` |
| `model_id` | `vehicle_model_id` |

**التأثير:**
- إنشاء الموديلات يفشل: `no such column: brand_id`
- إنشاء fitments يفشل: `no such column: model_id`
- نطاق السنوات لا يُحفظ أبداً (NULL دائماً)

**الحل:**
تصحيح جميع أسماء الأعمدة في `vehicles.ipc.ts`.

---

## خطأ #9: `year_start`/`year_end` في الواجهة الأمامية

**الملفات:**
- `src/features/vehicles/VehiclesPage.tsx:70-71` (إنشاء موديل)
- `src/features/vehicles/VehiclesPage.tsx:127-128` (تحديث موديل)

**السبب:**
الواجهة ترسل `year_start` و `year_end` لكن الـ IPC يتوقع `year_from` و `year_to`.

**التأثير:**
حقول السنوات تُحفظ دائماً كـ `NULL`. نطاق سنوات الموديل لا يُحفظ.

**الحل:**
تغيير `year_start` → `year_from` و `year_end` → `year_to`.

---

## خطأ #10: نوع البيع `'container'` غير موجود

**الملف:** `src/features/sales/POSPage.tsx:18`

**السبب:**
```typescript
type SaleType = 'retail' | 'container';
```

لكن قيد CHECK في قاعدة البيانات:
```typescript
sale_type: text('sale_type').default('retail').notNull().check(
    sql("sale_type IN ('retail', 'wholesale', 'half_wholesale')")
)
```

لا يوجد نوع `'container'` في قاعدة البيانات.

**التأثير:**
عند حفظ فاتورة بنوع `'container'`، سيفشل قيد CHECK:
```
CHECK constraint failed: sale_type IN ('retail', 'wholesale', 'half_wholesale')
```

**الحل:**
```typescript
type SaleType = 'retail' | 'wholesale' | 'half_wholesale';
```

---

## خطأ #11: `stock_quantity` بدلاً من `total_stock`

**الملف:** `src/features/sales/POSPage.tsx:569` و `POSPage.tsx:355`

**السبب:**
معالج `db:products:search` في `products.ipc.ts:137-158` يُرجع `total_stock`:
```typescript
total_stock: coalesce(sum(...), 0).as('total_stock')
```

لكن واجهة POS تستخدم `stock_quantity`:
```typescript
.sort((a, b) => b.stock_quantity - a.stock_quantity)
```

**التأثير:**
- عمود المخزون في قائمة المنتجات يعرض دائماً 0
- الترتيب حسب المخزون لا يعمل

**الحل:**
تغيير كل `stock_quantity` إلى `total_stock` في POSPage.

---

## خطأ #12: إنشاء الأصناف يفشل بسبب عمود `created_at`

**الملف:** `electron/ipc/catalog.ipc.ts:26`

**السبب:**
```typescript
INSERT INTO categories (name, name_fr, parent_id, sort_order, is_active, created_at)
```

لكن جدول `categories` في `database/schema/categories.schema.ts:7-13` لا يحتوي على عمود `created_at`:
```typescript
export const categories = sqliteTable('categories', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    name: text('name').notNull().unique(),
    name_fr: text('name_fr'),
    parent_id: integer('parent_id').references(() => categories.id),
    sort_order: integer('sort_order').default(0),
    is_active: integer('is_active', { mode: 'boolean' }).default(true),
});
```

**التأثير:**
```
SQL Error: table categories has no column named created_at
```
إنشاء أي صنف جديد يفشل بالكامل.

**الحل:**
إزالة `created_at` من جملة INSERT والقيم.

---

## خطأ #13: `discount_amount` بدلاً من `global_discount_amount`

**الملف:** `electron/ipc/sales.ipc.ts:227`

**السبب:**
INSERT فاتورة مبيعات يستخدم `discount_amount`:
```typescript
INSERT INTO sales_invoices (..., discount_amount, ...)
```

لكن العمود في جدول `sales_invoices` هو `global_discount_amount`:
```typescript
global_discount_amount: real('global_discount_amount').default(0)
```

**التأثير:**
```
SQL Error: no such column: discount_amount
```
حفظ فاتورة المبيعات يفشل بالكامل.

**الحل:**
تغيير `discount_amount` إلى `global_discount_amount`.

---

# الأخطاء الكبيرة (7 أخطاء)

---

## خطأ #14: قنوات IPC مسجلة في preload بدون معالج

**الملف:** `electron/preload.ts`

**القنوات بدون معالج:**

| القناة | المعالج المتوقع | الحالة |
|--------|----------------|--------|
| `db:inventory:getMovements` | `inventory.ipc.ts` | ❌ غير موجود |
| `db:finance:getSummary` | لا يوجد | ❌ غير موجود |
| `db:cashbox:getClosings` | `cashbox.ipc.ts` | ❌ غير موجود |
| `db:cashbox:close` | `cashbox.ipc.ts` | ❌ غير موجود |
| `db:audit:getRecent` | لا يوجد | ❌ غير موجود |
| `db:audit:log` | لا يوجد | ❌ غير موجود |
| `db:users:verifyPin` | `users.ipc.ts` | ❌ غير موجود |
| `backup:create` | لا يوجد | ❌ غير موجود |
| `backup:restore` | لا يوجد | ❌ غير موجود |
| `backup:list` | لا يوجد | ❌ غير موجود |
| `db:units:update` | `catalog.ipc.ts` | ❌ غير موجود |
| `db:units:delete` | `catalog.ipc.ts` | ❌ غير موجود |
| `db:reports:getDailySales` | `reports.ipc.ts` | ❌ غير موجود |
| `db:reports:getExpiringBatches` | `reports.ipc.ts` | ❌ غير موجود |

**التأثير:**
أي كود في الواجهة يستدعي هذه القنوات يتلقى خطأ:
```
No handler registered for channel "db:xxx"
```

**الحل:**
إما إنشاء المعالجات المفقودة أو إزالة القنوات من `preload.ts`.

---

## خطأ #15: صلاحية `'create_sales'` غير موجودة

**الملف:** `src/shared/components/layout/Sidebar.tsx:31`

**السبب:**
```typescript
// Sidebar.tsx
{ path: '/pos', label: 'نقطة البيع', icon: ShoppingCart, permission: 'create_sales' }
```

لكن مصفوفة الصلاحيات في `useAuth.ts` تعرّف:
```typescript
'create_sale'  // (مفرد)
```

**التأثير:**
زر نقطة البيع **مخفي** لجميع المستخدمين بما فيهم المالك، لأن:
```typescript
hasPermission('create_sales') // دائماً false
```

**الحل:**
تغيير `'create_sales'` إلى `'create_sale'`.

---

## خطأ #16: صفحات غير مربوطة بالراوتر

**الملف:** `src/App.tsx`

**الصفحات الموجودة كملفات لكن بدون Route:**

| الصفحة | الملف | الحالة |
|--------|-------|--------|
| المرتجعات | `src/features/returns/ReturnsPage.tsx` | ❌ بدون Route |
| المركبات | `src/features/vehicles/VehiclesPage.tsx` | ❌ بدون Route |
| الصندوق | `src/features/cashbox/CashboxPage.tsx` | ❌ بدون Route |

**التأثير:**
لا يمكن الوصول لهذه الصفحات عبر التنقل العادي. المستخدم لا يمكنه:
- إدارة المرتجعات
- إدارة المركبات
- إدارة الصندوق

**الحل:**
إضافة Routes في `App.tsx` وروابط في `Sidebar.tsx`.

---

## خطأ #17: نافذة الطباعة بـ `nodeIntegration: true`

**الملف:** `electron/ipc/print.ipc.ts:13`

**السبب:**
```typescript
const printWindow = new BrowserWindow({
    webPreferences: {
        nodeIntegration: true,  // خطر أمني
    },
});
```

**التأثير:**
نافذة الطباعة تتيح الوصول الكامل لـ Node.js APIs. أي محتوى ضار يُعرض في نافذة الطباعة يمكنه:
- تنفيذ أوامر نظام
- قراءة/كتابة ملفات
- الوصول للشبكة

**الحل:**
```typescript
webPreferences: {
    nodeIntegration: false,
    contextIsolation: true,
}
```

---

## خطأ #18: استدعاء cancel بدون `userId`

**الملفات:**
- `src/features/sales/POSPage.tsx:510`
- `src/features/purchases/PurchaseFormPage.tsx:366`

**السبب:**
```typescript
// POSPage - صحيح
await invoke('db:sales:cancel', currentInvoiceId);  // بدون userId

// SalesPage - صحيح
await invoke('db:sales:cancel', id, 1);  // userId = 1 (hardcoded)
```

**التأثير:**
عند الإلغاء من POS أو نموذج الشراء، `userId` يكون `undefined`. سجل المراجعة يكون ناقصاً.

**الحل:**
تمرير `user?.id` من سياق المصادقة في جميع استدعاءات cancel.

---

## خطأ #19: `inv.time` غير موجود في فاتورة الشراء

**الملف:** `src/features/purchases/PurchaseFormPage.tsx:837`

**السبب:**
جدول `purchase_invoices` لا يحتوي على عمود `time` (عكس `sales_invoices` الذي يحتوي عليه).

**التأثير:**
عرض الوقت في نموذج فاتورة الشراء المفتوحة يظهر `undefined` أو فارغ.

**الحل:**
إزالة عرض الوقت أو إضافة عمود `time` لجدول `purchase_invoices`.

---

## خطأ #20: `InvoiceStatus` يتضمن `'draft'` لكن DB لا يدعمه

**الملف:** `src/types/database.types.ts:10`

**السبب:**
```typescript
// TypeScript
type InvoiceStatus = 'confirmed' | 'cancelled' | 'draft';

// قاعدة البيانات
CHECK(status IN ('confirmed', 'cancelled'))
```

**التأثير:**
TypeScript يسمح بـ `'draft'` لكن قاعدة البيانات ترفضه:
```
CHECK constraint failed: status IN ('confirmed', 'cancelled')
```

**الحل:**
إما إزالة `'draft'` من النوع أو إضافته لقيد CHECK.

---

## خطأ #21: ازدواجية ملف الحسابات

**الملفات:**
- `src/utils/calculations.ts`
- `src/shared/utils/calculations.ts`

**السبب:**
ملفان متطابقان تماماً (74 سطر كل واحد). يحتويان نفس الدوال:
- `calculateLineTotal`
- `calculateTax`
- `calculateInvoiceTotal`
- `calculateDiscount`

**التأثير:**
- عبء صيانة: إصلاح في ملف لا يؤثر على الآخر
- خطر سلوك غير متسق

**الحل:**
حذف `src/utils/calculations.ts` والاحتفاظ بـ `src/shared/utils/calculations.ts` وتحديث جميع الاستيرادات.

---

# الأخطاء المتوسطة (8 أخطاء)

---

## خطأ #22: `product.price` و `product.cost_price` غير موجودين

**الملف:** `src/features/returns/ReturnsPage.tsx:68-69`

**السبب:**
معالج `db:products:search` يُرجع:
- `retail_price` (ليس `price`)
- `purchase_price` (ليس `cost_price`)

لكن صفحة المرتجعات تستخدم:
```typescript
unit_price: product.price || 0,
cost_price: product.cost_price || 0,
```

**التأثير:**
عند إضافة منتجات للمرتجع:
- `unit_price` = 0 (لأن `undefined || 0`)
- `cost_price` = 0
- الإجمالي يكون 0

**الحل:**
```typescript
unit_price: product.retail_price || 0,
cost_price: product.purchase_price || 0,
```

---

## خطأ #23: `hardcoded _user_id: 1` في صفحة الصندوق

**الملف:** `src/features/cashbox/CashboxPage.tsx:48`

**السبب:**
```typescript
await invoke('db:cashbox:addTransaction', {
    // ...
    _user_id: 1, // TODO: get from auth
});
```

**التأثير:**
جميع حركات الصندوق اليدوية تُنسب للمستخدم رقم 1 بغض النظر عن المستخدم الفعلي.

**الحل:**
استخدام `user?.id || 1` من خطاف `useAuth()`.

---

## خطأ #24: التواريخ بدون تنسيق عربي

**الملف:** `src/shared/utils/formatters.ts:4`

**السبب:**
```typescript
import { format } from 'date-fns';
// بدون تحديد locale
format(date, 'dd/MM/yyyy');
```

**التأثير:**
التواريخ تُعرض باللغة الإنجليزية حتى عندما تكون لغة التطبيق عربية.

**الحل:**
```typescript
import { format } from 'date-fns';
import { arDZ } from 'date-fns/locale';
format(date, 'dd/MM/yyyy', { locale: arDZ });
```

---

## خطأ #25: بيانات المستخدم في localStorage بنص واضح

**الملف:** `src/store/auth.store.ts:47`

**السبب:**
```typescript
localStorage.setItem('spare-parts-erp-user', JSON.stringify(result.user));
```

يُخزن: user ID, username, role, full name بنص واضح.

**التأثير:**
ثغرة XSS - أي script يمكنه قراءة بيانات المستخدم.

**الحل:**
استخدام `sessionStorage` أو تشفير البيانات.

---

## خطأ #26: `factor_to_base` دائماً = 1 للوحدات

**الملف:** `electron/ipc/catalog.ipc.ts:93`

**السبب:**
```typescript
INSERT INTO units (..., factor_to_base, ...) VALUES (..., 1, ...)
```

جميع الوحدات الجديدة تحصل على `factor_to_base = 1` بغض النظر عما إذا كانت وحدة أساسية أو مشتقة.

**التأثير:**
وحدة مثل "BOX" (صندوق) يجب أن يكون `factor_to_base` = عدد القطع في الصندوق، لكنها تُحفظ كـ 1.

**الحل:**
قبول `factor_to_base` كمعامل في معالج الإنشاء.

---

## (مغلق) خطأ #27: `SaleType` في POSPage لا يتضمن `'half_wholesale'`

**الحالة:** تم حذف `half_wholesale_price` بالكامل من المشروع (المستخدم لا يحتاجه).

**الملف:** `src/features/sales/POSPage.tsx:18`

---

## خطأ #28: كشف حساب المورد غير مربوط

**الملف:** `src/features/suppliers/SuppliersPage.tsx`

**السبب:**
زر "كشف الحساب" يعرض رسالة فقط:
```typescript
alert('سيتم إضافة كشف الحساب قريباً');
```

**التأثير:**
الميزة غير موجودة رغم وجود الزر في الواجهة.

**الحل:**
إنشاء صفحة `SupplierStatement.tsx` وربطها.

---

# الأخطاء البسيطة (4 أخطاء)

---

## خطأ #29: `updated_at` غير مُعيّن في بيانات البذور

**الملف:** `electron/services/database.service.ts:548-549`

**السبب:**
بيانات البذور للعملاء والموردين لا تُعيّن `updated_at`.

**التأثير:**
لا تأثير حالياً لأن لا عملاء أو موردين في بيانات البذور.

**الحل:**
إضافة `updated_at: new Date().toISOString()` عند إضافة بيانات بذور.

---

## خطأ #30: `number_sequences` غير مستخدم بشكل صحيح

**الملفات:**
- `electron/ipc/sales.ipc.ts`
- `electron/ipc/purchases.ipc.ts`

**السبب:**
جدول `number_sequences` موجود لتوليد أرقام فواتير متسلسلة لكن المعالجات تستخدم `COUNT + 1` بدلاً منه.

**التأثير:**
عند حذف فواتير، الأرقام تتكرر أو تتخطى.

**الحل:**
استخدام `number_sequences` لتوليد الأرقام بشكل موثوق.

---

## خطأ #31: `purchase_invoices` بدون عمود `time`

**الملف:** `database/schema/invoices.schema.ts:54-72`

**السبب:**
جدول `sales_invoices` يحتوي على `time` لكن `purchase_invoices` لا يحتوي عليه.

**التأثير:**
عدم اتساق بين جدولي الفواتير.

**الحل:**
إضافة `time: text('time')` لجدول `purchase_invoices`.

---

## خطأ #32: ازدواجية قالب الطباعة

**الملفات:**
- `src/components/print/InvoicePrintTemplate.tsx`
- `src/shared/components/print/InvoicePrintTemplate.tsx`

**السبب:**
ملفان متطابقان تماماً لقالب طباعة الفاتورة.

**التأثير:**
عبء صيانة وخطر سلوك غير متسق.

**الحل:**
حذف `src/components/print/InvoicePrintTemplate.tsx` والاحتفاظ بالنسخة في `shared`.

---

# جدول ملخص جميع الأخطاء

| # | الخطورة | الملف | الوصف المختصر |
|---|---------|-------|--------------|
| 1 | 🔴 حرج | `returns.ipc.ts`, `cashbox.ipc.ts`, `sales.ipc.ts`, `purchases.ipc.ts` | `cash_box_id` غير موجود في payments |
| 2 | 🔴 حرج | `purchases.ipc.ts`, `PurchasesPage.tsx`, `PurchaseFormPage.tsx`, `POSPage.tsx`, `SalesPage.tsx` | `paid_amount` بدلاً من `paid` |
| 3 | 🔴 حرج | `users.ipc.ts:61` | دور `'admin'` غير موجود |
| 4 | 🔴 حرج | `PurchasesPage.tsx:131` | `reference_number` بدلاً من `supplier_invoice_number` |
| 5 | 🔴 حرج | `database.service.ts:544-604` | معاملة البذور خارج الكتلة الشرطية |
| 6 | 🔴 حرج | `SettingsPage.tsx:16-22` | مفاتيح الإعدادات غير متطابقة |
| 7 | 🔴 حرج | `ReturnsPage.tsx:37-38` | `useState` بدلاً من `useEffect` |
| 8 | 🔴 حرج | `vehicles.ipc.ts` | أسماء أعمدة خاطئة |
| 9 | 🔴 حرج | `VehiclesPage.tsx:70-71,127-128` | `year_start/end` بدلاً من `year_from/to` |
| 10 | 🔴 حرج | `POSPage.tsx:18` | نوع البيع `'container'` غير موجود |
| 11 | 🔴 حرج | `POSPage.tsx:569,355` | `stock_quantity` بدلاً من `total_stock` |
| 12 | 🔴 حرج | `catalog.ipc.ts:26` | `created_at` غير موجود في categories |
| 13 | 🔴 حرج | `sales.ipc.ts:227` | `discount_amount` بدلاً من `global_discount_amount` |
| 14 | 🟠 كبير | `preload.ts` | 14 قناة IPC بدون معالج |
| 15 | 🟠 كبير | `Sidebar.tsx:31` | صلاحية `'create_sales'` غير موجودة |
| 16 | 🟠 كبير | `App.tsx` | 3 صفحات بدون Route |
| 17 | 🟠 كبير | `print.ipc.ts:13` | `nodeIntegration: true` خطر أمني |
| 18 | 🟠 كبير | `POSPage.tsx:510`, `PurchaseFormPage.tsx:366` | cancel بدون `userId` |
| 19 | 🟠 كبير | `PurchaseFormPage.tsx:837` | `inv.time` غير موجود |
| 20 | 🟠 كبير | `database.types.ts:10` | `'draft'` غير مدعوم في DB |
| 21 | 🟠 كبير | `calculations.ts` (ملفين) | ازدواجية ملف الحسابات |
| 22 | 🟡 متوسط | `ReturnsPage.tsx:68-69` | `product.price` غير موجود |
| 23 | 🟡 متوسط | `CashboxPage.tsx:48` | `_user_id: 1` ثابت |
| 24 | 🟡 متوسط | `formatters.ts:4` | تواريخ بدون locale عربي |
| 25 | 🟡 متوسط | `auth.store.ts:47` | بيانات في localStorage |
| 26 | 🟡 متوسط | `catalog.ipc.ts:93` | `factor_to_base` دائماً 1 |
| 27 | 🟡 متوسط | `POSPage.tsx:18` | `'half_wholesale'` مفقود |
| 28 | 🟡 متوسط | `SuppliersPage.tsx` | كشف حساب المورد غير مربوط |
| 29 | 🔵 بسيط | `database.service.ts:548-549` | `updated_at` غير مُعيّن |
| 30 | 🔵 بسيط | `sales.ipc.ts`, `purchases.ipc.ts` | `number_sequences` غير مستخدم |
| 31 | 🔵 بسيط | `invoices.schema.ts` | `purchase_invoices` بدون `time` |
| 32 | 🔵 بسيط | `InvoicePrintTemplate.tsx` (ملفين) | ازدواجية قالب الطباعة |
