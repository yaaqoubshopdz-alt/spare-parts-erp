import { useEffect, useRef } from 'react';
import { EyeOff, Eye, RefreshCw } from 'lucide-react';

interface ColumnContextMenuProps {
  x: number;
  y: number;
  onClose: () => void;
  onHideColumn: () => void;
  onResetColumns: () => void;
  onShowAllColumns: () => void;
  canHide: boolean;
  hasHiddenColumns: boolean;
}

export default function ColumnContextMenu({
  x,
  y,
  onClose,
  onHideColumn,
  onResetColumns,
  onShowAllColumns,
  canHide,
  hasHiddenColumns,
}: ColumnContextMenuProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    
    // Add event listeners with timeout to prevent triggering immediately on click
    const timer = setTimeout(() => {
      document.addEventListener('click', handleOutsideClick);
      document.addEventListener('keydown', handleKeyDown);
    }, 10);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('click', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  return (
    <div
      ref={containerRef}
      style={{ top: y, left: x }}
      className="fixed z-50 min-w-[180px] bg-background_card/90 dark:bg-sidebar_bg/95 backdrop-blur-md border border-black/10 dark:border-border_custom/10 rounded-xl shadow-2xl p-1.5 font-cairo text-right select-none"
      dir="rtl"
    >
      <button
        onClick={() => {
          if (canHide) {
            onHideColumn();
            onClose();
          }
        }}
        disabled={!canHide}
        className={`w-full flex items-center justify-between gap-3 px-3 py-2 text-[13px] font-bold rounded-lg transition-colors text-right ${
          canHide
            ? 'text-text_primary hover:bg-primary_blue/10 dark:hover:bg-primary_blue/25 hover:text-primary_blue'
            : 'text-text_muted cursor-not-allowed opacity-50'
        }`}
      >
        <div className="flex items-center gap-2">
          <EyeOff size={15} />
          <span>إخفاء العمود</span>
        </div>
      </button>

      {hasHiddenColumns && (
        <button
          onClick={() => {
            onShowAllColumns();
            onClose();
          }}
          className="w-full flex items-center justify-between gap-3 px-3 py-2 text-[13px] font-bold rounded-lg text-text_primary hover:bg-primary_blue/10 dark:hover:bg-primary_blue/25 hover:text-primary_blue transition-colors text-right"
        >
          <div className="flex items-center gap-2">
            <Eye size={15} />
            <span>إظهار جميع الأعمدة</span>
          </div>
        </button>
      )}

      <div className="my-1 border-t border-black/5 dark:border-border_custom/5" />

      <button
        onClick={() => {
          onResetColumns();
          onClose();
        }}
        className="w-full flex items-center justify-between gap-3 px-3 py-2 text-[13px] font-bold rounded-lg text-text_primary hover:bg-danger_red/10 hover:text-danger_red transition-colors text-right"
      >
        <div className="flex items-center gap-2">
          <RefreshCw size={15} />
          <span>إعادة ضبط الافتراضي</span>
        </div>
      </button>
    </div>
  );
}
