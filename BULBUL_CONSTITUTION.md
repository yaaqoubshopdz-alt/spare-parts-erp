# 🐦 بلبل — دستور الجودة | Bulbul Quality Constitution

> **هذا الملف هو العقد الملزم لأي وكيل ذكي يعمل على هذا المشروع.**
> كل كود جديد يُكتب يجب أن يحترم هذه القواعد بدون استثناء.

---

## 1. 🏗️ هيكلة المكونات | Component Architecture

### حدود الحجم
| النوع | الحد الأقصى | الإجراء عند التجاوز |
|---|---|---|
| React Component (`.tsx`) | **300 سطر** | تقسيم إلى مكونات فرعية |
| Custom Hook (`.ts`) | **150 سطر** | تقسيم إلى hooks أصغر |
| IPC Handler (`.ts`) | **100 سطر** | استخراج helpers |
| CSS/Style block | **80 سطر** | استخراج إلى ملف مستقل |

### فصل المنطق عن العرض (Separation of Concerns)
```
❌ BAD: كل المنطق داخل المكون
const ProductPage = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  // ... 200 سطر من المنطق
  return <div>...</div>
}

✅ GOOD: المنطق في Hook مستقل
// useProductPage.ts
export const useProductPage = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  // ... المنطق هنا
  return { data, loading, handlers };
}

// ProductPage.tsx
const ProductPage = () => {
  const { data, loading, handlers } = useProductPage();
  return <div>...</div>  // فقط JSX نظيف
}
```

### هيكل المجلدات للميزات الجديدة
```
src/features/<feature-name>/
├── index.ts              # Public API (re-exports)
├── <Feature>Page.tsx     # المكون الرئيسي
├── components/           # مكونات فرعية
│   ├── <Sub>Card.tsx
│   └── <Sub>Table.tsx
├── hooks/                # Custom hooks
│   └── use<Feature>.ts
├── types.ts              # TypeScript interfaces
└── constants.ts          # ثوابت الميزة
```

---

## 2. 🔒 قواعد TypeScript الصارمة

### ممنوعات مطلقة (Zero Tolerance)
```typescript
// ❌ NEVER — ممنوع نهائيًا
const data: any = ...
const handler = (e: any) => ...
// @ts-ignore
// @ts-expect-error (إلا مع تعليق يشرح لماذا ضروري)

// ✅ ALWAYS — إجباري
interface ProductProps {
  id: number;
  name: string;
  onSave: (product: Product) => void;
}

// كل دالة تُرجع قيمة يجب أن يكون لها Return Type
const calculateTotal = (items: CartItem[]): number => { ... }
```

### أنماط مطلوبة
- **Props**: دائمًا `interface` وليس `type` (للتمديد)
- **State**: استخدام `interface` منفصل لحالة المكون المعقدة
- **IPC**: كل channel يجب أن يكون له `Request` و `Response` types
- **Enums**: استخدام `const enum` أو `as const` objects

```typescript
// نمط IPC المطلوب
interface GetProductsRequest {
  search?: string;
  sortKey?: string;
  sortDir?: 'ASC' | 'DESC';
  page?: number;
  limit?: number;
}

interface GetProductsResponse {
  data: Product[];
  total: number;
}
```

---

## 3. ✅ قائمة التحقق قبل التسليم | Pre-Delivery Checklist

> **قبل تسليم أي كود جديد، يجب التحقق من كل عنصر:**

### الأداء (Performance)
- [ ] لا يوجد `useEffect` بدون dependency array محددة
- [ ] لا يوجد re-renders غير ضرورية (استخدام `React.memo` عند الحاجة)
- [ ] الدوال المُمررة كـ props مغلفة بـ `useCallback`
- [ ] القيم المحسوبة مغلفة بـ `useMemo` عند الحاجة
- [ ] لا يوجد state updates متداخلة (nested setState)

### الأمان (Security)
- [ ] لا يوجد SQL injection (استخدام `SORT_MAP` pattern)
- [ ] لا يوجد interpolation مباشر في SQL queries
- [ ] المدخلات مُصفاة (sanitized) قبل الإرسال
- [ ] أسماء الأعمدة في ORDER BY من `SORT_MAP` فقط

