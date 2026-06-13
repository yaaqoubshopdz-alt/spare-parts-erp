import { memo, useMemo } from 'react';
import { EyeOff, Eye, Loader2 } from 'lucide-react';
import { useTableFiller } from '@/shared/components/table/useTableFiller';
import ERPTableRow from '@/shared/components/table/ERPTableRow';
import ColumnResizeHandle from '@/shared/components/table/ColumnResizeHandle';
import type { ERPColumn } from '@/shared/components/table/types';

export interface CountItem {
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
  columns: ERPColumn<CountItem>[];
  reorder: (from: number, to: number) => void;
  setWidth: (key: string, w: number) => void;
}

const headerSortableClass = 'cursor-pointer hover:bg-black/10 dark:hover:bg-background_card transition-all duration-200';
const rowHoverClass = 'hover:bg-primary_blue/5 transition-colors';

const cellBorder = 'border-l border-black/10 dark:border-border_default';
const rowBorder = 'border-b border-black/10 dark:border-border_default';
const headerCellBorder = 'border-l border-black/30 dark:border-border_default';

const InventoryCountTableRow = memo(function InventoryCountTableRow({
  item, idx, page, limit, isCounting, editingQty, onQtyChange, onQtyKeyDown, onToggleHide, onRowClick, isFocused, togglingHideProductId, columns,
}: {
  item: CountItem; idx: number; page: number; limit: number;
  isCounting: boolean; editingQty: Record<number, string>;
  onQtyChange: (itemId: number, value: string) => void;
  onQtyKeyDown: (e: React.KeyboardEvent, itemId: number) => void;
  onToggleHide: (productId: number) => void;
  onRowClick: (item: CountItem) => void; isFocused: boolean;
  togglingHideProductId: number | null;
  columns: ERPColumn<CountItem>[];
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
      {columns.map((col) => {
        const width = col.width;
        if (col.key === 'index') {
          return (
            <td key="index" style={{ width }} className={`px-3 py-2 text-[11px] font-numbers text-text_secondary text-center align-middle ${cellBorder} ${rowBorder}`}>
              {(page - 1) * limit + idx + 1}
            </td>
          );
        }
        if (col.key === 'barcode_snapshot') {
          return (
            <td key="barcode_snapshot" style={{ width }} className={`px-3 py-2 text-[12px] font-numbers text-text_secondary align-middle ${cellBorder} ${rowBorder}`}>
              {item.barcode_snapshot || '-'}
            </td>
          );
        }
        if (col.key === 'product_name_snapshot') {
          return (
            <td key="product_name_snapshot" style={{ width }} className={`px-3 py-2 text-[13px] font-bold text-text_primary align-middle min-w-0 ${cellBorder} ${rowBorder}`}>
              <div className="flex items-center justify-between gap-2">
                <span className={`truncate min-w-0 ${item.is_hidden_from_sales ? 'text-orange-200' : ''}`}>{item.product_name_snapshot}</span>
                {item.is_hidden_from_sales ? (
                  <span className="shrink-0 text-[10px] px-2 py-0.5 rounded-md bg-orange-500/15 text-orange-300 border border-orange-500/30 shadow-sm">مخفي</span>
                ) : null}
              </div>
            </td>
          );
        }
        if (col.key === 'category_name_snapshot') {
          return (
            <td key="category_name_snapshot" style={{ width }} className={`px-3 py-2 text-[12px] text-text_secondary align-middle ${cellBorder} ${rowBorder}`}>
              {item.category_name_snapshot || '-'}
            </td>
          );
        }
        if (col.key === 'system_qty_at_start') {
          return (
            <td key="system_qty_at_start" style={{ width }} className={`px-3 py-2 text-[13px] font-numbers text-text_secondary text-center align-middle ${cellBorder} ${rowBorder}`}>
              {item.system_qty_at_start}
            </td>
          );
        }
        if (col.key === 'current_stock') {
          return (
            <td key="current_stock" style={{ width }} className={`px-3 py-2 text-[13px] font-numbers text-text_secondary text-center align-middle ${cellBorder} ${rowBorder}`}>
              {currentStock}
            </td>
          );
        }
        if (col.key === 'counted_qty') {
          return (
            <td key="counted_qty" style={{ width }} className={`px-3 py-2 text-center align-middle ${cellBorder} ${rowBorder}`}>
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
          );
        }
        if (col.key === 'final_difference') {
          return (
            <td key="final_difference" style={{ width }} className={`px-3 py-2 text-[13px] font-numbers font-bold text-center align-middle ${cellBorder} ${rowBorder} ${
              diff === null ? 'text-text_muted' :
              diff > 0 ? 'text-success_green' :
              diff < 0 ? 'text-danger_red' : 'text-text_muted'
            }`}>
              {diff !== null ? `${diff > 0 ? '+' : ''}${diff}` : '-'}
            </td>
          );
        }
        if (col.key === 'status') {
          return (
            <td key="status" style={{ width }} className={`px-3 py-2 text-center align-middle ${cellBorder} ${rowBorder}`}>
              <div className="flex items-center justify-center">{statusBadge(item.status)}</div>
            </td>
          );
        }
        if (col.key === 'hide') {
          return (
            <td key="hide" style={{ width }} className={`px-3 py-2 text-center align-middle ${rowBorder}`} onClick={e => e.stopPropagation()}>
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
          );
        }
        return null;
      })}
    </tr>
  );
});

