/**
 * AI Service — SparePartsERP
 * خدمة الذكاء الاصطناعي المركزية بدون مكتبات خارجية
 * تدعم: Google Gemini · OpenAI · NVIDIA NIM · OpenAI-Compatible (Ollama / LM Studio)
 *
 * جميع الاتصالات تتم من Main Process فقط — لا يُكشف الـ API Key للـ Renderer أبداً.
 */
import https from 'https';

// ─── Types ────────────────────────────────────────────────────────────────────

export type AIProvider = 'gemini' | 'openai' | 'nvidia' | 'openai-compatible';

export interface AIConfig {
  provider: AIProvider;
  apiKey: string;
  model?: string;    // إذا فارغ → يُستخدم النموذج الافتراضي للموفر
  baseUrl?: string;  // للموفرين المخصصين (Ollama: http://localhost:11434, إلخ)
}

export interface AIMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  image?: {
    base64: string;
    mimeType: string;
  };
  images?: {
    base64: string;
    mimeType: string;
  }[];
}

export interface AIResponse {
  success: boolean;
  content?: string;
  error?: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface AITestResult {
  success: boolean;
  latencyMs?: number;
  model?: string;
  error?: string;
}

// ─── Default Models ────────────────────────────────────────────────────────────

const DEFAULT_MODELS: Record<AIProvider, string> = {
  gemini: 'gemini-2.5-flash',
  openai: 'gpt-4o-mini',
  nvidia: 'meta/llama-3-70b-instruct',
  'openai-compatible': 'llama3',
};

const DEFAULT_BASE_URLS: Record<AIProvider, string> = {
  gemini: 'generativelanguage.googleapis.com',
  openai: 'api.openai.com',
  nvidia: 'integrate.api.nvidia.com',
  'openai-compatible': 'localhost',
};

// ─── HTTP Helper ───────────────────────────────────────────────────────────────

function httpsPostRaw(
  hostname: string,
  path: string,
  body: object,
  headers: Record<string, string>,
  port = 443,
): Promise<{ statusCode: number; body: string }> {
  return new Promise((resolve, reject) => {
    const bodyStr = JSON.stringify(body);
    const options: https.RequestOptions = {
      hostname,
      port,
      path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(bodyStr),
        ...headers,
      },
    };

    const req = https.request(options, (res) => {
      const chunks: Buffer[] = [];
      res.on('data', (chunk) => {
        if (typeof chunk === 'string') {
          chunks.push(Buffer.from(chunk, 'utf8'));
        } else {
          chunks.push(chunk);
        }
      });
      res.on('end', () => {
        const bodyStr = Buffer.concat(chunks).toString('utf8');
        resolve({ statusCode: res.statusCode ?? 0, body: bodyStr });
      });
    });

    req.on('error', (err) => reject(err));
    req.setTimeout(60_000, () => {
      req.destroy();
      reject(new Error('انتهت مهلة الاتصال (60 ثانية)'));
    });
    req.write(bodyStr);
    req.end();
  });
}

