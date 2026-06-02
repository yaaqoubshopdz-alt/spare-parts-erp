import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Menu, Minus, Square, X, Clock, LayoutDashboard, ShoppingCart, ShoppingBag, Package, Users, Truck, Receipt, BookOpen, Settings, CreditCard, AlertTriangle, AlignRight, AlignLeft } from 'lucide-react';
import { useAppStore } from '../../../store/app.store';
import { useAuthStore } from '../../../store/auth.store';

/** Mapping المسارات → عنوان + شرح + أيقونة */
const ROUTE_META: Record<string, { title: string; subtitle: string; icon: React.ReactNode }> = {
  '/':            { title: 'لوحة القيادة',     subtitle: 'نظرة عامة على أداء النظام', icon: <LayoutDashboard size={22} /> },
  '/dashboard':   { title: 'لوحة القيادة',     subtitle: 'نظرة عامة على أداء النظام', icon: <LayoutDashboard size={22} /> },
  '/pos':         { title: 'نقطة البيع',        subtitle: 'إصدار فواتير البيع السريعة', icon: <CreditCard size={22} /> },
  '/sales':       { title: 'المبيعات',          subtitle: 'إدارة فواتير البيع والوصولات', icon: <ShoppingCart size={22} /> },
  '/purchases':   { title: 'المشتريات',         subtitle: 'إدارة فواتير الموردين وإدخال السلع', icon: <ShoppingBag size={22} /> },
  '/inventory':   { title: 'المخزون',           subtitle: 'إدارة المنتجات والأسعار والكميات', icon: <Package size={22} /> },
  '/low-stock':   { title: 'إدارة المخزون المنخفض', subtitle: 'إعادة تموين المنتجات', icon: <AlertTriangle size={22} /> },
  '/customers':   { title: 'الزبائن',           subtitle: 'إدارة حسابات الزبائن والديون', icon: <Users size={22} /> },
  '/suppliers':   { title: 'الموردون',          subtitle: 'إدارة الموردين والمستحقات', icon: <Truck size={22} /> },
  '/expenses':    { title: 'المصاريف',         subtitle: 'إدارة المصروفات اليومية', icon: <Receipt size={22} /> },
  '/accounting':  { title: 'المحاسبة',          subtitle: 'التقارير المالية والمحاسبية', icon: <BookOpen size={22} /> },
  '/settings':    { title: 'الإعدادات',         subtitle: 'إعدادات النظام والمستخدمين', icon: <Settings size={22} /> },
};

function getRouteMeta(pathname: string) {
  // Try exact match first
  if (ROUTE_META[pathname]) return ROUTE_META[pathname];
  // Try parent path (e.g. /purchases/new → /purchases)
  const parent = '/' + pathname.split('/')[1];
  if (ROUTE_META[parent]) return ROUTE_META[parent];
  return null;
}

