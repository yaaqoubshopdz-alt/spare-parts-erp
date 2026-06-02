# Enterprise Architecture: Duplicate Invoice Prevention
## SparePartsERP v1.0.0 - نظام منع تكرار الفواتير

> **التاريخ:** 2026-05-18
> **المستوى:** Enterprise-Grade Architecture
> **النوع:** Desktop ERP (Offline First, SQLite)

---

## 1. Root Cause Analysis (RCA)

### 1.1 المشكلة من منظور هندسي

عند الضغط على زر "حفظ الفاتورة"، تحدث سلسلة من العمليات المتسلسلة:

```
[Frontend Click] → [State Check] → [IPC Invoke] → [Backend Handler]
                                                         ↓
                                            [Session Check (async)]
                                                         ↓
                                            [Transaction Begin]
                                                         ↓
                              ┌─────────────────────────────────────┐
                              │ 1. Check session_id                 │
                              │ 2. Generate Invoice Number          │
                              │ 3. INSERT Invoice                   │
                              │ 4. INSERT Items                     │
                              │ 5. UPDATE Stock                     │
                              │ 6. INSERT Payment                   │
                              │ 7. UPDATE Cash Box                  │
                              │ 8. UPDATE Customer Balance          │
                              │ 9. INSERT Journal Entry             │
                              │ 10. UPDATE Price History            │
                              │ 11. INSERT Audit Log                │
                              └─────────────────────────────────────┘
                                                         ↓
                                            [Transaction Commit]
                                                         ↓
                                            [Response to Frontend]
```

### 1.2 نقاط الفشل المحتملة (11 نقطة)

| # | النقطة | نوع الخطأ | التأثير |
|---|--------|-----------|---------|
| 1 | Frontend Click | Multi-click / Double-tap | إرسال طلبين متزامنين |
| 2 | State Check | Race Condition | تجاوز الحراس |
| 3 | IPC Invoke | Async Delay | المستخدم يضغط مرة أخرى |
| 4 | Session Check | Async (قبل الـ Transaction) | نافذة زمنية للتكرار |
| 5 | session_id Check | داخل الـ Transaction لكن بعد الـ async | طلبان متزامنان ينجحان معاً |
| 6 | Invoice Number | تسلسل غير محمي | أرقام مكررة |
| 7-11 | عمليات مالية | داخل الـ Transaction | تكرار القيود |

### 1.3 الأسباب الجذرية المحددة في الكود الحالي

#### السبب #1: Async قبل الـ Transaction

```typescript
// sales.ipc.ts:113-115
const session = await AuthService.checkSession(); // ← ASYNC OUTSIDE TRANSACTION
if (!session.success) return { success: false, error: 'غير مصرح' };

const raw = db();
const createInvoiceTransaction = raw.transaction(() => { // ← TRANSACTION STARTS LATE
  // ...
});
```

**المشكلة:** بين `checkSession()` وبداية الـ Transaction، يمكن لطلب آخر أن يدخل.

#### السبب #2: فحص session_id داخل الـ Transaction لكن بعد عمليات

```typescript
const createInvoiceTransaction = raw.transaction(() => {
  if (data.session_id) {
    const existing = raw.prepare('SELECT ... WHERE session_id = ?').get(data.session_id);
    if (existing) return existing.id; // ← يعود لكن الـ Transaction ما زال مفتوحاً
  }
  // ... عمليات INSERT
});
```

**المشكلة:** في SQLite، الـ Transaction يستخدم `BEGIN IMMEDIATE` لكن الطلبين المتزامنان يمكن أن:
1. يدخلان الـ Transaction معاً
2. يفحصان session_id (لا يوجد بعد)
3. كلاهما يُدخل الفاتورة
4. الثاني يفشل بـ UNIQUE constraint

#### السبب #3: Frontend يُلغي الحظر مبكراً

```typescript
// POSPage.tsx:557-559
finally {
  setSaving(false);           // ← يُعاد تعيينه حتى لو نجح الحفظ
  isSavingRef.current = false; // ← المستخدم يمكنه الضغط مرة أخرى
}
```

**المشكلة:** بعد نجاح الحفظ، `isSavedRef.current = true` لكن `isSavingRef.current = false`. إذا ضغط المستخدم بسرعة قبل أن يتفاعل الـ UI، يمكنه إرسال طلب آخر.

