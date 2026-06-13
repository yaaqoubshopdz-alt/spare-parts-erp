/**
 * InventoryPage — صفحة إدارة المنتجات (مدمجة مع ERPTable)
 *
 * 🎯 نمط Purchase/Sales: لا pagination كلاسيكي.
 *    كل المنتجات في جدول واحد مع scroll طبيعي + filler rows.
 *
 * ✅ Visual Table Fill (filler rows)
 * ✅ مطابقة تامة لـ Purchase/Sales
 * ✅ min-h-0 / overflow-hidden / flex-1
 */

import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { Search, Edit, Trash2, Filter, AlertTriangle, ClipboardList } from 'lucide-react';
import ToolbarButton from '../../shared/components/ui/ToolbarButton';
import { useShortcutStore } from '../../store/shortcutStore';
import ERPTable, { useColumnManager } from '../../shared/components/table';
import type { ERPColumn } from '../../shared/components/table/types';
import { showSuccess, showError } from '../../shared/utils/notifications';
import AddProductModal from './AddProductModal';
import AdjustStockModal from './AdjustStockModal';
import MarkDefectiveModal from './MarkDefectiveModal';
import InventoryCountPage from './InventoryCountPage';
import ProductPhotoViewerModal from './ProductPhotoViewerModal';

interface Product {
  id: number;
  barcode: string;
  internal_code: string;
  name: string;
  name_fr?: string;
  category_name: string;
  brand_name: string;
  purchase_price: number;
  retail_price: number;
  total_stock: number;
  min_stock_level: number;
  is_active: boolean;
  has_sub_unit: boolean;
  pieces_per_box: number;
  unit_name?: string;
}

