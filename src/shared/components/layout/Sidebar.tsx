/**
 * Sidebar — SparePartsERP
 * بدون فروع، بدون logistics، بدون sync
 * بدون مرتجعات وصندوق (تم دمجهم في المصاريف وكشوف الحسابات)
 */
import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { showSuccess } from '../../utils/notifications';
import { useAuth } from '../../../hooks/useAuth';
import { useAuthStore } from '../../../store/auth.store';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Home, ShoppingCart, ShoppingBag, Package,
  Users, UserCheck, Landmark, Settings, LogOut,
  Wrench, Sun, Moon, AlertTriangle, KeyRound,
  Receipt, Brain
} from 'lucide-react';
import { useAppStore } from '../../../store/app.store';
import AccountModal from '../../../features/auth/AccountModal';
import { usePinStore } from '../../../store/pin.store';
import AdminAuthGate from '../ui/AdminAuthGate';
import { logoData } from '../../../features/auth/logoData';

interface NavItem {
  id: string;
  labelAr: string;
  labelFr: string;
  icon: React.ElementType;
  route?: string;
  permission?: string;
  position?: 'bottom';
}

const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', labelAr: 'لوحة التحكم', labelFr: 'Tableau de bord', icon: Home, route: '/dashboard' },
  { id: 'sales', labelAr: 'فواتير المبيعات', labelFr: 'Factures Ventes', icon: ShoppingCart, route: '/sales', permission: 'view_sales' },
  { id: 'purchases', labelAr: 'المشتريات', labelFr: 'Achats', icon: ShoppingBag, route: '/purchases', permission: 'view_purchases' },
  { id: 'inventory', labelAr: 'المخزون', labelFr: 'Stock', icon: Package, route: '/inventory', permission: 'view_inventory' },
  { id: 'low-stock', labelAr: 'مخزون منخفض', labelFr: 'Stock Faible', icon: AlertTriangle, route: '/low-stock', permission: 'view_inventory' },
  { id: 'customers', labelAr: 'الزبائن', labelFr: 'Clients', icon: Users, route: '/customers', permission: 'view_customers' },
  { id: 'suppliers', labelAr: 'الموردون', labelFr: 'Fournisseurs', icon: UserCheck, route: '/suppliers', permission: 'view_suppliers' },
  { id: 'expenses', labelAr: 'المصاريف', labelFr: 'Dépenses', icon: Receipt, route: '/expenses', permission: 'view_cashbox' },
  { id: 'consultant', labelAr: 'مستشار ذكي', labelFr: 'Consultant IA', icon: Brain, route: '/consultant' },
  { id: 'accounting', labelAr: 'المحاسبة المتقدمة', labelFr: 'Comptabilité', icon: Landmark, route: '/accounting', permission: 'view_reports' },
  { id: 'settings', labelAr: 'الإعدادات', labelFr: 'Paramètres', icon: Settings, route: '/settings', permission: 'view_settings' },
  { id: 'switch_user', labelAr: 'تبديل المستخدم', labelFr: 'Changer d\'utilisateur', icon: KeyRound, position: 'bottom' },
  { id: 'logout', labelAr: 'تسجيل الخروج', labelFr: 'Déconnexion', icon: LogOut, position: 'bottom' },
];

/* ── Custom Animated Navigation Item with macOS Dock Magnification & Tooltip Trigger ── */
interface SidebarNavItemProps {
  item: NavItem;
  isActive: boolean;
  isHovered: boolean;
  lang: 'ar' | 'fr';
  onClick: () => void;
  index: number;
  hoveredIndex: number | null;
  setHoveredIndex: (idx: number | null) => void;
  onShowTooltip: (label: string, top: number) => void;
  onHideTooltip: () => void;
}

