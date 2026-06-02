import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Delete, X, Unlock } from 'lucide-react';
import { usePinStore } from '../../store/pin.store';
import { useAuth } from '../../hooks/useAuth';
import { showError, showSuccess } from '../../shared/utils/notifications';

export default function PinLockOverlay() {
  const {
    isLocked,
    setLocked,
    isPinEnabled,
    failedAttemptsCount,
    incrementFailedAttempts,
    resetFailedAttempts
  } = usePinStore();
  const { user } = useAuth();
  const [pin, setPin] = useState('');
  const [isShaking, setIsShaking] = useState(false);

  // Reset PIN when locked/unlocked
  useEffect(() => {
    if (isLocked) {
      setPin('');
      setIsShaking(false);
    }
  }, [isLocked]);

  // Listen to physical keyboard events natively (no input or focus required)
  useEffect(() => {
    if (!isLocked) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isShaking) return;
      if ((/^Digit[0-9]$/.test(e.code) || /^Numpad[0-9]$/.test(e.code)) && pin.length < 4) {
        const digit = e.code.charAt(e.code.length - 1);
        setPin((prev) => prev + digit);
        return;
      }
      if (e.code === 'Backspace') {
        setPin((prev) => prev.slice(0, -1));
        return;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isLocked, pin, isShaking]);

  // Verify PIN immediately when length reaches 4
  useEffect(() => {
    if (pin.length === 4) {
      handleVerify();
    }
  }, [pin]);

  const handleVerify = async () => {
    const userPin = user?.pin_code;
    
    // If no pin is set in DB or it matches, unlock
    if (!userPin || pin === userPin) {
      showSuccess('تم فتح الشاشة بنجاح');
      resetFailedAttempts();
      setLocked(false);
      setPin('');
    } else {
      // Trigger shake animation and increment failures
      setIsShaking(true);
      
      const currentFailures = failedAttemptsCount + 1;
      incrementFailedAttempts();
      
      // Log security incident to audit log if failures reach 3
      if (currentFailures >= 3) {
        showError('تنبيه: تم تسجيل 3 محاولات خاطئة متتالية! تم إصدار بلاغ أمني للمدير.');
        try {
          await window.electronAPI.invoke('audit:log', {
            action: 'security_alert',
            table_name: 'users',
            description: `تنبيه أمني: محاولة وصول غير مصرح بها. تم تسجيل 3 محاولات PIN خاطئة متتالية للحساب [${user?.username || 'مجهول'}]`
          });
        } catch (err) {}
      } else {
        showError('رمز PIN غير صحيح');
      }

      setTimeout(() => {
        setIsShaking(false);
        setPin('');
      }, 500);
    }
  };

  const handleKeypadClick = (num: string) => {
    if (pin.length < 4 && !isShaking) {
      setPin((prev) => prev + num);
    }
  };

  const handleDelete = () => {
    if (pin.length > 0 && !isShaking) {
      setPin((prev) => prev.slice(0, -1));
    }
  };

  const handleClear = () => {
    if (!isShaking) setPin('');
  };

  if (!isLocked) return null;

  return (
    <AnimatePresence>
      {isLocked && (
        <motion.div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-md overflow-y-auto select-none"
        >
          {/* Subtle Ambient Background Glows */}
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary_blue/10 rounded-full blur-[120px] pointer-events-none" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none" />

          {/* Centered Security Grid Container */}
          <motion.div
            initial={{ scale: 0.92, y: 15, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.92, y: 15, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className={`w-full max-w-sm p-8 bg-background_secondary/95 dark:bg-[#14171d]/80 border border-border_default dark:border-white/10 rounded-3xl shadow-[0_25px_60px_rgba(0,0,0,0.15)] dark:shadow-[0_25px_60px_rgba(0,0,0,0.55)] flex flex-col items-center relative transition-all duration-300 ${
              isShaking
                ? 'animate-shake shadow-[0_0_50px_rgba(239,68,68,0.3)] border-danger_red/40'
                : 'shadow-[0_0_40px_rgba(59,130,246,0.05)]'
            }`}
          >
            {/* Header Lock Icon */}
            <div className="relative mb-6">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary_blue/20 to-indigo-600/10 border border-primary_blue/30 flex items-center justify-center shadow-lg shadow-primary_blue/10">
                <Lock className="w-7 h-7 text-primary_blue animate-pulse" />
              </div>
            </div>

            {/* Profile Info Summary */}
            <h2 className="text-xl font-black text-text_primary mb-1">البرنامج مقفل</h2>
            <p className="text-sm text-text_muted mb-8">
              مرحباً <span className="text-primary_blue font-bold">{user?.full_name || user?.username}</span>، أدخل رمز الـ PIN لإلغاء القفل
            </p>

            {/* squircle display representing active PIN entries */}
            <div className="flex gap-3 mb-8">
              {[0, 1, 2, 3].map((i) => {
                const filled = pin.length > i;
                return (
                  <div
                    key={i}
                    className={`w-[44px] h-[52px] rounded-xl flex items-center justify-center border-2 transition-all duration-150 ${
                      isShaking
                        ? 'bg-danger_red/10 border-danger_red/40 shadow-[0_0_12px_rgba(239,68,68,0.3)]'
                        : filled
                        ? 'bg-primary_blue border-primary_blue shadow-[0_0_15px_rgba(59,130,246,0.5)]'
                        : 'bg-background_primary/40 dark:bg-white/[0.02] border-border_default dark:border-white/5'
                    }`}
                  >
                    {filled && <div className="w-2.5 h-2.5 bg-white rounded-full" />}
                  </div>
                );
              })}
            </div>

            {/* Squircle Numpad Grid */}
            <div className="grid grid-cols-3 gap-3 w-full max-w-[240px]" dir="ltr">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => handleKeypadClick(num.toString())}
                  className="h-14 rounded-xl bg-background_primary/60 dark:bg-white/[0.03] border border-border_default/60 dark:border-white/5 hover:bg-background_secondary dark:hover:bg-white/[0.07] text-xl font-bold font-numbers text-text_primary flex items-center justify-center transition-colors cursor-pointer select-none"
                >
                  {num}
                </button>
              ))}

              {/* Clear button */}
              <button
                type="button"
                onClick={handleClear}
                className="h-14 rounded-xl bg-status_error/10 border border-status_error/30 hover:bg-status_error/20 text-status_error font-bold flex items-center justify-center transition-colors cursor-pointer"
              >
                مسح
              </button>

              {/* Zero (0) */}
              <button
                type="button"
                onClick={() => handleKeypadClick('0')}
                className="h-14 rounded-xl bg-background_primary/60 dark:bg-white/[0.03] border border-border_default/60 dark:border-white/5 hover:bg-background_secondary dark:hover:bg-white/[0.07] text-xl font-bold font-numbers text-text_primary flex items-center justify-center transition-colors cursor-pointer select-none"
              >
                0
              </button>

              {/* Confirm button */}
              <button
                type="button"
                onClick={handleVerify}
                disabled={pin.length < 4}
                className="h-14 rounded-xl bg-success_green/10 border border-success_green/30 hover:bg-success_green hover:text-text_primary text-success_green font-bold flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                تأكيد
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
