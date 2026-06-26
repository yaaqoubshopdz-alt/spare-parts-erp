/**
 * AI IPC Handlers — SparePartsERP
 * جميع قنوات الذكاء الاصطناعي مسجّلة هنا.
 * يعمل في Main Process فقط — API Keys لا تُكشف للـ Renderer أبداً.
 *
 * القنوات:
 *  ai:getConfig          — جلب إعدادات AI الحالية
 *  ai:saveConfig         — حفظ المزود + المفتاح + النموذج
 *  ai:testConnection     — اختبار الاتصال مع قياس الزمن
 *  ai:chat               — دردشة تفاعلية (مع سياق المحل تلقائياً)
 *  ai:analyze            — تحليل شامل للمحل يُرجع JSON توصيات
 *  ai:getHistory         — جلب تاريخ المحادثة
 *  ai:clearHistory       — مسح التاريخ
 *  ai:exportContext      — تصدير بيانات المحل للوضع اليدوي
 *  ai:parseInvoiceImage  — قراءة فاتورة من صورة (OCR بالذكاء الاصطناعي)
 *  ai:extractFitments    — استخراج توافقات المركبات من نص أو صورة
 */
import { ipcMain, app } from 'electron';
import fs from 'fs';
import path from 'path';
import { DatabaseService } from '../services/database.service';
import { AIService, AIConfig, AIMessage } from '../services/ai.service';
import { DataHarvesterService } from '../services/data-harvester.service';

// ─── Constants ─────────────────────────────────────────────────────────────────

const SETTINGS_KEYS = {
  mode:         'ai_mode',
  provider:     'ai_provider',
  apiKey:       'ai_api_key',          // legacy key (fallback)
  geminiKey:    'ai_gemini_api_key',   // مفتاح Gemini المنفصل
  openaiKey:    'ai_openai_api_key',   // مفتاح OpenAI المنفصل
  nvidiaKey:    'ai_nvidia_api_key',   // مفتاح NVIDIA NIM المنفصل
  compatKey:    'ai_compat_api_key',   // مفتاح OpenAI-Compatible المنفصل
  model:        'ai_model',
  baseUrl:      'ai_base_url',
  lastAnalysis: 'ai_last_analysis',
  chatHistory:  'ai_chat_history',
} as const;

// خريطة المزود ← اسم مفتاح الإعداد في قاعدة البيانات
const PROVIDER_KEY_MAP: Record<string, string> = {
  gemini:             SETTINGS_KEYS.geminiKey,
  openai:             SETTINGS_KEYS.openaiKey,
  nvidia:             SETTINGS_KEYS.nvidiaKey,
  'openai-compatible': SETTINGS_KEYS.compatKey,
};

const MAX_CHAT_HISTORY = 50;   // أقصى عدد رسائل محفوظة
const MAX_CONTEXT_CHARS = 12_000; // أقصى حجم للـ context لتوفير الـ tokens

// ─── Helpers ───────────────────────────────────────────────────────────────────

function getSetting(key: string): string {
  const db = DatabaseService.getRawDb();
  const row = db.prepare('SELECT value FROM app_settings WHERE key = ?').get(key) as any;
  return row?.value ?? '';
}

function saveSetting(key: string, value: string): void {
  const db = DatabaseService.getRawDb();
  const exists = db.prepare('SELECT count(*) as c FROM app_settings WHERE key = ?').get(key) as any;
  if (exists.c > 0) {
    db.prepare("UPDATE app_settings SET value = ?, updated_at = datetime('now') WHERE key = ?").run(value, key);
  } else {
    db.prepare("INSERT INTO app_settings (key, value, type, updated_at) VALUES (?, ?, 'json', datetime('now'))").run(key, value);
  }
}

/** يقرأ إعداد المزود الحالي مع مفتاحه المنفصل */
function loadAIConfig(): AIConfig | null {
  const provider = getSetting(SETTINGS_KEYS.provider) as AIConfig['provider'];
  if (!provider) return null;
  // اقرأ المفتاح الخاص بالمزود أولاً، ثم تراجع للمفتاح القديم الموحّد
  const keySettingName = PROVIDER_KEY_MAP[provider] || SETTINGS_KEYS.apiKey;
  const apiKey = getSetting(keySettingName) || getSetting(SETTINGS_KEYS.apiKey);
  if (!apiKey) return null;
  return {
    provider,
    apiKey,
    model:   getSetting(SETTINGS_KEYS.model) || undefined,
    baseUrl: getSetting(SETTINGS_KEYS.baseUrl) || undefined,
  };
}

/** يبني AIConfig لمزود معيّن (لآلية الـ fallback) */
function loadAIConfigForProvider(provider: AIConfig['provider']): AIConfig | null {
  const keySettingName = PROVIDER_KEY_MAP[provider] || SETTINGS_KEYS.apiKey;
  const apiKey = getSetting(keySettingName) || getSetting(SETTINGS_KEYS.apiKey);
  if (!apiKey) return null;
  return { provider, apiKey };
}

function loadChatHistory(): AIMessage[] {
  try {
    const raw = getSetting(SETTINGS_KEYS.chatHistory);
    if (!raw) return [];
    return JSON.parse(raw) as AIMessage[];
  } catch {
    return [];
  }
}

function saveChatHistory(history: AIMessage[]): void {
  // احتفظ بآخر MAX_CHAT_HISTORY رسالة فقط
  const trimmed = history.slice(-MAX_CHAT_HISTORY);
  saveSetting(SETTINGS_KEYS.chatHistory, JSON.stringify(trimmed));
}

function getProductPrimaryImageBase64(productId: number): { base64: string; mimeType: string } | null {
  try {
    const raw = DatabaseService.getRawDb();
    const img = raw.prepare(`
      SELECT file_path FROM product_images 
      WHERE product_id = ? 
      ORDER BY is_primary DESC, id ASC 
      LIMIT 1
    `).get(productId) as { file_path: string } | undefined;

    if (!img) return null;

    const baseDir = path.join(app.getPath('userData'), 'SparePartsERP');
    const filePath = path.join(baseDir, 'product_images', img.file_path);

    if (!fs.existsSync(filePath)) return null;

    const fileData = fs.readFileSync(filePath);
    const base64 = fileData.toString('base64');
    const ext = path.extname(img.file_path).toLowerCase().replace('.', '');
    const mimeType = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';

    return { base64, mimeType };
  } catch (err) {
    console.warn('[AI IPC] Helper getProductPrimaryImageBase64 error:', err);
    return null;
  }
}

function getAllProductImagesBase64(productId: number): { base64: string; mimeType: string }[] {
  try {
    const raw = DatabaseService.getRawDb();
    const imgs = raw.prepare(`
      SELECT file_path FROM product_images 
      WHERE product_id = ? 
      ORDER BY is_primary DESC, id ASC
    `).all(productId) as { file_path: string }[];

    if (!imgs || imgs.length === 0) return [];

    const baseDir = path.join(app.getPath('userData'), 'SparePartsERP');
    const result: { base64: string; mimeType: string }[] = [];

    for (const img of imgs) {
      const filePath = path.join(baseDir, 'product_images', img.file_path);
      if (fs.existsSync(filePath)) {
        const fileData = fs.readFileSync(filePath);
        const base64 = fileData.toString('base64');
        const ext = path.extname(img.file_path).toLowerCase().replace('.', '');
        const mimeType = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
        result.push({ base64, mimeType });
      }
    }
    return result;
  } catch (err) {
    console.warn('[AI IPC] Helper getAllProductImagesBase64 error:', err);
    return [];
  }
}

function resolveMessageImages(messages: AIMessage[]): AIMessage[] {
  return messages.map((m) => {
    let resolvedImage = m.image;
    let resolvedImages = m.images;

    if (m.image?.base64 && m.image.base64.startsWith('http://localhost:8766/images/')) {
      try {
        const filename = decodeURIComponent(m.image.base64.split('/images/')[1]);
        const baseDir = path.join(app.getPath('userData'), 'SparePartsERP');
        const filePath = path.join(baseDir, 'product_images', filename);
        if (fs.existsSync(filePath)) {
          const fileData = fs.readFileSync(filePath);
          const base64 = fileData.toString('base64');
          resolvedImage = {
            ...m.image,
            base64,
          };
        }
      } catch (err) {
        console.warn('[AI IPC] Failed to resolve message image URL to base64:', err);
      }
    }

    if (m.images && m.images.length > 0) {
      resolvedImages = m.images.map((img) => {
        if (img.base64 && img.base64.startsWith('http://localhost:8766/images/')) {
          try {
            const filename = decodeURIComponent(img.base64.split('/images/')[1]);
            const baseDir = path.join(app.getPath('userData'), 'SparePartsERP');
            const filePath = path.join(baseDir, 'product_images', filename);
            if (fs.existsSync(filePath)) {
              const fileData = fs.readFileSync(filePath);
              const base64 = fileData.toString('base64');
              return {
                ...img,
                base64,
              };
            }
          } catch (err) {
            console.warn('[AI IPC] Failed to resolve message images URL to base64:', err);
          }
        }
        return img;
      });
    }

    return {
      ...m,
      image: resolvedImage,
      images: resolvedImages,
    };
  });
}