#### السبب #4: لا يوجد Idempotency Key حقيقي

```typescript
// POSPage.tsx:214
const [saveSessionId, setSaveSessionId] = useState(`SALE-${Date.now()}-${Math.random()...}`);
```

**المشكلة:** `session_id` يُنشأ عند تحميل الصفحة، ليس عند محاولة الحفظ. إذا أُعيد تحميل الصفحة مع نفس البيانات، يُنشأ `session_id` جديد.

#### السبب #5: القيود المحاسبية تُنشأ داخل نفس الـ Transaction

```typescript
AccountingEngine.recordSale(raw, { ... }); // ← داخل نفس الـ Transaction
```

**المشكلة:** إذا تكررت الفاتورة، تتكرر القيود المحاسبية أيضاً → فساد محاسبي كامل.

---

## 2. Enterprise Architecture Solution

### 2.1 المبادئ الأساسية

| المبدأ | الوصف | التطبيق |
|--------|-------|---------|
| **Idempotency** | نفس الطلب = نفس النتيجة دائماً | Idempotency Key + DB Constraint |
| **Atomicity** | كل شيء أو لا شيء | Transaction واحدة شاملة |
| **Isolation** | عزل العمليات المتزامنة | IMMEDIATE Transaction |
| **Durability** | البيانات لا تُفقد | SQLite WAL Mode |
| **Auditability** | كل عملية قابلة للتتبع | Audit Log + Hash Chain |

### 2.2 Architecture Layers (5 طبقات حماية)

```
┌─────────────────────────────────────────────────────────────┐
│ Layer 1: Frontend Idempotency Guard                         │
│   - Atomic Check-and-Set (wasSaving)                        │
│   - Unique Request ID (UUID v4)                             │
│   - Request Deduplication Map                               │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│ Layer 2: IPC Request Throttle                               │
│   - Single-flight pattern (one request per session_id)      │
│   - Request coalescing (merge duplicate requests)           │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│ Layer 3: Backend Idempotency Check                          │
│   - Pre-transaction session_id lookup                       │
│   - Idempotency response cache                              │
│   - Return cached response for duplicates                   │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│ Layer 4: Database Constraints                               │
│   - UNIQUE INDEX on session_id                              │
│   - UNIQUE INDEX on invoice_number                          │
│   - UNIQUE INDEX on journal entry (reference_type + ref_id) │
│   - FOREIGN KEY constraints                                 │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│ Layer 5: Transaction Isolation                              │
│   - BEGIN IMMEDIATE (write lock)                            │
│   - All operations in single transaction                    │
│   - Rollback on any failure                                 │
└─────────────────────────────────────────────────────────────┘
```

### 2.3 Idempotency Strategy (المفتاح)

#### ما هو Idempotency؟

في الأنظمة المالية، **Idempotency** يعني:
> "نفس الطلب المُكرر يجب أن يُنتج نفس النتيجة دون تأثيرات جانبية إضافية"

#### كيف تعمل في الأنظمة المصرفية؟

```
Stripe API: Idempotency-Key header
  → إذا نفس المفتاح → يرجع نفس الـ response
  → لا يُنشئ عملية جديدة

Banking SWIFT: Transaction Reference
  → نفس المرجع = نفس العملية
  → المرجع المكرر يُرفض تلقائياً

POS Systems: Terminal ID + Transaction Counter
  → كل محطة لها عداد فريد
  → لا يمكن تكرار نفس الرقم
```

#### تطبيقنا:

```typescript
// Frontend: إنشاء Idempotency Key فريد
const idempotencyKey = `SALE-${userId}-${Date.now()}-${crypto.randomUUID()}`;

// Backend: فحص قبل أي عملية
const cached = raw.prepare('SELECT * FROM idempotency_keys WHERE key = ?').get(idempotencyKey);
if (cached) {
  return JSON.parse(cached.response_body); // ← نفس الرد بدون تنفيذ
}

// بعد النجاح: حفظ الرد
raw.prepare('INSERT INTO idempotency_keys (key, response_body, created_at) VALUES (?, ?, ?)')
  .run(idempotencyKey, JSON.stringify(response), new Date().toISOString());
```

---

## 3. Database Design

### 3.1 جدول Idempotency Keys

