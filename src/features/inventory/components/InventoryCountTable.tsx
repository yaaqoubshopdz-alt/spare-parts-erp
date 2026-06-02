import { memo, useMemo, useState, useEffect } from 'react';
import { EyeOff, Eye, Loader2 } from 'lucide-react';
import { useTableFiller } from '@/shared/components/table/useTableFiller';
import ERPTableRow from '@/shared/components/table/ERPTableRow';
import type { ERPColumn } from '@/shared/components/table/types';

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

type SortKey = 'product_name_snapshot' | 'barcode_snapshot' | 'category_name_snapshot' | 'system_qty_at_start' | 'counted_qty' | 'final_difference';
type SortDir = 'asc' | 'desc' | null;

type ColumnId = 'index' | 'barcode_snapshot' | 'product_name_snapshot' | 'category_name_snapshot' | 'system_qty_at_start' | 'current_stock' | 'counted_qty' | 'final_difference' | 'status' | 'hide';

type ColumnDef = {
  id: ColumnId;
  label: string;
  width: number;
  key?: SortKey;
}

const DEFAULT_COLUMN_WIDTHS: Record<ColumnId, number> = {
  index: 44,
  barcode_snapshot: 110,
  product_name_snapshot: 220,
  category_name_snapshot: 110,
  system_qty_at_start: 100,
  current_stock: 100,
  counted_qty: 90,
  final_difference: 90,
  status: 100,
  hide: 50,
};

interface TableProps {
  items: CountItem[];
  loading: boolean;
  page: number;
  limit: number;
  sortKey: SortKey | null;
  sortDir: SortDir;
  onSort: (key: SortKey) => void;
  isCounting: boolean;
  editingQty: Record<number, string>;
  onQtyChange: (itemId: number, value: string) => void;
  onQtyKeyDown: (e: React.KeyboardEvent, itemId: number) => void;
  onToggleHide: (productId: number) => void;
  togglingHideProductId: number | null;
  onRowClick: (item: CountItem) => void;
  focusedIndex: number;
}

const headerSortableClass = 'cursor-pointer hover:bg-background_card transition-all duration-200';
const rowHoverClass = 'hover:bg-primary_blue/5 transition-colors';

const cellBorder = 'border-l border-border_default';
const rowBorder = 'border-b border-border_default';
const headerCellBorder = 'border-l border-border_default';

