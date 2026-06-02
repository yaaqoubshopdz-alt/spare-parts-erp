# خطة: إصلاح صفوف التعبئة (Filler Rows) في جرد المخزون

## التاريخ: 2026-05-26

## المشكلة
صفوف التعبئة الوهمية (filler rows) التي أُضيفت سابقاً لا تظهر في الجدول.
عند البحث (منتج واحد) أو في صفحة فيها عدد قليل من المنتجات، الجدول يظهر قصيراً وفارغاً.

---

## تحليل السبب الجذري

### السبب الرئيسي: الجدول لا يملأ ارتفاع الحاوية

الكود الحالي للـ container والـ table:
```html
<div class="flex-1 ... overflow-y-hidden min-h-0">   ← الحاوية تتمدد بـ flex-1
  <table class="w-full ... table-fixed">              ← لكن الـ table ليس له min-height!
```

**المشكلة:** الـ `<table>` يأخذ ارتفاع المحتوى الطبيعي فقط (عدد الصفوف الفعلية × ارتفاع الصف).
حتى لو صفوف التعبئة (filler rows) موجودة في DOM، الجدول لا يمتد ليملأ Container.
الـ Container يتمدد بـ `flex-1` لكن الـ `<table>` بداخله لا يعرف أنه يجب أن يملأ هذا الفضاء.

### تحليل تدفق البيانات

```
loadItems() → server يرجع N عنصر (N ≤ 17)
         → setItems(res.data)
         → displayItems = items.filter(...) [فلتر جهة العميل]
         → InventoryCountTable يستلم displayItems كـ items prop
```

### تحليل شرط الـ Filler

```jsx
{!loading && items.length > 0 && items.length < limit && (
  // filler rows
)}
```

| الحالة | items.length | limit | الشرط | النتيجة |
|--------|-------------|-------|-------|---------|
| صفحة كاملة (لا بحث) | 17 | 17 | 17 < 17 = false | ❌ لا filler |
| بحث → 4 نتائج | 4 | 17 | 4 < 17 = true | ✅ filler يظهر |
| بحث → 1 نتيجة | 1 | 17 | 1 < 17 = true | ✅ filler يظهر |
| صفحة 2 فيها 3 عناصر | 3 | 17 | 3 < 17 = true | ✅ filler يظهر |

**النتيجة:** الـ filler rows يظهرون فعلاً في DOM عند البحث. لكن المشكلة أن الـ `<table>`
لا يتمدد ليملأ Container. الجدول يبقى قصيراً = الفضاء الأبيض يبقى ظاهراً.

### السبب الثاني: صفحات كاملة بدون filler

في الصفحة العادية (17 عنصر)، الشرط `items.length < limit` يكون false → لا filler أصلاً.
هذا يعني الجدول يعتمد كلياً على عدد العناصر الفعلية لارتفاعه.

---

## الحل المقترح

### الخطوة 1: جعل الـ `<table>` يملأ الحاوية دائماً

إضافة `min-h-full` على الـ `<table>` ليمتد ويملأ Container:

**الملف:** `src/features/inventory/components/InventoryCountTable.tsx`
**السطر 202:**
```diff
- <table className="w-full text-sm text-right border-collapse table-fixed">
+ <table className="w-full text-sm text-right border-collapse table-fixed min-h-full">
```

### الخطوة 2: جعل `<tbody>` يملأ الـ table

إضافة `h-full` على `<tbody>` لضمان أن الصفوف تملأ الارتفاع:

**السطر 248:**
```diff
- <tbody>
+ <tbody className="h-full">
```

### الخطوة 3: filler rows أيضاً عندما items.length === limit

تعديل الشرط لحذف شرط `items.length > 0 && items.length < limit` وجعل filler rows
يظهرون دائماً (حتى في صفحة كاملة) لضمان ارتفاع ثابت:

**السطور 270-285:** تعديل الشرط ليحسب filler بناءً على الارتفاع المتبقي.

**لكن هذا قد يكون over-engineering. الحل الأبسط والأضمن:**

### الخطوة 3 (البديل): إزالة الشرط - filler دائماً

```diff
- {!loading && items.length > 0 && items.length < limit && (
- {!loading && items.length < limit && (
```

هذا يضمن filler حتى لو items.length === 0 (بعد "لا توجد منتجات").

### الخطوة 4: التأكد من أن Container scrolling يعمل

الـ container الحالي: `overflow-y-hidden` - يجب تغييره لـ `overflow-y-auto`
ليسمح بالتمرير عند الحاجة:

**السطر 201:**
```diff
- <div className="flex-1 bg-background_secondary overflow-y-hidden custom-scrollbar z-10 min-h-0" id="count-table-body">
+ <div className="flex-1 bg-background_secondary overflow-y-auto custom-scrollbar z-10 min-h-0" id="count-table-body">
```

---

## ملخص التغييرات

| # | الملف | التغيير |
|---|-------|---------|
| 1 | InventoryCountTable.tsx:201 | `overflow-y-hidden` → `overflow-y-auto` |
| 2 | InventoryCountTable.tsx:202 | إضافة `min-h-full` على table |
| 3 | InventoryCountTable.tsx:271 | تعديل شرط filler ليعمل دائماً |

## التحقق

1. `npm run build` → لا أخطاء
2. فتح صفحة جرد المخزون → الجدول يملأ الشاشة
3. البحث عن منتج → جدول يبقى بنفس الحجم مع filler rows
4. الانتقال لصفحة 2 (عناصر أقل) → جدول يبقى مملوء
5. صفحة كاملة (17 عنصر) → لا فراغ أبيض

## المخاطر

- `min-h-full` on table قد يسبب مشاكل مع `table-fixed` layout
- `overflow-y-auto` قد يُظهر scrollbar غير مرغوب → يمكن إخفاؤه بـ CSS
- الـ filler rows مع `overflow-y-auto` قد يسبب تمرير زائد

## بديل: حل بدون filler rows (CSS فقط)

بدلاً من صفوف وهمية، يمكن استخدام CSS فقط:
```css
#count-table-body {
  display: flex;
  flex-direction: column;
}
#count-table-body > table {
  flex: 1;
}
```

هذا يجعل الـ table يملأ Container بدون filler rows. لكن الـ sticky header قد يتأثر.