```sql
CREATE TABLE idempotency_keys (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key TEXT NOT NULL UNIQUE,
    request_type TEXT NOT NULL,  -- 'sale', 'purchase', 'return'
    request_hash TEXT,           -- SHA256 of request body for validation
    response_body TEXT NOT NULL, -- JSON response to return for duplicates
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'completed', 'failed'
    invoice_id INTEGER,          -- Reference to created invoice
    user_id INTEGER REFERENCES users(id),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    completed_at TEXT
);

-- Index for fast lookup
CREATE INDEX idx_idempotency_key ON idempotency_keys(key);
CREATE INDEX idx_idempotency_status ON idempotency_keys(status);
```

### 3.2 جدول Audit Log (محسّن)

```sql
CREATE TABLE audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER REFERENCES users(id),
    username_snapshot TEXT,
    action TEXT NOT NULL,
    table_name TEXT NOT NULL,
    record_id INTEGER,
    description TEXT,
    old_data TEXT,
    new_data TEXT,
    idempotency_key TEXT,        -- ربط العملية بالمفتاح
    request_hash TEXT,           -- للتحقق من التكرار
    app_version TEXT,
    ip_address TEXT,             -- للشبكات
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

### 3.3 Constraints الموجودة ✅

| الجدول | الـ Constraint | الحالة |
|--------|----------------|--------|
| `sales_invoices` | `session_id UNIQUE` | ✅ موجود |
| `sales_invoices` | `invoice_number UNIQUE` | ✅ موجود |
| `purchase_invoices` | `session_id UNIQUE` | ✅ موجود |
| `purchase_invoices` | `invoice_number UNIQUE` | ✅ موجود |
| `journal_entries` | `entry_number UNIQUE` | ✅ موجود |

### 3.4 Constraints المفقودة ❌

| الجدول | الـ Constraint المطلوب | السبب |
|--------|----------------------|-------|
| `journal_entries` | `UNIQUE(reference_type, reference_id)` | منع قيود مكررة لنفس الفاتورة |
| `payments` | `UNIQUE(invoice_id, party_type)` | منع دفعات مكررة لنفس الفاتورة |
| `stock_movements` | لا يوجد UNIQUE | حركات مكررة محتملة |

---

## 4. Backend Logic (Enterprise Pattern)

### 4.1 Single-Flight Pattern

```typescript
// في Backend: منع الطلبات المتزامنة لنفس الـ session_id
const activeRequests = new Map<string, Promise<any>>();

ipcMain.handle('db:sales:create', async (_e, data) => {
  const key = data.session_id;
  
  // إذا هناك طلب نشط لنفس الـ session_id، انتظره
  if (activeRequests.has(key)) {
    console.log(`[Sales IPC] Coalescing duplicate request for ${key}`);
    return activeRequests.get(key);
  }
  
  try {
    const promise = processSaleInvoice(data);
    activeRequests.set(key, promise);
    return await promise;
  } finally {
    activeRequests.delete(key);
  }
});
```

### 4.2 Idempotency Check قبل الـ Transaction

```typescript
async function processSaleInvoice(data: any) {
  const raw = db();
  
  // 1. فحص Idempotency BEFORE أي عملية
  if (data.session_id) {
    const existing: any = raw.prepare(`
      SELECT si.id, si.invoice_number, si.status,
             ik.response_body
      FROM sales_invoices si
      LEFT JOIN idempotency_keys ik ON ik.key = ?
      WHERE si.session_id = ?
    `).get(data.session_id, data.session_id);
    
    if (existing) {
      console.log(`[Sales IPC] Idempotent response for ${data.session_id}`);
      return existing.response_body 
        ? JSON.parse(existing.response_body)
        : { success: true, id: existing.id, invoiceNumber: existing.invoice_number, duplicate: true };
    }
  }
  
  // 2. Session check (داخل الـ flow لكن قبل الـ Transaction)
  const session = await AuthService.checkSession();
  if (!session.success) return { success: false, error: 'غير مصرح' };
  const userId = session.user.id;
  
  // 3. Transaction واحدة شاملة
  const tx = raw.transaction(() => {
    // ... كل العمليات هنا
  });
  
  const result = tx.immediate(); // ← WRITE LOCK
  
  // 4. حفظ Idempotency Response
  if (data.session_id && result.success) {
    raw.prepare(`
      INSERT OR IGNORE INTO idempotency_keys (key, request_type, response_body, status, invoice_id, user_id, completed_at)
      VALUES (?, 'sale', ?, 'completed', ?, ?, datetime('now'))
    `).run(data.session_id, JSON.stringify(result), result.id, userId);
  }
  
  return result;
}
```

### 4.3 Transaction Isolation Level

```typescript
// SQLite Transaction Types:
// - deferred: لا يقفل حتى أول كتابة (الأضعف)
// - immediate: يقفل للكتابة فوراً (موصى به)
// - exclusive: يقفل للقراءة والكتابة (الأقوى)

