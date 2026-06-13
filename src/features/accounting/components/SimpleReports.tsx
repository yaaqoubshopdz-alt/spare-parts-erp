import { useState, useEffect, useCallback } from 'react';
import { 
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid 
} from 'recharts';
import { 
  Wallet, Package, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, 
  RefreshCw, BarChart2, Activity, Star, Users, Truck, ArrowLeftRight, Award, AlertCircle,
  Calendar, ShoppingCart
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

type Period = 'week' | 'month' | 'year';

interface SimpleReportData {
  cashBalance: number;
  inventoryValue: number;
  receivables: number;
  payables: number;
  netProfit: number;
  expenses: number;
  totalSales: number;
  todayProfit: number;
  bestSellers: { name: string; quantity_sold: number }[];
  salesTrend: { date: string; total_sales: number }[];
}

const PERIOD_CONFIG: Record<Period, { label: string; badge: string; chartTitle: string; chartSub: string; trendLabel: string }> = {
  week: {
    label: 'أسبوع',
    badge: 'آخر 7 أيام',
    chartTitle: 'حركة المبيعات الأسبوعية',
    chartSub: 'المبيعات اليومية لآخر 7 أيام',
    trendLabel: 'آخر أسبوع',
  },
  month: {
    label: 'شهر',
    badge: 'آخر 30 يومًا',
    chartTitle: 'حركة المبيعات الشهرية',
    chartSub: 'المبيعات اليومية لآخر 30 يومًا',
    trendLabel: 'آخر شهر',
  },
  year: {
    label: 'سنة',
    badge: 'آخر 12 شهرًا',
    chartTitle: 'حركة المبيعات السنوية',
    chartSub: 'المبيعات الشهرية لآخر 12 شهرًا',
    trendLabel: 'آخر سنة',
  },
};

export default function SimpleReports({ onToggleAdvanced }: { onToggleAdvanced?: () => void }) {
  const [data, setData] = useState<SimpleReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<Period>('month');
  const [switching, setSwitching] = useState(false);

  const loadData = useCallback(async (selectedPeriod: Period) => {
    setLoading(true);
    setError(null);
    try {
      const resultPromise = window.electronAPI.invoke('accounting:getSimpleReports', selectedPeriod);
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('انتهت مهلة جلب البيانات (8 ثوانٍ)')), 8000)
      );

      const res = (await Promise.race([resultPromise, timeoutPromise])) as any;
      if (res.success) {
        setData(res.data);
      } else {
        setError(res.error || 'فشل جلب البيانات.');
      }
    } catch (e: any) {
      setError(e.message || 'حدث خطأ غير متوقع.');
    } finally {
      setLoading(false);
      setSwitching(false);
    }
  }, []);

  useEffect(() => {
    loadData(period);
  }, []);

  const handlePeriodChange = (newPeriod: Period) => {
    if (newPeriod === period) return;
    setSwitching(true);
    setPeriod(newPeriod);
    loadData(newPeriod);
  };

  const fmt = (n: number) => String(Math.round(n || 0));

  const cfg = PERIOD_CONFIG[period];

  // ── Chart Data Preparation ──
  const getPreparedChartData = () => {
    if (!data || !data.salesTrend) return [];

    const weekdays = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
    const monthNames = ['يناير', 'فبراير', 'مارس', 'أبريل', 'ماي', 'جوان', 'جويلية', 'أوت', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];

    if (period === 'year') {
      const months: string[] = [];
      for (let i = 11; i >= 0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
      }
      return months.map(monthStr => {
        const dbMatch = data.salesTrend.find(item => item.date === monthStr);
        const monthIdx = parseInt(monthStr.split('-')[1]) - 1;
        return {
          date: monthStr,
          dayName: monthNames[monthIdx],
          'المبيعات': dbMatch ? dbMatch.total_sales : 0
        };
      });
    } else if (period === 'week') {
      const days: string[] = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        days.push(d.toISOString().split('T')[0]);
      }
      return days.map(dateStr => {
        const dbMatch = data.salesTrend.find(item => item.date === dateStr);
        const d = new Date(dateStr);
        return {
          date: dateStr,
          dayName: weekdays[d.getDay()],
          'المبيعات': dbMatch ? dbMatch.total_sales : 0
        };
      });
    } else {
      // month: last 30 days
      const days: string[] = [];
      for (let i = 29; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        days.push(d.toISOString().split('T')[0]);
      }
      return days.map(dateStr => {
        const dbMatch = data.salesTrend.find(item => item.date === dateStr);
        const d = new Date(dateStr);
        return {
          date: dateStr,
          dayName: `${d.getDate()}/${d.getMonth() + 1}`,
          'المبيعات': dbMatch ? dbMatch.total_sales : 0
        };
      });
    }
  };

  const chartData = getPreparedChartData();
  const maxChartSale = chartData.length > 0 ? Math.max(...chartData.map(d => d['المبيعات'])) : 0;

  const isProfitPositive = data ? data.netProfit >= 0 : true;
  const netDebtPosition = data ? (data.receivables || 0) - (data.payables || 0) : 0;
  const netPositionPositive = netDebtPosition >= 0;
  const totalDebts = data ? (data.receivables || 0) + (data.payables || 0) : 0;
  const receivablesPercent = totalDebts > 0 && data ? Math.round((data.receivables / totalDebts) * 100) : 50;
  const payablesPercent = 100 - receivablesPercent;

  // ── Skeleton Loader ──
  const SkeletonCard = () => (
    <div className="bg-background_secondary border border-border_default p-6 rounded-3xl animate-pulse">
      <div className="flex justify-between items-start mb-4">
        <div className="w-11 h-11 bg-border_default/50 rounded-2xl" />
        <div className="w-16 h-5 bg-border_default/50 rounded-full" />
      </div>
      <div className="w-20 h-3 bg-border_default/40 rounded mb-2" />
      <div className="w-32 h-8 bg-border_default/50 rounded mb-2" />
      <div className="w-28 h-3 bg-border_default/30 rounded" />
    </div>
  );

  return (
    <div className="w-full pb-16 text-right selection:bg-violet-500/10 font-arabic" dir="rtl">
      
      {/* ═══ Header + Period Filter Bar ═══ */}
      <div className="flex flex-col gap-5 mb-10 border-b border-border_default/70 pb-6">
        
        {/* Top Row: Title + Actions */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-tr from-violet-600 to-indigo-500 text-white rounded-xl shadow-md shadow-violet-500/10">
              <Activity size={22} />
            </div>
            <div>
              <h2 className="text-xl md:text-2xl font-black text-text_primary tracking-tight">ملخص النشاط المالي</h2>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <p className="text-text_secondary text-xs font-bold">مؤشرات متجرك · {cfg.badge}</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button 
              onClick={() => loadData(period)}
              disabled={loading}
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 bg-background_secondary hover:bg-background_card_hover text-text_secondary hover:text-text_primary rounded-xl text-xs font-bold border border-border_default transition-all duration-200 disabled:opacity-50"
            >
              <RefreshCw size={13} className={`${loading ? 'animate-spin' : ''}`} />
              تحديث
            </button>
            
            {onToggleAdvanced && (
              <button 
                onClick={onToggleAdvanced}
                className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold transition-all duration-200 shadow-md shadow-violet-500/15 border border-violet-500/10"
              >
                <BarChart2 size={13} />
                التقارير المتقدمة
              </button>
            )}
          </div>
        </div>

        {/* Period Filter Buttons */}
        <div className="flex items-center gap-2 bg-background_secondary/60 backdrop-blur-sm border border-border_default/60 p-1.5 rounded-2xl w-fit">
          <Calendar size={14} className="text-text_muted mr-1 ml-2" />
          {(['week', 'month', 'year'] as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => handlePeriodChange(p)}
              disabled={switching}
              className={`relative px-5 py-2 rounded-xl text-xs font-black transition-all duration-300 disabled:cursor-wait ${
                period === p
                  ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md shadow-violet-500/20'
                  : 'text-text_secondary hover:text-text_primary hover:bg-background_card_hover'
              }`}
            >
              {PERIOD_CONFIG[p].label}
              {period === p && (
                <motion.div
                  layoutId="periodIndicator"
                  className="absolute inset-0 bg-gradient-to-r from-violet-600 to-indigo-600 rounded-xl -z-10"
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ═══ Browser Warning Banner ═══ */}
      {window.electronAPI?.isMock && (
        <div className="mb-6 p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center gap-3 text-amber-600 dark:text-amber-400 text-xs font-bold shadow-sm">
          <AlertCircle size={18} className="shrink-0 animate-bounce" />
          <p className="leading-relaxed text-right">
            تنبيه: أنت تعمل حالياً في <strong>بيئة المتصفح التجريبية (بيانات وهمية)</strong>. لرؤية بيانات قاعدة البيانات الحقيقية وتحديث الديون والتقارير عند المبيعات والمشتريات، يرجى تشغيل التطبيق المكتبي (Electron Desktop) بالولوج لمجلد المشروع وتشغيل: <code className="bg-black/10 px-1.5 py-0.5 rounded font-numbers">npm run dev</code> في سطر الأوامر لتشغيل واجهة سطح المكتب.
          </p>
        </div>
      )}

      {/* ═══ Initial Loading State ═══ */}
      {loading && !data && (
        <div className="space-y-8">
          <div className="w-full bg-background_secondary border border-border_default p-8 rounded-3xl animate-pulse h-48" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map(i => <SkeletonCard key={i} />)}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-6 space-y-6">
              <div className="bg-background_secondary border border-border_default p-8 rounded-3xl animate-pulse h-64" />
              <div className="bg-background_secondary border border-border_default p-8 rounded-3xl animate-pulse h-80" />
            </div>
            <div className="lg:col-span-6 bg-background_secondary border border-border_default p-8 rounded-3xl animate-pulse h-[500px]" />
          </div>
        </div>
      )}

      {/* ═══ Error State ═══ */}
      {error && (
        <div className="bg-danger_red/5 border border-danger_red/15 text-danger_red p-8 rounded-3xl flex flex-col items-center justify-center gap-4 max-w-lg mx-auto text-center shadow-sm">
          <div className="p-3 bg-danger_red/10 rounded-2xl">
            <AlertCircle size={28} />
          </div>
          <div>
            <h4 className="font-bold text-sm text-text_primary">حدث خطأ في تحميل التقرير</h4>
            <p className="text-xs text-text_secondary mt-1">{error}</p>
          </div>
          <button 
            onClick={() => loadData(period)} 
            className="px-5 py-2 bg-danger_red/10 text-danger_red border border-danger_red/20 rounded-xl text-xs font-bold hover:bg-danger_red/20 transition-all duration-150"
          >
            إعادة محاولة الاتصال 🔄
          </button>
        </div>
      )}

      {/* ═══ Main Data View ═══ */}
      {data && (
        <AnimatePresence mode="wait">
          <motion.div 
            key={period}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
            className={`space-y-8 ${switching ? 'pointer-events-none' : ''}`}
          >
            
            {/* ── Net Profit Card: Massive Top Banner ── */}
            <div className="w-full">
              <motion.div 
                whileHover={{ y: -4 }}
                className={`w-full bg-gradient-to-br ${
                  isProfitPositive 
                    ? 'from-emerald-600 via-emerald-700 to-teal-800 shadow-emerald-500/10 border-emerald-500/30' 
                    : 'from-rose-600 via-red-700 to-red-800 shadow-rose-500/10 border-rose-500/30'
                } text-white p-8 rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-300 relative overflow-hidden group border`}
              >
                {/* Background decorative patterns */}
                <div className="absolute -top-24 -left-24 w-48 h-48 bg-white/5 rounded-full blur-2xl group-hover:bg-white/10 transition-all duration-500" />
                <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-black/10 rounded-full blur-3xl" />
                
                {isProfitPositive ? (
                  <TrendingUp size={240} className="absolute -left-12 -bottom-16 opacity-10 text-white transform -rotate-12 group-hover:scale-110 transition-transform duration-500 pointer-events-none" />
                ) : (
                  <TrendingDown size={240} className="absolute -left-12 -bottom-16 opacity-10 text-white transform -rotate-12 group-hover:scale-110 transition-transform duration-500 pointer-events-none" />
                )}
                
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-5 relative z-10">
                  <div className="flex flex-col gap-1.5">
                    <span className="text-3xs font-black uppercase tracking-widest bg-white/20 text-white px-3 py-1 rounded-full w-fit">
                      {cfg.badge}
                    </span>
                    <p className="text-white/80 text-2xs font-black mt-2">صافي الربح المالي المحقق</p>
                    
                    <div className="flex items-baseline gap-1 mt-2" dir="ltr">
                      <span className="text-4xl sm:text-6xl font-black font-numbers tracking-tight drop-shadow-md">
                        {isProfitPositive ? `+${fmt(data.netProfit)}` : `-${fmt(Math.abs(data.netProfit))}`}
                      </span>
                      <span className="text-xl sm:text-2xl font-bold opacity-90">د.ج</span>
                    </div>

                    <div className="flex items-center gap-2 mt-4 text-3xs font-black bg-black/15 w-fit px-4 py-1.5 rounded-2xl">
                      <span className={`w-2 h-2 rounded-full ${isProfitPositive ? 'bg-emerald-400 animate-ping' : 'bg-rose-400'}`} />
                      <span className="opacity-95">{isProfitPositive ? 'أداء مالي مميز وصحي للمتجر' : 'تراجع في الربحية، يرجى مراجعة المصاريف'}</span>
                    </div>
                  </div>
                  
                  {/* Super Large Emerald Green Glowing Icon */}
                  <div className={`p-6 sm:p-8 ${
                    isProfitPositive 
                      ? 'bg-emerald-500/20 text-emerald-100 shadow-glow-emerald border-emerald-400/20' 
                      : 'bg-rose-500/20 text-rose-100 shadow-glow-rose border-rose-400/20'
                  } border rounded-3xl group-hover:scale-110 group-hover:rotate-6 transition-all duration-300 shadow-lg`}>
                    {isProfitPositive ? <TrendingUp size={48} className="animate-pulse" /> : <TrendingDown size={48} />}
                  </div>
                </div>
              </motion.div>
            </div>

            {/* ── KPI Cards Grid (4 cards horizontally below Net Profit) ── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              
              {/* Card 2: إجمالي المبيعات */}
              <motion.div 
                whileHover={{ y: -4 }}
                className="bg-background_secondary border border-border_default hover:border-indigo-500/40 text-text_primary p-5 rounded-3xl shadow-sm hover:shadow-md transition-all duration-300 relative overflow-hidden group"
              >
                <div className="absolute -top-10 -left-10 w-20 h-20 bg-indigo-500/5 group-hover:bg-indigo-500/10 rounded-full blur-xl transition-all duration-300" />
                
                <div className="flex justify-between items-start mb-4 relative z-10">
                  <div className="p-2.5 bg-indigo-500/10 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400 border border-indigo-500/20 rounded-xl group-hover:scale-110 transition-transform duration-300 shadow-[0_0_15px_rgba(99,102,241,0.15)]">
                    <ShoppingCart size={16} />
                  </div>
                  <span className="text-3xs font-bold bg-indigo-500/10 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400 px-2 py-0.5 rounded-full">
                    {cfg.badge}
                  </span>
                </div>
                
                <p className="text-text_secondary text-2xs font-bold mb-1 relative z-10">إجمالي المبيعات</p>
                <div className="flex items-baseline gap-0.5 relative z-10" dir="ltr">
                  <span className="text-2xl font-black text-text_primary font-numbers tracking-tight">
                    {fmt(data.totalSales)}
                  </span>
                  <span className="text-3xs font-bold text-text_secondary mr-1">د.ج</span>
                </div>
                
                <div className="flex items-center gap-1 mt-3 text-3xs font-bold text-text_muted relative z-10">
                  <ArrowUpRight size={10} className="text-indigo-500" />
                  <span>حجم المبيعات</span>
                </div>
              </motion.div>

              {/* Card 3: السيولة النقدية */}
              <motion.div 
                whileHover={{ y: -4 }}
                className="bg-background_secondary border border-border_default hover:border-fuchsia-500/40 text-text_primary p-5 rounded-3xl shadow-sm hover:shadow-md transition-all duration-300 relative overflow-hidden group"
              >
                <div className="absolute -top-10 -left-10 w-20 h-20 bg-fuchsia-500/5 group-hover:bg-fuchsia-500/10 rounded-full blur-xl transition-all duration-300" />
                
                <div className="flex justify-between items-start mb-4 relative z-10">
                  <div className="p-2.5 bg-fuchsia-500/10 text-fuchsia-600 dark:bg-fuchsia-500/20 dark:text-fuchsia-400 border border-fuchsia-500/20 rounded-xl group-hover:scale-110 transition-transform duration-300 shadow-[0_0_15px_rgba(217,70,239,0.15)]">
                    <Wallet size={16} />
                  </div>
                  <span className="text-3xs font-bold bg-fuchsia-500/10 text-fuchsia-600 dark:bg-fuchsia-500/20 dark:text-fuchsia-400 px-2 py-0.5 rounded-full">
                    الخزينة
                  </span>
                </div>
                
                <p className="text-text_secondary text-2xs font-bold mb-1 relative z-10">السيولة النقدية</p>
                <div className="flex items-baseline gap-0.5 relative z-10" dir="ltr">
                  <span className="text-2xl font-black text-text_primary font-numbers tracking-tight">
                    {fmt(data.cashBalance)}
                  </span>
                  <span className="text-3xs font-bold text-text_secondary mr-1">د.ج</span>
                </div>
                
                <div className="flex items-center gap-1 mt-3 text-3xs font-bold text-text_muted relative z-10">
                  <Activity size={10} className="text-fuchsia-500" />
                  <span>رصيد الصندوق الفعلي</span>
                </div>
              </motion.div>

              {/* Card 4: قيمة المخزون */}
              <motion.div 
                whileHover={{ y: -4 }}
                className="bg-background_secondary border border-border_default hover:border-emerald-500/40 text-text_primary p-5 rounded-3xl shadow-sm hover:shadow-md transition-all duration-300 relative overflow-hidden group"
              >
                <div className="absolute -top-10 -left-10 w-20 h-20 bg-emerald-500/5 group-hover:bg-emerald-500/10 rounded-full blur-xl transition-all duration-300" />
                
                <div className="flex justify-between items-start mb-4 relative z-10">
                  <div className="p-2.5 bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 border border-emerald-500/20 rounded-xl group-hover:scale-110 transition-transform duration-300 shadow-[0_0_15px_rgba(16,185,129,0.15)]">
                    <Package size={16} />
                  </div>
                  <span className="text-3xs font-bold bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 px-2 py-0.5 rounded-full">
                    المخزون
                  </span>
                </div>
                
                <p className="text-text_secondary text-2xs font-bold mb-1 relative z-10">قيمة بضاعة المحل</p>
                <div className="flex items-baseline gap-0.5 relative z-10" dir="ltr">
                  <span className="text-2xl font-black text-text_primary font-numbers tracking-tight">
                    {fmt(data.inventoryValue)}
                  </span>
                  <span className="text-3xs font-bold text-text_secondary mr-1">د.ج</span>
                </div>
                
                <div className="flex items-center gap-1 mt-3 text-3xs font-bold text-text_muted relative z-10">
                  <Star size={10} className="text-emerald-500 fill-emerald-500/10" />
                  <span>سعر الشراء</span>
                </div>
              </motion.div>

              {/* Card 5: المصاريف */}
              <motion.div 
                whileHover={{ y: -4 }}
                className="bg-background_secondary border border-border_default hover:border-rose-500/40 text-text_primary p-5 rounded-3xl shadow-sm hover:shadow-md transition-all duration-300 relative overflow-hidden group"
              >
                <div className="absolute -top-10 -left-10 w-20 h-20 bg-rose-500/5 group-hover:bg-rose-500/10 rounded-full blur-xl transition-all duration-300" />
                
                <div className="flex justify-between items-start mb-4 relative z-10">
                  <div className="p-2.5 bg-rose-500/10 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400 border border-rose-500/20 rounded-xl group-hover:scale-110 transition-transform duration-300 shadow-[0_0_15px_rgba(244,63,94,0.15)]">
                    <TrendingDown size={16} />
                  </div>
                  <span className="text-3xs font-bold bg-rose-500/10 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400 px-2 py-0.5 rounded-full">
                    {cfg.badge}
                  </span>
                </div>
                
                <p className="text-text_secondary text-2xs font-bold mb-1 relative z-10">المصاريف التشغيلية</p>
                <div className="flex items-baseline gap-0.5 relative z-10" dir="ltr">
                  <span className="text-2xl font-black text-text_primary font-numbers tracking-tight">
                    {fmt(data.expenses)}
                  </span>
                  <span className="text-3xs font-bold text-text_secondary mr-1">د.ج</span>
                </div>
                
                <div className="flex items-center gap-1 mt-3 text-3xs font-bold text-text_muted relative z-10">
                  <ArrowDownRight size={10} className="text-rose-500" />
                  <span>إيجار وتكاليف تشغيل</span>
                </div>
              </motion.div>

            </div>

            {/* ── Bottom Layout: Two-Column ── */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              
              {/* Right Column: Debts & Best Sellers */}
              <div className="lg:col-span-5 space-y-6">
                
                {/* Outstanding Accounts/Debts */}
                <div className="bg-background_secondary border border-border_default p-6 rounded-3xl shadow-sm">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="p-2 bg-violet-500/10 text-violet-500 rounded-xl">
                      <ArrowLeftRight size={16} />
                    </div>
                    <h3 className="text-xs font-black text-text_primary uppercase tracking-wider">الحسابات والديون المعلقة</h3>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {/* Receivables */}
                    <div className="bg-gradient-to-br from-emerald-500/[0.04] to-transparent border border-emerald-500/15 p-4 rounded-2xl group hover:border-emerald-500/35 transition-all duration-200">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-text_secondary text-2xs font-bold">لنا عند الزبائن</span>
                        <div className="p-2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl">
                          <Users size={14} />
                        </div>
                      </div>
                      <div className="flex items-baseline gap-0.5">
                        <span className="text-xl font-black text-emerald-600 dark:text-emerald-400 font-numbers tracking-tight">
                          {fmt(data.receivables)}
                        </span>
                        <span className="text-3xs font-bold text-emerald-600/70 mr-1">د.ج</span>
                      </div>
                      <p className="text-3xs text-text_muted mt-1 font-medium">مستحقات البيع بالأجل</p>
                    </div>

                    {/* Payables */}
                    <div className="bg-gradient-to-br from-rose-500/[0.04] to-transparent border border-rose-500/15 p-4 rounded-2xl group hover:border-rose-500/35 transition-all duration-200">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-text_secondary text-2xs font-bold">علينا للموردين</span>
                        <div className="p-2 bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-xl">
                          <Truck size={14} />
                        </div>
                      </div>
                      <div className="flex items-baseline gap-0.5">
                        <span className="text-xl font-black text-rose-600 dark:text-rose-400 font-numbers tracking-tight">
                          {fmt(data.payables)}
                        </span>
                        <span className="text-3xs font-bold text-rose-600/70 mr-1">د.ج</span>
                      </div>
                      <p className="text-3xs text-text_muted mt-1 font-medium">فواتير شراء مستحقة</p>
                    </div>
                  </div>

                  {/* Net Debt/Credit Ratio Progress Bar */}
                  {totalDebts > 0 && (
                    <div className="mt-5 space-y-2">
                      <div className="flex justify-between text-3xs font-bold text-text_secondary">
                        <span className="text-emerald-600 dark:text-emerald-400">نسبة المقبوضات: {receivablesPercent}%</span>
                        <span className="text-rose-600 dark:text-rose-400">نسبة المدفوعات: {payablesPercent}%</span>
                      </div>
                      <div className="w-full h-2 bg-border_default/30 rounded-full overflow-hidden flex">
                        <div className="h-full bg-emerald-500 transition-all duration-500" style={{ width: `${receivablesPercent}%` }} />
                        <div className="h-full bg-rose-500 transition-all duration-500" style={{ width: `${payablesPercent}%` }} />
                      </div>
                    </div>
                  )}

                  {/* Net position summary banner */}
                  <div className={`mt-5 p-3.5 rounded-2xl border text-center text-xs font-bold transition-all duration-300 ${
                    netPositionPositive 
                      ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400' 
                      : 'bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400'
                  }`}>
                    {netPositionPositive ? (
                      <div className="flex items-center justify-center gap-1.5">
                        <TrendingUp size={14} />
                        <span>صافي مركز الديون إيجابي: +{fmt(netDebtPosition)} د.ج</span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center gap-1.5">
                        <TrendingDown size={14} />
                        <span>عجز الديون المعلقة: -{fmt(Math.abs(netDebtPosition))} د.ج</span>
                      </div>
                    )}
                  </div>

                </div>

                {/* Best Sellers */}
                <div className="bg-background_secondary border border-border_default p-6 rounded-3xl shadow-sm">
                  <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-amber-500/10 text-amber-500 rounded-xl">
                        <Award size={16} />
                      </div>
                      <h3 className="text-xs font-black text-text_primary uppercase tracking-wider">الأكثر مبيعاً</h3>
                    </div>
                    <span className="text-3xs font-bold text-text_muted bg-background_primary px-2 py-0.5 rounded-lg">{cfg.badge}</span>
                  </div>
                  
                  {data.bestSellers && data.bestSellers.length > 0 ? (
                    <div className="space-y-3">
                      {data.bestSellers.map((item, idx) => {
                        const rankColors = [
                          { text: 'text-amber-500', bg: 'bg-amber-500/10', fill: 'from-amber-400 to-yellow-500' },
                          { text: 'text-slate-400', bg: 'bg-slate-400/10', fill: 'from-slate-300 to-slate-400' },
                          { text: 'text-amber-700', bg: 'bg-amber-700/10', fill: 'from-amber-600 to-amber-800' },
                        ][idx] || { text: 'text-violet-500', bg: 'bg-violet-500/10', fill: 'from-violet-400 to-violet-500' };

                        const topQty = data.bestSellers[0].quantity_sold || 1;
                        const percentage = Math.round((item.quantity_sold / topQty) * 100);

                        return (
                          <div key={idx} className="p-3 bg-background_primary/35 hover:bg-background_primary/75 rounded-xl border border-border_default/40 transition-all duration-200 flex flex-col gap-1.5">
                            <div className="flex justify-between items-center">
                              <div className="flex items-center gap-2.5 max-w-[70%]">
                                <span className={`w-5 h-5 flex items-center justify-center rounded-lg text-2xs font-black ${rankColors.text} ${rankColors.bg} font-numbers`}>
                                  {idx + 1}
                                </span>
                                <span className="text-xs font-bold text-text_primary truncate" title={item.name}>
                                  {item.name}
                                </span>
                              </div>
                              <span className="text-2xs font-black text-violet-600 dark:text-violet-400 font-numbers bg-violet-500/5 px-2 py-0.5 rounded-lg">
                                {item.quantity_sold} قطعة
                              </span>
                            </div>
                            <div className="w-full h-1 bg-border_default/50 rounded-full overflow-hidden">
                              <div 
                                className={`h-full bg-gradient-to-r ${rankColors.fill} rounded-full transition-all duration-500`}
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center py-6 text-text_muted text-xs">
                      <Star size={28} className="text-text_muted/30 mb-2" />
                      <p>لا توجد مبيعات مسجلة لهذه الفترة.</p>
                    </div>
                  )}
                </div>

              </div>

              {/* Left Column: Sales Trend Chart */}
              <div className="lg:col-span-7 bg-background_secondary border border-border_default p-6 rounded-3xl shadow-sm flex flex-col min-h-[460px] relative overflow-hidden">
                
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-violet-500/10 text-violet-500 rounded-xl">
                        <TrendingUp size={16} />
                      </div>
                      <h3 className="text-xs font-black text-text_primary uppercase tracking-wider">{cfg.chartTitle}</h3>
                    </div>
                    <div className="flex items-center gap-1.5 px-2 py-0.5 bg-violet-500/5 rounded-full text-3xs font-black text-violet-500 font-numbers">
                      {cfg.badge}
                    </div>
                  </div>
                  <p className="text-2xs text-text_secondary pr-11">{cfg.chartSub}</p>
                </div>

                {/* Chart Container — explicit height fixes rendering */}
                <div className="flex-1 w-full mt-6 relative z-10" style={{ minHeight: 280 }}>
                  {maxChartSale === 0 ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-text_muted/70 bg-background_primary/20 rounded-2xl border border-dashed border-border_default/80 p-6">
                      <Activity size={36} className="text-violet-500/35 mb-2 animate-pulse" />
                      <p className="text-2xs font-bold">لا يوجد نشاط مبيعات مسجل لهذه الفترة.</p>
                      <p className="text-3xs mt-0.5">ستظهر مبيعاتك هنا بمجرد تأكيد الفواتير.</p>
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height={300}>
                      <AreaChart
                        data={chartData}
                        margin={{ top: 20, right: 25, left: 15, bottom: 20 }}
                      >
                        <defs>
                          <linearGradient id="colorSalesPremium" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#6366f1" stopOpacity={0.4}/>
                            <stop offset="50%" stopColor="#8b5cf6" stopOpacity={0.15}/>
                            <stop offset="100%" stopColor="#ec4899" stopOpacity={0.00}/>
                          </linearGradient>
                        </defs>
                        
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgb(var(--border-default))" opacity={0.15} />

                        <XAxis 
                          dataKey="dayName" 
                          tickLine={false} 
                          axisLine={false}
                          tick={{ fill: 'rgb(var(--text-secondary))', fontSize: period === 'month' ? 8 : 10, fontWeight: 'bold' }} 
                          dy={10}
                          interval={period === 'month' ? 4 : 0}
                        />

                        <YAxis 
                          tickLine={false} 
                          axisLine={false}
                          width={75}
                          tickFormatter={(val) => val > 0 ? `${fmt(val)}` : ''}
                          tick={{ fill: 'rgb(var(--text-secondary))', fontSize: 10, fontWeight: 'bold', fontFamily: 'JetBrains Mono' }}
                          dx={-10}
                        />

                        <Tooltip
                          cursor={{ stroke: '#8b5cf6', strokeWidth: 1.2, strokeDasharray: '4 4' }}
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              const val = payload[0].value as number;
                              return (
                                <div className="bg-background_secondary/90 border border-primary_blue/30 p-4 rounded-2xl shadow-2xl text-right text-xs relative z-30 min-w-[160px] backdrop-blur-md border-t-4 border-t-primary_blue">
                                  <p className="font-black text-text_primary mb-1 flex items-center gap-1.5">
                                    <span className="w-2.5 h-2.5 rounded-full bg-primary_blue animate-pulse"></span>
                                    {payload[0].payload.dayName}
                                  </p>
                                  <p className="text-text_muted text-3xs mb-2 font-numbers font-medium" dir="ltr">{payload[0].payload.date}</p>
                                  <div className="h-px bg-border_default/40 my-2" />
                                  <p className="text-primary_blue font-black font-numbers text-sm">
                                    المبيعات: {fmt(val)} د.ج
                                  </p>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />

                        <Area 
                          type="monotone" 
                          dataKey="المبيعات" 
                          stroke="#8b5cf6" 
                          strokeWidth={3}
                          fillOpacity={1} 
                          fill="url(#colorSalesPremium)" 
                          dot={period !== 'month'}
                          activeDot={{ r: 6, stroke: '#8b5cf6', strokeWidth: 3, fill: '#fff' }}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  )}
                </div>

                {/* Today's profit footer */}
                <div className="mt-6 pt-4 border-t border-border_default/60 flex justify-between items-center text-xs relative z-10">
                  <div className="flex items-center gap-2">
                    <span className="flex h-2.5 w-2.5 relative">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                    </span>
                    <span className="text-text_secondary font-bold text-2xs">أرباح مبيعات اليوم:</span>
                  </div>
                  <div className="bg-emerald-500/10 border border-emerald-500/15 px-3 py-1.5 rounded-xl">
                    <span className="font-black text-emerald-500 font-numbers text-sm">
                      +{fmt(data.todayProfit)} د.ج
                    </span>
                  </div>
                </div>

              </div>

            </div>

          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
}
