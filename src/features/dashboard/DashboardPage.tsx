/**
 * DashboardPage — لوحة التحكم ببيانات حقيقية
 */
import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { useShortcutStore } from '../../store/shortcutStore';
import {
  ShoppingCart, AlertTriangle, Clock, Truck, CalendarClock, Bell, BellRing, ShoppingBag, FileText, X, TrendingUp, Coins, Brain, RefreshCw, Zap, Settings, ChevronLeft, ChevronUp, ChevronDown
} from 'lucide-react';

import { motion, AnimatePresence } from 'framer-motion';
import { showNav, showSuccess, showError } from '../../shared/utils/notifications';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';

interface DashboardData {
  todaySalesCount: number;
  todaySalesTotal: number;
  todayPurchasesCount: number;
  todayPurchasesTotal: number;
  totalProducts: number;
  lowStockCount: number;
  expiringBatchesCount: number;
  customersDebtCount: number;
  customersDebtTotal: number;
  supplierDebtTotal: number;
  cashBalance: number;
  todayProfit: number;
}

interface LowStockItem {
  id: number; name: string; barcode: string;
  min_stock_level: number; current_stock: number;
  category_name: string;
}

interface TodayInvoice {
  id: number; invoice_number: string; sale_type: string;
  total: number; status: string; time: string; customer_name: string;
  paid: number; remaining_amount: number;
}

function formatCurrency(val: number): string {
  return val.toFixed(2) + ' د.ج';
}

function getRelativeDateHeader(dateStr: string): string {
  if (!dateStr) return 'تاريخ غير معروف';
  const todayStr = new Date().toISOString().split('T')[0];
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  if (dateStr === todayStr) {
    return 'اليوم';
  } else if (dateStr === yesterdayStr) {
    return 'البارحة';
  } else {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('ar-DZ', { day: 'numeric', month: 'long', year: 'numeric' });
    } catch (e) {
      return dateStr;
    }
  }
}

// Colors palette for chart areas
const CATEGORY_COLORS = [
  '#3b82f6', '#f59e0b', '#ef4444', '#10b981', '#8b5cf6',
  '#ec4899', '#06b6d4', '#f97316', '#14b8a6', '#6366f1',
];

function getPaymentColor(inv: TodayInvoice): string {
  const paid = inv.paid || 0;
  if (paid >= inv.total) return 'text-emerald-500';
  if (paid > 0) return 'text-amber-500';
  return 'text-orange-500';
}

function getPaymentLabel(inv: TodayInvoice): string {
  const paid = inv.paid || 0;
  if (paid >= inv.total) return 'مدفوع';
  if (paid > 0) return 'متبقي';
  return 'غير مدفوع';
}

