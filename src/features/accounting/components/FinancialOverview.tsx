import { useState, useEffect } from 'react';
import { Wallet, Package, Users, Truck, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';

interface OverviewData {
  currentCash: number;
  inventoryValue: number;
  receivables: number;
  payables: number;
  periodSales: number;
  periodProfit: number;
  periodExpenses: number;
}

export default function FinancialOverview({ dateFrom, dateTo }: { dateFrom: string; dateTo: string }) {
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [dateFrom, dateTo]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const resultPromise = window.electronAPI.invoke('accounting:getFinancialOverview', { date_from: dateFrom, date_to: dateTo });
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('انتهت مهلة جلب البيانات المحددة (8 ثوانٍ)')), 8000)
      );

      const res = (await Promise.race([resultPromise, timeoutPromise])) as any;
      if (res.success) {
        setData(res.data);
      } else {
        setError(res.error || 'فشل جلب النظرة المالية.');
      }
    } catch (e: any) {
      setError(e.message || 'حدث خطأ غير متوقع أثناء تحميل البيانات.');
    } finally {
      setLoading(false);
    }
  };

  const fmt = (n: number) => (n || 0).toLocaleString('en-DZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-text_muted">
        <div className="w-10 h-10 border-4 border-violet-500/30 border-t-violet-500 rounded-full animate-spin mb-4" />
        <p className="font-bold">جاري تحميل النظرة المالية للفترة...</p>
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

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-text_muted bg-background_secondary border border-border_default rounded-3xl max-w-lg mx-auto mt-10 text-right" dir="rtl">
        <Wallet size={48} className="text-violet-500/45 mb-4" />
        <h4 className="font-black text-text_primary mb-2">عرض النظرة المالية الشاملة</h4>
        <p className="text-text_secondary text-xs text-center mb-6">
          انقر أدناه لبدء عملية معالجة وتحميل الأرصدة والبيانات المالية للفترة المحددة.
        </p>
        <button 
          onClick={loadData}
          className="flex items-center justify-center gap-2 px-6 py-3 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-sm font-black transition-all shadow-md shadow-violet-500/10"
        >
          تحميل البيانات المباشرة 🔄
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-6 text-right" dir="rtl">
      {/* 1. Top Core KPIs (Liquidity & Assets) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Cash */}
        <div className="bg-background_secondary border border-border_default rounded-2xl p-5 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl -mr-10 -mt-10 transition-transform group-hover:scale-110" />
          <div className="flex justify-between items-start mb-4 relative z-10">
            <div className="p-2.5 bg-emerald-500/10 rounded-xl">
              <Wallet size={24} className="text-emerald-500" />
            </div>
          </div>
          <p className="text-text_secondary text-sm font-bold mb-1 relative z-10">رصيد الصندوق (سيولة)</p>
          <h3 className="text-2xl font-black text-text_primary font-numbers relative z-10 tracking-tight">
            {fmt(data.currentCash)} <span className="text-sm font-bold text-text_muted">د.ج</span>
          </h3>
        </div>

        {/* Inventory Value */}
        <div className="bg-background_secondary border border-border_default rounded-2xl p-5 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary_blue/5 rounded-full blur-3xl -mr-10 -mt-10 transition-transform group-hover:scale-110" />
          <div className="flex justify-between items-start mb-4 relative z-10">
            <div className="p-2.5 bg-primary_blue/10 rounded-xl">
              <Package size={24} className="text-primary_blue" />
            </div>
          </div>
          <p className="text-text_secondary text-sm font-bold mb-1 relative z-10">قيمة المخزون</p>
          <h3 className="text-2xl font-black text-text_primary font-numbers relative z-10 tracking-tight">
            {fmt(data.inventoryValue)} <span className="text-sm font-bold text-text_muted">د.ج</span>
          </h3>
        </div>

        {/* Receivables (Customers Debt) */}
        <div className="bg-background_secondary border border-border_default rounded-2xl p-5 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-warning_amber/5 rounded-full blur-3xl -mr-10 -mt-10 transition-transform group-hover:scale-110" />
          <div className="flex justify-between items-start mb-4 relative z-10">
            <div className="p-2.5 bg-warning_amber/10 rounded-xl">
              <Users size={24} className="text-warning_amber" />
            </div>
          </div>
          <p className="text-text_secondary text-sm font-bold mb-1 relative z-10">ديون الزبائن (لنا)</p>
          <h3 className="text-2xl font-black text-text_primary font-numbers relative z-10 tracking-tight">
            {fmt(data.receivables)} <span className="text-sm font-bold text-text_muted">د.ج</span>
          </h3>
        </div>

        {/* Payables (Suppliers Debt) */}
        <div className="bg-background_secondary border border-border_default rounded-2xl p-5 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-danger_red/5 rounded-full blur-3xl -mr-10 -mt-10 transition-transform group-hover:scale-110" />
          <div className="flex justify-between items-start mb-4 relative z-10">
            <div className="p-2.5 bg-danger_red/10 rounded-xl">
              <Truck size={24} className="text-danger_red" />
            </div>
          </div>
          <p className="text-text_secondary text-sm font-bold mb-1 relative z-10">ديون الموردين (علينا)</p>
          <h3 className="text-2xl font-black text-text_primary font-numbers relative z-10 tracking-tight">
            {fmt(data.payables)} <span className="text-sm font-bold text-text_muted">د.ج</span>
          </h3>
        </div>

      </div>

      {/* 2. Period Performance (Filtered by Date) */}
      <h2 className="text-lg font-black text-text_primary mt-8 mb-4">أداء الفترة المحددة</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* Period Sales */}
        <div className="bg-background_secondary border border-border_default rounded-2xl p-6 flex items-center gap-5">
          <div className="p-3 bg-violet-500/10 rounded-xl border border-violet-500/20 shrink-0">
            <DollarSign size={28} className="text-violet-500" />
          </div>
          <div>
            <p className="text-text_secondary text-sm font-bold mb-1">المبيعات الإجمالية</p>
            <h3 className="text-xl font-black text-text_primary font-numbers">
              {fmt(data.periodSales)} <span className="text-sm font-bold text-text_muted">د.ج</span>
            </h3>
          </div>
        </div>

        {/* Period Expenses */}
        <div className="bg-background_secondary border border-border_default rounded-2xl p-6 flex items-center gap-5">
          <div className="p-3 bg-danger_red/10 rounded-xl border border-danger_red/20 shrink-0">
            <TrendingDown size={28} className="text-danger_red" />
          </div>
          <div>
            <p className="text-text_secondary text-sm font-bold mb-1">المصروفات التشغيلية</p>
            <h3 className="text-xl font-black text-text_primary font-numbers">
              {fmt(data.periodExpenses)} <span className="text-sm font-bold text-text_muted">د.ج</span>
            </h3>
          </div>
        </div>

        {/* Period Net Profit */}
        <div className="bg-background_secondary border border-border_default rounded-2xl p-6 flex items-center gap-5">
          <div className={`p-3 rounded-xl border shrink-0 ${data.periodProfit >= 0 ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-danger_red/10 border-danger_red/20'}`}>
            <TrendingUp size={28} className={data.periodProfit >= 0 ? 'text-emerald-500' : 'text-danger_red'} />
          </div>
          <div>
            <p className="text-text_secondary text-sm font-bold mb-1">صافي الربح التقديري</p>
            <h3 className={`text-xl font-black font-numbers ${data.periodProfit >= 0 ? 'text-emerald-500' : 'text-danger_red'}`}>
              {fmt(data.periodProfit)} <span className="text-sm font-bold text-text_muted">د.ج</span>
            </h3>
          </div>
        </div>

      </div>

    </div>
  );
}