const tx = raw.transaction(() => { ... });
tx.immediate(); // ← استخدم هذا دائماً للعمليات المالية
```

---

## 5. Frontend Logic (Enterprise Pattern)

### 5.1 Request Deduplication Map

```typescript
// في Frontend: تتبع الطلبات النشطة
const pendingRequests = new Map<string, Promise<any>>();

const saveInvoice = async () => {
  // Guards
  if (isSavedRef.current) return;
  if (items.length === 0) return;
  
  // Atomic Check-and-Set
  const wasSaving = isSavingRef.current;
  isSavingRef.current = true;
  if (wasSaving || saving) {
    isSavingRef.current = false;
    return;
  }
  
  setSaving(true);
  
  try {
    // إنشاء Idempotency Key فريد
    const idempotencyKey = `SALE-${user?.id}-${Date.now()}-${crypto.randomUUID()}`;
    setSaveSessionId(idempotencyKey);
    
    // Single-flight: إذا نفس الـ key يُطلب، انتظر
    if (pendingRequests.has(idempotencyKey)) {
      return pendingRequests.get(idempotencyKey);
    }
    
    const invoiceData = { ... , session_id: idempotencyKey };
    
    const promise = api.invoke('db:sales:create', invoiceData);
    pendingRequests.set(idempotencyKey, promise);
    
    const res = await promise;
    
    if (res?.success) {
      isSavedRef.current = true;
      
      if (res.duplicate) {
        toast.info('هذه الفاتورة محفوظة مسبقاً');
      } else {
        toast.success('تم حفظ الفاتورة بنجاح');
      }
      
      // تحديث الواجهة
      setCurrentInvoiceId(res.id);
      setInvoiceNumber(res.invoiceNumber);
    }
    
    return res;
  } finally {
    // لا تُلغي الحظر إذا نجح الحفظ
    if (!isSavedRef.current) {
      setSaving(false);
      isSavingRef.current = false;
    }
    pendingRequests.delete(saveSessionId);
  }
};
```

### 5.2 State Machine للفاتورة

```typescript
type InvoiceState = 
  | 'new'           // فاتورة جديدة
  | 'editing'       // قيد التعديل
  | 'saving'        // قيد الحفظ
  | 'saved'         // تم الحفظ
  | 'duplicate'     // محفوظة مسبقاً
  | 'error';        // خطأ في الحفظ

const [invoiceState, setInvoiceState] = useState<InvoiceState>('new');

const saveInvoice = async () => {
  if (invoiceState === 'saving' || invoiceState === 'saved') return;
  
  setInvoiceState('saving');
  
  try {
    const res = await api.invoke('db:sales:create', data);
    
    if (res?.success) {
      setInvoiceState(res.duplicate ? 'duplicate' : 'saved');
    } else {
      setInvoiceState('error');
    }
  } catch {
    setInvoiceState('error');
  }
};
```

---

## 6. Complete Workflow

### 6.1 سيناريو الحفظ الطبيعي

```
1. المستخدم يضغط "حفظ"
2. Frontend:
   ├── فحص: invoiceState !== 'saving' && !== 'saved' ✅
   ├── Atomic Check-and-Set: wasSaving = false → isSavingRef = true ✅
   ├── إنشاء Idempotency Key: `SALE-1-1716000000-abc123`
   ├── إرسال الطلب للـ Backend
   └── invoiceState = 'saving'