export default function InventoryCountTable({
  items, loading, page, limit, sortKey, sortDir, onSort,
  isCounting, editingQty, onQtyChange, onQtyKeyDown,
  onToggleHide, togglingHideProductId, onRowClick, focusedIndex,
  columns, reorder, setWidth,
}: TableProps) {
  // Use the shared hook for dynamic fixed-height filler rows (like ERPTable)
  const { containerRef, fillerCount: rawFillerCount } = useTableFiller(items.length, 15);
  // When list is empty, the 1 placeholder row consumes 1 slot
  const fillerCount = items.length === 0 ? Math.max(0, rawFillerCount - 1) : rawFillerCount;

  return (
    <div ref={containerRef} className="flex-1 bg-transparent overflow-hidden z-10 min-h-0" id="count-table-body">
      <table className="w-full text-sm text-right border-collapse table-fixed">
        <thead className="sticky top-0 z-30 bg-gradient-to-b from-table_header_from to-table_header_to border-b border-b-black/50 dark:border-b-border_default shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
          <tr className="h-[52px]">
            {columns.map((col, i) => {
              const isSortable = !!col.sortable;
              const isCenter = col.align === 'center';
              const alignmentClass = isCenter ? 'text-center' : 'text-right';

              return (
                <th
                  key={col.key}
                  style={{ width: col.width }}
                  className={`relative px-3 text-[13px] font-bold text-text_primary tracking-wide ${alignmentClass} ${isSortable ? headerSortableClass : ''} ${i < columns.length - 1 ? headerCellBorder : ''}`}
                  onClick={() => isSortable && onSort(col.key as SortKey)}
                  draggable={col.draggable}
                  onDragStart={(e) => {
                    if (!col.draggable) return;
                    e.dataTransfer.setData('text/plain', i.toString());
                    e.dataTransfer.effectAllowed = 'move';
                  }}
                  onDragOver={(e) => {
                    if (!col.draggable) return;
                    e.preventDefault();
                  }}
                  onDrop={(e) => {
                    if (!col.draggable) return;
                    e.preventDefault();
                    const fromIdx = parseInt(e.dataTransfer.getData('text/plain'), 10);
                    if (!isNaN(fromIdx) && fromIdx !== i) {
                      reorder(fromIdx, i);
                    }
                  }}
                >
                  {col.label}
                  {isSortable && sortKey === col.key && sortDir === 'asc' ? (
                    <span className="mr-1 text-emerald-400 text-[14px]">↑</span>
                  ) : isSortable && sortKey === col.key && sortDir === 'desc' ? (
                    <span className="mr-1 text-red-400 text-[14px]">↓</span>
                  ) : null}

                  {col.resizable && (
                    <ColumnResizeHandle
                      onResize={(newWidth) => setWidth(col.key, newWidth)}
                      startWidth={col.width ?? 100}
                    />
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {loading && items.length === 0 && (
            <tr className="h-11">
              <td colSpan={columns.length} className="text-center align-middle text-text_muted">
                <div className="flex items-center justify-center gap-2">
                  <Loader2 size={16} className="animate-spin text-primary_blue" />
                  <span className="text-sm">جاري التحميل...</span>
                </div>
              </td>
            </tr>
          )}
          {!loading && items.length === 0 && (
            <tr className="h-11 bg-background_secondary">
              <td colSpan={columns.length} className="text-center align-middle text-text_muted text-sm border-b border-border_default">
                لا توجد منتجات
              </td>
            </tr>
          )}
          {items.map((item, idx) => (
            <InventoryCountTableRow
              key={item.id} item={item} idx={idx} page={page} limit={limit}
              isCounting={isCounting} editingQty={editingQty}
              onQtyChange={onQtyChange} onQtyKeyDown={onQtyKeyDown}
              onToggleHide={onToggleHide} onRowClick={onRowClick} togglingHideProductId={togglingHideProductId}
              columns={columns}
              isFocused={focusedIndex === idx}
            />
          ))}
          {/* Filler rows via ERPTableRow (same as InventoryPage/ERPTable) */}
          {!loading && fillerCount > 0 &&
            Array.from({ length: fillerCount }).map((_, i) => (
              <ERPTableRow
                key={`filler-${i}`}
                row={null}
                columns={columns}
                index={items.length + i}
              />
            ))
          }
        </tbody>
      </table>
    </div>
  );
}
