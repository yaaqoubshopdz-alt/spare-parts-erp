# تقرير شامل - نظام توافق المركبات (Vehicle Fitments)
## SparePartsERP v1.0.0

> **تاريخ التقرير:** 2026-05-18
> **الحالة:** مُنفّذ جزئياً مع أخطاء

---

## 1. نظرة عامة

### ما هو نظام توافق المركبات؟

نظام يربط كل قطعة غيار بالمركبات التي تتوافق معها. مثال:
```
فلتر زيت (منتج) → يتوافق مع:
  ├─ تويوتا كورولا 2020-2024
  ├─ تويوتا يارس 2018-2023
  └─ هيونداي أكسنت 2015-2020
```

### الفائدة العملية

| الفائدة | الوصف |
|---------|-------|
| **بحث عكسي** | اختيار مركبة → عرض كل القطع المتوافقة |
| **اقتراحات ذكية** | اقتراح توافقات بناءً على قطع مشابهة |
| **إدخال سريع** | كتابة "تويوتا كورولا" → إنشاء تلقائي |
| **عرض في POS** | شارات التوافق تظهر عند نقطة البيع |
| **إدارة في المشتريات** | إضافة/إزالة توافقات عند إنشاء فاتورة شراء |

---

## 2. البنية التقنية

### 2.1 الجداول (3 جداول)

#### جدول `vehicle_brands` - ماركات المركبات

| العمود | النوع | القيود | الوصف |
|--------|-------|--------|-------|
| `id` | INTEGER | PK, AUTOINCREMENT | معرف الماركة |
| `name` | TEXT | NOT NULL, UNIQUE | اسم الماركة |
| `is_active` | BOOLEAN | DEFAULT true | هل الماركة نشطة |

**الملف:** `database/schema/vehicles.schema.ts:7-11`

#### جدول `vehicle_models` - موديلات المركبات

| العمود | النوع | القيود | الوصف |
|--------|-------|--------|-------|
| `id` | INTEGER | PK, AUTOINCREMENT | معرف الموديل |
| `vehicle_brand_id` | INTEGER | NOT NULL, FK → vehicle_brands | الماركة |
| `name` | TEXT | NOT NULL | اسم الموديل |
| `year_from` | INTEGER | NULLABLE | سنة البداية |
| `year_to` | INTEGER | NULLABLE | سنة النهاية |
| `engine` | TEXT | NULLABLE | نوع المحرك |
| `is_active` | BOOLEAN | DEFAULT true | هل الموديل نشط |

**الملف:** `database/schema/vehicles.schema.ts:13-21`

#### جدول `product_fitments` - التوافقات

| العمود | النوع | القيود | الوصف |
|--------|-------|--------|-------|
| `id` | INTEGER | PK, AUTOINCREMENT | معرف التوافق |
| `product_id` | INTEGER | NOT NULL, FK → products (CASCADE DELETE) | المنتج |
| `vehicle_brand_id` | INTEGER | NOT NULL, FK → vehicle_brands | ماركة المركبة |
| `vehicle_model_id` | INTEGER | NULLABLE, FK → vehicle_models | موديل المركبة |
| `year_from` | INTEGER | NULLABLE | سنة البداية |
| `year_to` | INTEGER | NULLABLE | سنة النهاية |
| `engine` | TEXT | NULLABLE | نوع المحرك |
| `notes` | TEXT | NULLABLE | ملاحظات |

**الملف:** `database/schema/products.schema.ts:43-52`

### 2.2 العلاقات

```
vehicle_brands (1) ──── (N) vehicle_models
                              │
                              │ (1)
                              │
                              ▼ (N)
                        product_fitments (N) ──── (1) products
```

### 2.3 البيانات الأولية (Seed Data)

**22 ماركة** مع **120+ موديل** للسوق الجزائري:

