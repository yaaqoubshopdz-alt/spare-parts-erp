/**
 * AutoParkToast — إشعار منسدل بتأثير تمدد (Pull-out)
 * يبدأ صغيراً كأنه يسحب من القطن ثم يتمدد إلى الحجم الطبيعي
 */
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useEffect, useState } from 'react';

interface AutoParkContentProps {
  type: 'sales' | 'purchases';
  invoiceId?: number;
  t: string | number;
}

function getNavUrl(type: 'sales' | 'purchases', invoiceId?: number): string {
  if (!invoiceId) return '/';
  return type === 'sales'
    ? `/pos?invoiceId=${invoiceId}`
    : `/purchases/${invoiceId}`;
}

function AutoParkContent({ type, invoiceId, t }: AutoParkContentProps) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShow(true), 50);
    return () => clearTimeout(timer);
  }, []);

  const handleClick = () => {
    if (!invoiceId) return;
    const url = getNavUrl(type, invoiceId);
    window.location.hash = `#${url}`;
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{
            scaleY: 0.1,
            scaleX: 0.1,
            opacity: 0,
            y: -100,
          }}
          animate={{
            scaleY: [0.1, 2.0, 0.9, 1],
            scaleX: [0.1, 0.5, 1.1, 1],
            opacity: [0, 1, 1, 1],
            y: [-100, 20, -5, 0],
          }}
          transition={{
            duration: 0.9,
            times: [0, 0.5, 0.75, 1],
            ease: "circOut",
          }}
          className="origin-top"
        >
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.25 }}
            onClick={handleClick}
            className="flex items-start gap-3.5 p-4 bg-gradient-to-br from-background_card to-background_secondary border-2 border-warning_amber/40 dark:border-warning_amber/50 rounded-2xl shadow-2xl shadow-warning_amber/10 dark:shadow-[0_0_30px_rgba(245,158,11,0.1)] min-w-[360px] max-w-[420px] cursor-pointer hover:brightness-110 transition-all"
            dir="rtl"
          >
            {/* أيقونة */}
            <div className="w-11 h-11 rounded-xl bg-warning_amber/20 dark:bg-warning_amber/25 flex items-center justify-center shrink-0 relative overflow-hidden">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.35, type: 'spring', damping: 10, stiffness: 200 }}
                className="absolute inset-0 bg-warning_amber/10 dark:bg-warning_amber/15 rounded-xl"
              />
              <motion.div
                initial={{ rotate: -30, scale: 0 }}
                animate={{ rotate: 0, scale: 1 }}
                transition={{ delay: 0.4, type: 'spring', damping: 8, stiffness: 200 }}
              >
                <AlertCircle size={24} className="text-warning_amber" />
              </motion.div>
            </div>

            {/* النص */}
            <div className="flex-1 min-w-0">
              <motion.p
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.45, duration: 0.2 }}
                className="text-sm font-black text-text_primary dark:text-white leading-relaxed"
              >
                لم يتم حفظ الفاتورة
              </motion.p>
              <motion.p
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.55, duration: 0.2 }}
                className="text-[13px] text-text_secondary dark:text-slate-300 mt-1 leading-relaxed"
              >
                تم نقلها إلى{' '}
                <span className="text-warning_amber font-bold">المسودات</span>
                {' '}بأمان ✓
              </motion.p>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: '40%' }}
                transition={{ delay: 0.7, duration: 0.4, ease: 'easeOut' }}
                className="h-0.5 bg-warning_amber/40 dark:bg-warning_amber/60 rounded-full mt-2"
              />
            </div>

            {/* أيقونة صغيرة + تلميح اضغط */}
            <motion.div className="flex flex-col items-center gap-1">
              <motion.div
                initial={{ scale: 0, rotate: 180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.5, type: 'spring', damping: 8, stiffness: 150 }}
                className="w-8 h-8 rounded-lg bg-warning_amber/10 dark:bg-warning_amber/20 flex items-center justify-center shrink-0"
              >
                <FileText size={16} className="text-warning_amber" />
              </motion.div>
              {invoiceId && (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.8, duration: 0.2 }}
                  className="text-[10px] text-warning_amber/70 font-bold"
                >
                  افتح
                </motion.span>
              )}
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * عرض إشعار Auto-Park مع تأثير التمدد
 */
export function showAutoParkToast(type: 'sales' | 'purchases', invoiceId?: number) {
  toast.custom(
    (t) => <AutoParkContent type={type} invoiceId={invoiceId} t={t} />,
    {
      duration: 4500,
      position: 'top-center',
      style: {
        background: 'transparent',
        boxShadow: 'none',
        border: 'none',
        padding: 0,
        width: 'auto',
        maxWidth: '420px',
      },
    }
  );
}
