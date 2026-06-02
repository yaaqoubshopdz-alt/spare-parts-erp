/**
 * NavToast — إشعار تنقل صغير وسريع (يختفي بعد 1.5 ثانية)
 */
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { useEffect, useState } from 'react';

interface Props {
  message: string;
  t: string | number;
}

export default function NavToast({ message, t }: Props) {
  const [show, setShow] = useState(false);
  useEffect(() => { const timer = setTimeout(() => setShow(true), 20); return () => clearTimeout(timer); }, []);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: -15, scale: 0.85 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.9 }}
          transition={{ type: 'spring', damping: 22, stiffness: 260, mass: 0.6 }}
        >
          <div className="flex items-center gap-2.5 px-4 py-2.5 bg-gradient-to-br from-background_card to-background_secondary border border-primary_blue/30 dark:border-primary_blue/40 rounded-xl shadow-lg min-w-[180px] max-w-[360px]" dir="rtl">
            <ArrowRight size={14} className="text-primary_blue shrink-0" />
            <p className="text-xs font-bold text-text_primary dark:text-white truncate leading-relaxed">{message}</p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
