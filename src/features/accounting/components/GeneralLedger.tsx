import { useState, useEffect } from 'react';
import { BookOpen, Search, Filter, Hash, ChevronLeft } from 'lucide-react';
import TransactionDrawer from '../shared/TransactionDrawer';

export default function GeneralLedger({ dateFrom, dateTo }: { dateFrom: string; dateTo: string }) {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(null);
  
  const [ledgerData, setLedgerData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedEntryId, setSelectedEntryId] = useState<number | null>(null);

  useEffect(() => {
    loadAccounts();
  }, []);

  useEffect(() => {
    if (selectedAccountId) {
      loadLedger(selectedAccountId);
    }
  }, [dateFrom, dateTo, selectedAccountId]);

  const loadAccounts = async () => {
    try {
      const res = await window.electronAPI.invoke('accounting:getChartOfAccounts');
      if (res.success) {
        setAccounts(res.data.filter((a: any) => a.parent_id !== null)); // Only leaf accounts
      }
    } catch (e) {
      console.error('Failed to load accounts list', e);
    }
  };

  const loadLedger = async (accountId: number) => {
    setLoading(true);
    setError(null);
    try {
      const resultPromise = window.electronAPI.invoke('db:reports:getGeneralLedger', { 
        account_id: accountId, 
        date_from: dateFrom, 
        date_to: dateTo 
      });
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('انتهت مهلة جلب دفتر الأستاذ العام (8 ثوانٍ)')), 8000)
      );

      const res = (await Promise.race([resultPromise, timeoutPromise])) as any;
      if (res.success) {
        setLedgerData(res.data);
      } else {
        setError(res.error || 'فشل جلب البيانات من قاعدة البيانات.');
      }
    } catch (e: any) {
      setError(e.message || 'حدث خطأ غير متوقع أثناء تحميل حركات الحساب.');
    } finally {
      setLoading(false);
    }
  };

  const handleAccountSelect = (id: number) => {
    setSelectedAccountId(id);
    setLedgerData(null);
    setError(null);
  };

  const fmt = (n: number) => (n || 0).toLocaleString('en-DZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // Filter accounts by search
  const filteredAccounts = accounts.filter(a => 
    a.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    a.code.includes(searchQuery)
  );

  const getSourceBadge = (type: string) => {
    switch (type) {
      case 'SALES_INVOICE': return <span className="bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-2 py-0.5 rounded text-xs font-bold">مبيعات</span>;
      case 'PURCHASE_INVOICE': return <span className="bg-danger_red/10 text-danger_red border border-danger_red/20 px-2 py-0.5 rounded text-xs font-bold">مشتريات</span>;
      case 'PAYMENT': return <span className="bg-primary_blue/10 text-primary_blue border border-primary_blue/20 px-2 py-0.5 rounded text-xs font-bold">دفعة مالية</span>;
      case 'EXPENSE': return <span className="bg-orange-500/10 text-orange-500 border border-orange-500/20 px-2 py-0.5 rounded text-xs font-bold">مصروف</span>;
      case 'MANUAL': return <span className="bg-text_muted/10 text-text_secondary border border-border_default px-2 py-0.5 rounded text-xs font-bold">يدوي</span>;
      default: return <span className="bg-background_secondary text-text_muted border border-border_default px-2 py-0.5 rounded text-xs font-bold">{type}</span>;
    }
  };

  return (
    <div className="h-full flex gap-4 pb-6">
      
      {/* Sidebar: Accounts List */}
      <div className="w-80 bg-background_secondary border border-border_default rounded-2xl flex flex-col shrink-0 overflow-hidden">
        <div className="p-4 border-b border-border_default bg-background_primary/50">
          <h3 className="font-black text-text_primary flex items-center gap-2 mb-3">
            <BookOpen size={18} className="text-violet-500" /> الحسابات الفرعية
          </h3>
          <div className="relative">
            <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-text_muted" />
            <input 
              type="text" 
              placeholder="بحث بالاسم أو الرمز..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-background_primary border border-border_default rounded-xl pr-9 pl-3 py-2 text-sm outline-none focus:border-violet-500 transition-colors"
            />
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
          {filteredAccounts.map(acc => (
            <button 
              key={acc.id} 
              onClick={() => handleAccountSelect(acc.id)}
              className={`w-full text-right p-3 rounded-xl text-sm transition-all flex flex-col gap-1 border
                ${selectedAccountId === acc.id 
                  ? 'bg-violet-500/10 border-violet-500/30 text-violet-500 shadow-sm' 
                  : 'bg-transparent border-transparent hover:bg-background_card_hover text-text_secondary'}`}
            >
              <div className="flex justify-between items-center w-full">
                <span className="font-bold truncate">{acc.name}</span>
                <ChevronLeft size={16} className={`shrink-0 ${selectedAccountId === acc.id ? 'opacity-100' : 'opacity-0'}`} />
              </div>
              <div className="flex justify-between items-center w-full">
                <span className="font-numbers text-xs opacity-70 flex items-center gap-1"><Hash size={12}/> {acc.code}</span>
                <span className={`font-numbers text-xs font-bold ${acc.balance !== 0 ? 'text-text_primary' : 'text-text_muted'}`}>
                  {fmt(Math.abs(acc.balance))}
                </span>
              </div>
            </button>
          ))}
          {filteredAccounts.length === 0 && (
            <div className="p-4 text-center text-sm text-text_muted font-bold">لا يوجد حساب مطابق</div>
          )}
        </div>
      </div>

      {/* Main Area: Ledger Table */}
      <div className="flex-1 bg-background_secondary border border-border_default rounded-2xl overflow-hidden flex flex-col relative">
        {!selectedAccountId ? (
          <div className="flex-1 flex flex-col items-center justify-center text-text_muted p-8 text-center">
            <div className="w-24 h-24 bg-background_primary rounded-full flex items-center justify-center mb-6 border border-border_default shadow-inner">
              <BookOpen size={40} className="text-violet-500/50" />
            </div>
            <h2 className="text-xl font-black text-text_primary mb-2">الأستاذ العام</h2>
            <p className="text-sm max-w-sm">الرجاء تحديد حساب من القائمة الجانبية لعرض جميع الحركات والقيود المالية المرتبطة به خلال الفترة المحددة.</p>
          </div>
        ) : loading && !ledgerData ? (
          <div className="flex-1 flex flex-col items-center justify-center py-20 text-text_muted">
            <div className="w-10 h-10 border-4 border-violet-500/30 border-t-violet-500 rounded-full animate-spin mb-4" />
            <p className="font-bold">جاري تحميل حركات كشف الحساب للفترة...</p>
          </div>
        ) : error ? (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-red-500 bg-red-500/5 border border-red-500/20 rounded-3xl max-w-lg mx-auto my-auto" dir="rtl">
            <p className="font-bold mb-4">{error}</p>
            <button 
              onClick={() => loadLedger(selectedAccountId)}
              className="px-5 py-2.5 bg-red-500/10 text-red-500 hover:bg-red-500/20 border border-red-500/20 rounded-xl text-xs font-bold transition-all"
            >
              إعادة المحاولة 🔄
            </button>
          </div>
        ) : !ledgerData ? (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-text_muted bg-background_secondary max-w-lg mx-auto my-auto text-right" dir="rtl">
            <BookOpen size={48} className="text-violet-500/45 mb-4" />
            <h4 className="font-black text-text_primary mb-2">كشف حساب: {accounts.find(a => a.id === selectedAccountId)?.name}</h4>
            <p className="text-text_secondary text-xs text-center mb-6">
              انقر أدناه لجلب وتحليل القيود والحركات المحاسبية المسجلة لهذا الحساب.
            </p>
            <button 
              onClick={() => loadLedger(selectedAccountId)}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-sm font-black transition-all shadow-md shadow-violet-500/10"
            >
              تحميل كشف الحساب 🔄
            </button>
          </div>
        ) : (
          <>
            {/* Header of Ledger */}
            <div className="p-5 border-b border-border_default bg-background_primary/30 flex justify-between items-center shrink-0">
              <div>
                <h2 className="text-xl font-black text-text_primary flex items-center gap-2">
                  <span className="text-violet-500 font-numbers">[{ledgerData.account.code}]</span> {ledgerData.account.name}
                </h2>
                <p className="text-xs text-text_muted mt-1 flex items-center gap-1 font-numbers">
                  الفترة: {dateFrom} إلى {dateTo}
                </p>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-center px-4 py-2 bg-background_primary border border-border_default rounded-xl">
                  <div className="text-xs text-text_muted font-bold mb-0.5">رصيد افتتاحي</div>
                  <div className="font-numbers font-black text-text_primary">{fmt(ledgerData.opening_balance)}</div>
                </div>
                <div className="text-center px-4 py-2 bg-violet-500/10 border border-violet-500/20 rounded-xl">
                  <div className="text-xs text-violet-500 font-bold mb-0.5">رصيد ختامي</div>
                  <div className="font-numbers font-black text-violet-500">
                    {ledgerData.transactions.length > 0 
                      ? fmt(ledgerData.transactions[ledgerData.transactions.length - 1].running_balance) 
                      : fmt(ledgerData.opening_balance)}
                  </div>
                </div>
              </div>
            </div>

            {/* Table */}
            <div className="flex-1 overflow-auto custom-scrollbar relative">
              {loading && (
                <div className="absolute inset-0 bg-background_secondary/50 backdrop-blur-sm z-10 flex items-center justify-center">
                  <div className="w-8 h-8 border-4 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
                </div>
              )}
              <table className="w-full text-right text-sm">
                <thead className="sticky top-0 z-20 bg-background_secondary/90 backdrop-blur shadow-sm">
                  <tr className="text-text_secondary border-b border-border_default">
                    <th className="p-4 font-bold w-24">التاريخ</th>
                    <th className="p-4 font-bold w-24">رقم القيد</th>
                    <th className="p-4 font-bold w-28">المصدر</th>
                    <th className="p-4 font-bold">البيان</th>
                    <th className="p-4 font-bold text-center w-28">مدين (له)</th>
                    <th className="p-4 font-bold text-center w-28">دائن (عليه)</th>
                    <th className="p-4 font-bold text-center w-32">الرصيد</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border_default/50">
                  {/* Opening Balance Row */}
                  <tr className="bg-background_primary/30 text-text_muted">
                    <td className="p-3 font-numbers text-center">-</td>
                    <td className="p-3 font-numbers text-center">-</td>
                    <td className="p-3 text-center">-</td>
                    <td className="p-3 font-bold">رصيد ما قبل الفترة</td>
                    <td className="p-3 text-center">-</td>
                    <td className="p-3 text-center">-</td>
                    <td className="p-3 text-center font-numbers font-bold text-text_primary">{fmt(ledgerData.opening_balance)}</td>
                  </tr>

                  {ledgerData.transactions.map((t: any) => (
                    <tr 
                      key={t.entry_id} 
                      onClick={() => { setSelectedEntryId(t.entry_id); setDrawerOpen(true); }}
                      className="hover:bg-background_primary/60 cursor-pointer transition-colors group"
                    >
                      <td className="p-3 font-numbers text-xs text-text_secondary">{t.date}</td>
                      <td className="p-3 font-numbers text-xs text-text_muted group-hover:text-violet-500 transition-colors">#{t.entry_number}</td>
                      <td className="p-3">{getSourceBadge(t.reference_type)}</td>
                      <td className="p-3 text-text_primary font-medium">{t.description}</td>
                      <td className="p-3 text-center font-numbers text-emerald-500 font-bold bg-emerald-500/5">
                        {t.debit > 0 ? fmt(t.debit) : ''}
                      </td>
                      <td className="p-3 text-center font-numbers text-danger_red font-bold bg-danger_red/5">
                        {t.credit > 0 ? fmt(t.credit) : ''}
                      </td>
                      <td className="p-3 text-center font-numbers font-black text-violet-500 bg-violet-500/5">
                        {fmt(t.running_balance)}
                      </td>
                    </tr>
                  ))}
                  
                  {ledgerData.transactions.length === 0 && (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-text_muted font-bold">
                        لا توجد حركات مالية في هذه الفترة.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Drawer */}
      <TransactionDrawer 
        isOpen={drawerOpen} 
        onClose={() => setDrawerOpen(false)} 
        entryId={selectedEntryId} 
      />
    </div>
  );
}