| الماركة | عدد الموديلات | أمثلة |
|---------|--------------|-------|
| Renault (رينو) | 14 | Clio 2-5, Kangoo, Symbol, Megane, Master, Trafic, Stepway... |
| Dacia (داسيا) | 6 | Logan, Sandero, Duster, Dokker, Lodgy |
| Peugeot (بيجو) | 14 | 206, 207, 208, 301, 307, 308, Partner, 2008, 3008... |
| Hyundai (هيونداي) | 12 | Accent, Atos, i10, i20, Tucson, Santa Fe, H100... |
| Chevrolet (شيفروليه) | 8 | Spark, Sail, Aveo, Optra, Cruze, Captiva... |
| Toyota (تويوتا) | 8 | Hilux, Yaris, Corolla, Land Cruiser, Prado, Hiace... |
| Volkswagen (فولكس فاجن) | 12 | Golf 4-8, Polo, Caddy, Tiguan, Passat, Amarok... |
| Seat (سيات) | 4 | Ibiza, Leon, Arona, Ateca |
| Skoda (سكودا) | 5 | Fabia, Octavia, Rapid, Superb, Yeti |
| Kia (كيا) | 8 | Picanto, Rio, Sportage, Cerato, Sorento... |
| Suzuki (سوزوكي) | 7 | Maruti 800, Alto, Swift, Vitara, Jimny... |
| DFSK | 8 | K01, K02, K07, V21, V22, Glory... |
| Harbin (هاربين) | 4 | Ruiyi, Zhongyi, Minyi, HFJ |
| Changan (شانجان) | 5 | Star Truck, Star Van, CS35, CS75... |
| Nissan (نيسان) | 6 | Navara, Sunny, Micra, Qashqai, Patrol... |
| Ford (فورد) | 5 | Ranger, Fiesta, Focus, Transit, Kuga |
| Fiat (فيات) | 7 | Tipo, 500, Ducato, Fiorino, Doblo, Panda... |
| Chery (شيري) | 6 | QQ, Tiggo 2/4/7/8, Arrizo 5 |
| Geely (جيلي) | 3 | GX3, Coolray, Emgrand |
| Isuzu (إيسوزو) | 3 | D-Max, NPR, NQR |
| Mitsubishi (ميتسوبيشي) | 3 | L200, Pajero, Lancer |
| Mercedes-Benz | 5 | Sprinter, Vito, Class C, Class A, Class G |

**الملف:** `electron/services/database.service.ts:694-717`

---

## 3. معالجات IPC (Backend)

### 3.1 ملف المعالجات

**الملف:** `electron/ipc/vehicles.ipc.ts` (258 سطر)

### 3.2 القنوات المسجلة (12 قناة)

#### إدارة الماركات (4 قنوات)

| القناة | المعالج | الوصف | السطر |
|--------|---------|-------|-------|
| `db:vehicles:getBrands` | `ipcMain.handle` | جلب جميع الماركات مرتبة أبجدياً | 12 |
| `db:vehicles:createBrand` | `ipcMain.handle` | إنشاء ماركة جديدة | 19 |
| `db:vehicles:updateBrand` | `ipcMain.handle` | تحديث اسم ماركة | 203 |
| `db:vehicles:deleteBrand` | `ipcMain.handle` | حذف ماركة (مع حماية التوافقات) | 211 |

#### إدارة الموديلات (4 قنوات)

| القناة | المعالج | الوصف | السطر |
|--------|---------|-------|-------|
| `db:vehicles:getModels` | `ipcMain.handle` | جلب موديلات (كلها أو لماركة محددة) | 27 |
| `db:vehicles:createModel` | `ipcMain.handle` | إنشاء موديل جديد مع سنوات | 45 |
| `db:vehicles:updateModel` | `ipcMain.handle` | تحديث موديل (اسم + سنوات) | 228 |
| `db:vehicles:deleteModel` | `ipcMain.handle` | حذف موديل (مع حماية التوافقات) | 243 |

#### إدارة التوافقات (4 قنوات)

