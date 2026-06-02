# Consolidated OpenCode Plans Archive

Here is the archive of all planning files previously located in `.opencode/plans/`.

---

## 1. inventory-count-fixes.md
Goal: إصلاح ثلاث مشاكل رئيسية في واجهة جرد المخزون: الفرز لا يعمل عالمياً (يُرتّب الصفحة الحالية فقط)، التمرير معطل، وتوزيع الأعمدة غير محسّن.
Architecture: الفرز سينتقل إلى السيرفر (SQL ORDER BY ديناميكي) بدلاً من الفرز على العميل، هيكل التمرير سيُبسّط بإزالة الحاوية المزدوجة flex-1، والجدول سيستخدم border-collapse: separate بدلاً من collapse.

Tasks:
- IPC: إضافة sortKey/sortDir إلى getSessionItems
- InventoryCountPage: إرسال sortKey في loadItems + إزالة sortedItems
- InventoryCountTable: إصلاح هيكل التمرير
- Build & Verification

---

## 2. inventory-count-v2-fixes.md
Goal: إصلاح دورة الفرز (ASC→DESC→RESET) مع فرز عالمي حقيقي، حساب دقيق لعدد الصفوف في الشاشة، وتحسين أداء الـ render.
Architecture: الفرز العالمي شغال من الجلسة السابقة (Server-side ORDER BY قبل LIMIT/OFFSET). الإصلاح المطلوب: إضافة حالة RESET لدورة الفرز، أيقونات ↑/↓ واضحة، وحساب دقيق لـ calcLimit بدون buffer زائد.

Tasks:
- دورة الفرز: ASC → DESC → RESET
- calcLimit دقيق بدون buffer زائد
- تحسين الأداء (useMemo لـ displayItems)
- Build & Verification

---

## 3. add-sort-to-sales-purchase.md
Goal: إضافة نفس دورة الفرز (ASC→DESC→RESET) مع أيقونات ↑/↓ إلى جداول صفحة فواتير المبيعات وصفحة فاتورة الشراء.

Tasks:
- SalesPage.tsx: إضافة الفرز مع أيقونات ↑/↓ وإرسالها بالـ IPC (db:sales:getAll)
- PurchaseFormPage.tsx: تحديث دورة الفرز والأيقونات (Client-side)
- Build & Verification
