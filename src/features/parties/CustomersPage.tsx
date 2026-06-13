/**
 * CustomersPage — صفحة إدارة الزبائن
 */
import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { Search, Plus, Edit, FileText, Phone, Wallet } from 'lucide-react';
import ToolbarButton from '../../shared/components/ui/ToolbarButton';
import { useShortcutStore } from '../../store/shortcutStore';
import { showSuccess, showError } from '../../shared/utils/notifications';
import CustomerModal from './CustomerModal';
import CustomerStatement from './CustomerStatement';
import RecordPaymentModal from './components/RecordPaymentModal';
import ERPTable, { useColumnManager } from '../../shared/components/table';
import type { ERPColumn } from '../../shared/components/table/types';

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

  type CustomersSortKey = 'name' | 'phone' | 'balance' | 'credit_limit';
  const [sortKey, setSortKey] = useState<CustomersSortKey | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc' | null>(null);

  const toggleSort = useCallback((key: string) => {
    const k = key as CustomersSortKey;
    if (sortKey !== k) {
      setSortKey(k);
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

  const handleEdit = useCallback((customer: any) => {
    setSelectedCustomer(customer);
    setIsModalOpen(true);
  }, []);

  const handleStatement = useCallback((customerId: number) => {
    setStatementCustomerId(customerId);
    setIsStatementOpen(true);
  }, []);

  const handleQuickPayment = useCallback((customer: any) => {
    setPaymentCustomer(customer);
    setIsPaymentOpen(true);
  }, []);

  // ── تعريف الأعمدة مع دعم Resize & Drag & Hide ──
  const DEFAULT_COLUMNS = useMemo<ERPColumn<any>[]>(() => [
    {
      key: 'name',
      label: 'الاسم',
      sortable: true,
      flex: 1,
      resizable: true,
      draggable: true,
      render: (c) => <span className="font-bold text-text_primary">{c.name}</span>,
    },
    {
      key: 'phone',
      label: 'الهاتف',
      sortable: true,
      width: 150,
      resizable: true,
      draggable: true,
      render: (c) => (
        <span className="font-bold font-numbers text-text_muted flex items-center gap-2">
          {c.phone ? <><Phone size={12} /> {c.phone}</> : '-'}
        </span>
      ),
    },
    {
      key: 'balance',
      label: 'الرصيد الحالي (الدين)',
      sortable: true,
      align: 'center',
      width: 180,
      resizable: true,
      draggable: true,
      render: (c) => (
        <span className={`font-numbers font-bold ${c.balance > 0 ? 'text-danger_red' : c.balance < 0 ? 'text-success_green' : 'text-text_secondary'}`}>
          {c.balance.toFixed(2)} د.ج
        </span>
      ),
    },
    {
      key: 'credit_limit',
      label: 'سقف الدين',
      sortable: true,
      align: 'center',
      width: 150,
      resizable: true,
      draggable: true,
      render: (c) => (
        <span className="font-bold font-numbers text-text_muted">
          {c.credit_limit > 0 ? `${c.credit_limit.toFixed(2)} د.ج` : 'لا يوجد'}
        </span>
      ),
    },
    {
      key: 'is_active',
      label: 'الحالة',
      align: 'center',
      width: 120,
      resizable: true,
      draggable: true,
      render: (c) => (
        <span className={`px-2 py-1 rounded-lg text-xs font-bold ${c.is_active ? 'bg-success_green/10 text-success_green' : 'bg-danger_red/10 text-danger_red'}`}>
          {c.is_active ? 'نشط' : 'موقوف'}
        </span>
      ),
    },
    {
      key: 'actions',
      label: 'إجراءات',
      align: 'center',
      width: 160,
      resizable: false,
      draggable: false,
      render: (c) => (
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
      ),
    },
  ], [hasPermission, handleQuickPayment, handleStatement, handleEdit]);

  const {
    columns,
    allColumns,
    setWidth,
    toggleHide,
    reorder,
    reset,
    showAll,
  } = useColumnManager<ERPColumn<any>>('erp_columns_customers_v1', DEFAULT_COLUMNS);

  return (
    <div className="h-full flex flex-col relative">
      <div className="flex-1 border border-black/[0.07] dark:border-white/[0.06] rounded-2xl overflow-hidden flex flex-col">
        <ERPTable
          data={customers}
          columns={columns}
          loading={loading}
          rowKey="id"
          sortKey={sortKey}
          sortDir={sortDir}
          onSort={toggleSort}
          className="h-full"
          minRows={18}
          onResizeColumn={setWidth}
          onReorderColumns={reorder}
          onToggleHideColumn={toggleHide}
          onResetColumns={reset}
          onShowAllColumns={showAll}
          hasHiddenColumns={allColumns.some(c => c.hidden)}
          toolbar={
            <div className="flex items-center justify-between px-8 h-24 shrink-0 bg-white/30 dark:bg-black/30 backdrop-blur-xl border-b border-black/[0.07] dark:border-white/[0.07]">
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
              <div className="flex items-center gap-4 shrink-0">
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
          }
        />
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