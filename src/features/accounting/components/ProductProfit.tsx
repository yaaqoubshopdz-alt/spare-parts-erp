import { useState, useEffect, useCallback } from 'react';
import { 
  TrendingUp, ShoppingCart, Calendar, RefreshCw, 
  Award, Search, PieChart as PieIcon, Tag, Download, AlertCircle 
} from 'lucide-react';
import { 
  ResponsiveContainer, PieChart as RechartsPieChart, Pie, Cell, Tooltip 
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';

interface ProductProfitData {
  product_id: number;
  product_name: string;
  category_name: string;
  quantity_sold: number;
  total_revenue: number;
  total_cost: number;
  net_profit: number;
}

interface CategoryProfitData {
  category_id: number;
  category_name: string;
  items_sold: number;
  total_revenue: number;
  total_cost: number;
  net_profit: number;
}

const COLORS = ['#6366f1', '#8b5cf6', '#d946ef', '#10b981', '#06b6d4', '#f59e0b', '#f43f5e'];

// ── Animated Number Component ──
function AnimatedNumber({ value, decimals = 2, prefix = '', suffix = '', className = '' }: { value: number; decimals?: number; prefix?: string; suffix?: string; className?: string }) {
  const [displayVal, setDisplayVal] = useState(0);

  useEffect(() => {
    const start = 0;
    const end = value;
    const duration = 1200; // 1.2 seconds
    const startTime = performance.now();

    let animationFrameId: number;

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Ease-out quad formula
      const easeProgress = progress * (2 - progress);
      
      const currentVal = start + (end - start) * easeProgress;
      setDisplayVal(currentVal);

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(animate);
      }
    };

    animationFrameId = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(animationFrameId);
  }, [value]);

  return <span className={`font-numbers ${className}`}>{prefix}{displayVal.toFixed(decimals)}{suffix}</span>;
}

