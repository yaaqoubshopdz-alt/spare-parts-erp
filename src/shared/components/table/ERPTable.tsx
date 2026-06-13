/**
 * ERPTable — المكون الرئيسي مع إدارة الأعمدة
 */
import { useState, useRef, useCallback } from 'react';
import type { ERPTableProps, ERPColumn } from './types';
import ERPTableRow from './ERPTableRow';
import { useTableFiller } from './useTableFiller';
import ColumnResizeHandle from './ColumnResizeHandle';
import ColumnContextMenu from './ColumnContextMenu';
import { useSmoothScroll } from '../../hooks/useSmoothScroll';

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
  onResizeColumn,
  onReorderColumns,
  onToggleHideColumn,
  onResetColumns,
  onShowAllColumns,
  hasHiddenColumns = false,
  emptyText = 'لا توجد بيانات',
  onRowContextMenu,
}: ERPTableProps<T>) {
  const { containerRef, fillerCount } = useTableFiller(data.length, minRows);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; colKey: string } | null>(null);

  // ── Drag-to-scroll + smooth wheel ──
  const scrollRef = useRef<HTMLDivElement | null>(null);
  useSmoothScroll<HTMLDivElement>({ direction: 'vertical' }, scrollRef);

  /**
   * Merged ref: feeds the DOM node to BOTH useTableFiller (for filler row counting)
   * and useSmoothScroll (for drag / wheel events).
   */
  const mergedScrollRef = useCallback(
    (node: HTMLDivElement | null) => {
      scrollRef.current = node;
      containerRef(node);
    },
    [containerRef],
  );

  const handleContextMenu = (e: React.MouseEvent, colKey: string) => {
    if (!onToggleHideColumn) return;
    e.preventDefault();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      colKey,
    });
  };

  // ── إعادة استخدام الهيدر ──
  const renderColumns = () =>
    columns.map((col, idx) => {
      const isActive = sortKey === col.key;
      const isAsc = isActive && sortDir === 'asc';
      const isDesc = isActive && sortDir === 'desc';

      const isDraggable = col.draggable !== false && onReorderColumns !== undefined;
      const isResizable = col.resizable !== false && onResizeColumn !== undefined;

      // Styling class for dragging states
      let dragClasses = '';
      if (draggedIndex === idx) {
        dragClasses = 'opacity-30';
      } else if (dragOverIndex === idx) {
        dragClasses = 'border-r-2 border-r-primary_blue bg-primary_blue/5';
      }

      return (
        <th
          key={col.key}
          onClick={() => col.sortable && onSort?.(col.key)}
          onContextMenu={(e) => handleContextMenu(e, col.key)}
          draggable={isDraggable}
          onDragStart={(e) => {
            if (!isDraggable) return;
            setDraggedIndex(idx);
            e.dataTransfer.effectAllowed = 'move';
          }}
          onDragOver={(e) => {
            if (!isDraggable) return;
            e.preventDefault();
            if (draggedIndex !== idx && dragOverIndex !== idx) {
              setDragOverIndex(idx);
            }
          }}
          onDragLeave={() => {
            if (dragOverIndex === idx) {
              setDragOverIndex(null);
            }
          }}
          onDrop={(e) => {
            if (!isDraggable) return;
            e.preventDefault();
            if (draggedIndex !== null && draggedIndex !== idx) {
              onReorderColumns?.(draggedIndex, idx);
            }
            setDraggedIndex(null);
            setDragOverIndex(null);
          }}
          onDragEnd={() => {
            setDraggedIndex(null);
            setDragOverIndex(null);
          }}
          className={`group/th relative px-3 font-bold text-[13px] text-text_primary uppercase tracking-wide border-l border-black/30 dark:border-l-border_custom/3 select-none transition-all duration-200 ${
            col.sortable ? 'cursor-pointer hover:bg-background_card' : ''
          } ${col.align === 'center' ? 'text-center' : col.align === 'left' ? 'text-left' : 'text-right'} ${dragClasses}`}
          style={col.width ? { width: col.width, minWidth: col.width } : undefined}
        >
          <div className="flex items-center justify-between gap-1 w-full h-full py-1">
            <span className="truncate flex-1">
              {col.headerRender ? col.headerRender() : col.label}
            </span>
            <span className="shrink-0 font-normal">
              {isAsc && <span className="mr-1 text-emerald-400">&#8593;</span>}
              {isDesc && <span className="mr-1 text-red-400">&#8595;</span>}
            </span>
          </div>

          {isResizable && (
            <ColumnResizeHandle
              startWidth={col.width ?? 100}
              minWidth={col.minWidth}
              onResize={(newWidth) => onResizeColumn?.(col.key, newWidth)}
            />
          )}
        </th>
      );
    });

  const emptyTextColIndex = (() => {
    const idx = columns.findIndex(col => col.key === 'name' || col.key === 'description' || col.flex === 1);
    return idx !== -1 ? idx : Math.floor(columns.length / 2);
  })();

  const isFixed = columns.some(c => c.width !== undefined);
  const tableLayoutClass = isFixed ? 'table-fixed' : '';

  // ── Loading State ──
  if (loading) {
    return (
      <div className={`h-full flex flex-col relative ${className}`}>
        {toolbar}
        {/* Scroll Area ── */}
        <div ref={mergedScrollRef} className="overflow-y-scroll flex-1 custom-scrollbar">
          <table className={`w-full text-sm text-right border-collapse ${tableLayoutClass}`}>
            {/* Sticky Header */}
            <thead className="sticky top-0 z-30 bg-gradient-to-b from-table_header_from to-table_header_to border-b border-black/30 dark:border-b-border_custom/3 shadow-[0_10px_30px_rgba(0,0,0,0.5)] relative">
              <tr className="h-[52px]">{renderColumns()}</tr>
            </thead>
            <tbody className="divide-y divide-border_default dark:divide-border_custom/3">
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
                    <td key={col.key} className="border-l border-border_default dark:border-l-border_custom/3 px-3">
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

      {/* Scroll Area ── */}
      <div ref={mergedScrollRef} className="overflow-y-scroll flex-1 custom-scrollbar">
        <table className={`w-full text-sm text-right border-collapse ${tableLayoutClass}`}>
          {/* Sticky Header */}
          <thead className="sticky top-0 z-30 bg-gradient-to-b from-table_header_from to-table_header_to border-b border-black/30 dark:border-b-border_custom/3 shadow-[0_10px_30px_rgba(0,0,0,0.5)] relative">
            <tr className="h-[52px]">{renderColumns()}</tr>
          </thead>

          {/* Body */}
          <tbody className="divide-y divide-border_default dark:divide-border_custom/3">
            {/* Data Rows */}
            {data.map((row, idx) => (
              <ERPTableRow
                key={(row as any)?.[rowKey] ?? idx}
                row={row}
                columns={columns}
                index={idx}
                onClick={() => onRowClick?.(row)}
                onContextMenu={(e) => onRowContextMenu?.(e, row)}
              />
            ))}

            {/* Empty State Message */}
            {data.length === 0 && (
              <tr className="h-11 bg-background_secondary">
                {columns.map((col, idx) => {
                  const isTextCol = idx === emptyTextColIndex;
                  return (
                    <td
                      key={col.key}
                      className={`px-3 py-2 border-l border-border_default dark:border-l-border_custom/3 ${
                        isTextCol ? 'font-bold text-center text-text_muted' : ''
                      }`}
                      style={col.width ? { width: col.width, minWidth: col.width } : undefined}
                    >
                      {isTextCol ? emptyText : <span className="invisible">&nbsp;</span>}
                    </td>
                  );
                })}
              </tr>
            )}

            {/* Visual Table Fill */}
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

      {contextMenu && (
        <ColumnContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu(null)}
          onHideColumn={() => onToggleHideColumn?.(contextMenu.colKey)}
          onResetColumns={() => onResetColumns?.()}
          onShowAllColumns={() => onShowAllColumns?.()}
          canHide={columns.length > 1}
          hasHiddenColumns={hasHiddenColumns}
        />
      )}
    </div>
  );
}

// Wrap in a way that preserves generic
export default function ERPTable<T extends Record<string, any>>(props: ERPTableProps<T>) {
  return <ERPTableInner {...props} />;
}

export type { ERPTableProps, ERPColumn };
