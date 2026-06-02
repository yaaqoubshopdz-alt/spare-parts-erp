/**
 * WarningToast — إشعار تحذير بتمدد + ارتداد
 */
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';
import { useEffect, useState } from 'react';

interface Props {
  message: string;
  t: string | number;
}

export default function WarningToast({ message, t }: Props) {
  const [show, setShow] = useState(false);
  useEffect(() => { const timer = setTimeout(() => setShow(true), 30); return () => clearTimeout(timer); }, []);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ scaleY: 0.1, scaleX: 0.1, opacity: 0, y: -100 }}
          animate={{ scaleY: [0.1, 1.8, 0.9, 1], scaleX: [0.1, 0.5, 1.1, 1], opacity: [0, 1, 1, 1], y: [-100, 15, -5, 0] }}
          transition={{ duration: 0.8, times: [0, 0.5, 0.75, 1], ease: 'circOut' }}
          className="origin-top"
        >
          <div className="flex items-center gap-3 px-5 py-3.5 bg-gradient-to-br from-background_card to-background_secondary border-2 border-warning_amber/40 dark:border-warning_amber/50 rounded-2xl shadow-2xl shadow-warning_amber/10 dark:shadow-[0_0_30px_rgba(245,158,11,0.12)] min-w-[300px] max-w-[420px]" dir="rtl">
            <div className="w-10 h-10 rounded-xl bg-warning_amber/20 dark:bg-warning_amber/25 flex items-center justify-center shrink-0">
              <AlertTriangle size={22} className="text-warning_amber" />
            </div>
            <p className="text-sm font-black text-text_primary dark:text-white leading-relaxed">{message}</p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
