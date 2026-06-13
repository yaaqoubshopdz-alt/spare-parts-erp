import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { flushSync } from 'react-dom';
import { Loader2 } from 'lucide-react';
import { showSuccess, showError, showInfo } from '../../shared/utils/notifications';
import { useAuth } from '../../hooks/useAuth';
import { AdminPinModal } from '../../shared/components/ui/AdminPinModal';
import { useColumnManager, type ERPColumn } from '../../shared/components/table';
import InventoryCountToolbar from './components/InventoryCountToolbar';
import InventoryCountTable from './components/InventoryCountTable';
import InventoryCountPagination from './components/InventoryCountPagination';
import CountFinishModal from './components/CountFinishModal';
import CountSummaryModal from './components/CountSummaryModal';
import QuantityEditModal from './components/QuantityEditModal';

interface CountSession {
  id: number;
  session_number: string;
  status: string;
  total_products: number;
  checked_count: number;
  match_count: number;
  mismatch_count: number;
  category_id: number | null;
  category_name_snapshot: string | null;
  started_by_name: string;
  started_at: string;
  finished_at: string | null;
  approved_at: string | null;
}

interface CountItem {
  id: number;
  product_id: number;
  barcode_snapshot: string | null;
  product_name_snapshot: string;
  category_name_snapshot: string | null;
  unit_name_snapshot: string | null;
  is_hidden_from_sales: number;
  system_qty_at_start: number;
  movements_during_count: number;
  expected_qty: number;
  counted_qty: number | null;
  final_difference: number | null;
  status: string;
  mismatch_reason: string | null;
  notes: string | null;
  current_system_qty: number;
  purchase_price?: number;
}

interface Props {
  categoryId?: number | null;
  onClose: () => void;
}

type SortKey = 'product_name_snapshot' | 'barcode_snapshot' | 'category_name_snapshot' | 'system_qty_at_start' | 'counted_qty' | 'final_difference';
type SortDir = 'asc' | 'desc' | null;

