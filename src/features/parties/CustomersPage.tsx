/**
 * CustomersPage — صفحة إدارة الزبائن
 */
import { useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { Users, Search, Plus, Edit, FileText, Phone, Wallet } from 'lucide-react';
import ToolbarButton from '../../shared/components/ui/ToolbarButton';
import { useShortcutStore } from '../../store/shortcutStore';
import { showSuccess, showError } from '../../shared/utils/notifications';
import CustomerModal from './CustomerModal';
import CustomerStatement from './CustomerStatement';
import RecordPaymentModal from './components/RecordPaymentModal';

export default function CustomersPage() {
  const { hasPermission } = useAuth();
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null);

  const [isStatementOpen, setIsStatementOpen] = useState(false);
  const [statementCustomerId, setStatementCustomerId] = useState<number | null>(null);

  // Payment Modal State
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [paymentCustomer, setPaymentCustomer] = useState<any | null>(null);

  // Pagination
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 99999;

  const searchInputRef = useRef<HTMLInputElement>(null);
  const { shortcuts } = useShortcutStore();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const keys = shortcuts.search_product.toLowerCase().split('+');
      const isCtrlRequired = keys.includes('ctrl');
      const isShiftRequired = keys.includes('shift');
      const isAltRequired = keys.includes('alt');
      const mainKey = keys.find(k => !['ctrl', 'shift', 'alt'].includes(k));
      
      const isCtrlPressed = e.ctrlKey || e.metaKey;
      const isShiftPressed = e.shiftKey;
      const isAltPressed = e.altKey;
      
      if (
        isCtrlPressed === isCtrlRequired &&
        isShiftPressed === isShiftRequired &&
        isAltPressed === isAltRequired &&
        e.key.toLowerCase() === mainKey
      ) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [shortcuts]);

  const ghostRowCount = loading ? 0 : Math.max(0, 18 - customers.length);

  type CustomersSortKey = 'name' | 'phone' | 'balance' | 'credit_limit';
  const [sortKey, setSortKey] = useState<CustomersSortKey | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc' | null>(null);

  const toggleSort = useCallback((key: CustomersSortKey) => {
    if (sortKey !== key) {
      setSortKey(key);
      setSortDir('asc');
    } else {
      setSortDir(d => {
        if (d === 'asc') return 'desc';
        if (d === 'desc') return null;
        return 'asc';
      });
    }
    setPage(1);
  }, [sortKey]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadCustomers();
    }, 300);
    return () => clearTimeout(timer);
  }, [search, page, sortKey, sortDir]);

  const loadCustomers = async () => {
    setLoading(true);
    try {
      const res = await window.electronAPI.invoke('db:customers:getAll', {
        search, page, limit,
        sortKey: sortDir !== null ? sortKey : undefined,
        sortDir: sortDir !== null ? sortDir : undefined,
      });
      if (res.success) {
        setCustomers(res.data);
        setTotal(res.total);
      } else {
        showError(res.error);
      }
    } catch {
      showError('خطأ في تحميل الزبائن');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setSelectedCustomer(null);
    setIsModalOpen(true);
  };

  const handleEdit = (customer: any) => {
    setSelectedCustomer(customer);
    setIsModalOpen(true);
  };

  const handleStatement = (customerId: number) => {
    setStatementCustomerId(customerId);
    setIsStatementOpen(true);
  };

  const handleQuickPayment = (customer: any) => {
    setPaymentCustomer(customer);
    setIsPaymentOpen(true);
  };

  return (
    <div className="h-full flex flex-col relative">
      <div className="flex-1 bg-background_secondary border border-border_default rounded-2xl overflow-hidden flex flex-col">
        {/* Single Row Toolbar: Search + Total + Actions */}
        <div className="flex items-center justify-between px-8 h-24 shrink-0 bg-background_primary shadow-sm border-b border-border_default/20">
          <div className="relative flex-1 max-w-[600px]">
            <Search size={22} className="absolute right-4 top-1/2 -translate-y-1/2 text-primary_blue/60" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder={`بحث (الاسم، العنوان، الهاتف)... (${shortcuts.search_product})`}
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full bg-background_card border border-border_default rounded-xl h-14 pr-14 pl-4 text-base text-text_primary font-bold placeholder:text-text_muted/50 focus:border-primary_blue focus:ring-2 focus:ring-primary_blue/20 outline-none transition-all"
            />
          </div>
          <div className="flex items-center gap-6 shrink-0">
            <div className="flex items-center gap-2 px-6 py-3 bg-background_card border border-border_default rounded-xl text-text_primary">
              <span className="text-sm font-bold text-text_muted">إجمالي الزبائن:</span>
              <span className="font-numbers font-black text-primary_blue text-xl">{total}</span>
            </div>
            {hasPermission('manage_customers') && (
              <ToolbarButton
                icon={<Plus size={22} />}
                label="إضافة زبون"
                onClick={handleAdd}
                className="text-primary_blue border-primary_blue/40 bg-primary_blue/10 hover:bg-primary_blue/20 h-14 px-8 text-base font-bold"
              />
            )}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-y-scroll flex-1 custom-scrollbar">
          <table className="w-full text-sm text-right border-collapse">
            <thead className="sticky top-0 z-30 bg-gradient-to-b from-table_header_from to-table_header_to border-b border-black/30 dark:border-border_default shadow-[0_10px_30px_rgba(0,0,0,0.5)] relative">
              <tr className="h-[52px]">
                <th className="px-3 font-bold text-[13px] text-text_primary uppercase tracking-wide border-l border-black/30 dark:border-border_default cursor-pointer hover:bg-background_card select-none transition-all duration-200" onClick={() => toggleSort('name')}>
                  الاسم{sortKey === 'name' && sortDir === 'asc' ? <span className="mr-1 text-emerald-400">↑</span> : sortKey === 'name' && sortDir === 'desc' ? <span className="mr-1 text-red-400">↓</span> : null}
                </th>
                <th className="px-3 font-bold text-[13px] text-text_primary uppercase tracking-wide border-l border-black/30 dark:border-border_default cursor-pointer hover:bg-background_card select-none transition-all duration-200" onClick={() => toggleSort('phone')}>
                  الهاتف{sortKey === 'phone' && sortDir === 'asc' ? <span className="mr-1 text-emerald-400">↑</span> : sortKey === 'phone' && sortDir === 'desc' ? <span className="mr-1 text-red-400">↓</span> : null}
                </th>
                <th className="px-3 font-bold text-[13px] text-text_primary uppercase tracking-wide border-l border-black/30 dark:border-border_default text-center cursor-pointer hover:bg-background_card select-none transition-all duration-200" onClick={() => toggleSort('balance')}>
                  الرصيد الحالي (الدين){sortKey === 'balance' && sortDir === 'asc' ? <span className="mr-1 text-emerald-400">↑</span> : sortKey === 'balance' && sortDir === 'desc' ? <span className="mr-1 text-red-400">↓</span> : null}
                </th>
                <th className="px-3 font-bold text-[13px] text-text_primary uppercase tracking-wide border-l border-black/30 dark:border-border_default text-center cursor-pointer hover:bg-background_card select-none transition-all duration-200" onClick={() => toggleSort('credit_limit')}>
                  سقف الدين{sortKey === 'credit_limit' && sortDir === 'asc' ? <span className="mr-1 text-emerald-400">↑</span> : sortKey === 'credit_limit' && sortDir === 'desc' ? <span className="mr-1 text-red-400">↓</span> : null}
                </th>
                <th className="px-3 font-bold text-[13px] text-text_primary uppercase tracking-wide border-l border-black/30 dark:border-border_default text-center select-none">الحالة</th>
                <th className="px-3 font-bold text-[13px] text-text_primary uppercase tracking-wide border-l border-black/30 dark:border-border_default text-center select-none">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border_default">
              {loading ? (
                <tr className="h-11">
                  <td colSpan={6} className="px-4 py-8 text-center text-text_muted bg-background_secondary">جاري التحميل...</td>
                </tr>
              ) : customers.length === 0 ? (
                <tr className="h-11">
                  <td colSpan={6} className="px-4 py-8 text-center text-text_muted bg-background_secondary">لا يوجد زبائن</td>
                </tr>
              ) : (
                customers.map((c, idx) => (
                  <tr key={c.id} className={`h-11 hover:bg-primary_blue/5 transition-colors group ${idx % 2 === 0 ? 'bg-background_secondary' : 'bg-sidebar_bg'}`}>
                    <td className="px-3 py-2 font-bold text-text_primary border-l border-border_default">{c.name}</td>
                    <td className="px-3 py-2 font-bold font-numbers text-text_muted border-l border-border_default flex items-center gap-2">
                      {c.phone ? <><Phone size={12} /> {c.phone}</> : '-'}
                    </td>
                    <td className="px-3 py-2 font-numbers text-center border-l border-border_default">
                      <span className={`font-bold ${c.balance > 0 ? 'text-danger_red' : c.balance < 0 ? 'text-success_green' : 'text-text_secondary'}`}>
                        {c.balance.toFixed(2)} د.ج
                      </span>
                    </td>
                    <td className="px-3 py-2 font-bold font-numbers text-center text-text_muted border-l border-border_default">
                      {c.credit_limit > 0 ? `${c.credit_limit.toFixed(2)} د.ج` : 'لا يوجد'}
                    </td>
<td className="px-3 py-2 text-center border-l border-border_default">
  <span className={`px-2 py-1 rounded-lg text-xs font-bold ${
    c.is_active ? 'bg-success_green/10 text-success_green' : 'bg-danger_red/10 text-danger_red'
                      }`}>
                        {c.is_active ? 'نشط' : 'موقوف'}
                      </span>
                    </td>
<td className="px-3 py-2 border-l border-border_default">
  <div className="flex items-center justify-center gap-2">
    <button 
      title="تسديد دفعة"
                          className="p-1.5 text-text_muted hover:text-success_green transition-colors rounded-lg hover:bg-success_green/10"
                          onClick={() => handleQuickPayment(c)}
                        >
                          <Wallet size={16} />
                        </button>
                        <button 
      title="كشف حساب"
                          className="p-1.5 text-text_muted hover:text-primary_blue transition-colors rounded-lg hover:bg-primary_blue/10"
                          onClick={() => handleStatement(c.id)}
                        >
                          <FileText size={16} />
                        </button>
                        {hasPermission('manage_customers') && (
                          <button 
                            title="تعديل"
                            className="p-1.5 text-text_muted hover:text-warning_amber transition-colors rounded-lg hover:bg-warning_amber/10"
                            onClick={() => handleEdit(c)}
                          >
                            <Edit size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
              {ghostRowCount > 0 && Array.from({ length: ghostRowCount }).map((_, i) => (
                <tr key={`ghost-${i}`} className={`h-11 pointer-events-none ${(customers.length + i) % 2 === 0 ? 'bg-background_secondary' : 'bg-sidebar_bg'}`}>
                  <td className="px-3 py-2 border-l border-border_default">&nbsp;</td>
                  <td className="px-3 py-2 border-l border-border_default">&nbsp;</td>
                  <td className="px-3 py-2 border-l border-border_default text-center">&nbsp;</td>
                  <td className="px-3 py-2 border-l border-border_default text-center">&nbsp;</td>
                  <td className="px-3 py-2 border-l border-border_default text-center">&nbsp;</td>
                  <td className="px-3 py-2 border-l border-border_default text-center">&nbsp;</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      </div>

      <CustomerModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSaved={loadCustomers}
        customer={selectedCustomer}
      />

      <CustomerStatement
        isOpen={isStatementOpen}
        onClose={() => {
          setIsStatementOpen(false);
          loadCustomers();
        }}
        customerId={statementCustomerId}
      />

      <RecordPaymentModal
        isOpen={isPaymentOpen}
        onClose={() => setIsPaymentOpen(false)}
        partyId={paymentCustomer?.id}
        partyType="customer"
        partyName={paymentCustomer?.name || ''}
        onSuccess={loadCustomers}
      />
    </div>
  );
}