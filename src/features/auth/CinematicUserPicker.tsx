import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { KeyRound, Wrench, ChevronRight, Delete } from 'lucide-react';
import { useAuthStore } from '../../store/auth.store';
import { showError, showSuccess } from '../../shared/utils/notifications';
import { logoData } from './logoData';

interface ActiveUser {
  id: number;
  username: string;
  full_name: string;
  role: 'owner' | 'manager' | 'accountant' | 'cashier' | 'storekeeper' | 'employee';
  avatar?: string;
  color?: string;
}

interface CinematicUserPickerProps {
  onTogglePasswordLogin: () => void;
}

const COLOR_THEMES: Record<string, { border: string; text: string; bg: string }> = {
  blue:    { border: 'border-blue-500/15 hover:border-blue-500/30',    text: 'text-blue-400',    bg: 'bg-blue-500/8'    },
  emerald: { border: 'border-emerald-500/15 hover:border-emerald-500/30', text: 'text-emerald-400', bg: 'bg-emerald-500/8' },
  rose:    { border: 'border-rose-500/15 hover:border-rose-500/30',    text: 'text-rose-400',    bg: 'bg-rose-500/8'    },
  amber:   { border: 'border-amber-500/15 hover:border-amber-500/30',  text: 'text-amber-400',   bg: 'bg-amber-500/8'   },
  violet:  { border: 'border-violet-500/15 hover:border-violet-500/30', text: 'text-violet-400', bg: 'bg-violet-500/8'  },
  slate:   { border: 'border-slate-400/15 hover:border-slate-400/30',  text: 'text-slate-400',   bg: 'bg-slate-400/8'   },
};

const ROLE_LABELS: Record<string, string> = {
  owner:       'المالك',
  manager:     'المدير',
  accountant:  'المحاسب',
  cashier:     'الكاشير',
  storekeeper: 'أمين المستودع',
  employee:    'موظف',
};