3. Backend:
   ├── Single-Flight: لا يوجد طلب نشط لنفس الـ key ✅
   ├── فحص Idempotency: لا يوجد في DB ✅
   ├── Session Check: ✅
   ├── BEGIN IMMEDIATE Transaction (Write Lock)
   ├── فحص session_id في DB: لا يوجد ✅
   ├── INSERT Invoice
   ├── INSERT Items
   ├── UPDATE Stock
   ├── INSERT Payment
   ├── UPDATE Cash Box
   ├── UPDATE Customer Balance
   ├── INSERT Journal Entry
   ├── INSERT Idempotency Key
   ├── COMMIT Transaction
   └── إرجاع: { success: true, id: 1, invoiceNumber: 'S-180526-001' }

4. Frontend:
   ├── استلام الرد
   ├── isSavedRef = true
   ├── invoiceState = 'saved'
   ├── toast.success('تم حفظ الفاتورة بنجاح')
   └── finally: لا يُلغي الحظر (isSavedRef = true)

5. المستخدم يضغط "حفظ" مرة أخرى:
   ├── Frontend: invoiceState === 'saved' → return ✅
   └── لا يُرسل أي طلب
```

### 6.2 سيناريو الحفظ المكرر (Race Condition)

```
1. المستخدم يضغط "حفظ" مرتين بسرعة (100ms فرق)

2. الطلب الأول:
   ├── Atomic Check-and-Set: wasSaving = false → isSavingRef = true ✅
   ├── يُرسل للـ Backend

3. الطلب الثاني (100ms لاحقاً):
   ├── Atomic Check-and-Set: wasSaving = true → يرفض ✅
   └── لا يُرسل للـ Backend

4. إذا تجاوز الطلب الثاني (نادر جداً):
   ├── Backend Single-Flight: نفس الـ key نشط → ينتظر الطلب الأول ✅
   └── يرجع نفس الرد بدون تنفيذ
```

### 6.3 سيناريو الحفظ بعد إعادة التشغيل

```
1. المستخدم يحفظ فاتورة → يُنشأ Idempotency Key في DB
2. التطبيق يُغلق ويُعاد فتحه
3. المستخدم يحاول حفظ نفس الفاتورة (نفس البيانات):
   ├── يُنشأ Idempotency Key جديد (لأنه localStorage فُقد)
   ├── Backend: يفحص session_id في sales_invoices
   ├── يجد الفاتورة موجودة → يرجع { duplicate: true }
   └── Frontend: toast.info('هذه الفاتورة محفوظة مسبقاً')
```

---

## 7. Audit Trail Design

### 7.1 ما يجب تسجيله

| الحدث | البيانات المسجلة |
|-------|-----------------|
| إنشاء فاتورة | user, session_id, invoice_id, timestamp, request_hash |
| حفظ مكرر | user, session_id, original_invoice_id, timestamp |
| إلغاء فاتورة | user, invoice_id, reason, timestamp |
| تعديل فاتورة | user, invoice_id, old_data, new_data, timestamp |

### 7.2 Hash Chain للتحقق من التكرار

```typescript
// إنشاء Hash للطلب
const requestHash = crypto.createHash('sha256')
  .update(JSON.stringify({
    customer_id,
    items: items.map(i => ({ product_id: i.product_id, quantity: i.quantity, unit_price: i.unit_price })),
    total,
    date
  }))
  .digest('hex');

// في Backend: فحص إذا نفس الـ hash موجود
const existing: any = raw.prepare(`
  SELECT id FROM audit_log 
  WHERE user_id = ? AND action = 'invoice_create' AND request_hash = ?
`).get(userId, requestHash);

if (existing) {
  return { success: true, id: existing.id, duplicate: true };
}
```

---

## 8. Event Lifecycle للفواتير

### 8.1 States

```
┌─────────┐     ┌─────────┐     ┌──────────┐     ┌──────────┐
│  DRAFT  │────▶│ SAVING  │────▶│ CONFIRMED│────▶│ CANCELLED│
└─────────┘     └─────────┘     └──────────┘     └──────────┘
                    │
                    ▼
              ┌──────────┐
              │  ERROR   │
              └──────────┘
```

### 8.2 Transitions

| من | إلى | الشرط | التأثير |
|----|-----|-------|---------|
| DRAFT | SAVING | المستخدم ضغط حفظ | يبدأ الـ Transaction |
| SAVING | CONFIRMED | الـ Transaction نجح | يُخصم المخزون، تُنشأ القيود |
| SAVING | ERROR | الـ Transaction فشل | لا تأثير على البيانات |
| SAVING | DRAFT | المستخدم ألغى | لا تأثير |
| CONFIRMED | CANCELLED | إلغاء بموافقة مدير | يُرجع المخزون، قيود عكسية |
| CANCELLED | - | - | لا يمكن التعديل |

### 8.3 ما يحدث في كل Transition

```
DRAFT → SAVING:
  - لا تغيير في DB
  - فقط تغيير حالة الواجهة