| القناة | المعالج | الوصف | السطر |
|--------|---------|-------|-------|
| `db:fitments:getByProduct` | `ipcMain.handle` | جلب توافقات منتج مع أسماء الماركات/الموديلات | 55 |
| `db:fitments:create` | `ipcMain.handle` | إضافة توافق جديد (مع استعلام فرعي للماركة) | 71 |
| `db:fitments:delete` | `ipcMain.handle` | حذف توافق محدد | 84 |
| `db:fitments:toggleForProduct` | `ipcMain.handle` | إضافة أو إزالة توافق في استدعاء واحد | 92 |

#### ميزات ذكية (2 قناة)

| القناة | المعالج | الوصف | السطر |
|--------|---------|-------|-------|
| `db:fitments:suggestForProduct` | `ipcMain.handle` | اقتراح توافقات ذكية بناءً على منتجات مشابهة | 116 |
| `db:vehicles:parseAndCreate` | `ipcMain.handle` | تحليل نص "ماركة موديل" وإنشاء تلقائي | 148 |

### 3.3 قنوات في preload.ts لكن بدون معالج (6 قنوات)

| القناة | في preload؟ | معالج مسجّل؟ | الحالة |
|--------|-------------|--------------|--------|
| `db:vehicles:createBrand` | ✅ سطر 33 | ❌ لا | ⚠️ بدون معالج |
| `db:vehicles:updateBrand` | ✅ سطر 33 | ✅ سطر 203 | ✅ يعمل |
| `db:vehicles:deleteBrand` | ✅ سطر 33 | ✅ سطر 211 | ✅ يعمل |
| `db:vehicles:createModel` | ✅ سطر 34 | ✅ سطر 45 | ✅ يعمل |
| `db:vehicles:updateModel` | ✅ سطر 34 | ✅ سطر 228 | ✅ يعمل |
| `db:vehicles:deleteModel` | ✅ سطر 34 | ✅ سطر 243 | ✅ يعمل |
| `db:fitments:create` | ✅ سطر 35 | ✅ سطر 71 | ✅ يعمل |
| `db:fitments:delete` | ✅ سطر 35 | ✅ سطر 84 | ✅ يعمل |
| `db:fitments:toggleForProduct` | ✅ سطر 36 | ✅ سطر 92 | ✅ يعمل |
| `db:fitments:suggestForProduct` | ✅ سطر 36 | ✅ سطر 116 | ✅ يعمل |

### 3.4 قنوات في vehicles.ipc.ts لكن ليست في preload.ts

| القناة | في vehicles.ipc.ts؟ | في preload.ts؟ | الحالة |
|--------|---------------------|----------------|--------|
| `db:vehicles:getBrands` | ✅ سطر 12 | ✅ سطر 33 | ✅ يعمل |
| `db:vehicles:getModels` | ✅ سطر 27 | ✅ سطر 34 | ✅ يعمل |
| `db:fitments:getByProduct` | ✅ سطر 55 | ✅ سطر 35 | ✅ يعمل |
| `db:vehicles:parseAndCreate` | ✅ سطر 148 | ❌ لا | ⚠️ غير متاح للواجهة |

---

## 4. الواجهات الأمامية (Frontend)

### 4.1 صفحة إدارة المركبات

**الملف:** `src/features/vehicles/VehiclesPage.tsx` (294 سطر)

**الوصف:** صفحة كاملة لإدارة ماركات وموديلات المركبات

**الموقع الحالي:**
- ⚠️ **بدون Route** في `App.tsx`
- ✅ تظهر كـ **Modal** في صفحة الإعدادات (`SettingsPage.tsx:149-179`)

**الوظائف:**

| الوظيفة | الوصف | السطر |
|---------|-------|-------|
| عرض الماركات | قائمة جميع الماركات | 164-200 |
| إنشاء ماركة | إضافة ماركة جديدة | 53-62 |
| تحديث ماركة | تعديل اسم ماركة | 98-108 |
| حذف ماركة | حذف مع حماية التوافقات | 84-96 |
| عرض الموديلات | موديلات الماركة المحددة | 234-285 |
| إنشاء موديل | إضافة موديل مع سنوات | 65-82 |
| تحديث موديل | تعديل اسم + سنوات | 123-138 |
| حذف موديل | حذف مع حماية التوافقات | 110-121 |

