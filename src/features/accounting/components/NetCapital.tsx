import { useState, useEffect, useCallback } from 'react';
import { 
  Wallet, Package, Users, Truck, Scale, 
  RefreshCw, AlertCircle, Info, TrendingUp 
} from 'lucide-react';
import { motion } from 'framer-motion';

interface SimpleReportData {
  cashBalance: number;
  inventoryValue: number;
  receivables: number;
  payables: number;
}

export default function NetCapital() {
  const [data, setData] = useState<SimpleReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const resultPromise = window.electronAPI.invoke('accounting:getSimpleReports', 'month');
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('انتهت مهلة تحميل البيانات المالية (8 ثوانٍ)')), 8000)
      );

      const res = (await Promise.race([resultPromise, timeoutPromise])) as { success: boolean; data?: SimpleReportData; error?: string };
      if (res.success && res.data) {
        setData(res.data);
      } else {
        setError(res.error || 'فشل جلب البيانات المالية.');
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'حدث خطأ غير متوقع.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const fmt = (n: number) => String(Math.round(n || 0));

  if (loading && !data) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-text_muted">
        <div className="w-10 h-10 border-4 border-violet-500/30 border-t-violet-500 rounded-full animate-spin mb-4" />
        <p className="font-bold">جاري حساب وتقدير رأس المال الفعلي...</p>
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

  if (!data) return null;

  const { cashBalance, inventoryValue, receivables, payables } = data;
  const netCapital = cashBalance + inventoryValue + receivables - payables;
  const isCapitalPositive = netCapital >= 0;

  return (
    <div className="w-full pb-6 space-y-6 text-right" dir="rtl">
      
      {/* Header */}
      <div className="flex items-center justify-between bg-background_secondary border border-border_default rounded-2xl p-6">
        <div>
          <h2 className="text-2xl font-black text-text_primary flex items-center gap-2">
            <Scale className="text-violet-500" /> رأس المال الفعلي للمحل
          </h2>
          <p className="text-text_secondary mt-1 text-sm font-bold">
            القيمة التقديرية الحقيقية لمتجرك بناءً على السيولة والمخزون والديون الحالية
          </p>
        </div>
        <button 
          onClick={loadData}
          disabled={loading}
          className="p-2.5 bg-background_primary border border-border_default hover:border-violet-500 text-text_secondary hover:text-violet-500 rounded-xl transition-colors disabled:opacity-50"
        >
          <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Main Massive Capital Banner */}
      <motion.div 
        whileHover={{ y: -4 }}
        className={`w-full bg-gradient-to-br ${
          isCapitalPositive 
            ? 'from-emerald-600 via-emerald-700 to-teal-800 shadow-emerald-500/10 border-emerald-500/30' 
            : 'from-rose-600 via-red-700 to-red-800 shadow-rose-500/10 border-rose-500/30'
        } text-white p-8 rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-300 relative overflow-hidden group border`}
      >
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-white/5 rounded-full blur-2xl group-hover:bg-white/10 transition-all duration-500" />
        <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-black/10 rounded-full blur-3xl" />
        
        <TrendingUp size={240} className="absolute -left-12 -bottom-16 opacity-10 text-white transform -rotate-12 group-hover:scale-110 transition-transform duration-500 pointer-events-none" />
        
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-5 relative z-10">
          <div className="flex flex-col gap-1.5">
            <span className="text-3xs font-black uppercase tracking-widest bg-white/20 text-white px-3 py-1 rounded-full w-fit">
              رصيد متكامل
            </span>
            <p className="text-white/80 text-2xs font-black mt-2">رأس المال الفعلي الفعلي للمحل (Net Worth)</p>
            
            <div className="flex items-baseline gap-1 mt-2" dir="ltr">
              <span className="text-4xl sm:text-6xl font-black font-numbers tracking-tight drop-shadow-md">
                {isCapitalPositive ? `+${fmt(netCapital)}` : `-${fmt(Math.abs(netCapital))}`}
              </span>
              <span className="text-xl sm:text-2xl font-bold opacity-90">د.ج</span>
            </div>

            <div className="flex items-center gap-2 mt-4 text-3xs font-black bg-black/15 w-fit px-4 py-1.5 rounded-2xl">
              <span className={`w-2 h-2 rounded-full ${isCapitalPositive ? 'bg-emerald-400 animate-ping' : 'bg-rose-400'}`} />
              <span className="opacity-95">{isCapitalPositive ? 'أداء مالي وتراكم رأسمالي صحي ومستقر' : 'رأس مال سلبي، يرجى تدارك الديون والمصاريف'}</span>
            </div>
          </div>
          
          <div className="p-6 sm:p-8 bg-white/10 border border-white/10 rounded-3xl group-hover:scale-110 group-hover:rotate-6 transition-all duration-300 shadow-lg">
            <Scale size={48} className="animate-pulse" />
          </div>
        </div>
      </motion.div>

      {/* Grid of Components */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Assets (الأصول للي لينا) */}
        <div className="bg-background_secondary border border-border_default rounded-2xl p-6 space-y-4">
          <h3 className="text-sm font-black text-emerald-600 dark:text-emerald-400 flex items-center gap-2 border-b border-border_default/60 pb-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            الأصول والسيولة (للي لينا)
          </h3>

          <div className="space-y-3">
            <div className="flex justify-between items-center p-3 bg-background_primary border border-border_default rounded-xl">
              <span className="text-xs font-bold text-text_secondary flex items-center gap-2">
                <Wallet size={16} className="text-violet-500" />
                السيولة النقدية (الصندوق)
              </span>
              <span className="font-numbers font-black text-text_primary text-sm">{fmt(cashBalance)} د.ج</span>
            </div>

            <div className="flex justify-between items-center p-3 bg-background_primary border border-border_default rounded-xl">
              <span className="text-xs font-bold text-text_secondary flex items-center gap-2">
                <Package size={16} className="text-blue-500" />
                سلعة المحل في المخزن
              </span>
              <span className="font-numbers font-black text-text_primary text-sm">{fmt(inventoryValue)} د.ج</span>
            </div>

            <div className="flex justify-between items-center p-3 bg-background_primary border border-border_default rounded-xl">
              <span className="text-xs font-bold text-text_secondary flex items-center gap-2">
                <Users size={16} className="text-emerald-500" />
                الكريدي الذي تساله للزبائن
              </span>
              <span className="font-numbers font-black text-text_primary text-sm">{fmt(receivables)} د.ج</span>
            </div>
          </div>
        </div>

        {/* Liabilities (الالتزامات للي علينا) */}
        <div className="bg-background_secondary border border-border_default rounded-2xl p-6 space-y-4">
          <h3 className="text-sm font-black text-rose-600 dark:text-rose-400 flex items-center gap-2 border-b border-border_default/60 pb-2">
            <span className="w-2 h-2 rounded-full bg-rose-500" />
            الخصوم والالتزامات (للي علينا)
          </h3>

          <div className="space-y-3">
            <div className="flex justify-between items-center p-3 bg-background_primary border border-border_default rounded-xl">
              <span className="text-xs font-bold text-text_secondary flex items-center gap-2">
                <Truck size={16} className="text-rose-500" />
                الكريدي للي يسالوهولك الموردين
              </span>
              <span className="font-numbers font-black text-text_primary text-sm">{fmt(payables)} د.ج</span>
            </div>

            <div className="p-4 bg-background_primary/40 border border-dashed border-border_default rounded-xl text-3xs text-text_muted flex items-start gap-2 leading-relaxed">
              <Info size={14} className="text-violet-500 shrink-0 mt-0.5" />
              <p>
                تمثل التزامات الموردين الديون المستحقة مقابل السلع التي تم شراؤها بالأجل. تسديد هذه الديون يقلل السيولة النقدية ولكنه يقلل الالتزامات في نفس الوقت.
              </p>
            </div>
          </div>
        </div>

      </div>

      {/* Explanation Banner */}
      <div className="p-5 bg-background_secondary border border-border_default rounded-2xl flex items-start gap-3">
        <Info size={20} className="text-violet-500 shrink-0 mt-0.5" />
        <div className="text-xs">
          <h4 className="font-black text-text_primary mb-1">كيف يتم حساب رأس المال الفعلي؟</h4>
          <p className="text-text_secondary leading-relaxed font-medium">
            يتم احتساب رأس المال بناءً على المعادلة البسيطة:
            <br />
            <strong className="font-bold text-text_primary inline-block my-1 bg-background_primary px-2.5 py-1 rounded border border-border_default" dir="ltr">
              Net Capital = (Cash + Inventory + Receivables) - Payables
            </strong>
            <br />
            أي نجمع الأموال المتوفرة نقداً مع قيمة مخزون قطع الغيار والديون التي تدين بها للزبائن، ثم نطرح منها ديون الموردين المعلقة. النتيجة هي صافي القيمة المالية لعملك.
          </p>
        </div>
      </div>

    </div>
  );
}