SAVING → CONFIRMED:
  - INSERT sales_invoices (status = 'confirmed')
  - INSERT sales_invoice_items
  - UPDATE stock_balances (خصم)
  - INSERT payments (إذا مدفوع)
  - UPDATE cash_boxes (رصيد)
  - UPDATE customers.balance (إذا آجل)
  - INSERT journal_entries (قيد مزدوج)
  - INSERT price_history (إذا تغير السعر)
  - INSERT audit_log
  - INSERT idempotency_keys

SAVING → ERROR:
  - ROLLBACK الـ Transaction
  - لا تغيير في DB
  - رسالة خطأ للمستخدم

CONFIRMED → CANCELLED:
  - UPDATE sales_invoices (status = 'cancelled')
  - UPDATE stock_balances (إرجاع)
  - UPDATE cash_boxes (عكس)
  - UPDATE customers.balance (عكس)
  - INSERT journal_entries (قيد عكسي)
  - INSERT audit_log
```

---

## 9. التعامل مع التعديل بعد الحفظ

### 9.1 المبدأ الأساسي

> **الفاتورة المؤكدة لا تُعدّل - تُلغى وتُنشأ جديدة**

هذا مبدأ محاسبي عالمي (GAAP / IFRS).

### 9.2 Workflow

```
1. فاتورة مؤكدة (S-180526-001)
2. المستخدم يريد التعديل:
   ├── النظام: "لا يمكن تعديل فاتورة مؤكدة"
   ├── الخيار 1: إلغاء الفاتورة → إنشاء جديدة
   └── الخيار 2: إنشاء مرتجع → إنشاء فاتورة صحيحة

3. الإلغاء:
   ├── طلب PIN مدير
   ├── فحص الفترة المالية (مقفلة؟)
   ├── قيد عكسي تلقائي
   ├── إرجاع المخزون
   ├── عكس المدفوعات
   └── الفاتورة تصبح 'cancelled'

4. إنشاء جديدة:
   ├── نفس بيانات الفاتورة الملغاة
   ├── رقم فاتورة جديد (S-180526-002)
   ├── Idempotency Key جديد
   └── قيود محاسبية جديدة
```

### 9.3 Database Constraints للتعديل

```sql
-- منع تعديل الفواتير المؤكدة
CREATE TRIGGER prevent_confirmed_update
BEFORE UPDATE ON sales_invoices
WHEN OLD.status = 'confirmed' AND NEW.status != 'cancelled'
BEGIN
  SELECT RAISE(ABORT, 'لا يمكن تعديل فاتورة مؤكدة. يجب إلغاؤها أولاً.');
END;

-- منع حذف الفواتير
CREATE TRIGGER prevent_invoice_delete
BEFORE DELETE ON sales_invoices
BEGIN
  SELECT RAISE(ABORT, 'لا يمكن حذف الفواتير. يجب إلغاؤها.');
