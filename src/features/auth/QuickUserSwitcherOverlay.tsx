import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, X, UserCheck } from 'lucide-react';
import { useAuthStore } from '../../store/auth.store';
import { showError, showSuccess } from '../../shared/utils/notifications';

interface ActiveUser {
  id: number;
  username: string;
  full_name: string;
  role: 'owner' | 'manager' | 'accountant' | 'cashier' | 'storekeeper' | 'employee';
  avatar?: string;
  color?: string;
}

const COLOR_THEMES: Record<string, { border: string; bg: string }> = {
  blue:    { border: 'border-blue-500/15 hover:border-blue-500/30',    bg: 'bg-blue-500/8'    },
  emerald: { border: 'border-emerald-500/15 hover:border-emerald-500/30', bg: 'bg-emerald-500/8' },
  rose:    { border: 'border-rose-500/15 hover:border-rose-500/30',    bg: 'bg-rose-500/8'    },
  amber:   { border: 'border-amber-500/15 hover:border-amber-500/30',  bg: 'bg-amber-500/8'   },
  violet:  { border: 'border-violet-500/15 hover:border-violet-500/30', bg: 'bg-violet-500/8' },
  slate:   { border: 'border-slate-400/15 hover:border-slate-400/30',  bg: 'bg-slate-400/8'   },
};

const ROLE_LABELS: Record<string, string> = {
  owner:       'المالك',
  manager:     'المدير',
  accountant:  'المحاسب',
  cashier:     'الكاشير',
  storekeeper: 'أمين المستودع',
  employee:    'موظف',
};

