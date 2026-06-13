/**
 * SuppliersPage — صفحة إدارة الموردين
 */
import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { Search, Plus, Edit, FileText, Phone, Wallet } from 'lucide-react';
import ToolbarButton from '../../shared/components/ui/ToolbarButton';
import { useShortcutStore } from '../../store/shortcutStore';
import { showSuccess, showError } from '../../shared/utils/notifications';
import SupplierModal from './SupplierModal';
import SupplierStatement from './SupplierStatement';
import RecordPaymentModal from './components/RecordPaymentModal';
import ERPTable, { useColumnManager } from '../../shared/components/table';
import type { ERPColumn } from '../../shared/components/table/types';

export default function SuppliersPage() {
  const { hasPermission } = useAuth();
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<any | null>(null);

  const [isStatementOpen, setIsStatementOpen] = useState(false);
  const [statementSupplierId, setStatementSupplierId] = useState<number | null>(null);

  // Payment Modal State
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [paymentSupplier, setPaymentSupplier] = useState<any | null>(null);

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

  type SuppliersSortKey = 'name' | 'phone' | 'balance';
  const [sortKey, setSortKey] = useState<SuppliersSortKey | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc' | null>(null);

  const toggleSort = useCallback((key: string) => {
    const k = key as SuppliersSortKey;
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
  }, [sortKey]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadSuppliers();
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const loadSuppliers = async () => {
    setLoading(true);
    try {
      const res = await window.electronAPI.invoke('db:suppliers:getAll', { search });
      if (res.success) {
        setSuppliers(res.data);
      } else {
        showError(res.error);
      }
    } catch {
      showError('خطأ في تحميل الموردين');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setSelectedSupplier(null);
    setIsModalOpen(true);
  };

  const handleEdit = useCallback((supplier: any) => {
    setSelectedSupplier(supplier);
    setIsModalOpen(true);
  }, []);

  const handleStatement = useCallback((supplierId: number) => {
    setStatementSupplierId(supplierId);
    setIsStatementOpen(true);
  }, []);

  const handleQuickPayment = useCallback((supplier: any) => {
    setPaymentSupplier(supplier);
    setIsPaymentOpen(true);
  }, []);

  // Client-side sort suppliers list
  const sortedSuppliers = useMemo(() => {
    if (!sortKey || !sortDir) return suppliers;
    return [...suppliers].sort((a, b) => {
      let cmp = 0;
      if (sortKey === 'name') cmp = a.name?.localeCompare(b.name || '') || 0;
      else if (sortKey === 'phone') cmp = (a.phone || '').localeCompare(b.phone || '');
      else if (sortKey === 'balance') cmp = (a.balance || 0) - (b.balance || 0);
      return sortDir === 'desc' ? -cmp : cmp;
    });
  }, [suppliers, sortKey, sortDir]);

  // ── تعريف الأعمدة المشتركة مع دعم Resize & Drag & Hide ──
  const DEFAULT_COLUMNS = useMemo<ERPColumn<any>[]>(() => [
    {
      key: 'name',
      label: 'الاسم / الشركة',
      sortable: true,
      flex: 1,
      resizable: true,
      draggable: true,
      render: (s) => <span className="font-bold text-text_primary">{s.name}</span>,
    },
    {
      key: 'phone',
      label: 'الهاتف',
      sortable: true,
      width: 150,
      resizable: true,
      draggable: true,
      render: (s) => (
        <span className="font-bold font-numbers text-text_muted flex items-center gap-2">
          {s.phone ? <><Phone size={12} /> {s.phone}</> : '-'}
        </span>
      ),
    },
    {
      key: 'balance',
      label: 'الرصيد الحالي (الديون)',
      sortable: true,
      align: 'center',
      width: 180,
      resizable: true,
      draggable: true,
      render: (s) => (
        <span className={`font-numbers font-bold ${s.balance > 0 ? 'text-danger_red' : s.balance < 0 ? 'text-success_green' : 'text-text_secondary'}`}>
          {s.balance.toFixed(2)} د.ج
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
      render: (s) => (
        <span className={`px-2 py-1 rounded-lg text-xs font-bold ${s.is_active ? 'bg-success_green/10 text-success_green' : 'bg-danger_red/10 text-danger_red'}`}>
          {s.is_active ? 'نشط' : 'موقوف'}
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
      render: (s) => (
        <div className="flex items-center justify-center gap-2">
          <button 
            title="تسديد دفعة"
            className="p-1.5 text-text_muted hover:text-success_green transition-colors rounded-lg hover:bg-success_green/10"
            onClick={() => handleQuickPayment(s)}
          >
            <Wallet size={16} />
          </button>
          <button 
            title="كشف حساب"
            className="p-1.5 text-text_muted hover:text-primary_blue transition-colors rounded-lg hover:bg-primary_blue/10"
            onClick={() => handleStatement(s.id)}
          >
            <FileText size={16} />
          </button>
          {hasPermission('manage_suppliers') && (
            <button 
              title="تعديل"
              className="p-1.5 text-text_muted hover:text-warning_amber transition-colors rounded-lg hover:bg-warning_amber/10"
              onClick={() => handleEdit(s)}
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
  } = useColumnManager<ERPColumn<any>>('erp_columns_suppliers_v1', DEFAULT_COLUMNS);

  return (
    <div className="h-full flex flex-col relative">
      <div className="flex-1 border border-black/[0.07] dark:border-white/[0.06] rounded-2xl overflow-hidden flex flex-col">
        <ERPTable
          data={sortedSuppliers}
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
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-background_card border border-border_default rounded-xl h-14 pr-14 pl-4 text-base text-text_primary font-bold placeholder:text-text_muted/50 focus:border-primary_blue focus:ring-2 focus:ring-primary_blue/20 outline-none transition-all"
                />
              </div>
              <div className="flex items-center gap-4 shrink-0">
                <div className="flex items-center gap-2 px-6 py-3 bg-background_card border border-border_default rounded-xl text-text_primary">
                  <span className="text-sm font-bold text-text_muted">إجمالي الموردين:</span>
                  <span className="font-numbers font-black text-primary_blue text-xl">{suppliers.length}</span>
                </div>



                {hasPermission('manage_suppliers') && (
                  <ToolbarButton
                    icon={<Plus size={22} />}
                    label="إضافة مورد"
                    onClick={handleAdd}
                    className="text-primary_blue border-primary_blue/40 bg-primary_blue/10 hover:bg-primary_blue/20 h-14 px-8 text-base font-bold"
                  />
                )}
              </div>
            </div>
          }
        />
      </div>

      <SupplierModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSaved={loadSuppliers}
        supplier={selectedSupplier}
      />

      <SupplierStatement
        isOpen={isStatementOpen}
        onClose={() => {
          setIsStatementOpen(false);
          loadSuppliers();
        }}
        supplierId={statementSupplierId}
      />

      <RecordPaymentModal
        isOpen={isPaymentOpen}
        onClose={() => setIsPaymentOpen(false)}
        partyId={paymentSupplier?.id}
        partyType="supplier"
        partyName={paymentSupplier?.name || ''}
        onSuccess={loadSuppliers}
      />
    </div>
  );
}