# 🏗️ Bolbul ERP — Multi-Agent Engineering System

نظام وكلاء ذكاء اصطناعي تعاوني لمشروع Spare Parts ERP.

## الوكلاء (Agents)

| الوكيل | الدور | الشخصية |
|--------|-------|---------|
| 🔷 **Atlas** | المعماري (System Architect) | صارم، حكيم، يحرس البنية الأساسية. يرفض التغييرات الجذرية. |
| 🔶 **Raz** | خبير البيانات (SQLite Expert) | مدقق أمني، مهووس بسلامة SQL. لا يرحم أي string interpolation. |
| 🟢 **Echo** | المبرمج (Implementation Engineer) | سريع، نشيط، يكتب كود نظيف. يحترم Atlas ويتعاون مع Raz. |
| 🟣 **Arya** | المراجع (QA & UX Reviewer) | نقدية لكن عادلة. عين صقر للتفاصيل البصرية وRTL. |

## كيف يعمل التعاون (Workflow)

```
المهمة → Atlas (مراجعة معمارية)
         ↓ + سياق متراكم
        Raz (مراجعة بيانات)
         ↓ + سياق متراكم
        Echo (تنفيذ الحل)
         ↓ + اقتراح Echo
        Arya (مراجعة الجودة)
         ↓
       تقرير نهائي
```

كل وكيل يرى ردود الوكلاء السابقين، مما يخلق **تراكم معرفة حقيقي**.

## الملفات

```
.agents/
├── run.py              # نقطة التشغيل الرئيسية
├── src/
│   └── agents.py       # تعريف الوكلاء + محرك LLM + الـ Workflow
├── .env.example        # مثال لملف البيئة
├── last_report.md      # آخر تقرير (يُنشأ تلقائياً)
└── .memory_*.json      # ذاكرة كل وكيل (تُنشأ تلقائياً)
```

## التشغيل

### 1. إعداد البيئة

```bash
cd .agents
python -m venv venv
venv\Scripts\activate       # Windows
# أو: source venv/bin/activate   # Linux/Mac
```

### 2. ضبط API Key

**الخيار A** — متغير بيئة:
```bash
export OPENAI_API_KEY=your-key-here
export OPENAI_BASE_URL=https://api.openai.com/v1   # أو أي مزود متوافق
export AGENT_MODEL=gpt-4o-mini
```

**الخيار B** — ملف .env:
```bash
cp .env.example .env
# عدّل .env وأضف مفتاحك
```

**الخيار C** — استخدام إعدادات Hermes (تلقائي):
إذا كان Hermes مُعداً على جهازك، سيقرأ النظام المفاتيح تلقائياً من:
`~/AppData/Local/hermes/config.yaml`

### 3. التشغيل

```bash
# مع مهمة كمعامل:
python run.py "أضف جدول الموردين مع التأكد من IPC whitelist"

# أو تفاعلياً:
python run.py
# ثم أدخل المهمة عند الطلب
```

## الذاكرة (Memory)

كل وكيل لديه **ذاكرة مستقلة** تُخزن في `.memory_<name>.json`:
- يتذكر المهام السابقة التي عمل عليها
- يستخدم هذه الذاكرة لتحسين ردوده
- الذاكرة تتراكم عبر الجلسات

## التخصيص

### إضافة وكيل جديد

في `src/agents.py`:

```python
NEW_AGENT = Agent(
    name="Name",
    role="الدور بالعربي",
    personality="""وصف الشخصية بالعربي...""",
    backstory="""القصة الخلفية...""",
    goal="الهدف الرئيسي",
    constraints=["قيد 1", "قيد 2"]
)

# ثم أضفه لـ TEAM:
TEAM = [ATLAS, ECHO, RAZ, ARYA, NEW_AGENT]
```

### تعديل الـ Workflow

الـ workflow الحالي تسلسلي: Atlas → Raz → Echo → Arya.
يمكنك تعديل دالة `run_workflow()` لتغيير الترتيب أو إضافة خطوات متوازية.

## مثال على مهمة

```bash
python run.py "واجهة جرد المخزون لا تعرض filler rows عند وجود 0 منتج"
```

النتيجة:
- **Atlas**: يحلل تأثير التغيير على البنية
- **Raz**: يتأكد أن لا تغييرات في قاعدة البيانات مطلوبة
- **Echo**: يقترح تعديل overflow-y-hidden إلى overflow-y-auto وإصلاح شرط filler
- **Arya**: تراجع أن التغيير يعمل في الوضعين الفاتح والداكن ويحترم RTL

## القيود

- يعمل مع أي OpenAI-compatible API (OpenAI, OpenRouter, Ollama, إلخ)
- لا يحتاج crewAI أو LangChain (نظام خفيف مبني من الصفر)
- يعتمد على Python stdlib + urllib (لا numpy، لا compilation)
- كل استجابة محفوظة في `last_report.md` للرجوع إليها
