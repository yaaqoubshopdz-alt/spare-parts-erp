import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, X, ShieldAlert } from 'lucide-react';
import { showSuccess, showError } from '../../utils/notifications';

interface AdminPinModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (admin: any) => void;
  actionDescription?: string;
}

export function AdminPinModal({ isOpen, onClose, onSuccess, actionDescription = 'هذا الإجراء يتطلب صلاحيات المدير' }: AdminPinModalProps) {
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setPin('');
    }
  }, [isOpen]);

  // Listen to physical keyboard events (Enter for submit, Escape for close, backspace, digits)
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (loading) return;
      if ((/^Digit[0-9]$/.test(e.code) || /^Numpad[0-9]$/.test(e.code)) && pin.length < 4) {
        const digit = e.code.charAt(e.code.length - 1);
        setPin((prev) => prev + digit);
        return;
      }
      if (e.code === 'Backspace') {
        setPin((prev) => prev.slice(0, -1));
        return;
      }
      if (e.code === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.code === 'Enter' && pin.length >= 4) {
        handleSubmit();
        return;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, pin, loading, onClose]);

  // Auto-submit when length reaches 4
  useEffect(() => {
    if (pin.length === 4 && isOpen && !loading) {
      handleSubmit();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pin]);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!pin || pin.length < 4) {
      showError('الرجاء إدخال رمز صحيح (4 أرقام على الأقل)');
      return;
    }

    setLoading(true);
    try {
      const res: any = await window.electronAPI?.invoke('db:users:verifyPin', pin);
      if (res?.success) {
        showSuccess(`تم التحقق بنجاح (${res.name})`);
        onSuccess?.(res);
        onClose();
      } else {
        showError(res?.error || 'رمز المدير غير صحيح');
        setPin('');
      }
    } catch (err) {
      showError('حدث خطأ أثناء التحقق');
      setPin('');
    }
    setLoading(false);
  };

  const handleKeypadClick = (num: string) => {
    setPin(prev => prev + num);
  };

  const handleDelete = () => {
    setPin(prev => prev.slice(0, -1));
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-background_dark/80 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-sm glass-card overflow-hidden shadow-2xl border border-status_warning/30"
          >
            {/* Header */}
            <div className="bg-status_warning/10 p-6 flex flex-col items-center justify-center border-b border-border_default/30">
              <button onClick={onClose} className="absolute top-4 right-4 p-2 text-text_muted hover:text-text_primary bg-background_card hover:bg-background_card_hover rounded-xl transition-colors">
                <X size={20} />
              </button>
              <div className="w-16 h-16 rounded-2xl bg-status_warning/20 flex items-center justify-center border border-status_warning/30 mb-4 shadow-[0_0_15px_rgba(245,158,11,0.2)]">
                <ShieldAlert size={32} className="text-status_warning" />
              </div>
              <h2 className="text-xl font-bold text-text_primary mb-1">المصادقة مطلوبة</h2>
              <p className="text-sm text-text_muted text-center">{actionDescription}</p>
            </div>

            {/* Content */}
            <div className="p-6">
              <form onSubmit={handleSubmit} className="flex flex-col items-center">
                
                {/* Pin Display */}
                <div className="flex gap-3 mb-8">
                  {[0, 1, 2, 3].map((i) => (
                    <div key={i} className={`w-12 h-14 rounded-xl flex items-center justify-center border-2 transition-all ${pin.length > i ? 'bg-status_warning border-status_warning' : 'bg-background_secondary border-border_default'}`}>
                      {pin.length > i && <div className="w-3 h-3 bg-white rounded-full" />}
                    </div>
                  ))}
                  {/* Visual indication if pin is longer than 4 */}
                  {pin.length > 4 && (
                    <div className="w-12 h-14 rounded-xl flex items-center justify-center border-2 bg-status_warning border-status_warning transition-all">
                      <div className="w-3 h-3 bg-white rounded-full" />
                    </div>
                  )}
                </div>

                {/* Keypad */}
                <div className="grid grid-cols-3 gap-3 w-full max-w-[240px] mb-6" dir="ltr">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => handleKeypadClick(num.toString())}
                      className="h-14 rounded-xl bg-background_secondary border border-border_default hover:bg-background_card_hover hover:border-border_default text-xl font-bold font-numbers text-text_primary transition-colors"
                    >
                      {num}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={handleDelete}
                    className="h-14 rounded-xl bg-status_error/10 border border-status_error/30 hover:bg-status_error/20 text-status_error font-bold flex items-center justify-center transition-colors"
                  >
                    مسح
                  </button>
                  <button
                    type="button"
                    onClick={() => handleKeypadClick('0')}
                    className="h-14 rounded-xl bg-background_secondary border border-border_default hover:bg-background_card_hover hover:border-border_default text-xl font-bold font-numbers text-text_primary transition-colors"
                  >
                    0
                  </button>
                  <button
                    type="submit"
                    disabled={loading || pin.length < 4}
                    className="h-14 rounded-xl bg-success_green/10 border border-success_green/30 hover:bg-success_green hover:text-text_primary text-success_green font-bold flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'تأكيد'}
                  </button>
                </div>
                
              </form>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
