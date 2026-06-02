import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, User, Shield, Wrench, Edit2, Check, KeyRound, Lock, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { usePinStore } from '../../store/pin.store';
import { useAuthStore } from '../../store/auth.store';
import { showSuccess, showError } from '../../shared/utils/notifications';

interface AccountDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AccountDrawer({ isOpen, onClose }: AccountDrawerProps) {
  const { user } = useAuth();
  const { setUser } = useAuthStore();
  const {
    isPinEnabled,
    setPinEnabled,
    inactivityLockEnabled,
    setInactivityLockEnabled,
    setLocked,
  } = usePinStore();

  // Inline editing states
  const [isEditingName, setIsEditingName] = useState(false);
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [isEditingUsername, setIsEditingUsername] = useState(false);
  const [username, setUsername] = useState(user?.username || '');

  // Change Password states
  const [showPasswordPanel, setShowPasswordPanel] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass, setShowPass] = useState(false);

  // Modify PIN states
  const [showPinPanel, setShowPinPanel] = useState(false);
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');

  // Save Inline updates
  const handleSaveProfile = async (field: 'full_name' | 'username') => {
    if (!user) return;
    const value = field === 'full_name' ? fullName : username;

    if (!value.trim()) {
      showError('الحقل لا يمكن أن يكون فارغاً');
      return;
    }

    try {
      const res: any = await window.electronAPI.invoke('db:users:update', user.id, { [field]: value });
      if (res.success) {
        showSuccess('تم تحديث البيانات بنجاح');
        setUser({ ...user, [field]: value });
        if (field === 'full_name') setIsEditingName(false);
        if (field === 'username') setIsEditingUsername(false);
      } else {
        showError(res.error || 'فشل التحديث');
      }
    } catch (err: any) {
      showError('حدث خطأ أثناء الاتصال بقاعدة البيانات');
    }
  };

  // Change Password Submission
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!currentPassword || !newPassword || !confirmPassword) {
      showError('يرجى ملء جميع حقول كلمة المرور');
      return;
    }

    if (newPassword !== confirmPassword) {
      showError('كلمة المرور الجديدة غير متطابقة');
      return;
    }

    try {
      const res: any = await window.electronAPI.invoke('auth:changePassword', user.id, currentPassword, newPassword);
      if (res.success) {
        showSuccess('تم تغيير كلمة المرور بنجاح');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setShowPasswordPanel(false);
      } else {
        showError(res.error || 'كلمة المرور الحالية غير صحيحة');
      }
    } catch (err) {
      showError('خطأ أثناء تغيير كلمة المرور');
    }
  };

  // Change PIN Submission
  const handleChangePin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!/^\d{4}$/.test(newPin)) {
      showError('يجب أن يتكون الـ PIN من 4 أرقام فقط');
      return;
    }

    if (newPin !== confirmPin) {
      showError('تأكيد الـ PIN غير متطابق');
      return;
    }

    try {
      const res: any = await window.electronAPI.invoke('db:users:update', user.id, { pin_code: newPin });
      if (res.success) {
        showSuccess('تم تحديث رمز PIN بنجاح');
        setUser({ ...user, pin_code: newPin });
        setNewPin('');
        setConfirmPin('');
        setShowPinPanel(false);
      } else {
        showError(res.error || 'فشل التحديث');
      }
    } catch (err) {
      showError('خطأ أثناء تحديث رمز PIN');
    }
  };

  // Toggle PIN lock verification check
  const handleTogglePin = (enabled: boolean) => {
    if (enabled && !user?.pin_code) {
      showError('يرجى تعيين رمز PIN أولاً قبل تفعيل القفل');
      setShowPinPanel(true);
      return;
    }
    setPinEnabled(enabled);
    showSuccess(enabled ? 'تم تفعيل قفل شاشة الـ PIN' : 'تم إلغاء قفل شاشة الـ PIN');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop blur overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.6 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[1000] bg-black/60 backdrop-blur-sm cursor-pointer"
          />

          {/* Sliding panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 220 }}
            dir="rtl"
            className="fixed top-0 bottom-0 left-0 md:left-auto md:right-0 w-full md:w-[420px] z-[1001] bg-[#14171d]/90 backdrop-blur-2xl border-r md:border-r-0 md:border-l border-white/10 shadow-[0_0_60px_rgba(0,0,0,0.65)] flex flex-col custom-scrollbar select-none"
          >
            {/* Header */}
            <div className="p-6 border-b border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Shield className="w-5.5 h-5.5 text-primary_blue" />
                <h3 className="text-lg font-black text-text_primary">إعدادات حسابي</h3>
              </div>
              <button
                onClick={onClose}
                className="p-2 text-text_secondary hover:text-text_primary hover:bg-white/5 rounded-xl transition-all cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Content Body */}
            <div className="flex-1 p-6 space-y-6 overflow-y-auto custom-scrollbar pb-24">
              
              {/* Card A: Profile Details */}
              <div className="p-6 bg-white/[0.02] border border-white/5 rounded-2xl space-y-5">
                
                {/* User Avatar Header */}
                <div className="flex flex-col items-center pb-4 border-b border-white/5">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary_blue to-indigo-800 flex items-center justify-center shadow-lg shadow-primary_blue/20 relative">
                    <User className="w-10 h-10 text-white" />
                    <div className="absolute bottom-0 right-0 w-5.5 h-5.5 rounded-full bg-success_green border-4 border-[#14171d] animate-pulse" />
                  </div>
                  <span className="mt-3 text-xs font-black uppercase bg-primary_blue/15 text-primary_blue px-3 py-1 rounded-full border border-primary_blue/20">
                    {user?.role === 'owner' ? 'المالك' : user?.role === 'manager' ? 'المدير' : 'موظف'}
                  </span>
                </div>

                {/* Inline Editables */}
                <div className="space-y-4">
                  {/* Full Name Field */}
                  <div className="space-y-1.5">
                    <label className="text-xs text-text_muted block font-bold">الاسم الكامل</label>
                    {isEditingName ? (
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          className="flex-1 bg-white/[0.04] border border-primary_blue/40 rounded-xl px-3 py-2 text-text_primary outline-none focus:ring-1 focus:ring-primary_blue/30 text-sm font-bold"
                          autoFocus
                        />
                        <button
                          onClick={() => handleSaveProfile('full_name')}
                          className="p-2.5 bg-primary_blue text-white rounded-xl hover:bg-primary_blue_hover transition-colors cursor-pointer"
                        >
                          <Check size={16} />
                        </button>
                        <button
                          onClick={() => { setIsEditingName(false); setFullName(user?.full_name || ''); }}
                          className="p-2.5 bg-white/5 text-text_secondary rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ) : (
                      <div
                        onClick={() => setIsEditingName(true)}
                        className="group flex items-center justify-between px-3 py-2.5 rounded-xl border border-transparent hover:border-white/5 hover:bg-white/[0.01] transition-all cursor-pointer"
                      >
                        <span className="text-sm font-bold text-text_primary">{user?.full_name}</span>
                        <Edit2 size={14} className="text-text_muted opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    )}
                  </div>

                  {/* Username Field */}
                  <div className="space-y-1.5">
                    <label className="text-xs text-text_muted block font-bold">اسم المستخدم</label>
                    {isEditingUsername ? (
                      <div className="flex gap-2" dir="ltr">
                        <input
                          type="text"
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          className="flex-1 bg-white/[0.04] border border-primary_blue/40 rounded-xl px-3 py-2 text-text_primary outline-none focus:ring-1 focus:ring-primary_blue/30 text-sm font-bold text-left"
                          autoFocus
                        />
                        <button
                          onClick={() => handleSaveProfile('username')}
                          className="p-2.5 bg-primary_blue text-white rounded-xl hover:bg-primary_blue_hover transition-colors cursor-pointer"
                        >
                          <Check size={16} />
                        </button>
                        <button
                          onClick={() => { setIsEditingUsername(false); setUsername(user?.username || ''); }}
                          className="p-2.5 bg-white/5 text-text_secondary rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ) : (
                      <div
                        onClick={() => setIsEditingUsername(true)}
                        className="group flex items-center justify-between px-3 py-2.5 rounded-xl border border-transparent hover:border-white/5 hover:bg-white/[0.01] transition-all cursor-pointer"
                      >
                        <span className="text-sm font-bold text-text_primary font-mono">{user?.username}</span>
                        <Edit2 size={14} className="text-text_muted opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    )}
                  </div>

                  {/* Created At (ReadOnly) */}
                  {user?.created_at && (
                    <div className="space-y-1">
                      <label className="text-xs text-text_muted block font-bold">تاريخ إنشاء الحساب</label>
                      <div className="px-3 py-2 text-sm text-text_secondary font-numbers">
                        {new Date(user.created_at).toLocaleDateString('ar-DZ')}
                      </div>
                    </div>
                  )}
                </div>

              </div>

              {/* Card B: Security & Preferences */}
              <div className="p-6 bg-white/[0.02] border border-white/5 rounded-2xl space-y-6">
                <h4 className="text-sm font-black text-text_primary pb-3 border-b border-white/5 flex items-center gap-2">
                  <Lock className="w-4 h-4 text-primary_blue" /> الأمان والخصوصية
                </h4>

                {/* Toggle - Enable PIN Lock */}
                <div className="flex items-center justify-between">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-bold text-text_primary">تفعيل قفل الـ PIN</span>
                    <span className="text-xs text-text_muted">طلب رمز 4 أرقام لتأمين البرنامج</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={isPinEnabled}
                      onChange={(e) => handleTogglePin(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-text_muted after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary_blue peer-checked:after:bg-white"></div>
                  </label>
                </div>

                {/* Toggle - Inactivity Lock */}
                {isPinEnabled && (
                  <div className="flex items-center justify-between pt-2">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-sm font-bold text-text_primary">قفل تلقائي عند الخمول</span>
                      <span className="text-xs text-text_muted">قفل البرنامج بعد 5 دقائق من الخمول</span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={inactivityLockEnabled}
                        onChange={(e) => {
                          setInactivityLockEnabled(e.target.checked);
                          showSuccess(e.target.checked ? 'تم تفعيل قفل الخمول بعد 5 دقائق' : 'تم إيقاف قفل الخمول التلقائي');
                        }}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-text_muted after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary_blue peer-checked:after:bg-white"></div>
                    </label>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex flex-col gap-3 pt-2">
                  {/* Button: Lock Screen Manually */}
                  {isPinEnabled && (
                    <button
                      onClick={() => {
                        setLocked(true);
                        onClose();
                      }}
                      className="w-full py-3 bg-white/5 hover:bg-white/10 border border-white/5 text-text_primary rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer"
                    >
                      <Lock size={16} className="text-primary_blue" />
                      قفل الشاشة الآن
                    </button>
                  )}

                  {/* Button: Change Password */}
                  <button
                    onClick={() => {
                      setShowPasswordPanel(!showPasswordPanel);
                      setShowPinPanel(false);
                    }}
                    className="w-full py-3 bg-white/5 hover:bg-white/10 border border-white/5 text-text_primary rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    <KeyRound size={16} className="text-primary_blue" />
                    تغيير كلمة المرور
                  </button>

                  {/* Expandable Password Panel */}
                  <AnimatePresence>
                    {showPasswordPanel && (
                      <motion.form
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        onSubmit={handleChangePassword}
                        className="p-4 bg-white/[0.01] border border-white/5 rounded-xl space-y-3 overflow-hidden"
                      >
                        <div className="space-y-1">
                          <label className="text-xs text-text_secondary font-bold">كلمة المرور الحالية</label>
                          <div className="relative">
                            <input
                              type={showPass ? 'text' : 'password'}
                              value={currentPassword}
                              onChange={(e) => setCurrentPassword(e.target.value)}
                              className="w-full bg-white/[0.03] border border-white/10 rounded-lg px-3 py-2 text-text_primary text-sm outline-none focus:border-primary_blue"
                            />
                            <button
                              type="button"
                              onClick={() => setShowPass(!showPass)}
                              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text_muted hover:text-text_secondary"
                            >
                              {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                            </button>
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="text-xs text-text_secondary font-bold">كلمة المرور الجديدة</label>
                          <input
                            type="password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className="w-full bg-white/[0.03] border border-white/10 rounded-lg px-3 py-2 text-text_primary text-sm outline-none focus:border-primary_blue"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-xs text-text_secondary font-bold">تأكيد كلمة المرور</label>
                          <input
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="w-full bg-white/[0.03] border border-white/10 rounded-lg px-3 py-2 text-text_primary text-sm outline-none focus:border-primary_blue"
                          />
                        </div>

                        <button
                          type="submit"
                          className="w-full py-2 bg-primary_blue hover:bg-primary_blue_hover text-white rounded-lg text-xs font-bold transition-all cursor-pointer shadow-md shadow-primary_blue/10"
                        >
                          تحديث كلمة المرور
                        </button>
                      </motion.form>
                    )}
                  </AnimatePresence>

                  {/* Button: Modify 4-Digit PIN */}
                  <button
                    onClick={() => {
                      setShowPinPanel(!showPinPanel);
                      setShowPasswordPanel(false);
                    }}
                    className="w-full py-3 bg-white/5 hover:bg-white/10 border border-white/5 text-text_primary rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    <Shield size={16} className="text-primary_blue" />
                    تعديل رمز الـ PIN المكون من 4 أرقام
                  </button>

                  {/* Expandable PIN Panel */}
                  <AnimatePresence>
                    {showPinPanel && (
                      <motion.form
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        onSubmit={handleChangePin}
                        className="p-4 bg-white/[0.01] border border-white/5 rounded-xl space-y-3 overflow-hidden"
                      >
                        <div className="space-y-1">
                          <label className="text-xs text-text_secondary font-bold">رمز PIN الجديد (4 أرقام)</label>
                          <input
                            type="password"
                            maxLength={4}
                            value={newPin}
                            onChange={(e) => setNewPin(e.target.value.replace(/[^0-9]/g, ''))}
                            className="w-full bg-white/[0.03] border border-white/10 rounded-lg px-3 py-2 text-text_primary text-sm outline-none focus:border-primary_blue text-center tracking-widest font-bold"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-xs text-text_secondary font-bold">تأكيد الـ PIN الجديد</label>
                          <input
                            type="password"
                            maxLength={4}
                            value={confirmPin}
                            onChange={(e) => setConfirmPin(e.target.value.replace(/[^0-9]/g, ''))}
                            className="w-full bg-white/[0.03] border border-white/10 rounded-lg px-3 py-2 text-text_primary text-sm outline-none focus:border-primary_blue text-center tracking-widest font-bold"
                          />
                        </div>

                        <button
                          type="submit"
                          className="w-full py-2 bg-primary_blue hover:bg-primary_blue_hover text-white rounded-lg text-xs font-bold transition-all cursor-pointer shadow-md shadow-primary_blue/10"
                        >
                          حفظ رمز PIN الجديد
                        </button>
                      </motion.form>
                    )}
                  </AnimatePresence>

                </div>
              </div>

            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
