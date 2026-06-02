/**
 * LowStockPage — صفحة إدارة المخزون المنخفض
 */
import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AlertTriangle, ShoppingCart, BellOff, Bell, Package, Search } from 'lucide-react';
import { showSuccess, showError } from '../../shared/utils/notifications';

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
      // same key — cycle
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

  const handleToggleMute = async (id: number) => {
    try {
      const res = await window.electronAPI.invoke('db:products:toggleMuteLowStock', id);
      if (res.success) {
        setProducts(prev => prev.map(p =>
          p.id === id ? { ...p, is_low_stock_muted: res.data.is_low_stock_muted } : p
        ));
        showSuccess(res.data.is_low_stock_muted ? 'تم إخفاء التنبيهات' : 'تم إظهار التنبيهات');
      } else showError(res.error);
    } catch { showError('خطأ'); }
  };

  const handleToggleAllMute = async () => {
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
  };

  const handleRestock = (productId: number) => {
    navigate(`/purchases/new?productId=${productId}`);
  };

  const filtered = products.filter(p =>
    !search.trim() || p.name.toLowerCase().includes(search.toLowerCase())
  );

  const totalShortage = filtered.reduce((sum, p) => sum + Math.max(0, p.shortage), 0);
  const unmutedCount = products.filter(p => !p.is_low_stock_muted).length;
  const mutedCount = products.filter(p => p.is_low_stock_muted).length;
  const allMuted = filtered.length > 0 && filtered.every(p => p.is_low_stock_muted);
  const ghostRowCount = loading ? 0 : Math.max(0, 18 - filtered.length);

  const thClass = 'px-3 font-bold text-[13px] text-text_primary border-l border-black/30 dark:border-border_default cursor-pointer hover:bg-background_card select-none transition-all duration-200';
  const thCenterClass = 'px-3 font-bold text-[13px] text-text_primary border-l border-black/30 dark:border-border_default text-center cursor-pointer hover:bg-background_card select-none transition-all duration-200';

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
              <p className="text-xl font-black text-warning_amber font-numbers">{totalShortage.toFixed(0)}</p>
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
      <div className="flex-1 bg-background_secondary border border-border_default overflow-hidden flex flex-col min-h-0">
        <div className="overflow-y-scroll flex-1 custom-scrollbar">
          <table className="w-full text-sm text-right border-collapse">
            <thead className="sticky top-0 z-30 bg-gradient-to-b from-table_header_from to-table_header_to border-b border-black/30 dark:border-border_default shadow-[0_10px_30px_rgba(0,0,0,0.5)] relative">
              <tr className="h-[52px]">
                <th className={thClass} onClick={() => toggleSort('name')}>
                  المنتج{sortKey === 'name' && sortDir === 'asc' ? <span className="mr-1 text-emerald-400">↑</span> : sortKey === 'name' && sortDir === 'desc' ? <span className="mr-1 text-red-400">↓</span> : null}
                </th>
                <th className={thClass} onClick={() => toggleSort('barcode')}>
                  الباركود{sortKey === 'barcode' && sortDir === 'asc' ? <span className="mr-1 text-emerald-400">↑</span> : sortKey === 'barcode' && sortDir === 'desc' ? <span className="mr-1 text-red-400">↓</span> : null}
                </th>
                <th className={thClass} onClick={() => toggleSort('category_name')}>
                  التصنيف{sortKey === 'category_name' && sortDir === 'asc' ? <span className="mr-1 text-emerald-400">↑</span> : sortKey === 'category_name' && sortDir === 'desc' ? <span className="mr-1 text-red-400">↓</span> : null}
                </th>
                <th className={thCenterClass} onClick={() => toggleSort('min_stock_level')}>
                  الحد الأدنى{sortKey === 'min_stock_level' && sortDir === 'asc' ? <span className="mr-1 text-emerald-400">↑</span> : sortKey === 'min_stock_level' && sortDir === 'desc' ? <span className="mr-1 text-red-400">↓</span> : null}
                </th>
                <th className={thCenterClass} onClick={() => toggleSort('current_stock')}>
                  المخزون الحالي{sortKey === 'current_stock' && sortDir === 'asc' ? <span className="mr-1 text-emerald-400">↑</span> : sortKey === 'current_stock' && sortDir === 'desc' ? <span className="mr-1 text-red-400">↓</span> : null}
                </th>
                <th className={thCenterClass} onClick={() => toggleSort('shortage')}>
                  النقص{sortKey === 'shortage' && sortDir === 'asc' ? <span className="mr-1 text-emerald-400">↑</span> : sortKey === 'shortage' && sortDir === 'desc' ? <span className="mr-1 text-red-400">↓</span> : null}
                </th>
                <th className="px-3 font-bold text-[13px] text-text_primary border-l border-black/30 dark:border-border_default text-center select-none">الحالة</th>
                <th className="px-3 w-[130px] border-l border-black/30 dark:border-border_default text-center">
                  <button
                    onClick={handleToggleAllMute}
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
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border_default">
              {loading ? (
                <tr className="h-11"><td colSpan={8} className="px-4 py-8 text-center text-text_muted bg-background_secondary">جاري التحميل...</td></tr>
              ) : filtered.length === 0 ? (
                <tr className="h-11"><td colSpan={8} className="px-4 py-8 text-center text-text_muted bg-background_secondary">لا توجد منتجات منخفضة المخزون</td></tr>
              ) : filtered.map((p, idx) => (
                <tr key={p.id} className={`h-11 hover:bg-primary_blue/5 transition-colors ${idx % 2 === 0 ? 'bg-background_secondary' : 'bg-sidebar_bg'}`}>
                  <td className="px-3 py-2 font-bold text-text_primary border-l border-border_default">{p.name}</td>
                  <td className="px-3 py-2 font-numbers text-text_secondary border-l border-border_default">{p.barcode || '-'}</td>
                  <td className="px-3 py-2 text-text_secondary border-l border-border_default">{p.category_name}</td>
                  <td className="px-3 py-2 text-center font-numbers font-bold text-text_primary border-l border-border_default">{p.min_stock_level}</td>
                  <td className="px-3 py-2 text-center font-numbers font-bold border-l border-border_default">
                    <span className={p.current_stock <= 0 ? 'text-danger_red' : 'text-warning_amber'}>
                      {p.current_stock}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-center font-numbers font-black text-danger_red border-l border-border_default">
                    {Math.max(0, p.shortage)}
                  </td>
                  <td className="px-3 py-2 text-center border-l border-border_default">
                    {p.is_low_stock_muted ? (
                      <span className="text-[11px] font-bold text-text_muted bg-text_muted/10 px-2.5 py-1 rounded">مخفي</span>
                    ) : (
                      <span className="text-[11px] font-bold text-danger_red bg-danger_red/10 px-2.5 py-1 rounded">منخفض</span>
                    )}
                  </td>
                  <td className="px-3 py-2 border-l border-border_default">
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
                  </td>
                </tr>
              ))}
              {ghostRowCount > 0 && Array.from({ length: ghostRowCount }).map((_, i) => (
                <tr key={`ghost-${i}`} className={`h-11 pointer-events-none ${(filtered.length + i) % 2 === 0 ? 'bg-background_secondary' : 'bg-sidebar_bg'}`}>
                  <td className="px-3 py-2 border-l border-border_default">&nbsp;</td>
                  <td className="px-3 py-2 border-l border-border_default">&nbsp;</td>
                  <td className="px-3 py-2 border-l border-border_default">&nbsp;</td>
                  <td className="px-3 py-2 border-l border-border_default text-center">&nbsp;</td>
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

    </div>
  );
}
