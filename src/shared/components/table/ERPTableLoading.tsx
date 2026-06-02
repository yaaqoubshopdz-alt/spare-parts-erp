/**
 * ERPTableLoading — Loading skeleton for tables
 *
 * Shows animated pulse rows that match the exact row height (h-11)
 * to prevent layout shift when data loads.
 */

import { Loader2 } from 'lucide-react';

interface ERPTableLoadingProps {
  colSpan: number;
  message?: string;
  /** Number of skeleton rows to show */
  rowCount?: number;
}

export default function ERPTableLoading({
  colSpan,
  message = 'جاري التحميل...',
  rowCount = 8,
}: ERPTableLoadingProps) {
  return (
    <>
      {/* Main loading spinner row */}
      <tr>
        <td colSpan={colSpan} className="bg-background_secondary">
          <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
            <Loader2 size={28} className="animate-spin text-primary_blue" />
            <p className="text-sm font-bold text-text_muted">{message}</p>
          </div>
        </td>
      </tr>

      {/* Skeleton rows to maintain layout consistency */}
      {Array.from({ length: rowCount }).map((_, idx) => (
        <tr
          key={`skeleton-${idx}`}
          className={`h-11 animate-pulse ${idx % 2 === 0 ? 'bg-background_secondary' : 'bg-sidebar_bg'}`}
        >
          <td colSpan={colSpan}>
            <div className="h-full w-full flex items-center px-3">
              <div className="h-3 w-3/4 rounded bg-text_muted/10" />
            </div>
          </td>
        </tr>
      ))}
    </>
  );
}