const InventoryCountTableRow = memo(function InventoryCountTableRow({
  item, idx, page, limit, isCounting, editingQty, onQtyChange, onQtyKeyDown, onToggleHide, onRowClick, isFocused, togglingHideProductId, columnWidths,
}: {
  item: CountItem; idx: number; page: number; limit: number;
  isCounting: boolean; editingQty: Record<number, string>;
  onQtyChange: (itemId: number, value: string) => void;
  onQtyKeyDown: (e: React.KeyboardEvent, itemId: number) => void;
  onToggleHide: (productId: number) => void;
  onRowClick: (item: CountItem) => void; isFocused: boolean;
  togglingHideProductId: number | null;
  columnWidths: Record<ColumnId, number>;
}) {
  const currentStock = isCounting ? item.current_system_qty : item.expected_qty;
  const diff = item.final_difference !== null
    ? item.final_difference
    : (item.counted_qty !== null ? Math.round((item.counted_qty - currentStock) * 10000) / 10000 : null);

  const statusBadge = (status: string) => {
    if (status === 'matched') return <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">مطابق</span>;
    if (status === 'mismatch') return <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-orange-500/15 text-orange-400 border border-orange-500/25">غير مطابق</span>;
    return <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-zinc-500/10 text-zinc-400 border border-zinc-500/20">لم يُعد</span>;
  };

  const isTogglingHide = togglingHideProductId === item.product_id;

  return (
    <tr
      id={`count-row-${idx}`}
      className={`h-11 ${rowHoverClass} cursor-pointer ${idx % 2 === 0 ? 'bg-background_secondary' : 'bg-sidebar_bg'} ${isFocused ? 'ring-1 ring-inset ring-primary_blue bg-primary_blue/5' : ''}`}
      onClick={() => onRowClick(item)}
    >
      <td style={{ width: columnWidths.index }} className={`px-3 py-2 text-[11px] font-numbers text-text_secondary text-center align-middle ${cellBorder} ${rowBorder}`}>{(page - 1) * limit + idx + 1}</td>
      <td style={{ width: columnWidths.barcode_snapshot }} className={`px-3 py-2 text-[12px] font-numbers text-text_secondary align-middle ${cellBorder} ${rowBorder}`}>{item.barcode_snapshot || '-'}</td>
      <td style={{ width: columnWidths.product_name_snapshot }} className={`px-3 py-2 text-[13px] font-bold text-text_primary align-middle min-w-0 ${cellBorder} ${rowBorder}`}>
        <div className="flex items-center justify-between gap-2">
          <span className={`truncate min-w-0 ${item.is_hidden_from_sales ? 'text-orange-200' : ''}`}>{item.product_name_snapshot}</span>
          {item.is_hidden_from_sales ? (
            <span className="shrink-0 text-[10px] px-2 py-0.5 rounded-md bg-orange-500/15 text-orange-300 border border-orange-500/30 shadow-sm">مخفي</span>
          ) : null}
        </div>
      </td>
      <td style={{ width: columnWidths.category_name_snapshot }} className={`px-3 py-2 text-[12px] text-text_secondary align-middle ${cellBorder} ${rowBorder}`}>{item.category_name_snapshot || '-'}</td>
      <td style={{ width: columnWidths.system_qty_at_start }} className={`px-3 py-2 text-[13px] font-numbers text-text_secondary text-center align-middle ${cellBorder} ${rowBorder}`}>{item.system_qty_at_start}</td>
      <td style={{ width: columnWidths.current_stock }} className={`px-3 py-2 text-[13px] font-numbers text-text_secondary text-center align-middle ${cellBorder} ${rowBorder}`}>{currentStock}</td>
      <td style={{ width: columnWidths.counted_qty }} className={`px-3 py-2 text-center align-middle ${cellBorder} ${rowBorder}`}>
        {isCounting ? (
          <input
            type="number"
            step="0.001"
            value={editingQty[item.id] !== undefined ? editingQty[item.id] : (item.counted_qty !== null ? item.counted_qty : '')}
            onChange={e => onQtyChange(item.id, e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                (e.target as HTMLInputElement).blur();
              }
              onQtyKeyDown(e, item.id);
            }}
            onClick={e => e.stopPropagation()}
            className="w-full max-w-[80px] mx-auto text-center bg-transparent border-b border-primary_blue/40 px-2 py-0.5 text-[15px] font-bold font-numbers text-emerald-500 outline-none focus:border-primary_blue focus:border-b-2 focus:bg-primary_blue/5 transition-all"
            placeholder="0"
          />
        ) : (
          <span className={`font-numbers font-bold text-[13px] ${item.counted_qty !== null ? 'text-text_primary' : 'text-text_muted'}`}>
            {item.counted_qty !== null ? item.counted_qty : '-'}
          </span>
        )}
      </td>
      <td style={{ width: columnWidths.final_difference }} className={`px-3 py-2 text-[13px] font-numbers font-bold text-center align-middle ${cellBorder} ${rowBorder} ${
        diff === null ? 'text-text_muted' :
        diff > 0 ? 'text-success_green' :
        diff < 0 ? 'text-danger_red' : 'text-text_muted'
      }`}>
        {diff !== null ? `${diff > 0 ? '+' : ''}${diff}` : '-'}
      </td>
      <td style={{ width: columnWidths.status }} className={`px-3 py-2 text-center align-middle ${cellBorder} ${rowBorder}`}>
        <div className="flex items-center justify-center">{statusBadge(item.status)}</div>
      </td>
      <td style={{ width: columnWidths.hide }} className={`px-3 py-2 text-center align-middle ${rowBorder}`} onClick={e => e.stopPropagation()}>
        {item.system_qty_at_start === 0 ? (
          <button
            onClick={() => onToggleHide(item.product_id)}
            title={item.is_hidden_from_sales ? 'إظهار في المبيعات' : 'إخفاء من المبيعات'}
            disabled={isTogglingHide}
            className={`p-1 rounded-md transition-all ${
              item.is_hidden_from_sales
                ? 'text-orange-400 hover:bg-orange-500/10 bg-orange-500/5'
                : 'text-text_muted hover:text-text_primary hover:bg-background_card'
            } ${isTogglingHide ? 'opacity-70 cursor-wait' : ''}`}
          >
            {isTogglingHide ? <Loader2 size={13} className="animate-spin" /> : item.is_hidden_from_sales ? <EyeOff size={13} /> : <Eye size={13} />}
          </button>
        ) : (
          <span className="text-text_muted text-[11px]">-</span>
        )}
      </td>
    </tr>
  );
});

