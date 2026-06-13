import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Lock, Eye, EyeOff, Check, User, Users, Plus, Key, AtSign, Power } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useAuthStore } from '../../store/auth.store';
import { showSuccess, showError } from '../../shared/utils/notifications';

interface AccountModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type PanelView =
  | 'auth-gate'       // username and password gate
  | 'settings-form';   // unified settings form (profile, workers, custom permissions)

const ROLE_LABELS: Record<string, string> = {
  owner: 'المالك (Owner)',
  manager: 'المدير (Manager)',
  accountant: 'المحاسب (Accountant)',
  cashier: 'أمين الصندوق (Cashier)',
  storekeeper: 'أمين المستودع (Storekeeper)',
  employee: 'عامل عام (Worker)',
};

const COLOR_THEMES = [
  { value: 'blue', label: 'الأزرق', bg: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  { value: 'emerald', label: 'الأخضر', bg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
  { value: 'rose', label: 'الوردي', bg: 'bg-rose-500/10 text-rose-400 border-rose-500/20' },
  { value: 'amber', label: 'الذهبي', bg: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
  { value: 'violet', label: 'البنفسجي', bg: 'bg-violet-500/10 text-violet-400 border-violet-500/20' },
  { value: 'slate', label: 'الرمادي', bg: 'bg-slate-400/10 text-slate-400 border-slate-400/20' },
];

const AVAILABLE_PERMISSIONS = [
  { key: 'view_dashboard', label: 'دخول لوحة التحكم' },
  { key: 'view_sales', label: 'عرض المبيعات' },
  { key: 'create_sale', label: 'إنشاء فاتورة بيع' },
  { key: 'cancel_sale', label: 'إلغاء فاتورة بيع' },
  { key: 'view_purchases', label: 'عرض المشتريات' },
  { key: 'create_purchase', label: 'إنشاء فاتورة شراء' },
  { key: 'view_inventory', label: 'عرض المخزون' },
  { key: 'adjust_stock', label: 'تعديل المخزون/الجرد' },
  { key: 'view_cashbox', label: 'عرض الصندوق/المالية' },
  { key: 'close_cashbox', label: 'إغلاق الصندوق' },
  { key: 'view_reports', label: 'عرض التقارير والإحصائيات' },
  { key: 'view_settings', label: 'عرض إعدادات النظام' },
];

const DEFAULT_ROLE_PERMISSIONS: Record<string, string[]> = {
  owner: [
    'view_dashboard', 'view_sales', 'create_sale', 'cancel_sale',
    'view_purchases', 'create_purchase', 'view_inventory', 'adjust_stock',
    'view_cashbox', 'close_cashbox', 'view_reports', 'view_settings'
  ],
  manager: [
    'view_dashboard', 'view_sales', 'create_sale', 'cancel_sale',
    'view_purchases', 'create_purchase', 'view_inventory', 'adjust_stock',
    'view_cashbox', 'close_cashbox', 'view_reports'
  ],
  accountant: [
    'view_dashboard', 'view_sales', 'view_purchases',
    'view_cashbox', 'view_reports'
  ],
  cashier: [
    'view_dashboard', 'view_sales', 'create_sale',
    'view_cashbox', 'close_cashbox'
  ],
  storekeeper: [
    'view_dashboard', 'view_purchases', 'create_purchase',
    'view_inventory', 'adjust_stock'
  ],
  employee: [
    'view_dashboard', 'view_inventory'
  ],
};

export default function AccountModal({ isOpen, onClose }: AccountModalProps) {
  const { user } = useAuth();
  const { setUser } = useAuthStore();

  const [panel, setPanel] = useState<PanelView>('auth-gate');
  const [activeSubTab, setActiveSubTab] = useState<'profile' | 'workers'>('profile');

  // Auth gate credentials state
  const [confirmUsername, setConfirmUsername] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [confirmPwError, setConfirmPwError] = useState('');
  const [confirmPwLoading, setConfirmPwLoading] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);

  // Settings form fields state
  const [newName, setNewName] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Workers & Permissions state
  const [workers, setWorkers] = useState<any[]>([]);
  const [isWorkersLoading, setIsWorkersLoading] = useState(false);
  const [editingWorker, setEditingWorker] = useState<any | null>(null);
  const [editingPermissions, setEditingPermissions] = useState<string[]>([]);
  const [isSavingPermissions, setIsSavingPermissions] = useState(false);
  
  // Add new worker state
  const [isAddingWorker, setIsAddingWorker] = useState(false);
  const [isCreatingWorker, setIsCreatingWorker] = useState(false);
  const [workerFullName, setWorkerFullName] = useState('');
  const [workerUsername, setWorkerUsername] = useState('');
  const [workerPassword, setWorkerPassword] = useState('');
  const [workerPin, setWorkerPin] = useState('');
  const [workerRole, setWorkerRole] = useState('employee');
  const [workerAvatar] = useState('👤');
  const [workerColor] = useState('blue');
  const [workerPermissions, setWorkerPermissions] = useState<string[]>([]);

  // Fetch list of workers
  const fetchWorkers = async () => {
    setIsWorkersLoading(true);
    try {
      const res = await window.electronAPI.invoke('db:users:getAll');
      if (res.success && res.data) {
        setWorkers(res.data);
      }
    } catch (err) {
      console.error('Failed to load workers:', err);
    } finally {
      setIsWorkersLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && activeSubTab === 'workers' && (user?.role === 'owner' || user?.role === 'manager')) {
      fetchWorkers();
    }
  }, [isOpen, activeSubTab, user]);

  // Reset states on modal close/open
  useEffect(() => {
    if (!isOpen) {
      setTimeout(() => {
        setPanel('auth-gate');
        setActiveSubTab('profile');
        setConfirmUsername('');
        setConfirmPassword('');
        setConfirmPwError('');
        setConfirmPwLoading(false);
        setShowConfirmPw(false);
        setNewName('');
        setNewUsername('');
        setNewPw('');
        setConfirmPw('');
        setShowPw(false);
        setNewPin('');
        setConfirmPin('');
        setIsSaving(false);
        setEditingWorker(null);
        setIsAddingWorker(false);
      }, 200);
    } else {
      setConfirmUsername(user?.username || '');
      setNewName(user?.full_name || '');
      setNewUsername(user?.username || '');
      setNewPin(user?.pin_code || '');
      setConfirmPin(user?.pin_code || '');
    }
  }, [isOpen, user]);

  // Escape key close listener
  useEffect(() => {
    if (!isOpen) return;
    const handle = (e: KeyboardEvent) => {
      if (e.code === 'Escape') onClose();
    };
    window.addEventListener('keydown', handle);
    return () => window.removeEventListener('keydown', handle);
  }, [isOpen, onClose]);

  // ─── Verification Gate submission ──────────────────────────────────────────
  const handleVerifyCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!confirmUsername.trim() || !confirmPassword) {
      setConfirmPwError('يرجى ملء جميع الحقول');
      return;
    }

    setConfirmPwLoading(true);
    setConfirmPwError('');
    try {
      const res: any = await window.electronAPI.invoke('auth:login', confirmUsername.trim(), confirmPassword);
      if (res?.success && res?.user) {
        if (res.user.id !== user.id) {
          setConfirmPwError('بيانات الاعتماد لا تطابق حسابك الحالي');
          showError('بيانات الاعتماد لا تطابق حسابك الحالي');
        } else {
          setPanel('settings-form');
        }
      } else {
        setConfirmPwError(res?.error || 'اسم المستخدم أو كلمة المرور غير صحيحة');
        showError(res?.error || 'اسم المستخدم أو كلمة المرور غير صحيحة');
      }
    } catch {
      setConfirmPwError('خطأ في التحقق من البيانات');
      showError('خطأ في التحقق من البيانات');
    } finally {
      setConfirmPwLoading(false);
    }
  };

  // ─── Unified Save Changes handler ──────────────────────────────────────────
  const handleSaveChanges = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!newName.trim()) {
      return showError('الاسم الكامل لا يمكن أن يكون فارغاً');
    }
    if (!newUsername.trim()) {
      return showError('اسم المستخدم لا يمكن أن يكون فارغاً');
    }

    setIsSaving(true);
    try {
      const updates: Record<string, any> = {};
      if (newName.trim() !== user.full_name) updates.full_name = newName.trim();
      if (newUsername.trim() !== user.username) updates.username = newUsername.trim();

      let mainUpdatesSuccess = true;
      if (Object.keys(updates).length > 0) {
        const res = await window.electronAPI.invoke('db:users:update', user.id, updates);
        if (!res.success) {
          showError(res.error || 'فشل تحديث البيانات الشخصية');
          mainUpdatesSuccess = false;
        }
      }

      let passwordSuccess = true;
      if (newPw) {
        if (newPw !== confirmPw) {
          showError('كلمتا المرور الجديدتان غير متطابقتين');
          setIsSaving(false);
          return;
        }
        const res = await window.electronAPI.invoke('db:users:resetPassword', user.id, newPw);
        if (!res.success) {
          showError(res.error || 'فشل تحديث كلمة المرور');
          passwordSuccess = false;
        }
      }

      let pinSuccess = true;
      if (newPin !== (user.pin_code || '')) {
        if (newPin && !/^\d{4}$/.test(newPin)) {
          showError('يجب أن يتكون رمز الـ PIN من 4 أرقام فقط');
          setIsSaving(false);
          return;
        }
        if (newPin !== confirmPin) {
          showError('تأكيد رمز الـ PIN الجديد غير متطابق');
          setIsSaving(false);
          return;
        }
        const res = await window.electronAPI.invoke('db:users:update', user.id, { pin_code: newPin || null });
        if (!res.success) {
          showError(res.error || 'فشل تحديث رمز PIN');
          pinSuccess = false;
        }
      }

      if (mainUpdatesSuccess && passwordSuccess && pinSuccess && user) {
        showSuccess('تم حفظ التغييرات بنجاح');
        setUser({
          ...user,
          full_name: newName.trim(),
          username: newUsername.trim(),
          pin_code: newPin || undefined,
        });
        onClose();
      }
    } catch {
      showError('حدث خطأ غير متوقع أثناء الحفظ');
    } finally {
      setIsSaving(false);
    }
  };

  // Select worker to view/edit permissions
  const handleSelectWorker = (w: any) => {
    setEditingWorker(w);
    setIsAddingWorker(false);
    
    if (w.permissions) {
      try {
        const parsed = JSON.parse(w.permissions);
        if (Array.isArray(parsed)) {
          setEditingPermissions(parsed);
          return;
        }
      } catch (err) {}
    }
    setEditingPermissions(DEFAULT_ROLE_PERMISSIONS[w.role] || []);
  };

  // Toggle permission checkbox
  const handleTogglePermission = (permKey: string) => {
    setEditingPermissions(prev =>
      prev.includes(permKey) ? prev.filter(k => k !== permKey) : [...prev, permKey]
    );
  };

  // Save edited permissions to database
  const handleSavePermissions = async () => {
    if (!editingWorker) return;
    setIsSavingPermissions(true);
    try {
      const res = await window.electronAPI.invoke('db:users:update', editingWorker.id, {
        permissions: JSON.stringify(editingPermissions)
      });
      if (res.success) {
        showSuccess('تم تحديث صلاحيات الموظف بنجاح');
        fetchWorkers();
        if (user && editingWorker.id === user.id) {
          setUser({ ...user, permissions: JSON.stringify(editingPermissions) });
        }
      } else {
        showError(res.error || 'فشل تحديث الصلاحيات');
      }
    } catch (err) {
      showError('خطأ غير متوقع أثناء تحديث الصلاحيات');
    } finally {
      setIsSavingPermissions(false);
    }
  };

  // Create new worker account
  const handleCreateWorker = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workerFullName.trim() || !workerUsername.trim() || !workerPassword.trim() || !workerPin.trim()) {
      showError('يرجى ملء جميع الحقول المطلوبة');
      return;
    }
    if (workerPin.length !== 4 || !/^\d{4}$/.test(workerPin)) {
      showError('رمز الـ PIN يجب أن يتكون من 4 أرقام فقط');
      return;
    }
    
    setIsCreatingWorker(true);
    try {
      const res = await window.electronAPI.invoke('db:users:create', {
        username: workerUsername.trim().toLowerCase(),
        password: workerPassword.trim(),
        full_name: workerFullName.trim(),
        role: workerRole,
        pin_code: workerPin,
        avatar: workerAvatar,
        color: workerColor,
        permissions: JSON.stringify(workerPermissions),
      });
      
      if (res.success) {
        showSuccess('تم إضافة الموظف بنجاح وتعيين صلاحياته');
        setIsAddingWorker(false);
        setWorkerFullName('');
        setWorkerUsername('');
        setWorkerPassword('');
        setWorkerPin('');
        setWorkerRole('employee');
        setWorkerPermissions(DEFAULT_ROLE_PERMISSIONS['employee'] || []);
        fetchWorkers();
      } else {
        showError(res.error || 'فشل إضافة الموظف');
      }
    } catch (err) {
      showError('خطأ أثناء إضافة الموظف');
    } finally {
      setIsCreatingWorker(false);
    }
  };

  // Toggle user activation status
  const handleToggleWorkerActive = async (w: any) => {
    try {
      const res = await window.electronAPI.invoke('db:users:update', w.id, {
        is_active: w.is_active ? 0 : 1
      });
      if (res.success) {
        showSuccess(w.is_active ? 'تم تعطيل حساب الموظف' : 'تم تفعيل حساب الموظف');
        fetchWorkers();
      } else {
        showError(res.error || 'فشل تغيير حالة الحساب');
      }
    } catch (err) {
      showError('خطأ أثناء تعديل حالة الحساب');
    }
  };

  const handleRoleChange = (role: string) => {
    setWorkerRole(role);
    setWorkerPermissions(DEFAULT_ROLE_PERMISSIONS[role] || []);
  };

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[1000] bg-black/60 backdrop-blur-md cursor-pointer"
          />

          {/* Centered Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="fixed inset-0 z-[1001] flex items-center justify-center p-4 pointer-events-none"
            dir="rtl"
          >
            <div className={`w-full ${panel === 'auth-gate' ? 'max-w-sm' : 'max-w-4xl'} bg-background_primary/98 dark:bg-background_secondary/98 backdrop-blur-2xl border border-border_default/30 dark:border-white/5 rounded-3xl shadow-2xl shadow-black/40 pointer-events-auto overflow-hidden transition-all duration-300`}>
              <AnimatePresence mode="wait">

                {/* ── 1. LOGIN AUTHENTICATION GATE VIEW ── */}
                {panel === 'auth-gate' && (
                  <motion.div
                    key="auth-gate"
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 8 }}
                    transition={{ duration: 0.15 }}
                    className="p-6 w-full"
                  >
                    <div className="flex items-center justify-between mb-5 border-b border-border_default/30 dark:border-white/5 pb-3">
                      <h3 className="text-sm font-black text-text_primary">تأكيد الهوية للوصول</h3>
                      <button
                        onClick={onClose}
                        className="p-1.5 text-text_muted hover:text-text_primary hover:bg-background_primary/60 dark:hover:bg-white/5 rounded-xl transition-all cursor-pointer"
                      >
                        <X size={16} />
                      </button>
                    </div>

                    <div className="flex flex-col items-center mb-5">
                      <div className="w-10 h-10 rounded-xl bg-primary_blue/10 border border-primary_blue/15 flex items-center justify-center mb-3">
                        <Lock size={18} className="text-primary_blue animate-pulse" />
                      </div>
                      <p className="text-[11px] text-text_muted font-bold text-center">
                        الرجاء إدخال اسم المستخدم وكلمة المرور للدخول للإعدادات
                      </p>
                    </div>

                    <form onSubmit={handleVerifyCredentials} className="space-y-4">
                      <div>
                        <label className="text-xs font-bold text-text_secondary block mb-1 text-right">اسم المستخدم</label>
                        <input
                          type="text"
                          value={confirmUsername}
                          onChange={(e) => setConfirmUsername(e.target.value)}
                          className="w-full bg-background_secondary dark:bg-white/[0.03] border border-border_default/60 dark:border-white/5 rounded-xl px-3 py-2.5 text-text_primary text-sm font-mono outline-none focus:border-primary_blue/40 transition-colors text-right"
                          dir="ltr"
                          placeholder="username"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-bold text-text_secondary block mb-1 text-right">كلمة المرور</label>
                        <div className="relative">
                          <input
                            type={showConfirmPw ? 'text' : 'password'}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="w-full bg-background_secondary dark:bg-white/[0.03] border border-border_default/60 dark:border-white/5 rounded-xl px-3 py-2.5 text-text_primary text-sm outline-none focus:border-primary_blue/40 transition-colors pr-3 pl-9 text-right font-mono"
                            dir="ltr"
                            placeholder="••••••••"
                            autoFocus
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirmPw(!showConfirmPw)}
                            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text_muted hover:text-text_secondary transition-colors"
                          >
                            {showConfirmPw ? <EyeOff size={14} /> : <Eye size={14} />}
                          </button>
                        </div>
                      </div>

                      {confirmPwError && (
                        <div className="text-xs font-bold text-danger_red bg-danger_red/10 border border-danger_red/20 rounded-lg p-2.5 text-center">
                          {confirmPwError}
                        </div>
                      )}

                      <button
                        type="submit"
                        disabled={confirmPwLoading}
                        className="w-full py-2.5 bg-primary_blue hover:bg-primary_blue_hover text-white rounded-xl text-sm font-black transition-all cursor-pointer flex items-center justify-center gap-2"
                      >
                        {confirmPwLoading ? (
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <>
                            <Check size={15} />
                            تأكيد الدخول
                          </>
                        )}
                      </button>
                    </form>
                  </motion.div>
                )}

                {/* ── 2. UNIFIED SETTINGS FORM & WORKERS VIEW ── */}
                {panel === 'settings-form' && (
                  <motion.div
                    key="settings-form"
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 8 }}
                    transition={{ duration: 0.15 }}
                    className="p-6"
                  >
                    <div className="flex items-center justify-between border-b border-border_default/20 dark:border-white/5 pb-3.5 mb-4">
                      <h3 className="text-base font-black text-text_primary">إعدادات الحساب والنظام</h3>
                      <button
                        onClick={onClose}
                        className="p-1.5 text-text_muted hover:text-text_primary hover:bg-background_primary/60 dark:hover:bg-white/5 rounded-xl transition-all cursor-pointer"
                      >
                        <X size={16} />
                      </button>
                    </div>

                    {/* Tabs Selector (Visible to Owners & Managers only) */}
                    {user && (user.role === 'owner' || user.role === 'manager') && (
                      <div className="flex border-b border-border_default/20 dark:border-white/5 mb-5 select-none">
                        <button
                          type="button"
                          onClick={() => setActiveSubTab('profile')}
                          className={`flex items-center gap-2 px-5 py-3 border-b-2 font-bold text-sm transition-all cursor-pointer ${
                            activeSubTab === 'profile'
                              ? 'border-primary_blue text-primary_blue font-black'
                              : 'border-transparent text-text_muted hover:text-text_primary'
                          }`}
                        >
                          <User size={16} />
                          حسابي الشخصي
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setActiveSubTab('workers');
                            setEditingWorker(null);
                            setIsAddingWorker(false);
                          }}
                          className={`flex items-center gap-2 px-5 py-3 border-b-2 font-bold text-sm transition-all cursor-pointer ${
                            activeSubTab === 'workers'
                              ? 'border-primary_blue text-primary_blue font-black'
                              : 'border-transparent text-text_muted hover:text-text_primary'
                          }`}
                        >
                          <Users size={16} />
                          إدارة العمال وتحديد الصلاحيات
                        </button>
                      </div>
                    )}

                    {/* Tab 1: Edit Profile (Side-by-side Layout, no scroll) */}
                    {activeSubTab === 'profile' && (
                      <form onSubmit={handleSaveChanges} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {/* Right Column: Profile Info & PIN */}
                          <div className="space-y-4">
                            <h4 className="text-xs font-bold text-primary_blue mb-2 block border-r-2 border-primary_blue pr-2">البيانات الشخصية ورمز الـ PIN</h4>
                            
                            <div>
                              <label className="text-xs font-bold text-text_secondary block mb-1.5 text-right">الاسم الكامل للموظف</label>
                              <div className="relative">
                                <input
                                  type="text"
                                  value={newName}
                                  onChange={(e) => setNewName(e.target.value)}
                                  className="w-full bg-background_secondary dark:bg-white/[0.03] border border-border_default/60 dark:border-white/5 rounded-xl pr-10 pl-3 py-2.5 text-text_primary text-sm font-bold outline-none focus:border-primary_blue/50 transition-colors text-right"
                                  placeholder="الاسم الكامل"
                                />
                                <User size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-text_muted" />
                              </div>
                            </div>

                            <div>
                              <label className="text-xs font-bold text-text_secondary block mb-1.5 text-right">اسم المستخدم للدخول</label>
                              <div className="relative">
                                <input
                                  type="text"
                                  value={newUsername}
                                  onChange={(e) => setNewUsername(e.target.value)}
                                  className="w-full bg-background_secondary dark:bg-white/[0.03] border border-border_default/60 dark:border-white/5 rounded-xl pr-10 pl-3 py-2.5 text-text_primary text-sm font-mono outline-none focus:border-primary_blue/50 transition-colors text-right"
                                  dir="ltr"
                                  placeholder="username"
                                />
                                <AtSign size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-text_muted" />
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <label className="text-xs font-bold text-text_secondary block mb-1.5 text-right font-bold text-[11px]">رمز الـ PIN الجديد</label>
                                <input
                                  type="password"
                                  maxLength={4}
                                  value={newPin}
                                  onChange={(e) => setNewPin(e.target.value.replace(/[^0-9]/g, ''))}
                                  className="w-full bg-background_secondary dark:bg-white/[0.03] border border-border_default/60 dark:border-white/5 rounded-xl px-3 py-2.5 text-text_primary text-sm outline-none focus:border-primary_blue/50 transition-colors text-center tracking-widest font-mono font-bold"
                                  dir="ltr"
                                  placeholder="••••"
                                />
                              </div>
                              <div>
                                <label className="text-xs font-bold text-text_secondary block mb-1.5 text-right font-bold text-[11px]">تأكيد رمز PIN</label>
                                <input
                                  type="password"
                                  maxLength={4}
                                  value={confirmPin}
                                  onChange={(e) => setConfirmPin(e.target.value.replace(/[^0-9]/g, ''))}
                                  className="w-full bg-background_secondary dark:bg-white/[0.03] border border-border_default/60 dark:border-white/5 rounded-xl px-3 py-2.5 text-text_primary text-sm outline-none focus:border-primary_blue/50 transition-colors text-center tracking-widest font-mono font-bold"
                                  dir="ltr"
                                  placeholder="••••"
                                />
                              </div>
                            </div>
                          </div>

                          {/* Left Column: Password Update */}
                          <div className="space-y-4">
                            <h4 className="text-xs font-bold text-primary_blue mb-2 block border-r-2 border-primary_blue pr-2">تحديث أمان الحساب</h4>
                            
                            <div>
                              <label className="text-xs font-bold text-text_secondary block mb-1.5 text-right">كلمة المرور الجديدة</label>
                              <div className="relative">
                                <input
                                  type={showPw ? 'text' : 'password'}
                                  value={newPw}
                                  onChange={(e) => setNewPw(e.target.value)}
                                  className="w-full bg-background_secondary dark:bg-white/[0.03] border border-border_default/60 dark:border-white/5 rounded-xl pr-10 pl-10 py-2.5 text-text_primary text-sm outline-none focus:border-primary_blue/50 transition-colors text-right font-mono"
                                  dir="ltr"
                                  placeholder="اكتب كلمة مرور جديدة"
                                />
                                <Key size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-text_muted" />
                                <button
                                  type="button"
                                  onClick={() => setShowPw(!showPw)}
                                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text_muted hover:text-text_secondary transition-colors"
                                >
                                  {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                                </button>
                              </div>
                            </div>

                            <div>
                              <label className="text-xs font-bold text-text_secondary block mb-1.5 text-right">تأكيد كلمة المرور الجديدة</label>
                              <div className="relative">
                                <input
                                  type="password"
                                  value={confirmPw}
                                  onChange={(e) => setConfirmPw(e.target.value)}
                                  className="w-full bg-background_secondary dark:bg-white/[0.03] border border-border_default/60 dark:border-white/5 rounded-xl pr-10 pl-3 py-2.5 text-text_primary text-sm outline-none focus:border-primary_blue/50 transition-colors text-right font-mono"
                                  dir="ltr"
                                  placeholder="أعد كتابة كلمة المرور"
                                />
                                <Key size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-text_muted" />
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Save Button */}
                        <div className="flex justify-end pt-4 border-t border-border_default/20 dark:border-white/5">
                          <button
                            type="submit"
                            disabled={isSaving}
                            className="px-8 py-2.5 bg-primary_blue hover:bg-primary_blue_hover text-white rounded-xl text-sm font-black transition-all cursor-pointer flex items-center justify-center gap-2"
                          >
                            {isSaving ? (
                              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <>
                                <Check size={15} />
                                حفظ التغييرات الحالية
                              </>
                            )}
                          </button>
                        </div>
                      </form>
                    )}

                    {/* Tab 2: Manage Workers & Permissions */}
                    {activeSubTab === 'workers' && (
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 min-h-[350px]">
                        
                        {/* Worker List Panel (5 cols) */}
                        <div className="md:col-span-5 border-l border-border_default/20 dark:border-white/5 pl-4 flex flex-col justify-between">
                          <div className="space-y-3">
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="text-xs font-bold text-text_primary">قائمة الموظفين والعمال</h4>
                              <button
                                type="button"
                                onClick={() => {
                                  setIsAddingWorker(true);
                                  setEditingWorker(null);
                                  setWorkerPermissions(DEFAULT_ROLE_PERMISSIONS['employee'] || []);
                                }}
                                className="px-3 py-1.5 bg-primary_blue/10 hover:bg-primary_blue/20 text-primary_blue rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                              >
                                <Plus size={13} />
                                عامل جديد
                              </button>
                            </div>

                            {isWorkersLoading ? (
                              <div className="py-8 text-center text-xs text-text_muted font-bold">جاري تحميل العمال...</div>
                            ) : (
                              <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1 custom-scrollbar">
                                {workers.map((w) => {
                                  const isSelected = editingWorker?.id === w.id;
                                  return (
                                    <div
                                      key={w.id}
                                      onClick={() => handleSelectWorker(w)}
                                      className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${
                                        isSelected
                                          ? 'bg-primary_blue/10 border-primary_blue/40 text-text_primary'
                                          : 'bg-background_secondary dark:bg-white/[0.02] border-border_default/60 dark:border-white/5 text-text_secondary hover:bg-background_primary/40'
                                      }`}
                                    >
                                      <div className="flex items-center gap-2.5 min-w-0">
                                        <div className="w-8 h-8 rounded-lg bg-primary_blue/10 border border-primary_blue/10 flex items-center justify-center font-bold text-base shrink-0 text-primary_blue">
                                          {w.avatar || '👤'}
                                        </div>
                                        <div className="min-w-0 text-right">
                                          <p className="text-xs font-black truncate">{w.full_name}</p>
                                          <p className="text-[10px] text-text_muted truncate">@{w.username} • {ROLE_LABELS[w.role] || w.role}</p>
                                        </div>
                                      </div>

                                      {/* Status Activation Toggle */}
                                      {w.id !== user?.id && (
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleToggleWorkerActive(w);
                                          }}
                                          className={`p-1 rounded-lg border transition-all active:scale-95 ${
                                            w.is_active
                                              ? 'text-success_green border-success_green/20 bg-success_green/10 hover:bg-success_green/25'
                                              : 'text-text_muted border-border_default bg-background_primary/40 hover:bg-background_primary'
                                          }`}
                                          title={w.is_active ? 'تعطيل الحساب' : 'تفعيل الحساب'}
                                        >
                                          <Power size={13} />
                                        </button>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Detail / Action Panel (7 cols) */}
                        <div className="md:col-span-7 flex flex-col justify-between">
                          
                          {/* ── CASE 1: Editing worker permissions ── */}
                          {editingWorker && (
                            <div className="flex flex-col h-full justify-between">
                              <div>
                                <div className="border-b border-border_default/20 dark:border-white/5 pb-2.5 mb-3 flex items-center justify-between">
                                  <h4 className="text-xs font-black text-text_primary">
                                    صلاحيات العامل: <span className="text-primary_blue">{editingWorker.full_name}</span>
                                  </h4>
                                  <span className="text-[10px] font-bold text-text_muted">الدور: {ROLE_LABELS[editingWorker.role] || editingWorker.role}</span>
                                </div>

                                <div className="grid grid-cols-2 gap-3 max-h-[220px] overflow-y-auto pr-1 custom-scrollbar">
                                  {AVAILABLE_PERMISSIONS.map((perm) => {
                                    const isChecked = editingPermissions.includes(perm.key);
                                    return (
                                      <label
                                        key={perm.key}
                                        className="flex items-center gap-2.5 p-2 rounded-lg bg-background_secondary dark:bg-white/[0.02] border border-border_default/40 dark:border-white/5 hover:bg-background_primary/40 cursor-pointer select-none text-right"
                                      >
                                        <input
                                          type="checkbox"
                                          checked={isChecked}
                                          onChange={() => handleTogglePermission(perm.key)}
                                          className="w-4.5 h-4.5 rounded border-border_default text-primary_blue focus:ring-primary_blue/30"
                                        />
                                        <span className="text-xs font-bold text-text_secondary leading-none">{perm.label}</span>
                                      </label>
                                    );
                                  })}
                                </div>
                              </div>

                              <div className="pt-4 border-t border-border_default/20 dark:border-white/5 flex justify-end">
                                <button
                                  type="button"
                                  onClick={handleSavePermissions}
                                  disabled={isSavingPermissions}
                                  className="px-6 py-2 bg-primary_blue hover:bg-primary_blue_hover text-white rounded-xl text-xs font-black transition-all flex items-center gap-1.5"
                                >
                                  {isSavingPermissions ? (
                                    <div className="w-4.5 h-4.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                  ) : (
                                    <>
                                      <Check size={14} />
                                      حفظ صلاحيات الموظف
                                    </>
                                  )}
                                </button>
                              </div>
                            </div>
                          )}

                          {/* ── CASE 2: Adding a new worker ── */}
                          {isAddingWorker && (
                            <form onSubmit={handleCreateWorker} className="flex flex-col h-full justify-between">
                              <div className="space-y-3.5">
                                <div className="border-b border-border_default/20 dark:border-white/5 pb-2 mb-2">
                                  <h4 className="text-xs font-black text-primary_blue">إضافة عامل جديد وصلاحياته بالنظام</h4>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                  <div>
                                    <label className="text-[10px] font-bold text-text_secondary block mb-1 text-right">الاسم الكامل *</label>
                                    <input
                                      type="text"
                                      required
                                      value={workerFullName}
                                      onChange={(e) => setWorkerFullName(e.target.value)}
                                      className="w-full bg-background_secondary dark:bg-white/[0.03] border border-border_default/60 dark:border-white/5 rounded-xl px-3 py-2 text-text_primary outline-none focus:border-primary_blue/50 text-xs font-bold"
                                      placeholder="محمد أمين"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-[10px] font-bold text-text_secondary block mb-1 text-right">اسم المستخدم للولوج *</label>
                                    <input
                                      type="text"
                                      required
                                      value={workerUsername}
                                      onChange={(e) => setWorkerUsername(e.target.value.replace(/\s/g, ''))}
                                      className="w-full bg-background_secondary dark:bg-white/[0.03] border border-border_default/60 dark:border-white/5 rounded-xl px-3 py-2 text-text_primary outline-none focus:border-primary_blue/50 text-xs font-mono text-left"
                                      dir="ltr"
                                      placeholder="username"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-[10px] font-bold text-text_secondary block mb-1 text-right">كلمة المرور *</label>
                                    <input
                                      type="password"
                                      required
                                      value={workerPassword}
                                      onChange={(e) => setWorkerPassword(e.target.value)}
                                      className="w-full bg-background_secondary dark:bg-white/[0.03] border border-border_default/60 dark:border-white/5 rounded-xl px-3 py-2 text-text_primary outline-none focus:border-primary_blue/50 text-xs font-mono"
                                      placeholder="••••••••"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-[10px] font-bold text-text_secondary block mb-1 text-right">رمز PIN (4 أرقام) *</label>
                                    <input
                                      type="password"
                                      required
                                      maxLength={4}
                                      value={workerPin}
                                      onChange={(e) => setWorkerPin(e.target.value.replace(/[^0-9]/g, ''))}
                                      className="w-full bg-background_secondary dark:bg-white/[0.03] border border-border_default/60 dark:border-white/5 rounded-xl px-3 py-2 text-text_primary outline-none focus:border-primary_blue/50 text-xs font-mono text-center tracking-widest"
                                      placeholder="••••"
                                    />
                                  </div>
                                  <div className="col-span-2">
                                    <label className="text-[10px] font-bold text-text_secondary block mb-1 text-right">دور وصلاحية المستخدم بالنظام *</label>
                                    <select
                                      value={workerRole}
                                      onChange={(e) => handleRoleChange(e.target.value)}
                                      className="w-full bg-background_secondary dark:bg-white/[0.03] border border-border_default/60 dark:border-white/5 rounded-xl px-3 py-2.5 text-text_primary outline-none focus:border-primary_blue/50 text-xs font-bold"
                                    >
                                      <option value="employee">عامل عام (Worker)</option>
                                      <option value="cashier">أمين الصندوق (Cashier)</option>
                                      <option value="storekeeper">أمين المستودع (Storekeeper)</option>
                                      <option value="accountant">المحاسب (Accountant)</option>
                                      <option value="manager">المدير (Manager)</option>
                                    </select>
                                  </div>
                                </div>
                              </div>

                              <div className="pt-4 border-t border-border_default/20 dark:border-white/5 flex justify-end gap-2.5">
                                <button
                                  type="button"
                                  onClick={() => setIsAddingWorker(false)}
                                  className="px-4 py-2 bg-background_primary hover:bg-background_card border border-border_default text-text_secondary hover:text-text_primary rounded-lg text-xs font-bold transition-all"
                                >
                                  إلغاء
                                </button>
                                <button
                                  type="submit"
                                  disabled={isCreatingWorker}
                                  className="px-6 py-2 bg-primary_blue hover:bg-primary_blue_hover text-white rounded-lg text-xs font-black transition-all flex items-center gap-1.5 shadow-sm"
                                >
                                  {isCreatingWorker ? (
                                    <div className="w-4.5 h-4.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                  ) : (
                                    <>
                                      <Check size={14} />
                                      إضافة العامل وتأكيد الصلاحيات
                                    </>
                                  )}
                                </button>
                              </div>
                            </form>
                          )}

                          {/* ── CASE 3: Empty State ── */}
                          {!editingWorker && !isAddingWorker && (
                            <div className="flex-1 flex flex-col items-center justify-center text-text_muted/60 p-6">
                              <Users size={36} className="mb-2 opacity-40 animate-pulse text-primary_blue" />
                              <p className="text-xs font-bold text-center">اختر موظفاً من القائمة الجانبية لتعديل صلاحياته، أو انقر على زر "عامل جديد" لإنشاء حساب عمل جديد وتحديد صلاحياته.</p>
                            </div>
                          )}

                        </div>

                      </div>
                    )}

                  </motion.div>
                )}

              </AnimatePresence>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}
