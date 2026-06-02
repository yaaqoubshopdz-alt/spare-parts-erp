import { useState, useEffect, useCallback } from 'react';
import { TrendingDown, Download, Wallet, ArrowUp, ArrowDown, Calendar, RefreshCw } from 'lucide-react';
import { 
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid 
} from 'recharts';
import { motion } from 'framer-motion';

export default function CashFlowStatement() {
  // Local Date Filters
  const today = new Date().toISOString().split('T')[0];
  const yearStart = `${new Date().getFullYear()}-01-01`;
  const [dateFrom, setDateFrom] = useState(yearStart);
  const [dateTo, setDateTo] = useState(today);

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const resultPromise = window.electronAPI.invoke('accounting:getCashFlow', { date_from: dateFrom, date_to: dateTo });
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('انتهت مهلة تحميل التدفقات النقدية المحددة (8 ثوانٍ)')), 8000)
      );

      const res = (await Promise.race([resultPromise, timeoutPromise])) as any;
      if (res.success) {
        setData(res.data);
      } else {
        setError(res.error || 'فشل جلب قائمة التدفقات النقدية.');
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

  // Remove thousands separators - use standard fixed decimals
  const fmt = (n: number) => (n || 0).toFixed(2);

  if (loading && !data) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-text_muted">
        <div className="w-10 h-10 border-4 border-violet-500/30 border-t-violet-500 rounded-full animate-spin mb-4" />
        <p className="font-bold">جاري تحميل وتجميع التدفقات النقدية...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-red-500 bg-red-500/5 border border-red-500/20 rounded-3xl max-w-lg mx-auto mt-10" dir="rtl">
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

  if (!data && !loading && !error) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-text_muted bg-background_secondary border border-border_default rounded-3xl max-w-lg mx-auto mt-10 text-right" dir="rtl">
        <TrendingDown size={48} className="text-violet-500/45 mb-4" />
        <h4 className="font-black text-text_primary mb-2">لا توجد بيانات</h4>
        <p className="text-text_secondary text-xs text-center">
          لا توجد بيانات للتدفقات النقدية مسجلة لهذه الفترة.
        </p>
      </div>
    );
  }

  const isNetPositive = data.operating.net >= 0;
  const chartData = data.dailyFlows || [];
  const hasChartData = chartData.length > 0;

  return (
    <div className="w-full pb-6 space-y-6 text-right font-arabic" dir="rtl">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between bg-background_secondary border border-border_default rounded-3xl p-5 gap-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-rose-500/10 text-rose-500 rounded-2xl">
            <TrendingDown size={22} />
          </div>
          <div>
            <h2 className="text-xl font-black text-text_primary tracking-tight">قائمة التدفقات النقدية (Cash Flow)</h2>
            <p className="text-text_secondary text-xs font-bold mt-1">حساب المقبوضات والمدفوعات الفعلي للصندوق</p>
          </div>
        </div>
        
        {/* Local Date Range Selection next to cash flow statement title */}
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

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-stretch">
        
        {/* Core Breakdown */}
        <div className="xl:col-span-7 bg-background_secondary border border-border_default rounded-3xl p-6 flex flex-col justify-between shadow-sm">
          <div className="space-y-4">
            <div className="flex justify-between items-center p-4 bg-background_primary border border-border_default rounded-2xl">
              <span className="font-bold text-text_secondary flex items-center gap-2">
                <Wallet size={18} className="text-violet-500"/> رصيد الصندوق (بداية الفترة)
              </span>
              <span className="font-numbers font-black text-text_primary text-lg">{fmt(data.opening_cash)} د.ج</span>
            </div>

            <div className="pl-4 border-l-2 border-border_default/70 space-y-3">
              <div className="flex justify-between items-center p-3 hover:bg-background_primary/50 rounded-xl transition-colors">
                <span className="font-bold text-text_primary flex items-center gap-2 text-xs">
                  <ArrowUp size={16} className="text-emerald-500" /> المقبوضات (مبيعات وغيرها)
                </span>
                <span className="font-numbers text-emerald-500 font-bold">+{fmt(data.operating.cash_from_sales)}</span>
              </div>
              <div className="flex justify-between items-center p-3 hover:bg-background_primary/50 rounded-xl transition-colors">
                <span className="font-bold text-text_primary flex items-center gap-2 text-xs">
                  <ArrowDown size={16} className="text-danger_red" /> المدفوعات (مشتريات وموردين)
                </span>
                <span className="font-numbers text-danger_red font-bold">-{fmt(data.operating.cash_to_purchases)}</span>
              </div>
              <div className="flex justify-between items-center p-3 hover:bg-background_primary/50 rounded-xl transition-colors">
                <span className="font-bold text-text_primary flex items-center gap-2 text-xs">
                  <ArrowDown size={16} className="text-orange-500" /> مدفوعات المصروفات
                </span>
                <span className="font-numbers text-orange-500 font-bold">-{fmt(data.operating.cash_to_expenses)}</span>
              </div>
            </div>
            
            <div className={`flex justify-between items-center p-4 border rounded-2xl font-black shadow-sm ${isNetPositive ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600' : 'bg-danger_red/10 border-danger_red/20 text-danger_red'}`}>
              <span>صافي التدفق النقدي للفترة</span>
              <span className="font-numbers">{isNetPositive ? '+' : ''}{fmt(data.operating.net)} د.ج</span>
            </div>
          </div>
        </div>

        {/* Closing Status */}
        <div className="xl:col-span-5 bg-background_secondary border border-border_default rounded-3xl p-6 flex flex-col justify-center items-center text-center relative overflow-hidden group shadow-sm">
          <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 to-primary_blue/5 z-0" />
          <div className="relative z-10 w-full">
            <div className="w-20 h-20 bg-background_primary border border-border_default rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm group-hover:scale-110 transition-transform">
              <Wallet size={32} className="text-violet-500" />
            </div>
            <h3 className="text-text_secondary font-bold mb-2">الرصيد الختامي للصندوق</h3>
            <p className="text-xs text-text_muted mb-4">(نهاية الفترة المحددة)</p>
            <div className="text-3xl font-black font-numbers text-text_primary">
              {fmt(data.closing_cash)} <span className="text-sm text-text_muted">د.ج</span>
            </div>
          </div>
        </div>

      </div>

      {/* ── Cash Flow Trend Chart ── */}
      <div className="bg-background_secondary border border-border_default p-6 rounded-3xl shadow-sm flex flex-col min-h-[380px]">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-rose-500/10 text-rose-500 rounded-xl">
              <TrendingDown size={16} />
            </div>
            <h3 className="text-xs font-black text-text_primary uppercase tracking-wider">الرسم البياني لحركة التدفقات النقدية اليومية</h3>
          </div>
          <span className="text-3xs font-bold text-text_muted bg-background_primary px-2.5 py-1 rounded-full border border-border_default">
            منحنى المقبوضات والمدفوعات
          </span>
        </div>

        <div className="flex-1 w-full relative z-10" style={{ minHeight: 280 }}>
          {!hasChartData ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-text_muted/70 bg-background_primary/20 rounded-2xl border border-dashed border-border_default/80 p-6">
              <TrendingDown size={36} className="text-rose-500/35 mb-2 animate-pulse" />
              <p className="text-2xs font-bold">لا يوجد حركة صندوق مسجلة لهذه الفترة.</p>
              <p className="text-3xs mt-0.5">ستظهر حركات المقبوضات والمدفوعات هنا بمجرد تسجيل مبيعات أو مشتريات.</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart
                data={chartData}
                margin={{ top: 20, right: 25, left: 15, bottom: 10 }}
              >
                <defs>
                  <linearGradient id="colorInflows" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="100%" stopColor="#10b981" stopOpacity={0.00}/>
                  </linearGradient>
                  <linearGradient id="colorOutflows" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ef4444" stopOpacity={0.3}/>
                    <stop offset="100%" stopColor="#ef4444" stopOpacity={0.00}/>
                  </linearGradient>
                </defs>
                
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgb(var(--border-default))" opacity={0.15} />

                <XAxis 
                  dataKey="date" 
                  tickLine={false} 
                  axisLine={false}
                  tick={{ fill: 'rgb(var(--text-secondary))', fontSize: 9, fontWeight: 'bold' }} 
                  dy={10}
                />

                <YAxis 
                  tickLine={false} 
                  axisLine={false}
                  width={75}
                  tickFormatter={(val) => val > 0 ? `${fmt(val)}` : ''}
                  tick={{ fill: 'rgb(var(--text-secondary))', fontSize: 9, fontWeight: 'bold', fontFamily: 'JetBrains Mono' }}
                  dx={-10}
                />

                <Tooltip
                  cursor={{ stroke: '#8b5cf6', strokeWidth: 1.2, strokeDasharray: '4 4' }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const inflowVal = payload[0]?.value as number || 0;
                      const outflowVal = payload[1]?.value as number || 0;
                      return (
                        <div className="bg-background_secondary/95 border border-border_default p-4 rounded-2xl shadow-2xl text-right text-xs relative z-30 min-w-[180px] backdrop-blur-md">
                          <p className="font-black text-text_primary mb-2 flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-violet-500"></span>
                            التاريخ: {payload[0]?.payload?.date}
                          </p>
                          <div className="h-px bg-border_default/40 my-2" />
                          <p className="text-emerald-500 font-black font-numbers mb-1">
                            المقبوضات (+): {fmt(inflowVal)} د.ج
                          </p>
                          <p className="text-danger_red font-black font-numbers">
                            المدفوعات (-): {fmt(outflowVal)}  د.ج
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />

                <Area 
                  type="monotone" 
                  dataKey="inflow" 
                  stroke="#10b981" 
                  strokeWidth={2.5}
                  fillOpacity={1} 
                  fill="url(#colorInflows)" 
                  name="المقبوضات"
                  activeDot={{ r: 5, stroke: '#10b981', strokeWidth: 2, fill: '#fff' }}
                />

                <Area 
                  type="monotone" 
                  dataKey="outflow" 
                  stroke="#ef4444" 
                  strokeWidth={2.5}
                  fillOpacity={1} 
                  fill="url(#colorOutflows)" 
                  name="المدفوعات"
                  activeDot={{ r: 5, stroke: '#ef4444', strokeWidth: 2, fill: '#fff' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}
