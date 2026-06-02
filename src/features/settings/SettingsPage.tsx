/**
 * SettingsPage — إعدادات المتجر وبيانات الطباعة والنسخ الاحتياطي وإدارة المستخدمين
 */
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Printer,
  Save,
  Store,
  Car,
  ClipboardList,
  Trash2,
  Database,
  Image as ImageIcon,
  ShieldAlert,
  UploadCloud,
  Download,
  Users,
  Plus,
  Edit2,
  KeyRound,
  Shield,
  Activity,
  Check,
  Lock,
  X,
  Keyboard,
  RefreshCw
} from 'lucide-react';
import { showSuccess, showError } from '../../shared/utils/notifications';
import { useAuth } from '../../hooks/useAuth';
import VehiclesPage from '../vehicles/VehiclesPage';
import GlassDropdown, { GlassDropdownItem } from '../../shared/components/ui/GlassDropdown';
import { useShortcutStore, ShortcutMapping, DEFAULT_SHORTCUTS } from '../../store/shortcutStore';
import { useAppStore } from '../../store/app.store';
import { PrintTemplateRenderer, PaperSize } from '../../shared/components/print/PrintTemplateRenderer';

interface ActiveUser {
  id: number;
  username: string;
  full_name: string;
  role: 'owner' | 'manager' | 'accountant' | 'cashier' | 'storekeeper' | 'employee';
  is_active: boolean;
  pin_code?: string;
  avatar?: string;
  color?: string;
  created_at?: string;
  last_login?: string;
}