export default function InventoryPage() {
  const { hasPermission } = useAuth();
  const [isCounting, setIsCounting] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);

  // Adjust Stock Modal State
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [adjustProduct, setAdjustProduct] = useState<{ id: number; name: string; current_stock: number } | null>(null);

  // Defective Modal State
  const [isDefectiveModalOpen, setIsDefectiveModalOpen] = useState(false);
  const [defectiveProduct, setDefectiveProduct] = useState<{ id: number; name: string; current_stock: number } | null>(null);

  // Photo Viewer Modal State
  const [isPhotoViewerOpen, setIsPhotoViewerOpen] = useState(false);
  const [photoViewerProduct, setPhotoViewerProduct] = useState<Product | null>(null);

  const handleRowContextMenu = useCallback((e: React.MouseEvent, row: Product) => {
    e.preventDefault();
    setPhotoViewerProduct(row);
    setIsPhotoViewerOpen(true);
  }, []);

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

  // ── Total count (للعرض فقط في toolbar) ──
  const [total, setTotal] = useState(0);

  // ── Sorting ──
  type InventorySortKey = 'barcode' | 'name' | 'purchase_price' | 'retail_price' | 'total_stock' | 'category_name';
  const [sortKey, setSortKey] = useState<InventorySortKey | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc' | null>(null);

  const toggleSort = useCallback((key: string) => {
    const k = key as InventorySortKey;
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
    loadCategories();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadProducts();
    }, 300);
    return () => clearTimeout(timer);
  }, [search, sortKey, sortDir, selectedCategoryId]);

  const loadCategories = async () => {
    const res = await window.electronAPI.invoke('db:categories:getAll');
    if (res.success) setCategories(res.data || []);
  };

  const loadProducts = async () => {
    setLoading(true);
    try {
      const res = await window.electronAPI.invoke('db:products:getAll', {
        search,
        limit: 99999,
        category_id: selectedCategoryId || undefined,
        sortKey: sortDir !== null ? sortKey : undefined,
        sortDir: sortDir !== null ? sortDir : undefined,
      });
      if (res.success) {
        setProducts(res.data);
        setTotal(res.total);
      } else {
        showError(res.error);
      }
    } catch (err) {
      showError('خطأ في تحميل المنتجات');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (id: number) => {
    setSelectedProductId(id);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('هل أنت متأكد من حذف هذا المنتج؟ (هذا الإجراء سيقوم بإخفاء المنتج)')) return;
    try {
      const res = await window.electronAPI.invoke('db:products:delete', id);
      if (res.success) {
        showSuccess('تم حذف المنتج بنجاح');
        loadProducts();
      } else {
        showError(res.error);
      }
    } catch (err) {
      showError('خطأ في الحذف');
    }
  };

  // ── تعريف الأعمدة الافتراضية مع دعم التحكم ──
  const DEFAULT_COLUMNS = useMemo<ERPColumn<Product>[]>(() => [
    {
      key: 'barcode',
      label: 'الباركود',
      sortable: true,
      width: 150,
      resizable: true,
      draggable: true,
      render: (p: Product) => (
        <span className="font-bold font-numbers text-text_secondary">
          {p.barcode || p.internal_code || '-'}
        </span>
      ),
    },
    {
      key: 'name',
      label: 'الاسم',
      sortable: true,
      flex: 1,
      resizable: true,
      draggable: true,
      render: (p: Product) => (
        <div className="flex flex-col" dir="auto">
          <span className="font-bold text-text_primary">{p.name}</span>
          {p.name_fr && <span className="text-xs text-text_muted font-sans block" dir="ltr">{p.name_fr}</span>}
        </div>
      ),
    },
    {
      key: 'category_name',
      label: 'التصنيف',
      sortable: true,
      width: 140,
      resizable: true,
      draggable: true,
      render: (p: Product) => <span className="text-text_muted">{p.category_name || '-'}</span>,
    },
    {
      key: 'purchase_price',
      label: 'سعر الشراء',
      sortable: true,
      align: 'center',
      width: 130,
      resizable: true,
      draggable: true,
      render: (p: Product) => (
        <span className="font-bold font-numbers text-warning_amber">
          {p.purchase_price.toFixed(2)} د.ج
        </span>
      ),
    },
    {
      key: 'retail_price',
      label: 'سعر البيع',
      sortable: true,
      align: 'center',
      width: 130,
      resizable: true,
      draggable: true,
      render: (p: Product) => (
        <span className="font-bold font-numbers text-success_green">
          {p.retail_price.toFixed(2)} د.ج
        </span>
      ),
    },
    {
      key: 'total_stock',
      label: 'الكمية',
      sortable: true,
      align: 'center',
      width: 150,
      resizable: true,
      draggable: true,
      render: (p: Product) => {
        const formatQty = (v: number) => parseFloat(Number(v).toFixed(3));
        return p.has_sub_unit && p.pieces_per_box > 1 ? (
          <div className="flex flex-col items-center gap-1">
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-background_primary border border-border_default text-text_primary">
              {Math.floor(p.total_stock / p.pieces_per_box)} علبة
              {p.total_stock % p.pieces_per_box > 0 && ` و ${formatQty(p.total_stock % p.pieces_per_box)} ${p.unit_name || 'حبة'}`}
            </span>
          </div>
        ) : (
          <span className={`px-2 py-1 rounded-lg font-numbers text-xs font-bold ${
            p.total_stock <= p.min_stock_level ? 'bg-danger_red/10 text-danger_red' : 'bg-primary_blue/10 text-primary_blue'
          }`}>
            {formatQty(p.total_stock)}
          </span>
        );
      },
    },
    {
      key: 'actions',
      label: 'إجراءات',
      align: 'center',
      width: 160,
      resizable: false,
      draggable: false,
      render: (p: Product) => (
        <div className="flex items-center justify-center gap-1">
          <button
            title="تسجيل تالف"
            className="p-1.5 text-text_muted hover:text-danger_red transition-colors rounded-lg hover:bg-danger_red/10"
            onClick={(e) => { e.stopPropagation(); setDefectiveProduct({ id: p.id, name: p.name, current_stock: p.total_stock }); setIsDefectiveModalOpen(true); }}
          >
            <AlertTriangle size={16} />
          </button>
          <button
            title="تسوية المخزون"
            className="p-1.5 text-text_muted hover:text-warning_amber transition-colors rounded-lg hover:bg-warning_amber/10"
            onClick={(e) => { e.stopPropagation(); setAdjustProduct({ id: p.id, name: p.name, current_stock: p.total_stock }); setIsAdjustModalOpen(true); }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21 16-4 4-4-4"/><path d="M17 20V4"/><path d="m3 8 4-4 4 4"/><path d="M7 4v16"/></svg>
          </button>
          <button
            title="تعديل المنتج"
            className="p-1.5 text-text_muted hover:text-primary_blue transition-colors rounded-lg hover:bg-primary_blue/10"
            onClick={(e) => { e.stopPropagation(); handleEdit(p.id); }}
          >
            <Edit size={16} />
          </button>
          <button
            title="حذف"
            className="p-1.5 text-text_muted hover:text-danger_red transition-colors rounded-lg hover:bg-danger_red/10"
            onClick={(e) => { e.stopPropagation(); handleDelete(p.id); }}
          >
            <Trash2 size={16} />
          </button>
        </div>
      ),
    },
  ], [handleEdit, handleDelete]);

  const {
    columns,
    allColumns,
    setWidth,
    toggleHide,
    reorder,
    reset,
    showAll,
  } = useColumnManager<ERPColumn<Product>>('erp_columns_inventory_v1', DEFAULT_COLUMNS);

  // ── Count mode full-screen ──
  if (isCounting) {
    return (
      <div className="h-full flex flex-col relative">
        <InventoryCountPage
          categoryId={selectedCategoryId}
          onClose={() => setIsCounting(false)}
        />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col relative">
      <ERPTable
        data={products}
        columns={columns}
        loading={loading}
        rowKey="id"
        sortKey={sortKey}
        sortDir={sortDir}
        onSort={toggleSort}
        onRowContextMenu={handleRowContextMenu}
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
                dir="auto"
                placeholder={`بحث (اسم، باركود، كود)... (${shortcuts.search_product})`}
                value={search}
                onChange={(e) => { setSearch(e.target.value); }}
                className="w-full bg-background_card border border-border_default rounded-xl h-14 pr-14 pl-4 text-base text-text_primary font-bold placeholder:text-text_muted/50 focus:border-primary_blue focus:ring-2 focus:ring-primary_blue/20 outline-none transition-all"
              />
            </div>
            <div className="flex items-center gap-4 shrink-0">
              <select
                value={selectedCategoryId || ''}
                onChange={(e) => setSelectedCategoryId(e.target.value ? Number(e.target.value) : null)}
                className="bg-background_card border border-border_default rounded-xl h-14 px-4 text-base text-text_primary font-bold focus:border-primary_blue focus:ring-2 focus:ring-primary_blue/20 outline-none transition-all cursor-pointer"
              >
                <option value="">كل التصنيفات</option>
                {categories.map((c: any) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <div className="flex items-center gap-2 px-6 py-3 bg-background_card border border-border_default rounded-xl text-text_primary">
                <span className="text-sm font-bold text-text_muted">إجمالي المنتجات:</span>
                <span className="font-numbers font-black text-primary_blue text-xl">{total}</span>
              </div>

              <ToolbarButton
                icon={<ClipboardList size={22} />}
                label="جرد"
                onClick={() => setIsCounting(true)}
                className="text-primary_blue border-primary_blue/40 bg-primary_blue/10 hover:bg-primary_blue/20 h-14 px-8 text-base font-bold"
              />
            </div>
          </div>
        }
      />

      <AddProductModal
        isOpen={isModalOpen}
        productId={selectedProductId}
        onClose={() => { setIsModalOpen(false); setSelectedProductId(null); }}
        onSaved={loadProducts}
      />

      <AdjustStockModal
        isOpen={isAdjustModalOpen}
        product={adjustProduct}
        onClose={() => { setIsAdjustModalOpen(false); setAdjustProduct(null); }}
        onSaved={loadProducts}
      />

      <MarkDefectiveModal
        isOpen={isDefectiveModalOpen}
        product={defectiveProduct}
        onClose={() => { setIsDefectiveModalOpen(false); setDefectiveProduct(null); }}
        onSuccess={loadProducts}
      />

      <ProductPhotoViewerModal
        isOpen={isPhotoViewerOpen}
        product={photoViewerProduct}
        onClose={() => { setIsPhotoViewerOpen(false); setPhotoViewerProduct(null); }}
      />
    </div>
  );
}
