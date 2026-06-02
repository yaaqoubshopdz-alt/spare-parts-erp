/**
 * GlassDropdown — قائمة منسدلة زجاجية مع أنميشن Spring ودخول تدريجي
 * تصميم موحد لكل قوائم البحث (منتجات، زبائن، مورد)
 */
import { motion, AnimatePresence } from 'framer-motion';
import React from 'react';

interface GlassDropdownProps {
  show: boolean;
  children: React.ReactNode;
  width?: string;
  accentColor?: string;
  className?: string;
  darkOpacity?: string; // إضافة خاصية للتحكم بالعتامة
}

const accentMap: Record<string, { via: string; shadow: string }> = {
  amber:    { via: 'via-warning_amber/70',  shadow: 'shadow-warning_amber/10' },
  emerald:  { via: 'via-emerald-400/70',   shadow: 'shadow-emerald-400/10' },
  blue:     { via: 'via-blue-400/70',       shadow: 'shadow-blue-400/10' },
  rose:     { via: 'via-rose-400/70',       shadow: 'shadow-rose-400/10' },
};

export default function GlassDropdown({
  show,
  children,
  width = 'w-[600px]',
  accentColor = 'amber',
  className = '',
  darkOpacity = 'dark:bg-background_secondary/85', // القيمة الافتراضية للوضوح وتجنب تداخل النصوص
}: GlassDropdownProps) {
  const accent = accentMap[accentColor] || accentMap.amber;

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: -24, scale: 0.93 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -16, scale: 0.95 }}
          transition={{
            type: 'spring', damping: 26, stiffness: 320,
          }}
          className={`absolute top-full mt-2 ${width} bg-background_secondary/85 ${darkOpacity} backdrop-blur-2xl border border-white/15 dark:border-white/10 rounded-2xl shadow-2xl shadow-black/20 dark:shadow-black/40 overflow-hidden z-[200] ${className}`}
          dir="rtl"
        >
          {/* خط علوي متوهج بلون التمييز */}
          <motion.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ delay: 0.08, duration: 0.4, ease: 'easeOut' }}
            className={`h-[2px] bg-gradient-to-r from-transparent ${accent.via} to-transparent origin-center`}
          />

          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * عنصر داخل القائمة مع أنميشن دخول من اليمين
 */
export function GlassDropdownItem({
  children,
  delay = 0,
  className = '',
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20, height: 0 }}
      animate={{ opacity: 1, x: 0, height: 'auto' }}
      transition={{ delay, type: 'spring', damping: 22, stiffness: 260 }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/**
 * أيقونة داخل القائمة مع أنميشن تكبير
 */
export function GlassDropdownIcon({
  children,
  delay = 0,
}: {
  children: React.ReactNode;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ delay, type: 'spring', damping: 12, stiffness: 260 }}
    >
      {children}
    </motion.div>
  );
}

/**
 * رأس القائمة مع أنميشن انزلاق
 */
export function GlassDropdownHeader({
  children,
  delay = 0,
}: {
  children: React.ReactNode;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay, type: 'spring', damping: 20, stiffness: 200 }}
      className="p-4 border-b border-white/10 dark:border-white/10"
    >
      {children}
    </motion.div>
  );
}