**التصميم:**
- عمودين متجاورين: الماركات (يسار) + الموديلات (يمين)
- تحديد ماركة → عرض موديلاتها
- تعديل مضمن (inline editing) لكل عنصر
- أزرار تعديل وحذف تظهر عند التمرير

### 4.2 مكون FitmentsBadges

**الملف:** `src/features/shared/FitmentsBadges.tsx` (299 سطر)

**الوصف:** مكون قابل لإعادة الاستخدام لعرض/إدارة التوافقات

**الأنماط (Modes):**

| النمط | الوصف | المستخدم في |
|-------|-------|-------------|
| `view` | عرض فقط - شارات للقراءة | POSPage (قائمة المنتجات) |
| `edit` | إضافة/إزالة - قوائم منسدلة | PurchaseFormPage (فاتورة شراء) |
| `full-edit` | إدارة كاملة + اقتراحات ذكية | إدارة المنتجات |

**الميزات:**

| الميزة | الوصف | السطر |
|--------|-------|-------|
| عرض التوافقات | شارات ملونة بأسماء المركبات | 135-148 |
| إضافة توافق | قوائم منسدلة لاختيار ماركة + موديل | 170-193 |
| إزالة توافق | زر حذف على كل شارة | 114-125 |
| Toggle | إضافة/إزالة في استدعاء واحد | 91-106 |
| اقتراحات ذكية | اقتراحات بناءً على منتجات مشابهة | 81-89, 267-296 |
| تنسيق السنوات | عرض نطاق السنوات `[2020-2024]` | 127-132 |

**المستخدم في:**

| الملف | النمط | السطر |
|-------|-------|-------|
| `POSPage.tsx` | `view` (مضغوط) | 1192 |
| `PurchaseFormPage.tsx` | `edit` | 970 |

### 4.3 الوصول إلى الصفحة

**المسار الحالي:**

```
SettingsPage → زر "إدارة توافقات المركبات" → Modal → VehiclesPage
```

**الملف:** `src/features/settings/SettingsPage.tsx:149-179`

```tsx
<button onClick={() => setShowVehiclesModal(true)}>
  إدارة توافقات المركبات
</button>

{showVehiclesModal && (
  <Modal>
    <VehiclesPage />
  </Modal>
)}
```

---

## 5. البحث العكسي بالمركبات

### 5.1 البحث المتقدم

**الملف:** `electron/ipc/products.ipc.ts:163-253`

**القناة:** `db:products:advancedSearch`

**آلية البحث العكسي:**

```
اختيار مركبة → البحث عن كل المنتجات المتوافقة
```

**الكود:**

```typescript
// البحث حسب الموديل
if (filters?.vehicle_model_id) {
  where += ` AND p.id IN (
    SELECT product_id FROM product_fitments 
    WHERE vehicle_model_id = ?
  )`;
}
// البحث حسب الماركة
else if (filters?.vehicle_brand_id) {
  where += ` AND p.id IN (
    SELECT product_id FROM product_fitments 
    WHERE vehicle_brand_id = ?
  )`;
}
```

**النتائج تتضمن:**
- `fitment_count`: عدد التوافقات لكل منتج
- `fitments_list`: قائمة التوافقات كنص (مثال: "تويوتا كورولا | رينو كليو")

### 5.2 في POS

عند النقر بزر الماوس الأيمن على منتج في POS:
- تظهر نافذة سياق مع شارات التوافقات
- النمط: `view` (قراءة فقط)
- **الملف:** `POSPage.tsx:1192`

---

## 6. إنشاء وتحديث المنتجات مع التوافقات

### 6.1 إنشاء منتج

