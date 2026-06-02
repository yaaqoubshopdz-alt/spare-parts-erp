/**
 * ErrorToast — إشعار خطأ مع اهتزاز جانبي
 */
import { motion, AnimatePresence } from 'framer-motion';
import { XCircle } from 'lucide-react';
import { useEffect, useState } from 'react';

interface Props {
  message: string;
  t: string | number;
}

export default function ErrorToast({ message, t }: Props) {
  const [show, setShow] = useState(false);
  useEffect(() => { const timer = setTimeout(() => setShow(true), 30); return () => clearTimeout(timer); }, []);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ x: 80, opacity: 0 }}
          animate={{ x: [80, -12, 8, -6, 4, -2, 0], opacity: [0, 1, 1, 1, 1, 1, 1] }}
          transition={{ duration: 0.6, times: [0, 0.3, 0.45, 0.6, 0.75, 0.9, 1], ease: 'easeOut' }}
        >
          <div className="flex items-center gap-3 px-5 py-3.5 bg-gradient-to-br from-background_card to-background_secondary border-2 border-danger_red/40 dark:border-danger_red/50 rounded-2xl shadow-2xl shadow-danger_red/10 dark:shadow-[0_0_30px_rgba(239,68,68,0.12)] min-w-[300px] max-w-[420px]" dir="rtl">
            <div className="w-10 h-10 rounded-xl bg-danger_red/20 dark:bg-danger_red/25 flex items-center justify-center shrink-0">
              <XCircle size={22} className="text-danger_red" />
            </div>
            <p className="text-sm font-black text-text_primary dark:text-white leading-relaxed">{message}</p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
