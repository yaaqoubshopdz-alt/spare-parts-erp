/**
 * SuccessToast — إشعار نجاح بقفزة لأعلى + ارتداد
 */
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle } from 'lucide-react';
import { useEffect, useState } from 'react';

interface Props {
  message: string;
  t: string | number;
}

export default function SuccessToast({ message, t }: Props) {
  const [show, setShow] = useState(false);
  useEffect(() => { const timer = setTimeout(() => setShow(true), 30); return () => clearTimeout(timer); }, []);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ scale: 0.3, opacity: 0, y: 40 }}
          animate={{ scale: [0.3, 1.15, 0.95, 1], opacity: [0, 1, 1, 1], y: [40, -10, 5, 0] }}
          transition={{ duration: 0.7, times: [0, 0.5, 0.75, 1], ease: 'easeOut' }}
          className="origin-bottom"
        >
          <div className="flex items-center gap-3 px-5 py-3.5 bg-gradient-to-br from-background_card to-background_secondary border-2 border-success_green/40 dark:border-success_green/50 rounded-2xl shadow-2xl shadow-success_green/10 dark:shadow-[0_0_30px_rgba(16,185,129,0.12)] min-w-[300px] max-w-[420px]" dir="rtl">
            <div className="w-10 h-10 rounded-xl bg-success_green/20 dark:bg-success_green/25 flex items-center justify-center shrink-0">
              <CheckCircle size={22} className="text-success_green" />
            </div>
            <p className="text-sm font-black text-text_primary dark:text-white leading-relaxed">{message}</p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