function SidebarNavItem({
  item,
  isActive,
  isHovered,
  lang,
  onClick,
  index,
  hoveredIndex,
  setHoveredIndex,
  onShowTooltip,
  onHideTooltip
}: SidebarNavItemProps) {
  const Icon = item.icon;
  const label = lang === 'ar' ? item.labelAr : item.labelFr;
  const springTransition = { type: 'spring', stiffness: 380, damping: 20 } as const;

  // macOS Dock proximity magnification calculation
  let scale = 1;
  let y = 0;
  if (!isHovered && hoveredIndex !== null) {
    const dist = Math.abs(hoveredIndex - index);
    if (dist === 0) {
      scale = 1.35;
      y = -4; // Lift slightly more for organic dock feeling
    } else if (dist === 1) {
      scale = 1.16;
      y = -2;
    } else if (dist === 2) {
      scale = 1.05;
      y = -0.5;
    }
  }

  const handleMouseEnter = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!isHovered) {
      setHoveredIndex(index);
      const rect = e.currentTarget.getBoundingClientRect();
      const parentRect = e.currentTarget.closest('.sidebar')?.getBoundingClientRect();
      if (rect && parentRect) {
        const top = rect.top - parentRect.top + rect.height / 2;
        onShowTooltip(label, top);
      }
    }
  };

  const handleMouseLeave = () => {
    if (!isHovered) {
      setHoveredIndex(null);
    }
    onHideTooltip();
  };

  return (
    <div className="relative w-full">
      <motion.button
        onClick={onClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        animate={!isHovered ? { scale, y } : { scale: 1, y: 0 }}
        whileHover={isHovered ? { x: lang === 'ar' ? -5 : 5 } : undefined}
        transition={springTransition}
        className={`
          group relative flex items-center rounded-xl px-3 py-3 text-sm font-bold
          transition-all duration-300 w-full cursor-pointer select-none border border-transparent
          ${isHovered ? 'justify-start' : 'justify-center'}
          ${isActive
            ? isHovered 
              ? 'text-primary_blue shadow-[0_0_15px_rgba(59,130,246,0.15)] border border-primary_blue/20 bg-primary_blue/5' 
              : 'bg-gradient-to-b from-primary_blue/20 to-primary_blue/5 text-primary_blue shadow-[0_0_15px_rgba(59,130,246,0.3)] border border-primary_blue/20 group-hover:shadow-[0_0_20px_rgba(37,99,235,0.4)] group-hover:border-primary_blue/40'
            : item.id === 'logout'
              ? 'text-danger_red/70 hover:bg-danger_red/10 hover:text-danger_red hover:shadow-[0_0_15px_rgba(239,68,68,0.2)] hover:border-danger_red/30'
              : 'text-text_secondary hover:bg-background_card_hover hover:text-text_primary hover:shadow-[0_0_15px_rgba(37,99,235,0.25)] hover:border-primary_blue/30'
          }
          active:scale-95 active:duration-75
        `}
      >
        {/* Sliding active background indicator - only when expanded */}
        {isActive && isHovered && (
          <motion.div
            layoutId="activeIndicatorBackground"
            className="absolute inset-0 rounded-xl bg-gradient-to-b from-primary_blue/25 to-primary_blue/5 border border-primary_blue/20 shadow-[0_0_15px_rgba(59,130,246,0.2)] z-0"
            transition={springTransition}
          />
        )}

        {/* Sliding active line indicator - only when expanded */}
        {isActive && isHovered && (
          <motion.div
            layoutId="activeIndicatorLine"
            className={`absolute inset-y-3.5 ${lang === 'ar' ? 'right-0 rounded-l-full' : 'left-0 rounded-r-full'} w-1 bg-primary_blue shadow-[0_0_8px_rgba(59,130,246,0.8)] z-10`}
            transition={springTransition}
          />
        )}

        {/* Apple macOS style small glowing dot at the bottom of the button when collapsed and active */}
        {!isHovered && isActive && (
          <motion.div
            layoutId="activeIndicatorDot"
            className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-primary_blue shadow-[0_0_8px_rgba(59,130,246,0.85)] z-10"
            transition={springTransition}
          />
        )}

        <div className={`flex items-center justify-center min-w-[24px] z-10 transition-all duration-300 ${isActive ? 'text-primary_blue' : 'text-text_muted group-hover:text-primary_blue'} group-hover:scale-110 group-hover:rotate-[8deg]`}>
          <Icon size={22} />
        </div>

        <span
          className={`font-semibold whitespace-nowrap text-start overflow-hidden flex-1 z-10 transition-all duration-300 ease-in-out ${isHovered ? 'opacity-100 max-w-[200px] ml-3 mr-3' : 'opacity-0 max-w-0 ml-0 mr-0'}`}
        >
          {label}
        </span>
      </motion.button>
    </div>
  );
}

/* ── Custom Animated Theme Toggle with Tooltip Trigger ── */
interface SidebarThemeToggleProps {
  theme: 'dark' | 'light';
  toggleTheme: () => void;
  isHovered: boolean;
  lang: 'ar' | 'fr';
  index: number;
  hoveredIndex: number | null;
  setHoveredIndex: (idx: number | null) => void;
  onShowTooltip: (label: string, top: number) => void;
  onHideTooltip: () => void;
}

