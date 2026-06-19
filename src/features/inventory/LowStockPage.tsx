/**
 * LowStockPage — صفحة إدارة المخزون المنخفض
 */
import { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AlertTriangle, ShoppingCart, BellOff, Bell, Package, Search } from 'lucide-react';
import { showSuccess, showError } from '../../shared/utils/notifications';
import ERPTable, { useColumnManager } from '../../shared/components/table';
import type { ERPColumn } from '../../shared/components/table/types';

interface LowStockItem {
  id: number;
  name: string;
  barcode: string;
  internal_code: string;
  min_stock_level: number;
  current_stock: number;
  shortage: number;
  is_low_stock_muted: number;
  category_name: string;
  category_id: number;
}

const SORT_MAP: Record<string, string> = {
  name: 'name',
  barcode: 'barcode',
  category_name: 'category_name',
  min_stock_level: 'min_stock_level',
  current_stock: 'current_stock',
  shortage: 'shortage',
};

type SortDir = 'asc' | 'desc' | null;

const formatQty = (v: number) => parseFloat(Number(v).toFixed(2));

export default function LowStockPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [products, setProducts] = useState<LowStockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<number | null>(null);
  const [categories, setCategories] = useState<{ id: number; name: string }[]>([]);
  const [muteFilter, setMuteFilter] = useState<'all' | 'unmuted'>('unmuted');
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>(null);

  // Set window title
  useEffect(() => {
    document.title = 'إدارة المخزون المنخفض | SpareParts ERP';
    return () => { document.title = 'SpareParts ERP'; };
  }, []);

  // 3-state sort toggle: ASC → DESC → RESET
  const toggleSort = useCallback((key: string) => {
    setSortKey(prev => {
      if (prev !== key) {
        setSortDir('asc');
        return key;
      }
      setSortDir(d => {
        if (d === 'asc') return 'desc';
        if (d === 'desc') return null;
        return 'asc';
      });
      return key;
    });
  }, []);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await window.electronAPI.invoke('db:products:getLowStock', {
        category_id: categoryFilter || undefined,
        muted: muteFilter === 'unmuted' ? false : undefined,
        sortKey: sortDir !== null ? SORT_MAP[sortKey || ''] : undefined,
        sortDir: sortDir !== null ? sortDir : undefined,
      });
      if (res.success) setProducts(res.data);
      else showError(res.error);
    } catch { showError('خطأ في تحميل البيانات'); }
    finally { setLoading(false); }
  }, [categoryFilter, muteFilter, sortKey, sortDir]);

  useEffect(() => { loadProducts(); }, [loadProducts]);

  useEffect(() => {
    (async () => {
      const res = await window.electronAPI.invoke('db:categories:getAll');
      if (res.success) setCategories(res.data);
    })();
  }, []);

  // ── Auto-filter by category from URL (e.g. ?category=زيوت) ──
  useEffect(() => {
    const catParam = searchParams.get('category');
    if (!catParam || categories.length === 0) return;
    const decoded = decodeURIComponent(catParam);
    const match = categories.find(c => c.name === decoded);
    if (match) setCategoryFilter(match.id);
  }, [searchParams, categories]);

  const handleToggleMute = useCallback(async (id: number) => {
    try {
      const res = await window.electronAPI.invoke('db:products:toggleMuteLowStock', id);
      if (res.success) {
        setProducts(prev => prev.map(p =>
          p.id === id ? { ...p, is_low_stock_muted: res.data.is_low_stock_muted } : p
        ));
        showSuccess(res.data.is_low_stock_muted ? 'تم إخفاء التنبيهات' : 'تم إظهار التنبيهات');
      } else showError(res.error);
    } catch { showError('خطأ'); }
  }, []);

  const filtered = useMemo(() => {
    return products.filter(p =>
      !search.trim() || p.name.toLowerCase().includes(search.toLowerCase())
    );
  }, [products, search]);

  const handleToggleAllMute = useCallback(async () => {
    const allMuted = filtered.every(p => p.is_low_stock_muted);
    let successCount = 0;
    for (const p of filtered) {
      if ((allMuted && p.is_low_stock_muted) || (!allMuted && !p.is_low_stock_muted)) {
        const res = await window.electronAPI.invoke('db:products:toggleMuteLowStock', p.id);
        if (res.success) {
          setProducts(prev => prev.map(pr => pr.id === p.id ? { ...pr, is_low_stock_muted: res.data.is_low_stock_muted } : pr));
          successCount++;
        }
      }
    }
    showSuccess(allMuted ? 'تم إظهار كل التنبيهات' : `تم إخفاء ${successCount} منتج`);
  }, [filtered]);

  const handleRestock = useCallback((productId: number) => {
    navigate(`/purchases/new?productId=${productId}`);
  }, [navigate]);

  const totalShortage = filtered.reduce((sum, p) => sum + Math.max(0, p.shortage), 0);
  const unmutedCount = products.filter(p => !p.is_low_stock_muted).length;
  const mutedCount = products.filter(p => p.is_low_stock_muted).length;
  const allMuted = filtered.length > 0 && filtered.every(p => p.is_low_stock_muted);

  // ── تعريف الأعمدة مع دعم التحكم الكامل ──
  const DEFAULT_COLUMNS = useMemo<ERPColumn<LowStockItem>[]>(() => [
    {
      key: 'name',
      label: 'المنتج',
      sortable: true,
      flex: 1,
      resizable: true,
      draggable: true,
      render: (p) => <span className="font-bold text-text_primary">{p.name}</span>,
    },
    {
      key: 'barcode',
      label: 'الباركود',
      sortable: true,
      width: 150,
      resizable: true,
      draggable: true,
      render: (p) => <span className="font-numbers text-text_secondary">{p.barcode || '-'}</span>,
    },
    {
      key: 'category_name',
      label: 'التصنيف',
      sortable: true,
      width: 140,
      resizable: true,
      draggable: true,
      render: (p) => <span className="text-text_secondary">{p.category_name}</span>,
    },
    {
      key: 'min_stock_level',
      label: 'الحد الأدنى',
      sortable: true,
      align: 'center',
      width: 120,
      resizable: true,
      draggable: true,
      render: (p) => <span className="font-numbers font-bold text-text_primary">{formatQty(p.min_stock_level)}</span>,
    },
    {
      key: 'current_stock',
      label: 'المخزون الحالي',
      sortable: true,
      align: 'center',
      width: 120,
      resizable: true,
      draggable: true,
      render: (p) => (
        <span className={`font-numbers font-bold ${p.current_stock <= 0 ? 'text-danger_red' : 'text-warning_amber'}`}>
          {formatQty(p.current_stock)}
        </span>
      ),
    },
    {
      key: 'shortage',
      label: 'النقص',
      sortable: true,
      align: 'center',
      width: 120,
      resizable: true,
      draggable: true,
      render: (p) => (
        <span className="font-numbers font-black text-danger_red">
          {formatQty(Math.max(0, p.shortage))}
        </span>
      ),
    },
    {
      key: 'status',
      label: 'الحالة',
      align: 'center',
      width: 120,
      resizable: true,
      draggable: true,
      render: (p) => (
        p.is_low_stock_muted ? (
          <span className="text-[11px] font-bold text-text_muted bg-text_muted/10 px-2.5 py-1 rounded">مخفي</span>
        ) : (
          <span className="text-[11px] font-bold text-danger_red bg-danger_red/10 px-2.5 py-1 rounded">منخفض</span>
        )
      ),
    },
    {
      key: 'actions',
      label: 'إجراءات',
      align: 'center',
      width: 130,
      resizable: false,
      draggable: false,
      headerRender: () => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleToggleAllMute();
          }}
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all hover:scale-105 ${
            allMuted
              ? 'bg-warning_amber/20 text-warning_amber'
              : 'bg-white/10 text-text_primary hover:bg-white/20'
          }`}
          title={allMuted ? 'إظهار الكل' : 'إخفاء الكل'}
        >
          {allMuted ? <Bell size={13} /> : <BellOff size={13} />}
          {allMuted ? 'إظهار' : 'إخفاء الكل'}
        </button>
      ),
      render: (p) => (
        <div className="flex items-center gap-2 justify-center">
          <button
            onClick={() => handleRestock(p.id)}
            className="p-2 rounded-xl bg-primary_blue/10 text-primary_blue hover:bg-primary_blue/20 hover:scale-110 active:scale-90 transition-all duration-200"
            title="تموين"
          >
            <ShoppingCart size={16} />
          </button>
          <button
            onClick={() => handleToggleMute(p.id)}
            className={`p-2 rounded-xl transition-all duration-200 hover:scale-110 active:scale-90 ${
              p.is_low_stock_muted
                ? 'bg-warning_amber/10 text-warning_amber hover:bg-warning_amber/20'
                : 'bg-text_muted/10 text-text_muted hover:bg-text_muted/20'
            }`}
            title={p.is_low_stock_muted ? 'إظهار التنبيهات' : 'إخفاء التنبيهات'}
          >
            {p.is_low_stock_muted ? <Bell size={16} /> : <BellOff size={16} />}
          </button>
        </div>
      ),
    },
  ], [allMuted, handleToggleAllMute, handleRestock, handleToggleMute]);

  const {
    columns,
    allColumns,
    setWidth,
    toggleHide,
    reorder,
    reset,
    showAll,
  } = useColumnManager<ERPColumn<LowStockItem>>('erp_columns_lowstock_v1', DEFAULT_COLUMNS);

  return (
    <div className="h-full flex flex-col">
      {/* Top Controls — Single Row: Search+drowpdows (RIGHT) + Cards (LEFT fill) */}
      <div className="flex items-center gap-3 px-5 pt-5 pb-3 shrink-0">
        {/* Search + Dropdowns — first in RTL = visual right */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="relative w-[360px]">
            <Search size={20} className="absolute right-4 top-1/2 -translate-y-1/2 text-text_muted" />
            <input
              type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="بحث عن منتج..."
              className="w-full bg-background_card border border-border_default rounded-xl h-12 pr-12 pl-4 text-sm text-text_primary font-bold placeholder:text-text_muted/50 focus:border-primary_blue focus:ring-2 focus:ring-primary_blue/20 outline-none transition-all"
            />
          </div>
          <select
            value={categoryFilter || ''}
            onChange={e => setCategoryFilter(e.target.value ? Number(e.target.value) : null)}
            className="bg-background_card border border-border_default rounded-xl h-12 px-4 text-sm font-bold text-text_primary outline-none focus:border-primary_blue dark:text-white dark:bg-background_secondary"
          >
            <option value="" className="dark:text-white dark:bg-background_secondary">كل التصنيفات</option>
            {categories.map(c => (
              <option key={c.id} value={c.id} className="dark:text-white dark:bg-background_secondary">{c.name}</option>
            ))}
          </select>
          <select
            value={muteFilter}
            onChange={e => setMuteFilter(e.target.value as 'all' | 'unmuted')}
            className="bg-background_card border border-border_default rounded-xl h-12 px-4 text-sm font-bold text-text_primary outline-none focus:border-primary_blue dark:text-white dark:bg-background_secondary"
          >
            <option value="unmuted" className="dark:text-white dark:bg-background_secondary">غير مخفية فقط</option>
            <option value="all" className="dark:text-white dark:bg-background_secondary">الكل</option>
          </select>
        </div>
        {/* Cards — last in RTL = visual left, flex-1 fills all remaining space */}
        <div className="flex items-center gap-3 flex-1">
          <div className="flex items-center gap-3 bg-background_card rounded-xl border border-border_default px-4 py-3 flex-1">
            <div className="w-10 h-10 rounded-lg bg-danger_red/10 flex items-center justify-center">
              <AlertTriangle size={20} className="text-danger_red" />
            </div>
            <div>
              <p className="text-xl font-black text-danger_red font-numbers">{products.length}</p>
              <p className="text-[11px] text-text_muted font-bold">منخفضة</p>
            </div>
          </div>
          <div className="flex items-center gap-3 bg-background_card rounded-xl border border-border_default px-4 py-3 flex-1">
            <div className="w-10 h-10 rounded-lg bg-warning_amber/10 flex items-center justify-center">
              <Package size={20} className="text-warning_amber" />
            </div>
            <div>
              <p className="text-xl font-black text-warning_amber font-numbers">{formatQty(totalShortage)}</p>
              <p className="text-[11px] text-text_muted font-bold">إجمالي النقص</p>
            </div>
          </div>
          <div className="flex items-center gap-3 bg-background_card rounded-xl border border-border_default px-4 py-3 flex-1">
            <div className="w-10 h-10 rounded-lg bg-primary_blue/10 flex items-center justify-center">
              <ShoppingCart size={20} className="text-primary_blue" />
            </div>
            <div>
              <p className="text-xl font-black text-primary_blue font-numbers">{unmutedCount}</p>
              <p className="text-[11px] text-text_muted font-bold">غير مخفية</p>
            </div>
          </div>
          <div className="flex items-center gap-3 bg-background_card rounded-xl border border-border_default px-4 py-3 flex-1">
            <div className="w-10 h-10 rounded-lg bg-text_muted/10 flex items-center justify-center">
              <BellOff size={20} className="text-text_muted" />
            </div>
            <div>
              <p className="text-xl font-black text-text_muted font-numbers">{mutedCount}</p>
              <p className="text-[11px] text-text_muted font-bold">مخفية</p>
            </div>
          </div>
        </div>
      </div>

      {/* Table — fills all remaining space, sharp corners */}
      <div className="flex-1 border border-black/[0.07] dark:border-white/[0.06] rounded-2xl overflow-hidden flex flex-col min-h-0">
        <ERPTable
          data={filtered}
          columns={columns}
          loading={loading}
          rowKey="id"
          sortKey={sortKey}
          sortDir={sortDir}
          onSort={toggleSort}
          className="h-full"
          minRows={18}
          emptyText="لا توجد منتجات منخفضة المخزون"
          onResizeColumn={setWidth}
          onReorderColumns={reorder}
          onToggleHideColumn={toggleHide}
          onResetColumns={reset}
          onShowAllColumns={showAll}
          hasHiddenColumns={allColumns.some(c => c.hidden)}

        />
      </div>
    </div>
  );
}