export default function InventoryCountPage({ categoryId, onClose }: Props) {
  const { user } = useAuth();

  const [categories, setCategories] = useState<any[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(categoryId || null);
  const [activeSession, setActiveSession] = useState<CountSession | null>(null);
  const [creating, setCreating] = useState(false);
  const [loadingSession, setLoadingSession] = useState(true);

  const [items, setItems] = useState<CountItem[]>([]);
  const [itemsLoading, setItemsLoading] = useState(true);
  const [itemsTotal, setItemsTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(17);

  const [itemsSearch, setItemsSearch] = useState('');
  const [searchTrigger, setSearchTrigger] = useState(0);
  const [itemsStatusFilter, setItemsStatusFilter] = useState<string>('');
  const [itemsZeroFilter, setItemsZeroFilter] = useState<string>('');

  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>(null);

  const [editingQty, setEditingQty] = useState<Record<number, string>>({});
  const saveTimers = useRef<Record<number, NodeJS.Timeout>>({});
  const searchTimerRef = useRef<NodeJS.Timeout | null>(null);
  const pendingSearchRef = useRef('');
  const itemsRef = useRef(items);
  itemsRef.current = items;

  const [showFinishModal, setShowFinishModal] = useState(false);
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [showQtyModal, setShowQtyModal] = useState(false);
  const [qtyModalItem, setQtyModalItem] = useState<CountItem | null>(null);
  const [finishing, setFinishing] = useState(false);
  const [approving, setApproving] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [qtySaving, setQtySaving] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [togglingHideProductId, setTogglingHideProductId] = useState<number | null>(null);

  const [durationStr, setDurationStr] = useState('00:00:00');
  const durationRef = useRef<number | null>(null);
  const sessionStartedRef = useRef<number>(0);

  const isCounting = activeSession?.status === 'counting';
  const isReviewing = activeSession?.status === 'reviewing';
  const isApproved = activeSession?.status === 'approved';

  const DEFAULT_COLUMNS = useMemo<ERPColumn<CountItem>[]>(() => [
    { key: 'index', label: '#', width: 44, align: 'center', resizable: false, draggable: false },
    { key: 'barcode_snapshot', label: 'الباركود', sortable: true, width: 110, resizable: true, draggable: true },
    { key: 'product_name_snapshot', label: 'الاسم', sortable: true, width: 220, resizable: true, draggable: true },
    { key: 'category_name_snapshot', label: 'التصنيف', sortable: true, width: 110, resizable: true, draggable: true },
    { key: 'system_qty_at_start', label: 'الكمية عند البدء', sortable: true, width: 100, align: 'center', resizable: true, draggable: true },
    { key: 'current_stock', label: 'المخزون الآني', width: 100, align: 'center', resizable: true, draggable: true },
    { key: 'counted_qty', label: 'العد', sortable: true, width: 90, align: 'center', resizable: true, draggable: true },
    { key: 'final_difference', label: 'الفرق', sortable: true, width: 90, align: 'center', resizable: true, draggable: true },
    { key: 'status', label: 'الحالة', width: 100, align: 'center', resizable: true, draggable: true },
    { key: 'hide', label: 'إخفاء', width: 50, align: 'center', resizable: false, draggable: false },
  ], []);

  const {
    columns,
    allColumns,
    setWidth,
    toggleHide,
    reorder,
    reset,
  } = useColumnManager<ERPColumn<CountItem>>('inventory_count_columns_layout_v1', DEFAULT_COLUMNS);

  // Fix progress: use matched+mismatch against total_products from session
  const countedItems = (activeSession?.match_count || 0) + (activeSession?.mismatch_count || 0);
  const progressPct = activeSession && activeSession.total_products > 0
    ? Math.round((countedItems / activeSession.total_products) * 100)
    : 0;

  const totalPages = Math.max(1, Math.ceil(itemsTotal / limit));

  // ── Fixed at 17 rows per page — no dynamic calc ──

  // ── Init: load active session or create new ──
  useEffect(() => {
    const init = async () => {
      try {
        const catRes = await window.electronAPI.invoke('db:categories:getAll');
        if (catRes.success) setCategories(catRes.data || []);

        const activeRes = await window.electronAPI.invoke('icount:getActiveSession');
        if (activeRes.success && activeRes.data) {
          setActiveSession(activeRes.data);
          showInfo(`تم استكمال الجرد: ${activeRes.data.session_number}`);
          setLoadingSession(false);
          return;
        }

        setCreating(true);
        const res = await window.electronAPI.invoke('icount:createSession', {
          category_id: selectedCategoryId || undefined,
        });
        if (res.success) {
          const sessionData = await window.electronAPI.invoke('icount:getSessionById', res.data.id);
          if (sessionData.success) setActiveSession(sessionData.data);
          showSuccess(`بدأ جرد جديد: ${res.data.session_number}`);
        } else {
          showError(res.error);
        }
      } catch (err: any) {
        showError('خطأ في بدء الجرد');
      } finally {
        setCreating(false);
        setLoadingSession(false);
      }
    };
    init();
    return () => {
      Object.values(saveTimers.current).forEach(t => clearTimeout(t));
      if (durationRef.current) clearInterval(durationRef.current);
    };
  }, []);

  // ── Duration counter ──
  useEffect(() => {
    if (activeSession?.started_at) {
      sessionStartedRef.current = new Date(activeSession.started_at + 'Z').getTime();
      if (isCounting || isReviewing) {
        durationRef.current = window.setInterval(() => {
          const diff = Math.max(0, Math.floor((Date.now() - sessionStartedRef.current) / 1000));
          const h = String(Math.floor(diff / 3600)).padStart(2, '0');
          const m = String(Math.floor((diff % 3600) / 60)).padStart(2, '0');
          const s = String(diff % 60).padStart(2, '0');
          setDurationStr(`${h}:${m}:${s}`);
        }, 1000);
        return () => { if (durationRef.current) clearInterval(durationRef.current); };
      } else if (activeSession.finished_at) {
        const end = new Date(activeSession.finished_at + 'Z').getTime();
        const diff = Math.max(0, Math.floor((end - sessionStartedRef.current) / 1000));
        const h = String(Math.floor(diff / 3600)).padStart(2, '0');
        const m = String(Math.floor((diff % 3600) / 60)).padStart(2, '0');
        const s = String(diff % 60).padStart(2, '0');
        setDurationStr(`${h}:${m}:${s}`);
      }
    }
  }, [activeSession?.started_at, activeSession?.finished_at, activeSession?.status]);

  // ── Load items ──
  const loadItems = useCallback(async (searchVal: string) => {
    if (!activeSession) return;
    setItemsLoading(true);
    try {
      const res = await window.electronAPI.invoke('icount:getSessionItems', {
        session_id: activeSession.id,
        page,
        limit,
        status: itemsStatusFilter || undefined,
        search: searchVal || undefined,
        sortKey: sortDir !== null ? sortKey : undefined,
        sortDir: sortDir !== null ? sortDir : undefined,
      });
      if (res.success) {
        setItems(res.data);
        setItemsTotal(res.total);
        if (res.session) {
          setActiveSession(prev => prev ? { ...prev, ...res.session } : prev);
        }
      }
    } finally {
      setItemsLoading(false);
    }
  }, [activeSession?.id, page, limit, itemsStatusFilter, sortKey, sortDir]);

  useEffect(() => {
    if (activeSession?.id) loadItems(pendingSearchRef.current);
  }, [activeSession?.id, page, limit, itemsStatusFilter, loadItems, searchTrigger]);

  useEffect(() => {
    if (!window.electronAPI || !activeSession?.id) return;

    const handleMobileCountUpdate = (data: { session_id: number; item_id: number; counted_qty: number | null; status: string }) => {
      if (data.session_id === activeSession.id) {
        loadItems(pendingSearchRef.current);
      }
    };

    window.electronAPI.on('mobile:inventory-count-updated', handleMobileCountUpdate);
    return () => {
      window.electronAPI?.removeAllListeners('mobile:inventory-count-updated');
    };
  }, [activeSession?.id, loadItems]);

  // ── Search: debounced trigger via searchTrigger counter ──
  const handleSearchChange = useCallback((val: string) => {
    setItemsSearch(val);
    pendingSearchRef.current = val;
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      setPage(1);
      setSearchTrigger(t => t + 1); // forces re-fetch even if already on page 1
    }, 300);
  }, []);

  // ── Sort (server-side, triggers re-fetch) ──
  const toggleSort = useCallback((key: SortKey) => {
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

  // ── Selected category name for filtering ──
  const selectedCategoryName = useMemo(() => {
    if (!selectedCategoryId) return null;
    return categories.find(c => c.id === selectedCategoryId)?.name || null;
  }, [selectedCategoryId, categories]);

  // ── Client-side filter (category + zero/hidden/active) ──
  const displayItems = useMemo(() => items.filter(item => {
    // Category filter
    if (selectedCategoryName && item.category_name_snapshot !== selectedCategoryName) return false;
    // Zero/hidden/active filter
    if (!itemsZeroFilter || itemsZeroFilter === 'all') return true;
    if (itemsZeroFilter === 'zero') return item.system_qty_at_start === 0;
    if (itemsZeroFilter === 'hidden') return item.is_hidden_from_sales === 1;
    if (itemsZeroFilter === 'active') return item.is_hidden_from_sales === 0;
    return true;
  }), [items, selectedCategoryName, itemsZeroFilter]);

  // ── Auto-save quantity ──
  const handleQtyChange = useCallback((itemId: number, value: string) => {
    setEditingQty(prev => ({ ...prev, [itemId]: value }));
    if (saveTimers.current[itemId]) clearTimeout(saveTimers.current[itemId]);
    saveTimers.current[itemId] = setTimeout(async () => {
      const numVal = value === '' ? null : parseFloat(value);
      if (numVal !== null && isNaN(numVal)) return;
      if (!activeSession) return;
      const res = await window.electronAPI.invoke('icount:updateItemCount', {
        session_id: activeSession.id,
        item_id: itemId,
        counted_qty: numVal,
      });
      if (res.success) {
        setItems(prev => prev.map(it => {
          if (it.id === itemId) {
            return { ...it, counted_qty: numVal, status: res.data.status, final_difference: res.data.final_difference };
          }
          return it;
        }));
      }
    }, 300);
  }, [activeSession]);

  const handleQtyKeyDown = useCallback((e: React.KeyboardEvent, itemId: number) => {
    if (e.key === 'Enter') {
      if (saveTimers.current[itemId]) {
        clearTimeout(saveTimers.current[itemId]);
        delete saveTimers.current[itemId];
      }
      const value = editingQty[itemId];
      const numVal = value === '' ? null : parseFloat(value);
      if (numVal !== null && isNaN(numVal)) return;
      handleQtyChange(itemId, value || '');
    }
  }, [editingQty, handleQtyChange]);

  // ── Finish count ──
  const handleFinishCount = useCallback(() => {
    if (!activeSession) return;
    Object.values(saveTimers.current).forEach(t => clearTimeout(t));
    saveTimers.current = {};
    setShowFinishModal(true);
  }, [activeSession]);

  const handleConfirmFinish = useCallback(async () => {
    if (!activeSession) return;
    setFinishing(true);
    try {
      const res = await window.electronAPI.invoke('icount:finishSession', activeSession.id);
      if (res.success) {
        const sessionData = await window.electronAPI.invoke('icount:getSessionById', activeSession.id);
        if (sessionData.success) setActiveSession(sessionData.data);
        setShowFinishModal(false);
        setShowPinModal(true);
      } else {
        showError(res.error);
      }
    } finally {
      setFinishing(false);
    }
  }, [activeSession]);

  const handleApprovalSuccess = useCallback(async (adminResult: any) => {
    if (!activeSession) return;
    const userId = adminResult?.user?.id;
    if (!userId) { showError('لم يتم التعرف على المستخدم'); return; }
    setApproving(true);
    try {
      const res = await window.electronAPI.invoke('icount:approveSession', {
        session_id: activeSession.id,
        user_id: userId,
      });
      if (res.success) {
        const sessionData = await window.electronAPI.invoke('icount:getSessionById', activeSession.id);
        if (sessionData.success) setActiveSession(sessionData.data);
        showSuccess(`تم اعتماد الجرد. ${res.adjustments_applied} تسوية مطبقة.`);
        loadItems(pendingSearchRef.current);
      } else {
        showError(res.error);
      }
    } finally {
      setApproving(false);
    }
  }, [activeSession, loadItems]);

  // ── Cancel Count Session ──
  const handleCancelSession = useCallback(async () => {
    if (!activeSession) return;
    if (!confirm('هل أنت متأكد من إلغاء جلسة الجرد الحالية؟ (سيتم تجاهل كافة البيانات المجرودة)')) return;
    setLoadingSession(true);
    setCreating(true);
    try {
      const res = await window.electronAPI.invoke('icount:cancelSession', activeSession.id);
      if (res.success) {
        showSuccess('تم إلغاء الجرد بنجاح');
        
        // Start a fresh new session automatically
        const newRes = await window.electronAPI.invoke('icount:createSession', {
          category_id: selectedCategoryId || undefined,
        });
        if (newRes.success) {
          const sessionData = await window.electronAPI.invoke('icount:getSessionById', newRes.data.id);
          if (sessionData.success) {
            setActiveSession(sessionData.data);
            setPage(1);
            setItemsSearch('');
            pendingSearchRef.current = '';
          }
          showSuccess(`بدأ جرد جديد: ${newRes.data.session_number}`);
        } else {
          showError(newRes.error);
        }
      } else {
        showError(res.error);
      }
    } catch (err) {
      showError('خطأ في إلغاء الجرد');
    } finally {
      setCreating(false);
      setLoadingSession(false);
    }
  }, [activeSession, selectedCategoryId]);

  // ── Start Fresh New Session ──
  const handleStartNewSession = useCallback(async () => {
    setLoadingSession(true);
    setCreating(true);
    try {
      const res = await window.electronAPI.invoke('icount:createSession', {
        category_id: selectedCategoryId || undefined,
      });
      if (res.success) {
        const sessionData = await window.electronAPI.invoke('icount:getSessionById', res.data.id);
        if (sessionData.success) {
          setActiveSession(sessionData.data);
          setPage(1);
          setItemsSearch('');
          pendingSearchRef.current = '';
        }
        showSuccess(`بدأ جرد جديد: ${res.data.session_number}`);
      } else {
        showError(res.error);
      }
    } catch (err) {
      showError('خطأ في بدء جرد جديد');
    } finally {
      setCreating(false);
      setLoadingSession(false);
    }
  }, [selectedCategoryId]);

  // ── Toggle hide (optimistic + flushSync) ──
  const handleToggleHide = useCallback(async (productId: number) => {
    if (togglingHideProductId === productId) return;

    const currentItems = itemsRef.current;
    const currentItem = currentItems.find(it => it.product_id === productId);
    if (!currentItem) return;

    const oldValue = currentItem.is_hidden_from_sales;
    const newValue = oldValue ? 0 : 1;

    setTogglingHideProductId(productId);

    // 1. Force-immediate DOM update via flushSync قبل IPC
    flushSync(() => {
      setItems(prev => prev.map(it =>
        it.product_id === productId ? { ...it, is_hidden_from_sales: newValue } : it
      ));
    });

    // 2. IPC call
    const res = await window.electronAPI.invoke('icount:toggleHideFromSales', productId);

    if (res.success) {
      // 3. تصحيح القيمة من السيرفر إن لزم
      const serverValue = res.data.is_hidden_from_sales ? 1 : 0;
      if (serverValue !== newValue) {
        setItems(prev => prev.map(it =>
          it.product_id === productId ? { ...it, is_hidden_from_sales: serverValue } : it
        ));
      }
      showSuccess(res.data.is_hidden_from_sales ? 'تم إخفاء المنتج من المبيعات' : 'تم إظهار المنتج في المبيعات');
    } else {
      // 4. Rollback optimistic update على الفشل
      setItems(prev => prev.map(it =>
        it.product_id === productId ? { ...it, is_hidden_from_sales: oldValue } : it
      ));
      showError(res.error);
    }
    setTogglingHideProductId(current => current === productId ? null : current);
  }, [togglingHideProductId]);

  // ── Quantity Edit Modal ──
  const handleRowClick = useCallback((item: CountItem) => {
    setQtyModalItem(item);
    setShowQtyModal(true);
  }, []);

  const handleQtyModalSave = useCallback(async (itemId: number, countedQty: number | null, notes: string) => {
    if (!activeSession) return;
    setQtySaving(true);
    try {
      const res = await window.electronAPI.invoke('icount:updateItemCount', {
        session_id: activeSession.id,
        item_id: itemId,
        counted_qty: countedQty,
      });
      if (res.success) {
        if (notes) {
          await window.electronAPI.invoke('icount:updateItemNotes', { item_id: itemId, notes });
        }
        setItems(prev => prev.map(it => {
          if (it.id === itemId) {
            return { ...it, counted_qty: countedQty, status: res.data.status, final_difference: res.data.final_difference, notes };
          }
          return it;
        }));
        setShowQtyModal(false);
        showSuccess('تم حفظ الكمية');
      } else {
        showError(res.error);
      }
    } finally {
      setQtySaving(false);
    }
  }, [activeSession]);

  // ── Keyboard navigation ──
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement instanceof HTMLInputElement || document.activeElement instanceof HTMLTextAreaElement) return;
      if (showFinishModal || showSummaryModal || showQtyModal || showPinModal) return;

      if (e.key === 'ArrowDown') { e.preventDefault(); setFocusedIndex(i => Math.min(i + 1, displayItems.length - 1)); }
      if (e.key === 'ArrowUp') { e.preventDefault(); setFocusedIndex(i => Math.max(i - 1, 0)); }
      if (e.key === 'ArrowLeft' || e.key === 'Enter') {
        e.preventDefault();
        if (focusedIndex >= 0 && focusedIndex < displayItems.length) {
          handleRowClick(displayItems[focusedIndex]);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [focusedIndex, displayItems, handleRowClick, showFinishModal, showSummaryModal, showQtyModal, showPinModal]);

  useEffect(() => {
    if (focusedIndex >= 0) {
      const el = document.getElementById(`count-row-${focusedIndex}`);
      el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [focusedIndex]);

  // ── Loading states ──
  if (loadingSession || creating) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-text_muted gap-3">
        <Loader2 size={32} className="animate-spin text-primary_blue" />
        <p className="text-sm">{loadingSession ? 'جاري تحميل الجرد...' : 'جاري تجهيز الجرد...'}</p>
      </div>
    );
  }

  if (!activeSession) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-text_muted gap-3">
        <p className="text-sm">فشل في بدء الجرد. الرجاء المحاولة مرة أخرى.</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col text-text_primary overflow-hidden font-cairo w-full min-w-0 relative">
      <InventoryCountToolbar
        sessionNumber={activeSession.session_number}
        startedAt={activeSession.started_at}
        durationStr={durationStr}
        progressPct={progressPct}
        checkedCount={activeSession.checked_count}
        totalProducts={activeSession.total_products}
        isCounting={isCounting}
        isReviewing={isReviewing}
        isApproved={isApproved}
        finishing={finishing}
        categories={categories}
        selectedCategoryId={selectedCategoryId}
        onCategoryChange={setSelectedCategoryId}
        itemsStatusFilter={itemsStatusFilter}
        onStatusFilterChange={val => { setItemsStatusFilter(val); setPage(1); }}
        itemsZeroFilter={itemsZeroFilter}
        onZeroFilterChange={setItemsZeroFilter}
        itemsSearch={itemsSearch}
        onSearchChange={handleSearchChange}
        onFinish={handleFinishCount}
        onSummary={() => setShowSummaryModal(true)}
        onClose={onClose}
        onApprove={() => setShowPinModal(true)}
        onCancel={handleCancelSession}
        onStartNew={handleStartNewSession}
        allColumns={allColumns}
        toggleHide={toggleHide}
        reorder={reorder}
        reset={reset}
      />

      <InventoryCountTable
        items={displayItems}
        loading={itemsLoading}
        page={page}
        limit={limit}
        sortKey={sortKey}
        sortDir={sortDir}
        onSort={toggleSort}
        isCounting={isCounting}
        editingQty={editingQty}
        onQtyChange={handleQtyChange}
        onQtyKeyDown={handleQtyKeyDown}
        onToggleHide={handleToggleHide}
        togglingHideProductId={togglingHideProductId}
        onRowClick={handleRowClick}
        focusedIndex={focusedIndex}
        columns={columns}
        reorder={reorder}
        setWidth={setWidth}
      />

      <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-30">
        <InventoryCountPagination
          page={page}
          totalPages={totalPages}
          onPageChange={setPage}
        />
      </div>

      <CountFinishModal
        isOpen={showFinishModal}
        onClose={() => setShowFinishModal(false)}
        session={activeSession}
        onConfirm={handleConfirmFinish}
        loading={finishing}
      />

      <CountSummaryModal
        isOpen={showSummaryModal}
        onClose={() => setShowSummaryModal(false)}
        session={activeSession}
        items={items}
      />

      <QuantityEditModal
        isOpen={showQtyModal}
        onClose={() => setShowQtyModal(false)}
        onSave={handleQtyModalSave}
        item={qtyModalItem ? {
          ...qtyModalItem,
          expected_qty: isCounting ? qtyModalItem.current_system_qty : qtyModalItem.expected_qty
        } : null}
        saving={qtySaving}
      />

      <AdminPinModal
        isOpen={showPinModal}
        onClose={() => setShowPinModal(false)}
        onSuccess={(adminResult) => handleApprovalSuccess(adminResult)}
        actionDescription="اعتماد جرد المخزون وتطبيق تسويات الكميات"
      />
    </div>
  );
}
