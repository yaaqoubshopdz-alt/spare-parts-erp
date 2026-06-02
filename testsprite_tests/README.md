# Spare Parts ERP — TestSprite E2E & Integration Testing Guide
# دليل اختبارات TestSprite الشامل لمشروع إدارة قطع الغيار

This guide provides detailed instructions on how to use **TestSprite** for automated End-to-End (E2E) and integration testing in the Spare Parts ERP application.

---

## English Version

### 1. Overview
Spare Parts ERP is a desktop application built with Electron, React 18, Vite, Tailwind CSS, and better-sqlite3. E2E testing with TestSprite relies on Vite's local dev/preview server.

Since Electron-specific features (such as direct IPC and database calls) require the Electron shell runtime, a browser-based preview utilizes a **browser-compatible API mock** (registered in [src/main.tsx](file:///c:/aissa/src/main.tsx)). This mock simulates all IPC handlers and returns mock data, enabling TestSprite to verify UI flows, calculations, multi-language transitions, responsive forms, and client-side logic successfully.

### 2. Pre-requisites & Local Service Port
* **Port**: TestSprite targets local port `5173`.
* **Database State**: The browser mockup mimics the SQLite database, resetting the state on each reload.
* **Server Mode**: We recommend running TestSprite in **Production Preview Mode** to build assets and test optimized bundles:
  ```bash
  npm run build
  npm run preview -- --port 5173
  ```
  Or in **Development Mode** (Vite dev server):
  ```bash
  npm run dev -- --port 5173
  ```
  *(Note: When running in development mode, TestSprite limits tests to 15 to prevent dev-server overload.)*

### 3. How to Bootstrap & Run TestSprite
To run TestSprite tests, use the TestSprite MCP server tools:
1. **Bootstrap (First-time setup only)**:
   Call `testsprite_bootstrap` with:
   - `projectPath`: `c:\aissa`
   - `type`: `frontend`
   - `localPort`: `5173`
   - `testScope`: `codebase`
2. **Generate Test Plan**:
   Call `testsprite_generate_frontend_test_plan` or `testsprite_generate_backend_test_plan` to set up scenarios.
3. **Execute Tests**:
   Ensure your local server is running on port `5173`, and call `testsprite_generate_code_and_execute`.

### 4. Key E2E Scenarios to Verify
- **POS / Sales Workflow**:
  1. Login as `admin` / `admin123`.
  2. Open the POS screen.
  3. Create/select a customer.
  4. Search and add products to the cart.
  5. Apply discounts (amount/percentage) and taxes.
  6. Choose payment method and confirm.
  7. Check if financial math satisfies `roundTo2` calculations.
- **Purchase Workflow**:
  1. Select a supplier.
  2. Input item purchasing details and cost prices.
  3. Confirm the purchase invoice and check values.
- **Cashbox & Expenses**:
  1. Access cashbox summary.
  2. Perform manual deposit and withdrawal operations.
  3. Log an expense and observe the balance decrease.
- **UI Languages & RTL**:
  1. Toggle between Arabic (Right-to-Left) and French (Left-to-Right).
  2. Verify form layouts, alignment, and responsiveness.

---

## النسخة العربية (Arabic Version)

### 1. نظرة عامة
برنامج Spare Parts ERP هو تطبيق لسطح المكتب مبني باستخدام Electron و React 18 و Vite و Tailwind CSS و better-sqlite3.

تعتمد اختبارات E2E باستخدام **TestSprite** على تشغيل خادم محلي للواجهة الأمامية. نظرًا لأن وظائف Electron المباشرة (مثل قنوات IPC وقاعدة البيانات) تتطلب تشغيل البرنامج داخل Electron، فإن واجهة المتصفح تستخدم **محاكاة متكاملة لـ window.electronAPI** (معرّفة في الملف [src/main.tsx](file:///c:/aissa/src/main.tsx)). تقوم هذه المحاكاة بتمثيل استجابات قاعدة البيانات وعمليات الـ IPC، مما يسمح لـ TestSprite باختبار تدفقات الصفحات وحسابات الأسعار، وتبديل اللغات بنجاح دون الحاجة لبيئة Electron كاملة.

### 2. المتطلبات المسبقة ومنفذ الخدمة
* **المنفذ الافتراضي**: تستهدف أداة TestSprite المنفذ المحلي `5173`.
* **حالة البيانات**: تقوم المحاكاة بإعادة ضبط البيانات تلقائياً مع كل تحديث للصفحة.
* **وضع تشغيل الخادم**: يُفضّل تشغيل الخادم بوضع الإنتاج (Production Preview) لضمان استقرار الأداء:
  ```bash
  npm run build
  npm run preview -- --port 5173
  ```
  أو بوضع التطوير (Vite Dev Server):
  ```bash
  npm run dev -- --port 5173
  ```
  *(تنبيه: في وضع التطوير، يقوم TestSprite بالحد من عدد الاختبارات إلى 15 اختباراً لتجنب إرهاق الخادم).*

### 3. خطوات تهيئة وتشغيل اختبارات TestSprite
1. **التهيئة الأولية (للمرة الأولى فقط)**:
   استدعاء أداة `testsprite_bootstrap` بالمعاملات التالية:
   - `projectPath`: `c:\aissa`
   - `type`: `frontend`
   - `localPort`: 5173
   - `testScope`: `codebase`
2. **توليد خطة الاختبار**:
   استدعاء `testsprite_generate_frontend_test_plan` لإنشاء قائمة بالسيناريوهات والمسارات المطلوبة.
3. **تنفيذ الاختبارات**:
   تأكد من تشغيل خادم Vite على المنفذ `5173` ثم استدعِ أداة `testsprite_generate_code_and_execute`.

### 4. السيناريوهات الأساسية للاختبار
* **سير عمل نقطة البيع (POS)**:
  1. تسجيل الدخول بـ `admin` / `admin123`.
  2. فتح صفحة المبيعات (POS).
  3. اختيار زبون أو إضافة زبون جديد.
  4. البحث عن المنتجات وإضافتها إلى السلة.
  5. تطبيق الخصومات (نسبة أو مبلغ ثابت) والضرائب.
  6. إتمام الدفع (نقدي/آجل) والتأكيد.
  7. التحقق من تطابق العمليات الحسابية مع معايير التقريب لخانين عشريتين (`roundTo2`).
* **سير عمل المشتريات**:
  1. اختيار مورد.
  2. إضافة المنتجات وتحديد تكلفة الشراء وسعر البيع.
  3. تأكيد فاتورة الشراء والتحقق من التحديث الافتراضي للمخزون.
* **سير عمل الصندوق والمصاريف**:
  1. فتح صفحة ملخص الصندوق.
  2. إضافة عملية إيداع أو سحب يدوي.
  3. تسجيل مصروف جديد والتحقق من خصمه تلقائياً من الصندوق.
* **توافق اللغات والاتجاهات (RTL / LTR)**:
  1. تبديل لغة الواجهة بين العربية (يمين إلى يسار) والفرنسية (يسار إلى يمين).
  2. التحقق من تجاوب العناصر ومحاذاة النصوص.