**الملف:** `electron/ipc/products.ipc.ts:255-349`

**المعامل:**
```typescript
fitments?: { vehicle_brand_id: number; vehicle_model_id: number }[]
```

**الآلية:**
```typescript
if (data.fitments?.length) {
  const insertFitment = raw.prepare(
    'INSERT INTO product_fitments (product_id, vehicle_brand_id, vehicle_model_id) VALUES (?, ?, ?)'
  );
  for (const f of data.fitments) {
    insertFitment.run(productId, f.vehicle_brand_id, f.vehicle_model_id);
  }
}
```

### 6.2 تحديث منتج

**الملف:** `electron/ipc/products.ipc.ts:352-419`

**الآلية:**
```typescript
if (data.fitments !== undefined) {
  // حذف القديم
  raw.prepare('DELETE FROM product_fitments WHERE product_id = ?').run(id);
  
  // إدخال الجديد
  if (Array.isArray(data.fitments) && data.fitments.length > 0) {
    const insertFitment = raw.prepare(
      'INSERT INTO product_fitments (product_id, vehicle_brand_id, vehicle_model_id) VALUES (?, ?, ?)'
    );
    for (const f of data.fitments) {
      insertFitment.run(id, f.vehicle_brand_id, f.vehicle_model_id);
    }
  }
}
```

---

## 7. الاقتراحات الذكية

### 7.1 الآلية

**الملف:** `electron/ipc/vehicles.ipc.ts:116-145`

**القناة:** `db:fitments:suggestForProduct`

**الخوارزمية:**
1. الحصول على `category_id` و `brand_id` للمنتج
2. البحث عن منتجات في نفس التصنيف والماركة
3. جمع التوافقات التي لا يملكها المنتج الحالي
4. ترتيبها حسب عدد المنتجات التي تستخدمها (`used_by_count`)
5. إرجاع أفضل 10 اقتراحات

**الاستعلام:**
```sql
SELECT DISTINCT pf.vehicle_brand_id, pf.vehicle_model_id,
       vb.name as vehicle_brand_name, vm.name as vehicle_model_name,
       vm.year_from, vm.year_to,
       COUNT(DISTINCT pf.product_id) as used_by_count
FROM product_fitments pf
JOIN products p ON pf.product_id = p.id
LEFT JOIN vehicle_brands vb ON pf.vehicle_brand_id = vb.id
LEFT JOIN vehicle_models vm ON pf.vehicle_model_id = vm.id
WHERE p.category_id = ? AND p.brand_id = ? AND p.id != ?
  AND NOT EXISTS (
    SELECT 1 FROM product_fitments pf2
    WHERE pf2.product_id = ? 
      AND pf2.vehicle_brand_id = pf.vehicle_brand_id 
      AND pf2.vehicle_model_id = pf.vehicle_model_id
  )
GROUP BY pf.vehicle_brand_id, pf.vehicle_model_id
ORDER BY used_by_count DESC
LIMIT 10
```

### 7.2 العرض في الواجهة

**الملف:** `FitmentsBadges.tsx:267-296`

- زر "اقتراحات ذكية" 💡
- عرض الاقتراحات كشارات قابلة للإضافة بنقرة واحدة
- عرض عدد القطع التي تستخدم كل توافق
- لون أصفر مميز للاقتراحات

---

## 8. التحليل الذكي للنص

### 8.1 الآلية

**الملف:** `electron/ipc/vehicles.ipc.ts:148-200`

**القناة:** `db:vehicles:parseAndCreate`

**المدخل:** نص مثل `"تويوتا كورولا"`

**المخرجات:**
```json
{
  "vehicle_brand_id": 6,
  "vehicle_model_id": 45,
  "vehicle_brand_name": "تويوتا",
  "vehicle_model_name": "كورولا"
}
```