export default function ProductProfit() {
  // Local Date Filters
  const today = new Date().toISOString().split('T')[0];
  const yearStart = `${new Date().getFullYear()}-01-01`;
  const [dateFrom, setDateFrom] = useState(yearStart);
  const [dateTo, setDateTo] = useState(today);

  // Search filter
  const [searchQuery, setSearchQuery] = useState('');

  // Hidden categories for Pie Chart
  const [hiddenCategories, setHiddenCategories] = useState<string[]>([]);

  // Hover connection between table and chart
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);

  const [productProfits, setProductProfits] = useState<ProductProfitData[]>([]);
  const [categoryProfits, setCategoryProfits] = useState<CategoryProfitData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const resultPromise = window.electronAPI.invoke('accounting:getProductProfitability', {
        date_from: dateFrom,
        date_to: dateTo
      });
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('انتهت مهلة تحميل تقرير ربحية المنتجات (8 ثوانٍ)')), 8000)
      );

      const res = (await Promise.race([resultPromise, timeoutPromise])) as any;
      if (res.success && res.data) {
        setProductProfits(res.data.productProfits || []);
        setCategoryProfits(res.data.categoryProfits || []);
      } else {
        setError(res.error || 'فشل تحميل تقرير ربحية المنتجات.');
      }
    } catch (e: any) {
      setError(e.message || 'حدث خطأ غير متوقع أثناء تحميل البيانات.');
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Formatting helper - No thousands separators
  const fmt = (n: number) => (n || 0).toFixed(2);
  const fmtQty = (n: number) => (n || 0).toFixed(0);

  // Toggle category in hidden list
  const toggleCategory = (categoryName: string) => {
    setHiddenCategories(prev => 
      prev.includes(categoryName)
        ? prev.filter(c => c !== categoryName)
        : [...prev, categoryName]
    );
  };

  // Filter products by search query
  const filteredProducts = productProfits.filter(p => 
    p.product_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.category_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Calculate KPIs
  const championProduct = productProfits[0] || null;
  const bestCategory = categoryProfits[0] || null;

  const totalRevenue = productProfits.reduce((acc, p) => acc + p.total_revenue, 0);
  const totalCost = productProfits.reduce((acc, p) => acc + p.total_cost, 0);
  const totalNetProfit = totalRevenue - totalCost;
  const avgMarginPercent = totalCost > 0 ? (totalNetProfit / totalCost) * 100 : 0;

  // Prepare Pie Chart Data (Filtering out hidden categories)
  const pieData = categoryProfits
    .filter(c => c.net_profit > 0 && !hiddenCategories.includes(c.category_name))
    .map(c => ({
      name: c.category_name,
      value: c.net_profit
    }));

  if (loading && productProfits.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-text_muted">
        <div className="w-10 h-10 border-4 border-violet-500/30 border-t-violet-500 rounded-full animate-spin mb-4" />
        <p className="font-bold">جاري تحميل تقارير الربحية وحساب الهوامش...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-red-500 bg-red-500/5 border border-red-500/20 rounded-3xl max-w-lg mx-auto mt-10" dir="rtl">
        <AlertCircle size={32} className="mb-3" />
        <p className="font-bold mb-4">{error}</p>
        <button 
          onClick={loadData}
          className="px-5 py-2.5 bg-red-500/10 text-red-500 hover:bg-red-500/20 border border-red-500/20 rounded-xl text-xs font-bold transition-all"
        >
          إعادة المحاولة 🔄
        </button>
      </div>
    );
  }

  return (
    <div className="w-full pb-6 space-y-6 text-right font-arabic" dir="rtl">
      
      {/* Header controls block */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between bg-background_secondary border border-border_default rounded-3xl p-5 gap-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-emerald-500/10 text-emerald-500 rounded-2xl">
            <TrendingUp size={22} />
          </div>
          <div>
            <h2 className="text-xl font-black text-text_primary tracking-tight">تقرير ربحية المنتجات والتصنيفات</h2>
            <p className="text-text_secondary text-xs font-bold mt-1">تحليل الأرباح الصافية الحقيقية لقطع الغيار والمجموعات</p>
          </div>
        </div>
        
        {/* Date Filter & Actions */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-background_primary p-1.5 rounded-2xl border border-border_default shadow-sm w-full sm:w-auto justify-center">
            <div className="flex items-center px-3 py-1.5 bg-background_secondary hover:bg-background_card_hover rounded-xl transition-colors cursor-pointer group">
              <Calendar size={14} className="text-violet-500 ml-2 group-hover:scale-110 transition-transform" />
              <input 
                type="date" 
                value={dateFrom} 
                onChange={e => setDateFrom(e.target.value)} 
                className="bg-transparent text-xs font-black font-numbers outline-none text-text_primary cursor-pointer" 
              />
            </div>
            <span className="text-text_muted text-xs font-bold px-1">إلى</span>
            <div className="flex items-center px-3 py-1.5 bg-background_secondary hover:bg-background_card_hover rounded-xl transition-colors cursor-pointer group">
              <input 
                type="date" 
                value={dateTo} 
                onChange={e => setDateTo(e.target.value)} 
                className="bg-transparent text-xs font-black font-numbers outline-none text-text_primary cursor-pointer" 
              />
            </div>
          </div>

          <button 
            onClick={loadData}
            className="p-2.5 bg-background_primary border border-border_default hover:border-violet-500 text-text_secondary hover:text-violet-500 rounded-xl transition-colors"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
          <button className="p-2.5 bg-background_primary border border-border_default hover:border-violet-500 text-text_secondary hover:text-violet-500 rounded-xl transition-colors">
            <Download size={18} />
          </button>
        </div>
      </div>

      {/* KPIs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* KPI 1: Champion Product */}
        <div className="bg-background_secondary border border-border_default rounded-3xl p-5 shadow-sm relative overflow-hidden group">
          <div className="absolute -top-10 -left-10 w-20 h-20 bg-emerald-500/5 group-hover:bg-emerald-500/10 rounded-full blur-xl transition-all duration-300" />
          <div className="flex justify-between items-start mb-3">
            <div className="p-2.5 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded-xl">
              <Award size={18} />
            </div>
            <span className="text-3xs font-bold bg-emerald-500/10 text-emerald-500 px-2 py-0.5 rounded-full">البطل التجاري</span>
          </div>
          <p className="text-text_secondary text-2xs font-bold mb-1">المنتج الأكثر ربحاً</p>
          <h4 className="text-sm font-black text-text_primary truncate mb-1" title={championProduct?.product_name || 'لا يوجد'}>
            {championProduct ? championProduct.product_name : 'لا توجد بيانات مبيعات'}
          </h4>
          {championProduct && (
            <p className="text-xs font-black text-emerald-500">
              +<AnimatedNumber value={championProduct.net_profit} /> د.ج <span className="text-3xs text-text_muted font-bold mr-1">ربح صافي</span>
            </p>
          )}
        </div>

        {/* KPI 2: Best Category */}
        <div className="bg-background_secondary border border-border_default rounded-3xl p-5 shadow-sm relative overflow-hidden group">
          <div className="absolute -top-10 -left-10 w-20 h-20 bg-indigo-500/5 group-hover:bg-indigo-500/10 rounded-full blur-xl transition-all duration-300" />
          <div className="flex justify-between items-start mb-3">
            <div className="p-2.5 bg-indigo-500/10 text-indigo-500 border border-indigo-500/20 rounded-xl">
              <Tag size={18} />
            </div>
            <span className="text-3xs font-bold bg-indigo-500/10 text-indigo-500 px-2 py-0.5 rounded-full">الفئة الذهبية</span>
          </div>
          <p className="text-text_secondary text-2xs font-bold mb-1">التصنيف الأكثر ربحية</p>
          <h4 className="text-sm font-black text-text_primary truncate mb-1">
            {bestCategory ? bestCategory.category_name : 'لا توجد بيانات مبيعات'}
          </h4>
          {bestCategory && (
            <p className="text-xs font-black text-indigo-500">
              +<AnimatedNumber value={bestCategory.net_profit} /> د.ج <span className="text-3xs text-text_muted font-bold mr-1">ربح صافي</span>
            </p>
          )}
        </div>

        {/* KPI 3: Average Profit Margin */}
        <div className="bg-background_secondary border border-border_default rounded-3xl p-5 shadow-sm relative overflow-hidden group">
          <div className="absolute -top-10 -left-10 w-20 h-20 bg-fuchsia-500/5 group-hover:bg-fuchsia-500/10 rounded-full blur-xl transition-all duration-300" />
          <div className="flex justify-between items-start mb-3">
            <div className="p-2.5 bg-fuchsia-500/10 text-fuchsia-500 border border-fuchsia-500/20 rounded-xl">
              <TrendingUp size={18} />
            </div>
            <span className="text-3xs font-bold bg-fuchsia-500/10 text-fuchsia-500 px-2 py-0.5 rounded-full">هامش الأرباح</span>
          </div>
          <p className="text-text_secondary text-2xs font-bold mb-1">متوسط نسبة الهامش المالي</p>
          <h4 className="text-lg font-black text-text_primary mb-1">
            %<AnimatedNumber value={avgMarginPercent} decimals={1} />
          </h4>
          <p className="text-3xs text-text_muted font-bold">نسبة العائد الصافي مقارنة بالتكلفة الإجمالية</p>
        </div>

      </div>

      {/* Revenue Structure Comparative Stacked Bar */}
      {totalRevenue > 0 && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-background_secondary border border-border_default rounded-3xl p-5 shadow-sm"
        >
          <div className="flex justify-between items-center mb-3">
            <span className="text-xs font-black text-text_primary">تحليل هيكلية الإيرادات الإجمالية (التكلفة مقابل الأرباح الصافية)</span>
            <span className="text-3xs font-bold text-text_muted">الإيراد الإجمالي للمبيعات: <AnimatedNumber value={totalRevenue} /> د.ج</span>
          </div>
          
          {/* Stacked Progress Bar */}
          <div className="w-full h-5 bg-border_default/20 rounded-full overflow-hidden flex shadow-inner">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${(totalCost / totalRevenue) * 100}%` }}
              transition={{ duration: 1.2, ease: 'easeOut' }}
              className="h-full bg-slate-400/30 dark:bg-slate-500/40 flex items-center justify-center text-3xs font-bold text-text_secondary select-none relative group/cost"
            >
              <span className="absolute inset-0 bg-gradient-to-r from-transparent to-black/5" />
              <span>التكلفة ({((totalCost / totalRevenue) * 100).toFixed(0)}%)</span>
            </motion.div>
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${(totalNetProfit / totalRevenue) * 100}%` }}
              transition={{ duration: 1.2, ease: 'easeOut', delay: 0.15 }}
              className="h-full bg-gradient-to-r from-emerald-500 to-teal-600 flex items-center justify-center text-3xs font-bold text-white select-none relative shadow-lg"
            >
              <span className="absolute inset-0 bg-white/10 animate-pulse" />
              <span>الأرباح الصافية ({((totalNetProfit / totalRevenue) * 100).toFixed(0)}%)</span>
            </motion.div>
          </div>

          {/* Detailed Labels */}
          <div className="flex justify-between items-center mt-3 text-3xs font-bold text-text_secondary">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded bg-slate-400" />
              <span>تكلفة شراء قطع الغيار: <AnimatedNumber value={totalCost} /> د.ج</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded bg-emerald-500" />
              <span>صافي الأرباح المحققة: <AnimatedNumber value={totalNetProfit} className="text-emerald-500" /> د.ج</span>
            </div>
          </div>
        </motion.div>
      )}

      {/* Category Profits Section (Chart & Table side by side) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-stretch">
        
        {/* Category Share Chart */}
        <div className="xl:col-span-5 bg-background_secondary border border-border_default p-6 rounded-3xl shadow-sm flex flex-col min-h-[340px]">
          <div className="flex items-center gap-2.5 mb-5 border-b border-border_default/40 pb-3">
            <PieIcon size={16} className="text-violet-500" />
            <h3 className="text-xs font-black text-text_primary uppercase tracking-wider">توزيع الأرباح حسب فئة قطعة الغيار</h3>
          </div>
          
          <div className="flex-1 flex items-center justify-center relative min-h-[220px]">
            {pieData.length === 0 ? (
              <p className="text-text_muted text-2xs font-bold">لا توجد بيانات ربح لتشغيل الرسم البياني</p>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <RechartsPieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="45%"
                    innerRadius={60}
                    outerRadius={85}
                    paddingAngle={4}
                    dataKey="value"
                    onMouseEnter={(data) => {
                      if (data && data.name) setHoveredCategory(data.name);
                    }}
                    onMouseLeave={() => setHoveredCategory(null)}
                  >
                    {pieData.map((entry, index) => {
                      const isHovered = hoveredCategory === entry.name;
                      return (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={COLORS[index % COLORS.length]} 
                          opacity={hoveredCategory ? (isHovered ? 1 : 0.4) : 1}
                          style={{ 
                            transition: 'opacity 200ms ease, transform 200ms ease',
                            transform: isHovered ? 'scale(1.04)' : 'scale(1)',
                            transformOrigin: 'center'
                          }}
                        />
                      );
                    })}
                  </Pie>
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-background_secondary border border-border_default p-3 rounded-2xl shadow-xl text-right text-3xs font-bold">
                            <p className="text-text_primary mb-1">{payload[0].name}</p>
                            <p className="text-violet-500 font-numbers font-black">
                              صافي الربح: {fmt(payload[0].value as number)} د.ج
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                </RechartsPieChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Interactive custom legend to filter dominant items */}
          <div className="flex flex-wrap justify-center gap-x-3 gap-y-2 mt-4 text-3xs font-bold">
            {categoryProfits.filter(c => c.net_profit > 0).map((c, idx) => {
              const isHidden = hiddenCategories.includes(c.category_name);
              const color = COLORS[idx % COLORS.length];
              return (
                <button
                  key={idx}
                  onClick={() => toggleCategory(c.category_name)}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-xl transition-all duration-200 border ${
                    isHidden 
                      ? 'bg-border_default/10 text-text_muted line-through border-transparent opacity-50' 
                      : 'bg-background_primary text-text_secondary hover:bg-background_card_hover border-border_default/50'
                  }`}
                  title={isHidden ? 'انقر لإظهار الفئة' : 'انقر لإخفاء الفئة من الرسم البياني'}
                >
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: isHidden ? '#94a3b8' : color }} />
                  <span>{c.category_name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Category Table */}
        <div className="xl:col-span-7 bg-background_secondary border border-border_default p-6 rounded-3xl shadow-sm flex flex-col overflow-hidden">
          <div className="flex items-center justify-between mb-5 border-b border-border_default/40 pb-3">
            <div className="flex items-center gap-2.5">
              <Tag size={16} className="text-violet-500" />
              <h3 className="text-xs font-black text-text_primary uppercase tracking-wider">تحليل ربحية فئات السلع</h3>
            </div>
            <span className="text-3xs font-bold text-text_muted bg-background_primary px-2.5 py-0.5 rounded-lg border border-border_default">
              ترتيب الأرباح
            </span>
          </div>

          <div className="flex-1 overflow-auto custom-scrollbar" style={{ maxHeight: 280 }}>
            <table className="w-full text-right text-sm">
              <thead>
                <tr className="text-text_secondary border-b border-border_default text-2xs font-bold">
                  <th className="p-3">اسم التصنيف</th>
                  <th className="p-3 text-center">القطع المباعة</th>
                  <th className="p-3 text-center">التكلفة</th>
                  <th className="p-3 text-center">الإيراد</th>
                  <th className="p-3 text-center">هامش الربح</th>
                  <th className="p-3 text-left">صافي الأرباح</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border_default/50">
                {categoryProfits.map((c, i) => {
                  const margin = c.total_cost > 0 ? ((c.net_profit / c.total_cost) * 100) : 0;
                  const isHovered = hoveredCategory === c.category_name;
                  return (
                    <tr 
                      key={i} 
                      onMouseEnter={() => setHoveredCategory(c.category_name)}
                      onMouseLeave={() => setHoveredCategory(null)}
                      className={`hover:bg-background_primary/60 transition-colors text-xs cursor-pointer ${
                        isHovered ? 'bg-violet-500/10' : ''
                      }`}
                    >
                      <td className="p-3 font-bold text-text_primary flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                        {c.category_name}
                      </td>
                      <td className="p-3 text-center font-numbers text-text_secondary">{fmtQty(c.items_sold)}</td>
                      <td className="p-3 text-center font-numbers text-text_muted">{fmt(c.total_cost)}</td>
                      <td className="p-3 text-center font-numbers text-text_secondary">{fmt(c.total_revenue)}</td>
                      <td className="p-3 text-center font-numbers text-violet-500 font-bold">%{margin.toFixed(1)}</td>
                      <td className="p-3 text-left font-numbers font-black text-emerald-500">+{fmt(c.net_profit)} د.ج</td>
                    </tr>
                  );
                })}
                {categoryProfits.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-text_muted text-xs">لا توجد بيانات ربحية للتصنيفات حالياً.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* Product Profit Table - Full width */}
      <div className="bg-background_secondary border border-border_default p-6 rounded-3xl shadow-sm flex flex-col overflow-hidden">
        
        {/* Table Title + Search */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5 border-b border-border_default/40 pb-4">
          <div className="flex items-center gap-2.5">
            <ShoppingCart size={16} className="text-violet-500" />
            <h3 className="text-xs font-black text-text_primary uppercase tracking-wider">تفصيل ربحية قطع الغيار الفردية</h3>
          </div>

          <div className="relative w-full md:w-80">
            <span className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-text_muted">
              <Search size={14} />
            </span>
            <input 
              type="text" 
              placeholder="ابحث عن قطعة غيار أو تصنيف..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full text-xs font-bold pr-9 pl-4 py-2 bg-background_primary border border-border_default/80 focus:border-violet-500/40 rounded-xl text-text_primary outline-none transition-colors"
            />
          </div>
        </div>

        {/* Table View */}
        <div className="overflow-auto custom-scrollbar" style={{ maxHeight: 350 }}>
          <table className="w-full text-right text-sm">
            <thead>
              <tr className="text-text_secondary border-b border-border_default text-2xs font-bold">
                <th className="p-3">اسم المنتج / قطعة الغيار</th>
                <th className="p-3">التصنيف</th>
                <th className="p-3 text-center">الكمية المباعة</th>
                <th className="p-3 text-center">تكلفة الشراء</th>
                <th className="p-3 text-center">إجمالي المبيعات</th>
                <th className="p-3 text-center">هامش الربح</th>
                <th className="p-3 text-left">صافي الأرباح</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border_default/50">
              {filteredProducts.map((p, i) => {
                const margin = p.total_cost > 0 ? ((p.net_profit / p.total_cost) * 100) : 0;
                return (
                  <tr key={i} className="hover:bg-background_primary/60 transition-colors text-xs">
                    <td className="p-3 font-bold text-text_primary max-w-xs truncate" title={p.product_name}>{p.product_name}</td>
                    <td className="p-3 text-text_secondary font-medium">{p.category_name}</td>
                    <td className="p-3 text-center font-numbers text-text_secondary">{fmtQty(p.quantity_sold)}</td>
                    <td className="p-3 text-center font-numbers text-text_muted">{fmt(p.total_cost)}</td>
                    <td className="p-3 text-center font-numbers text-text_secondary">{fmt(p.total_revenue)}</td>
                    <td className="p-3 text-center font-numbers text-violet-500 font-bold">%{margin.toFixed(1)}</td>
                    <td className="p-3 text-left font-numbers font-black text-emerald-500">+{fmt(p.net_profit)} د.ج</td>
                  </tr>
                );
              })}
              {filteredProducts.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-text_muted text-xs">لا توجد منتجات مطابقة لعملية البحث.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