END;
```

---

## 10. الأخطاء الحالية في التصميم

### 10.1 أخطاء حرجة

| # | الخطأ | الموقع | التأثير |
|---|-------|--------|---------|
| 1 | `AuthService.checkSession()` قبل الـ Transaction | `sales.ipc.ts:113` | نافذة زمنية للتكرار |
| 2 | لا يوجد UNIQUE على `(reference_type, reference_id)` في journal_entries | `accounting.schema.ts` | قيود مكررة محتملة |
| 3 | لا يوجد UNIQUE على `(invoice_id, party_type)` في payments | `finance.schema.ts` | دفعات مكررة |
| 4 | `finally` يُلغي الحظر حتى بعد النجاح | `POSPage.tsx:557-559` | إمكانية النقر مرة أخرى |
| 5 | لا يوجد Single-Flight Pattern | `sales.ipc.ts` | طلبان متزامنان يمكن أن ينجحا |

### 10.2 أخطاء متوسطة

| # | الخطأ | الموقع | التأثير |
|---|-------|--------|---------|
| 6 | `session_id` يُنشأ عند تحميل الصفحة | `POSPage.tsx:214` | ليس Idempotency Key حقيقي |
| 7 | لا يوجد Hash Chain للطلبات | - | لا يمكن التحقق من التكرار |
| 8 | لا يوجد جدول idempotency_keys | - | لا يمكن تخزين الردود |
| 9 | لا يوجد State Machine للفاتورة | `POSPage.tsx` | حالات غير واضحة |
| 10 | لا يوجد Triggers لمنع التعديل | `invoices.schema.ts` | فواتير مؤكدة قابلة للتعديل |

---

## 11. خطة التنفيذ

### المرحلة 1: حماية فورية (يوم 1)

| المهمة | الملف | الوصف |
|--------|-------|-------|
| 1.1 | `POSPage.tsx` | عدم إلغاء الحظر في `finally` إذا نجح الحفظ |
| 1.2 | `PurchaseFormPage.tsx` | نفس التحسين |
| 1.3 | `sales.ipc.ts` | اعتراض UNIQUE constraint + إرجاع duplicate |
| 1.4 | `purchases.ipc.ts` | نفس التحسين |

### المرحلة 2: Idempotency Table (يوم 2-3)

| المهمة | الملف | الوصف |
|--------|-------|-------|
| 2.1 | `idempotency.schema.ts` | إنشاء جدول جديد |
| 2.2 | `database.service.ts` | Migration لإضافة الجدول |
| 2.3 | `sales.ipc.ts` | فحص وحفظ Idempotency Keys |
| 2.4 | `purchases.ipc.ts` | نفس التحسين |

### المرحلة 3: Single-Flight Pattern (يوم 4)

| المهمة | الملف | الوصف |
|--------|-------|-------|
| 3.1 | `sales.ipc.ts` | Map للطلبات النشطة |
| 3.2 | `purchases.ipc.ts` | نفس التحسين |
| 3.3 | `POSPage.tsx` | Request Deduplication Map |

### المرحلة 4: Database Constraints (يوم 5)

| المهمة | الملف | الوصف |
|--------|-------|-------|
| 4.1 | `accounting.schema.ts` | UNIQUE على `(reference_type, reference_id)` |
| 4.2 | `finance.schema.ts` | UNIQUE على `(invoice_id, party_type)` |
| 4.3 | Triggers | منع تعديل/حذف الفواتير المؤكدة |

### المرحلة 5: Audit Trail (يوم 6-7)

| المهمة | الملف | الوصف |
|--------|-------|-------|
| 5.1 | `audit_log` | إضافة `idempotency_key` و `request_hash` |
| 5.2 | `sales.ipc.ts` | تسجيل Hash Chain |
| 5.3 | `purchases.ipc.ts` | نفس التحسين |

---

## 12. الخلاصة

### ما تم تنفيذه حالياً ✅

| الطبقة | الحالة |
|--------|--------|
| Frontend: Atomic Check-and-Set | ✅ مُنفّذ |
| Frontend: Duplicate toast | ✅ مُنفّذ |
| Backend: UNIQUE constraint على session_id | ✅ موجود |
| Backend: اعتراض UNIQUE constraint | ✅ مُنفّذ |
| Backend: إرجاع duplicate response | ✅ مُنفّذ |

### ما يحتاج تنفيذ ❌

| الطبقة | الأولوية |
|--------|---------|
| جدول idempotency_keys | 🔴 حرج |
| Single-Flight Pattern | 🔴 حرج |
| UNIQUE على journal_entries | 🔴 حرج |
| Triggers منع التعديل | 🟠 كبير |
| Hash Chain | 🟡 متوسط |
| State Machine | 🟡 متوسط |

### أفضل ممارسة عالمية

في أنظمة ERP الاحترافية (SAP, Oracle, Microsoft Dynamics):

1. **Idempotency Key** في كل طلب مالي
2. **Single-Flight Pattern** في الـ Backend
3. **UNIQUE Constraints** على كل المفاتيح
4. **Triggers** لمنع التعديل على المؤكد
5. **Audit Trail** مع Hash Chain
6. **State Machine** واضحة لكل وثيقة
7. **Transaction Isolation** بمستوى IMMEDIATE
8. **لا تعديل** على الوثائق المؤكدة - فقط إلغاء + جديد
