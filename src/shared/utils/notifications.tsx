/**
 * notifications.ts — نظام الإشعارات الموحد
 * يربط بين مكونات الأنميشن والأصوات في دالة واحدة
 */
import { toast } from 'sonner';
import { playNotificationSound } from './sound';

// استيراد ديناميكي للمكونات (لا يسخن الشجرة)
import SuccessToast from '../components/ui/SuccessToast';
import ErrorToast from '../components/ui/ErrorToast';
import InfoToast from '../components/ui/InfoToast';
import WarningToast from '../components/ui/WarningToast';
import NavToast from '../components/ui/NavToast';

export type NotificationType = 'success' | 'error' | 'info' | 'warning' | 'nav';

interface NotificationOptions {
  duration?: number;
}

const SOUND_MAP: Record<NotificationType, Parameters<typeof playNotificationSound>[0]> = {
  success: 'success',
  error: 'error',
  info: 'info',
  warning: 'warning',
  nav: 'nav',
};

const TOAST_MAP: Record<NotificationType, React.ComponentType<any>> = {
  success: SuccessToast,
  error: ErrorToast,
  info: InfoToast,
  warning: WarningToast,
  nav: NavToast,
};

const DEFAULT_DURATION: Record<NotificationType, number> = {
  success: 3000,
  error: 4000,
  info: 2500,
  warning: 3500,
  nav: 1500, // قصير جداً للتنقل
};

/**
 * دالة واحدة لكل الإشعارات
 * @example
 *   showNotification('success', 'تم الحفظ بنجاح')
 *   showNotification('error', 'حدث خطأ')
 *   showNotification('nav', 'جاري فتح الفاتورة #5')
 */
export function showNotification(
  type: NotificationType,
  message: string,
  options?: NotificationOptions,
) {
  // تشغيل الصوت
  playNotificationSound(SOUND_MAP[type]);

  // عرض التوست المتحرك
  toast.custom(
    (t) => {
      const Component = TOAST_MAP[type];
      return <Component message={message} t={t} />;
    },
    {
      duration: options?.duration ?? DEFAULT_DURATION[type],
      position: type === 'nav' ? 'top-center' : 'top-center',
      style: {
        background: 'transparent',
        boxShadow: 'none',
        border: 'none',
        padding: 0,
        width: 'auto',
        maxWidth: '420px',
      },
    },
  );
}

// اختصارات للاستخدام السريع
export const showSuccess = (msg: string) => showNotification('success', msg);
export const showError = (msg: string) => showNotification('error', msg);
export const showInfo = (msg: string) => showNotification('info', msg);
export const showWarning = (msg: string) => showNotification('warning', msg);
export const showNav = (msg: string) => showNotification('nav', msg);
