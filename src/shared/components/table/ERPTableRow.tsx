/**
 * ERPTableRow — صف بيانات أو صف تعبئة (filler)
 *
 * المرجع: PurchasesPage.tsx سطور 131-153
 * - h-11
 * - hover:bg-primary_blue/5
 * - zebra: bg-background_secondary (زوجي) / bg-sidebar_bg (فردي)
 */

import { memo } from 'react';
import type { ERPColumn } from './types';

interface ERPTableRowProps<T> {
  row: T | null;
  columns: ERPColumn<T>[];
  index: number;
  onClick?: () => void;
}

function ERPTableRowInner<T>({ row, columns, index, onClick }: ERPTableRowProps<T>) {
  const isFiller = row === null;
  const bgClass = index % 2 === 0 ? 'bg-background_secondary' : 'bg-sidebar_bg';

  return (
    <tr
      className={`
        h-11 ${bgClass} transition-colors
        ${isFiller ? '' : 'hover:bg-primary_blue/5 group cursor-pointer'}
      `}
      // Note: borders between rows are handled by tbody's `divide-y divide-border_default`
      onClick={isFiller ? undefined : onClick}
    >
      {columns.map((col) => {
        if (isFiller) {
          return (
            <td
              key={col.key}
              className="border-l border-border_default"
              style={col.width ? { width: col.width, minWidth: col.width } : undefined}
            />
          );
        }
        const alignClass =
          col.align === 'center' ? 'text-center' : col.align === 'left' ? 'text-left' : 'text-right';
        return (
          <td
            key={col.key}
            className={`px-3 py-2 font-bold text-text_primary border-l border-border_default ${alignClass} ${col.cellClass || ''}`}
            style={col.width ? { width: col.width, minWidth: col.width, maxWidth: col.width } : undefined}
          >
            {col.render ? col.render(row) : <span className="text-sm">{(row as any)?.[col.key] ?? '-'}</span>}
          </td>
        );
      })}
    </tr>
  );
}

export default memo(ERPTableRowInner, (prev, next) => prev.row === next.row && prev.index === next.index) as typeof ERPTableRowInner;
