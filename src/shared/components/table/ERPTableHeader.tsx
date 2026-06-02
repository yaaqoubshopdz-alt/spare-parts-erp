/**
 * ERPTableHeader — ثابت، مطابق لـ Purchase/Sales تماماً
 *
 * المرجع: PurchasesPage.tsx سطور 104-123
 */
import type { ERPColumn } from './types';

interface Props<T> {
  columns: ERPColumn<T>[];
  sortKey: string | null;
  sortDir: 'asc' | 'desc' | null;
  onSort: (key: string) => void;
}

export default function ERPTableHeader<T>({ columns, sortKey, sortDir, onSort }: Props<T>) {
  return (
    <thead className="sticky top-0 z-30 bg-gradient-to-b from-table_header_from to-table_header_to border-b border-black/30 dark:border-border_default shadow-[0_10px_30px_rgba(0,0,0,0.5)] relative">
      <tr className="h-[52px]">
        {columns.map((col) => {
          const isActive = sortKey === col.key;
          const isAsc = isActive && sortDir === 'asc';
          const isDesc = isActive && sortDir === 'desc';
          return (
            <th
              key={col.key}
              onClick={() => col.sortable && onSort(col.key)}
              className={`
                px-3 font-bold text-[13px] text-text_primary uppercase tracking-wide
                border-l border-black/30 dark:border-border_default
                ${col.sortable ? 'cursor-pointer hover:bg-background_card' : ''}
                select-none transition-all duration-200
                ${col.align === 'center' ? 'text-center' : col.align === 'left' ? 'text-left' : 'text-right'}
              `}
              style={col.width ? { width: col.width, minWidth: col.width } : undefined}
            >
              {col.label}
              {isAsc && <span className="mr-1 text-emerald-400">↑</span>}
              {isDesc && <span className="mr-1 text-red-400">↓</span>}
            </th>
          );
        })}
      </tr>
    </thead>
  );
}