### الأنواع (Types)
- [ ] لا يوجد `any` في الكود الجديد
- [ ] كل Props لها `interface` معرّفة
- [ ] كل دالة عامة لها Return Type صريح
- [ ] IPC channels لها Request/Response types

### الاصطلاحات (Conventions)
- [ ] IPC channel يتبع نمط `db:<entity>:<action>`
- [ ] Channel مضاف إلى `ALLOWED_INVOKE_CHANNELS` في preload.ts
- [ ] Handler مسجل في `registerAllIPC()` في main.ts
- [ ] الألوان من CSS variables فقط — لا hardcoded colors
- [ ] الثيم يعمل في Light و Dark modes

### الهيكلة (Structure)
- [ ] المكون لا يتجاوز 300 سطر
- [ ] المنطق المعقد مستخرج في Custom Hook
- [ ] لا يوجد تكرار كود (DRY principle)
- [ ] المكونات القابلة لإعادة الاستخدام في `src/shared/components/`

---

## 4. 🎨 معايير التصميم البصري | Visual Design Standards

### نظام الألوان
```css
/* ❌ ممنوع */
background: #3b82f6;
color: red;

/* ✅ إجباري — استخدام متغيرات CSS فقط */
background: rgb(var(--color-primary) / 0.1);
color: rgb(var(--color-danger));
```

### التدرجات المعتمدة (Approved Gradients)
```css
/* Premium KPI Cards */
--gradient-profit: linear-gradient(135deg, #10b981, #059669);
--gradient-danger: linear-gradient(135deg, #ef4444, #dc2626);
--gradient-info: linear-gradient(135deg, #3b82f6, #2563eb);
--gradient-warning: linear-gradient(135deg, #f59e0b, #d97706);

/* Glass Effect */
--glass-bg: rgba(255, 255, 255, 0.08);
--glass-border: rgba(255, 255, 255, 0.12);
--glass-blur: blur(20px);
```

### قواعد الأنيميشن
| النوع | المدة | التوقيت | متى نستخدم |
|---|---|---|---|
| Hover | `150-200ms` | `ease-out` | أزرار، بطاقات |
| Enter/Exit | `200-350ms` | `cubic-bezier(0.4, 0, 0.2, 1)` | Modals, dropdowns |
| Page transition | `300-500ms` | `spring` (framer) | تبديل الصفحات |
| Micro-interaction | `100-150ms` | `ease` | Icons, toggles |
| ❌ ممنوع | `> 800ms` | — | أي أنيميشن أطول من 800ms |

### التباين والوضوح
- **نسبة التباين الدنيا**: `4.5:1` للنصوص العادية
- **نسبة التباين الدنيا**: `3:1` للنصوص الكبيرة والأيقونات
- **الأزرار**: يجب أن يكون لها `hover`, `active`, `disabled` states واضحة
- **المدخلات**: يجب أن يكون لها `focus` ring مرئي

---

## 5. 📝 التوثيق الإجباري | Mandatory Documentation

### IPC Handlers
```typescript
/**
 * جلب قائمة المنتجات مع فلترة وترتيب
 * 
 * @channel db:products:list
 * @param {GetProductsRequest} args - معايير البحث والترتيب
 * @returns {GetProductsResponse} قائمة المنتجات مع العدد الإجمالي
 * @throws {Error} إذا فشل الاستعلام
 */
ipcMain.handle('db:products:list', async (_, args: GetProductsRequest) => {
  // ...
});
```

### React Components
```typescript
/**
 * بطاقة عرض معلومات المنتج
 * تُستخدم في: صفحة المنتجات، نتائج البحث، الفاتورة
 * 
 * @example
 * <ProductCard product={product} onEdit={handleEdit} />
 */
interface ProductCardProps {
  /** بيانات المنتج */
  product: Product;
  /** Callback عند الضغط على تعديل */
  onEdit: (id: number) => void;
  /** إظهار السعر (اختياري) */
  showPrice?: boolean;
}
```

