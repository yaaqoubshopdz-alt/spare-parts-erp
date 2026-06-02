/**
 * ERPTable — المكون الرئيسي
 *
 * 🎯 فلسفة: بسيط، مباشر، مطابق لـ PurchasesPage / SalesPage تماماً.
 *    لا wrapper divs زائدة، الجدول مباشرة داخل منطقة السكرول.
 *    لا classic pagination — كل البيانات في جدول واحد مع scroll طبيعي + filler rows.
 *
 * الهيكل (مطابق لـ PurchasesPage):
 *   ┌──────────────────────────────┐
 *   │ toolbar (shrink-0)            │
 *   ├──────────────────────────────┤
 *   │ scroll-area (flex-1           │
 *   │   overflow-y-scroll)          │
 *   │  ┌────────────────────────┐   │
 *   │  │ <table>                 │   │ ← مباشرة — بدون wrapper div
 *   │  │  <thead> (sticky top-0) │   │ ← هيدر ثابت عند السكرول
 *   │  │  <tbody>                │   │
 *   │  │    data rows            │   │
 *   │  │    empty message        │   │ ← لو ما فيه بيانات
 *   │  │    filler rows          │   │ ← يملأ المساحة البيضاء
 *   │  │  </tbody>               │   │
 *   │  │</table>                 │   │
 *   │  └────────────────────────┘   │
 *   └──────────────────────────────┘
 *
 * ✅ جدول واحد موحد — الهيدر والجسد بأعمدة متطابقة تلقائياً
 * ✅ sticky header داخل السكرول
 * ✅ filler rows يدوية = نفس أسلوب PurchasesPage تماماً
 * ✅ لا wrapper divs زائدة تمنع الجدول من الاتساع
 */

import type { ERPTableProps, ERPColumn } from './types';
import ERPTableRow from './ERPTableRow';
import { useTableFiller } from './useTableFiller';

function ERPTableInner<T extends Record<string, any>>({
  data,
  columns,
  loading = false,
  rowKey = 'id',
  sortKey = null,
  sortDir = null,
  onSort,
  onRowClick,
  toolbar,
  className = '',
  minRows = 18,
}: ERPTableProps<T>) {
  const { containerRef, fillerCount } = useTableFiller(data.length, minRows);

  // ── إعادة استخدام الهيدر ──
  const renderColumns = () =>
    columns.map((col) => {
      const isActive = sortKey === col.key;
      const isAsc = isActive && sortDir === 'asc';
      const isDesc = isActive && sortDir === 'desc';
      return (
        <th
          key={col.key}
          onClick={() => col.sortable && onSort?.(col.key)}
          className={`px-3 font-bold text-[13px] text-text_primary uppercase tracking-wide border-l border-black/30 dark:border-border_default select-none transition-all duration-200 ${
            col.sortable ? 'cursor-pointer hover:bg-background_card' : ''
          } ${col.align === 'center' ? 'text-center' : col.align === 'left' ? 'text-left' : 'text-right'}`}
          style={col.width ? { width: col.width, minWidth: col.width } : undefined}
        >
          {col.label}
          {isAsc && <span className="mr-1 text-emerald-400">&#8593;</span>}
          {isDesc && <span className="mr-1 text-red-400">&#8595;</span>}
        </th>
      );
    });

  // ── Loading State ──
  if (loading) {
    return (
      <div className={`h-full flex flex-col relative ${className}`}>
        {toolbar}
        {/* Scroll Area — مباشرة بدون wrapper */}
        <div ref={containerRef} className="overflow-y-scroll flex-1 custom-scrollbar">
          <table className="w-full text-sm text-right border-collapse">
            {/* Sticky Header */}
            <thead className="sticky top-0 z-30 bg-gradient-to-b from-table_header_from to-table_header_to border-b border-black/30 dark:border-border_default shadow-[0_10px_30px_rgba(0,0,0,0.5)] relative">
              <tr className="h-[52px]">{renderColumns()}</tr>
            </thead>
            <tbody className="divide-y divide-border_default">
              <tr>
                <td colSpan={columns.length} className="px-4 py-12 text-center text-text_muted bg-background_secondary">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-7 h-7 border-2 border-primary_blue border-t-transparent rounded-full animate-spin" />
                    <span className="text-sm font-bold">جاري التحميل...</span>
                  </div>
                </td>
              </tr>
              {/* Skeleton rows */}
              {Array.from({ length: Math.max(5, minRows) }).map((_, i) => (
                <tr key={`sk-${i}`} className={`h-11 ${i % 2 === 0 ? 'bg-background_secondary' : 'bg-sidebar_bg'} animate-pulse`}>
                  {columns.map((col) => (
                    <td key={col.key} className="border-l border-border_default px-3">
                      <div className="h-3 w-3/4 rounded bg-text_muted/10" />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div className={`h-full flex flex-col relative ${className}`}>
      {/* Toolbar */}
      {toolbar}

      {/* Scroll Area — مباشرة بدون wrapper div إضافي */}
      <div ref={containerRef} className="overflow-y-scroll flex-1 custom-scrollbar">
        <table className="w-full text-sm text-right border-collapse">
          {/* Sticky Header — داخل السكرول */}
          <thead className="sticky top-0 z-30 bg-gradient-to-b from-table_header_from to-table_header_to border-b border-black/30 dark:border-border_default shadow-[0_10px_30px_rgba(0,0,0,0.5)] relative">
            <tr className="h-[52px]">{renderColumns()}</tr>
          </thead>

          {/* Body — بيانات + رسالة فارغة + فيلر */}
          <tbody className="divide-y divide-border_default">
            {/* Data Rows */}
            {data.map((row, idx) => (
              <ERPTableRow
                key={(row as any)?.[rowKey] ?? idx}
                row={row}
                columns={columns}
                index={idx}
                onClick={() => onRowClick?.(row)}
              />
            ))}

            {/* Empty State Message */}
            {data.length === 0 && (
              <tr>
                <td colSpan={columns.length} className="px-4 py-6 text-center text-text_muted bg-background_secondary">
                  لا توجد بيانات
                </td>
              </tr>
            )}

            {/* Visual Table Fill — صفوف تعبئة بصرية */}
            {fillerCount > 0 &&
              Array.from({ length: fillerCount }).map((_, i) => (
                <ERPTableRow
                  key={`filler-${i}`}
                  row={null}
                  columns={columns}
                  index={data.length + i}
                />
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Wrap in a way that preserves generic
export default function ERPTable<T extends Record<string, any>>(props: ERPTableProps<T>) {
  return <ERPTableInner {...props} />;
}

export type { ERPTableProps, ERPColumn };
