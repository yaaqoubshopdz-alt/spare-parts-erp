/**
 * PurchasesPage — صفحة إدارة فواتير المشتريات
 */
import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, FileText, Trash2, AlertTriangle } from 'lucide-react';
import ToolbarButton from '../../shared/components/ui/ToolbarButton';
import { useShortcutStore } from '../../store/shortcutStore';
import { showSuccess, showError, showNav } from '../../shared/utils/notifications';
import { motion, AnimatePresence } from 'framer-motion';
import ERPTable, { useColumnManager } from '../../shared/components/table';
import type { ERPColumn } from '../../shared/components/table/types';

export default function PurchasesPage() {
  const { hasPermission } = useAuth();
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 99999;

  // Draft mode toggle
  const [isDraftMode, setIsDraftMode] = useState(false);

  // Delete confirmation modal
  const [showDeleteAllModal, setShowDeleteAllModal] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

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

  type PurchasesSortKey = 'supplier_invoice_number' | 'date' | 'supplier_name' | 'total' | 'paid';
  const [sortKey, setSortKey] = useState<PurchasesSortKey | null>('date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc' | null>('desc');

  const toggleSort = useCallback((key: string) => {
    const k = key as PurchasesSortKey;
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

  // Sync isDraftMode with status filter
  useEffect(() => {
    setStatus(isDraftMode ? 'draft' : '');
    setPage(1);
  }, [isDraftMode]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadInvoices();
    }, 300);
    return () => clearTimeout(timer);
  }, [search, status, page, sortKey, sortDir]);

  const loadInvoices = async () => {
    setLoading(true);
    try {
      const res = await window.electronAPI.invoke('db:purchases:getAll', {
        search, status, page, limit,
        sortKey: sortDir !== null ? sortKey : undefined,
        sortDir: sortDir !== null ? sortDir : undefined,
      });
      if (res.success) {
        setInvoices(res.data);
        setTotal(res.total);
      } else {
        showError(res.error);
      }
    } catch (err) {
      showError('خطأ في تحميل المشتريات');
    } finally {
      setLoading(false);
    }
  };

  const deleteDraft = useCallback(async (id: number) => {
    try {
      const res = await window.electronAPI.invoke('db:purchases:deleteDraft', id);
      if (res.success) {
        showSuccess('تم حذف المسودة');
        loadInvoices();
      } else {
        showError(res.error);
      }
    } catch {
      showError('حدث خطأ أثناء الحذف');
    }
  }, []);

  const deleteAllDrafts = async () => {
    setDeleteLoading(true);
    try {
      const res = await window.electronAPI.invoke('db:purchases:deleteAllDrafts');
      if (res.success) {
        showSuccess(`تم حذف ${res.deleted} مسودة`);
        setShowDeleteAllModal(false);
        loadInvoices();
      } else {
        showError(res.error);
      }
    } catch {
      showError('حدث خطأ أثناء الحذف');
    } finally {
      setDeleteLoading(false);
    }
  };

  // ── تعريف الأعمدة المشتركة مع دعم Resize & Drag & Hide ──
  const DEFAULT_COLUMNS = useMemo<ERPColumn<any>[]>(() => {
    const cols: ERPColumn<any>[] = [
      {
        key: 'supplier_invoice_number',
        label: 'رقم الفاتورة',
        sortable: true,
        width: 140,
        resizable: true,
        draggable: true,
        render: (inv) => (
          <span className="font-numbers font-bold text-primary_blue text-base">
            {inv.supplier_invoice_number || inv.invoice_number || '-'}
          </span>
        ),
      },
      {
        key: 'date',
        label: 'التاريخ',
        sortable: true,
        width: 140,
        resizable: true,
        draggable: true,
        render: (inv) => (
          <span className="font-bold font-numbers text-text_secondary">
            {new Date(inv.date).toLocaleDateString('en-GB')}
          </span>
        ),
      },
      {
        key: 'supplier_name',
        label: 'المورد',
        sortable: true,
        flex: 1,
        resizable: true,
        draggable: true,
        render: (inv) => (
          <span className="font-bold text-text_primary">
            {inv.supplier_name || 'مورد عام'}
          </span>
        ),
      },
      {
        key: 'total',
        label: 'الإجمالي',
        sortable: true,
        align: 'center',
        width: 140,
        resizable: true,
        draggable: true,
        render: (inv) => (
          <span className="font-numbers font-bold text-text_primary">
            {inv.total.toFixed(2)} د.ج
          </span>
        ),
      },
      {
        key: 'paid',
        label: 'المدفوع',
        sortable: true,
        align: 'center',
        width: 140,
        resizable: true,
        draggable: true,
        render: (inv) => (
          <span className="font-bold font-numbers text-danger_red">
            {inv.paid.toFixed(2)} د.ج
          </span>
        ),
      },
      {
        key: 'remaining',
        label: 'المتبقي',
        align: 'center',
        width: 140,
        resizable: true,
        draggable: true,
        render: (inv) => (
          <span className={`font-numbers font-bold ${inv.total - inv.paid > 0 ? 'text-orange-500' : 'text-success_green'}`}>
            {(inv.total - inv.paid).toFixed(2)} د.ج
          </span>
        ),
      },
      {
        key: 'status',
        label: 'حالة الدفع',
        align: 'center',
        width: 140,
        resizable: true,
        draggable: true,
        render: (inv) => {
          if (inv.status === 'draft') {
            return <span className="text-warning_amber text-xs font-bold bg-warning_amber/10 px-2 py-1 rounded flex items-center justify-center gap-1"><FileText size={12} />مسودة</span>;
          }
          if (inv.paid >= inv.total) {
            return <span className="text-success_green text-xs font-bold bg-success_green/10 px-2 py-1 rounded">مدفوع</span>;
          }
          if (inv.paid > 0) {
            return <span className="text-warning_amber text-xs font-bold bg-warning_amber/10 px-2 py-1 rounded">متبقي</span>;
          }
          return <span className="text-danger_red text-xs font-bold bg-danger_red/10 px-2 py-1 rounded">غير مدفوع</span>;
        },
      },
    ];

    if (isDraftMode) {
      cols.push({
        key: 'delete_draft',
        label: 'حذف',
        align: 'center',
        width: 60,
        resizable: false,
        draggable: false,
        render: (inv) => (
          <button
            onClick={(e) => {
              e.stopPropagation();
              deleteDraft(inv.id);
            }}
            className="p-1.5 text-text_muted hover:text-danger_red hover:bg-danger_red/10 rounded-lg transition-all active:scale-90"
          >
            <Trash2 size={16} />
          </button>
        ),
      });
    }

    return cols;
  }, [isDraftMode, deleteDraft]);

  const storageKey = isDraftMode ? 'erp_columns_purchases_list_draft_v1' : 'erp_columns_purchases_list_v1';

  const {
    columns,
    allColumns,
    setWidth,
    toggleHide,
    reorder,
    reset,
    showAll,
  } = useColumnManager<ERPColumn<any>>(storageKey, DEFAULT_COLUMNS);

  const handleRowClick = (inv: any) => {
    showNav(inv.status === 'draft' ? 'إكمال المسودة' : 'عرض الفاتورة');
    navigate('/purchases/' + inv.id);
  };

  return (
    <div className="h-full flex flex-col relative">
      {/* Delete All Confirmation Modal */}
      <AnimatePresence>
        {showDeleteAllModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[1000] flex items-center justify-center p-4" onClick={() => setShowDeleteAllModal(false)}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="glass-card p-6 w-full max-w-md rounded-2xl" onClick={e => e.stopPropagation()}>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-danger_red/20 flex items-center justify-center">
                  <AlertTriangle size={24} className="text-danger_red" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-text_primary">حذف جميع المسودات</h3>
                  <p className="text-sm text-text_muted mt-1">هذا الإجراء لا يمكن التراجع عنه</p>
                </div>
              </div>
              <div className="p-4 bg-danger_red/5 border border-danger_red/20 rounded-xl mb-6">
                <p className="text-sm text-text_primary font-bold">سيتم حذف جميع فواتير المشتريات المسودة نهائياً.</p>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setShowDeleteAllModal(false)}
                  className="flex-1 py-3 bg-background_card border border-border_default text-text_primary rounded-xl font-bold hover:bg-background_card_hover transition-all">
                  إلغاء
                </button>
                <button onClick={deleteAllDrafts} disabled={deleteLoading}
                  className="flex-1 py-3 bg-danger_red text-white rounded-xl font-bold hover:bg-danger_red/90 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                  {deleteLoading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Trash2 size={18} />}
                  {deleteLoading ? 'جاري الحذف...' : 'تأكيد الحذف'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="flex-1 border border-black/[0.07] dark:border-white/[0.06] rounded-2xl overflow-hidden flex flex-col">
        <ERPTable
          data={invoices}
          columns={columns}
          loading={loading}
          rowKey="id"
          sortKey={sortKey}
          sortDir={sortDir}
          onSort={toggleSort}
          onRowClick={handleRowClick}
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
                  placeholder={`بحث (رقم الفاتورة، المورد)... (${shortcuts.search_product})`}
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                  className="w-full bg-background_card border border-border_default rounded-xl h-14 pr-14 pl-4 text-base text-text_primary font-bold placeholder:text-text_muted/50 focus:border-primary_blue focus:ring-2 focus:ring-primary_blue/20 outline-none transition-all"
                />
              </div>
              <div className="flex items-center gap-4 shrink-0">
                <div className="flex items-center gap-3 px-6 py-3 bg-background_card border border-border_default rounded-xl text-text_primary">
                  <span className="text-sm font-bold text-text_muted">{isDraftMode ? 'عدد المسودات:' : 'إجمالي المشتريات:'}</span>
                  <span className="font-numbers font-black text-primary_blue text-xl">{total}</span>
                </div>

                {/* Drafts Toggle Button */}
                <button onClick={() => setIsDraftMode(!isDraftMode)}
                  className={`relative flex items-center gap-2 px-5 h-14 rounded-xl font-bold text-base border-2 transition-all ${
                    isDraftMode 
                      ? 'bg-warning_amber/20 text-warning_amber border-warning_amber/50 shadow-[0_0_15px_rgba(245,158,11,0.15)]' 
                      : 'bg-background_card text-text_muted border-border_default hover:text-text_primary hover:border-border_default'
                  }`}
                >
                  <FileText size={20} />
                  <span>المسودات</span>
                  {isDraftMode && (
                    <span className="w-2 h-2 rounded-full bg-warning_amber animate-pulse" />
                  )}
                </button>

                {/* Delete All Drafts Button — visible only in draft mode */}
                {isDraftMode && invoices.length > 0 && (
                  <button onClick={() => setShowDeleteAllModal(true)}
                    className="flex items-center gap-2 px-4 h-14 rounded-xl font-bold text-base bg-danger_red/10 text-danger_red border-2 border-danger_red/30 hover:bg-danger_red/20 transition-all"
                  >
                    <Trash2 size={18} />
                    حذف الكل
                  </button>
                )}



                {hasPermission('create_purchases') && (
                  <ToolbarButton
                    icon={<Plus size={22} />}
                    label="إدخال جديد"
                    onClick={() => navigate('/purchases/new')}
                    className="text-primary_blue border-primary_blue/40 bg-primary_blue/10 hover:bg-primary_blue/20 h-14 px-8 text-base font-bold"
                  />
                )}
              </div>
            </div>
          }
        />
      </div>
    </div>
  );
}