### Custom Hooks
```typescript
/**
 * Hook لإدارة حالة وعمليات صفحة المنتجات
 * يتعامل مع: الجلب، البحث، الترتيب، الحذف
 * 
 * @returns حالة الصفحة و handlers التفاعل
 */
export const useProductsPage = () => { ... }
```

---

## 6. 🚨 أنماط مطلوبة | Required Patterns

### إدارة الأخطاء
```typescript
// ❌ BAD
try {
  const data = await window.electronAPI.invoke('db:products:list');
  setProducts(data);
} catch (e) {
  console.log(e);
}

// ✅ GOOD
try {
  setLoading(true);
  setError(null);
  const data = await window.electronAPI.invoke('db:products:list', params);
  setProducts(data.data);
  setTotal(data.total);
} catch (err) {
  const message = err instanceof Error ? err.message : 'خطأ غير متوقع';
  setError(message);
  toast.error(message); // إشعار المستخدم
} finally {
  setLoading(false);
}
```

### Loading States
```typescript
// كل عملية async يجب أن يكون لها:
// 1. حالة تحميل مرئية (skeleton أو spinner)
// 2. حالة خطأ مع رسالة واضحة
// 3. حالة فارغة (empty state) بتصميم جميل
```

### Table Sorting (3-State)
```typescript
// دائمًا: ASC → DESC → RESET (null)
// لا تستخدم nested state updates
const handleSort = useCallback((key: string) => {
  setSortKey(key);
  setSortDir(prev => {
    if (sortKey !== key) return 'ASC';
    if (prev === 'ASC') return 'DESC';
    if (prev === 'DESC') return null;
    return 'ASC';
  });
}, [sortKey]);
```

---

## 7. 🛡️ قواعد قاعدة البيانات | Database Rules

### SQL Safety
```typescript
// ❌ NEVER — حقن SQL
const query = `SELECT * FROM products ORDER BY ${column} ${dir}`;

// ✅ ALWAYS — استخدام SORT_MAP
const SORT_MAP: Record<string, string> = {
  name: 'p.name',
  price: 'p.selling_price',
  stock: 'p.current_stock',
  created: 'p.created_at',
};

const orderCol = SORT_MAP[sortKey] || 'p.created_at';
const orderDir = sortDir === 'DESC' ? 'DESC' : 'ASC';
const query = `SELECT * FROM products ORDER BY ${orderCol} ${orderDir}`;
```

### Migration Safety
- كل تعديل على schema يجب أن يكون في `database/migrations/`
- لا تحذف أعمدة — أضف `deprecated_` prefix
- دائمًا أضف `DEFAULT` للأعمدة الجديدة

---

## 8. 📋 ملخص القواعد السريع | Quick Reference

| القاعدة | الحكم |
|---|---|
| `any` في TypeScript | ❌ ممنوع |
| `@ts-ignore` | ❌ ممنوع |
| ألوان hardcoded | ❌ ممنوع |
| SQL interpolation | ❌ ممنوع |
| مكون > 300 سطر | ❌ ممنوع |
| أنيميشن > 800ms | ❌ ممنوع |
| `console.log` في production | ❌ ممنوع |
| `useEffect` بدون deps | ❌ ممنوع |
| Interface لكل Props | ✅ إجباري |
| Return type للدوال العامة | ✅ إجباري |
| Custom Hook للمنطق المعقد | ✅ إجباري |
| Error handling مع toast | ✅ إجباري |
| Loading/Error/Empty states | ✅ إجباري |
| SORT_MAP لـ ORDER BY | ✅ إجباري |
| توثيق IPC channels | ✅ إجباري |
| CSS variables للألوان | ✅ إجباري |

---

> **⚠️ ملاحظة**: هذه القواعد تُطبق على **الكود الجديد فقط**.
> الكود الحالي يبقى كما هو ما لم يُطلب تحديثه صراحةً.

---

*آخر تحديث: 2025 | المشروع: Spare Parts ERP*
