import { useState, useEffect } from 'react';
import { TrendingUp, Download, PieChart, ArrowUpRight, ArrowDownRight, Activity } from 'lucide-react';

export default function ProfitAndLoss({ dateFrom, dateTo }: { dateFrom: string; dateTo: string }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [dateFrom, dateTo]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const resultPromise = window.electronAPI.invoke('accounting:getProfitAndLoss', { date_from: dateFrom, date_to: dateTo });
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('انتهت مهلة تحميل الأرباح والخسائر المحددة (8 ثوانٍ)')), 8000)
      );

      const res = (await Promise.race([resultPromise, timeoutPromise])) as any;
      if (res.success) {
        setData(res.data);
      } else {
        setError(res.error || 'فشل جلب قائمة الأرباح والخسائر.');
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
        <p className="font-bold">جاري حساب الأرباح والخسائر للفترة...</p>
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
        <TrendingUp size={48} className="text-violet-500/45 mb-4" />
        <h4 className="font-black text-text_primary mb-2">عرض قائمة الأرباح والخسائر</h4>
        <p className="text-text_secondary text-xs text-center mb-6">
          انقر أدناه لحساب الإيرادات وتكلفة المبيعات والمصروفات وحساب صافي الأرباح.
        </p>
        <button 
          onClick={loadData}
          className="flex items-center justify-center gap-2 px-6 py-3 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-sm font-black transition-all shadow-md shadow-violet-500/10"
        >
          تحميل قائمة الدخل 🔄
        </button>
      </div>
    );
  }

  const isProfitable = data.netProfit >= 0;

  return (
    <div className="max-w-4xl mx-auto pb-6 space-y-6">
      
      {/* Header Info */}
      <div className="flex items-center justify-between bg-background_secondary border border-border_default rounded-2xl p-6">
        <div>
          <h2 className="text-2xl font-black text-text_primary flex items-center gap-2">
            <TrendingUp className="text-violet-500" /> قائمة الدخل (Profit & Loss)
          </h2>
          <p className="text-text_secondary font-numbers mt-1 text-sm font-bold">
            للفترة من {dateFrom} إلى {dateTo}
          </p>
        </div>
        <button className="p-2 bg-background_primary border border-border_default hover:border-violet-500 text-text_secondary hover:text-violet-500 rounded-xl transition-colors">
          <Download size={20} />
        </button>
      </div>

      {/* Main KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-background_secondary border border-border_default rounded-2xl p-5">
          <div className="flex items-center gap-2 text-text_secondary font-bold mb-2 text-sm">
            <ArrowUpRight size={18} className="text-emerald-500" /> إجمالي الإيرادات
          </div>
          <div className="text-2xl font-black font-numbers text-text_primary">{fmt(data.totalRevenue)} د.ج</div>
        </div>
        
        <div className="bg-background_secondary border border-border_default rounded-2xl p-5">
          <div className="flex items-center gap-2 text-text_secondary font-bold mb-2 text-sm">
            <ArrowDownRight size={18} className="text-danger_red" /> إجمالي المصروفات (مع التكلفة)
          </div>
          <div className="text-2xl font-black font-numbers text-text_primary">{fmt(data.totalCogs + data.totalExpenses)} د.ج</div>
        </div>

        <div className={`border rounded-2xl p-5 relative overflow-hidden ${isProfitable ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-danger_red/10 border-danger_red/30'}`}>
          <div className={`absolute -right-4 -top-4 w-20 h-20 rounded-full blur-2xl opacity-50 ${isProfitable ? 'bg-emerald-500' : 'bg-danger_red'}`} />
          <div className={`flex items-center gap-2 font-bold mb-2 text-sm relative z-10 ${isProfitable ? 'text-emerald-600' : 'text-danger_red'}`}>
            <Activity size={18} /> صافي الربح التقديري
          </div>
          <div className={`text-2xl font-black font-numbers relative z-10 ${isProfitable ? 'text-emerald-600' : 'text-danger_red'}`}>
            {fmt(data.netProfit)} د.ج
          </div>
        </div>
      </div>

      {/* Detailed P&L Statement */}
      <div className="bg-background_secondary border border-border_default rounded-2xl overflow-hidden flex flex-col">
        <div className="p-4 border-b border-border_default bg-background_primary/50 flex items-center gap-2">
          <PieChart size={18} className="text-violet-500" />
          <h3 className="font-black text-text_primary">التفاصيل التحليلية لقائمة الدخل</h3>
        </div>

        <div className="p-4 space-y-6">
          
          {/* 1. Revenues */}
          <div>
            <h4 className="font-bold text-text_secondary mb-2 border-b border-border_default pb-2">1. الإيرادات (Revenues)</h4>
            <div className="space-y-1">
              {data.revenue.map((a: any) => (
                <div key={a.id} className="flex justify-between items-center p-2 hover:bg-background_primary/50 rounded-lg">
                  <span className="text-text_primary font-bold text-sm">{a.name}</span>
                  <span className="font-numbers text-text_primary font-bold">{fmt(a.balance)}</span>
                </div>
              ))}
              {data.revenue.length === 0 && <div className="p-2 text-text_muted text-sm italic">لا توجد إيرادات مسجلة</div>}
            </div>
            <div className="flex justify-between items-center p-3 bg-emerald-500/5 text-emerald-600 rounded-xl mt-2 font-black">
              <span>إجمالي الإيرادات المبيعات</span>
              <span className="font-numbers">{fmt(data.totalRevenue)}</span>
            </div>
          </div>

          {/* 2. COGS */}
          <div>
            <h4 className="font-bold text-text_secondary mb-2 border-b border-border_default pb-2">2. تكلفة البضاعة المباعة (COGS)</h4>
            <div className="space-y-1">
              {data.cogs.map((a: any) => (
                <div key={a.id} className="flex justify-between items-center p-2 hover:bg-background_primary/50 rounded-lg">
                  <span className="text-text_primary font-bold text-sm">{a.name}</span>
                  <span className="font-numbers text-text_primary font-bold">{fmt(a.balance)}</span>
                </div>
              ))}
              {data.cogs.length === 0 && <div className="p-2 text-text_muted text-sm italic">لا توجد تكلفة مسجلة (التقييم مستمر)</div>}
            </div>
            <div className="flex justify-between items-center p-3 bg-orange-500/5 text-orange-600 rounded-xl mt-2 font-black">
              <span>إجمالي تكلفة المبيعات</span>
              <span className="font-numbers">{fmt(data.totalCogs)}</span>
            </div>
          </div>

          {/* GROSS PROFIT */}
          <div className="flex justify-between items-center p-4 bg-primary_blue/10 border border-primary_blue/20 text-primary_blue rounded-xl font-black shadow-sm">
            <span className="text-lg">الربح الإجمالي (Gross Profit)</span>
            <span className="text-xl font-numbers">{fmt(data.grossProfit)} د.ج</span>
          </div>

          {/* 3. Operating Expenses */}
          <div>
            <h4 className="font-bold text-text_secondary mb-2 border-b border-border_default pb-2">3. المصروفات التشغيلية (Operating Expenses)</h4>
            <div className="space-y-1">
              {data.expenses.map((a: any) => (
                <div key={a.id} className="flex justify-between items-center p-2 hover:bg-background_primary/50 rounded-lg">
                  <span className="text-text_primary font-bold text-sm">{a.name}</span>
                  <span className="font-numbers text-text_primary font-bold">{fmt(a.balance)}</span>
                </div>
              ))}
              {data.expenses.length === 0 && <div className="p-2 text-text_muted text-sm italic">لا توجد مصروفات مسجلة</div>}
            </div>
            <div className="flex justify-between items-center p-3 bg-danger_red/5 text-danger_red rounded-xl mt-2 font-black">
              <span>إجمالي المصروفات التشغيلية</span>
              <span className="font-numbers">{fmt(data.totalExpenses)}</span>
            </div>
          </div>

          {/* NET PROFIT */}
          <div className={`flex justify-between items-center p-4 border rounded-xl font-black shadow-sm ${isProfitable ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-600' : 'bg-danger_red/20 border-danger_red/40 text-danger_red'}`}>
            <span className="text-xl">صافي الربح / الخسارة (Net Income)</span>
            <span className="text-2xl font-numbers">{fmt(data.netProfit)} د.ج</span>
          </div>

        </div>
      </div>

    </div>
  );
}