export default function InventoryCountTable({
  items, loading, page, limit, sortKey, sortDir, onSort,
  isCounting, editingQty, onQtyChange, onQtyKeyDown,
  onToggleHide, togglingHideProductId, onRowClick, focusedIndex,
}: TableProps) {
  const [columnWidths, setColumnWidths] = useState<Record<ColumnId, number>>(() => {
    if (typeof window === 'undefined') return DEFAULT_COLUMN_WIDTHS;
    const saved = window.localStorage.getItem('inventory_count_columns_layout_v1');
    if (!saved) return DEFAULT_COLUMN_WIDTHS;
    try {
      const parsed = JSON.parse(saved) as Partial<Record<ColumnId, number>>;
      return { ...DEFAULT_COLUMN_WIDTHS, ...parsed };
    } catch {
      return DEFAULT_COLUMN_WIDTHS;
    }
  });

  // Use the shared hook for dynamic fixed-height filler rows (like ERPTable)
  const { containerRef, fillerCount } = useTableFiller(items.length, 15);

  useEffect(() => {
    window.localStorage.setItem('inventory_count_columns_layout_v1', JSON.stringify(columnWidths));
  }, [columnWidths]);

  const handleResize = (id: ColumnId, newWidth: number) => {
    setColumnWidths(prev => ({ ...prev, [id]: Math.max(60, newWidth) }));
  };

  const headerCells = useMemo<ColumnDef[]>(() => [
    { id: 'index', label: '#', width: 44 },
    { id: 'barcode_snapshot', label: 'الباركود', key: 'barcode_snapshot', width: 110 },
    { id: 'product_name_snapshot', label: 'الاسم', key: 'product_name_snapshot', width: 220 },
    { id: 'category_name_snapshot', label: 'التصنيف', key: 'category_name_snapshot', width: 110 },
    { id: 'system_qty_at_start', label: 'الكمية عند البدء', key: 'system_qty_at_start', width: 100 },
    { id: 'current_stock', label: 'المخزون الآني', width: 100 },
    { id: 'counted_qty', label: 'العد', key: 'counted_qty', width: 90 },
    { id: 'final_difference', label: 'الفرق', key: 'final_difference', width: 90 },
    { id: 'status', label: 'الحالة', width: 100 },
    { id: 'hide', label: 'إخفاء', width: 50 },
  ], []);

  // ERPColumn[] for ERPTableRow filler rows — built from current columnWidths
  const countFillerColumns = useMemo<ERPColumn<CountItem>[]>(() => [
    { key: 'index', label: '#', width: columnWidths.index, align: 'center' },
    { key: 'barcode_snapshot', label: 'الباركود', width: columnWidths.barcode_snapshot },
    { key: 'product_name_snapshot', label: 'الاسم', width: columnWidths.product_name_snapshot },
    { key: 'category_name_snapshot', label: 'التصنيف', width: columnWidths.category_name_snapshot },
    { key: 'system_qty_at_start', label: 'الكمية عند البدء', width: columnWidths.system_qty_at_start, align: 'center' },
    { key: 'current_stock', label: 'المخزون الآني', width: columnWidths.current_stock, align: 'center' },
    { key: 'counted_qty', label: 'العد', width: columnWidths.counted_qty, align: 'center' },
    { key: 'final_difference', label: 'الفرق', width: columnWidths.final_difference, align: 'center' },
    { key: 'status', label: 'الحالة', width: columnWidths.status, align: 'center' },
    { key: 'hide', label: 'إخفاء', width: columnWidths.hide, align: 'center' },
  ], [columnWidths]);

  return (
    <div ref={containerRef} className="flex-1 bg-background_secondary overflow-y-scroll custom-scrollbar z-10 min-h-0" id="count-table-body">
      <table className="w-full text-sm text-right border-collapse table-fixed">
        <thead className="sticky top-0 z-30 bg-gradient-to-b from-table_header_from to-table_header_to border-b border-b-black/50 dark:border-b-border_default shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
          <tr className="h-[52px]">
            {headerCells.map((cell, i) => (
              <th
                key={cell.id}
                style={{ width: columnWidths[cell.id] }}
                className={`relative px-3 text-[13px] font-bold text-text_primary tracking-wide ${cell.id === 'index' || cell.id.endsWith('_qty') || cell.id === 'status' || cell.id === 'hide' ? 'text-center' : 'text-right'} ${cell.key ? headerSortableClass : ''} ${i < headerCells.length - 1 ? headerCellBorder : ''}`}
                onClick={() => cell.key && onSort(cell.key)}
              >
                {cell.label}
                {cell.key && sortKey === cell.key && sortDir === 'asc' ? (
                  <span className="mr-1 text-emerald-400 text-[14px]">↑</span>
                ) : cell.key && sortKey === cell.key && sortDir === 'desc' ? (
                  <span className="mr-1 text-red-400 text-[14px]">↓</span>
                ) : null}

                {cell.id !== 'hide' && (
                  <div
                    className="absolute right-0 top-0 w-2 h-full cursor-col-resize hover:bg-emerald-400/50 active:bg-emerald-400 transition-all z-30 group-hover:opacity-100 opacity-0"
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      const startX = e.pageX;
                      const startWidth = columnWidths[cell.id] ?? cell.width;
                      document.body.style.cursor = 'col-resize';

                      const onMouseMove = (moveEvent: MouseEvent) => {
                        handleResize(cell.id, startWidth + (moveEvent.pageX - startX));
                      };

                      const onMouseUp = () => {
                        document.body.style.cursor = 'default';
                        document.removeEventListener('mousemove', onMouseMove);
                        document.removeEventListener('mouseup', onMouseUp);
                      };

                      document.addEventListener('mousemove', onMouseMove);
                      document.addEventListener('mouseup', onMouseUp);
                    }}
                  />
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading && items.length === 0 && (
            <tr><td colSpan={10} className="h-40 text-center text-text_muted">
              <div className="flex items-center justify-center gap-2 py-16">
                <Loader2 size={20} className="animate-spin text-primary_blue" />
                <span className="text-sm">جاري التحميل...</span>
              </div>
            </td></tr>
          )}
          {!loading && items.length === 0 && (
            <tr className="bg-background_secondary"><td colSpan={10} className="h-40 text-center text-text_muted text-sm py-16 border-b border-border_default">لا توجد منتجات</td></tr>
          )}
          {items.map((item, idx) => (
            <InventoryCountTableRow
              key={item.id} item={item} idx={idx} page={page} limit={limit}
              isCounting={isCounting} editingQty={editingQty}
              onQtyChange={onQtyChange} onQtyKeyDown={onQtyKeyDown}
              onToggleHide={onToggleHide} onRowClick={onRowClick} togglingHideProductId={togglingHideProductId}
              columnWidths={columnWidths}
              isFocused={focusedIndex === idx}
            />
          ))}
          {/* Filler rows via ERPTableRow (same as InventoryPage/ERPTable) */}
          {!loading && fillerCount > 0 &&
            Array.from({ length: fillerCount }).map((_, i) => (
              <ERPTableRow
                key={`filler-${i}`}
                row={null}
                columns={countFillerColumns}
                index={items.length + i}
              />
            ))
          }
        </tbody>
      </table>
    </div>
  );
}
