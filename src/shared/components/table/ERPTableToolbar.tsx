/**
 * ERPTableToolbar — Unified table toolbar
 *
 * Provides a consistent search + actions bar matching
 * the Purchase/Sales visual identity.
 *
 * Pages can override the content via slots; the default
 * render matches the exact Purchase/Sales style.
 */

import type { ReactNode } from 'react';
import { Search } from 'lucide-react';

interface ERPTableToolbarProps {
  /** Search value */
  search?: string;
  /** Search change handler */
  onSearchChange?: (value: string) => void;
  /** Search placeholder text */
  searchPlaceholder?: string;
  /** Total count label (e.g., "إجمالي المنتجات:") */
  totalLabel?: string;
  /** Total count value */
  total?: number;
  /** Extra action buttons / content on the right side */
  actions?: ReactNode;
  /** Custom children replace the entire toolbar content */
  children?: ReactNode;
  /** Additional class name */
  className?: string;
}

export default function ERPTableToolbar({
  search,
  onSearchChange,
  searchPlaceholder = 'بحث...',
  totalLabel,
  total,
  actions,
  children,
  className = '',
}: ERPTableToolbarProps) {
  // If custom children provided, render them instead
  if (children) {
    return (
      <div
        className={`flex items-center justify-between px-8 h-24 shrink-0 bg-background_primary shadow-sm border-b border-border_default/20 ${className}`}
      >
        {children}
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between px-8 h-24 shrink-0 bg-background_primary shadow-sm border-b border-border_default/20">
      {/* Search Input */}
      {onSearchChange && (
        <div className="relative flex-1 max-w-[600px]">
          <Search
            size={22}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-primary_blue/60"
          />
          <input
            type="text"
            placeholder={searchPlaceholder}
            value={search || ''}
            onChange={(e) => {
              onSearchChange(e.target.value);
            }}
            className="w-full bg-background_card border border-border_default rounded-xl h-14 pr-14 pl-4 text-base text-text_primary font-bold placeholder:text-text_muted/50 focus:border-primary_blue focus:ring-2 focus:ring-primary_blue/20 outline-none transition-all"
          />
        </div>
      )}

      {/* Total + Actions */}
      <div className="flex items-center gap-6 shrink-0">
        {total !== undefined && (
          <div className="flex items-center gap-2 px-6 py-3 bg-background_card border border-border_default rounded-xl text-text_primary">
            <span className="text-sm font-bold text-text_muted">
              {totalLabel || 'الإجمالي:'}
            </span>
            <span className="font-numbers font-black text-primary_blue text-xl">
              {total}
            </span>
          </div>
        )}
        {actions}
      </div>
    </div>
  );
}