export default function TopBar() {
  const { i18n } = useTranslation();
  const { language, setLanguage } = useAppStore();
  const location = useLocation();
  const [now, setNow] = useState(new Date());

  const routeMeta = getRouteMeta(location.pathname);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const toggleLanguage = () => {
    const nextLang = language === 'ar' ? 'fr' : 'ar';
    setLanguage(nextLang);
    i18n.changeLanguage(nextLang);
    document.dir = nextLang === 'ar' ? 'rtl' : 'ltr';
  };

  const minimize = () => window.electronAPI?.invoke('window:minimize');
  const maximize = () => window.electronAPI?.invoke('window:maximize');
  const close = () => window.electronAPI?.invoke('window:close');

  return (
    <header className="relative titlebar-drag flex h-10 items-center border-b border-border_default/20 bg-topbar_bg backdrop-blur-md px-4" dir="ltr">
      {/* Window Controls - ALWAYS LTR on the far left */}
      <div className="titlebar-no-drag flex items-center gap-1">
        <button onClick={minimize} className="w-8 h-8 flex items-center justify-center rounded-lg text-text_muted hover:bg-background_card_hover hover:text-text_primary transition-colors">
          <Minus size={14} />
        </button>
        <button onClick={maximize} className="w-8 h-8 flex items-center justify-center rounded-lg text-text_muted hover:bg-background_card_hover hover:text-text_primary transition-colors">
          <Square size={12} />
        </button>
        <button onClick={close} className="w-8 h-8 flex items-center justify-center rounded-lg text-text_muted hover:bg-danger_red hover:text-white transition-colors">
          <X size={14} />
        </button>
      </div>

      {/* Menu Button for Mobile (lg:hidden) */}
      {!(location.pathname.startsWith('/pos') || location.pathname.startsWith('/purchases/new') || (location.pathname.startsWith('/purchases/') && location.pathname !== '/purchases')) && (
        <button
          onClick={() => useAppStore.getState().toggleSidebar()}
          className="titlebar-no-drag lg:hidden w-8 h-8 flex items-center justify-center rounded-lg text-text_muted hover:bg-background_card_hover hover:text-text_primary transition-colors cursor-pointer ml-1.5"
          title="القائمة"
        >
          <Menu size={18} />
        </button>
      )}

      <div className="h-4 w-[1px] bg-border_default/30 mx-3 shrink-0" />

      {/* Centered Page Title (RTL/LTR unified) */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 titlebar-no-drag flex items-center gap-2 select-none pointer-events-none" dir={language === 'ar' ? 'rtl' : 'ltr'}>
        {routeMeta ? (
          <>
            <span className="text-primary_blue/80 shrink-0">{routeMeta.icon}</span>
            <div className="flex items-center gap-2.5 min-w-0">
              <h1 className="text-sm md:text-base font-black text-text_primary truncate tracking-tight">{routeMeta.title}</h1>
              <span className="hidden md:inline text-[10px] font-bold text-text_muted/60 truncate max-w-[200px] mt-0.5">{routeMeta.subtitle}</span>
            </div>
          </>
        ) : (
          <h1 className="text-sm md:text-base font-black text-text_primary">YK MS DZ</h1>
        )}
      </div>

      {language === 'ar' ? (
        // RTL Mode Layout
        <>
          {/* DateTime & Switcher aligned next to Separator */}
          <div className="titlebar-no-drag flex items-center gap-3">
            {/* Layout direction toggle button */}
            <button
              onClick={toggleLanguage}
              className="group flex items-center gap-2 px-3 py-1.5 rounded-xl bg-background_card border border-border_default hover:border-primary_blue/30 hover:bg-primary_blue/5 transition-all select-none shadow-sm outline-none"
              title="تغيير اتجاه التطبيق إلى اليسار (Français)"
            >
              <AlignRight size={14} className="text-text_muted group-hover:text-primary_blue transition-colors" />
              <span className="text-xs font-bold text-text_secondary group-hover:text-primary_blue transition-colors">
                العربية
              </span>
            </button>

            {/* DateTime */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-background_card border border-border_default text-text_primary font-numbers text-xs font-bold select-none transition-colors">
              <Clock size={12} className="text-primary_blue animate-pulse shrink-0" />
              <span>{now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
            </div>

            {/* Switch User Button */}
            <button
              onClick={() => useAuthStore.getState().setShowSwitchOverlay(true)}
              className="group flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-background_card border border-border_default hover:border-primary_blue/30 hover:bg-primary_blue/5 transition-all select-none shadow-sm outline-none cursor-pointer"
              title="تبديل الموظف"
            >
              <Users size={14} className="text-text_muted group-hover:text-primary_blue transition-colors" />
              <span className="text-xs font-bold text-text_secondary group-hover:text-primary_blue transition-colors">
                تبديل
              </span>
            </button>
          </div>

          {/* Spacer */}
          <div className="flex-1" />
        </>
      ) : (
        // LTR Mode Layout
        <>
          {/* Spacer */}
          <div className="flex-1" />

          {/* DateTime & Switcher on the far right */}
          <div className="titlebar-no-drag flex items-center gap-3">
            {/* DateTime */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-background_card border border-border_default text-text_primary font-numbers text-xs font-bold select-none transition-colors">
              <Clock size={12} className="text-primary_blue animate-pulse shrink-0" />
              <span>{now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
            </div>

            {/* Switch User Button */}
            <button
              onClick={() => useAuthStore.getState().setShowSwitchOverlay(true)}
              className="group flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-background_card border border-border_default hover:border-primary_blue/30 hover:bg-primary_blue/5 transition-all select-none shadow-sm outline-none cursor-pointer"
              title="Changer d'utilisateur"
            >
              <Users size={14} className="text-text_muted group-hover:text-primary_blue transition-colors" />
              <span className="text-xs font-bold text-text_secondary group-hover:text-primary_blue transition-colors">
                Switch
              </span>
            </button>

            {/* Layout direction toggle button */}
            <button
              onClick={toggleLanguage}
              className="group flex items-center gap-2 px-3 py-1.5 rounded-xl bg-background_card border border-border_default hover:border-primary_blue/30 hover:bg-primary_blue/5 transition-all select-none shadow-sm outline-none"
              title="تغيير اتجاه التطبيق إلى اليمين (العربية)"
            >
              <AlignLeft size={14} className="text-text_muted group-hover:text-primary_blue transition-colors" />
              <span className="text-xs font-bold text-text_secondary group-hover:text-primary_blue transition-colors">
                Français
              </span>
            </button>
          </div>
        </>
      )}
    </header>
  );
}