**الآلية:**
1. تقسيم النص: أول كلمة = ماركة، الباقي = موديل
2. البحث عن الماركة (case-insensitive)
3. إذا لم توجد → إنشاء ماركة جديدة
4. البحث عن الموديل تحت الماركة
5. إذا لم يوجد → إنشاء موديل جديد
6. إرجاع المعرفات

**مثال:**
```
إدخال: "رينو كليو 4"
→ الماركة: "رينو" (موجودة)
→ الموديل: "كليو 4" (موجود)
→ إرجاع المعرفات
```

### 8.2 الحالة

⚠️ **القناة غير مسجلة في preload.ts** - لا يمكن استدعاؤها من الواجهة الأمامية حالياً.

---

## 9. حماية الحذف

### 9.1 حذف الماركات

**الملف:** `electron/ipc/vehicles.ipc.ts:211-225`

```typescript
const linked: any = raw.prepare(
  'SELECT COUNT(*) as cnt FROM product_fitments WHERE vehicle_brand_id = ?'
).get(id);
if (linked.cnt > 0) {
  return { success: false, error: `لا يمكن الحذف — هذه الماركة مرتبطة بـ ${linked.cnt} قطعة` };
}
// حذف الموديلات أولاً ثم الماركة
raw.prepare('DELETE FROM vehicle_models WHERE vehicle_brand_id = ?').run(id);
raw.prepare('DELETE FROM vehicle_brands WHERE id = ?').run(id);
```

### 9.2 حذف الموديلات

**الملف:** `electron/ipc/vehicles.ipc.ts:243-255`

```typescript
const linked: any = raw.prepare(
  'SELECT COUNT(*) as cnt FROM product_fitments WHERE vehicle_model_id = ?'
).get(id);
if (linked.cnt > 0) {
  return { success: false, error: `لا يمكن الحذف — هذا الموديل مرتبط بـ ${linked.cnt} قطعة` };
}
raw.prepare('DELETE FROM vehicle_models WHERE id = ?').run(id);
```

---

## 10. الأخطاء والمشاكل المكتشفة

### خطأ #1: أسماء أعمدة خاطئة في VehiclesPage

**الملف:** `src/features/vehicles/VehiclesPage.tsx:68-72`

**المشكلة:**
```typescript
// الواجهة ترسل:
{
  brand_id: selectedBrand,       // ❌ خطأ
  year_from: parseInt(...),      // ✅ صحيح
  year_to: parseInt(...)         // ✅ صحيح
}

// لكن المعالج يتوقع (vehicles.ipc.ts:45):
data.brand_id  // ✅ المعالج يقرأ brand_id ويحوّله لـ vehicle_brand_id
```

**الحالة:** ✅ **يعمل حالياً** لأن المعالج في `vehicles.ipc.ts:48` يستخدم `data.brand_id` بشكل صحيح.

### خطأ #2: `parseAndCreate` غير متاح

**الملف:** `electron/ipc/vehicles.ipc.ts:148`

**المشكلة:** القناة `db:vehicles:parseAndCreate` موجودة في المعالج لكن **غير مسجلة في preload.ts**.

**التأثير:** لا يمكن استخدام التحليل الذكي من الواجهة الأمامية.

**الحل:** إضافة `'db:vehicles:parseAndCreate'` إلى `ALLOWED_INVOKE_CHANNELS` في preload.ts.

### خطأ #3: صفحة المركبات بدون Route

**الملف:** `src/App.tsx`

**المشكلة:** `VehiclesPage` موجود كملف لكن **بدون Route** في App.tsx.

**الحالة الحالية:** يظهر فقط كـ Modal في SettingsPage.

**التأثير:** لا يمكن الوصول للصفحة عبر التنقل العادي أو الشريط الجانبي.

### خطأ #4: لا يوجد Route للمركبات في Sidebar

**الملف:** `src/shared/components/layout/Sidebar.tsx`

**المشكلة:** لا يوجد عنصر تنقل للمركبات في الشريط الجانبي.

**التأثير:** المستخدم لا يمكنه الوصول لصفحة المركبات إلا عبر الإعدادات.