async function httpsPost(
  hostname: string,
  path: string,
  body: object,
  headers: Record<string, string>,
  port = 443,
  retries = 3,
  delayMs = 2000,
): Promise<{ statusCode: number; body: string }> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await httpsPostRaw(hostname, path, body, headers, port);
      
      const isRetryable = res.statusCode === 429 || res.statusCode === 503 || 
        (res.body && res.body.includes('experiencing high demand'));
        
      if (isRetryable && attempt < retries) {
        console.warn(`[httpsPost] Got status ${res.statusCode} or high demand. Retrying attempt ${attempt}/${retries} in ${delayMs * attempt}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delayMs * attempt));
        continue;
      }
      return res;
    } catch (err: any) {
      if (attempt === retries) {
        throw err;
      }
      console.warn(`[httpsPost] Error: ${err.message}. Retrying attempt ${attempt}/${retries} in ${delayMs * attempt}ms...`);
      await new Promise((resolve) => setTimeout(resolve, delayMs * attempt));
    }
  }
  throw new Error('فشلت جميع محاولات الاتصال بالذكاء الاصطناعي');
}

// ─── Main AIService Class ──────────────────────────────────────────────────────

export class AIService {
  /**
   * إرسال رسائل للـ AI والحصول على رد.
   * يتفرع تلقائياً حسب الموفر المحدد.
   */
  static async chat(config: AIConfig, messages: AIMessage[], options?: { jsonMode?: boolean; enableSearch?: boolean }): Promise<AIResponse> {
    try {
      switch (config.provider) {
        case 'gemini':
          return await AIService.callGemini(config, messages, options);
        case 'openai':
        case 'nvidia':
        case 'openai-compatible':
          return await AIService.callOpenAICompat(config, messages, options);
        default:
          return { success: false, error: `موفر الخدمة غير معروف: ${config.provider}` };
      }
    } catch (err: any) {
      console.error('[AIService] Unexpected error:', err);
      return { success: false, error: err?.message || 'خطأ غير متوقع في خدمة الذكاء الاصطناعي' };
    }
  }

  /**
   * اختبار الاتصال مع قياس زمن الاستجابة.
   */
  static async testConnection(config: AIConfig): Promise<AITestResult> {
    const start = Date.now();
    const result = await AIService.chat(config, [
      { role: 'user', content: 'أجب بكلمة "متصل" فقط بدون أي إضافات.' },
    ]);
    const latencyMs = Date.now() - start;

    if (result.success) {
      return {
        success: true,
        latencyMs,
        model: config.model || DEFAULT_MODELS[config.provider],
      };
    }
    return { success: false, error: result.error };
  }

  // ─── Google Gemini ────────────────────────────────────────────────────────

  private static async callGemini(
    config: AIConfig,
    messages: AIMessage[],
    options?: { jsonMode?: boolean; enableSearch?: boolean },
  ): Promise<AIResponse> {
    const model = config.model || DEFAULT_MODELS.gemini;
    const hostname = DEFAULT_BASE_URLS.gemini;
    const path = `/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(config.apiKey)}`;

    // فصل الـ system message عن باقي الرسائل (Gemini يتعامل معها بشكل منفصل)
    const systemMsg = messages.find((m) => m.role === 'system');
    const conversationMsgs = messages.filter((m) => m.role !== 'system');

    // تحويل تنسيق messages → Gemini contents
    const contents = conversationMsgs.map((m) => {
      const parts: any[] = [{ text: m.content }];
      if (m.images && m.images.length > 0) {
        m.images.forEach((img) => {
          parts.push({
            inlineData: {
              mimeType: img.mimeType,
              data: img.base64,
            },
          });
        });
      } else if (m.image?.base64) {
        parts.push({
          inlineData: {
            mimeType: m.image.mimeType,
            data: m.image.base64,
          },
        });
      }
      return {
        role: m.role === 'assistant' ? 'model' : 'user',
        parts,
      };
    });

    const isGemini25 = model.includes('2.5') || model.includes('gemini-2.5');

    const body: Record<string, unknown> = {
      contents,
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 4096,
        topP: 0.95,
        ...(options?.jsonMode ? { responseMimeType: 'application/json' } : {}),
        ...(isGemini25 ? { thinkingConfig: { thinkingBudget: 0 } } : {}),
      },
    };

    // إضافة الـ system instruction إذا وُجدت
    if (systemMsg) {
      body.systemInstruction = {
        parts: [{ text: systemMsg.content }],
      };
    }

    if (options?.enableSearch) {
      body.tools = [
        {
          googleSearch: {}
        }
      ];
    }

    const res = await httpsPost(hostname, path, body, {});

    if (res.statusCode !== 200) {
      let errorMsg = `خطأ من Gemini API (${res.statusCode})`;
      try {
        const errData = JSON.parse(res.body);
        errorMsg = errData?.error?.message || errorMsg;
      } catch { /* ignore */ }
      return { success: false, error: errorMsg };
    }

    try {
      const data = JSON.parse(res.body);
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) return { success: false, error: 'لم يُرجع Gemini أي محتوى' };

      const usage = data?.usageMetadata;
      return {
        success: true,
        content: text,
        usage: usage
          ? {
              prompt_tokens: usage.promptTokenCount ?? 0,
              completion_tokens: usage.candidatesTokenCount ?? 0,
              total_tokens: usage.totalTokenCount ?? 0,
            }
          : undefined,
      };
    } catch (parseErr: any) {
      return { success: false, error: `خطأ في قراءة رد Gemini: ${parseErr.message}` };
    }
  }

  // ─── OpenAI / NVIDIA NIM / OpenAI-Compatible ──────────────────────────────

  private static async callOpenAICompat(
    config: AIConfig,
    messages: AIMessage[],
    options?: { jsonMode?: boolean },
  ): Promise<AIResponse> {
    const model = config.model || DEFAULT_MODELS[config.provider];

    // استخراج hostname وpath من baseUrl إذا كان مخصصاً
    let hostname = DEFAULT_BASE_URLS[config.provider];
    let port = 443;
    let apiPath = '/v1/chat/completions';

    if (config.baseUrl) {
      try {
        // دعم http:// وhttps:// وأي port مخصص
        const rawUrl = config.baseUrl.startsWith('http')
          ? config.baseUrl
          : `https://${config.baseUrl}`;
        const parsed = new URL(rawUrl);
        hostname = parsed.hostname;
        port = parsed.port ? parseInt(parsed.port, 10) : (parsed.protocol === 'http:' ? 80 : 443);
        apiPath = (parsed.pathname.endsWith('/') ? parsed.pathname.slice(0, -1) : parsed.pathname) + '/v1/chat/completions';
      } catch {
        // baseUrl ليس URL كامل — نتعامل معه كـ hostname مجرد
        hostname = config.baseUrl;
      }
    }

    const headers: Record<string, string> = {
      Authorization: `Bearer ${config.apiKey}`,
    };

    // NVIDIA يتطلب header إضافي
    if (config.provider === 'nvidia') {
      headers['Accept'] = 'application/json';
    }

    const body: Record<string, any> = {
      model,
      messages: messages.map((m) => {
        if (m.images && m.images.length > 0) {
          const contentParts: any[] = [{ type: 'text', text: m.content }];
          m.images.forEach((img) => {
            contentParts.push({
              type: 'image_url',
              image_url: {
                url: `data:${img.mimeType};base64,${img.base64}`,
              },
            });
          });
          return {
            role: m.role,
            content: contentParts,
          };
        } else if (m.image?.base64) {
          return {
            role: m.role,
            content: [
              { type: 'text', text: m.content },
              {
                type: 'image_url',
                image_url: {
                  url: `data:${m.image.mimeType};base64,${m.image.base64}`,
                },
              },
            ],
          };
        }
        return { role: m.role, content: m.content };
      }),
      temperature: 0.7,
      max_tokens: 4096,
      ...(options?.jsonMode ? { response_format: { type: 'json_object' } } : {}),
    };

    // إضافة معاملات إضافية لنماذج DeepSeek من انفيديا لمنع التشوش وتعطيل حزم التفكير المباشر
    if (config.provider === 'nvidia' && model.toLowerCase().includes('deepseek')) {
      body.chat_template_kwargs = {
        thinking: false
      };
    }

    const useHttps = port === 443;

    let res: { statusCode: number; body: string };
    if (useHttps) {
      res = await httpsPost(hostname, apiPath, body, headers, port);
    } else {
      // HTTP للخوادم المحلية (Ollama, LM Studio)
      res = await httpPost(hostname, apiPath, body, headers, port);
    }

    if (res.statusCode !== 200) {
      let errorMsg = `خطأ من API (${res.statusCode})`;
      try {
        const errData = JSON.parse(res.body);
        errorMsg = errData?.error?.message || errData?.detail || errorMsg;
      } catch { /* ignore */ }
      return { success: false, error: errorMsg };
    }

    try {
      const data = JSON.parse(res.body);
      const text = data?.choices?.[0]?.message?.content;
      if (text === undefined || text === null) {
        return { success: false, error: 'لم يُرجع API أي محتوى في choices[0].message.content' };
      }

      const usage = data?.usage;
      return {
        success: true,
        content: text,
        usage: usage
          ? {
              prompt_tokens: usage.prompt_tokens ?? 0,
              completion_tokens: usage.completion_tokens ?? 0,
              total_tokens: usage.total_tokens ?? 0,
            }
          : undefined,
      };
    } catch (parseErr: any) {
      return { success: false, error: `خطأ في قراءة رد API: ${parseErr.message}` };
    }
  }

  // ─── Gemini Vision (Image + Text) ─────────────────────────────────────────

  /**
   * إرسال صورة + نص لـ Gemini Vision (لقراءة الفواتير والكتالوجات)
   */
  static async chatWithImage(
    config: AIConfig,
    prompt: string,
    base64Image: string,
    mimeType: string,
  ): Promise<AIResponse> {
    try {
      const model = config.model || DEFAULT_MODELS.gemini;
      const hostname = DEFAULT_BASE_URLS.gemini;
      const path = `/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(config.apiKey)}`;

      const isGemini25 = model.includes('2.5') || model.includes('gemini-2.5');

      const body = {
        contents: [
          {
            role: 'user',
            parts: [
              { text: prompt },
              {
                inlineData: {
                  mimeType,
                  data: base64Image,
                },
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.1,  // Low temperature for accurate structural data extraction
          maxOutputTokens: 4096, // Increase output token ceiling for large invoices
          responseMimeType: 'application/json', // Force valid JSON format directly from Google API
          ...(isGemini25 ? { thinkingConfig: { thinkingBudget: 0 } } : {}),
        },
      };

      const res = await httpsPost(hostname, path, body, {});

      if (res.statusCode !== 200) {
        let errorMsg = `خطأ من Gemini Vision API (${res.statusCode})`;
        try {
          const errData = JSON.parse(res.body);
          errorMsg = errData?.error?.message || errorMsg;
        } catch { /* ignore */ }
        return { success: false, error: errorMsg };
      }

      const data = JSON.parse(res.body);
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) return { success: false, error: 'لم يُرجع Gemini Vision أي محتوى' };

      return { success: true, content: text };
    } catch (err: any) {
      return { success: false, error: err?.message || 'خطأ في Gemini Vision' };
    }
  }
}

// ─── HTTP (non-TLS) for local servers like Ollama ─────────────────────────────

import http from 'http';

function httpPostRaw(
  hostname: string,
  path: string,
  body: object,
  headers: Record<string, string>,
  port = 80,
): Promise<{ statusCode: number; body: string }> {
  return new Promise((resolve, reject) => {
    const bodyStr = JSON.stringify(body);
    const options: http.RequestOptions = {
      hostname,
      port,
      path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(bodyStr),
        ...headers,
      },
    };

    const req = http.request(options, (res) => {
      const chunks: Buffer[] = [];
      res.on('data', (chunk) => {
        if (typeof chunk === 'string') {
          chunks.push(Buffer.from(chunk, 'utf8'));
        } else {
          chunks.push(chunk);
        }
      });
      res.on('end', () => {
        const bodyStr = Buffer.concat(chunks).toString('utf8');
        resolve({ statusCode: res.statusCode ?? 0, body: bodyStr });
      });
    });

    req.on('error', (err) => reject(err));
    req.setTimeout(60_000, () => {
      req.destroy();
      reject(new Error('انتهت مهلة الاتصال (60 ثانية)'));
    });
    req.write(bodyStr);
    req.end();
  });
}

async function httpPost(
  hostname: string,
  path: string,
  body: object,
  headers: Record<string, string>,
  port = 80,
  retries = 3,
  delayMs = 2000,
): Promise<{ statusCode: number; body: string }> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await httpPostRaw(hostname, path, body, headers, port);
      if ((res.statusCode === 429 || res.statusCode === 503) && attempt < retries) {
        console.warn(`[httpPost] Got status ${res.statusCode}. Retrying attempt ${attempt}/${retries} in ${delayMs * attempt}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delayMs * attempt));
        continue;
      }
      return res;
    } catch (err: any) {
      if (attempt === retries) {
        throw err;
      }
      console.warn(`[httpPost] Error: ${err.message}. Retrying attempt ${attempt}/${retries} in ${delayMs * attempt}ms...`);
      await new Promise((resolve) => setTimeout(resolve, delayMs * attempt));
    }
  }
  throw new Error('فشلت جميع محاولات الاتصال بالذكاء الاصطناعي');
}
