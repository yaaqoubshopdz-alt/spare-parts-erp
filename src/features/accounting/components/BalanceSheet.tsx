import { useState, useEffect } from 'react';
import { Scale, Download } from 'lucide-react';

export default function BalanceSheet({ dateTo }: { dateTo: string }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (data) {
      loadData();
    }
  }, [dateTo]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const resultPromise = window.electronAPI.invoke('accounting:getBalanceSheet', dateTo);
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('انتهت مهلة تحميل الميزانية العمومية المحددة (8 ثوانٍ)')), 8000)
      );

      const res = (await Promise.race([resultPromise, timeoutPromise])) as any;
      if (res.success) {
        setData(res.data);
      } else {
        setError(res.error || 'فشل جلب الميزانية العمومية.');
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
        <p className="font-bold">جاري تحميل الميزانية العمومية...</p>
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
        <Scale size={48} className="text-violet-500/45 mb-4" />
        <h4 className="font-black text-text_primary mb-2">تحميل الميزانية العمومية</h4>
        <p className="text-text_secondary text-xs text-center mb-6">
          انقر أدناه لبدء حساب وتجميع الأصول والخصوم وحقوق الملكية للنشاط التجاري.
        </p>
        <button 
          onClick={loadData}
          className="flex items-center justify-center gap-2 px-6 py-3 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-sm font-black transition-all shadow-md shadow-violet-500/10"
        >
          تحميل الميزانية العمومية 🔄
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto pb-6 space-y-6">
      {/* Header Info */}
      <div className="flex items-center justify-between bg-background_secondary border border-border_default rounded-2xl p-6">
        <div>
          <h2 className="text-2xl font-black text-text_primary flex items-center gap-2">
            <Scale className="text-violet-500" /> الميزانية العمومية (Balance Sheet)
          </h2>
          <p className="text-text_secondary font-numbers mt-1">كما في تاريخ: {dateTo}</p>
        </div>
        <div className="flex gap-4 items-center">
          <div className={`px-4 py-2 rounded-xl border font-bold flex items-center gap-2 ${data.is_balanced ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' : 'bg-danger_red/10 border-danger_red/20 text-danger_red'}`}>
            <span className="relative flex h-3 w-3">
              {data.is_balanced && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>}
              <span className={`relative inline-flex rounded-full h-3 w-3 ${data.is_balanced ? 'bg-emerald-500' : 'bg-danger_red'}`}></span>
            </span>
            {data.is_balanced ? 'متوازنة' : 'غير متوازنة!'}
          </div>
          <button className="p-2 bg-background_primary border border-border_default hover:border-violet-500 text-text_secondary hover:text-violet-500 rounded-xl transition-colors">
            <Download size={20} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Assets (الأصول) */}
        <div className="bg-background_secondary border border-border_default rounded-2xl flex flex-col overflow-hidden">
          <div className="p-4 border-b border-border_default bg-emerald-500/5">
            <h3 className="text-lg font-black text-emerald-500">الأصول (Assets)</h3>
          </div>
          <div className="p-4 space-y-2 flex-1">
            {data.assets.accounts.map((a: any) => (
              <div key={a.id} className="flex justify-between items-center p-3 hover:bg-background_primary/50 rounded-xl transition-colors">
                <div className="flex flex-col">
                  <span className="font-bold text-text_primary">{a.name}</span>
                  <span className="text-xs text-text_muted font-numbers">{a.code}</span>
                </div>
                <span className="font-numbers font-bold text-text_primary">{fmt(a.balance)}</span>
              </div>
            ))}
          </div>
          <div className="p-4 border-t border-border_default bg-emerald-500/10 flex justify-between items-center">
            <span className="font-black text-emerald-600">إجمالي الأصول</span>
            <span className="font-black font-numbers text-emerald-600 text-lg">{fmt(data.assets.total)} د.ج</span>
          </div>
        </div>

        {/* Liabilities & Equity */}
        <div className="space-y-6 flex flex-col">
          
          {/* Liabilities (الخصوم) */}
          <div className="bg-background_secondary border border-border_default rounded-2xl flex flex-col overflow-hidden">
            <div className="p-4 border-b border-border_default bg-danger_red/5">
              <h3 className="text-lg font-black text-danger_red">الخصوم (Liabilities)</h3>
            </div>
            <div className="p-4 space-y-2">
              {data.liabilities.accounts.map((a: any) => (
                <div key={a.id} className="flex justify-between items-center p-3 hover:bg-background_primary/50 rounded-xl transition-colors">
                  <div className="flex flex-col">
                    <span className="font-bold text-text_primary">{a.name}</span>
                    <span className="text-xs text-text_muted font-numbers">{a.code}</span>
                  </div>
                  <span className="font-numbers font-bold text-text_primary">{fmt(a.balance)}</span>
                </div>
              ))}
            </div>
            <div className="p-4 border-t border-border_default bg-danger_red/10 flex justify-between items-center">
              <span className="font-black text-danger_red">إجمالي الخصوم</span>
              <span className="font-black font-numbers text-danger_red text-lg">{fmt(data.liabilities.total)} د.ج</span>
            </div>
          </div>

          {/* Equity (حقوق الملكية) */}
          <div className="bg-background_secondary border border-border_default rounded-2xl flex flex-col overflow-hidden">
            <div className="p-4 border-b border-border_default bg-violet-500/5">
              <h3 className="text-lg font-black text-violet-500">حقوق الملكية (Equity)</h3>
            </div>
            <div className="p-4 space-y-2">
              {data.equity.accounts.map((a: any) => (
                <div key={a.id} className="flex justify-between items-center p-3 hover:bg-background_primary/50 rounded-xl transition-colors">
                  <div className="flex flex-col">
                    <span className="font-bold text-text_primary">{a.name}</span>
                    <span className="text-xs text-text_muted font-numbers">{a.code}</span>
                  </div>
                  <span className="font-numbers font-bold text-text_primary">{fmt(a.balance)}</span>
                </div>
              ))}
              
              {/* Net Income Line */}
              <div className="flex justify-between items-center p-3 bg-background_primary border border-border_default rounded-xl">
                <span className="font-bold text-text_primary flex items-center gap-2">
                  صافي ربح الفترة
                </span>
                <span className={`font-numbers font-bold ${data.equity.net_income >= 0 ? 'text-emerald-500' : 'text-danger_red'}`}>
                  {fmt(data.equity.net_income)}
                </span>
              </div>
            </div>
            <div className="p-4 border-t border-border_default bg-violet-500/10 flex justify-between items-center">
              <span className="font-black text-violet-600">إجمالي حقوق الملكية</span>
              <span className="font-black font-numbers text-violet-600 text-lg">{fmt(data.equity.total)} د.ج</span>
            </div>
          </div>

          {/* Total L & E */}
          <div className="bg-background_secondary border border-border_default rounded-2xl p-4 flex justify-between items-center shadow-sm">
            <span className="font-black text-text_secondary">إجمالي الخصوم وحقوق الملكية</span>
            <span className="font-black font-numbers text-text_primary text-xl">
              {fmt(data.liabilities.total + data.equity.total)} د.ج
            </span>
          </div>
          
        </div>
      </div>
    </div>
  );
}
