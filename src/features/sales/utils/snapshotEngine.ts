import { saveSnapshotToDB, useWorkspaceStore } from '../../../store/workspaceStore';

/**
 * محرك الـ Snapshot: يلتقط صورة حية وحقيقية للفاتورة باستخدام قدرات Electron الأصلية.
 */
export const captureInvoiceSnapshot = async (elementId: string, workspaceId: string) => {
  try {
    // 1. الحصول على إحداثيات عنصر الفاتورة في الصفحة لقصها بشكل دقيق
    const el = document.getElementById(elementId);
    const rect = el ? el.getBoundingClientRect() : null;

    // 2. التقاط النافذة بالكامل بسرعة وسلاسة عبر محرك Electron الأصلي
    const base64 = await (window as any).electronAPI?.invoke('window:capturePage');
    if (!base64) return null;

    // 3. قص وضغط الصورة عبر Canvas
    return new Promise<string | null>((resolve, reject) => {
      const img = new Image();
      img.onload = async () => {
        try {
          const canvas = document.createElement('canvas');
          let canvasWidth = 960; // دقة فائقة مع حجم ملف صغير جداً
          let canvasHeight = 540;
          const ctx = canvas.getContext('2d');
          
          if (ctx) {
            if (rect && rect.width > 0 && rect.height > 0) {
              // حساب نسب تكبير الصورة الأصلية مقارنة بأبعاد الـ Window لمعالجة الشاشات عالية الدقة (DPI)
              const scaleX = img.naturalWidth / window.innerWidth;
              const scaleY = img.naturalHeight / window.innerHeight;

              const sx = rect.left * scaleX;
              const sy = rect.top * scaleY;
              const sw = rect.width * scaleX;
              const sh = rect.height * scaleY;

              // حساب الطول المناسب للحفاظ على أبعاد العنصر بدون مط أو تشويه
              canvasHeight = Math.round((sh / sw) * canvasWidth);
              canvas.width = canvasWidth;
              canvas.height = canvasHeight;

              // رسم الجزء الخاص بالفاتورة فقط بنسب حقيقية
              ctx.drawImage(img, sx, sy, sw, sh, 0, 0, canvasWidth, canvasHeight);
            } else {
              // رسم النافذة بالكامل كاحتياط في حال عدم العثور على العنصر
              canvas.width = canvasWidth;
              canvas.height = canvasHeight;
              ctx.drawImage(img, 0, 0, canvasWidth, canvasHeight);
            }
          }

          // تحويل الصورة إلى صيغة WebP بجودة فائقة 0.90 لوضوح ممتاز جداً للنصوص
          const compressedBase64 = canvas.toDataURL('image/webp', 0.90);
          await saveSnapshotToDB(workspaceId, compressedBase64);
          
          // تحديث حالة المخزن فوراً لإخطار React بوجود صورة جديدة للرسم
          useWorkspaceStore.getState().setSnapshotId(workspaceId, workspaceId);
          
          resolve(compressedBase64);
        } catch (e) {
          reject(e);
        }
      };
      img.onerror = (e) => reject(e);
      img.src = base64;
    });
  } catch (e) {
    console.error('Snapshot failed', e);
    return null;
  }
};