### خطأ #5: أعمدة `year_from`/`year_to` في product_fitments

**الملف:** `database/schema/products.schema.ts:48-49`

**المشكلة:** جدول `product_fitments` يحتوي على `year_from` و `year_to` لكن:
- معالج `fitments:create` لا يملأ هذه الأعمدة
- معالج `fitments:toggleForProduct` لا يملأ هذه الأعمدة
- يتم أخذ السنوات من `vehicle_models` فقط عبر JOIN

**التأثير:** السنوات في `product_fitments` دائماً NULL.

---

## 11. ملخص القنوات

### القنوات العاملة (10/12)

| القناة | الحالة | المستخدم في |
|--------|--------|-------------|
| `db:vehicles:getBrands` | ✅ يعمل | VehiclesPage, FitmentsBadges |
| `db:vehicles:getModels` | ✅ يعمل | VehiclesPage, FitmentsBadges |
| `db:vehicles:createModel` | ✅ يعمل | VehiclesPage |
| `db:vehicles:updateModel` | ✅ يعمل | VehiclesPage |
| `db:vehicles:deleteModel` | ✅ يعمل | VehiclesPage |
| `db:vehicles:updateBrand` | ✅ يعمل | VehiclesPage |
| `db:vehicles:deleteBrand` | ✅ يعمل | VehiclesPage |
| `db:fitments:getByProduct` | ✅ يعمل | FitmentsBadges, products.ipc.ts |
| `db:fitments:toggleForProduct` | ✅ يعمل | FitmentsBadges |
| `db:fitments:suggestForProduct` | ✅ يعمل | FitmentsBadges |

### القنوات غير العاملة (2/12)

| القناة | السبب | الحل |
|--------|-------|------|
| `db:vehicles:createBrand` | ❌ غير مسجل في vehicles.ipc.ts | ✅ **موجود** في السطر 19 - يعمل |
| `db:vehicles:parseAndCreate` | ❌ غير مسجل في preload.ts | إضافة للقائمة |

---

## 12. الإحصائيات

### البيانات الموجودة

| البند | العدد |
|-------|-------|
| ماركات المركبات | 22 ماركة |
| موديلات المركبات | 120+ موديل |
| جداول قاعدة البيانات | 3 جداول |
| قنوات IPC | 12 قناة |
| مكونات Frontend | 2 مكون |
| صفحات Frontend | 1 صفحة |

### التغطية

| الوظيفة | الحالة |
|---------|--------|
| إنشاء ماركات | ✅ مُنفّذ |
| تحديث ماركات | ✅ مُنفّذ |
| حذف ماركات | ✅ مُنفّذ مع حماية |
| إنشاء موديلات | ✅ مُنفّذ |
| تحديث موديلات | ✅ مُنفّذ |
| حذف موديلات | ✅ مُنفّذ مع حماية |
| ربط منتج بمركبة | ✅ مُنفّذ |
| إلغاء الربط | ✅ مُنفّذ |
| Toggle الربط | ✅ مُنفّذ |
| اقتراحات ذكية | ✅ مُنفّذ |
| بحث عكسي | ✅ مُنفّذ |
| تحليل نص ذكي | ⚠️ مُنفّذ لكن غير متاح |
| عرض في POS | ✅ مُنفّذ |
| عرض في المشتريات | ✅ مُنفّذ |
| بيانات أولية جزائرية | ✅ مُنفّذ |

---

## 13. الميزات غير المُنفّذة