export default function QuickUserSwitcherOverlay() {
  const showSwitchOverlay    = useAuthStore((s) => s.showSwitchOverlay);
  const setShowSwitchOverlay = useAuthStore((s) => s.setShowSwitchOverlay);
  const loginByPin           = useAuthStore((s) => s.loginByPin);
  const isLoading            = useAuthStore((s) => s.isLoading);
  const currentUser          = useAuthStore((s) => s.user);

  const [users, setUsers]           = useState<ActiveUser[]>([]);
  const [loading, setLoading]       = useState(true);
  const [selectedUser, setSelectedUser] = useState<ActiveUser | null>(null);
  const [pin, setPin]               = useState('');
  const [isShaking, setIsShaking]   = useState(false);

  // Load users when overlay opens
  useEffect(() => {
    if (!showSwitchOverlay) return;
    setLoading(true);
    setSelectedUser(null);
    setPin('');
    setIsShaking(false);

    async function load() {
      try {
        const res = await window.electronAPI.invoke('db:users:getActiveList');
        if (res.success && res.data) setUsers(res.data);
      } catch {
        showError('فشل تحميل قائمة المستخدمين');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [showSwitchOverlay]);

  // Reset PIN on user selection
  useEffect(() => {
    if (selectedUser) { setPin(''); setIsShaking(false); }
  }, [selectedUser]);

  // ─── Native window keydown (no hidden input) ───
  useEffect(() => {
    if (!showSwitchOverlay || !selectedUser) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (isShaking) return;

      if ((/^Digit[0-9]$/.test(e.code) || /^Numpad[0-9]$/.test(e.code)) && pin.length < 4) {
        setPin((prev) => prev + e.key);
        return;
      }
      if (e.code === 'Backspace') { setPin((prev) => prev.slice(0, -1)); return; }
      if (e.code === 'Escape')    { setSelectedUser(null); setPin(''); return; }
      if (e.code === 'Enter' && pin.length === 4) { handleSubmitPin(); return; }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showSwitchOverlay, selectedUser, pin, isShaking]);

  // Also close overlay on Escape when on user-list screen
  useEffect(() => {
    if (!showSwitchOverlay || selectedUser) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Escape') setShowSwitchOverlay(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showSwitchOverlay, selectedUser, setShowSwitchOverlay]);

  // Auto-submit at 4 digits
  useEffect(() => {
    if (pin.length === 4 && selectedUser && !isShaking) handleSubmitPin();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pin]);

  const handleSubmitPin = async () => {
    if (!selectedUser || pin.length < 4 || isLoading) return;
    try {
      const res = await loginByPin(selectedUser.id, pin);
      if (res.success) {
        showSuccess(`تم التبديل إلى ${selectedUser.full_name}`);
        // overlay closes automatically via auth store listener
      } else {
        setIsShaking(true);
        showError(res.error || 'رمز PIN غير صحيح');
        setTimeout(() => { setIsShaking(false); setPin(''); }, 350);
      }
    } catch {
      showError('خطأ أثناء تبديل المستخدم');
    }
  };

  const handleKeypadPress = (num: string) => {
    if (pin.length < 4 && !isShaking) setPin((prev) => prev + num);
  };
  const handleDelete = () => {
    if (pin.length > 0 && !isShaking) setPin((prev) => prev.slice(0, -1));
  };

  if (!showSwitchOverlay) return null;

  return (
    <AnimatePresence>
      <motion.div
        key="overlay-bg"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/60 backdrop-blur-md overflow-hidden select-none font-cairo text-right"
      >
        {/* Ambient glow */}
        <div className="absolute top-1/3 left-1/3 w-80 h-80 bg-primary_blue/4 rounded-full blur-[120px] pointer-events-none" />

        {/* Main modal */}
        <motion.div
          initial={{ scale: 0.96, y: 8 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.96, y: 8 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          className="w-full max-w-xl bg-background_secondary/95 dark:bg-[#14171d]/75 backdrop-blur-2xl border border-border_default/30 dark:border-white/5 rounded-3xl p-8 shadow-2xl relative flex flex-col items-center min-h-[360px] justify-center mx-4"
        >
          {/* Close button */}
          <button
            onClick={() => setShowSwitchOverlay(false)}
            className="absolute top-4 left-4 p-2 text-text_muted hover:text-text_primary hover:bg-background_primary/60 dark:hover:bg-white/5 rounded-xl transition-all cursor-pointer"
          >
            <X size={17} />
          </button>

          <AnimatePresence mode="wait">
            {!selectedUser ? (
              /* ── User List ── */
              <motion.div
                key="list"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.15 }}
                className="w-full flex flex-col items-center"
              >
                <div className="flex items-center gap-2 mb-2">
                  <UserCheck className="w-4 h-4 text-primary_blue" />
                  <h2 className="text-base font-black text-text_primary">التبديل السريع</h2>
                </div>

                {currentUser && (
                  <p className="text-[10px] text-text_muted mb-6 font-bold">
                    الحساب الحالي: <span className="text-primary_blue">{currentUser.full_name}</span>
                  </p>
                )}

                {loading ? (
                  <div className="flex flex-col items-center p-8 space-y-3">
                    <div className="w-7 h-7 border-2 border-primary_blue border-t-transparent rounded-full animate-spin" />
                    <span className="text-xs font-bold text-text_muted">جاري التحميل...</span>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5 w-full max-w-md">
                    {users.map((u) => {
                      const theme = COLOR_THEMES[u.color || 'blue'] || COLOR_THEMES.blue;
                      const isCurrent = currentUser?.id === u.id;
                      return (
                        <motion.button
                          key={u.id}
                          onClick={() => setSelectedUser(u)}
                          whileHover={{ scale: 1.03, y: -2 }}
                          whileTap={{ scale: 0.97 }}
                          transition={{ type: 'spring', stiffness: 380, damping: 26 }}
                          className={`bg-background_primary/60 dark:bg-white/[0.02] border ${isCurrent ? 'border-primary_blue/30' : theme.border} rounded-2xl p-4 flex flex-col items-center text-center cursor-pointer group transition-all duration-200`}
                        >
                          <div className={`w-[44px] h-[44px] rounded-xl ${theme.bg} flex items-center justify-center border border-white/5 text-xl font-bold group-hover:scale-105 transition-transform duration-200`}>
                            {u.avatar || u.full_name.charAt(0)}
                          </div>
                          <span className="text-sm font-black text-text_primary mt-2.5 truncate w-full">
                            {u.full_name}
                          </span>
                          <span className="text-[9px] font-bold text-text_muted/70 mt-0.5">
                            {ROLE_LABELS[u.role] || u.role}
                          </span>
                        </motion.button>
                      );
                    })}
                  </div>
                )}
              </motion.div>
            ) : (
              /* ── PIN Pad ── */
              <motion.div
                key="pin"
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.15 }}
                className={`w-full max-w-[300px] p-2 flex flex-col items-center transition-all duration-200 ${
                  isShaking ? 'animate-shake' : ''
                }`}
              >
                <button
                  onClick={() => { setSelectedUser(null); setPin(''); }}
                  className="self-start flex items-center gap-1 text-xs font-bold text-text_muted hover:text-text_primary hover:bg-background_primary/40 dark:hover:bg-white/5 px-2 py-1 rounded-lg transition-all cursor-pointer mb-4"
                >
                  <ChevronRight size={14} />
                  رجوع
                </button>

                <div className="flex flex-col items-center mb-5">
                  <div className={`w-[44px] h-[44px] rounded-xl ${COLOR_THEMES[selectedUser.color || 'blue']?.bg} border border-border_default dark:border-white/5 flex items-center justify-center text-lg`}>
                    {selectedUser.avatar || selectedUser.full_name.charAt(0)}
                  </div>
                  <h3 className="text-sm font-black text-text_primary mt-2">{selectedUser.full_name}</h3>
                  <span className="text-[10px] text-text_muted/70 font-bold mt-0.5">أدخل رمز PIN</span>
                </div>

                {/* PIN squircles */}
                <div className="flex gap-3 mb-6">
                  {[0, 1, 2, 3].map((i) => {
                    const filled = pin.length > i;
                    return (
                      <div
                        key={i}
                        className={`w-[44px] h-[52px] rounded-xl flex items-center justify-center border-2 transition-all duration-150 ${
                          isShaking
                            ? 'bg-danger_red/10 border-danger_red/40'
                            : filled
                            ? 'bg-primary_blue border-primary_blue'
                            : 'bg-background_primary/40 dark:bg-white/[0.02] border-border_default dark:border-white/5'
                        }`}
                      >
                        {filled && <div className="w-2.5 h-2.5 bg-white rounded-full" />}
                      </div>
                    );
                  })}
                </div>

                {/* Numpad */}
                <div className="grid grid-cols-3 gap-3 w-full max-w-[240px]" dir="ltr">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => handleKeypadPress(num.toString())}
                      className="h-14 rounded-xl bg-background_primary/60 dark:bg-white/[0.03] border border-border_default/60 dark:border-white/5 hover:bg-background_secondary dark:hover:bg-white/[0.07] text-xl font-bold font-numbers text-text_primary transition-colors cursor-pointer select-none"
                    >
                      {num}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={handleDelete}
                    className="h-14 rounded-xl bg-status_error/10 border border-status_error/30 hover:bg-status_error/20 text-status_error font-bold flex items-center justify-center transition-colors cursor-pointer"
                  >
                    مسح
                  </button>
                  <button
                    type="button"
                    onClick={() => handleKeypadPress('0')}
                    className="h-14 rounded-xl bg-background_primary/60 dark:bg-white/[0.03] border border-border_default/60 dark:border-white/5 hover:bg-background_secondary dark:hover:bg-white/[0.07] text-xl font-bold font-numbers text-text_primary transition-colors cursor-pointer select-none"
                  >
                    0
                  </button>
                  <button
                    type="button"
                    onClick={handleSubmitPin}
                    disabled={isLoading || pin.length < 4}
                    className="h-14 rounded-xl bg-success_green/10 border border-success_green/30 hover:bg-success_green hover:text-text_primary text-success_green font-bold flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {isLoading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'تأكيد'}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
