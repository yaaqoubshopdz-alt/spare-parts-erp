/**
 * ReportsPage — الإحصائيات المالية والتقارير الاحترافية
 */
import { useState, useEffect, useRef } from 'react';
import { BarChart3, TrendingUp, Package, Calendar, Users, Briefcase, DollarSign, Wallet } from 'lucide-react';
import { showError } from '../../shared/utils/notifications';
import { FinancialPinGate } from '../../shared/components/ui/FinancialPinGate';
import { useSmoothScroll } from '../../shared/hooks/useSmoothScroll';

export default function ReportsPage() {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [profitData, setProfitData] = useState<any>(null);
  const [stockValuation, setStockValuation] = useState<any>(null);
  const [trialBalanceData, setTrialBalanceData] = useState<any>(null);

  // Drag-to-scroll — main page scroll area (vertical)
  const pageScrollRef = useRef<HTMLDivElement | null>(null);
  useSmoothScroll<HTMLDivElement>({ direction: 'vertical' }, pageScrollRef);

  // Drag-to-scroll — trial balance table (horizontal)
  const trialTableRef = useRef<HTMLDivElement | null>(null);
  useSmoothScroll<HTMLDivElement>({ direction: 'horizontal' }, trialTableRef);

  // Filters
  const today = new Date().toISOString().split('T')[0];
  const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
  
  const [dateFrom, setDateFrom] = useState(firstDayOfMonth);
  const [dateTo, setDateTo] = useState(today);

  useEffect(() => {
    if (isUnlocked) {
      loadReports();
    }
  }, [dateFrom, dateTo, isUnlocked]);

  const loadReports = async () => {
    setLoading(true);
    try {
      const profitRes = await window.electronAPI.invoke('db:reports:getProfitLoss', {
        date_from: dateFrom,
        date_to: dateTo
      });
      if (profitRes.success) setProfitData(profitRes.data);

      const stockRes = await window.electronAPI.invoke('db:reports:getStockValuation');
      if (stockRes.success) setStockValuation(stockRes.data);

      const trialRes = await window.electronAPI.invoke('db:reports:getTrialBalance', { date_to: dateTo });
      if (trialRes.success) setTrialBalanceData(trialRes.data);
      
    } catch (e) {
      showError('حدث خطأ أثناء جلب التقارير');
    } finally {
      setLoading(false);
    }
  };

  if (!isUnlocked) {
    return (
      <div className="p-6 h-full flex flex-col relative w-full overflow-y-auto custom-scrollbar justify-center items-center">
        <FinancialPinGate 
          onSuccess={() => setIsUnlocked(true)} 
          title="بوابة الأمان المالي مقفلة" 
          description="يرجى إدخال رمز الـ PIN الخاص بك للولوج للبيانات المالية والتقارير والأرباح."
        />
      </div>
    );
  }

  return (
    <div ref={pageScrollRef} className="p-6 h-full flex flex-col relative w-full overflow-y-auto custom-scrollbar">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-text_primary flex items-center gap-3">
            <div className="p-2 bg-primary_blue/20 rounded-xl">
              <BarChart3 size={28} className="text-primary_blue" />
            </div>
            التقارير المالية الاحترافية
          </h1>
          <p className="text-text_secondary mt-2">مراقبة دقيقة للأداء المالي، المخزون، والديون</p>
        </div>

        <div className="flex items-center gap-3 bg-background_secondary p-2 rounded-xl border border-border_default shadow-sm">
          <Calendar size={20} className="text-primary_blue ml-2" />
          <input 
            type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
            className="bg-background_primary border border-border_default rounded-lg px-3 py-2 text-sm outline-none focus:border-primary_blue font-numbers"
          />
          <span className="text-text_muted font-medium">إلى</span>
          <input 
            type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
            className="bg-background_primary border border-border_default rounded-lg px-3 py-2 text-sm outline-none focus:border-primary_blue font-numbers"
          />
        </div>
      </div>

      {loading && !profitData ? (
        <div className="flex-1 flex flex-col items-center justify-center text-primary_blue">
          <div className="w-12 h-12 border-4 border-primary_blue/30 border-t-primary_blue rounded-full animate-spin mb-4" />
          <p className="font-bold">جاري تحليل البيانات المالية...</p>
        </div>
      ) : (
        <div className="space-y-8 pb-10">
          
          {/* Main Net Profit Card */}
          <div className={`p-8 rounded-3xl shadow-2xl relative overflow-hidden flex items-center justify-between ${
            (profitData?.net_profit || 0) >= 0 
              ? 'bg-gradient-to-r from-teal-600 to-teal-800' 
              : 'bg-gradient-to-r from-danger_red to-red-900'
          }`}>
            <div className="z-10">
              <div className="text-text_primary font-bold mb-2 flex items-center gap-2">
                <Wallet size={20} />
                الربح الصافي للفترة (بعد خصم المصاريف)
              </div>
              <div className="text-5xl md:text-6xl font-black font-numbers text-text_primary drop-shadow-md">
                {(profitData?.net_profit || 0).toFixed(2)} <span className="text-2xl font-medium opacity-80">د.ج</span>
              </div>
            </div>
            <TrendingUp className="absolute -left-10 -bottom-10 w-64 h-64 opacity-20 text-text_primary transform -rotate-12" />
          </div>

          {/* Core Financials Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
            <div className="bg-background_secondary border border-border_default p-6 rounded-2xl hover:border-primary_blue/50 transition-colors">
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-blue-500/10 rounded-xl"><DollarSign className="text-blue-500" size={24} /></div>
              </div>
              <div className="text-sm text-text_secondary mb-1 font-bold">إجمالي المبيعات</div>
              <div className="text-3xl font-black font-numbers text-text_primary">{(profitData?.total_sales || 0).toFixed(2)} <span className="text-sm">د.ج</span></div>
            </div>

            <div className="bg-background_secondary border border-border_default p-6 rounded-2xl hover:border-orange-500/50 transition-colors">
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-orange-500/10 rounded-xl"><Briefcase className="text-orange-500" size={24} /></div>
              </div>
              <div className="text-sm text-text_secondary mb-1 font-bold">تكلفة البضاعة المباعة</div>
              <div className="text-3xl font-black font-numbers text-text_primary">{(profitData?.cogs || 0).toFixed(2)} <span className="text-sm">د.ج</span></div>
            </div>

            <div className="bg-background_secondary border border-border_default p-6 rounded-2xl hover:border-emerald-500/50 transition-colors">
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-emerald-500/10 rounded-xl"><TrendingUp className="text-emerald-500" size={24} /></div>
              </div>
              <div className="text-sm text-text_secondary mb-1 font-bold">الربح الإجمالي (قبل المصاريف)</div>
              <div className="text-3xl font-black font-numbers text-emerald-500">{(profitData?.gross_profit || 0).toFixed(2)} <span className="text-sm">د.ج</span></div>
            </div>

            <div className="bg-background_secondary border border-border_default p-6 rounded-2xl hover:border-danger_red/50 transition-colors">
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-danger_red/10 rounded-xl"><BarChart3 className="text-danger_red" size={24} /></div>
              </div>
              <div className="text-sm text-text_secondary mb-1 font-bold">المصاريف الكلية للفترة</div>
              <div className="text-3xl font-black font-numbers text-danger_red">{(profitData?.total_expenses || 0).toFixed(2)} <span className="text-sm">د.ج</span></div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Debts Section */}
            <div className="bg-background_secondary border border-border_default rounded-3xl p-6 lg:p-8">
              <h2 className="text-xl font-black text-text_primary flex items-center gap-2 mb-6">
                <Users size={24} className="text-purple-500" />
                حالة الديون
              </h2>
              
              <div className="space-y-6">
                <div className="bg-background_primary border border-border_default p-5 rounded-2xl border-l-4 border-l-emerald-500 flex justify-between items-center">
                  <div>
                    <div className="text-text_secondary font-bold mb-1">ديون الزبائن (أموال لك بالخارج)</div>
                    <div className="text-text_muted text-sm">مجموع الأرصدة المستحقة على الزبائن</div>
                  </div>
                  <div className="text-2xl font-black font-numbers text-emerald-500">
                    {(profitData?.customers_debts || 0).toFixed(2)} <span className="text-base">د.ج</span>
                  </div>
                </div>

                <div className="bg-background_primary border border-border_default p-5 rounded-2xl border-l-4 border-l-danger_red flex justify-between items-center">
                  <div>
                    <div className="text-text_secondary font-bold mb-1">ديون الموردين (أموال عليك)</div>
                    <div className="text-text_muted text-sm">مجموع الأرصدة المستحقة للموردين</div>
                  </div>
                  <div className="text-2xl font-black font-numbers text-danger_red">
                    {(profitData?.suppliers_debts || 0).toFixed(2)} <span className="text-base">د.ج</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Stock Valuation Section */}
            <div className="bg-background_secondary border border-border_default rounded-3xl p-6 lg:p-8">
              <h2 className="text-xl font-black text-text_primary flex items-center gap-2 mb-6">
                <Package size={24} className="text-primary_blue" />
                تقييم المخزون الحالي
              </h2>
              
              <div className="grid grid-cols-1 gap-4">
                <div className="flex items-center justify-between p-4 bg-background_primary rounded-2xl border border-border_default">
                  <span className="font-bold text-text_secondary">إجمالي رأس المال (سعر الشراء)</span>
                  <span className="text-2xl font-black font-numbers text-text_primary">
                    {(stockValuation?.total_cost_value || 0).toFixed(2)} <span className="text-sm">د.ج</span>
                  </span>
                </div>
                
                <div className="flex items-center justify-between p-4 bg-primary_blue/10 rounded-2xl border border-primary_blue/20">
                  <span className="font-bold text-primary_blue">القيمة السوقية (سعر البيع)</span>
                  <span className="text-2xl font-black font-numbers text-primary_blue">
                    {(stockValuation?.total_retail_value || 0).toFixed(2)} <span className="text-sm">د.ج</span>
                  </span>
                </div>

                <div className="flex items-center justify-between p-4 bg-emerald-500/10 rounded-2xl border border-emerald-500/20 mt-2">
                  <span className="font-bold text-emerald-500">الربح المتوقع للمخزون الحالي</span>
                  <span className="text-2xl font-black font-numbers text-emerald-500">
                    {(stockValuation?.expected_profit || 0).toFixed(2)} <span className="text-sm">د.ج</span>
                  </span>
                </div>

                <div className="flex items-center justify-between p-4 mt-2">
                  <span className="font-bold text-text_muted">عدد القطع الإجمالي</span>
                  <span className="text-xl font-black font-numbers text-text_primary">
                    {(stockValuation?.total_items || 0).toFixed(2)} <span className="text-sm font-sans font-medium text-text_muted">قطعة</span>
                  </span>
                </div>
              </div>
            </div>

          </div>

          {/* ميزان المراجعة Trial Balance */}
          {trialBalanceData && (
            <div className="bg-background_secondary border border-border_default rounded-3xl p-6 lg:p-8 mt-8">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-black text-text_primary flex items-center gap-2">
                  <BarChart3 size={24} className="text-teal-500" />
                  ميزان المراجعة (Trial Balance) - النظام المزدوج
                </h2>
                <div className={`px-4 py-2 rounded-xl font-bold ${trialBalanceData.is_balanced ? 'bg-emerald-500/10 text-emerald-500' : 'bg-danger_red/10 text-danger_red'}`}>
                  {trialBalanceData.is_balanced ? 'الميزان متطابق ✓' : 'الميزان غير متطابق ⚠️'}
                </div>
              </div>

              <div ref={trialTableRef} className="overflow-x-auto rounded-2xl border border-border_default">
                <table className="w-full text-right">
                  <thead>
                    <tr className="bg-background_primary border-b border-border_default text-text_secondary text-sm">
                      <th className="p-4 font-bold text-center">رمز الحساب</th>
                      <th className="p-4 font-bold">اسم الحساب</th>
                      <th className="p-4 font-bold text-center">النوع</th>
                      <th className="p-4 font-bold text-center">إجمالي مدين</th>
                      <th className="p-4 font-bold text-center">إجمالي دائن</th>
                      <th className="p-4 font-bold text-center">الرصيد</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border_default text-text_primary font-medium">
                    {trialBalanceData.accounts.map((acc: any) => (
                      <tr key={acc.code} className="hover:bg-background_primary/50 transition-colors">
                        <td className="p-4 text-center font-numbers">{acc.code}</td>
                        <td className="p-4">{acc.name}</td>
                        <td className="p-4 text-center text-sm text-text_muted">
                          {acc.type === 'asset' ? 'أصل' : 
                           acc.type === 'liability' ? 'خصم' : 
                           acc.type === 'equity' ? 'حقوق ملكية' : 
                           acc.type === 'revenue' ? 'إيراد' : 'مصروف'}
                        </td>
                        <td className="p-4 text-center font-numbers text-emerald-500">{acc.total_debit.toFixed(2)}</td>
                        <td className="p-4 text-center font-numbers text-danger_red">{acc.total_credit.toFixed(2)}</td>
                        <td className="p-4 text-center font-numbers text-primary_blue font-bold">{Math.abs(acc.balance).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-background_primary font-black border-t border-border_default">
                      <td colSpan={3} className="p-4 text-left">الإجمالي:</td>
                      <td className="p-4 text-center font-numbers text-emerald-500">{trialBalanceData.totals.debit.toFixed(2)}</td>
                      <td className="p-4 text-center font-numbers text-danger_red">{trialBalanceData.totals.credit.toFixed(2)}</td>
                      <td className="p-4"></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
