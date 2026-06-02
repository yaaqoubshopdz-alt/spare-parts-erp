import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, X, User, Lock, Eye, EyeOff, Loader2 } from 'lucide-react';
import { showSuccess, showError } from '../../utils/notifications';

interface AdminAuthGateProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  title?: string;
  description?: string;
}

export default function AdminAuthGate({
  isOpen,
  onClose,
  onSuccess,
  title = 'المصادقة الأمنية للمدير',
  description = 'يرجى إدخال اسم المستخدم وكلمة المرور لحساب المالك أو مدير النظام لتأكيد هويتك وتفويض هذا الإجراء الحساس.'
}: AdminAuthGateProps) {
  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setUsernameInput('');
      setPasswordInput('');
      setLoading(false);
    }
  }, [isOpen]);

  // Listen to physical keyboard events (Enter for submit, Escape for close)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!usernameInput.trim() || !passwordInput) {
      showError('يرجى ملء جميع حقول المصادقة');
      return;
    }

    setLoading(true);
    try {
      // Securely invoke auth:login handler to compare bcrypt hash
      const res: any = await window.electronAPI.invoke('auth:login', usernameInput.trim(), passwordInput);
      
      if (res.success && res.user) {
        const role = res.user.role;
        if (role === 'owner' || role === 'manager') {
          showSuccess(`تم تفويض الإجراء بنجاح: ${res.user.full_name}`);
          onSuccess();
          onClose();
        } else {
          showError('خطأ: هذا الإجراء الحساس يتطلب صلاحية المالك أو مدير النظام فقط');
          // Log unauthorized attempt to audit logs
          try {
            await window.electronAPI.invoke('audit:log', {
              action: 'security_alert',
              table_name: 'users',
              description: `محاولة غير مصرح بها للوصول من قبل المستخدم [${usernameInput}] صاحب دور [${role}]`
            });
          } catch {}
        }
      } else {
        showError(res.error || 'اسم المستخدم أو كلمة المرور غير صحيحة');
      }
    } catch (err) {
      showError('حدث خطأ أثناء الاتصال بالخادم الأمني');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 overflow-hidden select-none">
          {/* Blur Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-[#06080c]/70 dark:bg-black/75 backdrop-blur-xl"
            onClick={onClose}
          />

          {/* Modal Container Card */}
          <motion.div
            ref={containerRef}
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ type: 'spring', damping: 25, stiffness: 250 }}
            className="relative w-full max-w-md bg-background_secondary dark:bg-[#14171d]/90 border border-border_default dark:border-white/5 shadow-2xl rounded-3xl overflow-hidden font-arabic"
          >
            {/* Header Area */}
            <div className="p-6 pb-4 border-b border-border_default dark:border-white/5 flex flex-col items-center text-center relative bg-background_primary/20 dark:bg-white/[0.01]">
              {/* Close Button */}
              <button
                onClick={onClose}
                className="absolute top-4 right-4 p-2 text-text_secondary hover:text-text_primary hover:bg-background_primary/80 dark:hover:bg-white/5 rounded-xl transition-all cursor-pointer"
              >
                <X size={18} />
              </button>

              <div className="w-14 h-14 rounded-2xl bg-primary_blue/10 dark:bg-primary_blue/15 border border-primary_blue/20 flex items-center justify-center mb-4 shadow-lg shadow-primary_blue/5">
                <ShieldCheck size={28} className="text-primary_blue animate-pulse" />
              </div>

              <h3 className="text-lg font-black text-text_primary">{title}</h3>
              <p className="text-xs text-text_secondary mt-2 px-2 leading-relaxed">{description}</p>
            </div>

            {/* Form Fields */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Username field */}
              <div className="space-y-1.5">
                <label className="text-xs text-text_secondary font-bold flex items-center gap-1.5">
                  <User size={14} className="text-primary_blue" />
                  اسم المستخدم
                </label>
                <input
                  type="text"
                  value={usernameInput}
                  onChange={(e) => setUsernameInput(e.target.value)}
                  className="w-full bg-background_primary/60 dark:bg-white/[0.02] border border-border_default dark:border-white/10 rounded-xl px-4 py-3 text-sm text-text_primary outline-none focus:border-primary_blue focus:ring-1 focus:ring-primary_blue/30 transition-all font-mono font-bold"
                  placeholder="أدخل اسم المستخدم للمدير"
                  autoFocus
                  dir="ltr"
                />
              </div>

              {/* Password field */}
              <div className="space-y-1.5">
                <label className="text-xs text-text_secondary font-bold flex items-center gap-1.5">
                  <Lock size={14} className="text-primary_blue" />
                  كلمة المرور الرئيسية
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    className="w-full bg-background_primary/60 dark:bg-white/[0.02] border border-border_default dark:border-white/10 rounded-xl px-4 py-3 text-sm text-text_primary outline-none focus:border-primary_blue focus:ring-1 focus:ring-primary_blue/30 transition-all font-bold"
                    placeholder="••••••••••••"
                    dir="ltr"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text_muted hover:text-text_secondary transition-colors cursor-pointer"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Confirm Action Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full mt-6 py-3 bg-primary_blue hover:bg-primary_blue_hover text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md shadow-primary_blue/10 active:scale-98 disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <>
                    <ShieldCheck size={16} />
                    تأكيد الهوية وتفويض الإجراء
                  </>
                )}
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
