/**
 * AdvancedProductFinder — Premium modal for advanced product search
 * Features: text search, category/brand filter, vehicle reverse search,
 *           stock status filter, internet search, fitment badges
 * NOTE: purchase_price intentionally excluded
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, Car, Filter, Globe, Plus, Package, ChevronDown, ChevronUp, Layers } from 'lucide-react';
import FitmentsBadges from './FitmentsBadges';

interface AdvancedProductFinderProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectProduct: (product: any) => void;
  mode?: 'sale' | 'purchase';
}

export default function AdvancedProductFinder({ isOpen, onClose, onSelectProduct, mode = 'sale' }: AdvancedProductFinderProps) {
  const searchRef = useRef<HTMLInputElement>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [brandId, setBrandId] = useState<number | null>(null);
  const [vehicleBrandId, setVehicleBrandId] = useState<number | null>(null);
  const [vehicleModelId, setVehicleModelId] = useState<number | null>(null);
  const [stockStatus, setStockStatus] = useState<'all' | 'in_stock' | 'out_of_stock'>('all');

  // Data
  const [products, setProducts] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);

  // Lookups
  const [categories, setCategories] = useState<any[]>([]);
  const [brands, setBrands] = useState<any[]>([]);
  const [vehicleBrands, setVehicleBrands] = useState<any[]>([]);
  const [vehicleModels, setVehicleModels] = useState<any[]>([]);

  // Expanded row for fitments
  const [expandedId, setExpandedId] = useState<number | null>(null);

  // Show vehicle filter panel
  const [showVehicleFilter, setShowVehicleFilter] = useState(false);

  // Load lookups on mount
  useEffect(() => {
    if (!isOpen) return;
    window.electronAPI?.invoke('db:categories:getAll').then((r: any) => r?.success && setCategories(r.data));
    window.electronAPI?.invoke('db:brands:getAll').then((r: any) => r?.success && setBrands(r.data));
    window.electronAPI?.invoke('db:vehicles:getBrands').then((r: any) => r?.success && setVehicleBrands(r.data));
    setTimeout(() => searchRef.current?.focus(), 200);
  }, [isOpen]);

  // Load vehicle models when brand changes
  useEffect(() => {
    if (vehicleBrandId) {
      window.electronAPI?.invoke('db:vehicles:getModels', vehicleBrandId).then((r: any) => {
        if (r?.success) setVehicleModels(r.data);
      });
    } else {
      setVehicleModels([]);
      setVehicleModelId(null);
    }
  }, [vehicleBrandId]);

  // Debounced search
  const searchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await window.electronAPI?.invoke('db:products:advancedSearch', {
        search: search || undefined,
        category_id: categoryId || undefined,
        brand_id: brandId || undefined,
        vehicle_brand_id: vehicleBrandId || undefined,
        vehicle_model_id: vehicleModelId || undefined,
        stock_status: stockStatus,
        exclude_hidden: mode === 'sale',
        page,
        limit: 20,
      });
      if (res?.success) {
        setProducts(res.data);
        setTotal(res.total);
      }
    } catch (e) {}
    setLoading(false);
  }, [search, categoryId, brandId, vehicleBrandId, vehicleModelId, stockStatus, page]);

  useEffect(() => {
    if (!isOpen) return;
    const t = setTimeout(searchProducts, 300);
    return () => clearTimeout(t);
  }, [search, categoryId, brandId, vehicleBrandId, vehicleModelId, stockStatus, page, isOpen]);

  // Reset on close
  useEffect(() => {
    if (!isOpen) {
      setSearch('');
      setCategoryId(null);
      setBrandId(null);
      setVehicleBrandId(null);
      setVehicleModelId(null);
      setStockStatus('all');
      setPage(1);
      setExpandedId(null);
      setShowVehicleFilter(false);
    }
  }, [isOpen]);

  const handleSelect = (product: any) => {
    onSelectProduct(product);
    onClose();
  };

  const handleInternetSearch = (productName: string, barcode?: string) => {
    const promptText = barcode
      ? `ماهي السيارات المتوافقة مع قطعة الغيار: ${barcode} ${productName} وما هي أرقام OEM والبدائل المتطابقة معها في السوق الجزائري؟`
      : `ماهي السيارات المتوافقة مع قطعة الغيار: ${productName} وما هي أرقام OEM والبدائل المتطابقة معها في السوق الجزائري؟`;
    const url = `https://www.google.com/search?q=${encodeURIComponent(promptText)}`;
    window.electronAPI?.invoke('shell:openExternal', url);
  };

  const totalPages = Math.ceil(total / 20);
  const activeFiltersCount = [categoryId, brandId, vehicleBrandId, stockStatus !== 'all'].filter(Boolean).length;

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[1000] flex items-center justify-center p-4" onClick={onClose}>
        <motion.div
          initial={{ scale: 0.92, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.92, opacity: 0, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="w-full max-w-[1100px] h-[80vh] bg-background_secondary/85 dark:bg-background_secondary/85 backdrop-blur-2xl border border-white/15 dark:border-white/10 rounded-2xl shadow-2xl shadow-black/20 flex flex-col overflow-hidden"
          onClick={e => e.stopPropagation()}
        >
          {/* ── HEADER ── */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-border_default dark:border-white/5 shrink-0 bg-background_primary/80 dark:bg-white/[0.02]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary_blue/15 flex items-center justify-center">
                <Search size={20} className="text-primary_blue" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-text_primary">البحث المتقدم عن المنتجات</h2>
                <p className="text-[11px] text-text_muted">
                  {total > 0 ? <span className="font-numbers">{total}</span> : 'لا'} نتيجة
                  {activeFiltersCount > 0 && <span className="mr-1 text-primary_blue">• {activeFiltersCount} فلتر نشط</span>}
                </p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 text-text_muted hover:text-danger_red hover:bg-danger_red/10 rounded-xl transition-all">
              <X size={20} />
            </button>
          </div>

          {/* ── FILTERS BAR ── */}
          <div className="px-6 py-3 border-b border-border_default dark:border-white/5 shrink-0 space-y-3 bg-background_primary/80 dark:bg-white/[0.02]">
            {/* Row 1: Search + Stock Status */}
            <div className="flex gap-3">
              <div className="flex-1 relative">
                <Search size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-text_muted pointer-events-none" />
                  <input
                    ref={searchRef}
                    type="text"
                    value={search}
                    onChange={e => { setSearch(e.target.value); setPage(1); }}
                    placeholder="ابحث بالاسم أو الكود أو الباركود..."
                    className="w-full bg-background_secondary dark:bg-white/[0.06] border border-border_default dark:border-white/10 rounded-xl pr-10 pl-4 py-2.5 text-sm text-text_primary placeholder:text-text_muted focus:border-primary_blue focus:bg-primary_blue/5 outline-none transition-all"
                  />
              </div>

              <select value={stockStatus} onChange={e => { setStockStatus(e.target.value as any); setPage(1); }}
                className="bg-background_secondary dark:bg-white/[0.06] border border-border_default dark:border-white/10 rounded-xl px-3 py-2.5 text-sm text-text_primary outline-none focus:border-primary_blue w-36">
                <option value="all">📦 كل المخزون</option>
                <option value="in_stock">✅ متوفر فقط</option>
                <option value="out_of_stock">❌ نفذ</option>
              </select>
            </div>

            {/* Row 2: Category + Brand + Vehicle Filter Toggle */}
            <div className="flex gap-3 items-center">
              <select value={categoryId || ''} onChange={e => { setCategoryId(parseInt(e.target.value) || null); setPage(1); }}
                className="bg-background_secondary dark:bg-white/[0.06] border border-border_default dark:border-white/10 rounded-xl px-3 py-2 text-[12px] text-text_primary outline-none focus:border-primary_blue flex-1">
                <option value="">📂 كل التصنيفات</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>

              <select value={brandId || ''} onChange={e => { setBrandId(parseInt(e.target.value) || null); setPage(1); }}
                className="bg-background_secondary dark:bg-white/[0.06] border border-border_default dark:border-white/10 rounded-xl px-3 py-2 text-[12px] text-text_primary outline-none focus:border-primary_blue flex-1">
                <option value="">🏭 كل الماركات</option>
                {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>

              <button
                onClick={() => setShowVehicleFilter(!showVehicleFilter)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[12px] font-bold border transition-all ${
                  vehicleBrandId
                    ? 'bg-primary_blue/15 text-primary_blue border-primary_blue/40'
                    : 'bg-white/10 dark:bg-white/[0.06] text-text_primary border-white/20 dark:border-white/10 hover:border-primary_blue/50'
                }`}
              >
                <Car size={16} />
                بحث بالمركبة 🚗
                {showVehicleFilter ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>

              {activeFiltersCount > 0 && (
                <button onClick={() => { setCategoryId(null); setBrandId(null); setVehicleBrandId(null); setVehicleModelId(null); setStockStatus('all'); setPage(1); }}
                  className="text-[11px] text-danger_red hover:text-danger_red font-bold px-2 py-1 hover:bg-danger_red/10 rounded-lg transition-all">
                  مسح الفلاتر
                </button>
              )}
            </div>

            {/* Row 3: Vehicle Filter (collapsible) */}
            <AnimatePresence>
              {showVehicleFilter && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="flex gap-3 items-center bg-primary_blue/5 border border-primary_blue/20 rounded-xl p-3">
                    <Car size={18} className="text-primary_blue shrink-0" />
                    <select value={vehicleBrandId || ''} onChange={e => { setVehicleBrandId(parseInt(e.target.value) || null); setVehicleModelId(null); setPage(1); }}
                      className="flex-1 bg-background_secondary dark:bg-white/[0.06] border border-border_default dark:border-white/10 rounded-lg px-3 py-2 text-[12px] text-text_primary outline-none focus:border-primary_blue">
                      <option value="">اختر ماركة السيارة</option>
                      {vehicleBrands.map(vb => <option key={vb.id} value={vb.id}>{vb.name}</option>)}
                    </select>
                    <span className="text-text_muted text-[12px]">→</span>
                    <select value={vehicleModelId || ''} onChange={e => { setVehicleModelId(parseInt(e.target.value) || null); setPage(1); }}
                      disabled={!vehicleBrandId}
                      className="flex-1 bg-background_secondary dark:bg-white/[0.06] border border-border_default dark:border-white/10 rounded-lg px-3 py-2 text-[12px] text-text_primary outline-none focus:border-primary_blue disabled:opacity-40">
                      <option value="">كل الموديلات</option>
                      {vehicleModels.map(vm => (
                        <option key={vm.id} value={vm.id}>
                          {vm.name} {vm.year_from ? `[${vm.year_from}-${vm.year_to || '...'}]` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* ── TABLE ── */}
          <div className="flex-1 overflow-auto custom-scrollbar">
            {/* Table Header — Glass */}
            <div className="flex items-center bg-background_primary/80 dark:bg-white/[0.04] border-b border-border_default dark:border-white/5 px-4 py-2.5 text-[11px] font-black text-primary_blue uppercase tracking-wider select-none sticky top-0 z-10 backdrop-blur-sm">
              <div className="w-[50px] text-center">#</div>
              <div className="w-[120px] text-center border-r border-white/[0.06] dark:border-white/[0.03] px-2">الكود</div>
              <div className="flex-1 text-right border-r border-white/[0.06] dark:border-white/[0.03] px-3">اسم المنتج</div>
              <div className="w-[100px] text-center border-r border-white/[0.06] dark:border-white/[0.03] px-2">التصنيف</div>
              <div className="w-[80px] text-center border-r border-white/[0.06] dark:border-white/[0.03] px-2">المخزون</div>
              <div className="w-[100px] text-center border-r border-white/[0.06] dark:border-white/[0.03] px-2">سعر البيع</div>
              <div className="w-[160px] text-center border-r border-white/[0.06] dark:border-white/[0.03] px-2">التوافقات</div>
              <div className="w-[90px] text-center px-2">إجراءات</div>
            </div>

            {/* Table Body */}
            {loading ? (
              <div className="flex items-center justify-center h-48 text-text_muted">جاري البحث...</div>
            ) : products.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-text_muted">
                <Package size={40} className="mb-3 opacity-20" />
                <span className="text-sm">لم يتم العثور على منتجات</span>
              </div>
            ) : (
              products.map((p, index) => (
                <div key={p.id}>
                  {/* Product Row */}
                  <div
                    className={`flex items-center px-4 py-2.5 border-b border-border_default/30 dark:border-white/[0.02] hover:bg-background_primary/50 transition-all cursor-pointer group ${
                      index % 2 === 0 ? 'bg-background_primary/30' : 'bg-transparent'
                    } ${expandedId === p.id ? 'bg-primary_blue/10 border-b-primary_blue/30' : ''}`}
                    onClick={() => setExpandedId(expandedId === p.id ? null : p.id)}
                    onDoubleClick={() => handleSelect(p)}
                  >
                    <div className="w-[50px] text-center text-[11px] text-text_muted font-numbers">
                      {(page - 1) * 20 + index + 1}
                    </div>
                    <div className="w-[120px] text-center border-r border-white/[0.06] dark:border-white/[0.03] px-2">
                      <span className="text-[11px] font-numbers text-text_primary">{p.barcode || p.internal_code || '-'}</span>
                    </div>
                    <div className="flex-1 text-right border-r border-white/[0.06] dark:border-white/[0.03] px-3">
                      <span className="text-[13px] font-bold text-text_primary group-hover:text-primary_blue transition-colors">{p.name}</span>
                      {p.name_fr && <span className="text-[10px] text-text_muted block">{p.name_fr}</span>}
                    </div>
                    <div className="w-[100px] text-center border-r border-white/[0.06] dark:border-white/[0.03] px-2">
                      <span className="text-[10px] text-text_muted">{p.category_name || '-'}</span>
                    </div>
                    <div className="w-[80px] text-center border-r border-white/[0.06] dark:border-white/[0.03] px-2">
                      <span className={`text-[13px] font-bold font-numbers ${p.total_stock > 0 ? 'text-success_green' : 'text-danger_red'}`}>
                        {p.total_stock}
                      </span>
                    </div>
                    <div className="w-[100px] text-center border-r border-white/[0.06] dark:border-white/[0.03] px-2">
                      <span className="text-[13px] font-bold font-numbers text-text_primary">
                        {p.retail_price > 0 ? p.retail_price.toFixed(2) : '-'}
                      </span>
                    </div>
                    <div className="w-[160px] text-center border-r border-white/[0.06] dark:border-white/[0.03] px-2 overflow-hidden text-ellipsis whitespace-nowrap">
                      {p.fitments_list ? (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-[10.5px] font-bold bg-primary_blue/10 text-primary_blue border border-primary_blue/20 max-w-full truncate" title={p.fitments_list}>
                          <Car size={11} className="shrink-0" />
                          <span className="truncate">{p.fitments_list}</span>
                        </span>
                      ) : (
                        <span className="text-[10px] text-text_muted">-</span>
                      )}
                    </div>
                    <div className="w-[90px] flex items-center justify-center gap-1 px-2">
                      <button
                        onClick={e => { e.stopPropagation(); handleSelect(p); }}
                        className="p-1.5 bg-primary_blue/10 text-primary_blue hover:bg-primary_blue/30 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                        title="إضافة للفاتورة"
                      >
                        <Plus size={14} />
                      </button>
                      <button
                        onClick={e => { e.stopPropagation(); handleInternetSearch(p.name, p.barcode); }}
                        className="p-1.5 bg-cyan/10 text-cyan hover:bg-cyan/30 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                        title="بحث في الإنترنت"
                      >
                        <Globe size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Expanded Fitments Row */}
                  <AnimatePresence>
                    {expandedId === p.id && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden bg-primary_blue/5 border-b border-primary_blue/20"
                      >
                        <div className="px-8 py-3">
                          <FitmentsBadges
                            productId={p.id}
                            mode={mode === 'purchase' ? 'edit' : 'view'}
                            onFitmentsChange={searchProducts}
                          />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))
            )}
          </div>

          {/* ── FOOTER / PAGINATION ── */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-3 border-t border-border_default dark:border-white/5 shrink-0 bg-background_primary/80 dark:bg-white/[0.02]">
              <span className="text-[11px] text-text_muted font-numbers">
                صفحة {page} من {totalPages} ({total} منتج)
              </span>
              <div className="flex gap-2">
                <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page <= 1}
                  className="px-3 py-1.5 text-[11px] font-bold bg-background_secondary dark:bg-white/[0.06] border border-border_default dark:border-white/10 rounded-lg hover:bg-white/20 disabled:opacity-30 text-text_primary transition-all">
                  السابق
                </button>
                <button onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page >= totalPages}
                  className="px-3 py-1.5 text-[11px] font-bold bg-primary_blue/10 border border-primary_blue/30 text-primary_blue rounded-lg hover:bg-primary_blue/20 disabled:opacity-30 transition-all">
                  التالي
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
