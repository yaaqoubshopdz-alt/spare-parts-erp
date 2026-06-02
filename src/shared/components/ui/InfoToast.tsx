/**
 * InfoToast — إشعار معلومات بانزلاق ناعم
 */
import { motion, AnimatePresence } from 'framer-motion';
import { Info } from 'lucide-react';
import { useEffect, useState } from 'react';

interface Props {
  message: string;
  t: string | number;
}

export default function InfoToast({ message, t }: Props) {
  const [show, setShow] = useState(false);
  useEffect(() => { const timer = setTimeout(() => setShow(true), 30); return () => clearTimeout(timer); }, []);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ y: -30, opacity: 0, scale: 0.9 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          transition={{ type: 'spring', damping: 18, stiffness: 200, mass: 0.8 }}
        >
          <div className="flex items-center gap-3 px-5 py-3.5 bg-gradient-to-br from-background_card to-background_secondary border-2 border-primary_blue/40 dark:border-primary_blue/50 rounded-2xl shadow-2xl shadow-primary_blue/10 dark:shadow-[0_0_30px_rgba(37,99,235,0.12)] min-w-[300px] max-w-[420px]" dir="rtl">
            <div className="w-10 h-10 rounded-xl bg-primary_blue/20 dark:bg-primary_blue/25 flex items-center justify-center shrink-0">
              <Info size={22} className="text-primary_blue" />
            </div>
            <p className="text-sm font-black text-text_primary dark:text-white leading-relaxed">{message}</p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