export default function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { shortcuts } = useShortcutStore();
  const [data, setData] = useState<DashboardData | null>(null);
  const [lowStock, setLowStock] = useState<LowStockItem[]>([]);
  const [todayInvoices, setTodayInvoices] = useState<TodayInvoice[]>([]);
  const [loading, setLoading] = useState(true);

  // Notification Bell State
  const [recentLowStock, setRecentLowStock] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  // Recent Drafts State (notification dropdown — all drafts)
  const [recentDrafts, setRecentDrafts] = useState<any[]>([]);

  // AI Consultant States
  const [aiAnalysis, setAiAnalysis] = useState<any | null>(null);
  const [aiConfig, setAiConfig] = useState<any | null>(null);
  const [aiLoading, setAiLoading] = useState<boolean>(false);
  const [expandedRecId, setExpandedRecId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'consultant' | 'lowStock'>('consultant');


  useEffect(() => {
    loadDashboard();
    loadRecentLowStock();
    // Refresh every 60 seconds
    const interval = setInterval(loadRecentLowStock, 60000);
    return () => clearInterval(interval);
  }, []);

  // Close notification dropdown on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);  // Auto-switch tabs every 15 seconds, resetting on activeTab change
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveTab((prev) => (prev === 'consultant' ? 'lowStock' : 'consultant'));
    }, 15000);
    return () => clearInterval(timer);
  }, [activeTab]);


  const loadDashboard = async () => {
    setLoading(true);
    try {
      const [summaryRes, lowStockRes, invoicesRes, aiAnalysisRes, aiConfigRes] = await Promise.all([
        window.electronAPI.invoke('db:dashboard:summary'),
        window.electronAPI.invoke('db:dashboard:lowStock'),
        window.electronAPI.invoke('db:dashboard:todayInvoices'),
        window.electronAPI.invoke('ai:getLastAnalysis'),
        window.electronAPI.invoke('ai:getConfig'),
      ]);
      if (summaryRes.success) setData(summaryRes.data);
      if (lowStockRes.success) setLowStock(lowStockRes.data);
      if (invoicesRes.success) setTodayInvoices(invoicesRes.data);
      if (aiAnalysisRes.success && aiAnalysisRes.data) setAiAnalysis(aiAnalysisRes.data);
      if (aiConfigRes.success && aiConfigRes.data) setAiConfig(aiConfigRes.data);
    } catch (err) {
      console.error('[Dashboard] Load error:', err);
    } finally {
      setLoading(false);
    }
    // Also load recent drafts for notification dropdown
    loadRecentDrafts();
  };

  const handleRunAnalysis = async () => {
    if (aiLoading) return;
    setAiLoading(true);
    try {
      const res = await window.electronAPI.invoke('ai:analyze');
      if (res.success && res.data) {
        setAiAnalysis(res.data);
        showSuccess('تم تحديث التوصيات الذكية بنجاح! 🧠');
      } else {
        showError(res.error || 'فشل تشغيل التحليل. تأكد من إعدادات الـ API Key.');
      }
    } catch (e: any) {
      showError(e.message);
    } finally {
      setAiLoading(false);
    }
  };

  const loadRecentDrafts = async () => {
    try {
      const res = await window.electronAPI.invoke('db:dashboard:recentDrafts');
      if (res.success) setRecentDrafts(res.data);
    } catch { /* silent */ }
  };

  const loadRecentLowStock = async () => {
    try {
      const res = await window.electronAPI.invoke('db:dashboard:getRecentLowStock');
      if (res.success) setRecentLowStock(res.data);
    } catch { /* silent */ }
  };

  // Chart click: navigate to Low Stock with category filter
  const handleChartClick = useCallback((data: any) => {
    if (data?.activePayload?.[0]?.payload?.name) {
      const category = encodeURIComponent(data.activePayload[0].payload.name);
      showNav(`منتجات ${data.activePayload[0].payload.name}`);
      navigate(`/low-stock?category=${category}`);
    }
  }, [navigate]);

  // Unified notification list: low stock + drafts, sorted by time (newest first)
  const mergedNotifications = useMemo(() => {
    const items: any[] = [];
    for (const item of recentLowStock) {
      items.push({
        ...item,
        _kind: 'low_stock',
        _sortTime: new Date(item.updated_at + 'Z').getTime(),
      });
    }
    for (const draft of recentDrafts) {
      const sortTime = Date.now() - (draft.hours_old * 3600000);
      items.push({
        ...draft,
        _kind: 'draft',
        _sortTime: sortTime,
      });
    }
    items.sort((a, b) => b._sortTime - a._sortTime);
    return items.slice(0, 30);
  }, [recentLowStock, recentDrafts]);

  const totalNotifications = mergedNotifications.length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-3 border-primary_blue/30 border-t-primary_blue rounded-full animate-spin" />
      </div>
    );
  }

  const today = new Date().toLocaleDateString('ar-DZ', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  // Group invoices by date
  const invoicesByDate: Record<string, TodayInvoice[]> = {};
  todayInvoices.forEach((inv) => {
    const dateKey = (inv as any).date || new Date().toISOString().split('T')[0];
    if (!invoicesByDate[dateKey]) {
      invoicesByDate[dateKey] = [];
    }
    invoicesByDate[dateKey].push(inv);
  });

  const sortedDates = Object.keys(invoicesByDate).sort((a, b) => b.localeCompare(a));

  // ── Build chart data: group low stock by category, compute fill % ──
  const categoryMap = new Map<string, { total: number; belowMin: number; items: LowStockItem[] }>();
  lowStock.forEach((item) => {
    const cat = item.category_name || 'بدون تصنيف';
    if (!categoryMap.has(cat)) {
      categoryMap.set(cat, { total: 0, belowMin: 0, items: [] });
    }
    const entry = categoryMap.get(cat)!;
    entry.total++;
    entry.belowMin++;
    entry.items.push(item);
  });

  const uniqueCategories = Array.from(categoryMap.keys());

  // Build chart data: each item is a point on the X axis, grouped by category
  const chartData = uniqueCategories.map((cat) => {
    const entry = categoryMap.get(cat)!;
    return {
      name: cat,
      count: entry.items.length,
    };
  });

  

  return (
    <div className="p-6 space-y-6 overflow-auto h-full custom-scrollbar flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-text_primary">
            مرحباً، {user?.full_name || 'المستخدم'} 👋
          </h1>
          <p className="text-text_secondary mt-1 flex items-center gap-2">
            <CalendarClock size={14} />
            {today} — الواجهة الرئيسية
          </p>
        </div>
        <style>{`
          @keyframes bell-shake {
            0%, 100% { transform: rotate(0deg); }
            15% { transform: rotate(18deg); }
            30% { transform: rotate(-12deg); }
            45% { transform: rotate(10deg); }
            60% { transform: rotate(-6deg); }
            75% { transform: rotate(4deg); }
            90% { transform: rotate(-2deg); }
          }
          .bell-animate {
            animation: bell-shake 0.6s ease-in-out;
            transform-origin: top center;
          }
        `}</style>
        <div className="flex items-center gap-3" ref={notifRef}>
          {/* Notification Bell — موسع مع نص + الرقم فوق الجرس + حركة */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className={`relative flex items-center gap-2.5 px-5 h-12 rounded-xl border-2 transition-all font-bold ${
                totalNotifications > 0
                  ? 'bg-warning_amber/15 text-warning_amber border-warning_amber/40 hover:bg-warning_amber/25 shadow-[0_0_12px_rgba(245,158,11,0.1)]'
                  : 'bg-background_card text-text_secondary hover:text-text_primary border-border_default hover:bg-background_card_hover'
              }`}
            >
              {totalNotifications > 0 ? (
                <BellRing size={22} className={`text-warning_amber ${showNotifications ? '' : 'bell-animate'}`} />
              ) : (
                <Bell size={22} />
              )}
              <span className="text-sm font-bold">إشعارات</span>
              {totalNotifications > 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-[16px] bg-danger_red text-white text-[9px] font-black rounded-full flex items-center justify-center shadow-[0_0_8px_rgba(239,68,68,0.6)] px-0.5 leading-none">
                  {totalNotifications > 99 ? '99' : totalNotifications}
                </span>
              )}
            </button>

            {/* Dropdown — إشعارات أنيقة مع تأثير زجاجي ودخول تدريجي */}
            <AnimatePresence>
              {showNotifications && (
                <motion.div
                  initial={{ opacity: 0, y: -28, scale: 0.93 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -18, scale: 0.95 }}
                  transition={{
                    type: 'spring', damping: 26, stiffness: 320,
                  }}
                  className="absolute left-0 top-full mt-3 w-[400px] bg-background_secondary/50 backdrop-blur-2xl border border-white/15 dark:border-white/10 rounded-2xl shadow-2xl shadow-black/20 dark:shadow-black/40 overflow-hidden z-50"
                  dir="rtl"
                >
                  {/* خط علوي متوهج */}
                  <motion.div
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ delay: 0.1, duration: 0.4, ease: 'easeOut' }}
                    className="h-[2px] bg-gradient-to-r from-transparent via-warning_amber/70 to-transparent origin-center"
                  />

                  {/* Header */}
                  <div className="p-4 border-b border-white/10 dark:border-white/10 flex items-center justify-between">
                    <motion.h4
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.12, type: 'spring', damping: 20, stiffness: 200 }}
                      className="font-bold text-text_primary text-sm flex items-center gap-2"
                    >
                      <Bell size={16} className="text-warning_amber" />
                      الإشعارات
                    </motion.h4>
                    <motion.span
                      initial={{ opacity: 0, scale: 0.5 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.18, type: 'spring', damping: 14, stiffness: 200 }}
                      className="text-[11px] text-text_muted font-bold"
                    >
                      {totalNotifications} جديد
                    </motion.span>
                  </div>

                  <div className="max-h-[360px] overflow-auto custom-scrollbar">
                    {/* ── قائمة مختلطة: ناقصة + مسودات حسب الوقت ── */}
                    {mergedNotifications.map((item: any, idx: number) => {
                      const row = item._kind === 'low_stock' ? (
                        <div
                          key={`low-${item.id}`}
                          className="flex items-center gap-3 p-3 hover:bg-white/10 dark:hover:bg-white/5 cursor-pointer border-b border-white/5 last:border-0 transition-all duration-200"
                          onClick={() => { setShowNotifications(false); showNav('المخزون المنخفض'); navigate(`/low-stock`); }}
                        >
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: 0.2 + idx * 0.04, type: 'spring', damping: 12, stiffness: 260 }}
                            className="w-9 h-9 rounded-xl bg-danger_red/15 flex items-center justify-center shrink-0"
                          >
                            <AlertTriangle size={16} className="text-danger_red" />
                          </motion.div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-text_primary truncate">{item.name}</p>
                            <p className="text-[11px] text-text_muted">
                              نقص: <span className="font-numbers font-bold text-danger_red">{item.shortage}</span> • {item.relativeTime}
                            </p>
                          </div>
                          <button
                            onClick={(e) => { e.stopPropagation(); setShowNotifications(false); showNav('تموين منتج'); navigate(`/purchases/new?productId=${item.id}`); }}
                            className="p-1.5 bg-primary_blue/10 text-primary_blue hover:bg-primary_blue/25 rounded-lg transition-all shrink-0 hover:scale-110 active:scale-95"
                            title="تموين"
                          >
                            <ShoppingBag size={16} />
                          </button>
                        </div>
                      ) : (
                        <div
                          key={`draft-${item.type}-${item.id}`}
                          className="flex items-center gap-3 p-3 hover:bg-white/10 dark:hover:bg-white/5 cursor-pointer border-b border-white/5 last:border-0 transition-all duration-200"
                          onClick={() => {
                            setShowNotifications(false);
                            if (item.type === 'sales') { showNav('فتح مسودة بيع'); navigate(`/pos?invoiceId=${item.id}`); }
                            else { showNav('فتح مسودة شراء'); navigate(`/purchases/${item.id}`); }
                          }}
                        >
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: 0.2 + idx * 0.04, type: 'spring', damping: 12, stiffness: 260 }}
                            className="w-9 h-9 rounded-xl bg-warning_amber/15 flex items-center justify-center shrink-0"
                          >
                            <FileText size={16} className="text-warning_amber" />
                          </motion.div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-text_primary truncate">
                              {item.type === 'sales' ? 'فاتورة بيع' : 'فاتورة شراء'} #{item.invoice_number}
                            </p>
                            <p className="text-[11px] text-text_muted">
                              {item.hours_old_display} • <span className="font-numbers">{item.total?.toFixed(2)} د.ج</span>
                            </p>
                          </div>
                          <motion.div
                            initial={{ opacity: 0, x: 8 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.25 + idx * 0.04, duration: 0.2 }}
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${item.type === 'sales' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-blue-500/15 text-blue-400'}`}
                          >
                            {item.type === 'sales' ? 'بيع' : 'مشتريات'}
                          </motion.div>
                        </div>
                      );
                      return (
                        <motion.div
                          key={item._kind === 'low_stock' ? `low-${item.id}` : `draft-${item.type}-${item.id}`}
                          initial={{ opacity: 0, x: 24, height: 0 }}
                          animate={{ opacity: 1, x: 0, height: 'auto' }}
                          transition={{ delay: 0.08 + idx * 0.045, type: 'spring', damping: 22, stiffness: 260 }}
                        >
                          {row}
                        </motion.div>
                      );
                    })}

                    {/* ── لا يوجد شيء ── */}
                    {mergedNotifications.length === 0 && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.15, type: 'spring', damping: 18, stiffness: 200 }}
                        className="p-8 text-center text-text_muted text-sm"
                      >
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ delay: 0.25, type: 'spring', damping: 10, stiffness: 200 }}
                          className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center mx-auto mb-3"
                        >
                          <Bell size={24} className="text-emerald-400" />
                        </motion.div>
                        ✓ لا توجد إشعارات جديدة
                      </motion.div>
                    )}
                  </div>

                  {/* Footer */}
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.25, duration: 0.2 }}
                    className="p-3 border-t border-white/10 dark:border-white/10 bg-black/5 dark:bg-white/5 flex gap-2"
                  >
                    {recentLowStock.length > 0 && (
                      <button
                        onClick={() => { setShowNotifications(false); showNav('المخزون المنخفض'); navigate('/low-stock'); }}
                        className="flex-1 py-2.5 text-sm font-bold text-danger_red hover:text-white bg-danger_red/5 hover:bg-danger_red rounded-xl transition-all text-center active:scale-95"
                      >
                        عرض الناقصة ←
                      </button>
                    )}
                    {recentDrafts.length > 0 && (
                      <button
                        onClick={() => { setShowNotifications(false); showNav('المسودات'); navigate('/sales'); }}
                        className="flex-1 py-2.5 text-sm font-bold text-warning_amber hover:text-white bg-warning_amber/5 hover:bg-warning_amber rounded-xl transition-all text-center active:scale-95"
                      >
                        عرض المسودات ←
                      </button>
                    )}
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

        </div>
      </div>

      {/* Quick Actions (Integrated from Old Dashboard) - Taller Premium Look */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 min-h-[220px] mb-2 shrink-0">
        {/* Sales Action */}
        <button
          onClick={() => { showNav('فاتورة بيع جديدة'); navigate('/pos'); }}
          className="relative bg-background_secondary border border-emerald-500/30 hover:border-emerald-400/60 
                     bg-gradient-to-br from-emerald-500/10 to-transparent
                     flex flex-col items-center justify-center gap-4
                     rounded-2xl p-8 transition-all duration-300 hover:scale-[1.01] hover:shadow-lg hover:shadow-emerald-500/5 group"
        >
          <div className="p-5 rounded-2xl bg-background_card text-emerald-400 group-hover:scale-110 transition-transform">
            <ShoppingCart size={48} strokeWidth={1.5} />
          </div>
          <div className="text-center flex-1">
            <div className="text-xl font-bold text-text_primary">شاشة البيع (نقطة البيع)</div>
            <div className="text-xs text-emerald-400 mt-2 bg-emerald-500/10 px-4 py-1.5 rounded-xl border border-emerald-500/40 inline-flex items-center gap-1.5 font-mono font-bold tracking-wide shadow-sm group-hover:bg-emerald-500/20 transition-all select-none">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              {shortcuts.goto_pos || 'F6'}
            </div>
          </div>
        </button>

        {/* Purchase Action */}
        <button
          onClick={() => { showNav('فاتورة شراء جديدة'); navigate('/purchases/new'); }}
          className="relative bg-background_secondary border border-blue-500/30 hover:border-blue-400/60 
                     bg-gradient-to-br from-blue-500/10 to-transparent
                     flex flex-col items-center justify-center gap-4
                     rounded-2xl p-8 transition-all duration-300 hover:scale-[1.01] hover:shadow-lg hover:shadow-blue-500/5 group"
        >
          <div className="p-5 rounded-2xl bg-background_card text-blue-400 group-hover:scale-110 transition-transform">
            <Truck size={48} strokeWidth={1.5} />
          </div>
          <div className="text-center flex-1">
            <div className="text-xl font-bold text-text_primary">وصل الشراء (إدخال مخزون)</div>
            <div className="text-xs text-blue-400 mt-2 bg-blue-500/10 px-4 py-1.5 rounded-xl border border-blue-500/40 inline-flex items-center gap-1.5 font-mono font-bold tracking-wide shadow-sm group-hover:bg-blue-500/20 transition-all select-none">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse"></span>
              {shortcuts.goto_purchase || 'F7'}
            </div>
          </div>
        </button>
      </div>

      {/* Tables Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 min-h-0">
        {/* Today's Invoices */}
        <div className="bg-background_secondary rounded-2xl border border-border_default p-5 flex flex-col flex-1 min-h-[300px]">
          <h3 className="text-base font-bold text-text_primary mb-4 flex items-center gap-2 shrink-0">
            <Clock size={20} className="text-primary_blue" />
            آخر الفواتير
          </h3>
          {todayInvoices.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-text_muted text-sm">
              لا توجد فواتير مسجلة بعد
            </div>
          ) : (
            <div className="flex-1 space-y-5 overflow-auto custom-scrollbar pr-1 pb-4">
              {sortedDates.map((dateKey) => (
                <div key={dateKey} className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="text-xs font-bold text-primary_blue bg-primary_blue/10 border border-primary_blue/20 rounded-md px-3 py-1">
                      {getRelativeDateHeader(dateKey)}
                    </div>
                    <div className="h-px flex-1 bg-border_default/40"></div>
                  </div>
                  <div className="space-y-2.5">
                    {invoicesByDate[dateKey].map((inv) => (
                      <div
                        key={inv.id}
                        className="flex items-center justify-between p-3.5 rounded-xl bg-background_primary hover:bg-background_card_hover
                                   border border-border_default/40 hover:border-primary_blue/50 hover:shadow-md transition-all duration-200 cursor-pointer group"
                        onClick={() => { showNav('فتح الفاتورة'); navigate('/pos?invoiceId=' + inv.id); }}
                      >
                        <div className="flex items-center gap-3.5">
                          <div className="w-10 h-10 rounded-full bg-primary_blue/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                            <ShoppingCart size={18} className="text-primary_blue" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-sm font-bold text-text_primary group-hover:text-primary_blue transition-colors">{inv.customer_name || 'زبون عام'}</span>
                            </div>
                            <span className="text-xs font-medium text-text_muted flex items-center gap-1.5 font-numbers">
                              {inv.time || inv.invoice_number}
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1.5">
                          <span className={`text-sm font-bold font-numbers ${getPaymentColor(inv)}`}>
                            {formatCurrency(inv.total)}
                          </span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                            getPaymentColor(inv) === 'text-emerald-500' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
                            getPaymentColor(inv) === 'text-amber-500' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' :
                            'bg-orange-500/10 text-orange-500 border-orange-500/20'
                          }`}>
                            {getPaymentLabel(inv)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* AI Consultant Daily Widget */}
        <div className="bg-background_secondary rounded-2xl border border-border_default/10 p-5 flex flex-col flex-1 min-h-[350px]">
          {/* Header with Switchable Tabs */}
          <div className="flex items-center justify-between mb-4 shrink-0 pb-3" dir="rtl">
            <div className="flex bg-background_primary/60 p-0.5 rounded-xl relative">
              <button
                onClick={() => setActiveTab('consultant')}
                className={`relative px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 select-none cursor-pointer z-10 outline-none ${
                  activeTab === 'consultant' ? 'text-emerald-600 dark:text-emerald-400' : 'text-text_muted hover:text-text_primary'
                }`}
              >
                <Brain size={14} />
                <span>مستشار الأعمال 🤖</span>
                {activeTab === 'consultant' && (
                  <motion.div
                    layoutId="activeTabIndicator"
                    className="absolute inset-0 bg-emerald-500/10 rounded-lg -z-10"
                    transition={{ type: 'spring', damping: 20, stiffness: 250 }}
                  />
                )}
              </button>
              <button
                onClick={() => setActiveTab('lowStock')}
                className={`relative px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 select-none cursor-pointer z-10 outline-none ${
                  activeTab === 'lowStock' ? 'text-warning_amber' : 'text-text_muted hover:text-text_primary'
                }`}
              >
                <AlertTriangle size={14} />
                <span>تحليل النواقص 📉</span>
                {activeTab === 'lowStock' && (
                  <motion.div
                    layoutId="activeTabIndicator"
                    className="absolute inset-0 bg-warning_amber/10 rounded-lg -z-10"
                    transition={{ type: 'spring', damping: 20, stiffness: 250 }}
                  />
                )}
              </button>
            </div>

            {/* Right side info metadata */}
            {activeTab === 'consultant' ? (
              aiAnalysis ? (
                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/5 px-2.5 py-1 rounded-full border border-emerald-500/10">
                  آخر تحليل: {new Date(aiAnalysis.last_analyzed).toLocaleDateString('ar-DZ', { day: 'numeric', month: 'short' })}
                </span>
              ) : (
                <span className="text-[10px] font-bold text-text_secondary bg-zinc-500/5 px-2.5 py-1 rounded-full border border-border_default/20">
                  لم يتم التحليل
                </span>
              )
            ) : (
              <span className="text-[10px] font-bold text-warning_amber bg-warning_amber/5 px-2.5 py-1 rounded-full border border-warning_amber/10 font-numbers">
                {lowStock.length} منتجات منخفضة
              </span>
            )}
          </div>

          <AnimatePresence mode="wait">
            {activeTab === 'consultant' ? (
              <motion.div
                key="consultant-tab"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.2 }}
                className="flex-1 flex flex-col min-h-0"
              >
                {!aiAnalysis ? (
                  /* Empty State: AI not analyzed yet */
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-6 space-y-4">
                    <Brain size={48} className="text-emerald-500/30 animate-pulse" />
                    {aiConfig?.hasKey ? (
                      <>
                        <p className="text-xs text-text_secondary font-bold max-w-sm leading-relaxed">
                          مفتاح الـ API جاهز ومحفوظ محلياً. اضغط على زر التحليل بالأسفل لتشغيل أول تحليل شامل والحصول على التوصيات والتحذيرات الذكية لمحلّك فوراً.
                        </p>
                        <button
                          onClick={handleRunAnalysis}
                          disabled={aiLoading}
                          className="flex items-center gap-2 px-5 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-emerald-500/10 hover:shadow-emerald-500/25 disabled:opacity-50 cursor-pointer"
                        >
                          {aiLoading ? <RefreshCw size={14} className="animate-spin" /> : <Zap size={14} />}
                          {aiLoading ? 'جاري تشغيل التحليل الأول...' : 'تشغيل أول تحليل شامل 🚀'}
                        </button>
                      </>
                    ) : (
                      <>
                        <p className="text-xs text-text_secondary font-bold max-w-sm leading-relaxed">
                          لم يتم إعداد مستشار الذكاء الاصطناعي بعد. يرجى إدخال مفتاح API في صفحة الإعدادات لتفعيل التوصيات الذكية والدردشة التفاعلية المدركة لبيانات المتجر.
                        </p>
                        <button
                          onClick={() => { showNav('الإعدادات'); navigate('/settings'); }}
                          className="flex items-center gap-2 px-5 py-2 bg-background_card border border-border_default hover:border-emerald-400 text-text_primary rounded-xl text-xs font-bold transition-all cursor-pointer"
                        >
                          <Settings size={14} className="text-emerald-500" />
                          <span>تعديل إعدادات الذكاء الاصطناعي ⚙️</span>
                        </button>
                      </>
                    )}
                  </div>
                ) : (
                  /* Analysis Present Widget */
                  <div className="flex-1 flex flex-col gap-4 min-h-0 overflow-hidden">
                    {/* Health Score Mini Ring */}
                    <div className="flex items-center gap-3 p-3 bg-emerald-500/5 border border-emerald-500/15 rounded-xl">
                      <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-xs font-black text-emerald-600">
                        {aiAnalysis.shop_health_score}%
                      </div>
                      <div className="flex-1 min-w-0 text-right">
                        <span className="block text-xs font-bold text-text_primary">مؤشر الصحة العامة للمتجر</span>
                        <p className="text-[10px] text-text_secondary truncate font-bold mt-0.5">{aiAnalysis.summary}</p>
                      </div>
                    </div>

                    {/* Recommendations list (Top 3) */}
                    <div className="flex-grow space-y-2.5 overflow-y-auto custom-scrollbar pr-1 pb-2">
                      {aiAnalysis.recommendations
                        .sort((a: any, b: any) => {
                          const priority = { critical: 0, warning: 1, opportunity: 2 };
                          return (priority[a.type as keyof typeof priority] ?? 2) - (priority[b.type as keyof typeof priority] ?? 2);
                        })
                        .slice(0, 3)
                        .map((rec: any, index: number) => {
                          const colorClasses = 
                            rec.type === 'critical' ? 'border-r-danger_red bg-danger_red/[0.03]' :
                            rec.type === 'warning' ? 'border-r-amber-500 bg-amber-500/[0.03]' :
                            'border-r-emerald-500 bg-emerald-500/[0.03]';
                          
                          const badgeClasses = 
                            rec.type === 'critical' ? 'text-danger_red bg-danger_red/10 border-danger_red/20' :
                            rec.type === 'warning' ? 'text-amber-500 bg-amber-500/10 border-amber-500/20' :
                            'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';

                          const typeLabels = { critical: 'حرج', warning: 'تحذير', opportunity: 'فرصة' };
                          const recId = rec.id || `rec-${index}`;
                          const isExpanded = expandedRecId === recId;

                          return (
                            <div
                              key={recId}
                              onClick={() => {
                                setExpandedRecId(isExpanded ? null : recId);
                              }}
                              className={`flex flex-col p-3 rounded-xl border border-border_default/30 border-r-4 transition-all hover:bg-background_primary/50 cursor-pointer ${colorClasses}`}
                            >
                              <div className="flex items-center justify-between w-full">
                                <div className="flex-1 min-w-0 pr-1 text-right">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${badgeClasses}`}>
                                      {typeLabels[rec.type as keyof typeof typeLabels] || rec.type}
                                    </span>
                                    <span className="text-xs font-bold text-text_primary truncate">{rec.title}</span>
                                  </div>
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0 mr-2">
                                  {rec.action_route && !isExpanded && (
                                    <span className="text-[9px] font-bold text-emerald-500 bg-emerald-500/5 border border-emerald-500/10 px-1 py-0.5 rounded">إجراء</span>
                                  )}
                                  {isExpanded ? (
                                    <ChevronUp size={14} className="text-text_muted" />
                                  ) : (
                                    <ChevronDown size={14} className="text-text_muted" />
                                  )}
                                </div>
                              </div>

                              {/* Content area */}
                              <div className="mt-1.5 pr-1 text-right">
                                {isExpanded ? (
                                  <div className="space-y-2 mt-1">
                                    <div className="bg-background_primary/40 rounded-lg p-2.5 border border-border_default/20">
                                      <span className="block text-[9px] font-bold text-text_secondary mb-1">الاستنتاج:</span>
                                      <p className="text-[10px] text-text_primary leading-relaxed font-bold">{rec.conclusion}</p>
                                    </div>
                                    <div className="bg-emerald-500/[0.02] rounded-lg p-2.5 border border-emerald-500/10">
                                      <span className="block text-[9px] font-bold text-emerald-500 mb-1">التوصية والنصيحة:</span>
                                      <p className="text-[10px] text-text_primary leading-relaxed font-medium">{rec.recommendation}</p>
                                    </div>
                                    {rec.action_route && (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          navigate(rec.action_route);
                                        }}
                                        className="w-full flex items-center justify-between mt-2 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-[10px] font-bold transition-all shadow-sm shadow-emerald-500/10"
                                      >
                                        <span>الانتقال لصفحة الإجراء المناسب ⚡</span>
                                        <ChevronLeft size={12} />
                                      </button>
                                    )}
                                  </div>
                                ) : (
                                  <p className="text-[10px] text-text_secondary leading-relaxed line-clamp-1 font-bold">{rec.conclusion}</p>
                                )}
                              </div>
                            </div>
                          );
                        })}
                    </div>

                    {/* Footer controls */}
                    <div className="pt-2.5 border-t border-border_default flex justify-between items-center shrink-0">
                      <button
                        onClick={() => { showNav('مستشار ذكي'); navigate('/consultant'); }}
                        className="text-xs font-bold text-emerald-500 hover:text-emerald-600 flex items-center gap-1.5 transition-colors"
                      >
                        <span>غرفة المستشار والدردشة الكاملة</span>
                        <ChevronLeft size={12} />
                      </button>

                      <button
                        onClick={handleRunAnalysis}
                        disabled={aiLoading}
                        className="flex items-center gap-1 px-3 py-1.5 bg-background_card border border-border_default hover:border-emerald-400 rounded-lg text-[10px] font-bold text-text_secondary hover:text-text_primary transition-all disabled:opacity-50"
                        title="تحديث التحليل"
                      >
                        <RefreshCw size={11} className={aiLoading ? 'animate-spin' : ''} />
                        <span>تحديث</span>
                      </button>
                    </div>
                  </div>
                )}
              </motion.div>
            ) : (
              <motion.div
                key="lowstock-tab"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.2 }}
                className="flex-1 flex flex-col min-h-0"
              >
                {lowStock.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-text_muted gap-2">
                    <span className="text-4xl">🎉</span>
                    <p className="text-xs font-bold text-emerald-400">جميع المنتجات فوق حد الأمان. لا توجد أي نواقص في المستودع!</p>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col gap-4 min-h-0 overflow-hidden" dir="rtl">
                    {/* Glowing Area Chart - Full Height */}
                    <div 
                      className="flex-grow w-full bg-background_primary/20 rounded-xl border border-border_default/10 p-2 relative overflow-hidden cursor-pointer" 
                      title="انقر على أي فئة لتفصيل النواقص"
                    >
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart 
                          data={chartData} 
                          margin={{ top: 10, right: 10, left: -25, bottom: 5 }}
                          onClick={(state) => {
                            if (state && state.activeLabel) {
                              showNav('المخزون المنخفض');
                              navigate(`/low-stock?category=${encodeURIComponent(state.activeLabel)}`);
                            }
                          }}
                        >
                          <defs>
                            <linearGradient id="colorLowStock" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#ea580c" stopOpacity={0.35}/>
                              <stop offset="95%" stopColor="#ea580c" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--border-default) / 0.08)" />
                          <XAxis dataKey="name" stroke="rgb(var(--text-secondary))" fontSize={9} tickLine={false} />
                          <YAxis stroke="rgb(var(--text-secondary))" fontSize={9} tickLine={false} allowDecimals={false} />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: 'var(--bg-card)',
                              borderColor: 'rgb(var(--border-default) / 0.12)',
                              borderRadius: '12px',
                              fontSize: '10px',
                              color: 'rgb(var(--text-primary))',
                              textAlign: 'right',
                              direction: 'rtl'
                            }}
                            labelStyle={{ fontWeight: 'bold', color: '#ea580c' }}
                          />
                          <Area type="monotone" dataKey="count" name="عدد النواقص" stroke="#ea580c" strokeWidth={2} fillOpacity={1} fill="url(#colorLowStock)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Footer navigate all low stock */}
                    <div className="pt-2.5 border-t border-border_default flex justify-between items-center shrink-0">
                      <button
                        onClick={() => { showNav('المخزون المنخفض'); navigate('/low-stock'); }}
                        className="text-xs font-bold text-warning_amber hover:text-amber-400 flex items-center gap-1.5 transition-colors"
                      >
                        <span>عرض جميع النواقص بالتفصيل</span>
                        <ChevronLeft size={12} />
                      </button>
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

    </div>
  );
}