function SidebarThemeToggle({
  theme,
  toggleTheme,
  isHovered,
  lang,
  index,
  hoveredIndex,
  setHoveredIndex,
  onShowTooltip,
  onHideTooltip
}: SidebarThemeToggleProps) {
  const label = theme === 'dark' 
    ? (lang === 'ar' ? 'الوضع الفاتح' : 'Mode Clair') 
    : (lang === 'ar' ? 'الوضع الداكن' : 'Mode Sombre');
  const springTransition = { type: 'spring', stiffness: 380, damping: 20 } as const;

  // macOS Dock proximity magnification calculation
  let scale = 1;
  let y = 0;
  if (!isHovered && hoveredIndex !== null) {
    const dist = Math.abs(hoveredIndex - index);
    if (dist === 0) {
      scale = 1.35;
      y = -4;
    } else if (dist === 1) {
      scale = 1.16;
      y = -2;
    } else if (dist === 2) {
      scale = 1.05;
      y = -0.5;
    }
  }

  const handleMouseEnter = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!isHovered) {
      setHoveredIndex(index);
      const rect = e.currentTarget.getBoundingClientRect();
      const parentRect = e.currentTarget.closest('.sidebar')?.getBoundingClientRect();
      if (rect && parentRect) {
        const top = rect.top - parentRect.top + rect.height / 2;
        onShowTooltip(label, top);
      }
    }
  };

  const handleMouseLeave = () => {
    if (!isHovered) {
      setHoveredIndex(null);
    }
    onHideTooltip();
  };

  return (
    <div className="relative w-full">
      <motion.button
        onClick={toggleTheme}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        animate={!isHovered ? { scale, y } : { scale: 1, y: 0 }}
        whileHover={isHovered ? { x: lang === 'ar' ? -5 : 5 } : undefined}
        transition={springTransition}
        className={`flex items-center w-full px-3 py-3 rounded-xl transition-all duration-300 group bg-background_secondary hover:bg-background_card_hover text-text_primary cursor-pointer border border-border_default hover:border-primary_blue/30 hover:shadow-[0_0_15px_rgba(37,99,235,0.25)] select-none ${isHovered ? 'justify-start' : 'justify-center'} active:scale-95 active:duration-75`}
      >
        <div className="shrink-0 flex items-center justify-center relative min-w-[24px] transition-transform duration-300 group-hover:scale-110 group-hover:rotate-[15deg]">
          {theme === 'dark' ? <Sun size={20} className="text-warning_amber animate-pulse" /> : <Moon size={20} className="text-primary_blue" />}
        </div>
        <div
          className={`flex-1 whitespace-nowrap overflow-hidden text-sm font-semibold transition-all duration-300 ease-in-out text-start ${
            isHovered ? 'opacity-100 max-w-[200px] mx-3' : 'opacity-0 max-w-0 mx-0'
          }`}
        >
          {label}
        </div>
      </motion.button>
    </div>
  );
}

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t, i18n } = useTranslation();
  const { user, logout, hasPermission } = useAuth();
  const { theme, toggleTheme, direction, sidebarCollapsed, enableSidebarHover } = useAppStore();
  const lang = i18n.language as 'ar' | 'fr';

  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [isSidebarHovered, setIsSidebarHovered] = useState(false);
  const [activeTooltip, setActiveTooltip] = useState<{ label: string; top: number } | null>(null);
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const [isAdminGateOpen, setIsAdminGateOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 1024);

  useEffect(() => {
    const handleResize = () => {
      setIsDesktop(window.innerWidth >= 1024);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const { hasSecurityAlert, resetFailedAttempts, setSecurityAlert } = usePinStore();

  const isOpen = !sidebarCollapsed;
  const isInvoicePage = location.pathname.startsWith('/pos') || 
                        location.pathname.startsWith('/purchases/new') || 
                        (location.pathname.startsWith('/purchases/') && location.pathname !== '/purchases');
  const isExpanded = !isInvoicePage && (isDesktop ? (enableSidebarHover && isSidebarHovered) : isOpen);

  const collapsedWidthClass = 'lg:w-[64px]';
  const logoContainerClass = isExpanded
    ? 'w-16 h-16 translate-x-0 border-primary_blue/30'
    : 'w-16 h-16 translate-x-0 shadow-lg shadow-primary_blue/20 border-2 border-primary_blue/40';

  const filteredItems = NAV_ITEMS.filter((item) => {
    if (!user) return false;
    if (item.permission && !hasPermission(item.permission)) return false;
    return true;
  });

  const topItems = filteredItems.filter((i) => i.position !== 'bottom');
  const bottomItems = filteredItems.filter((i) => i.position === 'bottom');

  const handleClick = (item: NavItem) => {
    if (item.id === 'logout') {
      logout();
      navigate('/login');
      return;
    }
    if (item.id === 'switch_user') {
      useAuthStore.getState().setShowSwitchOverlay(true);
      return;
    }
    if (item.route) navigate(item.route);
  };

  const handleShowTooltip = (label: string, top: number) => {
    setActiveTooltip({ label, top });
  };

  const handleHideTooltip = () => {
    setActiveTooltip(null);
  };

  const renderItem = (item: NavItem, idx: number, baseIndex: number) => {
    const isActive = item.route ? location.pathname.startsWith(item.route) : false;
    return (
      <SidebarNavItem
        key={item.id}
        item={item}
        isActive={isActive}
        isHovered={isExpanded}
        lang={lang}
        onClick={() => handleClick(item)}
        index={baseIndex + idx}
        hoveredIndex={hoveredIndex}
        setHoveredIndex={setHoveredIndex}
        onShowTooltip={handleShowTooltip}
        onHideTooltip={handleHideTooltip}
      />
    );
  };

  return (
    <aside
      onMouseEnter={() => setIsSidebarHovered(true)}
      onMouseLeave={() => {
        setIsSidebarHovered(false);
        setHoveredIndex(null);
        setActiveTooltip(null);
      }}
      className={`sidebar flex h-full flex-col bg-white/40 backdrop-blur-xl dark:bg-black/40 dark:backdrop-blur-xl py-6 z-50 relative transition-all duration-500 ease-in-out ltr:border-r rtl:border-l select-none overflow-visible ltr:border-black/[0.08] rtl:border-black/[0.08] dark:ltr:border-white/[0.07] dark:rtl:border-white/[0.07] shadow-[4px_0_20px_rgba(0,0,0,0.04)] rtl:shadow-[-4px_0_20px_rgba(0,0,0,0.04)] dark:shadow-[2px_0_24px_rgba(0,0,0,0.45)] ${
        isExpanded ? 'w-[280px]' : `w-0 ${collapsedWidthClass} overflow-hidden lg:overflow-visible`
      }`}
    >
      {/* Logo as Profile Trigger */}
      <div className={`mb-8 flex items-center h-24 overflow-visible w-full ${isExpanded ? 'px-3 justify-start' : 'px-0 justify-center'}`}>
        <div
          onClick={() => setIsAccountOpen(true)}
          className={`flex items-center gap-3 cursor-pointer group select-none w-full ${isExpanded ? 'justify-start' : 'justify-center'}`}
        >
          {logoData ? (
            <div
              className={`rounded-full bg-white dark:bg-background_secondary p-0.5 border dark:border-border_default shadow-md shrink-0 relative overflow-hidden transition-all duration-500 ease-in-out group-hover:scale-[1.12] group-hover:-translate-y-1 group-hover:rotate-[6deg] group-hover:shadow-[0_8px_25px_rgba(37,99,235,0.4)] group-hover:border-primary_blue group-active:scale-[0.94] group-active:translate-y-0 group-active:rotate-0 ${logoContainerClass}`}
            >
              <img 
                src={logoData} 
                alt="Logo" 
                className="w-full h-full object-contain rounded-full scale-[1.35] transition-transform duration-500 group-hover:scale-[1.42]" 
              />
            </div>
          ) : (
            <div
              className={`rounded-xl bg-gradient-to-br from-primary_blue to-blue-800 flex items-center justify-center shadow-glow-blue shrink-0 relative overflow-hidden transition-all duration-500 ease-in-out group-hover:scale-[1.12] group-hover:-translate-y-1 group-hover:rotate-[8deg] group-hover:shadow-[0_8px_25px_rgba(37,99,235,0.5)] group-active:scale-[0.94] group-active:translate-y-0 group-active:rotate-0 ${logoContainerClass}`}
            >
              {/* Subtle glass reflection sheen on hover */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
              <Wrench className="text-text_primary transition-all duration-500 w-8 h-8 group-hover:rotate-[45deg]" />
            </div>
          )}
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0, x: lang === 'ar' ? 20 : -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex flex-col whitespace-nowrap overflow-hidden"
            >
              <h1 className="text-sm md:text-base font-black text-text_primary leading-tight group-hover:text-primary_blue transition-colors">{t('app_name')}</h1>
              <span className="text-[10px] text-text_muted uppercase tracking-widest">معلومات حسابي</span>
            </motion.div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className={`flex flex-1 flex-col gap-1.5 px-3 overflow-y-auto custom-scrollbar ${isExpanded ? 'overflow-x-hidden' : 'overflow-x-visible'}`}>
        {topItems.map((item, idx) => renderItem(item, idx, 0))}
      </nav>

      {/* Bottom */}
      <div className={`mt-auto px-3 pt-6 border-t border-border_default flex flex-col gap-1.5 ${isExpanded ? 'overflow-x-hidden' : 'overflow-x-visible'}`}>
        
        {/* Glowing Pulsing Red Security Alert */}
        {hasSecurityAlert && (
          <motion.div
            animate={{ scale: [1, 1.02, 1] }}
            transition={{ repeat: Infinity, duration: 1.8 }}
            onClick={() => setIsAdminGateOpen(true)}
            className={`w-full flex items-center gap-2.5 px-3 py-3 rounded-xl border border-red-500/20 bg-red-500/10 dark:bg-red-500/15 text-red-500 shadow-[0_0_15px_rgba(239,68,68,0.3)] dark:shadow-[0_0_20px_rgba(239,68,68,0.2)] hover:bg-red-500/20 transition-all cursor-pointer select-none mb-1 ${isExpanded ? 'justify-start' : 'justify-center'}`}
          >
            <AlertTriangle className="w-5 h-5 shrink-0 text-red-500 animate-pulse" />
            {isExpanded && (
              <div className="flex flex-col text-right overflow-hidden whitespace-nowrap">
                <span className="text-xs font-black">تهديد أمني نشط!</span>
                <span className="text-[10px] text-red-600 dark:text-red-400 font-bold">انقر لفك قفل النظام</span>
              </div>
            )}
          </motion.div>
        )}

        {/* Theme Toggle */}
        <SidebarThemeToggle
          theme={theme}
          toggleTheme={toggleTheme}
          isHovered={isExpanded}
          lang={lang}
          index={topItems.length}
          hoveredIndex={hoveredIndex}
          setHoveredIndex={setHoveredIndex}
          onShowTooltip={handleShowTooltip}
          onHideTooltip={handleHideTooltip}
        />

        {bottomItems.map((item, idx) => renderItem(item, idx, topItems.length + 1))}
      </div>

      {/* Floating Apple-style Tooltip when collapsed */}
      <AnimatePresence>
        {activeTooltip && (
          <motion.div
            initial={{ opacity: 0, x: lang === 'ar' ? -20 : 20, scale: 0.8 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: lang === 'ar' ? -15 : 15, scale: 0.8 }}
            transition={{ type: 'spring', stiffness: 450, damping: 20 }}
            style={{ top: activeTooltip.top }}
            className={`absolute -translate-y-1/2 z-[100] ${
              lang === 'ar' ? 'right-full mr-4' : 'left-full ml-4'
            } pointer-events-none whitespace-nowrap font-cairo`}
          >
            <div className="relative px-4 py-2 rounded-xl bg-black/75 dark:bg-black/90 backdrop-blur-xl border border-white/10 dark:border-white/5 shadow-[0_12px_40px_rgba(0,0,0,0.4)] flex items-center justify-center">
              <span className="text-white text-xs font-bold font-cairo select-none">{activeTooltip.label}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Account Modal — centered, clean */}
      <AccountModal isOpen={isAccountOpen} onClose={() => setIsAccountOpen(false)} />
      
      {/* Admin Authentication Gate Modal */}
      <AdminAuthGate
        isOpen={isAdminGateOpen}
        onClose={() => setIsAdminGateOpen(false)}
        onSuccess={() => {
          resetFailedAttempts();
          setSecurityAlert(false);
          showSuccess('تم إلغاء التنبيه الأمني بنجاح وإعادة تشغيل النظام لطبيعته');
        }}
        title="تأكيد هوية المالك لإلغاء الإنذار"
        description="هذا التنبيه الأمني عالي الخطورة يتطلب مصادقة كلمة المرور الرئيسية لمدير النظام لتفويضه وإلغائه."
      />
    </aside>
  );
}