| الميزة | الوصف | الأولوية |
|--------|-------|---------|
| بحث المركبات في POS | اختيار مركبة → عرض القطع المتوافقة | 🔴 عالية |
| صفحة مخصصة للمركبات | Route منفصل + عنصر في Sidebar | 🔴 عالية |
| ربط التحليل الذكي | تفعيل `parseAndCreate` في الواجهة | 🟠 متوسطة |
| ملء سنوات التوافق | حفظ `year_from`/`year_to` في `product_fitments` | 🟠 متوسطة |
| بحث بالباركود + مركبة | مسح باركود → عرض المركبات المتوافقة | 🟡 منخفضة |
| تصدير قائمة التوافقات | تصدير Excel لتوافقات منتج | 🟡 منخفضة |
| استيراد المركبات | استيراد ماركات/موديلات من Excel | 🟡 منخفضة |
| إحصائيات التوافق | أكثر المركبات طلباً | 🟡 منخفضة |
| صور المركبات | إضافة صور للماركات/الموديلات | 🔵 اختيارية |
| محرك البحث | إضافة محرك كحقل في التوافق | 🔵 اختيارية |

---

## 14. خريطة الملفات الكاملة

### Backend

| الملف | السطور | الوصف |
|-------|--------|-------|
| `database/schema/vehicles.schema.ts` | 21 | تعريف جداول المركبات |
| `database/schema/products.schema.ts:43-52` | 10 | تعريف جدول التوافقات |
| `electron/ipc/vehicles.ipc.ts` | 258 | جميع معالجات المركبات والتوافقات |
| `electron/ipc/products.ipc.ts:163-253` | 90 | البحث المتقدم مع التوافقات |
| `electron/ipc/products.ipc.ts:255-349` | 94 | إنشاء منتج مع توافقات |
| `electron/ipc/products.ipc.ts:352-419` | 67 | تحديث منتج مع توافقات |
| `electron/services/database.service.ts:684-732` | 48 | بيانات المركبات الأولية |
| `electron/preload.ts:32-36` | 5 | قنوات المركبات المسموحة |
| `electron/main.ts:19,103` | 2 | تسجيل معالجات المركبات |

### Frontend

| الملف | السطور | الوصف |
|-------|--------|-------|
| `src/features/vehicles/VehiclesPage.tsx` | 294 | صفحة إدارة المركبات |
| `src/features/shared/FitmentsBadges.tsx` | 299 | مكون عرض/إدارة التوافقات |
| `src/features/settings/SettingsPage.tsx:7,13,149-179` | ~35 | فتح صفحة المركبات كـ Modal |
| `src/features/sales/POSPage.tsx:14,1192` | 2 | استيراد وعرض التوافقات |
| `src/features/purchases/PurchaseFormPage.tsx:13,965-970` | ~10 | استعراض التوافقات عند الشراء |
| `src/types/database.types.ts:72-86,121-130` | ~24 | أنواع TypeScript |

---

## 15. خلاصة التقرير

### ما يعمل ✅

1. **22 ماركة جزائرية** مع **120+ موديل** مُحمّلة تلقائياً
2. **CRUD كامل** للماركات والموديلات
3. **ربط المنتجات بالمركبات** (إنشاء + تحديث + حذف)
4. **بحث عكسي** بالمركبة للعثور على القطع المتوافقة
5. **اقتراحات ذكية** بناءً على منتجات مشابهة
6. **عرض التوافقات** في POS وفي المشتريات
7. **حماية الحذف** عند وجود توافقات مرتبطة
8. **Toggle** لإضافة/إزالة التوافقات بنقرة واحدة

### ما يحتاج إصلاح ⚠️

1. **صفحة المركبات بدون Route** - لا يمكن الوصول إلا عبر الإعدادات
2. **`parseAndCreate` غير متاح** - القناة غير مسجلة في preload
3. **سنوات التوافق فارغة** في `product_fitments`
4. **لا يوجد عنصر في Sidebar** للمركبات
5. **لا يوجد بحث بالمركبة في POS** - البحث العكسي غير مُفعّل في الواجهة

### ما يحتاج إضافة ❌

1. **بحث بالمركبة في POS** - اختيار مركبة → عرض القطع
2. **صفحة مخصصة** للمركبات مع Route
3. **إحصائيات التوافق** - أكثر المركبات طلباً
4. **تصدير/استيراد** التوافقات