function buildSystemPrompt(contextText: string): AIMessage {
  const shopName = contextText.includes('المحل:')
    ? contextText.split('المحل:')[1]?.split('|')[0]?.trim() || 'المحل'
    : 'المحل';

  return {
    role: 'system',
    content: `أنت "مستشار الأعمال الاستراتيجي الذكي والخبير الفني" لـ ${shopName}، المتخصص في قطاع غيار السيارات والتسويق والتجارة.

## شخصيتك وأسلوبك:
- تتحدث بالعربية بشكل افتراضي، وتتكيف مع لغة المستخدم (فرنسية/إنجليزية عند الحاجة).
- خبير فني عميق في قطع غيار السيارات: تعرف الأجزاء والأعطال والتوافقات.
- محلل أعمال ذكي: تستطيع قراءة أرقام المبيعات وتقديم توصيات استراتيجية.
- مسوّق محترف: تصوغ منشورات إعلانية مقنعة وتوصيات تسعيرية.
- صادق ودقيق: لا تخترع أرقاماً، تستخدم الأدوات دائماً للتحقق من البيانات الفعلية.

## مهارات الاستعلام عن قاعدة البيانات (Database Skills):
إذا سألك المستخدم عن منتج معين، أو ديون شخص محدد، أو مخزون قطعة غيار، أو تقرير مبيعات مفصل، أو رغبة في عمل تصميم/تسويق لمنتج، أو تحسين صورة أو توليد موجهات فيديو للمنتج، يمكنك استخدام الأدوات التالية للحصول على المعلومات بدقة.
للقيام بذلك، اكتب نداء الأداة بالشكل التالي وتوقف فوراً عن الكتابة دون إضافة أي نص آخر:
\`\`\`tool
اسم_الأداة(اسم_الوسيط: "القيمة")
\`\`\`

الأدوات المدعومة:
- \`search_products(query: string)\`: للبحث عن منتج في المخزون (بالعربية أو الإنجليزية، يبحث في الاسم والرمز والباركود وتوافق السيارات).
- \`get_product_detail(id: number)\`: للحصول على تفاصيل كاملة لمنتج معين (التوافق الدقيق للمركبات، الأسعار بالتفصيل، المخزون التفصيلي).
- \`search_parties(query: string)\`: للبحث عن زبون أو مورد والحصول على رصيد ديونه الحالي.
- \`get_sales_report(days: number)\`: للحصول على تقرير مبيعات مفصل ومؤشرات الأرباح لآخر N يوم (افتراضياً 30).
- \`check_zero_stock_products(date_from: string, date_to: string)\`: للبحث والتفقد عن عدد وتفاصيل المنتجات التي مخزونها صفر في فترة زمنية معينة (صيغة التاريخ YYYY-MM-DD). يُرجع عدد المنتجات الصفرية وقائمة بأول 10 منتجات.
- \`generate_product_marketing(id: number)\`: لتحليل صورة وتفاصيل منتج معين بالذكاء الاصطناعي وتوليد موجهات (Prompts) بالإنجليزية لتوليد صور تسويقية وبانرات احترافية للمنتج، مع صياغة منشور إعلاني متميز وطرق الترويج الفعالة له.
- \`generate_product_image_prompts(id: number)\`: لتحليل صورة وتفاصيل منتج معين وتوليد موجهات صور وفيديو (Image & Video Prompts) بالإنجليزية لتوليد لقطات استوديو ومقاطع سينمائية لعرض المنتج مع حلول الدعم الفيزيائي والخلفيات الاحترافية الداكنة.

## قواعد هامة للأوامر الحساسة وأمن البيانات (Data Safety & Confirmations):
إذا طلب منك المستخدم أي تعديل أو حذف للمخزون أو المنتجات (مثل "حذف المنتجات الصفرية"، "إخفاء المنتجات الصفرية"، أو "حذف منتج معين"):
1. لا تنفذ التعديل أو الحذف من جانبك في رد الدردشة، ولا تقل للمستخدم "تم الحذف/الإخفاء".
2. قم بالبحث أولاً والتحقق من المنتجات (مثلاً استعلم بأداة check_zero_stock_products عن المنتجات الصفرية أو بأداة search_products عن منتج معين).
3. اعرض تفاصيل ما وجدته واطلب تأكيداً صريحاً من المستخدم للقيام بالإجراء.
4. أرفق في نهاية إجابتك مباشرة كتلة كود (code block) خاصة بالصيغة التالية (JSON) حتى يتمكن البرنامج من عرض أزرار التأكيد التفاعلية للمستخدم:
   - لعملية إخفاء أو حذف المنتجات الصفرية كلياً:
     \`\`\`action_confirmation
     {
       "action": "zero_stock_operation",
       "operation": "hide" أو "delete",
       "count": عدد_المنتجات_التي_وجدت,
       "date_from": "YYYY-MM-DD" (إن وجدت أو سلسلة فارغة),
       "date_to": "YYYY-MM-DD" (إن وجدت أو سلسلة فارغة)
     }
     \`\`\`
   - لعملية حذف منتج واحد محدد:
     \`\`\`action_confirmation
     {
       "action": "delete_product",
       "product_id": معرف_المنتج,
       "name": "اسم المنتج"
     }
     \`\`\`

## مخرج الصور والفيديوهات التفاعلي (Interactive Prompt Builder Wizard):
إذا طلب المستخدم "تصميم موجه تحسين صورة خطوة بخطوة" أو ضغط على زر "احصل على برومبت تحسين الصورة" التفاعلي:
1. **المرونة والملاءمة التامة للمنتج**: يجب عليك تحليل طبيعة المنتج المعروض (مثال: هل هو قطعة غيار ميكانيكية خشنة، أم معطر جو منعش، أم منظف سيارات سائل، أم جهاز إلكتروني دقيق؟). بناءً على هذا التحليل، **قم بتوليد خيارات ديناميكية ومخصصة بالكامل (من 5 إلى 6 خيارات)** تناسب فكرة المنتج واستخدامه وتبرز جمالياته بأفضل شكل تسويقي، بدلاً من استخدام خيارات عامة أو غير ملائمة.
2. **الخطوة الأولى: نمط الخلفية**: اقترح على المستخدم من 5 إلى 6 خيارات خلفية ذكية ومناسبة جداً ومخصصة لهوية المنتج وصورته:
   - *مثال لمعطر الجو*: (حقل زهور برية، حمام عصري دافئ ومشرق، صالون بيت نظيف بنوافذ زجاجية مشمسة، نسيم طبيعة غبشاء، استوديو منعش بألوان هادئة).
   - *مثال لقطعة غيار معدنية*: (لوح حجر أردواز خشن، طاولة ورشة هندسية راقية مع مخططات، زجاج داكن عاكس مصقول، سطح ألياف كربونية داكنة، استوديو كتالوج رمادي داكن فخم).
   قدّم هذه الخيارات المخصصة بتنسيق وسم الخيارات التالي تماماً:
   :::choices{"type":"background","options":[{"label":"الخلفية الأولى المقترحة","value":"bg_1"},{"label":"الخلفية الثانية المقترحة","value":"bg_2"},...]}:::
3. **الخطوة الثانية: نمط الإضاءة**: بعد أن يختار الخلفية، اسأله عن نمط الإضاءة المطلوب واقترح عليه من 5 إلى 6 خيارات إضاءة مناسبة للمنتج والخلفية المختارة (مثال: إضاءة شمس دافئة وطبيعية، إضاءة استوديو ساطعة ونظيفة، إضاءة جانبية درامية لإبراز اللمعان المعدني، إلخ) وقدم الخيارات بالتنسيق التالي:
   :::choices{"type":"lighting","options":[{"label":"نمط الإضاءة الأول","value":"light_1"},{"label":"نمط الإضاءة الثاني","value":"light_2"},...]}:::
4. **الخطوة الثالثة: زاوية الكاميرا**: اسأله عن زاوية التصوير المفضلة واقترح عليه من 5 إلى 6 خيارات (مثال: لقطة بطل 45 درجة، لقطة علوية مسطحة، لقطة أمامية مباشرة، لقطة ماكرو تفصيلية للملمس، لقطة من زاوية منخفضة لإعطاء هيبة للمنتج، إلخ) وقدم الخيارات بالتنسيق التالي:
   :::choices{"type":"angle","options":[{"label":"الزاوية الأولى","value":"ang_1"},{"label":"الزاوية الثانية","value":"ang_2"},...]}:::
5. **الخطوة الرابعة: الغرض والتوليد**: اسأله عن الغرض الأساسي لتوليد البرومبت النهائي واقترح خيارات مثل (إعلان سوشيال ميديا ممول، متجر إلكتروني رسمي، بانر إعلاني كبير، كتالوج مطبوع، إلخ) بالتنسيق التالي:
   :::choices{"type":"goal","options":[{"label":"الغرض الأول","value":"goal_1"},{"label":"الغرض الثاني","value":"goal_2"},...]}:::
   بعد اختيار الغرض، **يجب عليك إجبارياً توليد وعرض موجهات الصور النهائية (Midjourney و DALL-E 3 و Stable Diffusion XL) بداخل كتلة كود واحدة منسقة ومفصلة بصيغة JSON قابلة للنسخ المباشر**، بحيث تكون على النحو التالي تماماً (دون أي نص خارجي غير مفسر بداخل الكود):
   \`\`\`json
   {
     "Midjourney": "البرومبت البصري بالإنجليزية لـ Midjourney بلقطة موحدة وتفاصيل دقيقة",
     "DALL-E 3": "البرومبت البصري بالإنجليزية لـ DALL-E 3 بلقطة موحدة وتفاصيل دقيقة",
     "Stable Diffusion XL": {
       "Positive Prompt": "البرومبت الإيجابي بالإنجليزية لـ SDXL",
       "Negative Prompt": "البرومبت السلبي بالإنجليزية لاستبعاد التشوهات والتفاصيل الغريبة"
     }
   }
   \`\`\`
6. **الخطوة الخامسة: عرض ترقية الفيديو (Video Promotion Option)**: بعد عرض موجهات الصور النهائية، اسأله فوراً: *"هل ترغب في توليد فيديو ترويجي إعلاني سينمائي للمنتج أيضاً؟"* وأرفق خيارين فقط:
   :::choices{"type":"video_opt","options":[{"label":"نعم، أريد فيديو إعلاني","value":"yes_video"},{"label":"لا، شكراً لك","value":"no_video"}]}:::
7. **الخطوة السادسة: حركة كاميرا الفيديو**: إذا أجاب بنعم، اسأله عن حركة الكاميرا المفضلة للفيديو واقترح عليه من 5 إلى 6 خيارات حركة ملائمة للمنتج (مثال: دوران دائري بطيء 360، زووم تدريجي ناعم، حركة أفقية انسيابية، تقريب ماكرو، حركة طيران كاميرا درونز حول المنتج، إلخ):
   :::choices{"type":"video_movement","options":[{"label":"الحركة الأولى","value":"mov_1"},{"label":"الحركة الثانية","value":"mov_2"},...]}:::
   بعدها، اطلب منه كتابة أي نص يريد إظهاره على الفيديو (أو الإجابة بـ "لا يوجد")، ثم **يجب عليك إجبارياً توليد وعرض موجه حركة الفيديو النهائي وسيناريو المشاهد بالتفصيل بداخل كتلة كود واحدة منسقة بصيغة JSON قابلة للنسخ المباشر**، بحيث تتضمن المشاهد بالتفصيل:
   \`\`\`json
   {
     "Video Prompts": {
       "Runway Gen-3": "موجه حركة الفيديو الإنجليزي لـ Runway",
       "Luma Dream Machine": "موجه حركة الفيديو الإنجليزي لـ Luma",
       "Sora": "موجه حركة الفيديو الإنجليزي لـ Sora"
     },
     "Scenes Scenario": [
       {
         "Scene Number": 1,
         "Description": "وصف المشهد باللغة العربية بالتفصيل",
         "Visual Prompt": "الموجه البصري الإنجليزي للمشهد بالتفصيل",
         "Camera Movement": "حركة الكاميرا المحددة للمشهد",
         "On Screen Text": "النص المعروض على الشاشة إن وجد"
       }
     ]
   }
   \`\`\`

ملاحظة هامة جداً: لا تعرض كافة الأسئلة دفعة واحدة. اسأل سؤالاً واحداً فقط في كل رد، وانتظر اختيار المستخدم أو رده قبل الانتقال للسؤال التالي. تذكر دائماً إدراج وسم :::choices{...}::: في نهاية ردك ليعرضه البرنامج كأزرار تفاعلية. يُمنع تماماً عرض الموجهات النهائية كنصوص عادية أو خارج كتل الكود البرمجية المحددة بصيغة JSON.

## قواعد هامة لاستجابات تحسين الصور والفيديوهات (Image & Video Prompting):
إذا طلب المستخدم "برومبت تحسين الصورة" أو "توليد موجه (Prompt) لتحسين الصور المرفوعة" أو "موجهات للفيديو" (سواء استعنت بأداة generate_product_image_prompts أو أجبت مباشرة في حالة رفع صور حرة بدون معرّف منتج)، يجب أن تولد فقط الـ JSON الخاص بالـ Prompts وموجهات الفيديو وتحليل الشكل والخلفية.
القواعد الفنية الإلزامية:
1. **تحليل الصور المتعددة وصورة البطل الموحدة**: إذا أرفق المستخدم عدة صور للمنتج، يجب عليك دراستها وتحليلها معاً لفهم تفاصيل القطعة بالكامل، ولكن عند صياغة أي موجه، يجب أن تصف صورة واحدة موحدة من زاوية واحدة ممتازة وجذابة للقطعة (Best Hero Angle / Single View). يُمنع منعاً باتاً صياغة موجهات تصف صورتين أو تقسم الشاشة أو تقارن بين زوايا مختلفة في نفس الصورة (مثل: side-by-side, split-screen, collage, diptych, before/after, dual angles). تأكد من إضافة عبارات واضحة للموجه الإنجليزي تمنع التقسيم مثل: "single unified shot of one product, single angle view, no split screen, no side-by-side views, single camera capture".
2. **توليد موجهات الفيديو الاحترافية (Video Prompts)**: يجب عليك دائماً تضمين موجه فيديو احترافي (video_prompt) باللغة الإنجليزية في الـ JSON، يصف حركة كاميرا ثلاثية الأبعاد سينمائية (مثل دوران 360 درجة بطيء أو تقريب زووم ناعم أو حركة بانورامية) لعرض تفاصيل القطعة على الخلفية الداكنة المختارة بجودة عالية (Runway / Luma / Sora) ودون تشوهات أو وجود أيدٍ بشرية أو أثاث.
3. **الخلفية الاحترافية الفخمة المتنوعة دون إجبار**: يجب اختيار خلفية استوديو احترافية فخمة وداكنة (مثل: سطح زجاجي أسود عاكس، لوح حجر داكن، أو سطح خرساني رمادي داكن ناعم، أو طاولة عمل خشبية مصقولة)، وذلك بناءً على ما يناسب طبيعة ومادة ومظهر القطعة. يُمنع منعاً باتاً إجبار الذكاء الاصطناعي على الخلفية الجلدية لتجنب توليد أثاث أو كراسي أو مساند سيارات بدلاً من الاستوديو. يجب أن يتركز الوصف البصري بنسبة 90% على **تفاصيل المنتج نفسه وبنيته الهندسية ومعدنه**، بينما تكون الخلفية بسيطة ومحايدة ومسطحة تماماً ولا تطغى على المنتج.
4. **تجنب الخلفيات البيضاء للمنتجات المعدنية (قاعدة التباين الفخم - Luxury Contrast Rule)**: يُمنع تماماً استخدام الخلفيات البيضاء أو الرمادية الباهتة (Avoid plain white background / isolated on white) للقطع المعدنية (مثل المكابس والمساعدين وأي أجزاء ميكانيكية لامعة) لمنع بهتان التفاصيل واللمعان.
5. **منع الخلط**: يُمنع منعاً باتاً صياغة أي شعارات تسويقية، أو منشورات سوشيال ميديا إعلانية، أو خطط ترويجية، أو تحديد جمهور مستهدف في هذا الطلب، فهذه الأمور تندرج تحت أداة التسويق generate_product_marketing وليست موجهات الصور والفيديو.
6. **اللغة والاستبعاد**: تأكد أن جميع موجهات الصور والفيديوهات (Midjourney/DALL-E/Stable Diffusion/Runway/Luma/Sora) مكتوبة باللغة الإنجليزية حصراً وتلتزم بالـ Schema المطلوبة تماماً مع إضافة كلمات استبعاد في الـ negative prompt لمنع توليد الكراسي والأثاث والعناصر البشرية (مثل: chair, seat, sofa, furniture, car seat, car interior, hands, fingers, person, human).

ملاحظة هامة: لا تخترع أرقاماً أو أسعاراً لمنتجات غير موجودة في السياق، بل استخدم الأدوات للتحقق دائماً.

## بيانات المحل الحالية للاستفادة منها عند الحاجة:
${contextText.substring(0, MAX_CONTEXT_CHARS)}`,
  };
}

// ─── compileFTS5Query Helper ────────────────────────────────────────────────
function compileFTS5Query(query: string, operator: 'AND' | 'OR' = 'AND'): string {
  if (!query) return '';
  // Normalize Arabic (أ، إ، آ -> ا) and (ة -> ه) and strip diacritics
  let normalized = query
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/[\u064B-\u0652]/g, '') // strip diacritics
    .toLowerCase()
    .trim();

  // Brand spelling corrections (Arabic typos)
  normalized = normalized
    .replace(/\b(مايلو|فايلو|فالو|فالييو)\b/g, 'فاليو')
    .replace(/\b(بوشش|بوص)\b/g, 'بوش')
    .replace(/\b(بريمو|برمبو|برميو)\b/g, 'بريمبو')
    .replace(/\b(قيتس|قاتس|قيتز|جيتز)\b/g, 'جيتس')
    .replace(/\b(طوطال)\b/g, 'توتال')
    .replace(/\b(نجك|نجكي|انجي كي)\b/g, 'ngk')
    .replace(/\b(ديلفي|دلفي)\b/g, 'delphi')
    .replace(/\b(سيمبول|سمبول)\b/g, 'symbol');

  // Construct state typos (ت -> ه)
  normalized = normalized
    .replace(/\bمضخت\b/g, 'مضخه')
    .replace(/\bطرمبت\b/g, 'طرمبه')
    .replace(/\bجلدت\b/g, 'جلده')
    .replace(/\bعلبت\b/g, 'علبه')
    .replace(/\bصفيت\b/g, 'صفيه')
    .replace(/\bشمعت\b/g, 'شمعة');

  const words = normalized.split(/[\s,\.\-\_\/\\\(\)\{\}\[\]\+]+/);
  const filteredWords = words
    .map(w => w.trim())
    .filter(w => w.length > 0);

  // Common Arabic, French, and English stop words used in search queries
  const stopWords = new Set([
    // Arabic
    'اريد', 'أريد', 'حبيت', 'اعطيني', 'أعطيني', 'عطيني', 'الموجوده', 'الموجودة', 'موجود', 
    'موجودة', 'موجوده', 'في', 'من', 'على', 'يا', 'التي', 'الذي', 'تاع', 'تع', 'دي', 
    'سلعه', 'سلعة', 'سلع', 'قطعه', 'قطعة', 'قطع', 'غيار', 'المخزن', 'المخزون', 'هات', 
    'جيب', 'الموجودين', 'اي', 'أى', 'شيء', 'شئ', 'شي', 'حاجة', 'حاجه', 'كل', 'الكل', 
    'كامل', 'جميع', 'وريلي', 'ابحث', 'البحث', 'عن', 'لقيلي', 'لقالي', 'لقى', 'حوس', 
    'تحوس', 'نحوس', 'ابحثلي', 'ابحث لي', 'معليش', 'بلازما', 'لوكان', 'كانش', 'كاين', 'كاينش',
    // French
    'je', 'veux', 'les', 'des', 'le', 'la', 'qui', 'sont', 'en', 'dans', 'stock',
    'disponible', 'disponibles', 'un', 'une', 'pour', 'de', 'd', 'avec', 'produit', 'produits',
    // English
    'i', 'want', 'the', 'a', 'an', 'some', 'any', 'in', 'on', 'at', 'stock',
    'available', 'present', 'products', 'items', 'for', 'with', 'of', 'product'
  ]);

  const coreWords = filteredWords.filter(w => !stopWords.has(w));
  const wordsToUse = coreWords.length > 0 ? coreWords : filteredWords;

  const ftsWords = wordsToUse.map(w => {
    if (w.length <= 2) {
      return `${w}*`;
    }
    if (w.startsWith('ال')) {
      const stripped = w.substring(2);
      if (stripped.length > 1) {
        return `(${w}* OR ${stripped}*)`;
      }
    } else {
      return `(${w}* OR ال${w}*)`;
    }
    return `${w}*`;
  });

  return ftsWords.join(` ${operator} `);
}

// ─── Register All Handlers ─────────────────────────────────────────────────────