const COLOR_THEMES = [
  { value: 'blue', label: 'الأزرق الملكي', bg: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  { value: 'emerald', label: 'الأخضر الزمردي', bg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
  { value: 'rose', label: 'الوردي الهادئ', bg: 'bg-rose-500/10 text-rose-400 border-rose-500/20' },
  { value: 'amber', label: 'الذهبي الدافئ', bg: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
  { value: 'violet', label: 'البنفسجي السينمائي', bg: 'bg-violet-500/10 text-violet-400 border-violet-500/20' },
  { value: 'slate', label: 'الرمادي الكلاسيكي', bg: 'bg-slate-400/10 text-slate-400 border-slate-400/20' },
];

const AVATAR_OPTIONS = ['👑', '💼', '📊', '🛒', '📦', '👤', '🔧', '🚘', '💰', '🔒', '🛠️', '⚙️'];

const ROLE_OPTIONS = [
  { value: 'owner', label: 'المالك (Owner)' },
  { value: 'manager', label: 'المدير (Manager)' },
  { value: 'accountant', label: 'المحاسب (Accountant)' },
  { value: 'cashier', label: 'أمين الصندوق (Cashier)' },
  { value: 'storekeeper', label: 'أمين المستودع (Storekeeper)' },
  { value: 'employee', label: 'موظف عام (Employee)' },
];

function InteractiveDropdownSelect({
  label,
  value,
  options,
  onChange,
  placeholder = '-- اختر --',
  icon: Icon
}: {
  label: string;
  value: string;
  options: { label: string; value: string }[];
  onChange: (val: string) => void;
  placeholder?: string;
  icon: any;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const selectedOption = options.find(opt => opt.value === value);

  return (
    <div className="relative flex flex-col w-full text-right" ref={containerRef}>
      <label className="text-base font-black text-text_primary">{label}</label>

      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-background_primary border border-border_default hover:border-text_muted/40 focus:border-primary_blue rounded-xl px-6 h-16 mt-2.5 transition-all outline-none text-text_primary focus:ring-2 focus:ring-primary_blue/10 flex items-center justify-between font-bold text-base cursor-pointer"
      >
        <div className="flex items-center gap-3 font-bold">
          <Icon size={22} className="text-text_muted" />
          <span className={selectedOption ? 'text-text_primary' : 'text-text_muted/60'}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
        </div>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="text-text_muted"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
          </svg>
        </motion.div>
      </button>

      <GlassDropdown
        show={isOpen}
        width="w-full"
        accentColor="blue"
        className="shadow-xl"
      >
        <div className="max-h-60 overflow-y-auto p-1.5 custom-scrollbar space-y-1">
          <GlassDropdownItem delay={0.03}>
            <button
              type="button"
              onClick={() => {
                onChange('');
                setIsOpen(false);
              }}
              className={`w-full text-right px-5 py-3.5 text-base rounded-xl font-bold transition-all ${value === ''
                  ? 'bg-primary_blue/10 text-primary_blue'
                  : 'hover:bg-primary_blue/5 text-text_secondary hover:text-text_primary'
                }`}
            >
              {placeholder}
            </button>
          </GlassDropdownItem>

          {options.map((opt, idx) => (
            <GlassDropdownItem key={opt.value} delay={0.06 + idx * 0.035}>
              <button
                type="button"
                onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                }}
                className={`w-full text-right px-5 py-3.5 text-base rounded-xl font-bold transition-all ${value === opt.value
                    ? 'bg-primary_blue/10 text-primary_blue'
                    : 'hover:bg-primary_blue/5 text-text_secondary hover:text-text_primary'
                  }`}
              >
                {opt.label}
              </button>
            </GlassDropdownItem>
          ))}
        </div>
      </GlassDropdown>
    </div>
  );
}

const SHORTCUT_LABELS: Record<keyof ShortcutMapping, string> = {
  new_invoice: 'فاتورة جديدة (مبيعات/مشتريات)',
  search_product: 'البحث السريع عن المنتجات وتنشيط الجدول',
  search_party: 'البحث عن العملاء أو الموردين',
  print_invoice: 'طباعة الفاتورة الحالية',
  save_invoice: 'حفظ الفاتورة الحالية',
  cancel_invoice: 'إلغاء أو إفراغ الفاتورة بالكامل',
  advanced_search: 'البحث المتقدم عن المنتجات',
  add_product_modal: 'إضافة منتج جديد بقاعدة البيانات',
  open_invoice: 'استعراض وفتح الفواتير السابقة',
  goto_pos: 'الانتقال إلى شاشة البيع (نقطة البيع)',
  goto_purchase: 'الانتقال إلى وصل الشراء (إدخال مخزون)',
};

export default function SettingsPage() {
  const { user: currentUser } = useAuth();
  const { enableSidebarHover, setEnableSidebarHover } = useAppStore();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [printers, setPrinters] = useState<any[]>([]);
  const [countSessions, setCountSessions] = useState<any[]>([]);
  const [countSessionsLoading, setCountSessionsLoading] = useState(false);
  const [countArchivePage, setCountArchivePage] = useState(1);
  const countArchiveLimit = 10;
  const [countArchiveTotal, setCountArchiveTotal] = useState(0);

  const canManageUsers = currentUser && ['owner', 'manager'].includes(currentUser.role);
  const [activeTab, setActiveTab] = useState<'profile' | 'print' | 'vehicles' | 'inventory_archive' | 'users' | 'backup' | 'shortcuts'>('profile');

  // Keyboard Shortcuts State
  const [recordingAction, setRecordingAction] = useState<keyof ShortcutMapping | null>(null);
  const { shortcuts, setShortcut, resetToDefaults } = useShortcutStore();

  useEffect(() => {
    if (!recordingAction) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const key = e.key;
      const isModifier = ['Control', 'Alt', 'Shift', 'Meta'].includes(key);

      if (!isModifier) {
        const keys: string[] = [];
        if (e.ctrlKey) keys.push('Ctrl');
        if (e.altKey) keys.push('Alt');
        if (e.shiftKey) keys.push('Shift');

        let normalizedKey = key;
        if (key === ' ') {
          normalizedKey = 'Space';
        } else if (key.length === 1) {
          normalizedKey = key.toUpperCase();
        }
        keys.push(normalizedKey);

        const shortcutStr = keys.join('+');
        setShortcut(recordingAction, shortcutStr);
        setRecordingAction(null);
        showSuccess('تم تحديث الاختصار بنجاح');
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [recordingAction, setShortcut]);

  // Users Management State
  const [usersList, setUsersList] = useState<ActiveUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [showAddUser, setShowAddUser] = useState(false);
  const [newUser, setNewUser] = useState({
    username: '',
    password: '',
    full_name: '',
    role: 'cashier',
    pin_code: '',
    avatar: '👤',
    color: 'blue',
  });
  const [editingUser, setEditingUser] = useState<ActiveUser | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [showLogoCustomizer, setShowLogoCustomizer] = useState(false);
  const [customizerTab, setCustomizerTab] = useState<'primary' | 'secondary'>('primary');
  const [previewPaperSize, setPreviewPaperSize] = useState<PaperSize>('A4');
  const [tempLogoSettings, setTempLogoSettings] = useState({
    logo_size: '80',
    logo_shape: 'circle',
    logo_opacity: '100',
    logo_grayscale: 'false',
    logo_position: 'right',
    logo_x: '0',
    logo_y: '0',
    store_logo: '',
    secondary_logo: '',
    secondary_logo_size: '80',
    secondary_logo_shape: 'circle',
    secondary_logo_opacity: '100',
    secondary_logo_grayscale: 'false',
    secondary_logo_x: '0',
    secondary_logo_y: '0'
  });

  const [settings, setSettings] = useState({
    company_name: '',
    company_activity: '',
    company_phone: '',
    company_address: '',
    company_rc: '',
    company_nif: '',
    company_nis: '',
    company_art: '',
    company_cb: '',
    company_rc_enabled: true,
    company_nif_enabled: true,
    company_nis_enabled: true,
    company_art_enabled: true,
    company_cb_enabled: true,
    receipt_printer: '',
    invoice_printer: '',
    auto_print: false,
    receipt_footer: 'شكراً لزيارتكم، البضاعة المباعة لا ترد ولا تستبدل',
    store_logo: '',
    logo_size: '80',
    logo_shape: 'circle',
    logo_opacity: '100',
    logo_grayscale: 'false',
    logo_position: 'right',
    logo_x: '0',
    logo_y: '0',
    secondary_logo: '',
    secondary_logo_size: '80',
    secondary_logo_shape: 'circle',
    secondary_logo_opacity: '100',
    secondary_logo_grayscale: 'false',
    secondary_logo_x: '0',
    secondary_logo_y: '0',
    items_per_page_a4: '0',
    items_per_page_a5: '0',
  });

  useEffect(() => {
    if (showLogoCustomizer) {
      setTempLogoSettings({
        logo_size: settings.logo_size || '80',
        logo_shape: settings.logo_shape || 'circle',
        logo_opacity: settings.logo_opacity || '100',
        logo_grayscale: settings.logo_grayscale || 'false',
        logo_position: settings.logo_position || 'right',
        logo_x: settings.logo_x || '0',
        logo_y: settings.logo_y || '0',
        store_logo: settings.store_logo || '',
        secondary_logo: settings.secondary_logo || '',
        secondary_logo_size: settings.secondary_logo_size || '80',
        secondary_logo_shape: settings.secondary_logo_shape || 'circle',
        secondary_logo_opacity: settings.secondary_logo_opacity || '100',
        secondary_logo_grayscale: settings.secondary_logo_grayscale || 'false',
        secondary_logo_x: settings.secondary_logo_x || '0',
        secondary_logo_y: settings.secondary_logo_y || '0'
      });
    }
  }, [showLogoCustomizer, settings]);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (activeTab === 'inventory_archive') {
      loadCountSessions(1);
    } else if (activeTab === 'users' && canManageUsers) {
      loadUsersList();
    }
  }, [activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await window.electronAPI.invoke('db:settings:getAll');
      if (res.success && res.data) {
        setSettings(prev => ({
          ...prev,
          ...res.data,
          auto_print: res.data.auto_print === true || res.data.auto_print === 'true',
          company_rc_enabled: res.data.company_rc_enabled === undefined ? true : (res.data.company_rc_enabled === true || res.data.company_rc_enabled === 'true'),
          company_nif_enabled: res.data.company_nif_enabled === undefined ? true : (res.data.company_nif_enabled === true || res.data.company_nif_enabled === 'true'),
          company_nis_enabled: res.data.company_nis_enabled === undefined ? true : (res.data.company_nis_enabled === true || res.data.company_nis_enabled === 'true'),
          company_art_enabled: res.data.company_art_enabled === undefined ? true : (res.data.company_art_enabled === true || res.data.company_art_enabled === 'true'),
          company_cb_enabled: res.data.company_cb_enabled === undefined ? true : (res.data.company_cb_enabled === true || res.data.company_cb_enabled === 'true'),
          logo_size: res.data.logo_size || '80',
          logo_shape: res.data.logo_shape || 'circle',
          logo_opacity: res.data.logo_opacity || '100',
          logo_grayscale: res.data.logo_grayscale || 'false',
          logo_position: res.data.logo_position || 'right',
          logo_x: res.data.logo_x || '0',
          logo_y: res.data.logo_y || '0',
          secondary_logo: res.data.secondary_logo || '',
          secondary_logo_size: res.data.secondary_logo_size || '80',
          secondary_logo_shape: res.data.secondary_logo_shape || 'circle',
          secondary_logo_opacity: res.data.secondary_logo_opacity || '100',
          secondary_logo_grayscale: res.data.secondary_logo_grayscale || 'false',
          secondary_logo_x: res.data.secondary_logo_x || '0',
          secondary_logo_y: res.data.secondary_logo_y || '0',
          items_per_page_a4: res.data.items_per_page_a4 || '0',
          items_per_page_a5: res.data.items_per_page_a5 || '0',
        }));
      }
      const pRes = await window.electronAPI.invoke('print:getPrinters');
      if (pRes.success) setPrinters(pRes.data);
    } catch (e) {
      showError('حدث خطأ أثناء تحميل الإعدادات');
    } finally {
      setLoading(false);
    }
  };

  const loadUsersList = async () => {
    setUsersLoading(true);
    try {
      const res = await window.electronAPI.invoke('db:users:getAll');
      if (res.success && res.data) {
        setUsersList(res.data);
      }
    } catch (e) {
      showError('فشل تحميل قائمة الموظفين');
    } finally {
      setUsersLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const value = e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value;
    setSettings(prev => ({ ...prev, [e.target.name]: value }));
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...settings,
        auto_print: String(settings.auto_print),
        company_rc_enabled: String(settings.company_rc_enabled),
        company_nif_enabled: String(settings.company_nif_enabled),
        company_nis_enabled: String(settings.company_nis_enabled),
        company_art_enabled: String(settings.company_art_enabled),
        company_cb_enabled: String(settings.company_cb_enabled),
        logo_size: String(settings.logo_size || '80'),
        logo_shape: String(settings.logo_shape || 'circle'),
        logo_opacity: String(settings.logo_opacity || '100'),
        logo_grayscale: String(settings.logo_grayscale || 'false'),
        logo_position: String(settings.logo_position || 'right'),
        logo_x: String(settings.logo_x || '0'),
        logo_y: String(settings.logo_y || '0'),
        secondary_logo: String(settings.secondary_logo || ''),
        secondary_logo_size: String(settings.secondary_logo_size || '80'),
        secondary_logo_shape: String(settings.secondary_logo_shape || 'circle'),
        secondary_logo_opacity: String(settings.secondary_logo_opacity || '100'),
        secondary_logo_grayscale: String(settings.secondary_logo_grayscale || 'false'),
        secondary_logo_x: String(settings.secondary_logo_x || '0'),
        secondary_logo_y: String(settings.secondary_logo_y || '0'),
        items_per_page_a4: String(settings.items_per_page_a4 || '0'),
        items_per_page_a5: String(settings.items_per_page_a5 || '0'),
      };
      const res = await window.electronAPI.invoke('db:settings:update', payload);
      if (res.success) {
        showSuccess('تم حفظ الإعدادات بنجاح.');
        loadData();
      } else {
        showError(res.error);
      }
    } catch (err) {
      showError('حدث خطأ أثناء حفظ الإعدادات');
    } finally {
      saveSettingEnabledFieldsToLocalStorage(); // sync to local storage just in case
      setSaving(false);
    }
  };

  const saveSettingEnabledFieldsToLocalStorage = () => {
    try {
      localStorage.setItem('company_rc_enabled', String(settings.company_rc_enabled));
      localStorage.setItem('company_nif_enabled', String(settings.company_nif_enabled));
      localStorage.setItem('company_nis_enabled', String(settings.company_nis_enabled));
      localStorage.setItem('company_art_enabled', String(settings.company_art_enabled));
      localStorage.setItem('company_cb_enabled', String(settings.company_cb_enabled));
    } catch (e) {}
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUser.username || !newUser.password || !newUser.full_name) {
      showError('يرجى ملء جميع الحقول المطلوبة');
      return;
    }
    if (newUser.pin_code && newUser.pin_code.length !== 4) {
      showError('رمز الـ PIN يجب أن يكون من 4 أرقام');
      return;
    }
    try {
      const res = await window.electronAPI.invoke('db:users:create', newUser);
      if (res.success) {
        showSuccess('تم إضافة المستخدم بنجاح');
        setShowAddUser(false);
        setNewUser({
          username: '',
          password: '',
          full_name: '',
          role: 'cashier',
          pin_code: '',
          avatar: '👤',
          color: 'blue',
        });
        loadUsersList();
      } else {
        showError(res.error);
      }
    } catch (err) {
      showError('حدث خطأ أثناء إضافة المستخدم');
    }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    if (!editingUser.username || !editingUser.full_name) {
      showError('اسم المستخدم والاسم الكامل مطلوبان');
      return;
    }
    if (editingUser.pin_code && editingUser.pin_code.length !== 4) {
      showError('رمز الـ PIN يجب أن يكون من 4 أرقام');
      return;
    }
    try {
      const res = await window.electronAPI.invoke('db:users:update', editingUser.id, {
        username: editingUser.username,
        full_name: editingUser.full_name,
        role: editingUser.role,
        pin_code: editingUser.pin_code,
        avatar: editingUser.avatar,
        color: editingUser.color,
        is_active: editingUser.is_active,
      });
      if (res.success) {
        showSuccess('تم تحديث بيانات المستخدم بنجاح');
        setEditingUser(null);
        loadUsersList();
      } else {
        showError(res.error);
      }
    } catch (err) {
      showError('حدث خطأ أثناء تحديث بيانات المستخدم');
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    if (!newPassword || newPassword.length < 4) {
      showError('كلمة المرور الجديدة يجب أن تكون من 4 أحرف/أرقام على الأقل');
      return;
    }
    try {
      const res = await window.electronAPI.invoke('db:users:resetPassword', editingUser.id, newPassword);
      if (res.success) {
        showSuccess('تم تغيير كلمة المرور بنجاح');
        setShowResetPassword(false);
        setNewPassword('');
      } else {
        showError(res.error);
      }
    } catch (err) {
      showError('حدث خطأ أثناء تغيير كلمة المرور');
    }
  };

  const handleUploadLogo = async () => {
    const isElectron = typeof window !== 'undefined' && (window as any).electronAPI;
    if (isElectron) {
      try {
        const res = await window.electronAPI.invoke('db:settings:uploadLogo');
        if (res.success && res.base64) {
          setSettings(prev => ({ ...prev, store_logo: res.base64 }));
          showSuccess('تم تحميل الشعار بنجاح. يرجى حفظ التغييرات.');
        } else if (res.error && res.error !== 'Canceled') {
          showError(res.error);
        }
      } catch (err) {
        triggerFileInput();
      }
    } else {
      triggerFileInput();
    }
  };

  const triggerFileInput = () => {
    const fileInput = document.getElementById('logo-file-input');
    if (fileInput) {
      (fileInput as HTMLInputElement).click();
    }
  };

  const handleLogoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 1024 * 1024) {
      showError('حجم الصورة يجب أن يكون أقل من 1 ميغابايت');
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setSettings(prev => ({ ...prev, store_logo: event.target!.result as string }));
        showSuccess('تم تحميل الشعار بنجاح. يرجى حفظ التغييرات.');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleUploadSecondaryLogo = async () => {
    const isElectron = typeof window !== 'undefined' && (window as any).electronAPI;
    if (isElectron) {
      try {
        const res = await window.electronAPI.invoke('db:settings:uploadLogo');
        if (res.success && res.base64) {
          setTempLogoSettings(prev => ({ ...prev, secondary_logo: res.base64 }));
          showSuccess('تم تحميل الشعار الثانوي بنجاح. يرجى حفظ التغييرات لمزامنته.');
        } else if (res.error && res.error !== 'Canceled') {
          showError(res.error);
        }
      } catch (err) {
        triggerSecondaryFileInput();
      }
    } else {
      triggerSecondaryFileInput();
    }
  };

  const triggerSecondaryFileInput = () => {
    const fileInput = document.getElementById('secondary-logo-file-input');
    if (fileInput) {
      (fileInput as HTMLInputElement).click();
    }
  };

  const handleSecondaryLogoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 1024 * 1024) {
      showError('حجم الصورة يجب أن يكون أقل من 1 ميغابايت');
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setTempLogoSettings(prev => ({ ...prev, secondary_logo: event.target!.result as string }));
        showSuccess('تم تحميل الشعار الثانوي بنجاح. يرجى حفظ التغييرات لمزامنته.');
      }
    };
    reader.readAsDataURL(file);
  };

  const loadCountSessions = async (page: number = 1) => {
    setCountSessionsLoading(true);
    try {
      const res = await window.electronAPI.invoke('icount:getSessions', { page, limit: countArchiveLimit });
      if (res.success) {
        setCountSessions(res.data);
        setCountArchiveTotal(res.total);
        setCountArchivePage(1);
      }
    } catch (e) {
      showError('فشل تحميل أرشيف الجرد');
    } finally {
      setCountSessionsLoading(false);
    }
  };

  const loadMoreCountSessions = async (page: number) => {
    setCountSessionsLoading(true);
    try {
      const res = await window.electronAPI.invoke('icount:getSessions', { page, limit: countArchiveLimit });
      if (res.success) {
        setCountSessions(prev => [...prev, ...res.data]);
        setCountArchiveTotal(res.total);
        setCountArchivePage(page);
      }
    } catch (e) {
      showError('فشل تحميل أرشيف الجرد');
    } finally {
      setCountSessionsLoading(false);
    }
  };

  const handleCountSessionsScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    if (target.scrollHeight - target.scrollTop <= target.clientHeight + 50) {
      if (!countSessionsLoading && countSessions.length < countArchiveTotal) {
        const nextPage = countArchivePage + 1;
        loadMoreCountSessions(nextPage);
      }
    }
  };

  const handleDeleteCountSession = async (id: number) => {
    if (!confirm('هل أنت متأكد من حذف سجل الجرد هذا نهائياً؟')) return;
    const res = await window.electronAPI.invoke('icount:deleteSession', id);
    if (res.success) {
      showSuccess('تم حذف السجل بنجاح.');
      loadCountSessions(1);
    } else {
      showError(res.error);
    }
  };

  const handleBackup = async () => {
    try {
      const res = await window.electronAPI.invoke('backup:create');
      if (res.success) {
        showSuccess(`تم إنشاء النسخة الاحتياطية بنجاح وحفظها في: ${res.path}`);
      } else if (res.error && res.error !== 'Canceled') {
        showError(`فشل إنشاء النسخة الاحتياطية: ${res.error}`);
      }
    } catch (e) {
      showError('حدث خطأ أثناء إجراء النسخ الاحتياطي');
    }
  };

  const handleRestore = async () => {
    if (!confirm('تحذير: استرجاع قاعدة بيانات قديمة سيؤدي إلى استبدال كافة البيانات الحالية بالكامل. هل تريد الاستمرار؟')) return;
    try {
      const res = await window.electronAPI.invoke('backup:restore');
      if (res.success) {
        showSuccess('تم استرجاع قاعدة البيانات بنجاح. سيتم إعادة تشغيل واجهة البيانات.');
        window.location.reload();
      } else if (res.error && res.error !== 'Canceled') {
        showError(`فشل استرجاع قاعدة البيانات: ${res.error}`);
      }
    } catch (e) {
      showError('حدث خطأ أثناء استرجاع قاعدة البيانات');
    }
  };

  if (loading) return <div className="p-6 h-full flex items-center justify-center text-text_secondary font-bold">جاري تحميل الإعدادات...</div>;

  // Tabs layout builder
  const tabsList = [
    { id: 'profile', label: 'الهوية التجارية', icon: Store },
    { id: 'print', label: 'محرك الطباعة', icon: Printer },
    { id: 'vehicles', label: 'توافق المركبات', icon: Car },
    { id: 'inventory_archive', label: 'سجل وجلسات الجرد', icon: ClipboardList },
    { id: 'shortcuts', label: 'اختصارات لوحة المفاتيح', icon: Keyboard },
    ...(canManageUsers ? [{ id: 'users', label: 'إدارة الموظفين', icon: Users }] : []),
    { id: 'backup', label: 'النسخ الاحتياطي', icon: Database },
  ];

  return (
    <div className="p-4 pt-8 h-full flex flex-col relative w-full overflow-hidden font-cairo text-right" dir="rtl">

      {/* Fallback hidden file input */}
      <input
        id="logo-file-input"
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleLogoFileChange}
      />

      {/* Tabs Header */}
      <div className="flex flex-wrap items-center gap-3 mb-8 bg-background_secondary/50 p-2.5 rounded-2xl border border-border_default w-fit shadow-sm backdrop-blur-sm shrink-0 select-none">
        {tabsList.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2.5 px-6 py-3.5 rounded-xl text-base font-bold transition-all duration-300 relative z-10 cursor-pointer ${activeTab === tab.id ? 'text-white font-black scale-[1.03]' : 'text-text_secondary hover:bg-background_card hover:text-text_primary'}`}
          >
            {activeTab === tab.id && (
              <motion.div
                layoutId="activeSettingsTabIndicator"
                className="absolute inset-0 bg-primary_blue rounded-xl -z-10 shadow-lg shadow-primary_blue/25 border border-primary_blue/25"
                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              />
            )}
            <tab.icon size={20} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tabs Content */}
      <div className="flex-1 flex flex-col min-h-0 w-full relative">
        <AnimatePresence mode="wait">
          {activeTab === 'profile' && (
            <motion.div key="profile" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex-1 overflow-y-auto pb-32 space-y-6 custom-scrollbar">
              <div className="bg-background_secondary border border-border_default rounded-3xl p-10 shadow-sm max-w-4xl mx-auto w-full space-y-8 flex flex-col items-center">
                {/* Dual Logo Configuration Cards */}
                <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-8 pb-6 border-b border-border_default/30">
                  {/* Primary Logo Card */}
                  <div className="bg-background_primary/20 border border-border_default/40 rounded-3xl p-6 flex flex-col items-center space-y-4 shadow-sm relative">
                    <div className="absolute top-4 right-4 bg-primary_blue/10 text-primary_blue text-xs font-black px-3 py-1 rounded-full">شعار ثابت</div>
                    <label className="text-base font-black text-text_primary">الشعار الأساسي للمؤسسة</label>
                    
                    {settings.store_logo ? (
                      <div className="relative w-40 h-40 group rounded-2xl overflow-hidden border border-border_default shadow-sm bg-white flex items-center justify-center p-2">
                        <img src={settings.store_logo} alt="Store Logo" className="max-w-full max-h-full object-contain" />
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-3 transition-opacity">
                          <button type="button" onClick={handleUploadLogo} className="p-2 bg-white/20 text-white rounded-xl hover:bg-white/35 transition-colors cursor-pointer" title="تغيير الشعار">
                            <ImageIcon size={20} />
                          </button>
                          <button type="button" onClick={() => setSettings(prev => ({ ...prev, store_logo: '' }))} className="p-2 bg-danger_red/80 text-white rounded-xl hover:bg-danger_red transition-colors cursor-pointer" title="حذف الشعار">
                            <Trash2 size={20} />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div onClick={handleUploadLogo} className="w-40 h-40 rounded-2xl bg-background_primary/50 border border-dashed border-border_default/70 flex flex-col items-center justify-center cursor-pointer hover:border-primary_blue hover:bg-background_card/40 transition-all group">
                        <ImageIcon size={32} className="text-text_muted group-hover:text-primary_blue group-hover:scale-110 transition-all" />
                        <span className="text-xs font-bold text-text_muted group-hover:text-primary_blue mt-2">رفع الشعار الأساسي</span>
                      </div>
                    )}
                    
                    <input id="logo-file-input" type="file" accept="image/*" onChange={handleLogoFileChange} className="hidden" />

                    {settings.store_logo && (
                      <div className="w-full space-y-3 pt-2">
                        {/* Shape Control */}
                        <div className="flex items-center justify-between gap-4 text-xs font-bold text-text_secondary">
                          <span>شكل إطار الشعار:</span>
                          <div className="grid grid-cols-2 gap-1 bg-background_primary border border-border_default rounded-lg p-0.5 w-36">
                            {(['circle', 'square'] as const).map(shape => (
                              <button
                                type="button"
                                key={shape}
                                onClick={() => setSettings(prev => ({ ...prev, logo_shape: shape }))}
                                className={`py-1 text-[10px] font-black rounded transition-all text-center cursor-pointer ${
                                  settings.logo_shape === shape ? 'bg-primary_blue text-white shadow-sm' : 'text-text_secondary hover:bg-white/5'
                                }`}
                              >
                                {shape === 'circle' ? 'دائري' : 'مربع'}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Position Control */}
                        <div className="flex items-center justify-between gap-4 text-xs font-bold text-text_secondary">
                          <span>موضع الشعار:</span>
                          <div className="grid grid-cols-3 gap-1 bg-background_primary border border-border_default rounded-lg p-0.5 w-44">
                            {([
                              { value: 'right', label: 'يمين' },
                              { value: 'center', label: 'وسط' },
                              { value: 'left', label: 'يسار' }
                            ] as const).map(pos => (
                              <button
                                type="button"
                                key={pos.value}
                                onClick={() => setSettings(prev => ({ ...prev, logo_position: pos.value }))}
                                className={`py-1 text-[10px] font-black rounded transition-all text-center cursor-pointer ${
                                  settings.logo_position === pos.value ? 'bg-primary_blue text-white shadow-sm' : 'text-text_secondary hover:bg-white/5'
                                }`}
                              >
                                {pos.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Size Control */}
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs font-bold text-text_secondary">
                            <span>حجم الشعار:</span>
                            <span className="font-mono text-primary_blue">{settings.logo_size || '80'}px</span>
                          </div>
                          <input
                            type="range"
                            min="40"
                            max="140"
                            value={settings.logo_size || '80'}
                            onChange={(e) => setSettings(prev => ({ ...prev, logo_size: e.target.value }))}
                            className="w-full h-1 bg-background_primary border border-border_default rounded-lg appearance-none cursor-pointer accent-primary_blue outline-none"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Secondary Logo Card */}
                  <div className="bg-background_primary/20 border border-border_default/40 rounded-3xl p-6 flex flex-col items-center space-y-4 shadow-sm relative">
                    <div className="absolute top-4 right-4 bg-emerald-500/10 text-emerald-500 text-xs font-black px-3 py-1 rounded-full">شعار متحرك / ملكية</div>
                    <label className="text-base font-black text-text_primary">الشعار الثانوي أو الترويجي</label>
                    
                    {settings.secondary_logo ? (
                      <div className="relative w-40 h-40 group rounded-2xl overflow-hidden border border-border_default shadow-sm bg-white flex items-center justify-center p-2">
                        <img src={settings.secondary_logo} alt="Secondary Logo" className="max-w-full max-h-full object-contain" />
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-3 transition-opacity">
                          <button type="button" onClick={handleUploadSecondaryLogo} className="p-2 bg-white/20 text-white rounded-xl hover:bg-white/35 transition-colors cursor-pointer" title="تغيير الشعار">
                            <ImageIcon size={20} />
                          </button>
                          <button type="button" onClick={() => {
                            setSettings(prev => ({ ...prev, secondary_logo: '' }));
                            setTempLogoSettings(prev => ({ ...prev, secondary_logo: '' }));
                          }} className="p-2 bg-danger_red/80 text-white rounded-xl hover:bg-danger_red transition-colors cursor-pointer" title="حذف الشعار">
                            <Trash2 size={20} />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div onClick={handleUploadSecondaryLogo} className="w-40 h-40 rounded-2xl bg-background_primary/50 border border-dashed border-border_default/70 flex flex-col items-center justify-center cursor-pointer hover:border-primary_blue hover:bg-background_card/40 transition-all group">
                        <ImageIcon size={32} className="text-text_muted group-hover:text-primary_blue group-hover:scale-110 transition-all" />
                        <span className="text-xs font-bold text-text_muted group-hover:text-primary_blue mt-2">رفع الشعار الثانوي</span>
                      </div>
                    )}
                    
                    <input id="secondary-logo-file-input" type="file" accept="image/*" onChange={handleSecondaryLogoFileChange} className="hidden" />

                    {settings.secondary_logo && (
                      <div className="w-full space-y-3 pt-2">
                        {/* Shape Control */}
                        <div className="flex items-center justify-between gap-4 text-xs font-bold text-text_secondary">
                          <span>شكل إطار الشعار:</span>
                          <div className="grid grid-cols-2 gap-1 bg-background_primary border border-border_default rounded-lg p-0.5 w-36">
                            {(['circle', 'square'] as const).map(shape => (
                              <button
                                type="button"
                                key={shape}
                                onClick={() => setSettings(prev => ({ ...prev, secondary_logo_shape: shape }))}
                                className={`py-1 text-[10px] font-black rounded transition-all text-center cursor-pointer ${
                                  settings.secondary_logo_shape === shape ? 'bg-primary_blue text-white shadow-sm' : 'text-text_secondary hover:bg-white/5'
                                }`}
                              >
                                {shape === 'circle' ? 'دائري' : 'مربع'}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Size Control */}
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs font-bold text-text_secondary">
                            <span>حجم الشعار:</span>
                            <span className="font-mono text-primary_blue">{settings.secondary_logo_size || '80'}px</span>
                          </div>
                          <input
                            type="range"
                            min="40"
                            max="140"
                            value={settings.secondary_logo_size || '80'}
                            onChange={(e) => setSettings(prev => ({ ...prev, secondary_logo_size: e.target.value }))}
                            className="w-full h-1 bg-background_primary border border-border_default rounded-lg appearance-none cursor-pointer accent-primary_blue outline-none"
                          />
                        </div>

                        {/* Opacity Control */}
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs font-bold text-text_secondary">
                            <span>الشفافية:</span>
                            <span className="font-mono text-primary_blue">{settings.secondary_logo_opacity || '100'}%</span>
                          </div>
                          <input
                            type="range"
                            min="10"
                            max="100"
                            value={settings.secondary_logo_opacity || '100'}
                            onChange={(e) => setSettings(prev => ({ ...prev, secondary_logo_opacity: e.target.value }))}
                            className="w-full h-1 bg-background_primary border border-border_default rounded-lg appearance-none cursor-pointer accent-primary_blue outline-none"
                          />
                        </div>

                        {/* Reset Position Button */}
                        <div className="flex justify-between items-center text-xs font-bold pt-1">
                          <span className="text-[10px] text-text_muted">X: {settings.secondary_logo_x || '0'}px | Y: {settings.secondary_logo_y || '0'}px</span>
                          <button
                            type="button"
                            onClick={() => {
                              setSettings(prev => ({ ...prev, secondary_logo_x: '0', secondary_logo_y: '0' }));
                              setTempLogoSettings(prev => ({ ...prev, secondary_logo_x: '0', secondary_logo_y: '0' }));
                            }}
                            className="px-2.5 py-1 bg-background_primary border border-border_default text-text_secondary hover:text-text_primary rounded-lg text-[10px] transition-all cursor-pointer font-bold"
                          >
                            إعادة تعيين الموضع
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Draggable Customizer Trigger Button */}
                {(settings.store_logo || settings.secondary_logo) && (
                  <div className="w-full flex justify-center pt-2">
                    <button
                      type="button"
                      onClick={() => setShowLogoCustomizer(true)}
                      className="px-8 py-3.5 bg-primary_blue hover:bg-primary_blue_hover text-white rounded-xl font-black text-base flex items-center gap-2 cursor-pointer shadow-md transition-all hover:scale-[1.02] active:scale-[0.98]"
                    >
                      <ImageIcon size={18} />
                      تخصيص وسحب الشعار التفاعلي
                    </button>
                  </div>
                )}

                {/* Form Fields */}
                <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="text-base font-black text-text_primary block mb-2">اسم المحل / الشركة</label>
                    <input type="text" name="company_name" value={settings.company_name} onChange={handleChange} className="w-full bg-background_primary border border-border_default hover:border-text_muted/40 focus:border-primary_blue rounded-xl px-6 h-16 transition-all outline-none text-text_primary focus:ring-2 focus:ring-primary_blue/10 font-bold text-base" placeholder="اسم المتجر" />
                  </div>
                  <div>
                    <label className="text-base font-black text-text_primary block mb-2">نشاط الشركة / الوصف الفرعي</label>
                    <input type="text" name="company_activity" value={settings.company_activity || ''} onChange={handleChange} className="w-full bg-background_primary border border-border_default hover:border-text_muted/40 focus:border-primary_blue rounded-xl px-6 h-16 transition-all outline-none text-text_primary focus:ring-2 focus:ring-primary_blue/10 font-bold text-base" placeholder="مثل: قطع غيار السيارات والزيوت والإطارات" />
                  </div>
                  <div>
                    <label className="text-base font-black text-text_primary block mb-2">رقم الهاتف</label>
                    <input type="text" name="company_phone" value={settings.company_phone} onChange={handleChange} className="w-full bg-background_primary border border-border_default hover:border-text_muted/40 focus:border-primary_blue rounded-xl px-6 h-16 transition-all outline-none text-text_primary font-mono-numbers focus:ring-2 focus:ring-primary_blue/10 font-bold text-base" placeholder="رقم الهاتف" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-base font-black text-text_primary block mb-2">عنوان النشاط التجاري</label>
                    <input type="text" name="company_address" value={settings.company_address} onChange={handleChange} className="w-full bg-background_primary border border-border_default hover:border-text_muted/40 focus:border-primary_blue rounded-xl px-6 h-16 transition-all outline-none text-text_primary focus:ring-2 focus:ring-primary_blue/10 font-bold text-base" placeholder="العنوان التجاري بالكامل" />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-base font-black text-text_primary">السجل التجاري (RC)</label>
                      <label className="flex items-center gap-1.5 text-xs font-bold text-text_secondary cursor-pointer select-none">
                        <input
                          type="checkbox"
                          name="company_rc_enabled"
                          checked={settings.company_rc_enabled}
                          onChange={(e) => setSettings(prev => ({ ...prev, company_rc_enabled: e.target.checked }))}
                          className="w-4 h-4 text-primary_blue bg-background_primary border-border_default rounded focus:ring-primary_blue focus:ring-2 outline-none cursor-pointer"
                        />
                        <span>عرض في الفاتورة</span>
                      </label>
                    </div>
                    <input type="text" name="company_rc" value={settings.company_rc || ''} onChange={handleChange} className="w-full bg-background_primary border border-border_default hover:border-text_muted/40 focus:border-primary_blue rounded-xl px-6 h-16 transition-all outline-none text-text_primary font-mono-numbers focus:ring-2 focus:ring-primary_blue/10 font-bold text-base" placeholder="رقم السجل التجاري" />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-base font-black text-text_primary">الرقم الجبائي (NIF)</label>
                      <label className="flex items-center gap-1.5 text-xs font-bold text-text_secondary cursor-pointer select-none">
                        <input
                          type="checkbox"
                          name="company_nif_enabled"
                          checked={settings.company_nif_enabled}
                          onChange={(e) => setSettings(prev => ({ ...prev, company_nif_enabled: e.target.checked }))}
                          className="w-4 h-4 text-primary_blue bg-background_primary border-border_default rounded focus:ring-primary_blue focus:ring-2 outline-none cursor-pointer"
                        />
                        <span>عرض في الفاتورة</span>
                      </label>
                    </div>
                    <input type="text" name="company_nif" value={settings.company_nif || ''} onChange={handleChange} className="w-full bg-background_primary border border-border_default hover:border-text_muted/40 focus:border-primary_blue rounded-xl px-6 h-16 transition-all outline-none text-text_primary font-mono-numbers focus:ring-2 focus:ring-primary_blue/10 font-bold text-base" placeholder="الرقم التعريفي الجبائي" />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-base font-black text-text_primary">الرقم الإحصائي (NIS)</label>
                      <label className="flex items-center gap-1.5 text-xs font-bold text-text_secondary cursor-pointer select-none">
                        <input
                          type="checkbox"
                          name="company_nis_enabled"
                          checked={settings.company_nis_enabled}
                          onChange={(e) => setSettings(prev => ({ ...prev, company_nis_enabled: e.target.checked }))}
                          className="w-4 h-4 text-primary_blue bg-background_primary border-border_default rounded focus:ring-primary_blue focus:ring-2 outline-none cursor-pointer"
                        />
                        <span>عرض في الفاتورة</span>
                      </label>
                    </div>
                    <input type="text" name="company_nis" value={settings.company_nis || ''} onChange={handleChange} className="w-full bg-background_primary border border-border_default hover:border-text_muted/40 focus:border-primary_blue rounded-xl px-6 h-16 transition-all outline-none text-text_primary font-mono-numbers focus:ring-2 focus:ring-primary_blue/10 font-bold text-base" placeholder="الرقم التعريفي الإحصائي" />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-base font-black text-text_primary">رقم المادة (Article)</label>
                      <label className="flex items-center gap-1.5 text-xs font-bold text-text_secondary cursor-pointer select-none">
                        <input
                          type="checkbox"
                          name="company_art_enabled"
                          checked={settings.company_art_enabled}
                          onChange={(e) => setSettings(prev => ({ ...prev, company_art_enabled: e.target.checked }))}
                          className="w-4 h-4 text-primary_blue bg-background_primary border-border_default rounded focus:ring-primary_blue focus:ring-2 outline-none cursor-pointer"
                        />
                        <span>عرض في الفاتورة</span>
                      </label>
                    </div>
                    <input type="text" name="company_art" value={settings.company_art || ''} onChange={handleChange} className="w-full bg-background_primary border border-border_default hover:border-text_muted/40 focus:border-primary_blue rounded-xl px-6 h-16 transition-all outline-none text-text_primary font-mono-numbers focus:ring-2 focus:ring-primary_blue/10 font-bold text-base" placeholder="رقم المادة الضريبية" />
                  </div>
                  <div className="md:col-span-2">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-base font-black text-text_primary">الحساب البنكي أو البريدي (CCP / Bank Account)</label>
                      <label className="flex items-center gap-1.5 text-xs font-bold text-text_secondary cursor-pointer select-none">
                        <input
                          type="checkbox"
                          name="company_cb_enabled"
                          checked={settings.company_cb_enabled}
                          onChange={(e) => setSettings(prev => ({ ...prev, company_cb_enabled: e.target.checked }))}
                          className="w-4 h-4 text-primary_blue bg-background_primary border-border_default rounded focus:ring-primary_blue focus:ring-2 outline-none cursor-pointer"
                        />
                        <span>عرض في الفاتورة</span>
                      </label>
                    </div>
                    <input type="text" name="company_cb" value={settings.company_cb || ''} onChange={handleChange} className="w-full bg-background_primary border border-border_default hover:border-text_muted/40 focus:border-primary_blue rounded-xl px-6 h-16 transition-all outline-none text-text_primary font-mono-numbers focus:ring-2 focus:ring-primary_blue/10 font-bold text-base" placeholder="رقم الحساب البريدي الجاري أو البنكي" />
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'print' && (
            <motion.div key="print" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex-1 overflow-y-auto pb-28 space-y-4 custom-scrollbar">
              <div className="bg-background_secondary border border-border_default rounded-3xl p-8 shadow-sm space-y-8 max-w-5xl mx-auto w-full">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                  <InteractiveDropdownSelect
                    label="طابعة وصولات الكاشير (Receipt 80mm)"
                    value={settings.receipt_printer}
                    options={printers.map(p => ({ label: p.name, value: p.name }))}
                    onChange={(val) => setSettings(prev => ({ ...prev, receipt_printer: val }))}
                    placeholder="-- الطابعة الافتراضية للنظام --"
                    icon={Printer}
                  />
                  <InteractiveDropdownSelect
                    label="طابعة فواتير العملاء (A4 / A5)"
                    value={settings.invoice_printer}
                    options={printers.map(p => ({ label: p.name, value: p.name }))}
                    onChange={(val) => setSettings(prev => ({ ...prev, invoice_printer: val }))}
                    placeholder="-- الطابعة الافتراضية للنظام --"
                    icon={Printer}
                  />
                </div>

                <div className="pt-6 border-t border-border_default/30 flex items-center justify-between">
                  <div>
                    <h4 className="text-base font-black text-text_primary">الطباعة التلقائية عند الحفظ</h4>
                    <p className="text-sm text-text_muted mt-1 font-bold">تفعيل طباعة الوصول مباشرة دون إظهار نافذة تأكيد الطباعة</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSettings(p => ({ ...p, auto_print: !p.auto_print }))}
                    className={`w-18 h-10 rounded-full transition-colors relative flex items-center cursor-pointer ${settings.auto_print ? 'bg-primary_blue' : 'bg-border_default'}`}
                  >
                    <div className={`w-8 h-8 bg-white rounded-full transition-all absolute shadow-sm ${settings.auto_print ? 'left-1' : 'left-9'}`} />
                  </button>
                </div>

                <div className="pt-6 border-t border-border_default/30 grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="text-base font-black text-text_primary block mb-2">عدد المنتجات في الصفحة الواحدة (A4)</label>
                    <input
                      type="number"
                      name="items_per_page_a4"
                      value={settings.items_per_page_a4 || ''}
                      onChange={handleChange}
                      min="0"
                      className="w-full bg-background_primary border border-border_default hover:border-text_muted/40 focus:border-primary_blue rounded-xl px-6 h-16 transition-all outline-none text-text_primary focus:ring-2 focus:ring-primary_blue/10 font-bold text-base"
                      placeholder="0 (تلقائي حسب الارتفاع)"
                    />
                    <p className="text-xs text-text_muted mt-1 font-bold">حدد عدد الأسطر/المنتجات المسموحة في كل صفحة A4، ضع 0 للحساب التلقائي الديناميكي.</p>
                  </div>
                  <div>
                    <label className="text-base font-black text-text_primary block mb-2">عدد المنتجات في الصفحة الواحدة (A5)</label>
                    <input
                      type="number"
                      name="items_per_page_a5"
                      value={settings.items_per_page_a5 || ''}
                      onChange={handleChange}
                      min="0"
                      className="w-full bg-background_primary border border-border_default hover:border-text_muted/40 focus:border-primary_blue rounded-xl px-6 h-16 transition-all outline-none text-text_primary focus:ring-2 focus:ring-primary_blue/10 font-bold text-base"
                      placeholder="0 (تلقائي حسب الارتفاع)"
                    />
                    <p className="text-xs text-text_muted mt-1 font-bold">حدد عدد الأسطر/المنتجات المسموحة في كل صفحة A5، ضع 0 للحساب التلقائي الديناميكي.</p>
                  </div>
                </div>

                <div className="pt-6 border-t border-border_default/30">
                  <label className="text-base font-black text-text_primary">تذييل وصول البيع (Receipt Footer Text)</label>
                  <textarea name="receipt_footer" value={settings.receipt_footer} onChange={handleChange} className="w-full bg-background_primary border border-border_default hover:border-text_muted/40 focus:border-primary_blue rounded-xl px-5 py-4 mt-2.5 min-h-[140px] outline-none text-text_primary focus:ring-2 focus:ring-primary_blue/10 font-bold text-base" placeholder="رسالة ترحيبية تظهر في أسفل الوصول..." />
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'vehicles' && (
            <motion.div key="vehicles" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex-1 flex flex-col min-h-0 max-w-5xl mx-auto w-full">
              <div className="bg-background_secondary border border-border_default rounded-2xl overflow-hidden shadow-sm flex-1 min-h-0">
                <VehiclesPage hideHeader={true} />
              </div>
            </motion.div>
          )}

          {activeTab === 'inventory_archive' && (
            <motion.div key="inventory_archive" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex-1 flex flex-col min-h-0">
              <div className="bg-background_secondary border border-border_default rounded-2xl p-4 shadow-sm flex-1 min-h-0 flex flex-col">
                {countSessionsLoading && countSessions.length === 0 ? (
                  <div className="py-12 flex-1 flex items-center justify-center text-text_muted font-bold">جاري تحميل السجلات...</div>
                ) : countSessions.length === 0 ? (
                  <div className="py-16 flex-1 flex flex-col items-center justify-center text-text_muted space-y-4">
                    <ClipboardList size={48} className="opacity-20" />
                    <p className="text-lg">لا يوجد أي جلسات جرد سابقة.</p>
                  </div>
                ) : (
                  <div
                    onScroll={handleCountSessionsScroll}
                    className="overflow-y-scroll flex-1 custom-scrollbar border border-border_default rounded-xl bg-background_primary/20 shadow-md"
                  >
                    <table className="w-full text-sm text-right border-collapse">
                      <thead className="sticky top-0 z-30 bg-gradient-to-b from-table_header_from to-table_header_to border-b border-black/30 dark:border-border_default shadow-[0_10px_30px_rgba(0,0,0,0.15)] relative">
                        <tr className="h-[48px]">
                          <th className="px-3 font-bold text-[13px] text-text_primary border-l border-black/30 dark:border-border_default">رقم الجلسة</th>
                          <th className="px-3 font-bold text-[13px] text-text_primary border-l border-black/30 dark:border-border_default">تاريخ البدء</th>
                          <th className="px-3 font-bold text-[13px] text-text_primary border-l border-black/30 dark:border-border_default">المسؤول</th>
                          <th className="px-3 font-bold text-[13px] text-text_primary border-l border-black/30 dark:border-border_default">الفئة المحددة</th>
                          <th className="px-3 font-bold text-[13px] text-text_primary border-l border-black/30 dark:border-border_default text-center">المنتجات</th>
                          <th className="px-3 font-bold text-[13px] text-text_primary border-l border-black/30 dark:border-border_default text-center">نسبة الإنجاز</th>
                          <th className="px-3 font-bold text-[13px] text-text_primary border-l border-black/30 dark:border-border_default text-center">الحالة</th>
                          <th className="px-3 font-bold text-[13px] text-text_primary text-center">إجراءات</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border_default bg-background_secondary">
                        {countSessions.map((session, idx) => {
                          const percent = session.total_products > 0
                            ? Math.round((session.checked_count / session.total_products) * 100)
                            : 0;

                          let statusText = 'مسودة';
                          let statusClass = 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
                          if (session.status === 'counting') {
                            statusText = 'جاري العد';
                            statusClass = 'bg-primary_blue/10 text-primary_blue border-primary_blue/20';
                          } else if (session.status === 'reviewing') {
                            statusText = 'قيد المراجعة';
                            statusClass = 'bg-purple-500/10 text-purple-500 border-purple-500/20';
                          } else if (session.status === 'approved') {
                            statusText = 'تم الاعتماد';
                            statusClass = 'bg-success_green/10 text-success_green border-success_green/20';
                          } else if (session.status === 'cancelled') {
                            statusText = 'ملغاة';
                            statusClass = 'bg-danger_red/10 text-danger_red border-danger_red/20';
                          }

                          return (
                            <tr key={session.id} className={`h-11 hover:bg-primary_blue/5 transition-colors group ${idx % 2 === 0 ? 'bg-background_secondary' : 'bg-sidebar_bg'}`}>
                              <td className="px-3 py-1.5 font-numbers font-bold text-primary_blue text-base border-l border-border_default">{session.session_number}</td>
                              <td className="px-3 py-1.5 font-bold font-numbers text-text_secondary border-l border-border_default text-left" dir="ltr">
                                {new Date(session.started_at).toLocaleString('ar-DZ', {
                                  year: 'numeric',
                                  month: 'numeric',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </td>
                              <td className="px-3 py-1.5 font-bold text-text_primary border-l border-border_default">{session.started_by_name || 'مدير النظام'}</td>
                              <td className="px-3 py-1.5 font-bold text-text_secondary border-l border-border_default">{session.category_name_snapshot || 'كل الفئات'}</td>
                              <td className="px-3 py-1.5 font-numbers text-center font-bold text-text_primary border-l border-border_default">{session.total_products}</td>
                              <td className="px-3 py-1.5 border-l border-border_default">
                                <div className="flex flex-col items-center gap-1">
                                  <div className="w-24 bg-border_default/40 h-2 rounded-full overflow-hidden">
                                    <div className="bg-success_green h-full rounded-full" style={{ width: `${percent}%` }} />
                                  </div>
                                  <span className="text-[11px] text-text_muted font-mono-numbers">{percent}% ({session.checked_count}/{session.total_products})</span>
                                </div>
                              </td>
                              <td className="px-3 py-1.5 text-center border-l border-border_default">
                                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${statusClass}`}>
                                  {statusText}
                                </span>
                              </td>
                              <td className="px-3 py-1.5 text-center">
                                {session.status !== 'counting' && session.status !== 'reviewing' && (
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handleDeleteCountSession(session.id); }}
                                    className="p-1 text-text_muted hover:text-danger_red hover:bg-danger_red/10 rounded-lg transition-all active:scale-90 cursor-pointer"
                                    title="حذف الجلسة"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                        {countSessionsLoading && countSessions.length > 0 && (
                          <tr>
                            <td colSpan={8} className="px-3 py-3 text-center text-text_muted font-bold">
                              جاري تحميل المزيد...
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {activeTab === 'users' && canManageUsers && (
            <motion.div key="users" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex-1 flex flex-col min-h-0 max-w-5xl mx-auto w-full space-y-6">
              {/* Header inside Tab */}
              <div className="flex items-center justify-between shrink-0">
                <h3 className="text-lg font-black text-text_primary flex items-center gap-2">
                  <Users className="text-primary_blue" size={22} />
                  إدارة مستخدمي وموظفي النظام
                </h3>
                <button
                  onClick={() => setShowAddUser(true)}
                  className="px-5 py-2.5 bg-primary_blue hover:bg-primary_blue_hover text-white rounded-xl font-bold text-sm flex items-center gap-2 shadow-md cursor-pointer hover:scale-[1.02] transition-transform active:scale-[0.98]"
                >
                  <Plus size={16} />
                  إضافة موظف جديد
                </button>
              </div>

              {/* Users Grid */}
              <div className="flex-1 overflow-y-auto pb-24 custom-scrollbar">
                {usersLoading ? (
                  <div className="py-12 text-center text-text_muted font-bold">جاري تحميل قائمة الموظفين...</div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {usersList.map((u) => {
                      const theme = COLOR_THEMES.find(t => t.value === u.color) || COLOR_THEMES[0];
                      const isCurrentUser = currentUser?.id === u.id;
                      return (
                        <div
                          key={u.id}
                          className={`bg-background_secondary border border-border_default rounded-2xl p-5 flex flex-col justify-between shadow-sm relative transition-all duration-200 hover:border-primary_blue/20 group ${!u.is_active ? 'opacity-60' : ''}`}
                        >
                          {/* Active / Inactive Badge */}
                          <div className="absolute top-4 left-4 flex items-center gap-1.5">
                            <span className={`w-2.5 h-2.5 rounded-full ${u.is_active ? 'bg-success_green animate-pulse' : 'bg-text_muted'}`} />
                            <span className="text-[10px] font-bold text-text_muted">{u.is_active ? 'نشط' : 'معطل'}</span>
                          </div>

                          {/* Profile Overview */}
                          <div className="flex gap-4.5 items-start">
                            <div className={`w-14 h-14 rounded-2xl ${theme.bg} border flex items-center justify-center text-2xl font-bold shrink-0 shadow-sm`}>
                              {u.avatar || u.full_name.charAt(0)}
                            </div>
                            <div className="space-y-1 min-w-0 text-right">
                              <h4 className="text-base font-black text-text_primary truncate flex items-center gap-1.5">
                                {u.full_name}
                                {isCurrentUser && <span className="text-[9px] bg-primary_blue/10 text-primary_blue border border-primary_blue/20 rounded-md px-1.5 py-0.5">أنت</span>}
                              </h4>
                              <p className="text-xs text-text_muted font-bold font-mono">@{u.username}</p>
                              <span className={`inline-block text-[10px] font-black px-2 py-0.5 rounded-md border ${
                                u.role === 'owner' ? 'bg-violet-500/10 text-violet-400 border-violet-500/20' :
                                u.role === 'manager' ? 'bg-primary_blue/10 text-primary_blue border-primary_blue/20' :
                                u.role === 'cashier' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                'bg-slate-500/10 text-slate-400 border-slate-500/20'
                              }`}>
                                {ROLE_OPTIONS.find(r => r.value === u.role)?.label || u.role}
                              </span>
                            </div>
                          </div>

                          {/* Bottom Details & Actions */}
                          <div className="border-t border-border_default/30 mt-5 pt-4 flex items-center justify-between">
                            <div className="flex flex-col gap-0.5 text-right">
                              <span className="text-[10px] text-text_muted">رمز الدخول PIN</span>
                              <span className="text-sm font-black font-numbers text-text_primary tracking-widest">{u.pin_code || '----'}</span>
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => { setEditingUser(u); setShowResetPassword(false); }}
                                className="p-2 bg-primary_blue/10 text-primary_blue hover:bg-primary_blue/25 hover:text-primary_blue rounded-xl transition-all cursor-pointer hover:scale-105 active:scale-95"
                                title="تعديل الموظف"
                              >
                                <Edit2 size={15} />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {activeTab === 'backup' && (
            <motion.div key="backup" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex-1 overflow-y-auto pb-28 space-y-4 custom-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto w-full">
                {/* Backup Card */}
                <div className="bg-background_secondary border border-border_default p-10 rounded-3xl flex flex-col justify-between shadow-sm hover:shadow-md transition-all hover:scale-[1.01] min-h-[380px]">
                  <div className="space-y-6">
                    <div className="w-16 h-16 rounded-2xl bg-primary_blue/10 flex items-center justify-center">
                      <Download className="text-primary_blue" size={34} />
                    </div>
                    <h4 className="text-2xl font-black text-text_primary">إنشاء نسخة احتياطية جديدة</h4>
                    <p className="text-base text-text_secondary leading-relaxed font-bold">قم بحفظ نسخة كاملة من قاعدة البيانات الحالية إلى جهازك لحمايتها من الضياع أو التلف المفاجئ.</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleBackup}
                    className="w-full mt-8 py-5 bg-primary_blue hover:bg-primary_blue_hover text-white rounded-xl font-bold text-base transition-all shadow-md shadow-primary_blue/10 hover:shadow-lg cursor-pointer"
                  >
                    حفظ نسخة احتياطية
                  </button>
                </div>

                {/* Restore Card */}
                <div className="bg-background_secondary border border-border_default p-10 rounded-3xl flex flex-col justify-between shadow-sm hover:shadow-md transition-all hover:scale-[1.01] min-h-[380px]">
                  <div className="space-y-6">
                    <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 flex items-center justify-center">
                      <UploadCloud className="text-indigo-500" size={34} />
                    </div>
                    <h4 className="text-2xl font-black text-text_primary">استرجاع نسخة احتياطية</h4>
                    <p className="text-base text-text_secondary leading-relaxed font-bold">استبدل قاعدة البيانات الحالية بملف نسخة احتياطية قديم تم حفظه مسبقاً على هذا الجهاز.</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleRestore}
                    className="w-full mt-8 py-5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-base transition-all shadow-md shadow-indigo-600/10 hover:shadow-lg cursor-pointer"
                  >
                    استرجاع من ملف
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'shortcuts' && (
            <motion.div 
              key="shortcuts" 
              initial={{ opacity: 0, y: 10 }} 
              animate={{ opacity: 1, y: 0 }} 
              exit={{ opacity: 0 }} 
              className="flex-1 overflow-y-auto pb-28 space-y-6 custom-scrollbar"
            >
              <div className="bg-background_secondary border border-border_default rounded-3xl p-8 shadow-sm max-w-4xl mx-auto w-full space-y-6">
                {/* Header and Reset Button */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-border_default/30">
                  <div className="space-y-1.5 text-right">
                    <h3 className="text-xl font-black text-text_primary flex items-center gap-2.5">
                      <Keyboard className="text-primary_blue" size={24} />
                      تخصيص اختصارات لوحة المفاتيح
                    </h3>
                    <p className="text-sm text-text_secondary font-bold">
                      انقر على زر "تعديل" لتسجيل مفتاح أو توليفة مفاتيح جديدة للتحكم السريع في النظام.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm('هل تريد استعادة جميع الاختصارات الافتراضية؟')) {
                        resetToDefaults();
                        showSuccess('تم استعادة الاختصارات الافتراضية بنجاح');
                      }
                    }}
                    className="flex items-center gap-2 px-5 py-3 rounded-xl border border-border_default hover:border-text_muted/30 text-text_secondary hover:text-text_primary font-bold text-sm bg-background_primary/30 transition-all cursor-pointer"
                  >
                    <RefreshCw size={16} />
                    استعادة الافتراضي
                  </button>
                </div>

                {/* Sidebar Hover Toggle Setting */}
                <div className="py-5 flex items-center justify-between gap-6 border-b border-border_default/30">
                  <div className="space-y-1 text-right">
                    <h4 className="text-base font-black text-text_primary">تمدد الشريط الجانبي بالماوس (Sidebar Hover Expansion)</h4>
                    <p className="text-xs text-text_muted font-bold">تفعيل تمدد القائمة الجانبية تلقائياً عند مرور مؤشر الفأرة فوقها في الصفحات العادية</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEnableSidebarHover(!enableSidebarHover)}
                    className={`w-18 h-10 rounded-full transition-colors relative flex items-center cursor-pointer shrink-0 ${enableSidebarHover ? 'bg-primary_blue' : 'bg-border_default'}`}
                  >
                    <div className={`w-8 h-8 bg-white rounded-full transition-all absolute shadow-sm ${enableSidebarHover ? 'left-1' : 'left-9'}`} />
                  </button>
                </div>

                {/* List of shortcuts */}
                <div className="divide-y divide-border_default/30">
                  {(Object.keys(DEFAULT_SHORTCUTS) as Array<keyof ShortcutMapping>).map((actionKey) => (
                    <div 
                      key={actionKey} 
                      className="py-4.5 flex items-center justify-between gap-6 transition-all hover:bg-background_primary/10 rounded-2xl px-4 -mx-4 group"
                    >
                      {/* Info */}
                      <div className="space-y-1 text-right">
                        <h4 className="text-base font-black text-text_primary group-hover:text-primary_blue transition-colors">
                          {SHORTCUT_LABELS[actionKey]}
                        </h4>
                        <span className="text-xs text-text_muted font-bold font-mono">
                          {actionKey}
                        </span>
                      </div>

                      {/* Keycap & Record Button */}
                      <div className="flex items-center gap-6">
                        {/* Display Shortcut Keycaps */}
                        <div className="flex items-center gap-1.5 flex-row-reverse" dir="ltr">
                          {(shortcuts[actionKey] || DEFAULT_SHORTCUTS[actionKey] || '').split('+').map((keyPart, idx) => (
                            <kbd 
                              key={idx} 
                              className="px-3.5 py-2 bg-background_primary border border-border_default rounded-xl text-sm font-black font-mono shadow-sm text-text_primary min-w-[40px] text-center uppercase"
                            >
                              {keyPart}
                            </kbd>
                          ))}
                        </div>

                        {/* Edit Button */}
                        <button
                          type="button"
                          onClick={() => setRecordingAction(actionKey)}
                          className="px-4 py-2 bg-primary_blue/10 hover:bg-primary_blue/20 text-primary_blue rounded-xl text-xs font-black transition-all cursor-pointer"
                        >
                          تعديل
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Notes / Tips Alert Box */}
                <div className="pt-6 border-t border-border_default/30">
                  <div className="bg-primary_blue/5 border border-primary_blue/10 rounded-2xl p-5 flex items-start gap-3.5">
                    <ShieldAlert size={20} className="text-primary_blue shrink-0 mt-0.5" />
                    <div className="space-y-2 text-right">
                      <h5 className="text-sm font-black text-primary_blue">نصائح وملاحظات هامة للاستخدام:</h5>
                      <ul className="text-xs text-text_secondary list-disc list-inside space-y-1.5 font-bold leading-relaxed">
                        <li>المفاتيح الوظيفية الكلاسيكية (مثل F1 إلى F12) آمنة وسهلة الاستخدام وتعمل بلمسة واحدة.</li>
                        <li>يمكنك استخدام الاختصارات المركبة عبر دمج مفاتيح التعديل مثل Ctrl أو Alt أو Shift (مثال: Ctrl+F2).</li>
                        <li>يرجى تجنب التوليفات المحجوزة للمتصفح أو نظام التشغيل (مثل Ctrl+R لإعادة التحميل أو Ctrl+W لإغلاق النافذة).</li>
                        <li>تطبيق الاختصارات ذكي وتلقائي، حيث يتوقف مفعول الأزرار الفردية (التي لا تحوي Ctrl أو Alt) أثناء الكتابة داخل حقول النصوص لمنع التشويش.</li>
                      </ul>
                    </div>
                  </div>
                </div>

              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>

      {/* Floating Save Button for profile and print settings */}
      {(activeTab === 'profile' || activeTab === 'print') && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-40">
          <button
            onClick={() => handleSave()}
            disabled={saving}
            className="bg-primary_blue hover:bg-primary_blue_hover text-white px-12 py-4 rounded-2xl font-black text-lg flex items-center gap-3 shadow-[0_8px_30px_rgba(59,130,246,0.4)] hover:shadow-[0_12px_40px_rgba(59,130,246,0.5)] hover:scale-[1.04] active:scale-[0.96] transition-all duration-200 disabled:opacity-50 cursor-pointer"
          >
            <Save size={22} />
            {saving ? 'جاري الحفظ...' : 'حفظ جميع التغييرات'}
          </button>
        </div>
      )}

      {/* ── Modal Add User ────────────────────────────────────────────────── */}
      {showAddUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-background_secondary border border-border_default w-full max-w-xl rounded-3xl p-6.5 shadow-2xl flex flex-col gap-5 max-h-[90vh] overflow-y-auto custom-scrollbar"
          >
            <div className="flex items-center justify-between border-b border-border_default/30 pb-4">
              <h3 className="text-lg font-black text-text_primary">إضافة موظف جديد بالنظام</h3>
              <button onClick={() => setShowAddUser(false)} className="p-1.5 text-text_muted hover:text-text_primary hover:bg-white/5 rounded-xl transition-all cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-text_secondary mb-1">الاسم الكامل للموظف *</label>
                  <input
                    type="text"
                    required
                    value={newUser.full_name}
                    onChange={(e) => setNewUser(prev => ({ ...prev, full_name: e.target.value }))}
                    className="w-full bg-background_primary border border-border_default rounded-xl px-4 py-2.5 text-text_primary outline-none focus:border-primary_blue font-bold text-sm"
                    placeholder="محمد أمين"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-text_secondary mb-1">اسم المستخدم للدخول التقليدي *</label>
                  <input
                    type="text"
                    required
                    value={newUser.username}
                    onChange={(e) => setNewUser(prev => ({ ...prev, username: e.target.value.toLowerCase().replace(/\s/g, '') }))}
                    className="w-full bg-background_primary border border-border_default rounded-xl px-4 py-2.5 text-text_primary outline-none focus:border-primary_blue font-bold text-sm"
                    placeholder="amine123"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-text_secondary mb-1">كلمة المرور *</label>
                  <input
                    type="password"
                    required
                    value={newUser.password}
                    onChange={(e) => setNewUser(prev => ({ ...prev, password: e.target.value }))}
                    className="w-full bg-background_primary border border-border_default rounded-xl px-4 py-2.5 text-text_primary outline-none focus:border-primary_blue font-bold text-sm"
                    placeholder="••••••••"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-text_secondary mb-1">رمز الـ PIN المكون من 4 أرقام (للدخول السريع) *</label>
                  <input
                    type="text"
                    required
                    maxLength={4}
                    value={newUser.pin_code}
                    onChange={(e) => setNewUser(prev => ({ ...prev, pin_code: e.target.value.replace(/[^0-9]/g, '') }))}
                    className="w-full bg-background_primary border border-border_default rounded-xl px-4 py-2.5 text-text_primary font-numbers outline-none focus:border-primary_blue font-bold text-sm tracking-widest text-center"
                    placeholder="1234"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-text_secondary mb-1">دور وصلاحية المستخدم بالنظام *</label>
                  <select
                    value={newUser.role}
                    onChange={(e) => setNewUser(prev => ({ ...prev, role: e.target.value as any }))}
                    className="w-full bg-background_primary border border-border_default rounded-xl px-4 py-2.5 text-text_primary outline-none focus:border-primary_blue font-bold text-sm"
                  >
                    {ROLE_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-text_secondary mb-1">الرمز البصري (Avatar)</label>
                  <select
                    value={newUser.avatar}
                    onChange={(e) => setNewUser(prev => ({ ...prev, avatar: e.target.value }))}
                    className="w-full bg-background_primary border border-border_default rounded-xl px-4 py-2.5 text-text_primary outline-none focus:border-primary_blue font-bold text-sm text-center"
                  >
                    {AVATAR_OPTIONS.map(emoji => (
                      <option key={emoji} value={emoji}>{emoji}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Color Theme Selector */}
              <div>
                <label className="block text-xs font-bold text-text_secondary mb-2">لون الهوية البصرية للحساب</label>
                <div className="flex flex-wrap gap-2.5">
                  {COLOR_THEMES.map(theme => (
                    <button
                      key={theme.value}
                      type="button"
                      onClick={() => setNewUser(prev => ({ ...prev, color: theme.value }))}
                      className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        newUser.color === theme.value ? 'bg-primary_blue text-white border-primary_blue' : 'bg-background_primary border-border_default text-text_secondary hover:border-text_muted/40'
                      }`}
                    >
                      {theme.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 justify-end border-t border-border_default/30 pt-4.5 mt-6">
                <button
                  type="button"
                  onClick={() => setShowAddUser(false)}
                  className="px-5 py-2.5 bg-background_primary border border-border_default text-text_secondary hover:text-text_primary rounded-xl font-bold text-sm transition-all cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-primary_blue hover:bg-primary_blue_hover text-white rounded-xl font-black text-sm transition-all cursor-pointer shadow-md"
                >
                  إضافة الحساب
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* ── Modal Edit User ────────────────────────────────────────────────── */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-background_secondary border border-border_default w-full max-w-xl rounded-3xl p-6.5 shadow-2xl flex flex-col gap-5 max-h-[90vh] overflow-y-auto custom-scrollbar"
          >
            <div className="flex items-center justify-between border-b border-border_default/30 pb-4">
              <h3 className="text-lg font-black text-text_primary">تعديل بيانات المستخدم: {editingUser.full_name}</h3>
              <button onClick={() => setEditingUser(null)} className="p-1.5 text-text_muted hover:text-text_primary hover:bg-white/5 rounded-xl transition-all cursor-pointer">
                <X size={18} />
              </button>
            </div>

            {!showResetPassword ? (
              <form onSubmit={handleUpdateUser} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-text_secondary mb-1">الاسم الكامل للموظف *</label>
                    <input
                      type="text"
                      required
                      value={editingUser.full_name}
                      onChange={(e) => setEditingUser(prev => prev ? ({ ...prev, full_name: e.target.value }) : null)}
                      className="w-full bg-background_primary border border-border_default rounded-xl px-4 py-2.5 text-text_primary outline-none focus:border-primary_blue font-bold text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-text_secondary mb-1">اسم المستخدم للدخول التقليدي *</label>
                    <input
                      type="text"
                      required
                      value={editingUser.username}
                      onChange={(e) => setEditingUser(prev => prev ? ({ ...prev, username: e.target.value.toLowerCase().replace(/\s/g, '') }) : null)}
                      className="w-full bg-background_primary border border-border_default rounded-xl px-4 py-2.5 text-text_primary outline-none focus:border-primary_blue font-bold text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-text_secondary mb-1">رمز الـ PIN المكون من 4 أرقام *</label>
                    <input
                      type="text"
                      required
                      maxLength={4}
                      value={editingUser.pin_code || ''}
                      onChange={(e) => setEditingUser(prev => prev ? ({ ...prev, pin_code: e.target.value.replace(/[^0-9]/g, '') }) : null)}
                      className="w-full bg-background_primary border border-border_default rounded-xl px-4 py-2.5 text-text_primary font-numbers outline-none focus:border-primary_blue font-bold text-sm tracking-widest text-center"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-text_secondary mb-1">دور وصلاحية المستخدم بالنظام *</label>
                    <select
                      value={editingUser.role}
                      disabled={editingUser.id === currentUser?.id}
                      onChange={(e) => setEditingUser(prev => prev ? ({ ...prev, role: e.target.value as any }) : null)}
                      className="w-full bg-background_primary border border-border_default rounded-xl px-4 py-2.5 text-text_primary outline-none focus:border-primary_blue font-bold text-sm disabled:opacity-50"
                    >
                      {ROLE_OPTIONS.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-text_secondary mb-1">الرمز البصري (Avatar)</label>
                    <select
                      value={editingUser.avatar}
                      onChange={(e) => setEditingUser(prev => prev ? ({ ...prev, avatar: e.target.value }) : null)}
                      className="w-full bg-background_primary border border-border_default rounded-xl px-4 py-2.5 text-text_primary outline-none focus:border-primary_blue font-bold text-sm text-center"
                    >
                      {AVATAR_OPTIONS.map(emoji => (
                        <option key={emoji} value={emoji}>{emoji}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-text_secondary mb-1">حالة الحساب</label>
                    <select
                      value={editingUser.is_active ? 'true' : 'false'}
                      disabled={editingUser.id === currentUser?.id}
                      onChange={(e) => setEditingUser(prev => prev ? ({ ...prev, is_active: e.target.value === 'true' }) : null)}
                      className="w-full bg-background_primary border border-border_default rounded-xl px-4 py-2.5 text-text_primary outline-none focus:border-primary_blue font-bold text-sm disabled:opacity-50"
                    >
                      <option value="true">نشط ومفعل</option>
                      <option value="false">معطل وموقوف</option>
                    </select>
                  </div>
                </div>

                {/* Color Theme Selector */}
                <div>
                  <label className="block text-xs font-bold text-text_secondary mb-2">لون الهوية البصرية للحساب</label>
                  <div className="flex flex-wrap gap-2.5">
                    {COLOR_THEMES.map(theme => (
                      <button
                        key={theme.value}
                        type="button"
                        onClick={() => setEditingUser(prev => prev ? ({ ...prev, color: theme.value }) : null)}
                        className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                          editingUser.color === theme.value ? 'bg-primary_blue text-white border-primary_blue' : 'bg-background_primary border-border_default text-text_secondary hover:border-text_muted/40'
                        }`}
                      >
                        {theme.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Reset Password Option Trigger */}
                <div className="pt-2 border-t border-border_default/30">
                  <button
                    type="button"
                    onClick={() => setShowResetPassword(true)}
                    className="text-xs font-black text-primary_blue hover:text-primary_blue_hover transition-colors flex items-center gap-1.5 cursor-pointer bg-primary_blue/5 border border-primary_blue/10 px-3.5 py-2 rounded-xl"
                  >
                    <KeyRound size={13} />
                    هل ترغب في تغيير كلمة مرور المستخدم؟
                  </button>
                </div>

                <div className="flex gap-3 justify-end border-t border-border_default/30 pt-4.5 mt-6">
                  <button
                    type="button"
                    onClick={() => setEditingUser(null)}
                    className="px-5 py-2.5 bg-background_primary border border-border_default text-text_secondary hover:text-text_primary rounded-xl font-bold text-sm transition-all cursor-pointer"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 bg-primary_blue hover:bg-primary_blue_hover text-white rounded-xl font-black text-sm transition-all cursor-pointer shadow-md"
                  >
                    حفظ التغييرات
                  </button>
                </div>
              </form>
            ) : (
              // Reset Password Subform
              <form onSubmit={handleResetPassword} className="space-y-5">
                <div>
                  <label className="block text-xs font-bold text-text_secondary mb-1.5">كلمة المرور الجديدة للموظف *</label>
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full bg-background_primary border border-border_default rounded-xl px-4 py-2.5 text-text_primary outline-none focus:border-primary_blue font-bold text-sm"
                    placeholder="••••••••"
                  />
                  <p className="text-[10px] text-text_muted mt-1.5 font-bold">يرجى كتابة كلمة مرور قوية وسهلة الحفظ للموظف.</p>
                </div>

                <div className="flex gap-3 justify-end border-t border-border_default/30 pt-4.5 mt-6">
                  <button
                    type="button"
                    onClick={() => setShowResetPassword(false)}
                    className="px-5 py-2.5 bg-background_primary border border-border_default text-text_secondary hover:text-text_primary rounded-xl font-bold text-sm transition-all cursor-pointer"
                  >
                    العودة للتعديل
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 bg-primary_blue hover:bg-primary_blue_hover text-white rounded-xl font-black text-sm transition-all cursor-pointer shadow-md"
                  >
                    تغيير كلمة المرور فوراً
                  </button>
                </div>
              </form>
            )}
          </motion.div>
        </div>
      )}

      {/* ── Keyboard Shortcut Recorder Modal ───────────────────────────────── */}
      {recordingAction && (
        <div 
          onClick={() => setRecordingAction(null)}
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/60 backdrop-blur-md p-4 cursor-pointer select-none"
        >
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={(e) => e.stopPropagation()} 
            className="bg-background_secondary border border-border_default rounded-3xl p-10 max-w-md w-full text-center space-y-6 shadow-2xl relative"
          >
            <div className="w-20 h-20 rounded-full bg-primary_blue/10 flex items-center justify-center mx-auto animate-pulse">
              <Keyboard className="text-primary_blue" size={40} />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-black text-text_primary">جاري تسجيل الاختصار الجديد</h3>
              <p className="text-sm text-text_secondary font-bold">
                للإجراء: <span className="text-primary_blue font-black">{SHORTCUT_LABELS[recordingAction]}</span>
              </p>
            </div>
            <div className="bg-background_primary border border-border_default rounded-2xl p-6 flex flex-col items-center justify-center space-y-2.5">
              <span className="text-xs font-bold text-text_muted">اضغط على التوليفة المطلوبة على لوحة المفاتيح</span>
              <span className="text-base font-black text-text_primary animate-bounce">مثال: Ctrl+F2 أو F12 أو Alt+S</span>
            </div>
            <button 
              onClick={() => setRecordingAction(null)}
              className="w-full py-3.5 bg-background_primary border border-border_default hover:bg-background_card text-text_primary rounded-xl font-bold text-sm transition-all cursor-pointer"
            >
              إلغاء التسجيل
            </button>
          </motion.div>
        </div>
      )}

      {/* ── Logo Customizer Modal ────────────────────────────────────────── */}
      {showLogoCustomizer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            className="bg-background_secondary border border-border_default w-full max-w-6xl h-[90vh] rounded-3xl overflow-hidden shadow-2xl flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border_default/30 px-6.5 py-4 shrink-0 bg-background_secondary z-10">
              <div className="space-y-1">
                <h3 className="text-lg font-black text-text_primary flex items-center gap-2">
                  <ImageIcon className="text-primary_blue" size={20} />
                  تخصيص موضع وتصميم الشعار في الفاتورة
                </h3>
                <p className="text-xs text-text_muted font-bold">
                  قم بضبط الحجم، الشكل والشفافية، أو اسحب الشعار مباشرة بمؤشر الفأرة لوضعه في أي مكان تريده.
                </p>
              </div>
              <button 
                onClick={() => setShowLogoCustomizer(false)} 
                className="p-1.5 text-text_muted hover:text-text_primary hover:bg-white/5 rounded-xl transition-all cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Content Body */}
            <div className="flex-1 min-h-0 flex flex-col md:flex-row overflow-hidden">
              {/* Left Panel: Live Preview (65%) */}
              <div className="flex-1 bg-background_primary/30 p-6 flex flex-col items-center justify-center min-h-0 overflow-hidden relative">
                <div className="text-xs text-primary_blue bg-primary_blue/5 border border-primary_blue/10 rounded-xl px-4 py-2 mb-4 font-bold flex items-center gap-2 select-none shadow-sm shrink-0">
                  <span>💡</span>
                  <span>يمكنك سحب الشعار وتحريكه بمؤشر الفأرة مباشرة داخل المعاينة لوضعه في المكان المناسب.</span>
                </div>
                
                {/* Scrollable invoice container */}
                <div className="w-full flex-1 overflow-y-auto overflow-x-auto p-4 flex justify-center items-start custom-scrollbar bg-slate-900/10 dark:bg-black/20 rounded-2xl border border-border_default/40">
                  <div className="scale-[0.85] md:scale-95 origin-top shadow-xl">
                    <PrintTemplateRenderer
                      invoice={MOCK_INVOICE}
                      settings={{
                        ...settings,
                        ...tempLogoSettings
                      }}
                      paperSize={previewPaperSize}
                      templateType={previewPaperSize === '80mm' ? 'receipt' : 'tax'}
                      config={{
                        showCompanyBlock: true,
                        showCompanyOfficialDetails: true,
                        showCustomerBlock: true,
                        showInvoiceDetails: true,
                        showNotes: true,
                        showFooter: true,
                        fontWeight: 'bold',
                        fontWeightPercent: 80,
                        showColBarcode: true,
                        showColName: true,
                        showColQty: true,
                        showColUnit: true,
                        showColDiscount: true,
                        showColPrice: true,
                        showColTotal: true
                      }}
                      columnOrder={['index', 'barcode', 'name', 'quantity', 'unit', 'price', 'discount', 'total']}
                      isLogoDraggable={!!tempLogoSettings.secondary_logo}
                      onLogoDrag={(x, y) => {
                        setTempLogoSettings(prev => ({
                          ...prev,
                          secondary_logo_x: String(x),
                          secondary_logo_y: String(y)
                        }));
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Right Panel: Controls (35%) */}
              <div className="w-full md:w-80 bg-background_secondary border-r md:border-r-0 md:border-l border-border_default/30 p-6 flex flex-col justify-between shrink-0 overflow-y-auto custom-scrollbar">
                <div className="space-y-6">
                  {/* Paper Size Preview Selector */}
                  <div className="space-y-2">
                    <label className="text-sm font-black text-text_primary block">حجم الورقة للمعاينة</label>
                    <div className="grid grid-cols-3 gap-2 bg-background_primary border border-border_default rounded-xl p-1">
                      {(['A4', 'A5', '80mm'] as PaperSize[]).map((size) => (
                        <button
                          type="button"
                          key={size}
                          onClick={() => setPreviewPaperSize(size)}
                          className={`py-2 text-xs font-black rounded-lg transition-all text-center cursor-pointer ${
                            previewPaperSize === size 
                              ? 'bg-primary_blue text-white shadow-md' 
                              : 'text-text_secondary hover:bg-white/5'
                          }`}
                        >
                          {size}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Tab Selector */}
                  <div className="grid grid-cols-2 gap-2 bg-background_primary border border-border_default rounded-xl p-1">
                    <button
                      type="button"
                      onClick={() => setCustomizerTab('primary')}
                      className={`py-2 text-xs font-black rounded-lg transition-all text-center cursor-pointer ${
                        customizerTab === 'primary' 
                          ? 'bg-primary_blue text-white shadow-md' 
                          : 'text-text_secondary hover:bg-white/5'
                      }`}
                    >
                      الشعار الأساسي
                    </button>
                    <button
                      type="button"
                      onClick={() => setCustomizerTab('secondary')}
                      className={`py-2 text-xs font-black rounded-lg transition-all text-center cursor-pointer ${
                        customizerTab === 'secondary' 
                          ? 'bg-primary_blue text-white shadow-md' 
                          : 'text-text_secondary hover:bg-white/5'
                      }`}
                    >
                      الشعار الثانوي
                    </button>
                  </div>

                  {customizerTab === 'primary' ? (
                    <>
                      {/* Alignment / Position */}
                      <div className="space-y-2">
                        <label className="text-sm font-black text-text_primary block">موضع الشعار الافتراضي</label>
                        <div className="grid grid-cols-3 gap-2 bg-background_primary border border-border_default rounded-xl p-1">
                          {([
                            { value: 'right', label: 'يمين' },
                            { value: 'center', label: 'وسط' },
                            { value: 'left', label: 'يسار' }
                          ] as const).map((pos) => (
                            <button
                              type="button"
                              key={pos.value}
                              onClick={() => setTempLogoSettings(prev => ({ ...prev, logo_position: pos.value }))}
                              className={`py-2 text-xs font-black rounded-lg transition-all text-center cursor-pointer ${
                                tempLogoSettings.logo_position === pos.value 
                                  ? 'bg-primary_blue text-white shadow-md' 
                                  : 'text-text_secondary hover:bg-white/5'
                              }`}
                            >
                              {pos.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Shape control */}
                      <div className="space-y-2">
                        <label className="text-sm font-black text-text_primary block">شكل إطار الشعار</label>
                        <div className="grid grid-cols-2 gap-2 bg-background_primary border border-border_default rounded-xl p-1">
                          {(['circle', 'square'] as const).map(shape => {
                            const label = shape === 'circle' ? 'دائري' : 'مربع';
                            const active = tempLogoSettings.logo_shape === shape;
                            return (
                              <button
                                type="button"
                                key={shape}
                                onClick={() => setTempLogoSettings(prev => ({ ...prev, logo_shape: shape }))}
                                className={`py-2 text-xs font-black rounded-lg transition-all text-center cursor-pointer ${
                                  active ? 'bg-primary_blue text-white shadow-md' : 'text-text_secondary hover:bg-white/5'
                                }`}
                              >
                                {label}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Grayscale filter control */}
                      <div className="space-y-2">
                        <label className="text-sm font-black text-text_primary block">فلترة ألوان الشعار</label>
                        <div className="grid grid-cols-2 gap-2 bg-background_primary border border-border_default rounded-xl p-1">
                          {(['false', 'true'] as const).map(gs => {
                            const label = gs === 'false' ? 'ملون' : 'أبيض وأسود';
                            const active = tempLogoSettings.logo_grayscale === gs;
                            return (
                              <button
                                type="button"
                                key={gs}
                                onClick={() => setTempLogoSettings(prev => ({ ...prev, logo_grayscale: gs }))}
                                className={`py-2 text-xs font-black rounded-lg transition-all text-center cursor-pointer ${
                                  active ? 'bg-primary_blue text-white shadow-md' : 'text-text_secondary hover:bg-white/5'
                                }`}
                              >
                                {label}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Size slider */}
                      <div className="space-y-2">
                        <div className="flex justify-between items-center text-sm font-black text-text_primary">
                          <span>حجم الشعار الأساسي</span>
                          <span className="font-mono text-primary_blue">{tempLogoSettings.logo_size}px</span>
                        </div>
                        <input
                          type="range"
                          min="40"
                          max="140"
                          value={tempLogoSettings.logo_size}
                          onChange={(e) => setTempLogoSettings(prev => ({ ...prev, logo_size: e.target.value }))}
                          className="w-full h-1 bg-background_primary border border-border_default rounded-lg appearance-none cursor-pointer accent-primary_blue outline-none"
                        />
                      </div>

                      {/* Opacity slider */}
                      <div className="space-y-2">
                        <div className="flex justify-between items-center text-sm font-black text-text_primary">
                          <span>شفافية الشعار</span>
                          <span className="font-mono text-primary_blue">{tempLogoSettings.logo_opacity}%</span>
                        </div>
                        <input
                          type="range"
                          min="10"
                          max="100"
                          value={tempLogoSettings.logo_opacity}
                          onChange={(e) => setTempLogoSettings(prev => ({ ...prev, logo_opacity: e.target.value }))}
                          className="w-full h-1 bg-background_primary border border-border_default rounded-lg appearance-none cursor-pointer accent-primary_blue outline-none"
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      {/* Secondary Logo Upload Section */}
                      <div className="space-y-2">
                        <label className="text-sm font-black text-text_primary block">صورة الشعار الثانوي</label>
                        {tempLogoSettings.secondary_logo ? (
                          <div className="relative w-full h-32 rounded-2xl overflow-hidden border border-border_default bg-white flex items-center justify-center p-2 group">
                            <img src={tempLogoSettings.secondary_logo} alt="Secondary Logo" className="max-w-full max-h-full object-contain" />
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-2 transition-opacity">
                              <button type="button" onClick={handleUploadSecondaryLogo} className="p-2 bg-white/20 text-white rounded-xl hover:bg-white/35 transition-colors cursor-pointer" title="تغيير الشعار">
                                <ImageIcon size={18} />
                              </button>
                              <button type="button" onClick={() => setTempLogoSettings(prev => ({ ...prev, secondary_logo: '' }))} className="p-2 bg-danger_red/80 text-white rounded-xl hover:bg-danger_red transition-colors cursor-pointer" title="حذف الشعار">
                                <Trash2 size={18} />
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div onClick={handleUploadSecondaryLogo} className="w-full h-32 rounded-2xl bg-background_primary/50 border border-dashed border-border_default/70 flex flex-col items-center justify-center cursor-pointer hover:border-primary_blue hover:bg-background_card/40 transition-all group shadow-sm">
                            <ImageIcon size={28} className="text-text_muted group-hover:text-primary_blue group-hover:scale-110 transition-all" />
                            <span className="text-xs font-bold text-text_muted group-hover:text-primary_blue mt-1.5 font-bold">رفع الشعار الثانوي</span>
                          </div>
                        )}
                        <input
                          id="secondary-logo-file-input"
                          type="file"
                          accept="image/*"
                          onChange={handleSecondaryLogoFileChange}
                          className="hidden"
                        />
                      </div>

                      {/* Shape control */}
                      <div className="space-y-2">
                        <label className="text-sm font-black text-text_primary block">شكل إطار الشعار الثانوي</label>
                        <div className="grid grid-cols-2 gap-2 bg-background_primary border border-border_default rounded-xl p-1">
                          {(['circle', 'square'] as const).map(shape => {
                            const label = shape === 'circle' ? 'دائري' : 'مربع';
                            const active = tempLogoSettings.secondary_logo_shape === shape;
                            return (
                              <button
                                type="button"
                                key={shape}
                                onClick={() => setTempLogoSettings(prev => ({ ...prev, secondary_logo_shape: shape }))}
                                className={`py-2 text-xs font-black rounded-lg transition-all text-center cursor-pointer ${
                                  active ? 'bg-primary_blue text-white shadow-md' : 'text-text_secondary hover:bg-white/5'
                                }`}
                              >
                                {label}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Grayscale filter control */}
                      <div className="space-y-2">
                        <label className="text-sm font-black text-text_primary block">فلترة ألوان الشعار الثانوي</label>
                        <div className="grid grid-cols-2 gap-2 bg-background_primary border border-border_default rounded-xl p-1">
                          {(['false', 'true'] as const).map(gs => {
                            const label = gs === 'false' ? 'ملون' : 'أبيض وأسود';
                            const active = tempLogoSettings.secondary_logo_grayscale === gs;
                            return (
                              <button
                                type="button"
                                key={gs}
                                onClick={() => setTempLogoSettings(prev => ({ ...prev, secondary_logo_grayscale: gs }))}
                                className={`py-2 text-xs font-black rounded-lg transition-all text-center cursor-pointer ${
                                  active ? 'bg-primary_blue text-white shadow-md' : 'text-text_secondary hover:bg-white/5'
                                }`}
                              >
                                {label}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Size slider */}
                      <div className="space-y-2">
                        <div className="flex justify-between items-center text-sm font-black text-text_primary">
                          <span>حجم الشعار الثانوي</span>
                          <span className="font-mono text-primary_blue">{tempLogoSettings.secondary_logo_size}px</span>
                        </div>
                        <input
                          type="range"
                          min="40"
                          max="800"
                          value={tempLogoSettings.secondary_logo_size}
                          onChange={(e) => setTempLogoSettings(prev => ({ ...prev, secondary_logo_size: e.target.value }))}
                          className="w-full h-1 bg-background_primary border border-border_default rounded-lg appearance-none cursor-pointer accent-primary_blue outline-none"
                        />
                      </div>

                      {/* Opacity slider */}
                      <div className="space-y-2">
                        <div className="flex justify-between items-center text-sm font-black text-text_primary">
                          <span>شفافية الشعار الثانوي</span>
                          <span className="font-mono text-primary_blue">{tempLogoSettings.secondary_logo_opacity}%</span>
                        </div>
                        <input
                          type="range"
                          min="10"
                          max="100"
                          value={tempLogoSettings.secondary_logo_opacity}
                          onChange={(e) => setTempLogoSettings(prev => ({ ...prev, secondary_logo_opacity: e.target.value }))}
                          className="w-full h-1 bg-background_primary border border-border_default rounded-lg appearance-none cursor-pointer accent-primary_blue outline-none"
                        />
                      </div>

                      {/* Reset Coordinates */}
                      <div className="pt-4 border-t border-border_default/30 flex items-center justify-between gap-3">
                        <div className="text-right">
                          <span className="text-xs font-bold text-text_muted block">إحداثيات إزاحة الشعار الثانوي</span>
                          <span className="text-xs font-black font-numbers text-text_secondary">X: {tempLogoSettings.secondary_logo_x}px | Y: {tempLogoSettings.secondary_logo_y}px</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setTempLogoSettings(prev => ({ ...prev, secondary_logo_x: '0', secondary_logo_y: '0' }))}
                          className="px-4 py-2 bg-background_primary border border-border_default text-text_secondary hover:text-text_primary rounded-xl font-bold text-xs transition-all cursor-pointer flex items-center gap-1.5 active:scale-95"
                        >
                          إعادة تعيين الموضع
                        </button>
                      </div>
                    </>
                  )}
                </div>

                {/* Save and Cancel Footer inside Sidebar */}
                <div className="pt-6 border-t border-border_default/30 space-y-3 mt-6">
                  <button
                    type="button"
                    onClick={async () => {
                      const updatedSettings = {
                        ...settings,
                        ...tempLogoSettings
                      };
                      setSettings(updatedSettings);
                      
                      setSaving(true);
                      try {
                        const payload = {
                          ...updatedSettings,
                          auto_print: String(updatedSettings.auto_print),
                          company_rc_enabled: String(updatedSettings.company_rc_enabled),
                          company_nif_enabled: String(updatedSettings.company_nif_enabled),
                          company_nis_enabled: String(updatedSettings.company_nis_enabled),
                          company_art_enabled: String(updatedSettings.company_art_enabled),
                          company_cb_enabled: String(updatedSettings.company_cb_enabled),
                          logo_size: String(updatedSettings.logo_size),
                          logo_shape: String(updatedSettings.logo_shape),
                          logo_opacity: String(updatedSettings.logo_opacity),
                          logo_grayscale: String(updatedSettings.logo_grayscale),
                          logo_position: String(updatedSettings.logo_position),
                          logo_x: String(updatedSettings.logo_x),
                          logo_y: String(updatedSettings.logo_y),
                          secondary_logo: String(updatedSettings.secondary_logo || ''),
                          secondary_logo_size: String(updatedSettings.secondary_logo_size || '80'),
                          secondary_logo_shape: String(updatedSettings.secondary_logo_shape || 'circle'),
                          secondary_logo_opacity: String(updatedSettings.secondary_logo_opacity || '100'),
                          secondary_logo_grayscale: String(updatedSettings.secondary_logo_grayscale || 'false'),
                          secondary_logo_x: String(updatedSettings.secondary_logo_x || '0'),
                          secondary_logo_y: String(updatedSettings.secondary_logo_y || '0')
                        };
                        const res = await window.electronAPI.invoke('db:settings:update', payload);
                        if (res.success) {
                          showSuccess('تم حفظ موضع وتصميم الشعار بنجاح.');
                          setShowLogoCustomizer(false);
                        } else {
                          showError(res.error);
                        }
                      } catch (err) {
                        showError('حدث خطأ أثناء حفظ الإعدادات');
                      } finally {
                        setSaving(false);
                      }
                    }}
                    className="w-full py-3.5 bg-primary_blue hover:bg-primary_blue_hover text-white rounded-xl font-black text-sm transition-all shadow-md active:scale-98 cursor-pointer"
                  >
                    حفظ ومزامنة الشعار
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowLogoCustomizer(false)}
                    className="w-full py-3 bg-background_primary border border-border_default text-text_secondary hover:text-text_primary rounded-xl font-bold text-sm transition-all active:scale-98 cursor-pointer"
                  >
                    إلغاء والتراجع
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}

    </div>
  );
}

const MOCK_INVOICE = {
  invoice_number: '2026/0042',
  created_at: new Date().toISOString(),
  customer_name: 'أحمد بن محمد',
  customer_phone: '0550123456',
  items: [
    {
      id: 1,
      product_barcode_snapshot: '10293847',
      product_name_snapshot: 'مرشح زيت محرك (Oil Filter - Bosch)',
      quantity: 2,
      unit: 'قطعة',
      unit_price: 1200,
      item_discount_amount: 0,
      total: 2400
    },
    {
      id: 2,
      product_barcode_snapshot: '56473829',
      product_name_snapshot: 'زيت محرك توتال (Total Quartz 10W40 5L)',
      quantity: 1,
      unit: 'علبة',
      unit_price: 6500,
      item_discount_amount: 500,
      total: 6000
    },
    {
      id: 3,
      product_barcode_snapshot: '88776655',
      product_name_snapshot: 'شمعات إشعال (Spark Plugs NGK R)',
      quantity: 4,
      unit: 'قطعة',
      unit_price: 800,
      item_discount_amount: 0,
      total: 3200
    }
  ],
  total_amount: 12100,
  discount_amount: 500,
  final_amount: 11600,
  paid_amount: 11600,
  remaining_amount: 0,
  payment_method: 'نقدي',
  notes: 'ملاحظة: قطع الغيار أصلية ومضمونة لمسافة 5000 كلم.'
};
