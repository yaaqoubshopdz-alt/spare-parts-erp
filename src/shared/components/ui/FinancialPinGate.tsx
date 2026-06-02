import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, ShieldAlert, KeyRound, ShieldCheck } from 'lucide-react';
import { showSuccess, showError } from '../../utils/notifications';

interface FinancialPinGateProps {
  onSuccess: () => void;
  title?: string;
  description?: string;
}

export function FinancialPinGate({ 
  onSuccess, 
  title = 'حماية البيانات المالية مقفلة', 
  description = 'هذا القسم يحتوي على أرقام حساسة. يرجى إدخال رمز PIN للمدير أو المالك لإلغاء القفل.' 
}: FinancialPinGateProps) {
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [isShaking, setIsShaking] = useState(false);

  // Reset state when loaded
  useEffect(() => {
    setPin('');
    setIsShaking(false);
  }, []);

  // Listen to physical keyboard events (Enter for submit, backspace, digits)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (loading || isShaking) return;
      
      // Support digits (Keyboard Row and Numpad)
      if ((/^Digit[0-9]$/.test(e.code) || /^Numpad[0-9]$/.test(e.code)) && pin.length < 4) {
        const digit = e.key.replace('Numpad', '');
        setPin((prev) => prev + digit);
        return;
      }
      if (e.code === 'Backspace') {
        setPin((prev) => prev.slice(0, -1));
        return;
      }
      if (e.code === 'Enter' && pin.length === 4) {
        handleSubmit();
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pin, loading, isShaking]);

  // Auto-submit when length reaches 4
  useEffect(() => {
    if (pin.length === 4 && !loading && !isShaking) {
      handleSubmit();
    }
  }, [pin]);

  const handleSubmit = async () => {
    if (!pin || pin.length < 4 || loading) return;

    setLoading(true);
    try {
      const res: any = await window.electronAPI?.invoke('db:users:verifyPin', pin);
      if (res?.success) {
        showSuccess(`تم إلغاء قفل البيانات بنجاح (${res.name})`);
        onSuccess();
      } else {
        setIsShaking(true);
        showError(res?.error || 'رمز PIN غير صحيح');
        setTimeout(() => {
          setIsShaking(false);
          setPin('');
        }, 500);
      }
    } catch (err) {
      showError('حدث خطأ أثناء التحقق من الرمز');
    } finally {
      setLoading(false);
    }
  };

  const handleKeypadClick = (num: string) => {
    if (pin.length < 4 && !isShaking && !loading) {
      setPin(prev => prev + num);
    }
  };

  const handleDelete = () => {
    if (pin.length > 0 && !isShaking && !loading) {
      setPin(prev => prev.slice(0, -1));
    }
  };

  return (
    <div className="flex flex-col items-center justify-center p-8 w-full min-h-[500px] font-cairo select-none relative">
      {/* Dynamic Ambient Background Glows */}
      <div className="absolute top-1/4 left-1/3 w-72 h-72 bg-primary_blue/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/3 w-72 h-72 bg-indigo-600/10 rounded-full blur-[100px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className={`w-full max-w-sm p-8 bg-background_secondary/95 dark:bg-[#14171d]/80 border rounded-3xl flex flex-col items-center transition-all duration-300 ${
          isShaking 
            ? 'animate-shake border-danger_red/40 shadow-[0_0_50px_rgba(239,68,68,0.3)]' 
            : 'border-border_default dark:border-white/10 shadow-[0_25px_60px_rgba(0,0,0,0.15)] dark:shadow-[0_25px_60px_rgba(0,0,0,0.55)]'
        }`}
      >
        {/* Header Icon */}
        <div className="relative mb-6">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary_blue/20 to-indigo-600/10 border border-primary_blue/30 flex items-center justify-center shadow-lg shadow-primary_blue/10">
            <Lock className="w-7 h-7 text-primary_blue animate-pulse" />
          </div>
        </div>

        {/* Lock Screen Header */}
        <h2 className="text-lg font-black text-text_primary mb-2 text-center">{title}</h2>
        <p className="text-xs text-text_muted/80 text-center leading-relaxed mb-6 px-2">
          {description}
        </p>

        {/* squircle display representing active PIN entries */}
        <div className="flex gap-3 mb-6">
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

        {/* Numeric Keypad Grid */}
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

          {/* Delete Button */}
          <button
            type="button"
            onClick={handleDelete}
            className="h-14 rounded-xl bg-status_error/10 border border-status_error/30 hover:bg-status_error/20 text-status_error font-bold flex items-center justify-center transition-colors cursor-pointer select-none"
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

          {/* Confirm Button */}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading || pin.length < 4}
            className="h-14 rounded-xl bg-success_green/10 border border-success_green/30 hover:bg-success_green hover:text-text_primary text-success_green font-bold flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {loading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'تأكيد'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
