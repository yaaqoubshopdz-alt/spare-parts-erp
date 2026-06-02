import { useState, useEffect } from 'react';
import { Clock, Users, Truck, Download } from 'lucide-react';

export default function AgingReport() {
  const [data, setData] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [agingType, setAgingType] = useState<'customer' | 'supplier'>('customer');

  useEffect(() => {
    loadData();
  }, [agingType]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const resultPromise = window.electronAPI.invoke('accounting:getAgingReport', agingType);
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('انتهت مهلة تحميل أعمار الديون المحددة (8 ثوانٍ)')), 8000)
      );

      const res = (await Promise.race([resultPromise, timeoutPromise])) as any;
      if (res.success) {
        setData(res.data || []);
      } else {
        setError(res.error || 'فشل جلب تقرير أعمار الديون.');
      }
    } catch (e: any) {
      setError(e.message || 'حدث خطأ غير متوقع أثناء تحميل البيانات.');
    } finally {
      setLoading(false);
    }
  };

  const fmt = (n: number) => (n || 0).toFixed(2);

  return (
    <div className="h-full flex flex-col pb-6">
      
      {/* Header Info */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4 shrink-0">
        <div>
          <h2 className="text-2xl font-black text-text_primary flex items-center gap-2">
            <Clock className="text-violet-500" /> أعمار الديون (Aging Report)
          </h2>
          <p className="text-text_secondary mt-1 text-sm font-bold">
            تتبع الديون المتأخرة المستحقة {agingType === 'customer' ? 'لنا عند الزبائن' : 'علينا للموردين'}
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex bg-background_secondary p-1 rounded-xl border border-border_default">
            <button 
              onClick={() => setAgingType('customer')} 
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-colors ${agingType === 'customer' ? 'bg-background_primary text-emerald-500 shadow-sm' : 'text-text_secondary hover:text-text_primary'}`}
            >
              <Users size={16} /> ديون الزبائن
            </button>
            <button 
              onClick={() => setAgingType('supplier')} 
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-colors ${agingType === 'supplier' ? 'bg-background_primary text-danger_red shadow-sm' : 'text-text_secondary hover:text-text_primary'}`}
            >
              <Truck size={16} /> ديون الموردين
            </button>
          </div>
          <button className="p-2.5 bg-background_secondary border border-border_default hover:border-violet-500 text-text_secondary hover:text-violet-500 rounded-xl transition-colors">
            <Download size={20} />
          </button>
        </div>
      </div>

      {/* Main Table Area */}
      <div className="flex-1 bg-background_secondary border border-border_default rounded-2xl overflow-hidden flex flex-col relative">
        {loading && !data && (
          <div className="flex-1 flex flex-col items-center justify-center py-20 text-text_muted">
            <div className="w-10 h-10 border-4 border-violet-500/30 border-t-violet-500 rounded-full animate-spin mb-4" />
            <p className="font-bold">جاري تحميل تقرير أعمار الديون...</p>
          </div>
        )}

        {error && (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-red-500 bg-red-500/5 border border-red-500/20 rounded-3xl max-w-lg mx-auto my-auto" dir="rtl">
            <p className="font-bold mb-4">{error}</p>
            <button 
              onClick={loadData}
              className="px-5 py-2.5 bg-red-500/10 text-red-500 hover:bg-red-500/20 border border-red-500/20 rounded-xl text-xs font-bold transition-all"
            >
              إعادة المحاولة 🔄
            </button>
          </div>
        )}

        {data && (
          <div className="flex-1 overflow-auto custom-scrollbar">
            {loading && (
              <div className="absolute inset-0 bg-background_secondary/50 backdrop-blur-sm z-10 flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
              </div>
            )}
            <table className="w-full text-right text-sm">
              <thead className="sticky top-0 z-20 bg-background_secondary/90 backdrop-blur shadow-sm">
                <tr className="text-text_secondary border-b border-border_default">
                  <th className="p-4 font-bold">{agingType === 'customer' ? 'الزبون' : 'المورد'}</th>
                  <th className="p-4 font-bold text-center">حالي (0-30 يوم)</th>
                  <th className="p-4 font-bold text-center">متأخر (31-60 يوم)</th>
                  <th className="p-4 font-bold text-center">حرِج (61-90 يوم)</th>
                  <th className="p-4 font-bold text-center">معدوم محتمل (+90 يوم)</th>
                  <th className="p-4 font-black text-center text-text_primary bg-background_primary/30">الإجمالي</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border_default/50">
                {data.map((row: any, i: number) => (
                  <tr key={i} className="hover:bg-background_primary/60 transition-colors">
                    <td className="p-4 font-bold text-text_primary">{row.party_name}</td>
                    <td className="p-4 text-center font-numbers text-text_primary">
                      {row.current_30 > 0 ? fmt(row.current_30) : '-'}
                    </td>
                    <td className="p-4 text-center font-numbers text-warning_amber font-bold bg-warning_amber/5">
                      {row.days_31_60 > 0 ? fmt(row.days_31_60) : '-'}
                    </td>
                    <td className="p-4 text-center font-numbers text-orange-500 font-bold bg-orange-500/5">
                      {row.days_61_90 > 0 ? fmt(row.days_61_90) : '-'}
                    </td>
                    <td className="p-4 text-center font-numbers text-danger_red font-black bg-danger_red/5">
                      {row.over_90 > 0 ? fmt(row.over_90) : '-'}
                    </td>
                    <td className="p-4 text-center font-numbers font-black text-violet-500 bg-violet-500/5">
                      {fmt(row.total)}
                    </td>
                  </tr>
                ))}
                
                {data.length === 0 && !loading && (
                  <tr>
                    <td colSpan={6} className="p-12 text-center">
                      <div className="w-16 h-16 bg-background_primary rounded-full flex items-center justify-center mx-auto mb-4 border border-border_default">
                        <Clock className="text-text_muted" size={24} />
                      </div>
                      <p className="text-text_muted font-bold">لا توجد ديون مسجلة لـ {agingType === 'customer' ? 'الزبائن' : 'الموردين'}</p>
                    </td>
                  </tr>
                )}
              </tbody>
              {data.length > 0 && (
                <tfoot className="sticky bottom-0 bg-background_primary border-t border-border_default font-black">
                  <tr>
                    <td className="p-4 text-text_secondary">الإجمالي العام</td>
                    <td className="p-4 text-center font-numbers text-text_primary">
                      {fmt(data.reduce((s, r) => s + r.current_30, 0))}
                    </td>
                  <td className="p-4 text-center font-numbers text-warning_amber">
                    {fmt(data.reduce((s, r) => s + r.days_31_60, 0))}
                  </td>
                  <td className="p-4 text-center font-numbers text-orange-500">
                    {fmt(data.reduce((s, r) => s + r.days_61_90, 0))}
                  </td>
                  <td className="p-4 text-center font-numbers text-danger_red">
                    {fmt(data.reduce((s, r) => s + r.over_90, 0))}
                  </td>
                  <td className="p-4 text-center font-numbers text-violet-500">
                    {fmt(data.reduce((s, r) => s + r.total, 0))}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      )}
      </div>
    </div>
  );
}