export function registerAIIPC(): void {

  // ─── ai:getConfig ────────────────────────────────────────────────────────

  ipcMain.handle('ai:getConfig', () => {
    try {
      const maskKey = (k: string) =>
        k.length > 4 ? '•'.repeat(k.length - 4) + k.slice(-4) : k;

      const mode     = getSetting(SETTINGS_KEYS.mode) || 'manual';
      const provider = getSetting(SETTINGS_KEYS.provider) || '';
      const model    = getSetting(SETTINGS_KEYS.model) || '';
      const baseUrl  = getSetting(SETTINGS_KEYS.baseUrl) || '';

      // كل مزود له مفتاحه الخاص المحفوظ بشكل منفصل
      const geminiRaw = getSetting(SETTINGS_KEYS.geminiKey) || getSetting(SETTINGS_KEYS.apiKey) || '';
      const nvidiaRaw = getSetting(SETTINGS_KEYS.nvidiaKey) || '';
      const openaiRaw = getSetting(SETTINGS_KEYS.openaiKey) || '';
      const compatRaw = getSetting(SETTINGS_KEYS.compatKey) || '';

      // المفتاح الحالي للعرض (حسب المزود النشط)
      const currentProviderKey = (() => {
        if (provider === 'gemini') return geminiRaw;
        if (provider === 'nvidia') return nvidiaRaw;
        if (provider === 'openai') return openaiRaw;
        if (provider === 'openai-compatible') return compatRaw;
        return geminiRaw;
      })();

      return {
        success: true,
        data: {
          mode, provider, model, baseUrl,
          maskedKey: maskKey(currentProviderKey),
          hasKey: currentProviderKey.length > 0,
          // حالة كل مزود بشكل منفصل
          gemini:  { maskedKey: maskKey(geminiRaw), hasKey: geminiRaw.length > 0 },
          nvidia:  { maskedKey: maskKey(nvidiaRaw), hasKey: nvidiaRaw.length > 0 },
          openai:  { maskedKey: maskKey(openaiRaw), hasKey: openaiRaw.length > 0 },
          compat:  { maskedKey: maskKey(compatRaw),  hasKey: compatRaw.length > 0 },
        },
      };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

  // ─── ai:saveConfig ───────────────────────────────────────────────────────

  ipcMain.handle('ai:saveConfig', (_e, payload: {
    mode: string;
    provider: string;
    apiKey?: string;  // undefined يعني "لا تغيّر المفتاح الحالي"
    model?: string;
    baseUrl?: string;
  }) => {
    try {
      saveSetting(SETTINGS_KEYS.mode, payload.mode || 'manual');
      saveSetting(SETTINGS_KEYS.provider, payload.provider || '');
      if (payload.apiKey !== undefined && payload.apiKey !== '') {
        // احفظ المفتاح في slot المزود الخاص به — لا تُلوّث مفاتيح المزودين الآخرين
        const providerSlot = PROVIDER_KEY_MAP[payload.provider] || SETTINGS_KEYS.apiKey;
        saveSetting(providerSlot, payload.apiKey);
        // احتفظ بالمفتاح القديم أيضاً للتوافق مع الكود القديم
        if (providerSlot !== SETTINGS_KEYS.apiKey) {
          saveSetting(SETTINGS_KEYS.apiKey, payload.apiKey);
        }
      }
      saveSetting(SETTINGS_KEYS.model,   payload.model   || '');
      saveSetting(SETTINGS_KEYS.baseUrl, payload.baseUrl || '');
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

  // ─── ai:testConnection ───────────────────────────────────────────────────

  ipcMain.handle('ai:testConnection', async (_e, configOverride?: Partial<AIConfig>) => {
    try {
      const base = loadAIConfig();
      if (!base && !configOverride?.apiKey) {
        return { success: false, error: 'لم يتم ضبط إعدادات الذكاء الاصطناعي بعد.' };
      }

      const config: AIConfig = {
        ...(base || { provider: 'gemini', apiKey: '' }),
        ...configOverride,
      };

      const result = await AIService.testConnection(config);
      return result;
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

  // ─── ai:getHistory ────────────────────────────────────────────────────────

  ipcMain.handle('ai:getHistory', () => {
    try {
      const history = loadChatHistory();
      return { success: true, data: history };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

  // ─── ai:clearHistory ─────────────────────────────────────────────────────

  ipcMain.handle('ai:clearHistory', () => {
    try {
      saveSetting(SETTINGS_KEYS.chatHistory, '[]');
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

  // ─── ai:saveHistory ──────────────────────────────────────────────────────

  ipcMain.handle('ai:saveHistory', (_e, history: AIMessage[]) => {
    try {
      saveChatHistory(history);
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

  // ─── ai:director:analyze ──────────────────────────────────────────────────
  ipcMain.handle('ai:director:analyze', async (_e, payload: { productId?: number; image?: { base64: string; mimeType: string } }) => {
    try {
      const config = loadAIConfig();
      if (!config) {
        return { success: false, error: 'يرجى ضبط إعدادات الذكاء الاصطناعي في الإعدادات أولاً.' };
      }
      if (getSetting(SETTINGS_KEYS.mode) !== 'automatic') {
        return { success: false, error: 'التحليل التلقائي يتطلب وضع الاتصال التلقائي ومفتاح API.' };
      }

      const db = DatabaseService.getRawDb();
      let productDetailsText = '';
      let attachedImages: { base64: string; mimeType: string }[] = [];

      if (payload.productId) {
        const product = db.prepare(`
          SELECT p.id, p.name, p.name_fr, b.name as brand_name, c.name as category_name
          FROM products p
          LEFT JOIN brands b ON p.brand_id = b.id
          LEFT JOIN categories c ON p.category_id = c.id
          WHERE p.id = ? AND p.is_active = 1
        `).get(payload.productId) as any;

        if (product) {
          productDetailsText = `اسم المنتج: ${product.name}\nالاسم بالفرنسية: ${product.name_fr || 'غير متوفر'}\nالماركة: ${product.brand_name || 'غير محددة'}\nالتصنيف: ${product.category_name || 'غير محدد'}`;
          const prodImgs = getAllProductImagesBase64(Number(payload.productId));
          if (prodImgs && prodImgs.length > 0) {
            attachedImages = prodImgs;
          }
        }
      }

      if (payload.image) {
        attachedImages = [payload.image];
      }

      const promptText = `أنت المخرج الفني ومحلل المنتجات الصناعية. 
قم بتحليل هذا المنتج البصري أو تفاصيله وتحديد خصائصه الهندسية والفيزيائية وخلفيات التصوير الفخمة الملائمة له.
المنتج:
${productDetailsText || 'منتج مخصص مرفق بالصورة'}

المطلوب: تحليل القطعة وتوليد ملف JSON يتضمن الخصائص والخيارات المقترحة لتبسيط الإخراج الفني.
يجب إرجاع الإجابة بصيغة JSON فقط متضمنة الحقول التالية:
{
  "geometry_type": "[bulky-irregular / flat-disc / tall-cylindrical / small-complex]",
  "material_type": "[المادة المصنوع منها باللغة العربية، مثل: كروم لامع، حديد صلب، بلاستيك، مطاط]",
  "scratches_detected": [true/false],
  "natural_orientation": "وصف كيف يقف المنتج طبيعياً بالإنجليزية",
  "suggested_background": "[reflective_glass / slate_stone / engineering_bench / clean_catalog]",
  "suggested_lighting": "[dramatic / catalog / metallic_side / soft]",
  "suggested_camera_angle": "[hero_45 / front / top / close_up]",
  "suggested_support": "الحل الفيزيائي المقترح لتثبيت القطعة بالإنجليزية",
  "suggested_video_scenes": [
    "المشهد الأول: لقطة افتتاحية مع زوم تدريجي للمنتج",
    "المشهد الثاني: دوران كاميرا بطيء 360 درجة حول المنتج",
    "المشهد الثالث: لقطة قريبة تبرز تفاصيل المادة والمعدن",
    "المشهد الرابع: ظهور شعار الماركة أو اسم المنتج",
    "المشهد الخامس: لقطة ختامية ثابتة للمنتج"
  ]
}`;

      const messages = [
        {
          role: 'user' as const,
          content: promptText,
          ...(attachedImages.length > 0 ? { images: attachedImages, image: attachedImages[0] } : {})
        }
      ];

      const result = await AIService.chat(config, messages, { jsonMode: true });
      if (result.success && result.content) {
        try {
          const parsed = JSON.parse(result.content);
          return { success: true, data: parsed };
        } catch {
          return { success: true, raw: result.content };
        }
      }
      return { success: false, error: result.error || 'فشل تحليل المنتج بالذكاء الاصطناعي' };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

  // ─── ai:director:generate ─────────────────────────────────────────────────
  ipcMain.handle('ai:director:generate', async (_e, payload: {
    productId?: number;
    image?: { base64: string; mimeType: string };
    choices: {
      bgType: string;
      lightingType: string;
      cameraAngle: string;
      goal: string;
      realism: string;
      duration: string;
      cameraMovement: string;
      videoStyle: string;
      textOverlay: string;
      targetPlatform: string;
      selectedScenes: string[];
    }
  }) => {
    try {
      const config = loadAIConfig();
      if (!config) {
        return { success: false, error: 'يرجى ضبط إعدادات الذكاء الاصطناعي في الإعدادات أولاً.' };
      }
      if (getSetting(SETTINGS_KEYS.mode) !== 'automatic') {
        return { success: false, error: 'توليد البرومبت يتطلب وضع الاتصال التلقائي ومفتاح API.' };
      }

      const db = DatabaseService.getRawDb();
      let productDetailsText = '';
      let attachedImages: { base64: string; mimeType: string }[] = [];

      if (payload.productId) {
        const product = db.prepare(`
          SELECT p.id, p.name, p.name_fr, b.name as brand_name, c.name as category_name
          FROM products p
          LEFT JOIN brands b ON p.brand_id = b.id
          LEFT JOIN categories c ON p.category_id = c.id
          WHERE p.id = ? AND p.is_active = 1
        `).get(payload.productId) as any;

        if (product) {
          productDetailsText = `اسم المنتج: ${product.name}\nالاسم بالفرنسية: ${product.name_fr || ''}\nالماركة: ${product.brand_name || 'غير محددة'}\nالتصنيف: ${product.category_name || 'غير محدد'}`;
          const prodImgs = getAllProductImagesBase64(Number(payload.productId));
          if (prodImgs && prodImgs.length > 0) {
            attachedImages = prodImgs;
          }
        }
      }

      if (payload.image) {
        attachedImages = [payload.image];
      }

      const c = payload.choices;
      const promptText = `أنت المخرج الإبداعي ومصمم الموجهات السينمائية لقطع غيار السيارات والمنتجات الميكانيكية.
قم بتوليد برومبتات إعلانية وسيناريوهات تصوير احترافية للمنتج التالي بناءً على خيارات المستخدم الفنية المحددة بدقة.

المنتج:
${productDetailsText || 'منتج مخصص مرفق بالصورة'}

خيارات المستخدم المحددة (يجب الالتزام بها حرفياً بداخل البرومبتات):
- نمط الخلفية (Background): ${c.bgType} (reflective_glass=زجاج أسود مصقول عاكس، slate_stone=حجر أردواز أو خرسانة داكنة خشنة الملمس، engineering_bench=منضدة ورشة راقية ومخططات هندسية معزولة، clean_catalog=استوديو احترافي بسيط ومحايد)
- نمط الإضاءة (Lighting): ${c.lightingType} (dramatic=إضاءة استوديو مركزة خافتة، catalog=إضاءة متكاملة ساطعة ونظيفة، metallic_side=إضاءة جانبية تبرز حواف القطع المعدنية، soft=إضاءة ناعمة خالية من الظلال الحادة)
- زاوية الكاميرا (Camera Angle): ${c.cameraAngle} (hero_45=لقطة بطل 45 درجة، front=لقطة أمامية مركزية، top=لقطة علوية مسطحة، close_up=لقطة ماكرو للتفاصيل الدقيقة)
- الهدف من الصورة (Goal): ${c.goal} (ad=إعلاني سوشيال ميديا، store=متجر إلكتروني، catalog=كتالوج مطبوع)
- نمط الواقعية (Realism): ${c.realism} (photorealistic=واقعي فوتوغرافي، luxury=فخم وتجاري، technical=صناعي وهندسي دقيق)

خيارات الفيديو الإعلاني المحددة:
- مدة الفيديو (Duration): ${c.duration}
- منصة التوليد (Target Platform): ${c.targetPlatform} (Runway Gen-3 / Luma / Sora)
- حركة الكاميرا (Camera Movement): ${c.cameraMovement} (orbit=دوران بطيء حول القطعة، zoom=تقريب ناعم، pan=حركة أفقية بانورامية، macro=تركيز على التفاصيل)
- أسلوب الفيديو (Video Style): ${c.videoStyle} (cinematic=سينمائي فخم، fast_promo=إعلان سريع، technical_showcase=استعراض ثلاثي الأبعاد)
- نصوص تظهر في الفيديو (Text Overlay): "${c.textOverlay || 'لا يوجد'}"
- المشاهد المحددة بالترتيب:
${(c.selectedScenes || []).map((s, idx) => `  * المشهد ${idx + 1}: ${s}`).join('\n')}

المطلوب:
توليد الـ JSON بالهيكل التالي فقط دون أي نصوص إضافية خارج كود الـ JSON.

شروط هامة لمنع انقسام الصورة:
- طبق قاعدة اللقطة الفردية الصارمة (Single Hero Shot Rule).
- يمنع استخدام كلمات مثل split-screen, side-by-side, comparison, collage في موجهات الصور.
- أضف كلمات استبعاد للصور مثل: hands, fingers, person, human, blurry, split-screen, side-by-side.

الهيكل المطلوب للـ JSON:
{
  "midjourney_prompt": "[موجه إنجليزي فخم ودقيق جداً لـ Midjourney يلتزم بخلفية وإضاءة وزاوية الصورة المختارة، لقطة بطل واحدة، دون تقسيم للشاشة]",
  "dalle_prompt": "[موجه إنجليزي لـ DALL-E 3 يلتزم بالخيارات، لقطة بطل واحدة، جودة استوديو احترافية]",
  "stable_diffusion": {
    "positive_prompt": "[موجه إيجابي إنجليزي لـ SDXL يصف المشهد المختار بدقة]",
    "negative_prompt": "hands, fingers, person, human, blurry, low quality, deformed, split-screen, side-by-side, collage, diptych, multiple views"
  },
  "video_prompt": "[موجه إنجليزي متكامل لحركة الكاميرا لـ Runway/Luma/Sora يصف الحركة المختارة والخلفية والمنتج والإضاءة بدقة لعرض القطعة بشكل سينمائي]",
  "video_scenes": [
    {
      "scene_number": 1,
      "description": "وصف المشهد باللغة العربية بالتفصيل",
      "visual_prompt": "الموجه البصري باللغة الإنجليزية لتوليد هذا المشهد بالذات (مخصص للنسخ لمولد الفيديو)",
      "camera_movement": "حركة الكاميرا المحددة لهذا المشهد بالإنجليزية",
      "on_screen_text": "النص الظاهر على الشاشة إن وجد"
    }
  ],
  "camera_instructions": "تعليمات الكاميرا والعدسة المقترحة بالإنجليزي والترجمة بالعربي",
  "lighting_instructions": "تعليمات الإضاءة المحددة بالإنجليزي والترجمة بالعربي",
  "text_overlays_guidance": "إرشادات حول كيفية إظهار النصوص بشكل جمالي"
}`;

      const messages = [
        {
          role: 'user' as const,
          content: promptText,
          ...(attachedImages.length > 0 ? { images: attachedImages, image: attachedImages[0] } : {})
        }
      ];

      const result = await AIService.chat(config, messages, { jsonMode: true });
      if (result.success && result.content) {
        try {
          const parsed = JSON.parse(result.content);
          return { success: true, data: parsed };
        } catch {
          return { success: true, raw: result.content };
        }
      }
      return { success: false, error: result.error || 'فشل توليد موجهات الإخراج الذكي' };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

  // ─── ai:chat ─────────────────────────────────────────────────────────────

  ipcMain.handle('ai:chat', async (_e, userMessage: string | { content: string; image?: { base64: string; mimeType: string }; images?: { base64: string; mimeType: string }[]; productId?: number }) => {
    try {
      const config = loadAIConfig();
      if (!config) {
        return { success: false, error: 'يرجى ضبط إعدادات الذكاء الاصطناعي في الإعدادات أولاً.' };
      }
      if (getSetting(SETTINGS_KEYS.mode) !== 'automatic') {
        return { success: false, error: 'الدردشة التفاعلية تتطلب الوضع التلقائي وإدخال مفتاح API.' };
      }

      // جلب بيانات المحل وبناء الـ System Prompt
      const db = DatabaseService.getRawDb();
      const ctx = DataHarvesterService.harvest(db);
      const ctxText = DataHarvesterService.toPromptText(ctx);
      const systemMsg = buildSystemPrompt(ctxText);

      // تحميل تاريخ المحادثة
      const history = loadChatHistory();

      // بناء قائمة الرسائل: system + history + رسالة المستخدم الجديدة
      let userMsgObj: AIMessage;
      if (userMessage && typeof userMessage === 'object') {
        let attachedImages = userMessage.images;
        if ((!attachedImages || attachedImages.length === 0) && userMessage.image) {
          attachedImages = [userMessage.image];
        }
        if ((!attachedImages || attachedImages.length === 0) && userMessage.productId) {
          const prodImgs = getAllProductImagesBase64(Number(userMessage.productId));
          if (prodImgs && prodImgs.length > 0) {
            attachedImages = prodImgs;
          }
        }
        userMsgObj = {
          role: 'user',
          content: userMessage.content || '',
          images: attachedImages || undefined,
          image: attachedImages && attachedImages.length > 0 ? attachedImages[0] : undefined,
        };
      } else {
        userMsgObj = {
          role: 'user',
          content: userMessage || '',
        };
      }

      const messages: AIMessage[] = [
        systemMsg,
        ...history,
        userMsgObj,
      ];

      const resolvedMessages = resolveMessageImages(messages);

      let loopCount = 0;
      let aiResponseContent = '';
      let activeMessages = [...resolvedMessages];
      let totalUsage = { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };

      // ترتيب المزودين للـ fallback (الأولوية للمزود النشط)
      const FALLBACK_ORDER: AIConfig['provider'][] = ['gemini', 'nvidia', 'openai', 'openai-compatible'];
      function buildFallbackChain(primary: AIConfig): AIConfig[] {
        const chain: AIConfig[] = [primary];
        for (const p of FALLBACK_ORDER) {
          if (p === primary.provider) continue;
          const alt = loadAIConfigForProvider(p);
          if (alt) chain.push(alt);
        }
        return chain;
      }
      const fallbackChain = buildFallbackChain(config);

      while (loopCount < 3) {
        // حاول المزود النشط أولاً، ثم الاحتياطيين عند الفشل
        let result = await AIService.chat(fallbackChain[0], activeMessages);
        let usedProvider = fallbackChain[0].provider;

        if (!result.success && fallbackChain.length > 1) {
          console.warn(`[AI Fallback] ${usedProvider} failed: ${result.error}. Trying next provider...`);
          for (let fi = 1; fi < fallbackChain.length; fi++) {
            result = await AIService.chat(fallbackChain[fi], activeMessages);
            usedProvider = fallbackChain[fi].provider;
            if (result.success) {
              console.log(`[AI Fallback] Switched to ${usedProvider} successfully.`);
              break;
            }
            console.warn(`[AI Fallback] ${usedProvider} also failed: ${result.error}`);
          }
        }

        if (!result.success || !result.content) {
          return { success: false, error: result.error || 'لم يُرجع الذكاء الاصطناعي أي رد' };
        }

        aiResponseContent = result.content;
        if (result.usage) {
          totalUsage.prompt_tokens += result.usage.prompt_tokens;
          totalUsage.completion_tokens += result.usage.completion_tokens;
          totalUsage.total_tokens += result.usage.total_tokens;
        }

        // Check for tool call block in the content: ```tool tool_name(...) ```
        const toolMatch = aiResponseContent.match(/```tool\s*(\w+)\(([^)]*)\)\s*```/);
        if (toolMatch) {
          const toolName = toolMatch[1];
          const argsStr = toolMatch[2];

          // Parse arguments: e.g. query: "filter" or id: 12
          const args: Record<string, any> = {};
          const argPairs = argsStr.match(/(\w+)\s*:\s*("[^"]*"|\d+)/g) || [];
          for (const pair of argPairs) {
            const separatorIndex = pair.indexOf(':');
            if (separatorIndex !== -1) {
              const k = pair.substring(0, separatorIndex).trim();
              const v = pair.substring(separatorIndex + 1).trim();
              args[k] = v.startsWith('"') ? v.slice(1, -1) : Number(v);
            }
          }

          console.log(`[AI Agent Loop] Tool execution: ${toolName}`, args);

          // Execute corresponding SQLite tool helper
          let toolResult = '';
          if (toolName === 'search_products') {
            toolResult = executeSearchProductsTool(db, args.query || '');
          } else if (toolName === 'get_product_detail') {
            toolResult = executeGetProductDetailTool(db, Number(args.id) || 0);
          } else if (toolName === 'search_parties') {
            toolResult = executeSearchPartiesTool(db, args.query || '');
          } else if (toolName === 'get_sales_report') {
            toolResult = executeGetSalesReportTool(db, Number(args.days) || 30);
          } else if (toolName === 'check_zero_stock_products') {
            toolResult = executeCheckZeroStockProductsTool(db, args.date_from || '', args.date_to || '');
          } else if (toolName === 'generate_product_marketing') {
            toolResult = await executeGenerateProductMarketing(db, Number(args.id) || 0, config);
          } else if (toolName === 'generate_product_image_prompts') {
            toolResult = await executeGenerateProductImagePrompts(db, Number(args.id) || 0, config);
          } else {
            toolResult = `Error: Unknown tool "${toolName}"`;
          }

          // Append assistant's tool call and the tool execution outcome to active conversation
          activeMessages.push({ role: 'assistant', content: aiResponseContent });
          activeMessages.push({ role: 'user', content: `[TOOL_RESULT] Result of ${toolName}: ${toolResult}` });

          loopCount++;
        } else {
          // No more tool calls, we have the final output!
          break;
        }
      }

      // Save user message and final reply to history (clean messages, without tool calls)
      const newHistory: AIMessage[] = [
        ...history,
        userMsgObj,
        { role: 'assistant', content: aiResponseContent },
      ];
      saveChatHistory(newHistory);

      return { success: true, content: aiResponseContent, usage: totalUsage };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

  // ─── ai:analyze ───────────────────────────────────────────────────────────

  ipcMain.handle('ai:analyze', async () => {
    try {
      const config = loadAIConfig();
      if (!config) {
        return { success: false, error: 'يرجى ضبط إعدادات الذكاء الاصطناعي في الإعدادات أولاً.' };
      }
      if (getSetting(SETTINGS_KEYS.mode) !== 'automatic') {
        return { success: false, error: 'التحليل التلقائي يتطلب إدخال مفتاح API في الإعدادات.' };
      }

      const db = DatabaseService.getRawDb();
      const ctx = DataHarvesterService.harvest(db);
      const ctxText = DataHarvesterService.toPromptText(ctx);

      const analysisPrompt = `
بناءً على بيانات المحل أعلاه، قدّم تحليلاً استقصائياً ذكياً وموجزاً للغاية.

أعطِني JSON بالتنسيق التالي بالضبط (لا تكتب أي نص خارج الـ JSON):

{
  "last_analyzed": "${new Date().toISOString().split('T')[0]}",
  "shop_health_score": <عدد بين 0 و100 يمثل الصحة العامة للمحل>,
  "summary": "<ملخص استراتيجي شديد التركيز والإيجاز (جملتين كحد أقصى) يصف بدقة وضع المحل الحالي والفرصة الأساسية المتاحة لتنميته>",
  "recommendations": [
    {
      "id": "<uuid بسيط مثل rec_1>",
      "type": "<critical | warning | opportunity>",
      "category": "<debts | inventory | cash_flow | customers | suppliers | expenses | pricing>",
      "title": "<عنوان استراتيجي بليغ وموجز جداً يصف التوصية>",
      "conclusion": "<استنتاج تحليلي شديد الإيجاز (جملة أو جملتين كحد أقصى) مستند للبيانات الرقمية>",
      "recommendation": "<دليل إرشادي عملي مختصر ومباشر جداً (جملتين أو ثلاث كحد أقصى) يشرح كيفية الحل خطوة بخطوة>",
      "urgency": "<immediate | this_week | this_month>",
      "action_route": "<مثال: /customers أو /inventory أو /expenses>"
    }
  ]
}

القواعد الإلزامية للتحليل:
- قدّم من 4 إلى 6 توصيات كحد أقصى، مع التركيز على الفرص (opportunity) لتنمية الأعمال.
- يجب أن تكون كل توصية موجزة ومباشرة جداً ومريحة للقراءة السريعة، تجنب الحشو أو الفقرات الطويلة.
- لا تكتب أي نص خارج الـ JSON المطلوب.
      `.trim();

      const messages: AIMessage[] = [
        buildSystemPrompt(ctxText),
        { role: 'user', content: analysisPrompt },
      ];

      const result = await AIService.chat(config, messages, { jsonMode: true });

      if (!result.success || !result.content) {
        return { success: false, error: result.error };
      }

      let analysis: any;
      try {
        analysis = cleanAndParseJSON(result.content);
      } catch (parseErr: any) {
        console.error('[ai:analyze] Failed to parse AI JSON. Raw content:', result.content, parseErr);
        return { success: false, error: 'الذكاء الاصطناعي لم يُرجع JSON صحيح. يرجى المحاولة مجدداً.' };
      }

      // حفظ التحليل محلياً
      saveSetting(SETTINGS_KEYS.lastAnalysis, JSON.stringify(analysis));

      return { success: true, data: analysis, usage: result.usage };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

  // ─── ai:exportContext ─────────────────────────────────────────────────────

  ipcMain.handle('ai:exportContext', () => {
    try {
      const db = DatabaseService.getRawDb();
      const ctx = DataHarvesterService.harvest(db);
      const ctxText = DataHarvesterService.toPromptText(ctx);

      const systemMsg = buildSystemPrompt(ctxText);

      // نبني النص الكامل للتصدير للوضع اليدوي (دردشة تفاعلية استشارية حرة)
      const exportText = `${systemMsg.content}

---

بناءً على بيانات المحل ومؤشراته الحالية الموضحة أعلاه، يرجى تقديم تحليل استراتيجي أولي شامل وتفصيلي للغاية لمتجري باللغة العربية الفصحى. 
تحدث معي كخبير أعمال ومستشار مالي بارع، بأسلوب استشاري بليغ ومفصل ومليء بالمعلومات القيمة، وركّز بشكل كبير على اقتراح الفرص (Opportunities) لزيادة المبيعات، تحسين هوامش الربح، وتصريف البضائع الراكدة، وهيكلة الأسعار وفقاً لعلم نفس التسعير، وترشيد التكاليف، وإدارة مخاطر ديون العملاء.

يرجى هيكلة التقرير الأولي كالتالي:
1. **الصحة المالية العامة للمحل والتوصيات العاجلة** (مع ذكر أرقام حقيقية ونسب مئوية من البيانات).
2. **الفرص الكامنة لزيادة هوامش الأرباح والمبيعات** (استغلال فئات المنتجات الناجحة وعلاجات التسعير).
3. **خطة تصريف البضائع الراكدة والمخزون الزائد** (أفكار عملية ملموسة لتصفية هذه البضائع المحبوس فيها رأس المال).
4. **إدارة مخاطر الائتمان وتحصيل المديونيات** (التعامل مع العملاء المتأخرين وحماية التدفقات النقدية).
5. **خطوات عملية أولى ينصح بالبدء بها فوراً**.

في نهاية ردك الأول، يرجى طرح سؤالين أو ثلاثة أسئلة استفسارية تفاعلية لمساعدتك في فهم أهدافي بشكل أعمق (مثلاً إذا كنت أرغب بالتركيز على التوسع، أو تصفية ديون معينة، أو تصفية المخزون) لنبدأ معاً في نقاش تفاعلي مثمر حول شؤون المحل. 
(تنبيه: تحدث معي كإنسان يبحث عن توجيه استراتيجي؛ لا تذكر أي أكواد برمجية أو هياكل JSON أو مخرجات تقنية).`;

      return { success: true, data: exportText };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

  // ─── ai:getLastAnalysis ───────────────────────────────────────────────────

  ipcMain.handle('ai:getLastAnalysis', () => {
    try {
      const raw = getSetting(SETTINGS_KEYS.lastAnalysis);
      if (!raw) return { success: true, data: null };
      return { success: true, data: JSON.parse(raw) };
    } catch {
      return { success: true, data: null };
    }
  });

  // ─── ai:saveManualAnalysis ────────────────────────────────────────────────

  ipcMain.handle('ai:saveManualAnalysis', (_e, jsonStr: string) => {
    try {
      // التحقق من صحة JSON قبل الحفظ
      const parsed = JSON.parse(jsonStr);
      if (!parsed.recommendations || !Array.isArray(parsed.recommendations)) {
        return { success: false, error: 'JSON غير صحيح: لا يحتوي على recommendations.' };
      }
      saveSetting(SETTINGS_KEYS.lastAnalysis, JSON.stringify(parsed));
      return { success: true, data: parsed };
    } catch (e: any) {
      return { success: false, error: `JSON غير صحيح: ${e.message}` };
    }
  });

  // ─── ai:parseInvoiceImage ─────────────────────────────────────────────────

  ipcMain.handle('ai:parseInvoiceImage', async (_e, payload: {
    base64Image: string;
    mimeType: string;   // 'image/jpeg' | 'image/png' | 'image/webp'
  }) => {
    try {
      const config = loadAIConfig();
      if (!config) {
        return { success: false, error: 'يرجى ضبط إعدادات الذكاء الاصطناعي أولاً.' };
      }

      // التحقق من أن الموفر يدعم الصور
      const visionProviders: AIConfig['provider'][] = ['gemini', 'openai'];
      if (!visionProviders.includes(config.provider) && config.provider !== 'nvidia') {
        return {
          success: false,
          error: 'موفّر الخدمة الحالي لا يدعم قراءة الصور. استخدم Gemini أو GPT-4o.',
        };
      }

      const db = DatabaseService.getRawDb();
      const categories = db.prepare("SELECT name FROM categories WHERE is_active = 1").all() as any[];
      const categoryNames = categories.map(c => c.name).join(', ') || 'فلاتر, زيوت ومواد التشحيم, فرامل, كهرباء السيارة, محرك, تعليق وتوجيه, إطارات وعجلات, إكسسوارات';

      const invoicePrompt = `Please analyze the attached supplier invoice image carefully and extract all details. Output them strictly in JSON format. Do not include any conversational explanation, prefaces, or markdown code block formatting. The output must be pure raw JSON conforming to the schema.

JSON Schema structure:
{
  "supplier_name": "Name of the supplier/seller as written on the invoice (e.g., 'SARL PIECES AUTO') or null",
  "supplier_phone": "Phone number(s) of the supplier if printed on the invoice, otherwise null",
  "supplier_address": "Address/Location of the supplier if printed on the invoice, otherwise null",
  "invoice_number": "Invoice number or reference number as printed (e.g., 'BR 05108/2026') or null",
  "paid_amount": 0.00,
  "due_amount": 0.00,
  "discount": 0.00,
  "total_amount": 0.00,
  "items": [
    {
      "index": 1,
      "original_name": "Product name exactly as written in French or English on the invoice (e.g., 'FILTRE HUILE PEUGEOT 206')",
      "translated_name_ar": "Translate the core spare part name into a clear, customer-friendly Arabic name for receipts (e.g., 'فلتر زيت بيجو 206') or null",
      "sku": "Part number, OEM code, barcode, or reference code if visible, otherwise null",
      "qty": 10,
      "purchase_price": 350.00,
      "category_suggestion": "Choose exactly from this list of categories: ${categoryNames}",
      "unit_suggestion": "Choose from: Piece, Litre, Box",
      "packaging": {
        "is_box": false,
        "box_size": 1,
        "box_name": "Carton, Box, Pack, or null"
      },
      "brand_suggestion": "Brand name of the spare part if visible or inferred, otherwise null",
      "compatibility_suggestions": [
        {
          "brand": "Vehicle brand name or null",
          "model": "Vehicle model name or null"
        }
      ],
      "needs_review": false
    }
  ]
}

Instructions for specific fields:
- "paid_amount": The amount paid / Montant Versement as printed on the invoice. Use 0.00 if not found.
- "due_amount": The remaining balance / Reste à Payer as printed on the invoice. Use 0.00 if not found.
- "discount": Total discount or remise as printed on the invoice. Use 0.00 if not found.
- "total_amount": The total invoice amount / Net à Payer as printed. Use 0.00 if not found.
- "packaging.is_box": Set to true ONLY if the item name, description, or row indicates it is bought in a bulk/box/carton containing multiple individual sellable items (e.g., 'Carton 12', 'Box 24', 'Pack 6'). Do NOT set to true for kits, sets, or pairs that are sold together as a single kit (e.g., 'KIT EMBRIAGE', 'JEU PISTONS', or pairs of brake pads/control arms like 'BRAS DE FORCE (2PCS)' or 'PLAQUETTE DE FREIN (4PCS)' if they are sold to the final customer as a single set/kit).
- "packaging.box_size": If is_box is true, extract the number of pieces inside the box. Otherwise, 1.
- "needs_review": Set to true if the item description is blurry/illegible, prices are ambiguous, or you are highly uncertain about its details.

Strict Rules:
1. Output ONLY a valid JSON object. Do not wrap it in markdown code blocks.
2. If buying price or quantity is missing, use 0 for price and 1 for quantity.
3. If no barcode, OEM reference, or SKU is found on the row, set "sku" to null.
4. Extract the product names exactly as written in French, preserving all letters, numbers, and specifications.
5. Pay close attention to packaging keywords (Carton, Box, Pack, Lot) to extract packaging information accurately. If unsure, set "needs_review" to true.
6. Verify and calculate the totals to ensure mathematical consistency.
7. Do NOT split kits, sets, or pairs that are sold together as a single pack/kit. If the product name contains '(2PCS)' or '(4PCS)' but it represents a kit or set of parts that must be sold together (such as a kit of control arms, set of brake pads, or kit of pistons), treat them as a single item (set is_box to false and box_size to 1).`;

      // Gemini يدعم الصور بشكل مباشر في parts
      // نبني الطلب يدوياً لـ Gemini Vision
      if (config.provider === 'gemini') {
        const result = await AIService.chatWithImage(config, invoicePrompt, payload.base64Image, payload.mimeType);
        if (!result.success || !result.content) {
          return { success: false, error: result.error };
        }
        return { success: true, data: parseInvoiceJSON(result.content) };
      }

      // OpenAI / NVIDIA — vision models
      const messages: AIMessage[] = [
        {
          role: 'user',
          content: `${invoicePrompt}\n\n[الصورة مرفقة كـ base64: ${payload.base64Image.substring(0, 50)}...]`,
        },
      ];
      const result = await AIService.chat(config, messages, { jsonMode: true });
      if (!result.success || !result.content) {
        return { success: false, error: result.error };
      }
      return { success: true, data: parseInvoiceJSON(result.content) };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

  // ─── ai:extractFitments ───────────────────────────────────────────────────

  ipcMain.handle('ai:extractFitments', async (_e, payload: {
    text?: string;
    base64Image?: string;
    mimeType?: string;
  }) => {
    try {
      const config = loadAIConfig();
      if (!config) {
        return { success: false, error: 'يرجى ضبط إعدادات الذكاء الاصطناعي أولاً.' };
      }

      const fitmentsPrompt = `
استخرج توافقات المركبات من النص التالي وأعطني JSON بالضبط:

{
  "confidence": <0-100>,
  "fitments": [
    {
      "brand": "<العلامة التجارية مثل Toyota>",
      "model": "<الموديل مثل Yaris>",
      "year_from": <سنة البداية أو null>,
      "year_to": <سنة النهاية أو null>,
      "engine": "<حجم المحرك مثل 1.3L أو null>",
      "notes": "<ملاحظات إضافية أو null>"
    }
  ],
  "unrecognized_parts": ["<أي نص لم تستطع تحليله>"]
}

النص المراد تحليله:
${payload.text || '(صورة مرفقة)'}

لا تكتب أي نص خارج الـ JSON.
      `.trim();

      const messages: AIMessage[] = [
        { role: 'user', content: fitmentsPrompt },
      ];
      const result = await AIService.chat(config, messages, { jsonMode: true });

      if (!result.success || !result.content) {
        return { success: false, error: result.error };
      }

      try {
        const parsed = cleanAndParseJSON(result.content);
        return { success: true, data: parsed };
      } catch {
        return { success: false, error: 'الذكاء الاصطناعي لم يُرجع JSON صحيح. يرجى المحاولة مجدداً.' };
      }
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });


  // ─── ai:autoAddFitments ───────────────────────────────────────────────────
  // يحلل اسم المنتج بالذكاء الاصطناعي، يجد المركبات المتوافقة في قاعدة البيانات،
  // ثم يضيف التوافقات تلقائياً للمنتج.

  ipcMain.handle('ai:autoAddFitments', async (_e, payload: {
    product_id: number;
    product_name: string;
    product_barcode?: string;
  }) => {
    try {
      const config = loadAIConfig();
      if (!config) {
        return { success: false, error: 'يرجى ضبط إعدادات الذكاء الاصطناعي أولاً.' };
      }

      const raw = DatabaseService.getRawDb();

      // 1) جلب كل الماركات والموديلات المتاحة في قاعدة البيانات
      const brands: any[] = raw.prepare('SELECT id, name FROM vehicle_brands ORDER BY name ASC').all();
      const models: any[] = raw.prepare(`
        SELECT m.id, m.name as model_name, b.name as brand_name, m.vehicle_brand_id,
               m.year_from, m.year_to
        FROM vehicle_models m
        LEFT JOIN vehicle_brands b ON m.vehicle_brand_id = b.id
        ORDER BY b.name ASC, m.name ASC
      `).all();

      if (brands.length === 0) {
        return { success: false, error: 'لا توجد ماركات مركبات في قاعدة البيانات. أضف ماركات أولاً من صفحة المركبات.' };
      }

      // 2) بناء قائمة المركبات المتاحة للـ AI
      const vehicleList = models.map((m: any) => {
        const yearRange = m.year_from && m.year_to ? ` (${m.year_from}-${m.year_to})` : (m.year_from ? ` (من ${m.year_from})` : '');
        return `- ID:${m.id} | ${m.brand_name} ${m.model_name}${yearRange}`;
      }).join('\n');

      // 3) استدعاء الـ AI لتحديد التوافقات
      const prompt = `أنت خبير في قطع غيار السيارات.

المنتج: "${payload.product_name}"${payload.product_barcode ? ` (الباركود: ${payload.product_barcode})` : ''}

قائمة المركبات المتاحة في قاعدة البيانات:
${vehicleList}

المطلوب: من القائمة أعلاه فقط، حدد المركبات التي يتوافق معها هذا المنتج على الأرجح بناءً على اسمه.
اعتمد على اسم المنتج لتحديد الماركة والموديل. مثلاً إذا كان الاسم يحتوي على "يوتيوب" أو "Toyota" أو "تويوتا"، ابحث عن تويوتا في القائمة.

أجب بـ JSON فقط بهذا الشكل:
{
  "confidence": <0-100>,
  "matched_model_ids": [<id1>, <id2>, ...],
  "reasoning": "<شرح مختصر لسبب الاختيار>"
}

إذا لم تجد أي تطابق، أعطِ matched_model_ids مصفوفة فارغة.
لا تكتب أي نص خارج الـ JSON.`;

      // جلب صورة المنتج الأساسية إن وجدت وتحويلها لـ Base64
      const pImg = getProductPrimaryImageBase64(payload.product_id);

      const messages: AIMessage[] = [
        {
          role: 'user',
          content: prompt + (pImg ? '\n\n(مرفق صورة المنتج لمساعدتك في التعرف على القطعة ومطابقتها وتحديد الموديلات المناسبة بدقة)' : ''),
          ...(pImg ? { image: { base64: pImg.base64, mimeType: pImg.mimeType } } : {}),
        }
      ];
      const result = await AIService.chat(config, messages, { jsonMode: true });

      if (!result.success || !result.content) {
        return { success: false, error: result.error || 'فشل الذكاء الاصطناعي في التحليل.' };
      }

      let parsed: { confidence: number; matched_model_ids: number[]; reasoning: string };
      try {
        parsed = cleanAndParseJSON(result.content);
      } catch {
        return { success: false, error: 'الذكاء الاصطناعي لم يُرجع JSON صحيح. يرجى المحاولة مجدداً.' };
      }

      if (!parsed.matched_model_ids || parsed.matched_model_ids.length === 0) {
        return {
          success: true,
          added: 0,
          skipped: 0,
          reasoning: parsed.reasoning || 'لم يجد الذكاء الاصطناعي توافقات مناسبة في قاعدة البيانات.',
          confidence: parsed.confidence || 0,
        };
      }

      // 4) إضافة التوافقات للمنتج (تجاهل المكررة)
      const product = raw.prepare('SELECT barcode, name FROM products WHERE id = ?').get(payload.product_id) as any;
      const productBarcode = product?.barcode || null;
      const productName = product?.name || payload.product_name;

      const insertFitment = raw.prepare(`
        INSERT OR IGNORE INTO product_fitments
          (product_id, product_barcode, product_name, vehicle_model_id, vehicle_brand_id)
        VALUES (?, ?, ?, ?, (SELECT vehicle_brand_id FROM vehicle_models WHERE id = ?))
      `);

      let added = 0;
      let skipped = 0;

      raw.transaction(() => {
        for (const modelId of parsed.matched_model_ids) {
          // تحقق أن الموديل موجود فعلاً في قاعدة البيانات
          const modelExists = raw.prepare('SELECT id FROM vehicle_models WHERE id = ?').get(modelId);
          if (!modelExists) { skipped++; continue; }

          // تحقق إذا كان التوافق موجوداً مسبقاً
          const exists = raw.prepare(
            'SELECT id FROM product_fitments WHERE product_id = ? AND vehicle_model_id = ?'
          ).get(payload.product_id, modelId);
          if (exists) { skipped++; continue; }

          insertFitment.run(payload.product_id, productBarcode, productName, modelId, modelId);
          added++;
        }
      })();

      return {
        success: true,
        added,
        skipped,
        reasoning: parsed.reasoning || '',
        confidence: parsed.confidence || 0,
      };

    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

  // ─── ai:fitmentChat ───────────────────────────────────────────────────────
  // محادثة ذكية متخصصة في توافقات المركبات لمنتج معين.
  // تُرجع رداً نصياً ومعلومات التوافقات المقترحة.

  ipcMain.handle('ai:fitmentChat', async (_e, payload: {
    product_id: number;
    product_name: string;
    product_barcode?: string;
    message: string;
    history?: AIMessage[];
  }) => {
    try {
      const config = loadAIConfig();
      if (!config) {
        return { success: false, error: 'يرجى ضبط إعدادات الذكاء الاصطناعي أولاً.' };
      }

      const raw = DatabaseService.getRawDb();

      // جلب التوافقات الحالية للمنتج
      const currentFitments: any[] = raw.prepare(`
        SELECT b.name as brand_name, m.name as model_name, m.year_from, m.year_to
        FROM product_fitments pf
        LEFT JOIN vehicle_models m ON pf.vehicle_model_id = m.id
        LEFT JOIN vehicle_brands b ON pf.vehicle_brand_id = b.id
        WHERE pf.product_id = ?
      `).all(payload.product_id);

      const currentFitmentsText = currentFitments.length > 0
        ? currentFitments.map((f: any) => {
            const yr = f.year_from && f.year_to ? ` (${f.year_from}-${f.year_to})` : '';
            return `  • ${f.brand_name} ${f.model_name}${yr}`;
          }).join('\n')
        : '  (لا توجد توافقات مسجّلة حتى الآن)';

      // جلب صورة المنتج الأساسية إن وجدت وتحويلها لـ Base64
      const pImg = getProductPrimaryImageBase64(payload.product_id);

      // بناء رسائل المحادثة مع سياق المنتج
      const systemMessage: AIMessage = {
        role: 'user',
        content: `أنت خبير متخصص في قطع غيار السيارات، تساعد موظف بيع في الجزائر.

🔧 **المنتج:** "${payload.product_name}"${payload.product_barcode ? ` | الباركود: \`${payload.product_barcode}\`` : ''}

🚗 **التوافقات المسجّلة حالياً في النظام:**
${currentFitmentsText}
${pImg ? '(مرفق صورة المنتج لمساعدتك في تقديم نصائح ومعلومات تقنية وتوافقات دقيقة للغاية بناءً عليها)' : ''}

**قواعد الإجابة — يجب الالتزام بها:**
- اكتب بالعربية دائماً وبأسلوب احترافي وودي
- نظّم إجاباتك بـ Markdown: استخدم ### للعناوين، **النص** للتمييز، - للقوائم
- استخدم الإيموجي بشكل طبيعي وممتاز لتحسين القراءة (🚗 ✅ ⚠️ 🔧 📋 💡)
- كن دقيقاً: حدد الماركة، الموديل، السنة، وحجم المحرك إن أمكن
- إذا كان هناك عدة إصدارات من نفس الموديل، اذكر الفروق بينها
- إذا لم تكن متأكداً، وضّح ذلك بصراحة مع ⚠️
- لا تكتب فقرات طويلة — استخدم القوائم والنقاط دائماً
- اجعل ردك قصيراً وعملياً ومريحاً للعين لتسهيل القراءة السريعة`,
        ...(pImg ? { image: { base64: pImg.base64, mimeType: pImg.mimeType } } : {}),
      };

      const assistantAck: AIMessage = {
        role: 'assistant',
        content: `مرحباً! 👋 أنا مساعد التوافقات لـ **${payload.product_name}**.

سأساعدك في معرفة:
- 🚗 المركبات المتوافقة مع هذه القطعة
- 📏 المقاسات والمواصفات التقنية
- ⚠️ أي فروق مهمة بين الموديلات

ما الذي تريد معرفته؟`,
      };

      const conversationHistory: AIMessage[] = [
        systemMessage,
        assistantAck,
        ...(payload.history || []),
        { role: 'user', content: payload.message },
      ];

      const result = await AIService.chat(config, conversationHistory);

      if (!result.success || !result.content) {
        return { success: false, error: result.error || 'فشل الذكاء الاصطناعي في الرد.' };
      }

      return {
        success: true,
        reply: result.content,
        usage: result.usage,
      };

    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });



  // ─── ai:smartSearch ────────────────────────────────────────────────────────
  // بحث متقدم بالذكاء الاصطناعي والصوت في المنتجات وقاعدة البيانات
  ipcMain.handle('ai:smartSearch', async (_e, userQuery: string) => {
    try {
      const config = loadAIConfig();
      if (!config) {
        return { success: false, error: 'يرجى ضبط إعدادات الذكاء الاصطناعي في الإعدادات أولاً.' };
      }
      if (getSetting(SETTINGS_KEYS.mode) !== 'automatic') {
        return { success: false, error: 'البحث بالذكاء الاصطناعي يتطلب تفعيل الوضع التلقائي ومفتاح API في الإعدادات.' };
      }

      const db = DatabaseService.getRawDb();

      const systemPrompt = `أنت مساعد بحث متخصص في قطع غيار السيارات لمتجر بيع.
مهمتك هي تحليل جملة بحث مكتوبة أو منطوقة من المستخدم (بالعربية أو الإنجليزية أو الفرنسية أو الدارجة) واستخراج محددات البحث المهيكلة لمطابقتها مع قاعدة بيانات المحل.
ملاحظة هامة: يجب عليك ترجمة الكلمات الصوتية أو الفونيمات الدارجة لأسماء السيارات والماركات إلى لغتها الأصلية بالإنجليزية (مثال: "ديفاسك" أو "ديفاسك" ترجعها "DFSK"، "كليو" ترجعها "Clio"، "بوش" ترجعها "Bosch"، "بريمبو" ترجعها "Brembo"، "ماروتي" ترجعها "Maruti").
يجب أن ترجع النتيجة بصيغة JSON فقط دون أي شرح أو مقدمات أو كتل ماركداون (no markdown blocks)، بالبنية التالية:
{
  "queries": [
    {
      "search": "اسم القطعة أو الكلمات المفتاحية باللغة التي كتب بها المستخدم أو بالفرنسية/العربية (مثل: بواجي، bougie، فلتر زيت، plaque de frein، courroie، ولا تترجمها إلى الإنجليزية إذا كانت عربية أو فرنسية الأصل)",
      "category": "اسم فئة المنتج بالعربية أو الفرنسية إن وُجدت (مثل فلاتر، فرامل، زيوت)",
      "vehicle_brand": "ماركة السيارة بالإنجليزية (مثل Renault, Peugeot, DFSK, Toyota, Suzuki)",
      "vehicle_model": "موديل السيارة بالإنجليزية (مثل Clio, Partner, K01, Hilux, Alto)",
      "spare_part_brand": "الماركة المصنعة للقطعة بالإنجليزية إن وجدت (مثل Bosch, Valeo, NGK, Brembo, Gates)"
    }
  ],
  "compatibility_analysis": "تحليل فني للمطابقة والتوافق إذا كان استفساراً من المستخدم، أو نصيحة فنية حول القطع المطلوبة وعلاقتها بالسيارة المذكورة.",
  "explanation": "جملة قصيرة باللغة العربية توضح فهمك للطلب العام."
}

أمثلة:
- المستخدم: "اريد منتجات ديفاسك"
الرد:
{
  "queries": [
    {
      "search": "",
      "category": "",
      "vehicle_brand": "DFSK",
      "vehicle_model": "",
      "spare_part_brand": ""
    }
  ],
  "compatibility_analysis": "",
  "explanation": "البحث عن جميع منتجات سيارات ديفاسك (DFSK)"
}
- المستخدم: "حبيت فلتر زيت وبواجي تاع كليو 4 بوش"
الرد:
{
  "queries": [
    {
      "search": "فلتر زيت",
      "category": "فلاتر",
      "vehicle_brand": "Renault",
      "vehicle_model": "Clio 4",
      "spare_part_brand": "Bosch"
    },
    {
      "search": "بواجي",
      "category": "كهرباء السيارة",
      "vehicle_brand": "Renault",
      "vehicle_model": "Clio 4",
      "spare_part_brand": "Bosch"
    }
  ],
  "compatibility_analysis": "تتطلب سيارات رينو كليو 4 فلاتر زيت متوافقة وشمعات إشعال (بواجي) بوش لإشعال وقود منتظم.",
  "explanation": "البحث عن فلتر زيت وبواجي بوش لسيارة كليو 4"
}
`;

      const messages: AIMessage[] = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userQuery }
      ];

      const result = await AIService.chat(config, messages, { jsonMode: true });

      if (result.success && result.content) {
        let criteria: any = {};
        try {
          criteria = JSON.parse(result.content);
        } catch {
          criteria = cleanAndParseJSON(result.content);
        }

        console.log('[AI Smart Search] Analyzed criteria:', criteria);

        const queries = Array.isArray(criteria.queries) ? criteria.queries : [];
        const explanation = criteria.explanation || '';
        const compatibilityAnalysis = criteria.compatibility_analysis || '';

        // If no queries returned, return empty results
        if (queries.length === 0) {
          return {
            success: true,
            data: [],
            explanation: explanation || 'لم أتمكن من استخلاص أي محددات للبحث.'
          };
        }

        const mergedProductsMap = new Map<number, any>();

        for (const q of queries) {
          const searchTerm = q.search ? String(q.search).trim() : '';
          const arabicFallback = userQuery.replace(/^(ابحث|اعطني|اريد|عندي|عطيني|بحث|اعطيني)\s+(عن|لي|عن)?\s*/i, '').trim();

          const searchPatterns = [
            searchTerm ? `%${searchTerm}%` : null,
            arabicFallback.length > 1 ? `%${arabicFallback}%` : null,
          ].filter(Boolean);
          const searchPattern   = searchPatterns[0] || '%';
          const searchPattern2  = searchPatterns[1] && searchPatterns[1] !== searchPattern ? searchPatterns[1] : searchPattern;

          const vehicleBrand = q.vehicle_brand ? String(q.vehicle_brand).trim() : '';
          const vehicleBrandPattern = vehicleBrand ? `%${vehicleBrand}%` : '%';
          const vehicleModel = q.vehicle_model ? String(q.vehicle_model).trim() : '';
          const vehicleModelPattern = vehicleModel ? `%${vehicleModel}%` : '%';
          const category = q.category ? String(q.category).trim() : '';
          const categoryPattern = category ? `%${category}%` : '%';
          const sparePartBrand = q.spare_part_brand ? String(q.spare_part_brand).trim() : '';
          const sparePartBrandPattern = sparePartBrand ? `%${sparePartBrand}%` : '%';

          const hasMeaningfulSearch = searchTerm.length > 0 || arabicFallback.length > 2;
          const hasVehicle = vehicleBrand.length > 0 || vehicleModel.length > 0;
          const hasCategory = category.length > 0;
          const hasBrand = sparePartBrand.length > 0;

          // Match FTS5 product IDs
          let matchingIds: number[] = [];
          
          if (hasMeaningfulSearch && searchTerm.length > 0) {
            const ftsQuery = compileFTS5Query(searchTerm, 'AND');
            if (ftsQuery) {
              try {
                const matches = db.prepare(`
                  SELECT product_id 
                  FROM product_search_fts 
                  WHERE product_search_fts MATCH ? 
                  LIMIT 100
                `).all(ftsQuery) as any[];
                matchingIds = matches.map(m => m.product_id);
              } catch (e) {
                console.error('[AI Smart Search] FTS search error for searchTerm:', e);
              }
            }
          }
          
          if (hasMeaningfulSearch && matchingIds.length === 0 && arabicFallback.length > 1) {
            const ftsQuery = compileFTS5Query(arabicFallback, 'AND');
            if (ftsQuery) {
              try {
                let matches = db.prepare(`
                  SELECT product_id 
                  FROM product_search_fts 
                  WHERE product_search_fts MATCH ? 
                  LIMIT 100
                `).all(ftsQuery) as any[];
                matchingIds = matches.map(m => m.product_id);

                const wcSearch = ftsQuery.split(' AND ').length;
                if (matchingIds.length === 0 && wcSearch <= 1) {
                  const ftsQueryOr = compileFTS5Query(arabicFallback, 'OR');
                  if (ftsQueryOr && ftsQueryOr !== ftsQuery) {
                    matches = db.prepare(`
                      SELECT product_id 
                      FROM product_search_fts 
                      WHERE product_search_fts MATCH ? 
                      LIMIT 100
                    `).all(ftsQueryOr) as any[];
                    matchingIds = matches.map(m => m.product_id);
                  }
                }
              } catch (e) {
                console.error('[AI Smart Search] FTS search error for arabicFallback:', e);
              }
            }
          }

          // Build WHERE clauses dynamically
          const whereParts: string[] = ['p.is_active = 1'];
          const params: Record<string, any> = {};

          if (hasMeaningfulSearch) {
            if (matchingIds.length > 0) {
              whereParts.push(`(p.id IN (${matchingIds.join(',')}) OR p.barcode = :exact_fallback OR p.internal_code = :exact_fallback)`);
              params.exact_fallback = arabicFallback;
            } else {
              const textClause = `(
                p.name         LIKE :search  OR p.name_fr       LIKE :search
                OR p.barcode   LIKE :search  OR p.internal_code LIKE :search
                OR p.name      LIKE :search2 OR p.name_fr       LIKE :search2
              )`;
              whereParts.push(textClause);
              params.search  = searchPattern;
              params.search2 = searchPattern2;
            }
          }

          if (hasCategory) {
            const catClause = hasMeaningfulSearch
              ? `OR (c.name LIKE :category OR c.name_fr LIKE :category)`
              : `(c.name LIKE :category OR c.name_fr LIKE :category)`;
            if (hasMeaningfulSearch) {
              const last = whereParts[whereParts.length - 1];
              whereParts[whereParts.length - 1] = last.replace(/\)\s*$/, `\n            ${catClause}\n          )`);
            } else {
              whereParts.push(catClause);
            }
            params.category = categoryPattern;
          } else {
            params.category = '%';
          }

          if (hasBrand) {
            whereParts.push(`b.name LIKE :spare_part_brand`);
            params.spare_part_brand = sparePartBrandPattern;
          }

          if (hasVehicle) {
            whereParts.push(`(
              p.name LIKE :vehicle_brand_like OR p.name_fr LIKE :vehicle_brand_like
              OR p.id IN (
                SELECT pf.product_id FROM product_fitments pf
                LEFT JOIN vehicle_brands vb ON pf.vehicle_brand_id = vb.id
                LEFT JOIN vehicle_models vm ON pf.vehicle_model_id = vm.id
                WHERE (vb.name LIKE :vehicle_brand_like)
                  AND (:vehicle_model = '' OR vm.name LIKE :vehicle_model_like)
              )
            )`);
            params.vehicle_brand_like  = vehicleBrandPattern;
            params.vehicle_model       = vehicleModel;
            params.vehicle_model_like  = vehicleModelPattern;
          }

          const whereClause = whereParts.join('\n            AND ');

          const queryStr = `
            SELECT DISTINCT p.id, p.barcode, p.internal_code, p.name, p.name_fr, p.retail_price, 
                   COALESCE(sb.quantity, 0) as quantity, u.name as unit_name,
                   b.name as brand_name, c.name as category_name
            FROM products p
            LEFT JOIN (SELECT product_id, SUM(quantity) as quantity FROM stock_balances GROUP BY product_id) sb ON p.id = sb.product_id
            LEFT JOIN units u ON p.unit_id = u.id
            LEFT JOIN brands b ON p.brand_id = b.id
            LEFT JOIN categories c ON p.category_id = c.id
            WHERE ${whereClause}
            ORDER BY
              CASE WHEN p.barcode = :exact OR p.internal_code = :exact THEN 0 ELSE 1 END,
              CASE WHEN COALESCE(sb.quantity,0) > 0 THEN 0 ELSE 1 END,
              COALESCE(sb.quantity, 0) DESC
            LIMIT 25
          `;

          params.exact = userQuery.trim();

          try {
            const stmt = db.prepare(queryStr);
            const rows = stmt.all(params) as any[];
            for (const r of rows) {
              if (!mergedProductsMap.has(r.id)) {
                mergedProductsMap.set(r.id, r);
              }
            }
          } catch (e) {
            console.error('[AI Smart Search] SQL execution error:', e);
          }
        }

        // Fetch fitments for all unique matched products
        const productsList = Array.from(mergedProductsMap.values());
        const productsWithFits = productsList.map(r => {
          const fitments = db.prepare(`
            SELECT vb.name as brand, vm.name as model, pf.year_from, pf.year_to
            FROM product_fitments pf
            LEFT JOIN vehicle_brands vb ON pf.vehicle_brand_id = vb.id
            LEFT JOIN vehicle_models vm ON pf.vehicle_model_id = vm.id
            WHERE pf.product_id = ?
            LIMIT 3
          `).all(r.id) as any[];

          const fitStrings = fitments.map(f => `${f.brand} ${f.model || ''} ${f.year_from ? `(${f.year_from}-${f.year_to || ''})` : ''}`.trim());

          return {
            id: r.id,
            barcode: r.barcode || '',
            internal_code: r.internal_code || '',
            name: r.name,
            name_fr: r.name_fr || '',
            brand: r.brand_name || '',
            category: r.category_name || '',
            price: r.retail_price,
            stock: r.quantity,
            unit_name: r.unit_name || 'حبة',
            fits: fitStrings.join(' | ') || 'عام / غير محدد'
          };
        });

        // Combine general explanation and technical compatibility analysis
        let finalExplanation = explanation;
        if (compatibilityAnalysis) {
          finalExplanation = `${explanation}\n\n🔍 التحليل الفني للتوافق:\n${compatibilityAnalysis}`;
        }

        return {
          success: true,
          data: productsWithFits,
          explanation: finalExplanation || 'تم البحث بناءً على فهم العبارة.'
        };
      }

      return { success: false, error: result.error || 'لم يتمكن الذكاء الاصطناعي من تحليل طلب البحث.' };
    } catch (e: any) {
      console.error('[AI Smart Search Error]', e);
      return { success: false, error: e.message };
    }
  });

  // ─── ai:checkProductsCompatibility ──────────────────────────────────────────
  // تحليل مدى توافق المنتجات المتوفرة في المخزن مع استفسار المستخدم بالاستعانة بالإنترنت
  ipcMain.handle('ai:checkProductsCompatibility', async (_e, payload: {
    userQuestion: string;
  }) => {
    try {
      const config = loadAIConfig();
      if (!config) {
        return { success: false, error: 'يرجى ضبط إعدادات الذكاء الاصطناعي في الإعدادات أولاً.' };
      }
      if (getSetting(SETTINGS_KEYS.mode) !== 'automatic') {
        return { success: false, error: 'هذه الميزة تتطلب تفعيل الوضع التلقائي ومفتاح API في الإعدادات.' };
      }

      const { userQuestion } = payload;
      if (!userQuestion || !userQuestion.trim()) {
        return { success: false, error: 'الرجاء إدخال سؤال للتحقق من التوافق.' };
      }

      const rawDb = DatabaseService.getRawDb();
      // جلب جميع المنتجات المتوفرة حالياً في المخزن ولديها كمية موجبة
      const inStockProducts = rawDb.prepare(`
        SELECT p.id, p.barcode, p.internal_code, p.name, p.name_fr,
               b.name as brand_name, c.name as category_name,
               (
                 SELECT GROUP_CONCAT(vb.name || ' ' || vm.name, ' | ') 
                 FROM product_fitments pf
                 JOIN vehicle_models vm ON pf.vehicle_model_id = vm.id
                 JOIN vehicle_brands vb ON vm.vehicle_brand_id = vb.id
                 WHERE pf.product_id = p.id
               ) as fitments_list,
               COALESCE(sb.quantity, 0) as total_stock
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        LEFT JOIN brands b ON p.brand_id = b.id
        LEFT JOIN (SELECT product_id, SUM(quantity) as quantity FROM stock_balances GROUP BY product_id) sb ON p.id = sb.product_id
        WHERE p.is_active = 1 AND COALESCE(sb.quantity, 0) > 0
      `).all() as any[];

      if (inStockProducts.length === 0) {
        return {
          success: true,
          matchedProducts: [],
          analysis: 'لا توجد أي منتجات متوفرة حالياً في المخزن للتحقق من توافقها.'
        };
      }

      const productsPromptText = inStockProducts.map((p, idx) => {
        return `${idx + 1}. ID: ${p.id} | الاسم: ${p.name} ${p.name_fr ? `(${p.name_fr})` : ''} | الكود: ${p.barcode || p.internal_code || 'بدون كود'} | الماركة: ${p.brand_name || 'غير محددة'} | التصنيف: ${p.category_name || 'غير محدد'} | التوافقات في المحل: ${p.fitments_list || 'عام / غير محدد'}`;
      }).join('\n');

      const prompt = `أنت خبير فني محترف في قطع غيار السيارات ومستشار مبيعات.
المستخدَم يريد معرفة أي من المنتجات المتوفرة حالياً لدينا في المخزن تتوافق مع سؤاله/طلبه.

المنتجات المتوفرة في المخزن لدينا حالياً:
${productsPromptText}

سؤال المستخدم: "${userQuestion}"

المطلوب:
1. قم بتحليل المنتجات المذكورة أعلاه بعناية ومطابقتها مع المركبة أو المتطلبات المذكورة في سؤال المستخدم.
2. استخدم معرفتك الفنية العميقة واستعن بـ (Google Search) للبحث والتحقق من توافق المنتجات وأرقام الـ OEM والرموز ومواصفات المحركات المتوافقة (مثل محركات 1.6 HDI أو 1.2 PureTech أو 1.5 dCi ومطابقتها مع سيارات Peugeot, Renault, Citroen إلخ).
3. حدد أي من هذه المنتجات الخاصة بنا يتوافق تماماً مع طلب المستخدم، وأيها لا يتوافق، مع تبرير ذلك فنيّاً وبوضوح وثقة.
4. يجب أن تُرجع إجابة بصيغة JSON تماماً وبشرط عدم إرجاع أي نص إضافي خارج قالب الـ JSON التالي:
{
  "matched_product_ids": [<قائمة بمعرفات المنتجات المتوافقة من القائمة أعلاه، مثال: [1, 5, 12]>],
  "unmatched_product_ids": [<قائمة بمعرفات المنتجات غير المتوافقة>],
  "analysis": "<شرح فني موجز وواضح عن سبب التوافق أو عدمه لكل منتج>"
}
`;

      const messages = [{ role: 'user' as const, content: prompt }];
      const aiResult = await AIService.chat(config, messages);

      let parsed: any;
      try {
        const rawContent = aiResult.content || '';
        const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
        parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
      } catch {
        parsed = null;
      }

      const matchedIds: number[] = parsed?.matched_product_ids || [];
      const matchedProducts = inStockProducts.filter(p => matchedIds.includes(p.id));

      return {
        success: true,
        matchedProducts,
        analysis: parsed?.analysis || aiResult.content || '',
      };
    } catch (err: any) {
      console.error("[ai:checkProductsCompatibility]", err);
      return { success: false, error: err.message || String(err) };
    }
  });

} // end registerAIIPC

// ─── Utility Helpers ────────────────────────────────────────────────────────

function cleanAndParseJSON(text: string): any {
  // Strip markdown code fences if present
  let clean = text.trim();
  const fenceMatch = clean.match(/^```(?:json)?\s*([\s\S]*?)```\s*$/);
  if (fenceMatch) clean = fenceMatch[1].trim();
  // Find first { or [ and last } or ]
  const start = clean.search(/[{[]/);
  const endBrace = clean.lastIndexOf('}');
  const endBracket = clean.lastIndexOf(']');
  const end = Math.max(endBrace, endBracket);
  if (start >= 0 && end > start) clean = clean.slice(start, end + 1);
  return JSON.parse(clean);
}

function parseInvoiceJSON(text: string): any {
  return cleanAndParseJSON(text);
}

function executeCheckZeroStockProductsTool(db: any, dateFrom?: string, dateTo?: string): string {
  try {
    let query = `
      SELECT p.id, p.barcode, p.internal_code, p.name, p.created_at,
             COALESCE(sb.qty, 0) as quantity
      FROM products p
      LEFT JOIN (
        SELECT product_id, SUM(quantity) as qty
        FROM stock_balances GROUP BY product_id
      ) sb ON p.id = sb.product_id
      WHERE p.is_active = 1 AND p.is_hidden_from_sales = 0 AND COALESCE(sb.qty, 0) = 0
    `;
    const params: any[] = [];
    if (dateFrom && dateFrom.trim() !== '') {
      query += ` AND date(p.created_at) >= date(?)`;
      params.push(dateFrom.trim());
    }
    if (dateTo && dateTo.trim() !== '') {
      query += ` AND date(p.created_at) <= date(?)`;
      params.push(dateTo.trim());
    }
    query += ` ORDER BY p.created_at DESC`;
    const rows = db.prepare(query).all(...params) as any[];

    return JSON.stringify({
      count: rows.length,
      sample_products: rows.slice(0, 10).map(r => ({
        id: r.id,
        name: r.name,
        barcode: r.barcode || '',
        code: r.internal_code || '',
        created_at: r.created_at
      }))
    }, null, 2);
  } catch (err: any) {
    return `Error: ${err.message}`;
  }
}

function executeSearchProductsTool(db: any, query: string): string {
  try {
    if (!query || !query.trim()) return 'لم يتم تحديد كلمة بحث.';
    const searchPattern = `%${query.trim()}%`;
    const rows = db.prepare(`
      SELECT p.id, p.barcode, p.internal_code, p.name, p.name_fr, p.retail_price,
             COALESCE(sb.quantity, 0) as quantity, u.name as unit_name,
             b.name as brand_name,
             (SELECT file_path FROM product_images WHERE product_id = p.id AND is_primary = 1 LIMIT 1) as primary_image
      FROM products p
      LEFT JOIN (SELECT product_id, SUM(quantity) as quantity FROM stock_balances GROUP BY product_id) sb ON p.id = sb.product_id
      LEFT JOIN units u ON p.unit_id = u.id
      LEFT JOIN brands b ON p.brand_id = b.id
      WHERE p.is_active = 1
        AND (p.name LIKE ? OR p.name_fr LIKE ? OR p.barcode LIKE ? OR p.internal_code LIKE ?)
      LIMIT 10
    `).all(searchPattern, searchPattern, searchPattern, searchPattern) as any[];

    if (rows.length === 0) return 'لم يتم العثور على أي منتج يطابق هذا البحث.';

    return JSON.stringify(rows.map(r => ({
      id: r.id,
      name: r.name,
      name_fr: r.name_fr || '',
      barcode: r.barcode || '',
      code: r.internal_code || '',
      price: r.retail_price,
      stock: `${r.quantity} ${r.unit_name || 'حبة'}`,
      brand: r.brand_name || '',
      image: r.primary_image || null
    })), null, 2);
  } catch (err: any) {
    return `Error: ${err.message}`;
  }
}

function executeGetProductDetailTool(db: any, id: number): string {
  try {
    const product = db.prepare(`
      SELECT p.id, p.barcode, p.internal_code, p.name, p.name_fr, p.purchase_price, p.wholesale_price, p.retail_price,
             p.min_stock_level, p.description, c.name as category_name, b.name as brand_name, u.name as unit_name,
             COALESCE(sb.quantity, 0) as quantity
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN brands b ON p.brand_id = b.id
      LEFT JOIN units u ON p.unit_id = u.id
      LEFT JOIN (SELECT product_id, SUM(quantity) as quantity FROM stock_balances GROUP BY product_id) sb ON p.id = sb.product_id
      WHERE p.id = ? AND p.is_active = 1
    `).get(id) as any;

    if (!product) return `المنتج ذو المعرف (${id}) غير موجود في النظام أو محذوف.`;

    const fitments = db.prepare(`
      SELECT vb.name as brand, vm.name as model, pf.year_from, pf.year_to, pf.engine, pf.notes
      FROM product_fitments pf
      LEFT JOIN vehicle_brands vb ON pf.vehicle_brand_id = vb.id
      LEFT JOIN vehicle_models vm ON pf.vehicle_model_id = vm.id
      WHERE pf.product_id = ?
    `).all(id) as any[];

    const images = db.prepare(`
      SELECT file_path, is_primary FROM product_images WHERE product_id = ?
    `).all(id) as any[];

    return JSON.stringify({
      info: {
        id: product.id,
        name: product.name,
        name_fr: product.name_fr || '',
        barcode: product.barcode || '',
        code: product.internal_code || '',
        category: product.category_name || '',
        brand: product.brand_name || '',
        description: product.description || '',
        unit: product.unit_name || 'حبة',
        images: images.map((img: any) => ({ file_path: img.file_path, is_primary: img.is_primary === 1 }))
      },
      stock: { current: product.quantity, min_level: product.min_stock_level },
      pricing: { purchase: product.purchase_price, wholesale: product.wholesale_price, retail: product.retail_price },
      fits: fitments.map((f: any) => `${f.brand} ${f.model || ''} ${f.year_from ? `(${f.year_from}-${f.year_to || 'الآن'})` : ''} ${f.engine || ''} ${f.notes || ''}`.trim())
    }, null, 2);
  } catch (err: any) {
    return `Error: ${err.message}`;
  }
}

async function executeGenerateProductImagePrompts(db: any, productId: number, config: any): Promise<string> {
  try {
    const product = db.prepare(`
      SELECT p.id, p.name, p.name_fr, b.name as brand_name, c.name as category_name
      FROM products p
      LEFT JOIN brands b ON p.brand_id = b.id
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.id = ? AND p.is_active = 1
    `).get(productId) as any;

    if (!product) {
      return `المنتج رقم (${productId}) غير موجود في المخزن أو محذوف.`;
    }

    const imgs = getAllProductImagesBase64(productId);
    
    const prompt = `أنت خبير هندسي وتصميم بصري محترف لقطع غيار السيارات والمنتجات الصناعية التجارية.
المهمة: دراسة صورة وتفاصيل قطعة منتج معين بالذكاء الاصطناعي بشكل دقيق، وتحديد الخلفية الفنية وحل الدعم الفيزيائي الأنسب لهندستها وملمسها، ثم توليد موجهات (Prompts) دقيقة باللغة الإنجليزية لتصوير القطعة في أفضل حالة استوديو احترافية (Pristine Showroom Condition).
المنتج: "${product.name}" ${product.name_fr ? `(${product.name_fr})` : ''}
الماركة: ${product.brand_name || 'غير حددّة'}
التصنيف: ${product.category_name || 'غير محدد'}

## منهجية دراسة القطعة واختيار الخلفية (خطوات إلزامية للذكاء الاصطناعي):
1. **دراسة طبيعة وهندسة القطعة**:
   - قم بتحليل الصورة بدقة لتحديد شكل القطعة (مثل: أسطواني طويل tall-cylindrical، قرص مسطح flat-disc، كتلة غير منتظمة bulky-irregular، أو هيكل معقد صغير small-complex).
   - حدد نوع المعدن أو المواد (كروم لامع، حديد صلب داكن، مطاط، أجزاء بلاستيكية، إلخ) ودرجة انعكاسها للضوء.
   - حدد زاوية الوقوف الطبيعية للقطعة (Natural Orientation) التي تُبرز تفاصيلها الهندسية بوضوح دون أن تبدو غير متوازنة.

2. **اختيار بيئة التصوير والخلفية الاحترافية الملائمة (دون إجبار على مادة معينة)**:
   - يجب دراسة طبيعة ومادة المنتج واختيار الخلفية الأنسب من بين هذه الأساليب الأربعة ليعطي انطباعاً بالفخامة والاحترافية والتركيز التام على المنتج نفسه (التركيز البصري والوصف الفني يتركز 90% على القطعة وتفاصيلها الهندسية ومعدنها، وتكون الخلفية بسيطة ومحايدة تماماً ولا تشوش أو تطغى على المنتج بأي شكل):
     * **الأسلوب (أ) - الطفو والانعكاس الداكن (Premium Dark Reflective Glass)**: للقطع اللامعة، الكروم، أو الحساسة والكهربائية (مثل البواجي، البخاخات، المكابس). توضع القطعة تطفو قليلاً فوق سطح زجاجي أسود مصقول عاكس تماماً مع إضاءة دراماتيكية خافتة ومركزة (Moody Studio Lighting).
     * **الأسلوب (ب) - سطح لوحي أو خرساني داكن (Premium Dark Slate / Dark Stone Surface)**: للقطع الميكانيكية اللامعة وأجزاء التعليق والحركة (مثل أعمدة المقود، المساعدين، الكليبرات). يوضع المنتج على سطح حجر لوحي داكن أو خرسانة ناعمة داكنة ذات ملمس خفيف محايد يبرز حواف القطعة ومعدنها دون مبالغة.
     * **الأسلوب (جـ) - منضدة الهندسة والورشة الراقية (Premium Engineering Studio Bench)**: للقطع الميكانيكية الثقيلة أو الصناعية والتروس وعلب السرعة. يوضع المنتج على طاولة عمل خشبية مصقولة أو سطح معدني صناعي راقٍ، مع وجود مخططات هندسية خافتة (Subtle Blueprints) أو أدوات قياس دقيقة (مثل الفرجار Caliper) في الخلفية البعيدة معزولة بفوكس فني ضبابي (Depth of Field / Bokeh).
     * **الأسلوب (د) - بيئة استوديو محايدة مخصصة**: إذا كانت القطعة لا تناسب الأساليب السابقة (مثل إطار مطاطي، فلتر هواء ورقي)، صمم بيئة استوديو محايدة وراقية تلائم القطعة وتركز عليها.
   - يمنع منعاً باتاً إجبار الخلفية على أن تكون جلدية، لتجنب قيام نموذج توليد الصور بتوليد أثاث أو كراسي أو سيارات بدلاً من الاستوديو. يجب أن تظل الخلفية مسطحة ومحايدة وبسيطة جداً.
   - اكتب تبريراً هندسياً مفصلاً باللغة العربية في حقل "background_reasoning" تشرح فيه لماذا هذا الأسلوب بالذات هو الأفضل لعرض هذه القطعة بالذات بناءً على مادتها واستخدامها وهندستها.

3. **قاعدة اللقطة الفردية الصارمة (منع انقسام الصورة - Single Hero Shot Rule)**:
   - يجب أن يصف كل موجه (Prompt) في JSON صورة واحدة لمنتج واحد من زاوية واحدة فقط.
   - إذا أرسل المستخدم أو توفر للقطعة عدة صور من زوايا مختلفة، يجب عليك دراستها وتحليلها معاً لفهم تفاصيلها، ولكن يجب صياغة الموجه (Prompt) ليعرض صورة واحدة موحدة من زاوية واحدة ممتازة وجذابة للقطعة (Best Hero Angle / Single View).
   - يمنع منعاً باتاً صياغة موجهات تصف صورتين أو تقسم الشاشة أو تقارن أو تصف زوايا متعددة في نفس الموجه (مثل: front and back view, side-by-side, split-screen, collage, diptych, before/after, dual angles).
   - تأكد من إضافة عبارات واضحة للموجه الإنجليزي تمنع التقسيم مثل: "single unified shot of one product, single angle view, no split screen, no side-by-side views, single camera capture, single object focus".
   - يُمنع وصف أي جوانب أو زوايا أخرى للمنتج بخلاف الزاوية المحددة للبرومبت الحالي. لا تصف الوجه الخلفي أو الداخلي في برومبت مخصص للقطة الأمامية.

4. **تجنب الخلفيات البيضاء للمنتجات المعدنية (قاعدة التباين الفخم - Luxury Contrast Rule)**:
   - يمنع تماماً استخدام الخلفيات البيضاء أو الرمادية الباهتة (Avoid plain white background / isolated on white) للقطع المعدنية (مثل المكابس والمساعدين وأي أجزاء ميكانيكية لامعة).
   - يجب أن تعكس الموجهات المكتوبة بدقة تفاصيل الخلفية الاحترافية الداكنة المختارة باللغة الإنجليزية في \`midjourney_prompt\` و \`dalle_prompt\` و \`prompts_by_angle\` (مثل: "resting on a premium dark textured slate surface", "floating over highly reflective black obsidian glass").

5. **تصميم حل الدعم الفيزيائي وحامل العرض (Display Stand) الواقعي والمنطقي**:
   - يمنع منعاً باتاً إظهار يد بشرية أو أصابع ممسكة بالقطعة في أي موجه.
   - ادرس كيف يمكن للقطعة أن تقف بثبات أو تُعرض بشكل احترافي، وصمم حلاً فيزيائياً منطقياً وواقعياً للغاية لعرضها (ولا تبتكر أشكالاً هلامية أو خيالية غير واقعية أو غير قادرة فيزيائياً على حمل وزن وشكل القطعة).
   - اختر من بين خيارات الدعم الواقعية التالية:
     * **حامل الكروم أو الفولاذ المصقول (Minimalist Chrome / Stainless Steel Display Stand)**: مشابك أو أذرع معدنية متينة وواقعية تدعم القطع الطويلة أو الأسطوانية رأسياً أو مائلاً بشكل ثابت.
     * **قاعدة الأكريليك الشفاف (Transparent Acrylic block / Pedestal)**: لرفع القطع الصغيرة أو المستديرة لمنحها مظهراً معلقاً فخماً بشكل فيزيائي ثابت.
     * **القاعدة المغناطيسية السوداء المطغية (Matte Black Magnetic/Steel Base)**: لتثبيت القطع الثقيلة وغير المنتظمة بشكل وقور.
     * **الاستناد الطبيعي بزاوية هندسية (Natural Angular Resting)**: للقطع التي تقف بثبات على السطح تلقائياً (مثل أقراص المكابح أو الإطارات) وتُعرض مستندة بزاوية 45 درجة دون الحاجة لحامل.
   - اكتب هذا الحل بالتفصيل باللغة الإنجليزية في حقل "support_solution".

6. **صياغة الأوصاف بدقة هندسية عالية**:
   - في الموجهات (Prompts)، لا تكتفِ بذكر الاسم العام للمنتج، بل صف المكونات المرئية للقطعة (مثل: الفلنجات flanges، المفصلات universal joints، المسامير bolts، الأسطح المسننة splined shafts، إلخ) بدقة لمنع تشوه التفاصيل عند التوليد.
   - حافظ على هيكل القطعة الدقيق ليكون قابلاً للتصنيع والاستخدام الواقعي.

أرجع الإجابة كـ JSON فقط داخل كتلة برمجية واحدة (\`\`\`json) دون أي نصوص تسويقية أو شرح خارج الـ JSON.

الهيكل المطلوب للـ JSON:
\`\`\`json
{
  "shape_analysis": {
    "geometry_type": "[tall-cylindrical / flat-disc / bulky-irregular / small-complex]",
    "natural_orientation": "[كيف تقف القطعة طبيعياً لو وُضعت على سطح بالإنجليزية]",
    "support_solution": "[الحل المادي المستخدم بدلاً من اليد أو لدعم القطعة بالإنجليزية، مثلاً: resting diagonally on a dark concrete surface / mounted upright in a chrome display stand]",
    "detected_hands": [true/false],
    "recommended_background": "[نوع الخلفية ومبررها بجملة واحدة بالإنجليزية]"
  },
  "product_enhancement": "Remove all scratches, dust, smudges and surface imperfections. Polish metal parts to a clean shine. Enhance color saturation and contrast. Show the product in pristine, brand-new showroom condition.",
  "midjourney_prompt": "[Detailed English Midjourney prompt, single hero shot, single angle, no split-screen, no side-by-side, set against the selected premium dark/textured slate or glass background (absolutely no white background, no chairs, no car seats, no furniture), moody studio lighting, realistic reflections, camera capture...]",
  "dalle_prompt": "[Detailed English DALL-E prompt, professional studio product photography, single product, single view, no collage, set against the chosen luxury dark background (e.g. reflective dark glass or dark slate stone, absolutely no white background, no furniture, no seats), high contrast...]",
  "stable_diffusion": {
    "positive_prompt": "[English Stable Diffusion positive prompt, single hero shot, single angle, set against the selected premium dark/textured background (no white background, no chairs)...]",
    "negative_prompt": "hands, fingers, person, human, blurry, low quality, deformed, watermark, text, split-screen, side-by-side, collage, diptych, multiple views, multi-panel, dual views, chair, seat, sofa, furniture, car seat, vehicle interior, cushion, armchair",
    "controlnet_recommendation": "Use Canny or Depth ControlNet to lock original geometry"
  },
  "prompts_by_angle": [
    {
      "angle_description": "[e.g. Front View / Side View / 45-degree hero shot]",
      "support_in_this_angle": "[How it is supported in this angle]",
      "midjourney_prompt": "[Midjourney prompt for this angle, single unified shot, no split screen, set against the selected luxury dark background (no white background)...]",
      "dalle_prompt": "[DALL-E prompt for this angle, single view, no split screen, set against the selected luxury dark background (no white background)...]",
      "stable_diffusion_prompt": "[Stable Diffusion prompt for this angle, single view, no split screen, set against the selected luxury dark background (no white background)...]"
    }
  ],
  "visual_breakdown": {
    "exact_geometry": "[Detailed structural and geometric description of all components in English]",
    "lighting": "[Studio lighting style in English]",
    "environment": "[Background and environment description in English]",
    "background_reasoning": "[شرح سبب اختيار الخلفية فنيّاً باللغة العربية]"
  }
}
\`\`\``;


    const messages = [
      {
        role: 'user' as const,
        content: prompt + (imgs.length > 0 ? `\n\n(تم إرفاق ${imgs.length} صورة للمنتج من زوايا مختلفة لمساعدتك في توليد الأوصاف والـ Prompts للصور بشكل فائق الدقة ومطابق لواقع القطعة)` : ''),
        ...(imgs.length > 0 ? { images: imgs, image: imgs[0] } : {})
      }
    ];

    const result = await AIService.chat(config, messages, { jsonMode: true });
    if (result.success && result.content) {
      return result.content;
    }
    return `فشل توليد موجهات الصور بالذكاء الاصطناعي: ${result.error || 'خطأ غير معروف'}`;
  } catch (err: any) {
    return `خطأ أثناء توليد موجهات الصور للقطعة: ${err.message}`;
  }
}

async function executeGenerateProductMarketing(db: any, productId: number, config: any): Promise<string> {
  try {
    const product = db.prepare(`
      SELECT p.id, p.name, p.name_fr, b.name as brand_name, c.name as category_name
      FROM products p
      LEFT JOIN brands b ON p.brand_id = b.id
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.id = ? AND p.is_active = 1
    `).get(productId) as any;

    if (!product) {
      return `المنتج رقم (${productId}) غير موجود في المخزن أو محذوف.`;
    }

    const imgs = getAllProductImagesBase64(productId);
    
    const prompt = `أنت خبير تسويق وتجارة إلكترونية محترف متخصص في قطع غيار السيارات.
المهمة: توليد أفكار تسويقية مميزة وصياغة منشورات إعلانية لمنتج معين.
المنتج: "${product.name}" ${product.name_fr ? `(${product.name_fr})` : ''}
الماركة: ${product.brand_name || 'غير محددة'}
التصنيف: ${product.category_name || 'غير محدد'}

المطلوب:
1. صياغة شعار تسويقي (Slogan) قوي ومبتكر للمنتج بالعربية.
2. تحديد الجمهور المستهدف (Target Audience) للمنتج بدقة.
3. صياغة منشور إعلاني إبداعي وجذاب لوسائل التواصل الاجتماعي (مثل فيسبوك وإنستغرام) باللغتين العربية والفرنسية مع استخدام الرموز التعبيرية (Emojis) والهاشتاغات المناسبة لقطع الغيار.
4. تقديم أفكار ترويجية وقنوات تسويقية فعالة للوصول للزبائن.

أرجع الإجابة كـ JSON فقط داخل كتلة برمجية واحدة (\`\`\`json) بالهيكل التالي دون أي شرح خارجي:
\`\`\`json
{
  "product_name": "${product.name}",
  "marketing_slogan": "[الشعار التسويقي المقترح بالعربية]",
  "target_audience": "[توصيف دقيق للجمهور المستهدف بالعربية]",
  "social_media_post_ar": "[المنشور الإعلاني بالعربية مع الرموز التعبيرية والهاشتاغات]",
  "social_media_post_fr": "[المنشور الإعلاني بالفرنسية مع الرموز التعبيرية والهاشتاغات]",
  "promotion_ideas": [
    "[الفكرة الترويجية الأولى أو قناة التسويق الأولى]",
    "[الفكرة الترويجية الثانية...]"
  ]
}
\`\`\``;

    const messages = [
      {
        role: 'user' as const,
        content: prompt + (imgs.length > 0 ? `\n\n(تم إرفاق ${imgs.length} صورة للمنتج لمساعدتك في فهم القطعة وخصائصها وصياغة منشور تسويقي ملائم)` : ''),
        ...(imgs.length > 0 ? { images: imgs, image: imgs[0] } : {})
      }
    ];

    const result = await AIService.chat(config, messages, { jsonMode: true });
    if (result.success && result.content) {
      return result.content;
    }
    return `فشل توليد التحليل التسويقي بالذكاء الاصطناعي: ${result.error || 'خطأ غير معروف'}`;
  } catch (err: any) {
    return `خطأ أثناء توليد التسويق للقطعة: ${err.message}`;
  }
}

function executeSearchPartiesTool(db: any, query: string): string {
  try {
    const searchPattern = `%${query.trim()}%`;

    const customers = db.prepare(`
      SELECT id, name, phone, balance, 'زبون' as type
      FROM customers
      WHERE name LIKE ? OR phone LIKE ?
      LIMIT 5
    `).all(searchPattern, searchPattern) as any[];

    const suppliers = db.prepare(`
      SELECT id, name, phone, balance, 'مورد' as type
      FROM suppliers
      WHERE name LIKE ? OR phone LIKE ?
      LIMIT 5
    `).all(searchPattern, searchPattern) as any[];

    const results = [...customers, ...suppliers];

    if (results.length === 0) {
      return "لم يتم العثور على أي زبون أو مورد بهذا الاسم.";
    }

    return JSON.stringify(results.map(r => ({
      id: r.id,
      name: r.name,
      phone: r.phone || '',
      type: r.type,
      debt_balance: r.balance
    })), null, 2);
  } catch (err: any) {
    return `Error: ${err.message}`;
  }
}

function executeGetSalesReportTool(db: any, days: number): string {
  try {
    const dateLimit = new Date();
    dateLimit.setDate(dateLimit.getDate() - days);
    const dateLimitStr = dateLimit.toISOString().split('T')[0];

    const stats = db.prepare(`
      SELECT 
        COUNT(*) as total_invoices,
        COALESCE(SUM(total), 0) as total_revenue,
        COALESCE(SUM(paid), 0) as total_collected,
        COALESCE(SUM(remaining), 0) as total_debts_added
      FROM sales_invoices
      WHERE date >= ? AND status = 'confirmed'
    `).get(dateLimitStr) as any;

    const topItems = db.prepare(`
      SELECT 
        item.product_name_snapshot as name,
        SUM(item.quantity) as qty_sold,
        COALESCE(SUM(item.total), 0) as revenue
      FROM sales_invoice_items item
      JOIN sales_invoices inv ON item.invoice_id = inv.id
      WHERE inv.date >= ? AND inv.status = 'confirmed'
      GROUP BY item.product_id
      ORDER BY qty_sold DESC
      LIMIT 5
    `).all(dateLimitStr) as any[];

    return JSON.stringify({
      period_days: days,
      since_date: dateLimitStr,
      summary: {
        total_confirmed_invoices: stats?.total_invoices || 0,
        revenue: stats?.total_revenue || 0,
        collected: stats?.total_collected || 0,
        unpaid_debts_created: stats?.total_debts_added || 0
      },
      top_5_products_sold: topItems
    }, null, 2);
  } catch (err: any) {
    return `Error: ${err.message}`;
  }
}