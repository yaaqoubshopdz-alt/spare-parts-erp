import { useState, useEffect } from 'react';
import { Clock, Users, Truck, Download, X, Save } from 'lucide-react';
import { showSuccess, showError } from '@/shared/utils/notifications';

export default function AgingReport() {
  const [data, setData] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [agingType, setAgingType] = useState<'customer' | 'supplier'>('customer');

  // Dynamic aging period thresholds (numbers)
  const [days1, setDays1] = useState<number>(() => {
    const saved = localStorage.getItem('aging_days1');
    return saved ? parseInt(saved, 10) : 30;
  });
  const [days2, setDays2] = useState<number>(() => {
    const saved = localStorage.getItem('aging_days2');
    return saved ? parseInt(saved, 10) : 60;
  });
  const [days3, setDays3] = useState<number>(() => {
    const saved = localStorage.getItem('aging_days3');
    return saved ? parseInt(saved, 10) : 90;
  });

  // String states for input fields to allow typing freely
  const [inputDays1, setInputDays1] = useState<string>(() => {
    const saved = localStorage.getItem('aging_days1');
    return saved || '30';
  });
  const [inputDays2, setInputDays2] = useState<string>(() => {
    const saved = localStorage.getItem('aging_days2');
    return saved || '60';
  });
  const [inputDays3, setInputDays3] = useState<string>(() => {
    const saved = localStorage.getItem('aging_days3');
    return saved || '90';
  });

  const d1 = parseInt(inputDays1);
  const d2 = parseInt(inputDays2);
  const d3 = parseInt(inputDays3);
  const isInvalid = isNaN(d1) || isNaN(d2) || isNaN(d3) || d1 <= 0 || d2 <= d1 || d3 <= d2;

  const handleDaysChange = (field: 'days1' | 'days2' | 'days3', valStr: string) => {
    if (field === 'days1') setInputDays1(valStr);
    if (field === 'days2') setInputDays2(valStr);
    if (field === 'days3') setInputDays3(valStr);

    const parsedVal = parseInt(valStr);
    const currentD1 = field === 'days1' ? parsedVal : d1;
    const currentD2 = field === 'days2' ? parsedVal : d2;
    const currentD3 = field === 'days3' ? parsedVal : d3;

    if (!isNaN(currentD1) && !isNaN(currentD2) && !isNaN(currentD3) && currentD1 > 0 && currentD2 > currentD1 && currentD3 > currentD2) {
      setDays1(currentD1);
      setDays2(currentD2);
      setDays3(currentD3);
      localStorage.setItem('aging_days1', String(currentD1));
      localStorage.setItem('aging_days2', String(currentD2));
      localStorage.setItem('aging_days3', String(currentD3));
    }
  };

  useEffect(() => {
    loadData();
  }, [agingType, days1, days2, days3]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const resultPromise = window.electronAPI.invoke('accounting:getAgingReport', agingType, { days1, days2, days3 });
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

  // Write-off states
  const [selectedParty, setSelectedParty] = useState<any | null>(null);
  const [writeOffConfirmOpen, setWriteOffConfirmOpen] = useState(false);
  const [writeOffNotes, setWriteOffNotes] = useState('');
  const [writeOffLoading, setWriteOffLoading] = useState(false);

  // Reverse write-off states
  const [reverseConfirmOpen, setReverseConfirmOpen] = useState(false);
  const [reverseNotes, setReverseNotes] = useState('');
  const [reverseLoading, setReverseLoading] = useState(false);

  const handleWriteOffClick = (party: any) => {
    setSelectedParty(party);
    setWriteOffConfirmOpen(true);
    setWriteOffNotes('');
  };

  const handleConfirmWriteOff = async () => {
    if (!selectedParty) return;
    setWriteOffLoading(true);
    try {
      const res = await window.electronAPI.invoke('accounting:writeOffCustomerDebt', {
        customerId: selectedParty.party_id,
        amount: selectedParty.net_over_90,
        notes: writeOffNotes
      });
      if (res.success) {
        showSuccess(`تم شطب دين الزبون بقيمة ${fmt(selectedParty.net_over_90)} د.ج بنجاح كخسائر.`);
        setWriteOffConfirmOpen(false);
        setSelectedParty(null);
        loadData();
      } else {
        showError(res.error || 'فشل شطب الدين.');
      }
    } catch (e: any) {
      showError(e.message || 'خطأ أثناء الاتصال بالخادم.');
    } finally {
      setWriteOffLoading(false);
    }
  };

  const handleReverseWriteOffClick = (party: any) => {
    setSelectedParty(party);
    setReverseConfirmOpen(true);
    setReverseNotes('');
  };

  const handleConfirmReverseWriteOff = async () => {
    if (!selectedParty) return;
    setReverseLoading(true);
    try {
      const res = await window.electronAPI.invoke('accounting:reverseWriteOffCustomerDebt', {
        customerId: selectedParty.party_id,
        amount: selectedParty.written_off_amount,
        notes: reverseNotes
      });
      if (res.success) {
        showSuccess(`تم إلغاء شطب دين الزبون وإرجاع الخسائر بقيمة ${fmt(selectedParty.written_off_amount)} د.ج بنجاح.`);
        setReverseConfirmOpen(false);
        setSelectedParty(null);
        loadData();
      } else {
        showError(res.error || 'فشل إرجاع الخسائر.');
      }
    } catch (e: any) {
      showError(e.message || 'خطأ أثناء الاتصال بالخادم.');
    } finally {
      setReverseLoading(false);
    }
  };

  const fmt = (n: number) => (n || 0).toFixed(2);

  function getNetRow(row: any) {
    let remaining = row.written_off_amount || 0;
    
    const over_90 = row.over_90 || 0;
    const net_over_90 = Math.max(0, over_90 - remaining);
    remaining = Math.max(0, remaining - over_90);

    const days_61_90 = row.days_61_90 || 0;
    const net_days_61_90 = Math.max(0, days_61_90 - remaining);
    remaining = Math.max(0, remaining - days_61_90);

    const days_31_60 = row.days_31_60 || 0;
    const net_days_31_60 = Math.max(0, days_31_60 - remaining);
    remaining = Math.max(0, remaining - days_31_60);

    const current_30 = row.current_30 || 0;
    const net_current_30 = Math.max(0, current_30 - remaining);
    remaining = Math.max(0, remaining - current_30);

    const net_total = net_current_30 + net_days_31_60 + net_days_61_90 + net_over_90;

    return {
      ...row,
      net_current_30,
      net_days_31_60,
      net_days_61_90,
      net_over_90,
      net_total
    };
  }

  const processedData = data ? data.map(getNetRow) : [];

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
        
        <div className="flex flex-wrap items-center gap-3">
          {/* تخصيص الفترات الزمنية */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 bg-background_secondary px-3 py-1.5 rounded-xl border border-border_default">
            <span className="text-xs font-bold text-text_secondary">تخصيص الفترات (أيام):</span>
            <div className="flex items-center gap-1.5" dir="ltr">
              <input
                type="number"
                value={inputDays1}
                onChange={(e) => handleDaysChange('days1', e.target.value)}
                className={`w-12 h-8 px-1 text-center bg-background_primary border focus:ring-1 rounded-lg text-xs font-bold font-numbers text-text_primary focus:outline-none transition-all ${isInvalid ? 'border-danger_red focus:border-danger_red focus:ring-danger_red' : 'border-border_default focus:border-violet-500 focus:ring-violet-500'}`}
                placeholder="30"
                min="1"
              />
              <span className="text-text_muted text-xs font-bold">→</span>
              <input
                type="number"
                value={inputDays2}
                onChange={(e) => handleDaysChange('days2', e.target.value)}
                className={`w-12 h-8 px-1 text-center bg-background_primary border focus:ring-1 rounded-lg text-xs font-bold font-numbers text-text_primary focus:outline-none transition-all ${isInvalid ? 'border-danger_red focus:border-danger_red focus:ring-danger_red' : 'border-border_default focus:border-violet-500 focus:ring-violet-500'}`}
                placeholder="60"
                min="2"
              />
              <span className="text-text_muted text-xs font-bold">→</span>
              <input
                type="number"
                value={inputDays3}
                onChange={(e) => handleDaysChange('days3', e.target.value)}
                className={`w-12 h-8 px-1 text-center bg-background_primary border focus:ring-1 rounded-lg text-xs font-bold font-numbers text-text_primary focus:outline-none transition-all ${isInvalid ? 'border-danger_red focus:border-danger_red focus:ring-danger_red' : 'border-border_default focus:border-violet-500 focus:ring-violet-500'}`}
                placeholder="90"
                min="3"
              />
            </div>
            {isInvalid && (
              <span className="text-[10px] font-bold text-danger_red mt-1 sm:mt-0 sm:mr-1">
                (يجب أن تكون الفترات تصاعدية وموجبة)
              </span>
            )}
          </div>

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
                  <th className="p-4 font-bold text-center">حالي (0-{days1} يوم)</th>
                  <th className="p-4 font-bold text-center">متأخر ({days1 + 1}-{days2} يوم)</th>
                  <th className="p-4 font-bold text-center">حرِج ({days2 + 1}-{days3} يوم)</th>
                  <th className="p-4 font-bold text-center">معدوم محتمل (+{days3} يوم)</th>
                  <th className="p-4 font-black text-center text-text_primary bg-background_primary/30">الإجمالي</th>
                  {agingType === 'customer' && <th className="p-4 font-bold text-center">إجراءات</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-border_default/50">
                {processedData.map((row: any, i: number) => (
                  <tr key={i} className="hover:bg-background_primary/60 transition-colors">
                    <td className="p-4 font-bold text-text_primary">{row.party_name}</td>
                    <td className="p-4 text-center font-numbers text-text_primary">
                      {row.net_current_30 > 0 ? fmt(row.net_current_30) : '-'}
                    </td>
                    <td className="p-4 text-center font-numbers text-warning_amber font-bold bg-warning_amber/5">
                      {row.net_days_31_60 > 0 ? fmt(row.net_days_31_60) : '-'}
                    </td>
                    <td className="p-4 text-center font-numbers text-orange-500 font-bold bg-orange-500/5">
                      {row.net_days_61_90 > 0 ? fmt(row.net_days_61_90) : '-'}
                    </td>
                    <td className="p-4 text-center font-numbers text-danger_red font-black bg-danger_red/5">
                      {row.net_over_90 > 0 ? fmt(row.net_over_90) : '-'}
                    </td>
                    <td className="p-4 text-center font-numbers font-black text-violet-500 bg-violet-500/5">
                      {fmt(row.net_total)}
                    </td>
                    {agingType === 'customer' && (
                      <td className="p-4 text-center">
                        {row.net_over_90 > 0.01 ? (
                          <button
                            onClick={() => handleWriteOffClick(row)}
                            className="px-3 py-1.5 bg-danger_red/10 text-danger_red hover:bg-danger_red hover:text-white border border-danger_red/25 rounded-xl text-xs font-bold transition-all"
                            title="شطب كخسارة"
                          >
                            شطب كخسارة
                          </button>
                        ) : row.written_off_amount > 0.01 ? (
                          <button
                            onClick={() => handleReverseWriteOffClick(row)}
                            className="px-3 py-1.5 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white border border-emerald-500/25 rounded-xl text-xs font-bold transition-all"
                            title="إرجاع الخسائر"
                          >
                            إرجاع الخسائر
                          </button>
                        ) : (
                          <span className="text-text_muted text-xs">-</span>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
                
                {processedData.length === 0 && !loading && (
                  <tr>
                    <td colSpan={agingType === 'customer' ? 7 : 6} className="p-12 text-center">
                      <div className="w-16 h-16 bg-background_primary rounded-full flex items-center justify-center mx-auto mb-4 border border-border_default">
                        <Clock className="text-text_muted" size={24} />
                      </div>
                      <p className="text-text_muted font-bold">لا توجد ديون مسجلة لـ {agingType === 'customer' ? 'الزبائن' : 'الموردين'}</p>
                    </td>
                  </tr>
                )}
              </tbody>
              {processedData.length > 0 && (
                <tfoot className="sticky bottom-0 bg-background_primary border-t border-border_default font-black">
                  <tr>
                    <td className="p-4 text-text_secondary">الإجمالي العام</td>
                    <td className="p-4 text-center font-numbers text-text_primary">
                      {fmt(processedData.reduce((s, r) => s + r.net_current_30, 0))}
                    </td>
                    <td className="p-4 text-center font-numbers text-warning_amber">
                      {fmt(processedData.reduce((s, r) => s + r.net_days_31_60, 0))}
                    </td>
                    <td className="p-4 text-center font-numbers text-orange-500">
                      {fmt(processedData.reduce((s, r) => s + r.net_days_61_90, 0))}
                    </td>
                    <td className="p-4 text-center font-numbers text-danger_red">
                      {fmt(processedData.reduce((s, r) => s + r.net_over_90, 0))}
                    </td>
                    <td className="p-4 text-center font-numbers text-violet-500">
                      {fmt(processedData.reduce((s, r) => s + r.net_total, 0))}
                    </td>
                    {agingType === 'customer' && <td className="p-4"></td>}
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}
      </div>

      {/* Confirmation Modal for Write-Off */}
      {writeOffConfirmOpen && selectedParty && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" dir="rtl">
          <div className="bg-background_secondary border border-border_default rounded-2xl w-full max-w-md p-6 shadow-2xl flex flex-col gap-4 text-right">
            <div className="flex justify-between items-center pb-2 border-b border-border_default">
              <h3 className="text-lg font-black text-text_primary flex items-center gap-2">
                <span className="text-danger_red">⚠️</span> شطب دين كخسائر معدومة
              </h3>
              <button 
                onClick={() => setWriteOffConfirmOpen(false)}
                className="p-1 text-text_muted hover:text-text_primary rounded-lg hover:bg-background_primary transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 py-2 text-sm">
              <p className="text-text_secondary font-medium">
                هل أنت متأكد من شطب مبلغ <span className="font-bold text-danger_red font-numbers">{fmt(selectedParty.net_over_90)} د.ج</span> للزبون <span className="font-bold text-text_primary">{selectedParty.party_name}</span> وتحويله إلى ديون معدومة (خسائر)؟
              </p>
              <div className="bg-danger_red/5 border border-danger_red/15 rounded-xl p-3.5 text-xs text-danger_red/90 leading-relaxed font-bold">
                تنبيه: سيؤدي هذا الإجراء إلى تخفيض رصيد الزبون بمبلغ الشطب فوراً وإثبات قيمة المبلغ كخسارة في النظام المالي العام.
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-text_secondary font-bold">ملاحظات / سبب الشطب (اختياري):</label>
                <textarea
                  value={writeOffNotes}
                  onChange={(e) => setWriteOffNotes(e.target.value)}
                  className="w-full h-20 px-3 py-2 bg-background_primary border border-border_default rounded-xl text-xs text-text_primary font-bold focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-all resize-none"
                  placeholder="مثال: تعذر التواصل مع الزبون أو توقف نشاطه..."
                />
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2 border-t border-border_default justify-end">
              <button
                disabled={writeOffLoading}
                onClick={handleConfirmWriteOff}
                className="flex items-center gap-2 px-5 py-2.5 bg-danger_red text-white hover:bg-danger_red/90 rounded-xl text-xs font-bold transition-all shadow-md shadow-danger_red/10"
              >
                {writeOffLoading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Save size={14} />
                )}
                تأكيد الشطب والتسجيل
              </button>
              <button
                disabled={writeOffLoading}
                onClick={() => setWriteOffConfirmOpen(false)}
                className="px-5 py-2.5 bg-background_primary hover:bg-background_card_hover text-text_secondary hover:text-text_primary border border-border_default rounded-xl text-xs font-bold transition-all"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Reverse Write-Off */}
      {reverseConfirmOpen && selectedParty && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" dir="rtl">
          <div className="bg-background_secondary border border-border_default rounded-2xl w-full max-w-md p-6 shadow-2xl flex flex-col gap-4 text-right">
            <div className="flex justify-between items-center pb-2 border-b border-border_default">
              <h3 className="text-lg font-black text-text_primary flex items-center gap-2">
                <span className="text-emerald-500">🔄</span> إرجاع الديون المشطوبة (إلغاء الشطب)
              </h3>
              <button 
                onClick={() => setReverseConfirmOpen(false)}
                className="p-1 text-text_muted hover:text-text_primary rounded-lg hover:bg-background_primary transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 py-2 text-sm">
              <p className="text-text_secondary font-medium">
                هل أنت متأكد من إلغاء شطب مبلغ <span className="font-bold text-emerald-500 font-numbers">{fmt(selectedParty.written_off_amount)} د.ج</span> للزبون <span className="font-bold text-text_primary">{selectedParty.party_name}</span> وإعادته إلى ذمته المالية النشطة؟
              </p>
              <div className="bg-emerald-500/5 border border-emerald-500/15 rounded-xl p-3.5 text-xs text-emerald-500/90 leading-relaxed font-bold">
                تنبيه: سيؤدي هذا الإجراء إلى إعادة إثبات الدين المشطوب وتعيينه كدين مستحق للتحصيل، وزيادة رصيد الزبون بنفس القيمة.
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-text_secondary font-bold">ملاحظات / سبب التراجع (اختياري):</label>
                <textarea
                  value={reverseNotes}
                  onChange={(e) => setReverseNotes(e.target.value)}
                  className="w-full h-20 px-3 py-2 bg-background_primary border border-border_default rounded-xl text-xs text-text_primary font-bold focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-all resize-none"
                  placeholder="مثال: تم الاتفاق مع الزبون على جدولة السداد أو تحسنت حالته المالية..."
                />
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2 border-t border-border_default justify-end">
              <button
                disabled={reverseLoading}
                onClick={handleConfirmReverseWriteOff}
                className="flex items-center gap-2 px-5 py-2.5 bg-emerald-500 text-white hover:bg-emerald-500/90 rounded-xl text-xs font-bold transition-all shadow-md shadow-emerald-500/10"
              >
                {reverseLoading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Save size={14} />
                )}
                تأكيد الإرجاع والتسجيل
              </button>
              <button
                disabled={reverseLoading}
                onClick={() => setReverseConfirmOpen(false)}
                className="px-5 py-2.5 bg-background_primary hover:bg-background_card_hover text-text_secondary hover:text-text_primary border border-border_default rounded-xl text-xs font-bold transition-all"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
