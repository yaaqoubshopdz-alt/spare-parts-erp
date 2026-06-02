/**
 * SalesPage — صفحة إدارة فواتير المبيعات
 */
import { useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, FileText, Trash2, AlertTriangle, X, Layers } from 'lucide-react';
import { useWorkspaceStore } from '../../store/workspaceStore';
import ToolbarButton from '../../shared/components/ui/ToolbarButton';
import { useShortcutStore } from '../../store/shortcutStore';
import { showSuccess, showError, showNav } from '../../shared/utils/notifications';
import { motion, AnimatePresence } from 'framer-motion';

export default function SalesPage() {
  const { hasPermission } = useAuth();
  const navigate = useNavigate();
  const { toggleSwitcher } = useWorkspaceStore();
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

  type SalesSortKey = 'invoice_number' | 'date' | 'customer_name' | 'total' | 'paid';
  const [sortKey, setSortKey] = useState<SalesSortKey | null>('date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc' | null>('desc');

  const toggleSort = useCallback((key: SalesSortKey) => {
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
      const res = await window.electronAPI.invoke('db:sales:getAll', {
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
      showError('خطأ في تحميل الفواتير');
    } finally {
      setLoading(false);
    }
  };

  const deleteDraft = async (id: number) => {
    try {
      const res = await window.electronAPI.invoke('db:sales:deleteDraft', id);
      if (res.success) {
        showSuccess('تم حذف المسودة');
        loadInvoices();
      } else {
        showError(res.error);
      }
    } catch {
      showError('حدث خطأ أثناء الحذف');
    }
  };

  const deleteAllDrafts = async () => {
    setDeleteLoading(true);
    try {
      const res = await window.electronAPI.invoke('db:sales:deleteAllDrafts');
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
                <p className="text-sm text-text_primary font-bold">سيتم حذف جميع فواتير المبيعات المسودة نهائياً.</p>
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

      <div className="flex-1 bg-background_secondary border border-border_default rounded-2xl overflow-hidden flex flex-col">
        {/* Single Row Toolbar: Search + Total + Drafts Toggle + Actions */}
        <div className="flex items-center justify-between px-8 h-24 shrink-0 bg-background_primary shadow-sm border-b border-border_default/20">
          <div className="relative flex-1 max-w-[600px]">
            <Search size={22} className="absolute right-4 top-1/2 -translate-y-1/2 text-primary_blue/60" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder={`بحث (رقم الفاتورة، اسم الزبون)... (${shortcuts.search_product})`}
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full bg-background_card border border-border_default rounded-xl h-14 pr-14 pl-6 text-base text-text_primary font-bold placeholder:text-text_muted/50 focus:border-primary_blue focus:ring-2 focus:ring-primary_blue/20 outline-none transition-all"
            />
          </div>
          <div className="flex items-center gap-4 shrink-0">
            <div className="flex items-center gap-3 px-6 py-3 bg-background_card border border-border_default rounded-xl text-text_primary">
              <span className="text-sm font-bold text-text_muted">{isDraftMode ? 'عدد المسودات:' : 'إجمالي المبيعات:'}</span>
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

            {hasPermission('create_sales') && (
              <div className="flex items-center gap-2">
                <button 
                  onClick={toggleSwitcher}
                  className="w-14 h-14 flex items-center justify-center bg-background_card border-2 border-border_default text-text_muted hover:text-primary_blue hover:border-primary_blue/50 rounded-xl transition-all"
                  title="مساحات العمل"
                >
                  <Layers size={22} />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-y-scroll flex-1 custom-scrollbar">
          <table className="w-full text-sm text-right border-collapse">
            <thead className="sticky top-0 z-30 bg-gradient-to-b from-table_header_from to-table_header_to border-b border-black/30 dark:border-border_default shadow-[0_10px_30px_rgba(0,0,0,0.5)] relative">
              <tr className="h-[52px]">
                <th className="px-3 font-bold text-[13px] text-text_primary uppercase tracking-wide border-l border-black/30 dark:border-border_default cursor-pointer hover:bg-background_card select-none transition-all duration-200" onClick={() => toggleSort('invoice_number')}>
                  رقم الفاتورة{sortKey === 'invoice_number' && sortDir === 'asc' ? <span className="mr-1 text-emerald-400">↑</span> : sortKey === 'invoice_number' && sortDir === 'desc' ? <span className="mr-1 text-red-400">↓</span> : null}
                </th>
                <th className="px-3 font-bold text-[13px] text-text_primary uppercase tracking-wide border-l border-black/30 dark:border-border_default cursor-pointer hover:bg-background_card select-none transition-all duration-200" onClick={() => toggleSort('date')}>
                  التاريخ والوقت{sortKey === 'date' && sortDir === 'asc' ? <span className="mr-1 text-emerald-400">↑</span> : sortKey === 'date' && sortDir === 'desc' ? <span className="mr-1 text-red-400">↓</span> : null}
                </th>
                <th className="px-3 font-bold text-[13px] text-text_primary uppercase tracking-wide border-l border-black/30 dark:border-border_default cursor-pointer hover:bg-background_card select-none transition-all duration-200" onClick={() => toggleSort('customer_name')}>
                  الزبون{sortKey === 'customer_name' && sortDir === 'asc' ? <span className="mr-1 text-emerald-400">↑</span> : sortKey === 'customer_name' && sortDir === 'desc' ? <span className="mr-1 text-red-400">↓</span> : null}
                </th>
                <th className="px-3 font-bold text-[13px] text-text_primary uppercase tracking-wide border-l border-black/30 dark:border-border_default text-center cursor-pointer hover:bg-background_card select-none transition-all duration-200" onClick={() => toggleSort('total')}>
                  الإجمالي{sortKey === 'total' && sortDir === 'asc' ? <span className="mr-1 text-emerald-400">↑</span> : sortKey === 'total' && sortDir === 'desc' ? <span className="mr-1 text-red-400">↓</span> : null}
                </th>
                <th className="px-3 font-bold text-[13px] text-text_primary uppercase tracking-wide border-l border-black/30 dark:border-border_default text-center cursor-pointer hover:bg-background_card select-none transition-all duration-200" onClick={() => toggleSort('paid')}>
                  المدفوع{sortKey === 'paid' && sortDir === 'asc' ? <span className="mr-1 text-emerald-400">↑</span> : sortKey === 'paid' && sortDir === 'desc' ? <span className="mr-1 text-red-400">↓</span> : null}
                </th>
                <th className="px-3 font-bold text-[13px] text-text_primary uppercase tracking-wide border-l border-black/30 dark:border-border_default text-center select-none">المتبقي</th>
                <th className="px-3 font-bold text-[13px] text-text_primary uppercase tracking-wide border-l border-black/30 dark:border-border_default text-center select-none">حالة الدفع</th>
                {isDraftMode && (
                  <th className="px-3 font-bold text-[13px] text-text_primary uppercase tracking-wide text-center select-none w-16">حذف</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-border_default">
              {loading ? (
                <tr className="h-11"><td colSpan={isDraftMode ? 8 : 7} className="px-4 py-8 text-center text-text_muted bg-background_secondary">جاري التحميل...</td></tr>
              ) : invoices.length === 0 ? (
                <tr className="h-11"><td colSpan={isDraftMode ? 8 : 7} className="px-4 py-8 text-center text-text_muted bg-background_secondary">
                  {isDraftMode ? 'لا توجد مسودات' : 'لا توجد فواتير'}
                </td></tr>
              ) : (
                <>
                  {invoices.map((inv, idx) => (
                    <tr key={inv.id} className={`h-11 hover:bg-primary_blue/5 transition-colors group cursor-pointer ${idx % 2 === 0 ? 'bg-background_secondary' : 'bg-sidebar_bg'}`}
                      onClick={() => {
                        showNav(inv.status === 'draft' ? 'إكمال المسودة' : 'عرض الفاتورة');
                        navigate('/pos?invoiceId=' + inv.id);
                      }}
                    >
                      <td className="px-3 py-2 font-numbers text-primary_blue font-medium border-l border-border_default">{inv.invoice_number}</td>
                      <td className="px-3 py-2 font-bold font-numbers text-text_secondary border-l border-border_default">{inv.date} {inv.time}</td>
                      <td className="px-3 py-2 font-bold text-text_primary border-l border-border_default">{inv.customer_name || 'زبون عام'}</td>
                      <td className="px-3 py-2 font-numbers text-center font-bold text-text_primary border-l border-border_default">
                        {inv.total.toFixed(2)} د.ج
                      </td>
                      <td className="px-3 py-2 font-bold font-numbers text-center text-success_green border-l border-border_default">
                        {(inv.paid || 0).toFixed(2)} د.ج
                      </td>
                      <td className={`px-3 py-2 font-numbers text-center font-bold border-l border-border_default ${(inv.total - (inv.paid || 0)) > 0 ? 'text-orange-500' : 'text-success_green'}`}>
                        {(inv.total - (inv.paid || 0)).toFixed(2)} د.ج
                      </td>
                      <td className="px-3 py-2 text-center border-l border-border_default">
                        {inv.status === 'draft' ? (
                          <span className="text-warning_amber text-xs font-bold bg-warning_amber/10 px-2 py-1 rounded flex items-center justify-center gap-1"><FileText size={12} />مسودة</span>
                        ) : inv.paid >= inv.total ? (
                          <span className="text-success_green text-xs font-bold bg-success_green/10 px-2 py-1 rounded">مدفوع</span>
                        ) : inv.paid > 0 && inv.paid < inv.total ? (
                          <span className="text-warning_amber text-xs font-bold bg-warning_amber/10 px-2 py-1 rounded">متبقي</span>
                        ) : (
                          <span className="text-danger_red text-xs font-bold bg-danger_red/10 px-2 py-1 rounded">غير مدفوع</span>
                        )}
                      </td>
                      {isDraftMode && (
                        <td className="px-2 py-2 text-center">
                          <button onClick={(e) => { e.stopPropagation(); deleteDraft(inv.id); }}
                            className="p-1.5 text-text_muted hover:text-danger_red hover:bg-danger_red/10 rounded-lg transition-all active:scale-90">
                            <Trash2 size={16} />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                  {/* Ghost Rows — داخل نفس <tbody> لتطابق خطوط الأعمدة */}
                  {Array.from({ length: Math.max(0, 18 - invoices.length) }).map((_, idx) => (
                    <tr key={`ghost-${idx}`} className={`h-11 pointer-events-none ${(invoices.length + idx) % 2 === 0 ? 'bg-background_secondary' : 'bg-sidebar_bg'}`}>
                      <td className="border-l border-border_default">&nbsp;</td>
                      <td className="border-l border-border_default">&nbsp;</td>
                      <td className="border-l border-border_default">&nbsp;</td>
                      <td className="border-l border-border_default">&nbsp;</td>
                      <td className="border-l border-border_default">&nbsp;</td>
                      <td className="border-l border-border_default">&nbsp;</td>
                      <td className="border-l border-border_default">&nbsp;</td>
                      {isDraftMode && <td>&nbsp;</td>}
                    </tr>
                  ))}
                </>
              )}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  );
}