export default function CinematicUserPicker({ onTogglePasswordLogin }: CinematicUserPickerProps) {
  const [users, setUsers] = useState<ActiveUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<ActiveUser | null>(null);
  const [pin, setPin] = useState('');
  const [isShaking, setIsShaking] = useState(false);

  const loginByPin = useAuthStore((state) => state.loginByPin);
  const isLoading = useAuthStore((state) => state.isLoading);

  // Load active users list
  useEffect(() => {
    async function loadUsers() {
      try {
        const res = await window.electronAPI.invoke('db:users:getActiveList');
        if (res.success && res.data) setUsers(res.data);
      } catch {
        showError('فشل تحميل قائمة المستخدمين');
      } finally {
        setLoading(false);
      }
    }
    loadUsers();
  }, []);

  // Reset PIN on user selection change
  useEffect(() => {
    if (selectedUser) {
      setPin('');
      setIsShaking(false);
    }
  }, [selectedUser]);

  // ─── Native window keydown listener (no hidden input needed) ───
  useEffect(() => {
    if (!selectedUser) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (isShaking) return;

      // Digits: keyboard row & numpad
      if ((/^Digit[0-9]$/.test(e.code) || /^Numpad[0-9]$/.test(e.code)) && pin.length < 4) {
        const digit = e.key.replace('Numpad', '');
        setPin((prev) => prev + digit);
        return;
      }

      if (e.code === 'Backspace') {
        setPin((prev) => prev.slice(0, -1));
        return;
      }

      if (e.code === 'Escape') {
        setSelectedUser(null);
        setPin('');
        return;
      }

      if (e.code === 'Enter' && pin.length === 4) {
        handleSubmitPin();
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedUser, pin, isShaking]);

  // Auto-submit when 4 digits entered
  useEffect(() => {
    if (pin.length === 4 && selectedUser && !isShaking) {
      handleSubmitPin();
    }
  }, [pin]);

  const handleSubmitPin = async () => {
    if (!selectedUser || pin.length < 4 || isLoading) return;

    try {
      const res = await loginByPin(selectedUser.id, pin);
      if (res.success) {
        showSuccess(`مرحباً بك ${selectedUser.full_name}`);
        try { await window.electronAPI.invoke('window:expand'); } catch {}
      } else {
        setIsShaking(true);
        showError(res.error || 'رمز PIN غير صحيح');
        setTimeout(() => {
          setIsShaking(false);
          setPin('');
        }, 350);
      }
    } catch {
      showError('خطأ أثناء تسجيل الدخول');
    }
  };

  const handleKeypadPress = (num: string) => {
    if (pin.length < 4 && !isShaking) setPin((prev) => prev + num);
  };

  const handleDelete = () => {
    if (pin.length > 0 && !isShaking) setPin((prev) => prev.slice(0, -1));
  };

  return (
    <div className="flex flex-col items-center justify-center text-right font-cairo select-none relative w-full h-full">
      {/* Background blobs for premium depth */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary_blue/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-600/5 rounded-full blur-[120px] pointer-events-none" />

      {/* Main Glass Container Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        className={`relative w-full max-w-lg flex flex-col items-center z-10 ${selectedUser ? 'p-1' : 'p-2'}`}
      >
        {!selectedUser && (
          <>
            {/* Logo Header */}
        <div className="text-center mb-4 flex flex-col items-center">
          {logoData ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1, y: [0, -3, 0] }}
              whileHover={{ scale: 1.08, rotate: -5 }}
              whileTap={{ scale: 0.95 }}
              transition={{
                y: {
                  duration: 4,
                  repeat: Infinity,
                  ease: "easeInOut"
                },
                type: 'spring',
                stiffness: 300,
                damping: 15,
                delay: 0.05
              }}
              className="relative w-20 h-20 rounded-full bg-white dark:bg-slate-900/60 p-0.5 border-2 border-primary_blue/40 shadow-xl shadow-primary_blue/20 flex items-center justify-center mb-2.5 backdrop-blur-md overflow-hidden cursor-pointer group"
            >
              <div className="absolute inset-0 bg-gradient-to-tr from-primary_blue/10 to-blue-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <img 
                src={logoData} 
                alt="App Logo" 
                className="w-full h-full object-contain rounded-full transition-transform duration-300 group-hover:scale-[1.4] scale-[1.35]" 
              />
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-b from-primary_blue to-blue-800 shadow-lg shadow-primary_blue/10 mb-2 border border-white/10"
            >
              <Wrench className="w-6 h-6 text-white" />
            </motion.div>
          )}
          <motion.h1
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.08, duration: 0.25 }}
            className="text-xl font-black text-text_primary tracking-wide"
          >
            YK MS ERP
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.12, duration: 0.25 }}
            className="text-[10px] text-text_muted/60 mt-0.5 font-bold"
          >
            Developed by YK MS AI
          </motion.p>
        </div>

            {/* Separator Line */}
            <div className="w-full h-px bg-border_default dark:bg-white/5 mb-4" />
          </>
        )}

        {/* Main Content Area */}
        <div className="w-full min-h-[250px] flex items-center justify-center relative">
          <AnimatePresence mode="wait">
            {!selectedUser ? (
              // View 1: User Cards List
              <motion.div
                key="user-list"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.15 }}
                className="w-full flex flex-col items-center animate-fade-in"
              >
                <p className="text-xs font-bold text-text_muted/80 mb-6 select-none">
                  اختر الحساب للولوج السريع
                </p>

                {loading ? (
                  <div className="flex flex-col items-center justify-center p-8 space-y-3">
                    <div className="w-8 h-8 border-2 border-primary_blue border-t-transparent rounded-full animate-spin" />
                    <span className="text-xs font-bold text-text_muted">جاري تحميل الحسابات...</span>
                  </div>
                ) : users.length === 0 ? (
                  <div className="text-center p-8 bg-white/[0.02] border border-white/5 rounded-2xl w-full">
                    <p className="text-sm font-bold text-text_secondary">لا يوجد مستخدمون نشطون.</p>
                    <p className="text-xs text-text_muted mt-1">سجّل الدخول بكلمة المرور لإعداد حساب.</p>
                  </div>
                ) : (
                  <div className="max-h-[250px] overflow-y-auto custom-scrollbar w-full px-1">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 w-full">
                      {users.map((u) => {
                        const theme = COLOR_THEMES[u.color || 'blue'] || COLOR_THEMES.blue;
                        return (
                          <motion.button
                            key={u.id}
                            onClick={() => setSelectedUser(u)}
                            whileHover={{ scale: 1.04, y: -2 }}
                            whileTap={{ scale: 0.96 }}
                            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                            className={`bg-background_primary/60 dark:bg-white/[0.02] border ${theme.border} rounded-2xl p-3 flex flex-col items-center text-center transition-all duration-200 cursor-pointer group w-full`}
                          >
                            {/* Avatar */}
                            <div className={`w-[44px] h-[44px] rounded-xl ${theme.bg} flex items-center justify-center border border-white/5 text-xl font-bold select-none shrink-0 transition-transform duration-200 group-hover:scale-105`}>
                              {u.avatar || u.full_name.charAt(0)}
                            </div>

                            {/* Name */}
                            <span className="text-xs font-black text-text_primary mt-2 truncate w-full group-hover:text-white transition-colors">
                              {u.full_name}
                            </span>

                            {/* Role badge */}
                            <span className="text-[9px] font-bold text-text_muted/70 mt-0.5">
                              {ROLE_LABELS[u.role] || u.role}
                            </span>
                          </motion.button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </motion.div>
            ) : (
              // View 2: PIN Lock Screen / Keypad
              // View 2: PIN Lock Screen / Keypad (Transparent Card Style)
              <motion.div
                key="pin-pad"
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.15 }}
                className={`w-full max-w-[300px] p-2 flex flex-col items-center transition-all duration-200 ${
                  isShaking ? 'animate-shake' : ''
                }`}
              >
                {/* Back */}
                <button
                  onClick={() => { setSelectedUser(null); setPin(''); }}
                  className="self-start flex items-center gap-1 text-xs font-bold text-text_muted hover:text-text_primary hover:bg-background_primary/40 dark:hover:bg-white/5 px-2 py-1 rounded-lg transition-all cursor-pointer mb-2"
                >
                  <ChevronRight size={14} />
                  رجوع
                </button>

                {/* Selected user */}
                <div className="flex flex-col items-center mb-3">
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

                {/* Numpad */}
                <div className="grid grid-cols-3 gap-3 w-full max-w-[240px]" dir="ltr">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => handleKeypadPress(num.toString())}
                      className="h-12 rounded-xl bg-background_primary/60 dark:bg-white/[0.03] border border-border_default/60 dark:border-white/5 hover:bg-background_secondary dark:hover:bg-white/[0.07] text-xl font-bold font-numbers text-text_primary transition-colors cursor-pointer select-none"
                    >
                      {num}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={handleDelete}
                    className="h-12 rounded-xl bg-status_error/10 border border-status_error/30 hover:bg-status_error/20 text-status_error font-bold flex items-center justify-center transition-colors cursor-pointer"
                  >
                    مسح
                  </button>
                  <button
                    type="button"
                    onClick={() => handleKeypadPress('0')}
                    className="h-12 rounded-xl bg-background_primary/60 dark:bg-white/[0.03] border border-border_default/60 dark:border-white/5 hover:bg-background_secondary dark:hover:bg-white/[0.07] text-xl font-bold font-numbers text-text_primary transition-colors cursor-pointer select-none"
                  >
                    0
                  </button>
                  <button
                    type="button"
                    onClick={handleSubmitPin}
                    disabled={isLoading || pin.length < 4}
                    className="h-12 rounded-xl bg-success_green/10 border border-success_green/30 hover:bg-success_green hover:text-text_primary text-success_green font-bold flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {isLoading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'تأكيد'}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Divider */}
        <div className="w-full h-px bg-border_default dark:bg-white/5 mt-4 mb-4" />

        {/* Traditional Login Toggle */}
        <motion.button
          onClick={onTogglePasswordLogin}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="flex items-center gap-2 text-xs font-black text-text_secondary hover:text-primary_blue transition-all cursor-pointer bg-background_primary/40 dark:bg-white/[0.03] hover:bg-background_secondary dark:hover:bg-white/[0.06] px-5 py-2 rounded-xl border border-border_default dark:border-white/5"
        >
          <KeyRound size={13} className="text-primary_blue" />
          الدخول بكلمة المرور
        </motion.button>
      </motion.div>
    </div>
  );
}
