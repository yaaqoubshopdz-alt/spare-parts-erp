import { useState, useEffect } from 'react';
import { Lock, Unlock, Calendar, AlertTriangle, CheckCircle2, ShieldAlert } from 'lucide-react';

export default function PeriodClosing() {
  const [closingDate, setClosingDate] = useState<string>('2000-01-01');
  const [lockTargetDate, setLockTargetDate] = useState<string>('');
  const [unlockTargetDate, setUnlockTargetDate] = useState<string>('2000-01-01');
  const [yearEndTargetDate, setYearEndTargetDate] = useState<string>('');
  
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchClosingDate();
  }, []);

  const fetchClosingDate = async () => {
    try {
      const res = await window.electronAPI.invoke('accounting:getClosingDate');
      if (res.success) {
        setClosingDate(res.data);
        // Default target dates to today
        const todayStr = new Date().toISOString().split('T')[0];
        setLockTargetDate(todayStr);
        setYearEndTargetDate(`${new Date().getFullYear()}-12-31`);
      } else {
        setMessage({ type: 'error', text: res.error || 'فشل تحميل تاريخ الإقفال' });
      }
    } catch (e: any) {
      setMessage({ type: 'error', text: e.message || 'حدث خطأ في الاتصال بالخادم' });
    }
  };

  const handleLockPeriod = async () => {
    if (!lockTargetDate) return;
    setLoading(true);
    setMessage(null);
    try {
      const res = await window.electronAPI.invoke('accounting:lockPeriod', lockTargetDate);
      if (res.success) {
        setMessage({ type: 'success', text: `تم قفل التعديلات المالية بنجاح حتى تاريخ ${lockTargetDate}` });
        await fetchClosingDate();
      } else {
        setMessage({ type: 'error', text: res.error || 'فشل إقفال الفترة المالية' });
      }
    } catch (e: any) {
      setMessage({ type: 'error', text: e.message || 'حدث خطأ غير متوقع' });
    } finally {
      setLoading(false);
    }
  };

  const handleUnlockPeriod = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const res = await window.electronAPI.invoke('accounting:unlockPeriod', unlockTargetDate);
      if (res.success) {
        setMessage({ type: 'success', text: `تم فتح الفترة المالية وتحديث تاريخ الإقفال الجديد إلى ${unlockTargetDate}` });
        await fetchClosingDate();
      } else {
        setMessage({ type: 'error', text: res.error || 'فشل فتح الفترة المالية' });
      }
    } catch (e: any) {
      setMessage({ type: 'error', text: e.message || 'حدث خطأ غير متوقع' });
    } finally {
      setLoading(false);
    }
  };

  const handleYearClose = async () => {
    if (!yearEndTargetDate) return;
    if (!confirm('تحذير: هل أنت متأكد من رغبتك في إقفال السنة المالية بالكامل؟ سيقوم النظام بإنشاء قيد إقفال تلقائي وترحيل صافي أرباح/خسائر الفترة لحساب الأرباح المحتجزة وقفل التعديلات تماماً.')) {
      return;
    }
    setLoading(true);
    setMessage(null);
    try {
      const res = await window.electronAPI.invoke('accounting:yearClose', yearEndTargetDate);
      if (res.success) {
        setMessage({ type: 'success', text: `تم إقفال السنة المالية بنجاح حتى ${yearEndTargetDate} وترحيل الأرباح التراكمية.` });
        await fetchClosingDate();
      } else {
        setMessage({ type: 'error', text: res.error || 'فشل إقفال السنة المالية' });
      }
    } catch (e: any) {
      setMessage({ type: 'error', text: e.message || 'حدث خطأ غير متوقع' });
    } finally {
      setLoading(false);
    }
  };

  const fmtDate = (dStr: string) => {
    if (!dStr) return '';
    try {
      const d = new Date(dStr);
      return d.toLocaleDateString('ar-DZ', { year: 'numeric', month: 'long', day: 'numeric' });
    } catch {
      return dStr;
    }
  };

  return (
    <div className="space-y-6 text-right max-w-4xl mx-auto pb-12" dir="rtl">
      {/* Overview Status */}
      <div className="bg-background_secondary border border-border_default p-6 rounded-2xl shadow-sm relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="absolute top-0 right-0 w-32 h-32 bg-violet-500/5 rounded-full blur-3xl" />
        <div className="flex items-start gap-4">
          <div className="p-3 bg-violet-500/10 border border-violet-500/20 text-violet-500 rounded-xl">
            <Lock size={32} />
          </div>
          <div>
            <h3 className="text-lg font-black text-text_primary">حالة قفل الحسابات الحالية</h3>
            <p className="text-text_secondary text-xs mt-1">
              يمنع النظام التعديل أو الحذف أو الإضافة على الفواتير والسندات التي تسبق تاريخ الإقفال لحماية سلامة التقارير المالية.
            </p>
            <div className="mt-3 flex items-center gap-2">
              <span className="text-xs font-bold text-text_muted">تاريخ الإقفال المعين حالياً:</span>
              <span className="bg-violet-500/10 text-violet-500 font-black px-3 py-1 rounded-lg text-sm font-numbers">
                {closingDate} ({fmtDate(closingDate)})
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Global alert messages */}
      {message && (
        <div className={`p-4 rounded-xl border flex items-start gap-3 text-sm font-bold shadow-sm ${
          message.type === 'success' 
            ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-500' 
            : 'bg-red-500/5 border-red-500/20 text-red-500'
        }`}>
          {message.type === 'success' ? <CheckCircle2 className="shrink-0 mt-0.5" size={18} /> : <ShieldAlert className="shrink-0 mt-0.5" size={18} />}
          <div>{message.text}</div>
        </div>
      )}

      {/* Actions grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Lock Period Box */}
        <div className="bg-background_secondary border border-border_default p-6 rounded-2xl shadow-sm flex flex-col justify-between">
          <div>
            <h4 className="text-sm font-black text-text_primary flex items-center gap-2 mb-2">
              <Lock className="text-violet-500" size={16} />
              قفل فترة محاسبية جديدة
            </h4>
            <p className="text-text_secondary text-xs mb-4">
              يمكن للمالك أو المدير قفل التعديلات المالية حتى تاريخ معين لضمان عدم تغيير الحسابات بعد مراجعتها أو تقديم الإقرارات الضريبية.
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-text_secondary mb-2">قفل التعديلات حتى نهاية يوم:</label>
                <div className="flex items-center px-3 py-2 bg-background_primary border border-border_default rounded-xl w-full">
                  <Calendar size={16} className="text-text_muted ml-2" />
                  <input 
                    type="date"
                    value={lockTargetDate}
                    onChange={e => setLockTargetDate(e.target.value)}
                    className="bg-transparent text-sm font-bold font-numbers text-text_primary outline-none w-full"
                  />
                </div>
              </div>
            </div>
          </div>
          <div className="mt-6 pt-4 border-t border-border_default">
            <button
              onClick={handleLockPeriod}
              disabled={loading || !lockTargetDate}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-md transition-all"
            >
              <Lock size={14} />
              قفل الحسابات للفترة المحددة
            </button>
          </div>
        </div>

        {/* Unlock Period Box */}
        <div className="bg-background_secondary border border-border_default p-6 rounded-2xl shadow-sm flex flex-col justify-between">
          <div>
            <h4 className="text-sm font-black text-text_primary flex items-center gap-2 mb-2">
              <Unlock className="text-amber-500" size={16} />
              فتح فترة مقفلة (تعديل تاريخ الإقفال)
            </h4>
            <p className="text-text_secondary text-xs mb-4">
              خاص بالمالك فقط (Owner). يسمح بإرجاع تاريخ الإقفال للوراء لإجراء تعديلات استثنائية على قيود أو فواتير سابقة ومقفلة.
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-text_secondary mb-2">تعيين تاريخ إقفال جديد (للخلف):</label>
                <div className="flex items-center px-3 py-2 bg-background_primary border border-border_default rounded-xl w-full">
                  <Calendar size={16} className="text-text_muted ml-2" />
                  <input 
                    type="date"
                    value={unlockTargetDate}
                    onChange={e => setUnlockTargetDate(e.target.value)}
                    className="bg-transparent text-sm font-bold font-numbers text-text_primary outline-none w-full"
                  />
                </div>
              </div>
            </div>
          </div>
          <div className="mt-6 pt-4 border-t border-border_default">
            <button
              onClick={handleUnlockPeriod}
              disabled={loading || !unlockTargetDate}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-md transition-all"
            >
              <Unlock size={14} />
              فتح الفترة وتغيير تاريخ القفل
            </button>
          </div>
        </div>

        {/* Year End Closing Box */}
        <div className="bg-background_secondary border border-border_default p-6 rounded-2xl shadow-sm md:col-span-2 relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 left-0 w-24 h-24 bg-red-500/5 rounded-full blur-2xl -ml-6 -mt-6" />
          <div>
            <h4 className="text-sm font-black text-text_primary flex items-center gap-2 mb-2">
              <AlertTriangle className="text-red-500" size={16} />
              إقفال السنة المالية (ترحيل الأرباح والخسائر)
            </h4>
            <p className="text-text_secondary text-xs mb-4">
              خاص بمالك المحل فقط. يقوم هذا الإجراء بجمع كل حسابات الإيرادات والمصروفات، وإقفال أرصدتها بإنشاء قيد ترحيل تلقائي لصافي أرباح/خسائر العام إلى حساب **الأرباح المحتجزة** في حقوق الملكية، مع قفل كافة العمليات نهائياً.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
              <div>
                <label className="block text-xs font-bold text-text_secondary mb-2">تاريخ إقفال السنة المالية:</label>
                <div className="flex items-center px-3 py-2 bg-background_primary border border-border_default rounded-xl w-full">
                  <Calendar size={16} className="text-text_muted ml-2" />
                  <input 
                    type="date"
                    value={yearEndTargetDate}
                    onChange={e => setYearEndTargetDate(e.target.value)}
                    className="bg-transparent text-sm font-bold font-numbers text-text_primary outline-none w-full"
                  />
                </div>
              </div>
              <div>
                <button
                  onClick={handleYearClose}
                  disabled={loading || !yearEndTargetDate}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-md transition-all"
                >
                  <AlertTriangle size={14} />
                  ترحيل الأرباح وإقفال السنة بالكامل
                </button>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
